"use client";

import { useEffect, useRef, useState } from "react";
import { analyser, resume } from "../audio/engine";

/**
 * Additive synthesis. Four harmonics of a 220 Hz fundamental, each with an
 * adjustable weight. The summed waveform is drawn live; "play" builds the exact
 * same sum with a PeriodicWave so the shape you see is the timbre you hear.
 *
 * Presets match the lecture example (weights 1, ½, ¼, ⅛ over 440·k Hz) plus a
 * couple of instrument-ish shapes.
 */

const F0 = 220;
const N = 4;
const PRESETS: { name: string; w: number[] }[] = [
  { name: "lecture (1, ½, ¼, ⅛)", w: [1, 0.5, 0.25, 0.125] },
  { name: "pure sine", w: [1, 0, 0, 0] },
  { name: "odd only (≈ square)", w: [1, 0, 0.33, 0] },
  { name: "bright", w: [0.7, 0.9, 0.6, 0.8] },
];

const W = 520;
const H = 180;

export default function HarmonicStack() {
  const [weights, setWeights] = useState<number[]>([...PRESETS[0].w]);
  const [live, setLive] = useState(false);
  const ctxRef = useRef<{ osc: OscillatorNode; gain: GainNode } | null>(null);

  useEffect(() => () => stop(), []);

  function buildWave() {
    const real = new Float32Array(N + 1);
    const imag = new Float32Array(N + 1);
    for (let k = 1; k <= N; k++) imag[k] = weights[k - 1]; // sine terms
    return { real, imag };
  }

  async function toggle() {
    await resume();
    if (live) {
      stop();
      return;
    }
    const AC = analyser().context as AudioContext;
    const osc = AC.createOscillator();
    const gain = AC.createGain();
    const { real, imag } = buildWave();
    osc.setPeriodicWave(AC.createPeriodicWave(real, imag, { disableNormalization: false }));
    osc.frequency.value = F0;
    gain.gain.value = 0.0001;
    gain.gain.setTargetAtTime(0.28, AC.currentTime, 0.02);
    osc.connect(gain).connect(analyser());
    gain.connect(AC.destination);
    osc.start();
    ctxRef.current = { osc, gain };
    setLive(true);
  }

  function stop() {
    const c = ctxRef.current;
    if (!c) return;
    const AC = c.gain.context;
    c.gain.gain.setTargetAtTime(0, AC.currentTime, 0.03);
    window.setTimeout(() => {
      try {
        c.osc.stop();
        c.osc.disconnect();
        c.gain.disconnect();
      } catch {
        /* gone */
      }
    }, 160);
    ctxRef.current = null;
    setLive(false);
  }

  // retune the live wave when weights change
  useEffect(() => {
    const c = ctxRef.current;
    if (!c) return;
    const AC = c.osc.context;
    const real = new Float32Array(N + 1);
    const imag = new Float32Array(N + 1);
    for (let k = 1; k <= N; k++) imag[k] = weights[k - 1];
    c.osc.setPeriodicWave(AC.createPeriodicWave(real, imag, { disableNormalization: false }));
  }, [weights]);

  const path = sumPath(weights);
  const set = (i: number, v: number) => setWeights((w) => w.map((x, j) => (j === i ? v : x)));

  return (
    <div className="ll-widget">
      <svg className="ll-widget__canvas" viewBox={`0 0 ${W} ${H}`} style={{ height: 180 }} xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1={H / 2} x2={W} y2={H / 2} className="ll-fig-ink" strokeWidth="1" opacity="0.2" />
        {weights.map((wt, i) =>
          wt > 0.01 ? (
            <path key={i} d={harmonicPath(i + 1, wt)} stroke="var(--pine)" fill="none" strokeWidth="1" opacity="0.22" />
          ) : null,
        )}
        <path d={path} className="ll-fig-ink" fill="none" strokeWidth="2" />
      </svg>

      <div className="ll-widget__row">
        {weights.map((wt, i) => (
          <label className="ll-widget__control" key={i}>
            <span>
              h{i + 1} · {F0 * (i + 1)} Hz <b>{wt.toFixed(2)}</b>
            </span>
            <input type="range" min={0} max={1} step={0.01} value={wt} onChange={(e) => set(i, +e.target.value)} />
          </label>
        ))}
      </div>

      <div className="ll-widget__row">
        <button type="button" className={`ll-btn${live ? " is-live" : ""}`} onClick={toggle}>
          {live ? "◼ stop" : "▶ play this timbre"}
        </button>
        <div className="ll-chiprow">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              className={`ll-chip${weights.every((w, i) => Math.abs(w - p.w[i]) < 0.02) ? " is-on" : ""}`}
              onClick={() => setWeights([...p.w])}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>
      <p className="ll-widget__note">
        Fundamental fixed at {F0} Hz. Same f&#8320;, different weights → different wave shape → different instrument. That is timbre.
      </p>
    </div>
  );
}

function harmonicPath(k: number, amp: number): string {
  const n = 200;
  let d = "";
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * W;
    const y = H / 2 - amp * (H / 2 - 14) * Math.sin((i / n) * 3 * k * 2 * Math.PI);
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)} `;
  }
  return d;
}

function sumPath(weights: number[]): string {
  const n = 260;
  const norm = Math.max(1, weights.reduce((a, b) => a + b, 0));
  let d = "";
  for (let i = 0; i <= n; i++) {
    const phase = (i / n) * 3 * 2 * Math.PI;
    let v = 0;
    weights.forEach((w, k) => {
      v += w * Math.sin(phase * (k + 1));
    });
    const x = (i / n) * W;
    const y = H / 2 - (v / norm) * (H / 2 - 14);
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)} `;
  }
  return d;
}
