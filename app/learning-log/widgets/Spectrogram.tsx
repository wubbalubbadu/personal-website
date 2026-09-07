"use client";

import { useEffect, useRef, useState } from "react";
import { analyser, connectMic, makeTone, resume, type ToneVoice } from "../audio/engine";

/**
 * A live scrolling spectrogram driven by the shared AnalyserNode. Feed it a
 * steady tone, a slow sweep, or the microphone, and watch the STFT magnitude
 * scroll right-to-left — the same picture as the lecture's spectrogram plots.
 */

type Source = "off" | "tone" | "sweep" | "mic";

const CW = 520;
const CH = 220;
const MAX_HZ = 4000; // top of the drawn frequency axis

export default function Spectrogram() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const voiceRef = useRef<ToneVoice | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const sweepRef = useRef<{ dir: number; hz: number }>({ dir: 1, hz: 300 });
  const [source, setSource] = useState<Source>("off");
  const [toneHz, setToneHz] = useState(600);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => () => teardown(), []);

  function teardown() {
    cancelAnimationFrame(rafRef.current);
    voiceRef.current?.stop();
    voiceRef.current = null;
    micRef.current?.getTracks().forEach((t) => t.stop());
    micRef.current = null;
  }

  async function pick(next: Source) {
    setErr(null);
    await resume();
    teardown();
    if (next === source || next === "off") {
      setSource("off");
      return;
    }

    if (next === "tone") {
      const v = makeTone(toneHz, "sine", 0.2);
      v.start();
      v.connectAnalyser();
      voiceRef.current = v;
    } else if (next === "sweep") {
      sweepRef.current = { dir: 1, hz: 250 };
      const v = makeTone(250, "sine", 0.2);
      v.start();
      v.connectAnalyser();
      voiceRef.current = v;
    } else if (next === "mic") {
      try {
        micRef.current = await connectMic();
      } catch {
        setErr("Microphone permission denied.");
        setSource("off");
        return;
      }
    }
    setSource(next);
    loop(next);
  }

  // keep a playing tone in sync with the slider
  useEffect(() => {
    if (source === "tone") voiceRef.current?.setFrequency(toneHz);
  }, [toneHz, source]);

  function loop(activeSource: Source) {
    const canvas = canvasRef.current;
    const an = analyser();
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const bins = an.frequencyBinCount;
    const data = new Uint8Array(bins);
    const nyq = an.context.sampleRate / 2;
    const topBin = Math.min(bins, Math.ceil((MAX_HZ / nyq) * bins));

    const step = () => {
      if (activeSource === "sweep") {
        const s = sweepRef.current;
        s.hz += s.dir * 14;
        if (s.hz > 3600) s.dir = -1;
        if (s.hz < 250) s.dir = 1;
        voiceRef.current?.setFrequency(s.hz);
      }
      an.getByteFrequencyData(data);
      // scroll the existing image left by 1px, then paint the newest column
      ctx.globalCompositeOperation = "copy";
      ctx.drawImage(canvas, -1, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(CW - 1, 0, 1, CH);
      for (let y = 0; y < CH; y++) {
        const frac = 1 - y / CH;
        const bin = Math.floor(frac * topBin);
        const mag = data[bin] / 255;
        ctx.fillStyle = magColor(mag);
        ctx.fillRect(CW - 1, y, 1, 1);
      }
      rafRef.current = requestAnimationFrame(step);
    };
    step();
  }

  return (
    <div className="ll-widget">
      <div style={{ position: "relative" }}>
        <canvas ref={canvasRef} width={CW} height={CH} className="ll-widget__canvas" style={{ height: CH }} />
        <div style={{ position: "absolute", left: 6, top: 4, font: "11px var(--font-ui)", color: "var(--ink-38)" }}>{MAX_HZ} Hz</div>
        <div style={{ position: "absolute", left: 6, bottom: 4, font: "11px var(--font-ui)", color: "var(--ink-38)" }}>0 Hz</div>
      </div>

      <div className="ll-widget__row">
        <div className="ll-chiprow">
          <button type="button" className={`ll-chip${source === "tone" ? " is-on" : ""}`} onClick={() => pick("tone")}>steady tone</button>
          <button type="button" className={`ll-chip${source === "sweep" ? " is-on" : ""}`} onClick={() => pick("sweep")}>sweep</button>
          <button type="button" className={`ll-chip${source === "mic" ? " is-on" : ""}`} onClick={() => pick("mic")}>microphone</button>
          <button type="button" className={`ll-chip${source === "off" ? " is-on" : ""}`} onClick={() => pick("off")}>stop</button>
        </div>
      </div>

      {source === "tone" ? (
        <div className="ll-widget__row">
          <label className="ll-widget__control">
            <span>tone <b>{toneHz} Hz</b></span>
            <input type="range" min={120} max={3800} step={10} value={toneHz} onChange={(e) => setToneHz(+e.target.value)} />
          </label>
        </div>
      ) : null}

      {err ? <p className="ll-widget__note" style={{ color: "var(--warn)" }}>{err}</p> : null}
      <p className="ll-widget__note">
        Time runs left → right. A steady tone is a flat horizontal line; a sweep is a diagonal; speech and music are stacks of moving lines (harmonics).
      </p>
    </div>
  );
}

function magColor(m: number): string {
  // transparent-ish dark → pine → amber, matching the site palette
  if (m < 0.04) return "rgba(0,0,0,0)";
  const t = Math.min(1, m);
  const r = Math.round(47 + t * (215 - 47));
  const g = Math.round(93 + t * (160 - 93));
  const b = Math.round(80 + t * (93 - 80));
  return `rgba(${r},${g},${b},${0.25 + 0.75 * t})`;
}
