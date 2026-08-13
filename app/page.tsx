"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";

type Mode = "beat" | "drone";

type PitchMatch = { center: number; period: number; frequency: number; clarity: number };
type PresetKind = "beep" | "bark" | "fart" | "kick" | "snare" | "hat" | "cowbell" | "airhorn" | "wow";
type DroneTone = "soft" | "warm" | "organ";
const noteOptions = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];

const presets: { kind: PresetKind; icon: string; name: string }[] = [
  { kind: "beep", icon: "●", name: "Beep" }, { kind: "bark", icon: "♩", name: "Dog bark" },
  { kind: "fart", icon: "〰", name: "Tiny fart" }, { kind: "kick", icon: "◉", name: "Kick" },
  { kind: "snare", icon: "✳", name: "Snare" }, { kind: "hat", icon: "✺", name: "Hi-hat" },
  { kind: "cowbell", icon: "◇", name: "Cowbell" }, { kind: "airhorn", icon: "!", name: "Air horn" },
  { kind: "wow", icon: "↗", name: "Plot twist" },
];

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

function noteFrequency(note: string, octave: number) {
  const midi = (octave + 1) * 12 + noteOptions.indexOf(note);
  return 440 * 2 ** ((midi - 69) / 12);
}

function makeDroneTone(context: AudioContext, frequency: number, tone: DroneTone) {
  const period = Math.max(2, Math.round(context.sampleRate / frequency));
  const output = context.createBuffer(1, period, context.sampleRate);
  const wave = output.getChannelData(0);
  for (let i = 0; i < period; i++) {
    const phase = 2 * Math.PI * i / period;
    if (tone === "soft") wave[i] = Math.sin(phase) * .62;
    if (tone === "warm") wave[i] = (Math.sin(phase) + Math.sin(phase * 2) * .28 + Math.sin(phase * 3) * .13) * .48;
    if (tone === "organ") wave[i] = (Math.sin(phase) + Math.sin(phase * 2) * .42 + Math.sin(phase * 4) * .18) * .42;
  }
  return output;
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

function makePreset(context: AudioContext, kind: PresetKind) {
  const lengths: Record<PresetKind, number> = { beep: .22, bark: .36, fart: .5, kick: .32, snare: .24, hat: .12, cowbell: .32, airhorn: .52, wow: .5 };
  const length = Math.floor(context.sampleRate * lengths[kind]);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let phase = 0;
  let filteredNoise = 0;
  for (let i = 0; i < length; i++) {
    const t = i / context.sampleRate;
    const x = i / length;
    const noise = Math.random() * 2 - 1;
    filteredNoise = filteredNoise * .82 + noise * .18;
    let sample = 0;
    if (kind === "beep") sample = Math.sin(2 * Math.PI * 660 * t) * Math.exp(-t * 14);
    if (kind === "kick") { const f = 48 + 130 * Math.exp(-t * 22); phase += 2 * Math.PI * f / context.sampleRate; sample = Math.sin(phase) * Math.exp(-t * 13); }
    if (kind === "snare") sample = (noise * .8 + Math.sin(2 * Math.PI * 185 * t) * .25) * Math.exp(-t * 18);
    if (kind === "hat") sample = (noise - filteredNoise) * Math.exp(-t * 42);
    if (kind === "cowbell") sample = (Math.sin(2 * Math.PI * 540 * t) + Math.sin(2 * Math.PI * 800 * t) * .65) * Math.exp(-t * 11) * .65;
    if (kind === "bark") { const pulse = x < .48 ? Math.sin(Math.PI * x / .48) : Math.sin(Math.PI * (x - .48) / .52) * .7; const f = 185 - 70 * x; sample = (Math.sin(2 * Math.PI * f * t) * .48 + filteredNoise * .7) * Math.max(0, pulse); }
    if (kind === "fart") { const f = 72 + Math.sin(t * 65) * 13 + filteredNoise * 8; phase += 2 * Math.PI * f / context.sampleRate; sample = (Math.sin(phase) + Math.sin(phase * 2.03) * .38 + filteredNoise * .3) * Math.sin(Math.PI * x) * .65; }
    if (kind === "airhorn") sample = (Math.sin(2 * Math.PI * 311 * t) + Math.sin(2 * Math.PI * 392 * t) * .7 + Math.sin(2 * Math.PI * 466 * t) * .45) * Math.min(1, t * 45) * Math.exp(-t * 2.2) * .42;
    if (kind === "wow") { const f = 240 + x * 640; phase += 2 * Math.PI * f / context.sampleRate; sample = Math.sin(phase) * Math.sin(Math.PI * x) * .75; }
    data[i] = sample * Math.max(0, Math.min(1, i / 32, (length - i - 1) / 64));
  }
  return buffer;
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("beat");
  const [bpm, setBpm] = useState(92);
  const [soundName, setSoundName] = useState("");
  const [duration, setDuration] = useState(0);
  const [beatPlaying, setBeatPlaying] = useState(false);
  const [dronePlaying, setDronePlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("Drop in a sound to begin");
  const [activeBeat, setActiveBeat] = useState(-1);
  const [droneNote, setDroneNote] = useState("A");
  const [droneOctave, setDroneOctave] = useState(3);
  const [droneTone, setDroneTone] = useState<DroneTone>("warm");
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

  function stopBeat() {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    activeSourcesRef.current.forEach((source) => { try { source.stop(); } catch {} });
    activeSourcesRef.current.clear();
    setBeatPlaying(false);
    setActiveBeat(-1);
  }

  function stopDrone() {
    try { sourceRef.current?.stop(); } catch {}
    sourceRef.current = null;
    setDronePlaying(false);
  }

  function stop() {
    stopBeat();
    stopDrone();
    setStatus("Ready when you are");
  }

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    sourceRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    contextRef.current?.close();
  }, []);

  async function loadSound(data: ArrayBuffer, name: string) {
    if (mode === "beat") stopBeat(); else stopDrone();
    try {
      const context = getContext();
      const decoded = await context.decodeAudioData(data.slice(0));
      const trimmed = trimSilence(context, decoded);
      if (mode === "drone") {
        const match = findStablePitch(trimmed);
        if (!match) {
          setStatus("I couldn’t find a steady note. Hum one pitch for 1–3 seconds.");
          return;
        }
        const midi = Math.round(69 + 12 * Math.log2(match.frequency / 440));
        setDroneNote(noteOptions[((midi % 12) + 12) % 12]);
        setDroneOctave(Math.max(1, Math.min(6, Math.floor(midi / 12) - 1)));
        setStatus(`Found ${noteName(match.frequency)}. Pick a voice, then press play.`);
        return;
      }
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

  function choosePreset(kind: PresetKind, name: string) {
    stopBeat();
    const buffer = makePreset(getContext(), kind);
    bufferRef.current = buffer;
    setSoundName(name);
    setDuration(buffer.duration);
    setMode("beat");
    setStatus(`${name} is in the tin. Press play!`);
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
      setStatus(mode === "drone" ? "Listening for your note… hold it steady" : "Recording… tap again when you’re done");
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
    const beatLength = 60 / bpm;
    const audibleLength = Math.min(buffer.duration, Math.max(0.08, beatLength * 0.72));
    const fadeLength = Math.min(0.045, audibleLength * 0.25);
    gain.gain.setValueAtTime(0.85, context.currentTime);
    gain.gain.setValueAtTime(0.85, context.currentTime + Math.max(0, audibleLength - fadeLength));
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + audibleLength);
    source.connect(gain).connect(context.destination);
    activeSourcesRef.current.add(source);
    source.onended = () => activeSourcesRef.current.delete(source);
    source.start(0, 0, audibleLength);
    setActiveBeat(beatRef.current % 4);
    beatRef.current += 1;
  }

  async function play() {
    if (mode === "beat" && beatPlaying) { stopBeat(); setStatus(dronePlaying ? `Drone is still holding ${droneNote}${droneOctave}` : "Beat stopped"); return; }
    if (mode === "drone" && dronePlaying) { stopDrone(); setStatus(beatPlaying ? `Beat is still ticking at ${bpm} BPM` : "Drone stopped"); return; }
    const buffer = bufferRef.current;
    if (mode === "beat" && !buffer) {
      setStatus("Add a sound first");
      return;
    }
    const context = getContext();
    await context.resume();
    if (mode === "beat") {
      setBeatPlaying(true);
      beatRef.current = 0;
      playBeat();
      timerRef.current = window.setInterval(playBeat, 60000 / bpm);
      setStatus(`Ticking at ${bpm} BPM`);
    } else {
      setStatus("Finding the steadiest pitch…");
      const frequency = noteFrequency(droneNote, droneOctave);
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = makeDroneTone(context, frequency, droneTone);
      source.loop = true;
      gain.gain.setValueAtTime(0, context.currentTime);
      gain.gain.linearRampToValueAtTime(0.55, context.currentTime + 0.15);
      source.connect(gain).connect(context.destination);
      source.start();
      sourceRef.current = source;
      setDronePlaying(true);
      setStatus(`Holding ${droneNote}${droneOctave} · ${Math.round(frequency)} Hz`);
    }
  }

  function changeMode(next: Mode) {
    setMode(next);
    setStatus(next === "beat" ? (beatPlaying ? `Ticking at ${bpm} BPM` : "Choose a beat sound") : (dronePlaying ? `Holding ${droneNote}${droneOctave}` : "Choose a note and drone voice"));
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
          <div className="mode-first"><span className="step">1</span><div><h3>What are you making?</h3><p>Build one layer, then switch over to add the other. Both can play together.</p></div><div className="mode-tabs" role="group" aria-label="Choose a sound layer"><button className={mode === "beat" ? "active" : ""} onClick={() => changeMode("beat")}><span>× · × · ×</span><strong>Beat</strong><small>Short sounds at a tempo</small></button><button className={mode === "drone" ? "active" : ""} onClick={() => changeMode("drone")}><span>〰〰〰</span><strong>Drone</strong><small>One continuous note</small></button></div></div>
          <div className="sound-panel">
            <span className="step">2</span>
            {mode === "beat" ? <><h3>Choose a beat sound</h3><p>Upload a tiny audio moment, record one, or grab a sound from the tin.</p><aside className="recording-tip"><b>For a clean beat:</b> Make one short, punchy sound such as “beep,” a clap, or a tap. Leave a little silence after it.</aside><div className="preset-wrap"><small>pick from the sound tin</small><div className="presets">{presets.map((preset) => <button key={preset.kind} className={soundName === preset.name ? "selected" : ""} onClick={() => choosePreset(preset.kind, preset.name)}><i>{preset.icon}</i><span>{preset.name}</span></button>)}</div></div><div className="sound-actions"><label className="button primary"><input type="file" accept="audio/*" onChange={pickFile} />↑ Upload audio</label><span>or</span><button className={`button record ${isRecording ? "recording" : ""}`} onClick={toggleRecording}><b>●</b>{isRecording ? "Stop recording" : "Record a sound"}</button></div><div className={`sound-file ${soundName ? "loaded" : ""}`}><span className="file-icon">♫</span><div><strong>{soundName || "No sound yet"}</strong><small>{soundName ? `${formatTime(duration)} · ready to loop` : "MP3, WAV, M4A, or microphone"}</small></div>{soundName && <button aria-label="Remove sound" onClick={() => { stopBeat(); bufferRef.current = null; setSoundName(""); setDuration(0); }}>×</button>}</div></> : <><h3>Build a steady drone</h3><p>Choose the exact note and voice. This drone is separate from your metronome sound.</p><aside className="recording-tip drone"><b>Know the note?</b> Set it below. If not, hum one clear pitch for 1–3 seconds and Cookie will find it.</aside><div className="drone-pickers"><label>note<select value={droneNote} onChange={(e) => { stopDrone(); setDroneNote(e.target.value); }}>{noteOptions.map(note => <option key={note}>{note}</option>)}</select></label><label>octave<select value={droneOctave} onChange={(e) => { stopDrone(); setDroneOctave(Number(e.target.value)); }}>{[1,2,3,4,5,6].map(octave => <option key={octave}>{octave}</option>)}</select></label></div><small className="picker-label">choose a drone voice</small><div className="tone-pickers">{([['soft','Soft sine'],['warm','Warm hum'],['organ','Tiny organ']] as [DroneTone,string][]).map(([tone,label]) => <button className={droneTone === tone ? "selected" : ""} key={tone} onClick={() => { stopDrone(); setDroneTone(tone); }}>{label}</button>)}</div><button className={`button hum-button ${isRecording ? "recording" : ""}`} onClick={toggleRecording}><b>●</b>{isRecording ? "Stop and detect" : "Hum to find my note"}</button><p className="privacy-note">Your humming stays on this device.</p></>}
          </div>

          <div className="controls-panel">
            <div className="control-head"><span className="step">3</span><div><h3>{mode === "beat" ? "Set the pace" : "Start the drone"}</h3><p>{mode === "beat" ? "Choose a tempo, then start this layer." : "Start this layer, then switch to Beat if you want both."}</p></div></div>
            <div className={`tempo ${mode === "drone" ? "disabled" : ""}`}>
              <label htmlFor="bpm">tempo</label><output>{bpm}<small>BPM</small></output>
              <input id="bpm" type="range" min="40" max="220" value={bpm} onChange={(e) => { stopBeat(); setBpm(Number(e.target.value)); }} disabled={mode === "drone"} />
              <div><span>slow &amp; gooey</span><span>quick &amp; crispy</span></div>
            </div>
            <div className="transport">
              <button className={`play ${(mode === "beat" ? beatPlaying : dronePlaying) ? "playing" : ""}`} onClick={play} aria-label={(mode === "beat" ? beatPlaying : dronePlaying) ? `Stop ${mode}` : `Play ${mode}`}>{(mode === "beat" ? beatPlaying : dronePlaying) ? "■" : "▶"}</button>
              <div className="beat-dots" aria-label="Four beat indicator">{[0,1,2,3].map((beat) => <i className={activeBeat === beat ? "on" : ""} key={beat} />)}</div>
              <p>{status}</p>
            </div>
            <div className="layer-status"><span className={beatPlaying ? "on" : ""}>Beat {beatPlaying ? "on" : "off"}</span><span className={dronePlaying ? "on" : ""}>Drone {dronePlaying ? "on" : "off"}</span></div>
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
