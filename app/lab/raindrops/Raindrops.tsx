"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {analyzeSteps, noteName, toMono, type Analysis} from "../articulation/engine";
import {closeMic, openMic} from "../../flute-studio/lib/audioSession";
import {referenceA} from "../../flute-studio/lib/toolSounds";
import {DEMO_RATE, demoTake} from "./demo";
import {LiveListener, TAP_WORKLET} from "./live";
import {drawPond, dropsFor, lastsUntil, shuffleLooks, type Drop} from "./rain";
import "./raindrops.css";

/**
 * Raindrops: play (or open, or use the demo), and each note falls as a drop on a dark pond. The drawing is a pure
 * function of time (rain.ts), so playback, scrubbing and the saved video all show the same picture.
 *
 * The canvas is always 1080 × 1350 (4:5, the shape phones show best), scaled to fit the page.
 */
const W = 1080, H = 1350, MAX_SECONDS = 90;

type Take = {samples: Float32Array; sampleRate: number; buffer: AudioBuffer; name: string};
type Phase = "empty" | "recording" | "live" | "working" | "ready";

export default function Raindrops() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const audio = useRef<AudioContext | null>(null);
  const source = useRef<AudioBufferSourceNode | null>(null);
  const clock = useRef<{startedAt: number; from: number} | null>(null);
  const frame = useRef(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const micStream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const run = useRef(0);
  const live = useRef<{listener: LiveListener; node: AudioWorkletNode; media: MediaStream; sink: GainNode} | null>(null);
  const workletReady = useRef<Promise<void> | null>(null);

  const [phase, setPhase] = useState<Phase>("empty");
  const [take, setTake] = useState<Take | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [progress, setProgress] = useState(0);
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [circle, setCircle] = useState(true);
  const [labels, setLabels] = useState(false);
  /** Blind test: the same timing, with the looks shuffled between notes (rain.ts shuffleLooks). */
  const [blind, setBlind] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const drops: Drop[] = useMemo(() => {
    if (!analysis) return [];
    const real = dropsFor(analysis, noteName);
    return blind ? shuffleLooks(real, 1) : real;
  }, [analysis, blind]);
  const endMs = useMemo(() => (analysis ? Math.max(analysis.durationMs, ...drops.map(lastsUntil)) : 0), [analysis, drops]);

  const context = useCallback(() => {
    if (!audio.current) audio.current = new AudioContext();
    return audio.current;
  }, []);

  const draw = useCallback((t: number) => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    if (!analysis) {
      ctx.fillStyle = "#05060a";
      ctx.fillRect(0, 0, W, H);
      return;
    }
    drawPond(ctx, W, H, drops, analysis, t, {circle, labels});
  }, [analysis, drops, circle, labels]);

  useEffect(() => { if (!playing) draw(position); }, [draw, playing, position]);

  const stop = useCallback(() => {
    cancelAnimationFrame(frame.current);
    try { source.current?.stop(); } catch { /* already stopped */ }
    source.current = null;
    clock.current = null;
    setPlaying(false);
  }, []);

  useEffect(() => () => {
    stop();
    closeMic(micStream.current);
    if (live.current) { live.current.node.disconnect(); closeMic(live.current.media); live.current = null; }
    void audio.current?.close();
  }, [stop]);

  /** Plays from `fromMs`, drawing every frame; `extra` also receives the audio (for saving a video). */
  const play = useCallback((fromMs: number, extra?: AudioNode) => {
    if (!take || !analysis) return;
    stop();
    const ctx = context();
    void ctx.resume();
    const node = ctx.createBufferSource();
    node.buffer = take.buffer;
    node.connect(ctx.destination);
    if (extra) node.connect(extra);
    const startAt = ctx.currentTime + 0.05;
    if (fromMs < analysis.durationMs) node.start(startAt, fromMs / 1000);
    source.current = node;
    clock.current = {startedAt: startAt, from: fromMs};
    setPlaying(true);
    const tick = () => {
      const c = clock.current;
      if (!c) return;
      const t = c.from + Math.max(0, ctx.currentTime - c.startedAt) * 1000;
      draw(t);
      setPosition(t);
      if (t >= endMs) { stop(); setPosition(endMs); window.dispatchEvent(new Event("raindrops:end")); return; }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, [take, analysis, context, draw, endMs, stop]);

  /** Analyses samples a slice at a time (a minute of audio is a few seconds of work). */
  const analyse = useCallback(async (samples: Float32Array, sampleRate: number, buffer: AudioBuffer, name: string) => {
    const id = ++run.current;
    stop();
    setPhase("working"); setProblem(null); setProgress(0); setPosition(0);
    setTake({samples, sampleRate, buffer, name});
    const steps = analyzeSteps(samples, sampleRate);
    for (;;) {
      const next = steps.next();
      if (run.current !== id) return;
      if (next.done) {
        setAnalysis(next.value);
        setPhase("ready");
        if (!next.value.notes.length) setProblem("No notes were heard. Try closer to the microphone, or a little louder.");
        return;
      }
      setProgress(next.value.fraction);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }, [stop]);

  async function fromBlob(blob: Blob, name: string) {
    try {
      const decoded = await context().decodeAudioData(await blob.arrayBuffer());
      const seconds = Math.min(decoded.duration, MAX_SECONDS);
      const channels = Array.from({length: decoded.numberOfChannels}, (_, c) => decoded.getChannelData(c).subarray(0, Math.floor(seconds * decoded.sampleRate)));
      await analyse(toMono(channels), decoded.sampleRate, decoded, name);
    } catch {
      setProblem("That file could not be read. Try a WAV, M4A or MP3.");
      setPhase(analysis ? "ready" : "empty");
    }
  }

  async function loadDemo() {
    const samples = demoTake();
    const buffer = context().createBuffer(1, samples.length, DEMO_RATE);
    buffer.getChannelData(0).set(samples);
    await analyse(samples, DEMO_RATE, buffer, "Demo take (synthetic)");
  }

  async function record() {
    setProblem(null);
    try {
      const media = await openMic();
      micStream.current = media;
      chunks.current = [];
      const next = new MediaRecorder(media);
      next.ondataavailable = event => { if (event.data.size) chunks.current.push(event.data); };
      next.onstop = () => {
        closeMic(media);
        micStream.current = null;
        void fromBlob(new Blob(chunks.current, {type: next.mimeType}), "Your take");
      };
      next.start();
      recorder.current = next;
      setElapsed(0);
      setPhase("recording");
    } catch {
      closeMic(micStream.current);
      micStream.current = null;
      setProblem("The microphone is blocked. Allow it in the browser's site settings, then press Record again.");
    }
  }
  function stopRecording() { recorder.current?.stop(); recorder.current = null; }

  useEffect(() => {
    if (phase !== "recording") return;
    const started = Date.now();
    const id = setInterval(() => {
      const seconds = (Date.now() - started) / 1000;
      setElapsed(Math.floor(seconds));
      if (seconds >= MAX_SECONDS) stopRecording();
    }, 250);
    return () => clearInterval(id);
  }, [phase]);

  /**
   * Live: the microphone feeds the live listener (live.ts) through a tiny AudioWorklet, and the pond is drawn from
   * whatever it has heard so far. A note's drop lands when the note starts and takes its final shape when it ends.
   * Stopping keeps the take: it is analysed in full and can be replayed or saved as a video.
   */
  async function startLive() {
    setProblem(null);
    stop();
    let media: MediaStream | null = null;
    try {
      const ctx = context();
      await ctx.resume();
      if (!ctx.audioWorklet) throw new Error("no worklet");
      if (!workletReady.current) {
        const url = URL.createObjectURL(new Blob([TAP_WORKLET], {type: "application/javascript"}));
        workletReady.current = ctx.audioWorklet.addModule(url);
      }
      await workletReady.current;
      media = await openMic();
      const listener = new LiveListener(ctx.sampleRate, referenceA());
      const input = ctx.createMediaStreamSource(media);
      const node = new AudioWorkletNode(ctx, "raindrops-tap");
      // The worklet has to be pulled by the output to run; a silent gain keeps the microphone out of the speakers.
      const sink = ctx.createGain();
      sink.gain.value = 0;
      input.connect(node).connect(sink).connect(ctx.destination);
      node.port.onmessage = event => {
        listener.push(event.data as Float32Array);
        if (listener.full) void stopLive();
      };
      live.current = {listener, node, media, sink};
      setAnalysis(null);
      setPhase("live");
      let version = -1, liveDrops: Drop[] = [];
      const tick = () => {
        const current = live.current;
        if (!current) return;
        const t = current.listener.heardMs;
        const shim = {notes: current.listener.notes, phrases: current.listener.phrases} as unknown as Analysis;
        if (current.listener.version !== version) {
          version = current.listener.version;
          liveDrops = dropsFor(shim, noteName);
        }
        // The note still sounding stays fully present and keeps making rings until it ends.
        const openIndex = current.listener.openIndex;
        const shown = openIndex === null ? liveDrops : liveDrops.map(d => d.index === openIndex ? {...d, soundMs: Math.max(d.soundMs, t - d.at + 200), end: "settle" as const, threadTo: null} : d);
        const ctx2d = canvas.current?.getContext("2d");
        if (ctx2d) drawPond(ctx2d, W, H, shown, shim, t, {circle, labels});
        setElapsed(Math.floor(t / 1000));
        frame.current = requestAnimationFrame(tick);
      };
      frame.current = requestAnimationFrame(tick);
    } catch {
      closeMic(media);
      setProblem(media ? "Live listening is not available in this browser. Try Chrome, Edge or Safari." : "The microphone is blocked. Allow it in the browser's site settings, then try again.");
      setPhase(analysis ? "ready" : "empty");
    }
  }

  async function stopLive() {
    const current = live.current;
    if (!current) return;
    live.current = null;
    cancelAnimationFrame(frame.current);
    current.node.port.onmessage = null;
    current.node.disconnect();
    current.sink.disconnect();
    closeMic(current.media);
    current.listener.finish();
    const samples = current.listener.samples.slice();
    if (!samples.length) { setPhase("empty"); return; }
    const buffer = context().createBuffer(1, samples.length, current.listener.sampleRate);
    buffer.getChannelData(0).set(samples);
    await analyse(samples, current.listener.sampleRate, buffer, "Live take");
  }

  /** Plays the whole take from the start while recording the canvas and the sound into one video file. */
  async function saveVideo() {
    const element = canvas.current;
    if (!element || !analysis || saving) return;
    // H.264 in MP4 first: it plays everywhere (phones, RedNote, X). Safari gives it with AAC sound, Chrome with Opus.
    // Then WebM. A plain "video/mp4" comes last: in Chrome it can mean VP9 inside MP4, which iPhones will not play.
    const types = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4;codecs=avc1,mp4a.40.2", "video/mp4;codecs=avc1,opus", "video/webm;codecs=vp9,opus", "video/webm", "video/mp4"];
    const type = types.find(t => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t));
    if (!type || !("captureStream" in element)) { setProblem("This browser cannot save a video of the canvas. Try Chrome or Safari."); return; }
    const ctx = context();
    const sound = ctx.createMediaStreamDestination();
    const stream = new MediaStream([...element.captureStream(30).getVideoTracks(), ...sound.stream.getAudioTracks()]);
    const parts: Blob[] = [];
    const video = new MediaRecorder(stream, {mimeType: type, videoBitsPerSecond: 8_000_000});
    video.ondataavailable = event => { if (event.data.size) parts.push(event.data); };
    const done = new Promise<void>(resolve => { video.onstop = () => resolve(); });
    setSaving(true);
    video.start();
    const ended = new Promise<void>(resolve => window.addEventListener("raindrops:end", () => resolve(), {once: true}));
    play(0, sound);
    await ended;
    await new Promise(resolve => setTimeout(resolve, 300));
    video.stop();
    await done;
    setSaving(false);
    const blob = new Blob(parts, {type});
    const link = document.createElement("a");
    const now = new Date(), pad = (n: number) => String(n).padStart(2, "0");
    link.href = URL.createObjectURL(blob);
    link.download = `raindrops${blind ? "-shuffled" : ""}-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.${type.startsWith("video/mp4") ? "mp4" : "webm"}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 2000);
  }

  const clockText = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;
  const busy = phase === "working" || phase === "recording" || phase === "live" || saving;

  return <main className="rain">
    <header className="rain__head">
      <a className="rain__back" href="/lab">Lab</a>
      <h1>Raindrops</h1>
      <p>Each note you play falls as a drop. Where it lands is its pitch; how it splashes, rings and fades is how you played it.</p>
    </header>

    <div className="rain__layout">
      <div className="rain__stage">
        <canvas ref={canvas} width={W} height={H} className="rain__canvas" aria-label="The pond: each note as a drop"/>
        {phase === "empty" && <div className="rain__empty">
          <p>Record a phrase, open a recording, or start with the demo.</p>
        </div>}
        {phase === "working" && <div className="rain__empty"><p>Listening closely… {Math.round(progress * 100)}%</p></div>}
        {phase === "recording" && <div className="rain__empty"><p>Recording {clockText(elapsed * 1000)}. Play, then press Stop.</p></div>}
        {phase === "live" && elapsed < 2 && <div className="rain__empty"><p>Listening. Stay quiet for a moment so it can hear the room, then play.</p></div>}
      </div>

      <aside className="rain__side">
        <div className="rain__buttons">
          {phase === "recording"
            ? <button type="button" className="rain__button is-main" onClick={stopRecording}>Stop</button>
            : <button type="button" className="rain__button is-main" disabled={busy} onClick={() => void record()}>Record</button>}
          <button type="button" className="rain__button" disabled={busy} onClick={() => fileInput.current?.click()}>Open a recording</button>
          <button type="button" className="rain__button" disabled={busy} onClick={() => void loadDemo()}>Demo</button>
          {phase === "live"
            ? <button type="button" className="rain__button is-live" onClick={() => void stopLive()}>Stop live · {clockText(elapsed * 1000)}</button>
            : <button type="button" className="rain__button is-live" disabled={busy} onClick={() => void startLive()}>Live</button>}
          <input ref={fileInput} type="file" accept="audio/*" hidden onChange={event => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void fromBlob(file, file.name);
          }}/>
        </div>

        {analysis && phase === "ready" && <>
          <div className="rain__transport">
            <button type="button" className="rain__button is-main" disabled={saving} onClick={() => playing ? stop() : play(position >= endMs ? 0 : position)}>{playing ? "Pause" : "Play"}</button>
            <input type="range" min={0} max={Math.round(endMs)} step={10} value={Math.round(position)} disabled={saving} aria-label="Position"
              onChange={event => { stop(); setPosition(Number(event.target.value)); }}/>
            <span className="rain__time">{clockText(position)} / {clockText(endMs)}</span>
          </div>
          <p className="rain__take">{take?.name} · {analysis.notes.length} notes · {analysis.phrases.length} {analysis.phrases.length === 1 ? "phrase" : "phrases"}</p>
          <div className="rain__toggles">
            <label><input type="checkbox" checked={circle} onChange={event => setCircle(event.target.checked)}/> Show the circle of notes</label>
            <label><input type="checkbox" checked={labels} onChange={event => setLabels(event.target.checked)}/> Note names</label>
            <label><input type="checkbox" checked={blind} disabled={saving} onChange={event => setBlind(event.target.checked)}/> Blind test: shuffle which note gets which look</label>
          </div>
          <button type="button" className="rain__button" disabled={saving || playing} onClick={() => void saveVideo()}>{saving ? "Saving the video… (plays through once)" : "Save as a video"}</button>
        </>}

        {problem && <p className="rain__problem">{problem}</p>}

        <details className="rain__how" open={phase !== "ready"}>
          <summary>How your playing becomes rain</summary>
          <dl>
            <dt>Where it lands</dt><dd>The note&apos;s name sets the angle (C at the top, clockwise by semitone). Higher notes land further out. A whole-tone scale lands on a hexagon.</dd>
            <dt>Size</dt><dd>How loud the note is.</dd>
            <dt>Splash</dt><dd>The attack. A crisp tongue throws up a crown of droplets; a soft or breath attack swells a glow instead. A slurred note has no splash.</dd>
            <dt>Rings</dt><dd>New rings keep coming for as long as the note really sounds, so staccato makes one or two rings and a long tone many.</dd>
            <dt>Fade</dt><dd>The ending. A stopped note is cut off; a natural ending settles; a tapered one dissolves slowly. A slur draws a thread of light to the next note instead.</dd>
            <dt>Mist</dt><dd>Breath in the sound.</dd>
            <dt>Shimmer</dt><dd>Vibrato: rings that waver instead of staying round.</dd>
            <dt>Constellation</dt><dd>Each note of the phrase stays as a faint point, joined in order, until the phrase ends: scales become shapes.</dd>
            <dt>Water</dt><dd>The phrase&apos;s shape: warm while it grows, cool while it fades, rose for an arch; brighter as the phrase gets louder.</dd>
          </dl>
          <p className="rain__note">Live: drops land as you play. A tongued note appears about 45 ms late (the tongue test has to hear the sound come back), and a note&apos;s ending is drawn once it ends. Stop to replay the take or save it as a video.</p>
          <p className="rain__note">Blind test: save one video with the real mapping and one shuffled (same timing, looks swapped between notes). Show both to someone without saying which is which. If they cannot tell, the mapping is decoration. The file name says which is which, so rename them before showing.</p>
          <p className="rain__note">Every mapping is one line in <code>app/lab/raindrops/rain.ts</code>. Change them; that is the point. Analysed on this device, nothing is uploaded.</p>
        </details>
      </aside>
    </div>
  </main>;
}
