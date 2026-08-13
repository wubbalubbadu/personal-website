"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";

type Mode = "beat" | "drone";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  return `${mins}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
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
      const decoded = await getContext().decodeAudioData(data.slice(0));
      bufferRef.current = decoded;
      setSoundName(name);
      setDuration(decoded.duration);
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
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + Math.min(buffer.duration, 0.42));
    source.connect(gain).connect(context.destination);
    source.start(0, 0, Math.min(buffer.duration, 0.5));
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
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      source.loop = true;
      gain.gain.setValueAtTime(0, context.currentTime);
      gain.gain.linearRampToValueAtTime(0.55, context.currentTime + 0.15);
      source.connect(gain).connect(context.destination);
      source.start();
      sourceRef.current = source;
      setStatus("Drifting on a continuous loop");
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
