"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
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
import {detectPitch, median} from "./lib/pitch";
import {usePracticeAudio} from "./PracticeAudio";
import {FluteDiagram} from "./components/FluteDiagram";
import {fluteFingerings, midiForPitch} from "../../content/fingerings/flute";
import {StaffNote} from "./components/StaffNote";

type ToolKey = "tuner" | "metronome" | "drone" | "fingering";
type PitchReading = {
  name: string;
  octave: number;
  hz: number;
  cents: number;
  midi: number;
};


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
    // uses the nav's. Whichever is actually on screen wins, and if neither
    // is the launcher floats as before.
    //
    // Checked after paint: on a client-side navigation this effect runs
    // before the incoming route has laid out, so measuring immediately
    // found neither slot visible and the button dropped back to floating.
    let frame = 0;
    const pick = () => {
      const slot = ["reader-tools-slot", "practice-tools-slot"]
        .map(id => document.getElementById(id))
        .find(el => {
          if (!el || !el.getClientRects().length) return false;
          const rect = el.getBoundingClientRect();
          return rect.right > 0 && rect.left < window.innerWidth && rect.bottom > 0 && rect.top < window.innerHeight;
        }) ?? null;
      setToolsSlot(slot);
    };
    frame = requestAnimationFrame(() => { frame = requestAnimationFrame(pick); });
    window.addEventListener("resize", pick);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", pick); };
  }, [pathname]);
  const [requestedTool, setRequestedTool] = useState<ToolKey | null>(null);
  const [, setFocusedTool] = useState<ToolKey>("tuner");

  const {bpm,setBpm,metro,toggleMetro,accent,setAccent,beats,setBeats,drones,toggleDrone:toggleSharedDrone,stopAllDrones,getAudio}=usePracticeAudio();
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
  // Which fingering the dock is showing, chosen as a note name plus an
  // octave rather than one pitch out of 41. Local to the dock: looking a
  // note up mid-practice should not disturb anything else.
  const [lookupName, setLookupName] = useState("C");
  const [lookupOctave, setLookupOctave] = useState(4);

  const [octave, setOctave] = useState(4);





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

  const stopListening = () => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    setListening(false);
    setSignalActive(false);
    setTunerMessage(t.toolDock.listeningStopped);
  };

  useEffect(() => () => {
    stream.current?.getTracks().forEach((track) => track.stop());
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
    setBpm(Math.max(40, Math.min(220, nextBpm)));
    setTapHint(t.toolDock.tapsAveraged(tapTimes.current.length));
  };


  const tuner = async () => {
    if (listening) {
      stopListening();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setTunerMessage(t.toolDock.micNotAvailable);
      return;
    }

    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: {
          autoGainControl: false,
          echoCancellation: false,
          noiseSuppression: false,
        },
      });
      stream.current = media;
      const context = getContext();
      await context.resume();
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

      candidateMidi.current = null;
      candidateCount.current = 0;
      pitchHistory.current = [];
      lastSignal.current = 0;
      setListening(true);
      setSignalActive(false);
      setTunerMessage(t.toolDock.listeningForNote);

      const loop = (timestamp: number) => {
        if (timestamp - lastAnalysis.current >= 42) {
          lastAnalysis.current = timestamp;
          analyser.getFloatTimeDomainData(data);
          const estimate = detectPitch(data, context.sampleRate);

          if (estimate) {
            const midi = Math.round(69 + 12 * Math.log2(estimate.hz / 440));
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
              const target = 440 * 2 ** ((midi - 69) / 12);
              const cents = Math.max(-50, Math.min(50, 1200 * Math.log2(stabilizedHz / target)));
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
            setTunerMessage(t.toolDock.playClearer);
            candidateMidi.current = null;
            candidateCount.current = 0;
            pitchHistory.current = [];
          }
        }
        frame.current = requestAnimationFrame(loop);
      };
      frame.current = requestAnimationFrame(loop);
    } catch {
      setListening(false);
      setSignalActive(false);
      setTunerMessage(t.toolDock.micAccessDenied);
    }
  };

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
      className="dock-launcher"
      aria-expanded={open}
      aria-controls="practice-console"
      aria-label={open ? t.toolDock.hideTools : t.toolDock.practiceTools}
      title={open ? t.toolDock.hideTools : t.toolDock.practiceTools}
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
          for the running dot. Falls back to its old floating position if
          the slot is not on the page. */}
      {toolsSlot ? createPortal(launcher, toolsSlot) : launcher}

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
            <button type="button" className="tools-panel__close" aria-label={t.toolDock.close} onClick={()=>{setOpen(false);launcherRef.current?.focus()}}>
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>
            </button>
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
                <button type="button" className={`tp-listen ${listening?"is-on":""}`} onClick={tuner} aria-pressed={listening}>
                  <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5.5" y="1.5" width="5" height="8.5" rx="2.5"/><path d="M3 8a5 5 0 0 0 10 0M8 13v2"/></svg>
                  {listening?(zh?"停止":"Stop"):(zh?"听音":"Listen")}
                </button>
              </div>
              <div className="tp-meter" style={rulerStyle}>
                <div className="tp-meter__track"><span className="tp-meter__band"/><i className="tp-meter__center"/><em className="tp-meter__needle"/></div>
                {/* The reading rides under the needle, so the eye stays on one spot. */}
                <span className="tp-meter__cents">{signalActive?`${reading.cents>0?"+":""}${Math.round(reading.cents)}¢`:listening?tunerMessage:(zh?"点“听音”开始":"Tap Listen to start")}</span>
              </div>
            </section>

            {/* Drones: tap a note to hold it, tap again to stop; several can
                sound at once. The note the tuner hears is outlined. */}
            <section ref={droneSection} className="tp-drones" tabIndex={-1}>
              <div className="tp-row">
                <span className="tp-label">{zh?"持续音":"Drone"}{drones.length>0&&<button type="button" className="tp-stop" onClick={stopAllDrones}>{zh?"全部停止":"Stop"}</button>}</span>
                <div className="tp-stepper tp-stepper--small">
                  <button type="button" aria-label={t.toolDock.lowerOctave} onClick={()=>setOctave(Math.max(3,octave-1))}>−</button>
                  <span>{zh?`第 ${octave} 八度`:`Octave ${octave}`}</span>
                  <button type="button" aria-label={t.toolDock.higherOctave} onClick={()=>setOctave(Math.min(6,octave+1))}>+</button>
                </div>
              </div>
              <div className="tp-notes">
                {pitches.map(pitch=>{
                  const on=drones.includes(`${pitch}${octave}`),heard=signalActive&&reading.name===pitch;
                  return <button key={pitch} type="button" aria-pressed={on} className={`${on?"is-on ":""}${heard?`is-heard is-${tunerTone}`:""}`} onClick={()=>toggleSharedDrone(pitch,octave)}>{pitch}</button>;
                })}
              </div>
            </section>

            {/* Metronome. */}
            <section ref={metroSection} className="tp-metro" tabIndex={-1}>
              <button type="button" className={`tp-play ${metro?"is-on":""}`} onClick={toggleMetro} aria-label={metro?t.toolDock.stopMetronome:t.toolDock.startMetronome} aria-pressed={metro}>
                {metro?<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="4" y="4" width="8" height="8" rx="1.5"/></svg>:<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5v9l7.5-4.5z"/></svg>}
              </button>
              <div className="tp-stepper">
                <button type="button" aria-label={t.toolDock.decreaseTempo} onClick={()=>setBpm(Math.max(40,bpm-1))}>−</button>
                <b>{bpm}</b>
                <button type="button" aria-label={t.toolDock.increaseTempo} onClick={()=>setBpm(Math.min(220,bpm+1))}>+</button>
              </div>
              <button type="button" className="tp-chip" onClick={tapTempo}>{zh?"点拍":"Tap"}</button>
              <button type="button" className="tp-chip" onClick={()=>setBeats(beats>=6?2:beats===4?6:beats+1)} aria-label={zh?`每小节 ${beats} 拍`:`${beats} beats a bar`}>{zh?`${beats} 拍`:`${beats} beats`}</button>
              <button type="button" className={`tp-chip ${accent?"is-on":""}`} aria-pressed={accent} onClick={()=>setAccent(!accent)}>{zh?"重音":"Accent"}</button>
            </section>
          </div>:<div className="tools-panel__body">
            {/* Fingering lookup: the standard fingering for any note, with
                the full chart one link away. */}
            <section ref={fingeringSection} className="tp-fingering" tabIndex={-1}>
              <div className="tp-row">
                <button type="button" className="tp-back" onClick={()=>setView("main")}>‹ {zh?"返回":"Back"}</button>
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
                <div className="tp-stepper tp-stepper--small">
                  <button type="button" aria-label={t.toolDock.lowerOctave} disabled={activeOctave<=lookupOctaves[0]} onClick={()=>setLookupOctave(Math.max(lookupOctaves[0],activeOctave-1))}>−</button>
                  <span>{zh?`第 ${activeOctave} 八度`:`Octave ${activeOctave}`}</span>
                  <button type="button" aria-label={t.toolDock.higherOctave} disabled={activeOctave>=lookupOctaves[lookupOctaves.length-1]} onClick={()=>setLookupOctave(Math.min(lookupOctaves[lookupOctaves.length-1],activeOctave+1))}>+</button>
                </div>
              </div>
            </section>
          </div>}
        </section>
      )}
    </>
  );
}
