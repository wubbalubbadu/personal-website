"use client";

import { useState } from "react";

/**
 * The rate–distortion–modelability trade, made draggable. One knob: the
 * compression factor f. As f grows the latent is smaller, so reconstruction
 * fidelity falls while modelability (how learnable p(z) is) rises — until the
 * latent is so lossy there is nothing left worth modeling.
 *
 * The curves are illustrative, not measured — they encode the lecture's three
 * regimes (too big / Goldilocks / too small).
 */

const W = 520;
const H = 200;
const PAD = 28;

// fidelity: high at f=1, decays as compression bites
const fidelity = (f: number) => Math.exp(-f / 14);
// modelability: rises from near-0, saturates, then sags when the latent is gutted
const modelability = (f: number) => {
  const rise = 1 - Math.exp(-f / 6);
  const sag = f > 24 ? (f - 24) / 90 : 0;
  return Math.max(0, rise - sag);
};

export default function RateDistortion() {
  const [f, setF] = useState(8);

  const fid = fidelity(f);
  const mod = modelability(f);
  const regime =
    f <= 4
      ? { label: "TSR too small — barely compressed", note: "latent keeps almost everything, even noise. Reconstruction is near-perfect but the generator drowns in redundancy." }
      : f >= 22
        ? { label: "TSR too large — over-compressed", note: "heavy information loss, blurry output. Generation is trivial because there is little structure left to learn." }
        : { label: "Goldilocks", note: "enough detail survives to reconstruct well, few enough dimensions that the prior is learnable. Stable Diffusion lives at f = 8–16." };

  const px = (v: number) => PAD + v * (W - 2 * PAD);
  const py = (v: number) => H - PAD - v * (H - 2 * PAD);
  const curve = (fn: (f: number) => number) => {
    let d = "";
    for (let i = 0; i <= 64; i++) {
      const x = px(i / 64);
      const y = py(fn(i));
      d += `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)} `;
    }
    return d;
  };

  return (
    <div className="ll-widget">
      <svg className="ll-widget__canvas" viewBox={`0 0 ${W} ${H}`} style={{ height: H }} xmlns="http://www.w3.org/2000/svg">
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} className="ll-fig-ink" strokeWidth="1" opacity="0.3" />
        <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} className="ll-fig-ink" strokeWidth="1" opacity="0.3" />
        {/* Goldilocks band f = 8..16 */}
        <rect x={px(8 / 64)} y={PAD} width={px(16 / 64) - px(8 / 64)} height={H - 2 * PAD} fill="var(--pine-wash)" />
        <path d={curve(fidelity)} stroke="var(--pine)" fill="none" strokeWidth="2" />
        <path d={curve(modelability)} stroke="var(--amber)" fill="none" strokeWidth="2" strokeDasharray="5 4" />
        {/* marker */}
        <line x1={px(f / 64)} y1={PAD} x2={px(f / 64)} y2={H - PAD} className="ll-fig-ink" strokeWidth="1" opacity="0.5" />
        <circle cx={px(f / 64)} cy={py(fid)} r="4" fill="var(--pine)" />
        <circle cx={px(f / 64)} cy={py(mod)} r="4" fill="var(--amber)" />
        <text x={PAD} y={PAD - 10} className="ll-fig-label">
          <tspan style={{ fill: "var(--pine)" }}>— reconstruction fidelity</tspan>
          <tspan style={{ fill: "var(--amber)" }}>   ┄ modelability</tspan>
        </text>
        <text x={W - PAD} y={H - 10} textAnchor="end" className="ll-fig-label">compression factor f →</text>
      </svg>

      <div className="ll-widget__row">
        <label className="ll-widget__control">
          <span>compression factor <b>f = {f}</b></span>
          <input type="range" min={1} max={64} step={1} value={f} onChange={(e) => setF(+e.target.value)} />
        </label>
      </div>

      <p className="ll-widget__readout">
        {regime.label.toUpperCase()} · fidelity {(fid * 100).toFixed(0)}% · modelability {(mod * 100).toFixed(0)}%
      </p>
      <p className="ll-widget__note">{regime.note}</p>
    </div>
  );
}
