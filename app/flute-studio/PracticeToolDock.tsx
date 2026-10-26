"use client";

import {CloseButton} from "./components/CloseButton";
import {Stepper} from "./components/Stepper";
import {PULSE_LIMITS,type PulseState} from "./lib/metronomeSetup";
import { closeMic, openMic } from "./lib/audioSession";
import { TEMPO_MIN, TEMPO_MAX, clampTempo, liveTempo, LIVE_TEMPO_DELAY } from "./lib/scoreTempo";
import { MicBlocked } from "./components/MicBlocked";
import Link from "next/link";
import { createPortal } from "react-dom";
import BackChevron from "./components/BackChevron";
import { usePathname } from "next/navigation";
import {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {useLanguage} from "./i18n/LanguageContext";
import "./practice-tool-dock.css";
import "./tools-panel.css";
// The detector lives in lib/pitch.ts now — the tuner is one consumer of
// it, not its owner.
import {centsFromMidi, detectPitch, median, midiFromHz} from "./lib/pitch";
import {prepareClickSounds} from "./components/clickSounds";
import {bookClick,pitchFrequency,usePracticeAudio} from "./PracticeAudio";
import {droneSamplesIfReady,droneVoice} from "./components/sampledDrone";
import {A4_MAX,A4_MIN,setToolSounds,type AccentSound,type ClickSound,type DroneAdd,type DroneSound} from "./lib/toolSounds";
import {useToolSounds} from "./lib/useToolSounds";
import {FluteDiagram} from "./components/FluteDiagram";
import {fluteFingerings, midiForPitch} from "../../content/fingerings/flute";
import {StaffNote} from "./components/StaffNote";
import {ChevronIcon} from "./components/HeaderIcons";
import {ClickNoteIcon,SubdivisionIcon} from "./components/SubdivisionIcon";
import {METERS,METER_STEPS,clicksOf,defaultMarks,groupingsFor,marksKey,marksOf,meterLabel,meterOf,nextMark,noteIn,notesFor,type BeatMark,type ClickNote,type Meter,type MetronomeSetup} from "./lib/metronomeSetup";

type ToolKey = "tuner" | "metronome" | "drone" | "fingering";
type PitchReading = {
  name: string;
  octave: number;
  hz: number;
  cents: number;
  midi: number;
};


const MORE_KEY = "cookie:metronome-more";
/** The click note a meter is usually counted in: 6/8 in dotted quarters, 7/8 in eighths, 2/2 in halves. */
function naturalNote(meter:Meter):ClickNote{
  if(meter.groups)return meter.groups.every(g=>g===3)?"dotted":"eighth";
  return meter.bottom===2?"half":"quarter";
}
const NOTE_NAMES:Record<ClickNote,[string,string]>={quarter:["Quarter note","四分音符"],eighth:["Eighth note","八分音符"],dotted:["Dotted quarter","附点四分音符"],half:["Half note","二分音符"]};
const SUB_NAMES:Record<1|2|3|4,[string,string]>={1:["No subdivision","不细分"],2:["Two","二等分"],3:["Three","三等分"],4:["Four","四等分"]};
const MARK_NAMES:Record<BeatMark,[string,string]>={accent:["accent","重音"],normal:["normal","普通"],silent:["silent","静音"]};
const CLICK_SOUNDS:[ClickSound,string,string][]=[["beep","Beep","哔"],["woodblock","Woodblock","木鱼"],["tick","Tick","轻点"],["voice","Voice","数拍"]];
const ACCENT_SOUNDS:[AccentSound,string,string][]=[["higher","Higher","更高"],["bell","Bell","铃声"],["louder","Louder","更响"]];
const DRONE_SOUNDS:[DroneSound,string,string][]=[["sine","Sine","纯音"],["organ","Organ","管风琴"],["flute","Flute","长笛"],["cello","Cello","大提琴"]];
const DRONE_ADDS:[DroneAdd,string,string][]=[["none","None","无"],["fifth","Fifth","五度"],["octave","Octave below","低八度"]];

/** A "More" that remembers whether it was left open, like the metronome's. Client only: the panel never renders on the server. */
function useMore(key:string):[boolean,()=>void]{
  const [open,setOpen]=useState(()=>{try{return typeof window!=="undefined"&&localStorage.getItem(key)==="1"}catch{return false}});
  return [open,()=>{const next=!open;setOpen(next);try{localStorage.setItem(key,next?"1":"0")}catch{/* fine */}}];
}

/** One row: a label and a View switch of words, the studio's way to pick one of a few (COMPONENTS.md). */
function Choice<T extends string>({zh,label,value,options,onPick}:{zh:boolean;label:[string,string];value:T;options:[T,string,string][];onPick:(v:T)=>void}){
  return <div className="tp-row">
    <span className="tp-label">{label[zh?1:0]}</span>
    <div className="view-switch" role="group" aria-label={label[zh?1:0]}>
      {options.map(([id,en,cn])=><button key={id} type="button" aria-pressed={value===id} onClick={()=>onPick(id)}>{zh?cn:en}</button>)}
    </div>
  </div>;
}

/** A volume slider (0 to 1). */
function Volume({zh,label,value,onChange}:{zh:boolean;label:[string,string];value:number;onChange:(v:number)=>void}){
  return <label className="tp-row tp-volume">
    <span className="tp-label">{label[zh?1:0]}</span>
    <input type="range" min={0} max={1} step={0.05} value={value} onChange={e=>onChange(Number(e.target.value))}/>
  </label>;
}

/**
 * The metronome's "More": what the tempo counts, the meter and its grouping, subdivision ticks, and one dot per click
 * to tap through normal, accent and silent. Changes reach the running click immediately (PracticeAudio).
 */
function MetronomeMore({zh,open,onToggle,setup,setSetup,beats,accent,setAccent,toolBeat,toolPulse,preview}:{zh:boolean;open:boolean;onToggle:()=>void;
  /** Pulse training: where the bar sounding now sits in its round of click and silent bars. */
  toolPulse:(()=>(PulseState&{silent:boolean})|null)|null;
  setup:MetronomeSetup;setSetup:(next:MetronomeSetup)=>void;beats:number;accent:boolean;setAccent:(on:boolean)=>void;toolBeat:(()=>number|null)|null;
  /** Plays a beat and an accent with the new sound, so a choice is heard even with the metronome stopped. */
  preview:()=>void}){
  const sounds=useToolSounds();
  const meter=meterOf(setup,beats),note=noteIn(setup,meter),clicks=clicksOf(meter,note),marks=marksOf(setup,meter,note);
  const key=marksKey(meter,note),custom=!!setup.marks[key],step=meterLabel(meter.id),groupings=groupingsFor(step);
  // The dot for the click sounding now, read from the audio clock each frame (only while playing).
  const [beatNow,setNow]=useState<number|null>(null),read=useRef(toolBeat);
  useEffect(()=>{read.current=toolBeat});
  const [pulseNow,setPulseNow]=useState<(PulseState&{silent:boolean})|null>(null),readPulse=useRef(toolPulse);
  useEffect(()=>{readPulse.current=toolPulse});
  const playing=!!toolBeat,pulse=playing&&setup.pulse.mode!=="off"?pulseNow:null;
  // In a silent bar the dots don't show where you are: you keep the beat yourself and hear if you stayed with it.
  const now=playing&&!pulse?.silent?beatNow:null;
  // Opening More scrolls the panel (the phone sheet is short) so the new options are in view; not when the panel
  // opens with More already open from last time.
  const bodyRef=useRef<HTMLDivElement|null>(null),wasOpen=useRef(open);
  useEffect(()=>{
    if(open&&!wasOpen.current)bodyRef.current?.scrollIntoView({block:"nearest",behavior:"smooth"});
    wasOpen.current=open;
  },[open]);
  useEffect(()=>{
    if(!playing)return;
    let frame=0;const tick=()=>{
      const beat=read.current?.()??null;setNow(previous=>previous===beat?previous:beat);
      const p=readPulse.current?.()??null;setPulseNow(previous=>previous?.round===p?.round&&previous?.index===p?.index?previous:p);
      frame=requestAnimationFrame(tick)};
    frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
  },[playing]);
  const mark=(i:number)=>{
    const list=[...marks];list[i]=nextMark(list[i]);
    // Asking for an accent means you want to hear it, so the simple Accent switch comes on.
    if(list[i]==="accent"&&!accent)setAccent(true);
    const same=list.every((m,j)=>m===defaultMarks(clicks)[j]),saved={...setup.marks};
    if(same)delete saved[key];else saved[key]=list;
    setSetup({...setup,marks:saved});
  };
  return <>
      <div className="tp-metro__foot">
      {/* One dot per click, a little gap where a group starts. Tap: normal → accent → silent. */}
      <div className={pulse?.silent?"tp-beats is-silent":"tp-beats"} role="group" aria-label={zh?"每一拍":"Each beat"}>
        {clicks.map((c,i)=>{const shown=marks[i]==="accent"&&!accent?"normal":marks[i];
          return <button key={i} type="button" data-mark={shown} className={`${i===now?"is-now ":""}${i>0&&c.groupStart&&clicks.some((d,j)=>j>0&&!d.groupStart)?"is-group":""}`}
            aria-label={zh?`第 ${i+1} 拍：${MARK_NAMES[shown][1]}`:`Beat ${i+1}: ${MARK_NAMES[shown][0]}`} onClick={()=>mark(i)}><i/></button>})}
      </div>
      {custom&&<div className="tp-row tp-beats__foot">
        {custom&&<button type="button" className="text-action" onClick={()=>{const saved={...setup.marks};delete saved[key];setSetup({...setup,marks:saved})}}>{zh?"重置":"Reset"}</button>}
      </div>}
    <button type="button" className="text-action tp-more" aria-expanded={open} onClick={onToggle}>{zh?"更多":"More"}<ChevronIcon/></button>
      </div>
    {open&&<div className="tp-more__body" ref={bodyRef}>
      {groupings.length>1&&<div className="tp-row">
        <span className="tp-label">{zh?"分组":"Grouping"}</span>
        <div className="view-switch" role="group" aria-label={zh?"分组":"Grouping"}>
          {groupings.map(g=><button key={g.id} type="button" aria-pressed={g.id===meter.id} onClick={()=>setSetup({...setup,meter:g.id})}>{g.groups!.join("+")}</button>)}
        </div>
      </div>}
      <div className="tp-row">
        <span className="tp-label">{zh?"一拍":"Beat"}</span>
        <div className="view-switch tp-glyphs" role="group" aria-label={zh?"速度按哪个音符":"What the tempo counts"}>
          {notesFor(meter).map(n=><button key={n} type="button" aria-pressed={n===note} aria-label={NOTE_NAMES[n][zh?1:0]} onClick={()=>setSetup({...setup,note:n})}><ClickNoteIcon note={n}/></button>)}
        </div>
      </div>
      <div className="tp-row">
        <span className="tp-label">{zh?"细分":"Subdivide"}</span>
        <div className="view-switch tp-glyphs" role="group" aria-label={zh?"细分":"Subdivide"}>
          {([1,2,3,4] as const).map(n=><button key={n} type="button" aria-pressed={setup.sub===n} aria-label={SUB_NAMES[n][zh?1:0]} onClick={()=>setSetup({...setup,sub:n})}><SubdivisionIcon parts={n}/></button>)}
        </div>
      </div>
      {/* Pulse training: Ghost (N bars of click, M silent, optionally growing) or Random gaps (1 to K silent bars). */}
      <Choice zh={zh} label={["Pulse","稳拍练习"]} value={setup.pulse.mode} options={[["off","Off","关"],["ghost","Ghost","隐形"],["random","Random gaps","随机空拍"]]} onPick={mode=>setSetup({...setup,pulse:{...setup.pulse,mode}})}/>
      {setup.pulse.mode!=="off"&&<>
        <div className="tp-row"><span className="tp-label">{zh?"有声小节":"Click bars"}</span>
          <Stepper size="small" value={setup.pulse.play} min={PULSE_LIMITS.play[0]} max={PULSE_LIMITS.play[1]} onChange={play=>setSetup({...setup,pulse:{...setup.pulse,play}})} label={zh?"有声小节":"Click bars"} decreaseLabel={zh?"少一小节":"One bar fewer"} increaseLabel={zh?"多一小节":"One bar more"}/></div>
        {setup.pulse.mode==="ghost"?<>
          <div className="tp-row"><span className="tp-label">{zh?"静音小节":"Silent bars"}</span>
            <Stepper size="small" value={setup.pulse.rest} min={PULSE_LIMITS.rest[0]} max={PULSE_LIMITS.rest[1]} onChange={rest=>setSetup({...setup,pulse:{...setup.pulse,rest}})} label={zh?"静音小节":"Silent bars"} decreaseLabel={zh?"少一小节":"One bar fewer"} increaseLabel={zh?"多一小节":"One bar more"}/></div>
          <Choice zh={zh} label={["Silence","静音"]} value={setup.pulse.grow?"grow":"same"} options={[["same","Same","不变"],["grow","Grows","每轮加长"]]} onPick={v=>setSetup({...setup,pulse:{...setup.pulse,grow:v==="grow"}})}/>
        </>:<div className="tp-row"><span className="tp-label">{zh?"最多静音":"Gaps up to"}</span>
          <Stepper size="small" value={setup.pulse.gaps} min={PULSE_LIMITS.gaps[0]} max={PULSE_LIMITS.gaps[1]} onChange={gaps=>setSetup({...setup,pulse:{...setup.pulse,gaps}})} label={zh?"最多静音小节":"Gaps up to"} decreaseLabel={zh?"少一小节":"One bar fewer"} increaseLabel={zh?"多一小节":"One bar more"}/></div>}
        {/* The round as bar marks: filled = click, hollow = silent, outlined = the bar now. */}
        {pulse&&<div className="tp-round" aria-hidden="true">{pulse.bars.map((silent,i)=><i key={i} className={`${silent?"is-silent":""}${i===pulse.index?" is-now":""}`}/>)}</div>}
      </>}
      {/* How it sounds: shared by every metronome and count-in in the studio (lib/toolSounds.ts). */}
      <Choice zh={zh} label={["Sound","声音"]} value={sounds.click} options={CLICK_SOUNDS} onPick={click=>{setToolSounds({click});preview()}}/>
      <Choice zh={zh} label={["Accent","重音"]} value={sounds.accent} options={ACCENT_SOUNDS} onPick={accentSound=>{setToolSounds({accent:accentSound});if(!accent)setAccent(true);preview()}}/>
      <Volume zh={zh} label={["Beat volume","拍子音量"]} value={sounds.clickVolume} onChange={clickVolume=>setToolSounds({clickVolume})}/>
      <Volume zh={zh} label={["Accent volume","重音音量"]} value={sounds.accentVolume} onChange={accentVolume=>setToolSounds({accentVolume})}/>
    </div>}
  </>;
}

const pitches = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];



