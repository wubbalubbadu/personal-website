"use client";

import {
  CSSProperties,
  PointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "./practice-tool-dock.css";

type ToolKey = "tuner" | "metronome" | "drone";
type PitchReading = {
  name: string;
  octave: number;
  hz: number;
  cents: number;
  midi: number;
};
type DroneVoice = { oscillator: OscillatorNode; gain: GainNode };

const pitches = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const semitones: Record<string, number> = {
  C: 0,
  "C♯": 1,
  D: 2,
  "E♭": 3,
  E: 4,
  F: 5,
  "F♯": 6,
  G: 7,
  "A♭": 8,
  A: 9,
  "B♭": 10,
  B: 11,
};
const centsMarks = [-50, -25, 0, 25, 50];

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function pitchFromBuffer(buffer: Float32Array, sampleRate: number) {
  let sumSquares = 0;
  for (let i = 0; i < buffer.length; i += 1) sumSquares += buffer[i] * buffer[i];
  const rms = Math.sqrt(sumSquares / buffer.length);

  // A flute easily clears this level at ordinary device distance. Room noise usually does not.
  if (rms < 0.014) return null;

  const analysisSize = Math.floor(buffer.length / 2);
  const minimumLag = Math.floor(sampleRate / 1500);
  const maximumLag = Math.min(Math.floor(sampleRate / 170), analysisSize - 2);
  const difference = new Float32Array(maximumLag + 1);

  for (let lag = minimumLag; lag <= maximumLag; lag += 1) {
    let total = 0;
    for (let i = 0; i < analysisSize; i += 1) {
      const delta = buffer[i] - buffer[i + lag];
      total += delta * delta;
    }
    difference[lag] = total;
  }

  let runningTotal = 0;
  let selectedLag = -1;
  let selectedScore = 1;
  for (let lag = minimumLag; lag <= maximumLag; lag += 1) {
    runningTotal += difference[lag];
    const normalized = runningTotal > 0 ? (difference[lag] * (lag - minimumLag + 1)) / runningTotal : 1;
    if (normalized < 0.15) {
      let localLag = lag;
      let localScore = normalized;
      while (localLag + 1 <= maximumLag) {
        const nextLag = localLag + 1;
        const nextRunning = runningTotal + difference[nextLag];
        const nextScore = nextRunning > 0
          ? (difference[nextLag] * (nextLag - minimumLag + 1)) / nextRunning
          : 1;
        if (nextScore >= localScore) break;
        localLag = nextLag;
        localScore = nextScore;
      }
      selectedLag = localLag;
      selectedScore = localScore;
      break;
    }
  }

  if (selectedLag < 0 || 1 - selectedScore < 0.78) return null;

  const previous = difference[selectedLag - 1] || difference[selectedLag];
  const current = difference[selectedLag];
  const next = difference[selectedLag + 1] || difference[selectedLag];
  const denominator = previous - 2 * current + next;
  const adjustment = denominator === 0 ? 0 : 0.5 * (previous - next) / denominator;
  const hz = sampleRate / (selectedLag + Math.max(-0.5, Math.min(0.5, adjustment)));
  return hz >= 170 && hz <= 1500 ? { hz, rms } : null;
}

export default function PracticeToolDock() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [requestedTool, setRequestedTool] = useState<ToolKey | null>(null);

  const [bpm, setBpm] = useState(76);
  const [metro, setMetro] = useState(false);
  const accent = false;
  const [tapHint, setTapHint] = useState("Tap a steady pulse");

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

  const [note, setNote] = useState("A");
  const [octave, setOctave] = useState(4);
  const [drones, setDrones] = useState<string[]>([]);

  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const metroTimer = useRef<number | null>(null);
  const beat = useRef(0);
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
  const voices = useRef(new Map<string, DroneVoice>());
  const tunerSection = useRef<HTMLElement | null>(null);
  const metroSection = useRef<HTMLElement | null>(null);
  const droneSection = useRef<HTMLElement | null>(null);

  const selectedDrone = `${note}${octave}`;
  const inTune = Math.abs(reading.cents) <= 4;
  const tunerTone = !signalActive ? "idle" : inTune ? "tuned" : reading.cents < 0 ? "flat" : "sharp";

  const getContext = () => audio.current ?? (audio.current = new AudioContext());

  const stopListening = () => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    setListening(false);
    setSignalActive(false);
    setTunerMessage("Listening stopped");
  };

  const stopMetronome = () => {
    if (metroTimer.current !== null) clearInterval(metroTimer.current);
    metroTimer.current = null;
    setMetro(false);
  };

  const stopAllDrones = () => {
    const context = audio.current;
    voices.current.forEach(({ oscillator, gain }) => {
      if (context) {
        gain.gain.cancelScheduledValues(context.currentTime);
        gain.gain.setTargetAtTime(0.0001, context.currentTime, 0.025);
        oscillator.stop(context.currentTime + 0.12);
      } else {
        oscillator.stop();
      }
    });
    voices.current.clear();
    setDrones([]);
  };

  useEffect(() => () => {
    if (metroTimer.current !== null) clearInterval(metroTimer.current);
    stream.current?.getTracks().forEach((track) => track.stop());
    voices.current.forEach(({ oscillator }) => oscillator.stop());
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    audio.current?.close();
  }, []);

  useEffect(() => {
    const openRequestedTool = (event: Event) => {
      const tool = (event as CustomEvent<{ tool?: ToolKey }>).detail?.tool;
      if (tool !== "tuner" && tool !== "metronome" && tool !== "drone") return;
      setRequestedTool(tool);
      setOpen(true);
    };
    window.addEventListener("cookie:open-practice-tools", openRequestedTool as EventListener);
    return () => window.removeEventListener("cookie:open-practice-tools", openRequestedTool as EventListener);
  }, []);

  useEffect(() => {
    if (!open || !requestedTool) return;
    const target = requestedTool === "tuner"
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

  const click = (isAccent = false) => {
    const context = getContext();
    void context.resume();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = isAccent ? 1320 : 880;
    gain.gain.setValueAtTime(isAccent ? 0.105 : 0.065, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.055);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.06);
  };

  const scheduleMetronome = () => {
    if (metroTimer.current !== null) clearInterval(metroTimer.current);
    beat.current = 0;
    click(accent);
    beat.current = 1;
    metroTimer.current = window.setInterval(() => {
      click(accent && beat.current === 0);
      beat.current = (beat.current + 1) % 4;
    }, 60000 / bpm);
  };

  const toggleMetro = () => {
    if (metro) stopMetronome();
    else setMetro(true);
  };

  useEffect(() => {
    if (!metro) return;
    scheduleMetronome();
    return () => {
      if (metroTimer.current !== null) clearInterval(metroTimer.current);
    };
    // scheduleMetronome intentionally restarts the pulse when tempo or accent changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpm, metro]);

  const tapTempo = () => {
    const now = performance.now();
    const previous = tapTimes.current.at(-1);
    if (!previous || now - previous > 2200) tapTimes.current = [now];
    else tapTimes.current = [...tapTimes.current.slice(-5), now];

    if (tapTimes.current.length < 2) {
      setTapHint("Keep tapping");
      return;
    }
    const intervals = tapTimes.current.slice(1).map((time, index) => time - tapTimes.current[index]);
    const nextBpm = Math.round(60000 / median(intervals));
    setBpm(Math.max(40, Math.min(220, nextBpm)));
    setTapHint(`${tapTimes.current.length} taps averaged`);
  };

  const toggleDrone = () => {
    const existing = voices.current.get(selectedDrone);
    if (existing) {
      const context = getContext();
      existing.gain.gain.cancelScheduledValues(context.currentTime);
      existing.gain.gain.setTargetAtTime(0.0001, context.currentTime, 0.025);
      existing.oscillator.stop(context.currentTime + 0.12);
      voices.current.delete(selectedDrone);
    } else {
      const context = getContext();
      void context.resume();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const midi = (octave + 1) * 12 + semitones[note];
      oscillator.type = "triangle";
      oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.032, context.currentTime + 0.12);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      voices.current.set(selectedDrone, { oscillator, gain });
    }
    setDrones([...voices.current.keys()]);
  };

  const tuner = async () => {
    if (listening) {
      stopListening();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setTunerMessage("Microphone input is not available in this browser");
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
      setTunerMessage("Listening for a clear, sustained note");

      const loop = (timestamp: number) => {
        if (timestamp - lastAnalysis.current >= 42) {
          lastAnalysis.current = timestamp;
          analyser.getFloatTimeDomainData(data);
          const estimate = pitchFromBuffer(data, context.sampleRate);

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
              setTunerMessage(Math.abs(cents) <= 4 ? "In tune" : cents < 0 ? "A little flat" : "A little sharp");
              lastSignal.current = performance.now();
            }
          } else if (lastSignal.current && performance.now() - lastSignal.current > 1050) {
            setSignalActive(false);
            setTunerMessage("Play a clearer sustained note");
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
      setTunerMessage("Microphone access was not available");
    }
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    drag.current = { x: event.clientX, y: event.clientY, px: pos.x, py: pos.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    setPos({
      x: drag.current.px + event.clientX - drag.current.x,
      y: drag.current.py + event.clientY - drag.current.y,
    });
  };

  const rulerStyle = useMemo(() => ({
    "--cents-position": `${50 + reading.cents * 0.92}%`,
  } as CSSProperties), [reading.cents]);

  return (
    <>
      <button
        className="dock-launcher"
        aria-expanded={open}
        aria-controls="practice-console"
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true">⌁</span>
        <span>{open ? "Hide tools" : "Practice tools"}</span>
        {(listening || metro || drones.length > 0) && <i aria-label="A practice tool is running" />}
      </button>

      {open && (
        <section
          id="practice-console"
          className="practice-dock"
          style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
          aria-label="Practice tools"
        >
          <header
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => { drag.current = null; }}
            onPointerCancel={() => { drag.current = null; }}
          >
            <div>
              <span className="dock-grip" aria-hidden="true" />
              <strong>Practice tools</strong>
              <small>Drag to move</small>
            </div>
            <button
              type="button"
              aria-label="Close practice tools"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </header>

          <div className="dock-tools">
            <section
              ref={tunerSection}
              className="dock-tool dock-tool-tuner"
              data-requested={requestedTool === "tuner" || undefined}
              tabIndex={-1}
            >
              <div className="dock-tool-heading">
                <span className="dock-tool-icon tuner-icon" aria-hidden="true">⌁</span>
                <div><small>TUNER</small><strong>Pitch center</strong></div>
              </div>

              <div className={`tuner-reading ${tunerTone}`} aria-live="polite">
                <div className="tuner-note"><b>{reading.name}</b><sup>{reading.octave}</sup></div>
                <span>{signalActive ? `${reading.hz.toFixed(1)} Hz` : "Last stable pitch"}</span>
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
                <span aria-hidden="true">{listening ? "■" : "●"}</span>
                {listening ? "Stop listening" : "Listen"}
              </button>
            </section>

            <section
              ref={metroSection}
              className="dock-tool dock-tool-metronome"
              data-requested={requestedTool === "metronome" || undefined}
              tabIndex={-1}
            >
              <div className="dock-tool-heading">
                <span className="dock-tool-icon metronome-icon" aria-hidden="true">♩</span>
                <div><small>METRONOME</small><strong>Steady pulse</strong></div>
              </div>

              <div className="tempo-stepper">
                <button aria-label="Decrease tempo" onClick={() => setBpm(Math.max(40, bpm - 1))}>−</button>
                <div><b>{bpm}</b><span>BPM</span></div>
                <button aria-label="Increase tempo" onClick={() => setBpm(Math.min(220, bpm + 1))}>+</button>
              </div>
              <input
                className="tempo-slider"
                aria-label="Tempo"
                type="range"
                min="40"
                max="220"
                value={bpm}
                onChange={(event) => setBpm(Number(event.target.value))}
              />
              <div className="metro-options">
                <button className="tap-tempo-button" onClick={tapTempo}>Tap tempo</button>
              </div>
              <button className={`primary-tool-button ${metro ? "is-running" : ""}`} onClick={toggleMetro}>
                <span aria-hidden="true">{metro ? "■" : "▶"}</span>
                {metro ? "Stop metronome" : "Start metronome"}
              </button>
            </section>

            <section
              ref={droneSection}
              className="dock-tool dock-tool-drone"
              data-requested={requestedTool === "drone" || undefined}
              tabIndex={-1}
            >
              <div className="dock-tool-heading">
                <span className="dock-tool-icon drone-icon" aria-hidden="true">◉</span>
                <div><small>DRONE</small><strong>Pitch pipe</strong></div>
              </div>

              <div className="selected-pitch" aria-live="polite">
                <span>{note}</span><sup>{octave}</sup>
              </div>
              <div className="pitch-choices" aria-label="Select drone note">
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
                <button aria-label="Lower octave" onClick={() => setOctave(Math.max(3, octave - 1))}>−</button>
                <span><small>OCTAVE</small><b>{octave}</b></span>
                <button aria-label="Higher octave" onClick={() => setOctave(Math.min(6, octave + 1))}>+</button>
              </div>
              {drones.length>0&&<div className="drone-active-inline"><span>Playing</span>{drones.map(pitch=><b key={pitch}>{pitch}</b>)}<button onClick={stopAllDrones}>Stop all</button></div>}
              <button className={`primary-tool-button ${drones.includes(selectedDrone) ? "is-running" : ""}`} onClick={toggleDrone}>
                <span aria-hidden="true">{drones.includes(selectedDrone) ? "■" : "▶"}</span>
                {drones.includes(selectedDrone) ? `Stop ${selectedDrone}` : `Play ${selectedDrone}`}
              </button>
            </section>
          </div>

        </section>
      )}
    </>
  );
}
