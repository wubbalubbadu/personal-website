"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";

type Mode = "beat" | "drone";

type PitchMatch = { center: number; period: number; frequency: number; clarity: number };

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  return `${mins}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}

function noteName(frequency: number) {
  const midi = Math.round(69 + 12 * Math.log2(frequency / 440));
  const notes = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
  return `${notes[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

function findStablePitch(buffer: AudioBuffer): PitchMatch | null {
  const source = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const frameSize = Math.min(4096, 2 ** Math.floor(Math.log2(source.length)));
  if (frameSize < 512) return null;
  const hop = Math.floor(frameSize / 4);
  const minLag = Math.floor(sampleRate / 1000);
  const maxLag = Math.min(Math.floor(sampleRate / 55), Math.floor(frameSize / 2));
  const candidates: PitchMatch[] = [];

  for (let start = 0; start + frameSize < source.length; start += hop) {
    let energy = 0;
    for (let i = 0; i < frameSize; i++) energy += source[start + i] ** 2;
    const rms = Math.sqrt(energy / frameSize);
    if (rms < 0.025) continue;
    let bestLag = 0;
    let bestCorrelation = 0;
    for (let lag = minLag; lag <= maxLag; lag++) {
      let cross = 0;
      let left = 0;
      let right = 0;
      const count = frameSize - lag;
      for (let i = 0; i < count; i += 2) {
        const a = source[start + i];
        const b = source[start + i + lag];
        cross += a * b;
        left += a * a;
        right += b * b;
      }
      const correlation = cross / Math.sqrt(left * right || 1);
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestLag = lag;
      }
    }
    if (bestCorrelation > 0.55 && bestLag) {
      candidates.push({ center: start + Math.floor(frameSize / 2), period: bestLag, frequency: sampleRate / bestLag, clarity: bestCorrelation });
    }
  }

  if (!candidates.length) return null;
  return candidates.reduce((best, candidate, index) => {
    const nearby = candidates.slice(Math.max(0, index - 2), index + 3);
    const stability = nearby.reduce((score, other) => score + Math.abs(Math.log2(other.frequency / candidate.frequency)), 0) / nearby.length;
    const score = candidate.clarity - stability * 2;
    const bestNearby = candidates.slice(Math.max(0, candidates.indexOf(best) - 2), candidates.indexOf(best) + 3);
    const bestStability = bestNearby.reduce((total, other) => total + Math.abs(Math.log2(other.frequency / best.frequency)), 0) / bestNearby.length;
    return score > best.clarity - bestStability * 2 ? candidate : best;
  });
}

function makeDroneBuffer(context: AudioContext, source: AudioBuffer, match: PitchMatch) {
  const input = source.getChannelData(0);
  const period = Math.max(2, Math.round(match.period));
  const output = context.createBuffer(1, period, source.sampleRate);
  const wave = output.getChannelData(0);
  const cycles = 8;
  const firstCycle = Math.max(0, Math.min(input.length - period * cycles, match.center - Math.floor(period * cycles / 2)));
  let mean = 0;
  for (let phase = 0; phase < period; phase++) {
    for (let cycle = 0; cycle < cycles; cycle++) wave[phase] += input[firstCycle + cycle * period + phase] / cycles;
    mean += wave[phase] / period;
  }
  let peak = 0;
  for (let i = 0; i < period; i++) {
    wave[i] -= mean;
    peak = Math.max(peak, Math.abs(wave[i]));
  }
  if (peak) for (let i = 0; i < period; i++) wave[i] = wave[i] / peak * 0.72;
  return output;
}

function trimSilence(context: AudioContext, source: AudioBuffer) {
  let peak = 0;
  for (let channel = 0; channel < source.numberOfChannels; channel++) {
    const data = source.getChannelData(channel);
    for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
  }
  const threshold = peak * 0.035;
  let start = 0;
  let end = source.length;
  const first = source.getChannelData(0);
  while (start < end && Math.abs(first[start]) < threshold) start++;
  while (end > start && Math.abs(first[end - 1]) < threshold) end--;
  const padding = Math.floor(source.sampleRate * 0.015);
  start = Math.max(0, start - padding);
  end = Math.min(source.length, end + padding);
  if (end - start < 32 || (start === 0 && end === source.length)) return source;
  const trimmed = context.createBuffer(source.numberOfChannels, end - start, source.sampleRate);
  for (let channel = 0; channel < source.numberOfChannels; channel++) trimmed.copyToChannel(source.getChannelData(channel).slice(start, end), channel);
  return trimmed;
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("beat");
  const [bpm, setBpm] = useState(92);
  const [soundName, setSoundName] = useState("");
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("Drop in a sound to begin");
  const [activeBeat, setActiveBeat] = useState(-1);
  const contextRef = useRef<AudioContext | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const timerRef = useRef<number | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const activeSourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const beatRef = useRef(0);

  function getContext() {
    if (!contextRef.current) contextRef.current = new AudioContext();
    return contextRef.current;
  }

  function stop() {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    sourceRef.current?.stop();
    sourceRef.current = null;
    activeSourcesRef.current.forEach((source) => { try { source.stop(); } catch {} });
    activeSourcesRef.current.clear();
    setIsPlaying(false);
    setActiveBeat(-1);
    setStatus(bufferRef.current ? "Ready when you are" : "Drop in a sound to begin");
  }

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    sourceRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    contextRef.current?.close();
  }, []);

  async function loadSound(data: ArrayBuffer, name: string) {
    stop();
    try {
      const context = getContext();
      const decoded = await context.decodeAudioData(data.slice(0));
      const trimmed = trimSilence(context, decoded);
      bufferRef.current = trimmed;
      setSoundName(name);
      setDuration(trimmed.duration);
      setStatus("Sound loaded. Give it a spin.");
    } catch {
      setStatus("I couldn’t read that audio file. Try MP3, WAV, or M4A.");
    }
  }

  async function pickFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) await loadSound(await file.arrayBuffer(), file.name);
    event.target.value = "";
  }

  async function toggleRecording() {
    if (isRecording) {
      recorderRef.current?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("Recording isn’t available in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => chunks.push(event.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        const blob = new Blob(chunks, { type: recorder.mimeType });
        await loadSound(await blob.arrayBuffer(), "my recording");
      };
      recorder.start();
      setIsRecording(true);
      setStatus("Recording… tap again when you’re done");
    } catch {
      setStatus("Microphone access was blocked.");
    }
  }

  function playBeat() {
    const context = getContext();
    const buffer = bufferRef.current;
    if (!buffer) return;
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(0.85, context.currentTime);
    gain.gain.setValueAtTime(0.85, context.currentTime + Math.max(0, buffer.duration - 0.025));
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + buffer.duration);
    source.connect(gain).connect(context.destination);
    activeSourcesRef.current.add(source);
    source.onended = () => activeSourcesRef.current.delete(source);
    source.start();
    setActiveBeat(beatRef.current % 4);
    beatRef.current += 1;
  }

  async function play() {
    if (isPlaying) return stop();
    const buffer = bufferRef.current;
    if (!buffer) {
      setStatus("Add a sound first");
      return;
    }
    const context = getContext();
    await context.resume();
    setIsPlaying(true);
    if (mode === "beat") {
      beatRef.current = 0;
      playBeat();
      timerRef.current = window.setInterval(playBeat, 60000 / bpm);
      setStatus(`Ticking at ${bpm} BPM`);
    } else {
      setStatus("Finding the steadiest pitch…");
      const match = findStablePitch(buffer);
      if (!match) {
        setIsPlaying(false);
        setStatus("I couldn’t find a steady pitch. Try holding one note a little longer.");
        return;
      }
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = makeDroneBuffer(context, buffer, match);
      source.loop = true;
      gain.gain.setValueAtTime(0, context.currentTime);
      gain.gain.linearRampToValueAtTime(0.55, context.currentTime + 0.15);
      source.connect(gain).connect(context.destination);
      source.start();
      sourceRef.current = source;
      setStatus(`Holding ${noteName(match.frequency)} · ${Math.round(match.frequency)} Hz`);
    }
  }

  function changeMode(next: Mode) {
    stop();
    setMode(next);
  }

  return (
    <main>
      <nav className="topbar" aria-label="Main navigation">
        <a className="logo" href="#top"><span>c</span>cookie</a>
        <div className="navlinks"><a href="#tools">tiny tools</a><a href="#about">about</a></div>
        <span className="crumbs" aria-hidden="true">· · ·</span>
      </nav>

      <section className="intro" id="top">
        <p className="kicker">welcome to my digital cookie tin</p>
        <h1>small things,<br /><em>baked with care.</em></h1>
        <p className="lede">A growing collection of useful, playful, and slightly odd things I make here and there.</p>
        <a className="scribble-link" href="#tools">open the tin <span>↓</span></a>
        <div className="cookie-doodle" aria-hidden="true"><i /><i /><i /><i /><i /></div>
      </section>

      <section className="tool-section" id="tools">
        <div className="section-heading">
          <div><p className="kicker">fresh from the oven · 001</p><h2>Any Tune Metronome</h2></div>
          <p>Make a beat out of anything.<br />A tap, a clap, your cat, whatever.</p>
        </div>

        <div className="tool-card">
          <div className="tape">COOKIE&apos;S TOOL No. 1</div>
          <div className="sound-panel">
            <span className="step">1</span>
            <h3>Choose your sound</h3>
            <p>Upload a tiny audio moment or record one right here. Nothing leaves your browser.</p>
            <div className="sound-actions">
              <label className="button primary"><input type="file" accept="audio/*" onChange={pickFile} />↑ Upload audio</label>
              <span>or</span>
              <button className={`button record ${isRecording ? "recording" : ""}`} onClick={toggleRecording}><b>●</b>{isRecording ? "Stop recording" : "Record a sound"}</button>
            </div>
            <div className={`sound-file ${soundName ? "loaded" : ""}`}>
              <span className="file-icon">♫</span>
              <div><strong>{soundName || "No sound yet"}</strong><small>{soundName ? `${formatTime(duration)} · ready to loop` : "MP3, WAV, M4A, or microphone"}</small></div>
              {soundName && <button aria-label="Remove sound" onClick={() => { stop(); bufferRef.current = null; setSoundName(""); setDuration(0); }}>×</button>}
            </div>
          </div>

          <div className="controls-panel">
            <div className="control-head"><span className="step">2</span><div><h3>Shape the loop</h3><p>Pick a style, set the pace, then press play.</p></div></div>
            <div className="mode-tabs" role="group" aria-label="Playback style">
              <button className={mode === "beat" ? "active" : ""} onClick={() => changeMode("beat")}><span>× · × · ×</span><strong>Beat</strong><small>A crisp metronome tick</small></button>
              <button className={mode === "drone" ? "active" : ""} onClick={() => changeMode("drone")}><span>〰〰〰</span><strong>Drone</strong><small>One endless sound bed</small></button>
            </div>
            <div className={`tempo ${mode === "drone" ? "disabled" : ""}`}>
              <label htmlFor="bpm">tempo</label><output>{bpm}<small>BPM</small></output>
              <input id="bpm" type="range" min="40" max="220" value={bpm} onChange={(e) => { stop(); setBpm(Number(e.target.value)); }} disabled={mode === "drone"} />
              <div><span>slow &amp; gooey</span><span>quick &amp; crispy</span></div>
            </div>
            <div className="transport">
              <button className={`play ${isPlaying ? "playing" : ""}`} onClick={play} aria-label={isPlaying ? "Stop" : "Play"}>{isPlaying ? "■" : "▶"}</button>
              <div className="beat-dots" aria-label="Four beat indicator">{[0,1,2,3].map((beat) => <i className={activeBeat === beat ? "on" : ""} key={beat} />)}</div>
              <p>{status}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="shelf">
        <p className="kicker">still cooling</p>
        <div><article><span>002</span><h3>???</h3><p>Something small is taking shape.</p></article><article><span>003</span><h3>???</h3><p>Leave a little room for surprise.</p></article></div>
      </section>

      <footer id="about"><a className="logo" href="#top"><span>c</span>cookie</a><p>made in small batches, somewhere on the internet.</p><a href="mailto:hello@example.com">say hello ↗</a></footer>
    </main>
  );
}
