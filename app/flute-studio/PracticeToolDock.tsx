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
const centsMarks = [-50, -25, 0, 25, 50];



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
  const [focusedTool, setFocusedTool] = useState<ToolKey>("tuner");

  const {bpm,setBpm,metro,toggleMetro,drones,toggleDrone:toggleSharedDrone,stopAllDrones,getAudio}=usePracticeAudio();
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

  const [note, setNote] = useState("A");
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

  const selectedDrone = `${note}${octave}`;
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

  const toggleDrone=()=>toggleSharedDrone(note,octave);

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
      source.connect(highPass).connect(analyser);

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
      <svg className="dock-launcher__icon" viewBox="0 0 18 18" aria-hidden="true">
        <path d="M3 5h12M3 13h12"/>
        <circle cx="7" cy="5" r="1.8"/>
        <circle cx="12" cy="13" r="1.8"/>
      </svg>
      <span className="dock-launcher__label">{zh?"工具":"Tools"}</span>
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
          className="practice-dock practice-dock--compact"
          style={{ "--dock-top": `${anchor.top}px`, "--dock-right": `${anchor.right}px` } as CSSProperties}
          aria-label={t.toolDock.practiceTools}
        >
          <div className="dock-panel-heading">
          <button type="button" className="dock-drag-handle"
            aria-label={zh?"移动工具面板，或使用方向键":"Move tools panel, or use arrow keys"}
            onPointerDown={startDrag}
            onPointerMove={event=>{
              const origin=drag.current;
              if(origin?.id===event.pointerId)movePanel(origin.top+event.clientY-origin.y,origin.right-event.clientX+origin.x);
            }}
            onPointerUp={()=>{drag.current=null}}
            onPointerCancel={()=>{drag.current=null}}
            onKeyDown={event=>{
              const directions:Record<string,[number,number]>={ArrowUp:[-10,0],ArrowDown:[10,0],ArrowLeft:[0,10],ArrowRight:[0,-10]};
              const delta=directions[event.key];
              if(delta){event.preventDefault();movePanel(anchor.top+delta[0],anchor.right+delta[1])}
            }}
          ><span aria-hidden="true"/></button>
          <button type="button" className="dock-panel-close" aria-label={t.toolDock.close} onClick={()=>{setOpen(false);launcherRef.current?.focus()}}>×</button>
          </div>
          <nav className="dock-tabs" aria-label={t.toolDock.showOneTool}>
            {(["tuner", "metronome", "drone", "fingering"] as const).map((key) => (
              <button
                key={key}
                type="button"
                className={focusedTool === key ? "selected" : ""}
                aria-pressed={focusedTool === key}
                data-running={(key === "tuner" ? listening : key === "metronome" ? metro : key === "drone" ? drones.length > 0 : false) || undefined}
                onClick={() => setFocusedTool(key)}
              >
                {key === "tuner" ? t.toolDock.tunerLabel : key === "metronome" ? t.toolDock.metronomeLabel : key === "drone" ? t.toolDock.droneLabel : t.toolDock.fingeringLabel}
              </button>
            ))}
          </nav>

          <div className="dock-tools" data-single="">
            <section
              ref={tunerSection}
              className="dock-tool dock-tool-tuner"
              data-requested={requestedTool === "tuner" || undefined}
              hidden={focusedTool !== "tuner"}
              tabIndex={-1}
            >

              <div className={`tuner-reading ${tunerTone}`} aria-live="polite">
                <div className="tuner-note"><b>{reading.name}</b><sup>{reading.octave}</sup></div>
                <span>{signalActive ? `${reading.hz.toFixed(1)} Hz` : t.toolDock.lastStablePitch}</span>
              </div>

              <div className={`cents-ruler ${tunerTone}`} style={rulerStyle}>
                <div className="cents-track">
                  {Array.from({ length: 21 }, (_, index) => <i key={index} className={index % 5 === 0 ? "major" : ""} />)}
                  <em aria-hidden="true" />
                </div>
                <div className="cents-labels">
                  {centsMarks.map((mark) => <span key={mark}>{mark > 0 ? `+${mark}` : mark}</span>)}
                </div>
              </div>

              <p className="tuner-status">{tunerMessage}</p>
              <button className={`primary-tool-button ${listening ? "is-running" : ""}`} onClick={tuner}>
                {listening ? t.toolDock.stopListening : t.toolDock.listen}
              </button>
            </section>

            <section
              ref={metroSection}
              className="dock-tool dock-tool-metronome"
              data-requested={requestedTool === "metronome" || undefined}
              hidden={focusedTool !== "metronome"}
              tabIndex={-1}
            >

              <div className="tempo-stepper">
                <button aria-label={t.toolDock.decreaseTempo} onClick={() => setBpm(Math.max(40, bpm - 1))}>−</button>
                <div><b>{bpm}</b><span>{t.toolDock.bpm}</span></div>
                <button aria-label={t.toolDock.increaseTempo} onClick={() => setBpm(Math.min(220, bpm + 1))}>+</button>
              </div>
              <input
                className="tempo-slider"
                aria-label={t.toolDock.tempoAria}
                type="range"
                min="40"
                max="220"
                value={bpm}
                onChange={(event) => setBpm(Number(event.target.value))}
              />
              <div className="metro-options">
                <button className="tap-tempo-button" onClick={tapTempo}>{t.toolDock.tapTempo}</button>
              </div>
              <button className={`primary-tool-button ${metro ? "is-running" : ""}`} onClick={toggleMetro}>
                {metro ? t.toolDock.stopMetronome : t.toolDock.startMetronome}
              </button>
            </section>

            <section
              ref={droneSection}
              className="dock-tool dock-tool-drone"
              data-requested={requestedTool === "drone" || undefined}
              hidden={focusedTool !== "drone"}
              tabIndex={-1}
            >

              <div className="selected-pitch" aria-live="polite">
                <span>{note}</span><sup>{octave}</sup>
              </div>
              <div className="pitch-choices" aria-label={t.toolDock.selectDroneNote}>
                {pitches.map((pitch) => (
                  <button
                    key={pitch}
                    className={pitch === note ? "selected" : ""}
                    aria-pressed={pitch === note}
                    onClick={() => setNote(pitch)}
                  >
                    {pitch}
                  </button>
                ))}
              </div>
              <div className="octave-stepper">
                <button aria-label={t.toolDock.lowerOctave} onClick={() => setOctave(Math.max(3, octave - 1))}>−</button>
                <span><small>{t.toolDock.octave}</small><b>{octave}</b></span>
                <button aria-label={t.toolDock.higherOctave} onClick={() => setOctave(Math.min(6, octave + 1))}>+</button>
              </div>
              {drones.length>0&&<div className="drone-active-inline"><span>{t.toolDock.playing}</span>{drones.map(pitch=><b key={pitch}>{pitch}</b>)}<button onClick={stopAllDrones}>{t.toolDock.stopAll}</button></div>}
              <button className={`primary-tool-button ${drones.includes(selectedDrone) ? "is-running" : ""}`} onClick={toggleDrone}>
                {drones.includes(selectedDrone) ? t.toolDock.stopDrone(selectedDrone) : t.toolDock.playDrone(selectedDrone)}
              </button>
            </section>
            {/* Fingerings live in the dock as well as on their own page:
                looking one up mid-practice should not cost you the score you
                are reading. Picking a name and then an octave beats a strip
                of 41 buttons — twelve names wrap into two short rows, and
                the octaves are however many that name actually has. The
                dock shows the standard fingering only; alternates stay on
                the chart, where there is room to say when to use them. */}
            <section
              ref={fingeringSection}
              className="dock-tool dock-tool-fingering"
              data-requested={requestedTool === "fingering" || undefined}
              hidden={focusedTool !== "fingering"}
              tabIndex={-1}
            >
              <Link className="dock-fingering-link" href="/flute-studio/fingerings">{t.toolDock.fullChart}</Link>

              {/* Stave and diagram share a line: the dock is short, and the
                  two together are what you are actually reading. */}
              <div className="dock-fingering-now">
                <StaffNote midi={midiForPitch(lookupNote.pitch)} spelling={lookupNote.names[0]} width={116} />
                <FluteDiagram pressed={lookupNote.fingerings[0].keys} className="dock-fingering-diagram" />
              </div>

              {/* The drone's own pitch picker and octave stepper, same
                  classes and all — the two tools ask the same question, so
                  they should not answer it with different controls. */}
              <div className="pitch-choices">
                {lookupNames.map((name) => (
                  <button
                    key={name}
                    className={name === lookupName ? "selected" : ""}
                    aria-pressed={name === lookupName}
                    onClick={() => setLookupName(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <div className="octave-stepper">
                <button
                  aria-label={t.toolDock.lowerOctave}
                  disabled={activeOctave <= lookupOctaves[0]}
                  onClick={() => setLookupOctave(Math.max(lookupOctaves[0], activeOctave - 1))}
                >
                  −
                </button>
                <span><small>{t.toolDock.octave}</small><b>{activeOctave}</b></span>
                <button
                  aria-label={t.toolDock.higherOctave}
                  disabled={activeOctave >= lookupOctaves[lookupOctaves.length - 1]}
                  onClick={() => setLookupOctave(Math.min(lookupOctaves[lookupOctaves.length - 1], activeOctave + 1))}
                >
                  +
                </button>
              </div>
            </section>
          </div>
        </section>
      )}
    </>
  );
}