export default function PracticeToolDock() {
  const { t, lang } = useLanguage(), zh = lang === "zh";
  const [open, setOpen] = useState(false);
  useEffect(()=>{
    const close=()=>setOpen(false);
    window.addEventListener("cookie:open-account-panel",close);
    return()=>window.removeEventListener("cookie:open-account-panel",close);
  },[]);
  const launcherRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const moved = useRef(false);
  const drag = useRef<{id:number;x:number;y:number;top:number;right:number} | null>(null);
  const [anchor, setAnchor] = useState({ top: 60, right: 16 });
  /** The nav's launcher slot, found after mount so SSR markup matches. */
  const [toolsSlot, setToolsSlot] = useState<HTMLElement | null>(null);
  const pathname = usePathname();
  useEffect(() => {
    // The reader has its own slot in its topbar; the rest of the studio
    // uses the nav's. Render only after a slot is ready, with no floating fallback.
    //
    // Checked after paint: on a client-side navigation this effect runs
    // before the incoming route has laid out, so measuring immediately
    // found neither slot visible and the button dropped back to floating.
    let frame = 0;
    const pick = () => {
      const slot = ["reader-tools-slot", "practice-tools-slot"]
        .map(id => document.getElementById(id))
        // Displayed, not "on screen": the phone's top bar slides away when
        // you scroll, and iOS fires a resize whenever its address bar
        // shows or hides, so an on-screen test lost the tuning fork until
        // the next page change.
        .find(el => !!el && el.getClientRects().length > 0) ?? null;
      setToolsSlot(slot);
    };
    frame = requestAnimationFrame(() => { frame = requestAnimationFrame(pick); });
    // Frames can be held back (a background tab, a page still loading), so
    // look once more a moment later rather than leaving the button floating.
    const late = window.setTimeout(pick, 400);
    window.addEventListener("resize", pick);
    const observer=new MutationObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(pick)});
    observer.observe(document.body,{childList:true,subtree:true});
    return () => { observer.disconnect();cancelAnimationFrame(frame); window.clearTimeout(late); window.removeEventListener("resize", pick); };
  }, [pathname]);
  const [requestedTool, setRequestedTool] = useState<ToolKey | null>(null);
  const [, setFocusedTool] = useState<ToolKey>("tuner");

  const {bpm,setBpm,metro,toggleToolMetro,accent,setAccent,beats,setBeats,drones,toggleDrone:toggleSharedDrone,stopAllDrones,getAudio,setup,setSetup,toolMode,toolBeat,toolPulse}=usePracticeAudio();
  // One panel now: the fingering lookup is the only other view, reached by
  // tapping the note the tuner shows.
  const [view,setView]=useState<"main"|"fingering">("main");
  const [, setTapHint] = useState("");

  const [reading, setReading] = useState<PitchReading>({
    name: "A",
    octave: 4,
    hz: 440,
    cents: 0,
    midi: 69,
  });
  const [signalActive, setSignalActive] = useState(false);
  const [listening, setListening] = useState(false);
  const [tunerMessage, setTunerMessage] = useState("");
  // The mic was refused (or there is none): shown under the meter until the next try. The old message only showed while listening, so it never appeared.
  const [micProblem, setMicProblem] = useState<"blocked" | "unavailable" | null>(null);
  // Which fingering the dock is showing, chosen as a note name plus an
  // octave rather than one pitch out of 41. Local to the dock: looking a
  // note up mid-practice should not disturb anything else.
  const [lookupName, setLookupName] = useState("C");
  const [lookupOctave, setLookupOctave] = useState(4);

  const [octave, setOctave] = useState(4);
  const sounds=useToolSounds();
  const [tunerMore,toggleTunerMore]=useMore("cookie:tuner-more");
  const [droneMore,toggleDroneMore]=useMore("cookie:drone-more");
  /** Hear a sound choice right away: one accent and one beat, unless the metronome is already playing it. */
  const previewClick=async()=>{
    if(metro)return;
    const audio=getAudio();
    await prepareClickSounds(audio);
    const now=audio.currentTime+.05,gap=Math.min(.5,60/bpm);
    bookClick(audio,now,true,1,gap);bookClick(audio,now+gap,false,2,gap);
  };
  /** Hear a drone voice: a short A in the panel's octave, unless notes are already holding (they switch by themselves). */
  const previewDrone=()=>{
    if(drones.length)return;
    const audio=getAudio(),at=audio.currentTime+.03,samples=droneSamplesIfReady(audio);
    if(!samples)return;
    const {source,gain}=droneVoice(audio,samples,pitchFrequency("A",octave),at,.32);
    gain.gain.setTargetAtTime(.0001,at+.9,.06);source.stop(at+1.3);
  };
  // The metronome's extra options stay folded unless you opened them last time.
  // Read on the client only: the panel is never rendered on the server.
  const [more, setMore] = useState(()=>{try{return typeof window!=="undefined"&&localStorage.getItem(MORE_KEY)==="1"}catch{return false}});





  const tapTimes = useRef<number[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const frame = useRef<number | null>(null);
  const lastAnalysis = useRef(0);
  const lastSignal = useRef(0);
  const candidateMidi = useRef<number | null>(null);
  const candidateCount = useRef(0);
  const pitchHistory = useRef<number[]>([]);
  const smoothedHz = useRef<number | null>(null);
  const stableMidi = useRef<number | null>(69);

  const tunerSection = useRef<HTMLElement | null>(null);
  const metroSection = useRef<HTMLElement | null>(null);
  const droneSection = useRef<HTMLElement | null>(null);
  const fingeringSection = useRef<HTMLElement | null>(null);

  const inTune = Math.abs(reading.cents) <= 4;
  // The twelve note names, in chromatic order, taken from the chart itself
  // so the dock cannot list a note the data does not have.
  const lookupNames = Array.from(new Set(fluteFingerings.map((n) => n.names[0])));
  const octavesFor = (name: string) =>
    fluteFingerings.filter((n) => n.names[0] === name).map((n) => Number(n.pitch.replace(/\D/g, "")));
  const lookupOctaves = octavesFor(lookupName);
  // A name does not exist in every octave (there is no B♭3, and the
  // altissimo stops partway), so fall back rather than showing nothing.
  const activeOctave = lookupOctaves.includes(lookupOctave) ? lookupOctave : lookupOctaves[0];
  const lookupNote =
    fluteFingerings.find((n) => n.names[0] === lookupName && Number(n.pitch.replace(/\D/g, "")) === activeOctave) ??
    fluteFingerings[0];
  const tunerTone = !signalActive ? "idle" : inTune ? "tuned" : reading.cents < 0 ? "flat" : "sharp";

  /**
   * The tuner listens on the SAME context the metronome and drone play
   * through. It used to open a second one, and on iOS opening a mic input
   * while another context is playing reroutes the audio session — which
   * silenced the metronome and drone until the page was reloaded.
   */
  const getContext = () => getAudio();

  const micRequest=useRef(0),disconnectMic=useRef<(()=>void)|null>(null);
  const stopListening = () => {
    micRequest.current++;
    disconnectMic.current?.();disconnectMic.current=null;
    closeMic(stream.current);
    stream.current = null;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    setListening(false);
    setSignalActive(false);
    setTunerMessage(t.toolDock.listeningStopped);
  };

  useEffect(() => () => {
    micRequest.current++;disconnectMic.current?.();
    closeMic(stream.current);
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    /* The context is shared now, so it is not ours to close. */
  }, []);

  useEffect(() => {
    const openRequestedTool = (event: Event) => {
      const tool = (event as CustomEvent<{ tool?: ToolKey }>).detail?.tool;
      if (tool !== "tuner" && tool !== "metronome" && tool !== "drone" && tool !== "fingering") return;
      window.dispatchEvent(new Event("cookie:open-tools-panel"));
      setRequestedTool(tool);
      setFocusedTool(tool);
      setView(tool === "fingering" ? "fingering" : "main");
      setOpen(true);
    };
    window.addEventListener("cookie:open-practice-tools", openRequestedTool as EventListener);
    return () => window.removeEventListener("cookie:open-practice-tools", openRequestedTool as EventListener);
  }, []);

  useEffect(() => {
    if (!open || !requestedTool) return;
    const target = requestedTool === "fingering"
      ? fingeringSection.current
      : requestedTool === "tuner"
      ? tunerSection.current
      : requestedTool === "metronome"
        ? metroSection.current
        : droneSection.current;
    const focusTimer = window.setTimeout(() => {
      target?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      target?.focus({ preventScroll: true });
    }, 40);
    const clearTimer = window.setTimeout(() => setRequestedTool(null), 1300);
    return () => {
      clearTimeout(focusTimer);
      clearTimeout(clearTimer);
    };
  }, [open, requestedTool]);

  const tapTempo = () => {
    const now = performance.now();
    const previous = tapTimes.current.at(-1);
    if (!previous || now - previous > 2200) tapTimes.current = [now];
    else tapTimes.current = [...tapTimes.current.slice(-5), now];

    if (tapTimes.current.length < 2) {
      setTapHint(t.toolDock.keepTapping);
      return;
    }
    const intervals = tapTimes.current.slice(1).map((time, index) => time - tapTimes.current[index]);
    const nextBpm = Math.round(60000 / median(intervals));
    setBpm(clampTempo(nextBpm));
    setTapHint(t.toolDock.tapsAveraged(tapTimes.current.length));
  };


  const tuner = async () => {
    if(stream.current)return;
    const request=++micRequest.current;
    setMicProblem(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicProblem("unavailable");
      return;
    }

    try {
      const media = await openMic();
      if(request!==micRequest.current){closeMic(media);return}
      stream.current = media;
      const context = getContext();
      await context.resume();
      if(request!==micRequest.current){closeMic(media);return}
      const source = context.createMediaStreamSource(media);
      const highPass = context.createBiquadFilter();
      const analyser = context.createAnalyser();
      const data = new Float32Array(4096);
      highPass.type = "highpass";
      highPass.frequency.value = 150;
      highPass.Q.value = 0.7;
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0;
      // Safari only runs nodes that lead to an output; a muted gain keeps the analyser live on iPad.
      const sink = context.createGain();
      sink.gain.value = 0;
      source.connect(highPass).connect(analyser).connect(sink).connect(context.destination);
      disconnectMic.current=()=>{source.disconnect();highPass.disconnect();analyser.disconnect();sink.disconnect()};

      candidateMidi.current = null;
      candidateCount.current = 0;
      pitchHistory.current = [];
      lastSignal.current = 0;
      setListening(true);
      setSignalActive(false);
      setTunerMessage(zh?"听音中…":"Listening…");

      const loop = (timestamp: number) => {
        if (timestamp - lastAnalysis.current >= 42) {
          lastAnalysis.current = timestamp;
          analyser.getFloatTimeDomainData(data);
          const estimate = detectPitch(data, context.sampleRate);

          if (estimate) {
            const midi = midiFromHz(estimate.hz);
            if (candidateMidi.current === midi) candidateCount.current += 1;
            else {
              candidateMidi.current = midi;
              candidateCount.current = 1;
              pitchHistory.current = [];
            }
            pitchHistory.current = [...pitchHistory.current.slice(-4), estimate.hz];

            const neededFrames = stableMidi.current === midi ? 2 : 3;
            if (candidateCount.current >= neededFrames) {
              const filteredHz = median(pitchHistory.current);
              const stabilizedHz = stableMidi.current === midi && smoothedHz.current
                ? smoothedHz.current * 0.68 + filteredHz * 0.32
                : filteredHz;
              smoothedHz.current = stabilizedHz;
              stableMidi.current = midi;
              const cents = Math.max(-50, Math.min(50, centsFromMidi(stabilizedHz, midi)));
              setReading({
                name: pitches[(midi + 120) % 12],
                octave: Math.floor(midi / 12) - 1,
                hz: stabilizedHz,
                cents,
                midi,
              });
              setSignalActive(true);
              setTunerMessage(Math.abs(cents) <= 4 ? t.toolDock.inTune : cents < 0 ? t.toolDock.littleFlat : t.toolDock.littleSharp);
              lastSignal.current = performance.now();
            }
          } else if (lastSignal.current && performance.now() - lastSignal.current > 1050) {
            setSignalActive(false);
            setTunerMessage(zh?"请吹奏一个音":"Play a note");
            candidateMidi.current = null;
            candidateCount.current = 0;
            pitchHistory.current = [];
          }
        }
        frame.current = requestAnimationFrame(loop);
      };
      frame.current = requestAnimationFrame(loop);
    } catch {
      if(request!==micRequest.current)return;
      closeMic(stream.current);stream.current=null;
      disconnectMic.current?.();disconnectMic.current=null;
      setListening(false);
      setSignalActive(false);
      setMicProblem("blocked");
    }
  };

  // Follow panel visibility. A late permission response cannot revive a closed tuner.
  const tunerActions=useRef({start:tuner,stop:stopListening});
  useEffect(()=>{tunerActions.current={start:tuner,stop:stopListening}});
  useEffect(()=>{
    if(open&&view==="main")void tunerActions.current.start();
    return()=>tunerActions.current.stop();
  },[open,view]);

  useEffect(() => {
    if (!open) return;
    const position = () => {
      if (moved.current) return;
      const rect = launcherRef.current?.getBoundingClientRect();
      if (!rect) return;
      const header = launcherRef.current?.closest("header")?.getBoundingClientRect();
      const top = Math.max(rect.bottom, header?.bottom ?? 0) + 10;
      setAnchor({
        top: Math.min(top, Math.max(12, window.innerHeight - 340)),
        right: Math.min(Math.max(12, window.innerWidth - Math.min(320, window.innerWidth - 24) - 12), Math.max(12, window.innerWidth - rect.right)),
      });
    };
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        launcherRef.current?.focus();
      }
    };
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    window.addEventListener("keydown", dismiss);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      window.removeEventListener("keydown", dismiss);
    };
  }, [open, toolsSlot]);

  const movePanel = (top:number, right:number) => {
    moved.current = true;
    const width = panelRef.current?.offsetWidth ?? 320;
    const height = panelRef.current?.offsetHeight ?? 260;
    setAnchor({
      top:Math.max(8,Math.min(top,window.innerHeight - Math.min(height,window.innerHeight - 16) - 8)),
      right:Math.max(8,Math.min(right,window.innerWidth - width - 8)),
    });
  };
  const startDrag = (event:ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    drag.current = {id:event.pointerId,x:event.clientX,y:event.clientY,...anchor};
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const rulerStyle = useMemo(() => ({
    "--cents-position": `${50 + reading.cents * 0.92}%`,
  } as CSSProperties), [reading.cents]);

  const launcher = (
    <button
      ref={launcherRef}
      className={open ? "dock-launcher" : "dock-launcher has-tip"}
      aria-expanded={open}
      aria-controls="practice-console"
      aria-label={open ? t.toolDock.hideTools : t.toolDock.practiceTools}
      // The studio's own tooltip, like the clock and account buttons beside it (not the browser's slow native one); none while the panel is open.
      data-tip={open ? undefined : t.toolDock.practiceTools}
      onClick={() => { if (!open) { window.dispatchEvent(new Event("cookie:open-tools-panel")); moved.current = false; setFocusedTool("tuner"); } setOpen((current) => !current); }}
    >
      {/* A tuning fork: the tools are what you tune and keep time with. */}
      <svg className="dock-launcher__icon dock-launcher__icon--fork" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M7 2.5v6a3 3 0 0 0 6 0v-6"/>
        <path d="M10 11.5v6"/>
      </svg>
      {(listening || metro || drones.length > 0) && <i aria-label={t.toolDock.toolRunning} />}
    </button>
  );

  return (
    <>
      {/* Rendered into the nav's slot, keeping the dock's own state (the
          tuner is listening, the metronome is running) as the one source
          for the running dot. Nothing floats in a corner: with no slot on
          the page there is no launcher. */}
      {toolsSlot ? createPortal(launcher, toolsSlot) : null}

      {open && (
        <section
          ref={panelRef}
          id="practice-console"
          className="practice-dock tools-panel"
          style={{ "--dock-top": `${anchor.top}px`, "--dock-right": `${anchor.right}px` } as CSSProperties}
          aria-label={t.toolDock.practiceTools}
        >
          {/* The grip: drag to move the panel on a desktop; on a phone the
              panel is a bottom sheet and pulling the grip down closes it
              (phones get no close button, see tools-panel.css). */}
          <div className="tools-panel__grip">
            <button type="button" className="tools-panel__handle"
              aria-label={zh?"移动工具面板，或使用方向键":"Move tools panel, or use arrow keys"}
              onPointerDown={startDrag}
              onPointerMove={event=>{
                const origin=drag.current;
                if(origin?.id!==event.pointerId)return;
                if(matchMedia("(max-width: 760px)").matches){if(event.clientY-origin.y>70){drag.current=null;setOpen(false)}return}
                movePanel(origin.top+event.clientY-origin.y,origin.right-event.clientX+origin.x);
              }}
              onPointerUp={()=>{drag.current=null}}
              onPointerCancel={()=>{drag.current=null}}
              onKeyDown={event=>{
                const directions:Record<string,[number,number]>={ArrowUp:[-10,0],ArrowDown:[10,0],ArrowLeft:[0,10],ArrowRight:[0,-10]};
                const delta=directions[event.key];
                if(delta){event.preventDefault();movePanel(anchor.top+delta[0],anchor.right+delta[1])}
              }}
            ><span aria-hidden="true"/></button>
            <CloseButton className="tools-panel__close" label={t.toolDock.close} onClick={()=>{setOpen(false);launcherRef.current?.focus()}}/>
          </div>

          {view==="main"?<div className="tools-panel__body">
            {/* Tuner. Tap the note to see how to finger it. */}
            <section ref={tunerSection} className={`tp-tuner is-${tunerTone}`} tabIndex={-1} aria-live="polite">
              <div className="tp-tuner__top">
                <button type="button" className="tp-tuner__note" onClick={()=>{
                  const match=fluteFingerings.find(n=>midiForPitch(n.pitch)===reading.midi);
                  if(match){setLookupName(match.names[0]);setLookupOctave(Number(match.pitch.replace(/\D/g,"")))}
                  setView("fingering");
                }} aria-label={zh?`${reading.name}${reading.octave} 的指法`:`Fingering for ${reading.name}${reading.octave}`}>
                  <b>{reading.name}</b><sup>{reading.octave}</sup>
                </button>

              </div>
              <div className="tp-meter" style={rulerStyle}>
                <div className="tp-meter__track"><span className="tp-meter__band"/><i className="tp-meter__center"/><em className="tp-meter__needle"/></div>
                {/* The reading rides under the needle, so the eye stays on one spot. */}
                <span className="tp-meter__cents">{signalActive?`${reading.cents>0?"+":""}${Math.round(reading.cents)}¢`:listening?tunerMessage:""}</span>
              </div>
              {micProblem&&<p className="tp-mic-note"><MicBlocked zh={zh} unavailable={micProblem==="unavailable"}/><button type="button" className="text-action" onClick={tuner}>{zh?"重试":"Retry"}</button></p>}
              <div className="tp-row tp-tuner__foot">
                <button type="button" className="text-action tp-more" aria-expanded={tunerMore} onClick={toggleTunerMore}>{zh?"更多":"More"}<ChevronIcon/></button>
                {/* Tuned to something other than 440: say so, so a reading is never a surprise. */}
                {!tunerMore&&sounds.a4!==440&&<span className="tp-hint">A = {sounds.a4}</span>}
              </div>
              {tunerMore&&<div className="tp-more__body">
                <div className="tp-row">
                  <span className="tp-label">{zh?"标准音":"Tune to"}</span>
                  <Stepper size="small" tone="text" value={sounds.a4} min={A4_MIN} max={A4_MAX} onChange={a4=>setToolSounds({a4})} display={`A = ${sounds.a4}`}
                    valueText={zh?`A 等于 ${sounds.a4} 赫兹`:`A equals ${sounds.a4} hertz`} label={zh?"标准音 A":"Concert A"} decreaseLabel={zh?"降低 1 赫兹":"Down 1 hertz"} increaseLabel={zh?"升高 1 赫兹":"Up 1 hertz"}/>
                </div>
              </div>}
            </section>

            {/* Drones: tap a note to hold it, tap again to stop; several can
                sound at once. The note the tuner hears is outlined. */}
            <section ref={droneSection} className="tp-drones" tabIndex={-1}>
              <div className="tp-row">
                <span className="tp-label">{zh?"持续音":"Drone"}</span>
                <Stepper size="small" tone="text" value={octave} min={3} max={6} onChange={setOctave} display={zh?`第 ${octave} 八度`:`Octave ${octave}`}
                  label={zh?"持续音八度":"Drone octave"} decreaseLabel={t.toolDock.lowerOctave} increaseLabel={t.toolDock.higherOctave}/>
              </div>
              <div className="tp-notes">
                {pitches.map(pitch=>{
                  const on=drones.includes(`${pitch}${octave}`),heard=signalActive&&reading.name===pitch;
                  return <button key={pitch} type="button" aria-pressed={on} className={`${on?"is-on ":""}${heard?`is-heard is-${tunerTone}`:""}`} onClick={()=>toggleSharedDrone(pitch,octave)}>{pitch}</button>;
                })}
              </div>
              {drones.length>0&&<div className="tp-drone-active" role="group" aria-label={zh?"正在播放的持续音":"Active drone pitches"}>
                {drones.map(note=><button key={note} type="button" className="tp-chip is-on" aria-label={zh?`停止 ${note}`:`Stop ${note}`}
                  onClick={()=>toggleSharedDrone(note.slice(0,-1),Number(note.slice(-1)))}>{note}<span aria-hidden="true"> ×</span></button>)}
              </div>}
              <div className="tp-row tp-drone__foot">
                {drones.length>0&&<button type="button" className="text-action" onClick={stopAllDrones}>{zh?"全部停止":"Stop all"}</button>}
              <button type="button" className="text-action tp-more" aria-expanded={droneMore} onClick={toggleDroneMore}>{zh?"更多":"More"}<ChevronIcon/></button>
              </div>
              {droneMore&&<div className="tp-more__body">
                <Choice zh={zh} label={["Sound","音色"]} value={sounds.drone} options={DRONE_SOUNDS} onPick={drone=>{setToolSounds({drone});previewDrone()}}/>
                <Choice zh={zh} label={["Add","加音"]} value={sounds.droneAdd} options={DRONE_ADDS} onPick={droneAdd=>{setToolSounds({droneAdd});previewDrone()}}/>
              </div>}
            </section>

            {/* Metronome. */}
            <section ref={metroSection} className="tp-metro" tabIndex={-1}>
              <button type="button" className={`tp-play ${metro?"is-on":""}`} onClick={toggleToolMetro} aria-label={metro?t.toolDock.stopMetronome:t.toolDock.startMetronome} aria-pressed={metro}>
                {metro?<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="4" y="4" width="8" height="8" rx="1.5"/></svg>:<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5v9l7.5-4.5z"/></svg>}
              </button>
              <Stepper className="tp-tempo" editable liveValue={liveTempo} inputDelay={LIVE_TEMPO_DELAY} value={bpm} min={TEMPO_MIN} max={TEMPO_MAX} onChange={setBpm} valueText={zh?`每分钟 ${bpm} 拍`:`${bpm} BPM`}
                label={zh?"节拍器速度":"Metronome tempo"} decreaseLabel={t.toolDock.decreaseTempo} increaseLabel={t.toolDock.increaseTempo}/>
              <button type="button" className="tp-chip" onClick={tapTempo}>{zh?"点拍":"Tap"}</button>
              <span className="tp-meter-select">
                <select className="tp-chip" aria-label={zh?"拍号":"Meter"} value={meterLabel(meterOf(setup,beats).id)} onChange={e=>{
                  const target=METERS.find(m=>meterLabel(m.id)===e.target.value)!;
                  const current=meterOf(setup,beats),note=noteIn(setup,current);
                  const family=(m:Meter)=>m.groups?m.groups.every(g=>g===3)?"compound":"odd":String(m.bottom);
                  const plain=target.bottom===4;
                  if(plain)setBeats(target.top);
                  setSetup({...setup,meter:plain?null:target.id,note:family(target)===family(current)&&notesFor(target).includes(note)?note:naturalNote(target)});
                }}>
                  {METER_STEPS.map(meter=><option key={meter} value={meter}>{meter}</option>)}
                </select>
                <ChevronIcon/>
              </span>
              <button type="button" className={`tp-chip ${accent?"is-on":""}`} aria-pressed={accent} onClick={()=>setAccent(!accent)}>{zh?"重音":"Accent"}</button>
              <MetronomeMore zh={zh} open={more} onToggle={()=>{const next=!more;setMore(next);try{localStorage.setItem(MORE_KEY,next?"1":"0")}catch{/* fine */}}}
                setup={setup} setSetup={setSetup} beats={beats} accent={accent} setAccent={setAccent} toolBeat={toolMode?toolBeat:null} toolPulse={toolMode?toolPulse:null} preview={previewClick}/>
            </section>
          </div>:<div className="tools-panel__body">
            {/* Fingering lookup: the standard fingering for any note, with
                the full chart one link away. */}
            <section ref={fingeringSection} className="tp-fingering" tabIndex={-1}>
              <div className="tp-row">
                <button type="button" className="tp-back" aria-label={zh?"返回工具":"Back to tools"} onClick={()=>setView("main")}><BackChevron/></button>
                <Link className="tp-link" href="/flute-studio/fingerings">{t.toolDock.fullChart}</Link>
              </div>
              <div className="tp-fingering__now">
                <StaffNote midi={midiForPitch(lookupNote.pitch)} spelling={lookupNote.names[0]} width={116} />
                <FluteDiagram pressed={lookupNote.fingerings[0].keys} className="dock-fingering-diagram" />
              </div>
              <div className="tp-notes">
                {lookupNames.map(name=><button key={name} type="button" className={name===lookupName?"is-on":""} aria-pressed={name===lookupName} onClick={()=>setLookupName(name)}>{name}</button>)}
              </div>
              <div className="tp-row tp-row--center">
                <Stepper size="small" tone="text" value={activeOctave} min={lookupOctaves[0]} max={lookupOctaves[lookupOctaves.length-1]} onChange={setLookupOctave}
                  display={zh?`第 ${activeOctave} 八度`:`Octave ${activeOctave}`} label={zh?"指法八度":"Fingering octave"} decreaseLabel={t.toolDock.lowerOctave} increaseLabel={t.toolDock.higherOctave}/>
              </div>
            </section>
          </div>}
        </section>
      )}
    </>
  );
}
