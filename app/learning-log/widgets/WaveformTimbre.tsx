"use client";

import { useEffect, useRef, useState } from "react";
import { getContext, getMaster, analyser, resume } from "../audio/engine";

/**
 * The four classic synth shapes from §1.5. Shows the wave, its harmonic bars
 * (built from the same 1/n or 1/n² series the notes describe), and plays it with
 * the browser's native oscillator so ear and eye agree.
 */

type Shape = "sine" | "triangle" | "square" | "sawtooth";
const SHAPES: { id: Shape; blurb: string; series: string }[] = [
  { id: "sine", blurb: "quiet, transparent", series: "no harmonics" },
  { id: "triangle", blurb: "slightly muffled", series: "odd harmonics · 1/n²" },
  { id: "square", blurb: "bright but hollow", series: "odd harmonics · 1/n" },
  { id: "sawtooth", blurb: "glaring, rich", series: "all harmonics · 1/n" },
];

const W = 520;

function amplitude(shape: Shape, n: number): number {
  if (n === 1) return 1;
  const odd = n % 2 === 1;
  switch (shape) {
    case "sine":
      return 0;
    case "triangle":
      return odd ? 1 / (n * n) : 0;
    case "square":
      return odd ? 1 / n : 0;
    case "sawtooth":
      return 1 / n;
  }
}

function wavePath(shape: Shape): string {
  const N = 260;
  const H = 90;
  let d = "";
  for (let i = 0; i <= N; i++) {
    const phase = (i / N) * 2 * Math.PI * 2; // 2 cycles
    let v = 0;
    for (let n = 1; n <= 24; n++) v += amplitude(shape, n) * Math.sin(phase * n);
    const norm = shape === "sine" ? 1 : 1.27; // keep amplitudes comparable
    const x = (i / N) * W;
    const y = H - (v / norm) * (H - 10);
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)} `;
  }
  return d;
}

export default function WaveformTimbre() {
  const [shape, setShape] = useState<Shape>("sawtooth");
  const [live, setLive] = useState(false);
  const nodesRef = useRef<{ osc: OscillatorNode; g: GainNode } | null>(null);

  useEffect(() => () => stop(), []);

  async function toggle() {
    await resume();
    if (live) {
      stop();
      return;
    }
    const ctx = getContext();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = shape;
    osc.frequency.value = 220;
    g.gain.value = 0.0001;
    g.gain.setTargetAtTime(0.22, ctx.currentTime, 0.02);
    osc.connect(g);
    g.connect(getMaster());
    g.connect(analyser());
    osc.start();
    nodesRef.current = { osc, g };
    setLive(true);
  }
  function stop() {
    const nd = nodesRef.current;
    if (!nd) return;
    const ctx = nd.g.context;
    nd.g.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
    window.setTimeout(() => {
      try {
        nd.osc.stop();
        nd.osc.disconnect();
        nd.g.disconnect();
      } catch {
        /* gone */
      }
    }, 150);
    nodesRef.current = null;
    setLive(false);
  }
  useEffect(() => {
    if (nodesRef.current) nodesRef.current.osc.type = shape;
  }, [shape]);

  const bars = Array.from({ length: 12 }, (_, i) => amplitude(shape, i + 1));

  return (
    <div className="ll-widget">
      <svg className="ll-widget__canvas" viewBox={`0 0 ${W} 180`} style={{ height: 180 }} xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="90" x2={W} y2="90" className="ll-fig-ink" strokeWidth="1" opacity="0.2" />
        <path d={wavePath(shape)} className="ll-fig-pine" fill="none" strokeWidth="2" />
        {bars.map((a, i) => {
          const bx = 8 + i * ((W - 16) / 12);
          const bh = a * 78;
          return <rect key={i} x={bx} y={178 - bh} width={(W - 16) / 12 - 6} height={Math.max(0, bh)} fill="var(--amber)" opacity="0.75" />;
        })}
        <text x="10" y="172" className="ll-fig-label">harmonic 1 → 12</text>
      </svg>

      <div className="ll-widget__row">
        <div className="ll-chiprow">
          {SHAPES.map((s) => (
            <button key={s.id} type="button" className={`ll-chip${shape === s.id ? " is-on" : ""}`} onClick={() => setShape(s.id)}>
              {s.id}
            </button>
          ))}
        </div>
        <button type="button" className={`ll-btn${live ? " is-live" : ""}`} onClick={toggle}>
          {live ? "◼ stop" : "▶ play (220 Hz)"}
        </button>
      </div>
      <p className="ll-widget__readout">
        {shape.toUpperCase()} — {SHAPES.find((s) => s.id === shape)!.series}
      </p>
      <p className="ll-widget__note">{SHAPES.find((s) => s.id === shape)!.blurb}. White noise isn't shown — it has no harmonic structure, just every frequency at once.</p>
    </div>
  );
}
