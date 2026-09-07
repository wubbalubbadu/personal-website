"use client";

import { useEffect, useRef, useState } from "react";
import { playFreq } from "../audio/notes";
import { resume } from "../audio/engine";

/**
 * An ADSR shaper. Four sliders drive both the drawn curve and a note played
 * through that exact envelope (via `playFreq`'s `adsr` option). Presets show the
 * extremes: a percussive pluck vs a slow pad.
 */

const W = 520;
const H = 170;
const HOLD = 0.5; // seconds the note is "held" before Release, for the drawing + sound

type A = { attack: number; decay: number; sustain: number; release: number };
const PRESETS: { name: string; a: A }[] = [
  { name: "pluck", a: { attack: 0.005, decay: 0.18, sustain: 0.0, release: 0.12 } },
  { name: "keys", a: { attack: 0.01, decay: 0.15, sustain: 0.55, release: 0.3 } },
  { name: "pad", a: { attack: 0.4, decay: 0.2, sustain: 0.8, release: 0.7 } },
  { name: "stab", a: { attack: 0.005, decay: 0.06, sustain: 0.9, release: 0.05 } },
];

export default function Adsr() {
  const [a, setA] = useState<A>({ ...PRESETS[1].a });
  const [playing, setPlaying] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => () => stopRef.current?.(), []);

  async function play() {
    await resume();
    stopRef.current?.();
    stopRef.current = playFreq(330, { type: "sawtooth", gain: 0.3, hold: HOLD, adsr: a });
    setPlaying(true);
    const total = (a.attack + a.decay + HOLD + a.release + 0.1) * 1000;
    window.setTimeout(() => setPlaying(false), total);
  }

  // build the envelope polyline in seconds → px
  const tEnd = a.attack + a.decay + HOLD + a.release;
  const sx = (t: number) => (t / Math.max(0.001, tEnd)) * W;
  const sy = (v: number) => H - 12 - v * (H - 24);
  const pts = [
    [0, 0],
    [a.attack, 1],
    [a.attack + a.decay, a.sustain],
    [a.attack + a.decay + HOLD, a.sustain],
    [tEnd, 0],
  ]
    .map(([t, v]) => `${sx(t).toFixed(1)},${sy(v).toFixed(1)}`)
    .join(" ");

  const set = (k: keyof A, v: number) => setA((p) => ({ ...p, [k]: v }));

  return (
    <div className="ll-widget">
      <svg className="ll-widget__canvas" viewBox={`0 0 ${W} ${H}`} style={{ height: H }} xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1={H - 12} x2={W} y2={H - 12} className="ll-fig-ink" strokeWidth="1" opacity="0.25" />
        <line x1={sx(a.attack)} y1="6" x2={sx(a.attack)} y2={H - 12} className="ll-fig-ink" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />
        <line x1={sx(a.attack + a.decay)} y1="6" x2={sx(a.attack + a.decay)} y2={H - 12} className="ll-fig-ink" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />
        <line x1={sx(a.attack + a.decay + HOLD)} y1="6" x2={sx(a.attack + a.decay + HOLD)} y2={H - 12} className="ll-fig-ink" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />
        <polygon points={`0,${H - 12} ${pts} ${W},${H - 12}`} fill="var(--pine-wash)" />
        <polyline points={pts} fill="none" className="ll-fig-pine" strokeWidth="2" />
        <text x={sx(a.attack) / 2} y="16" textAnchor="middle" className="ll-fig-label">A</text>
        <text x={(sx(a.attack) + sx(a.attack + a.decay)) / 2} y="16" textAnchor="middle" className="ll-fig-label">D</text>
        <text x={(sx(a.attack + a.decay) + sx(a.attack + a.decay + HOLD)) / 2} y="16" textAnchor="middle" className="ll-fig-label">S</text>
        <text x={(sx(a.attack + a.decay + HOLD) + W) / 2} y="16" textAnchor="middle" className="ll-fig-label">R</text>
      </svg>

      <div className="ll-widget__row">
        <label className="ll-widget__control">
          <span>attack <b>{(a.attack * 1000) | 0} ms</b></span>
          <input type="range" min={0.002} max={0.8} step={0.002} value={a.attack} onChange={(e) => set("attack", +e.target.value)} />
        </label>
        <label className="ll-widget__control">
          <span>decay <b>{(a.decay * 1000) | 0} ms</b></span>
          <input type="range" min={0.01} max={0.8} step={0.01} value={a.decay} onChange={(e) => set("decay", +e.target.value)} />
        </label>
        <label className="ll-widget__control">
          <span>sustain <b>{Math.round(a.sustain * 100)}%</b></span>
          <input type="range" min={0} max={1} step={0.01} value={a.sustain} onChange={(e) => set("sustain", +e.target.value)} />
        </label>
        <label className="ll-widget__control">
          <span>release <b>{(a.release * 1000) | 0} ms</b></span>
          <input type="range" min={0.01} max={1.2} step={0.01} value={a.release} onChange={(e) => set("release", +e.target.value)} />
        </label>
      </div>

      <div className="ll-widget__row">
        <button type="button" className={`ll-btn${playing ? " is-live" : ""}`} onClick={play}>▶ play note</button>
        <div className="ll-chiprow">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              className={`ll-chip${(["attack", "decay", "sustain", "release"] as const).every((k) => Math.abs(a[k] - p.a[k]) < 0.005) ? " is-on" : ""}`}
              onClick={() => setA({ ...p.a })}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>
      <p className="ll-widget__note">Sustain is a *level*, held while the key is down (the flat middle). Attack + Decay happen on key-down; Release starts on key-up.</p>
    </div>
  );
}
