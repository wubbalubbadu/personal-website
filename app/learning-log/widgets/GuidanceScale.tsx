"use client";

import { useState } from "react";

/**
 * Classifier-free guidance. At each sampling step the model runs twice — with
 * the prompt (ε_cond) and without (ε_uncond) — and the guided prediction is an
 * extrapolation along the difference:
 *
 *   ε_guided = ε_uncond + s · (ε_cond − ε_uncond)
 *
 * s = 0 ignores the prompt, s = 1 is the plain conditional model, s > 1 pushes
 * past it: sharper prompt adherence, less diversity. The number line and the two
 * meters are illustrative, not measured.
 */

const W = 520;
const H = 96;
// fixed illustrative positions on a 0..2 value axis
const UNCOND = 0.24;
const COND = 0.5;

const px = (v: number) => 20 + (v / 2) * (W - 40);

// prompt adherence climbs and saturates; diversity / naturalness decays
const adherence = (s: number) => 1 - Math.exp(-s / 3);
const diversity = (s: number) => Math.max(0, Math.exp(-s / 6) - (s > 9 ? (s - 9) / 12 : 0));

export default function GuidanceScale() {
  const [s, setS] = useState(7.5);

  const guidedVal = UNCOND + s * (COND - UNCOND);
  const guidedX = Math.min(W - 20, Math.max(20, px(guidedVal)));
  const adh = adherence(s);
  const div = diversity(s);

  const regime =
    s <= 1
      ? "at or below 1 — the prompt barely steers the image"
      : s < 5
        ? "moderate — good balance of fidelity and variety"
        : s < 10
          ? "high — crisp prompt match, noticeably less diverse"
          : "very high — over-saturated, artefacts, low diversity";

  return (
    <div className="ll-widget">
      <svg className="ll-widget__canvas" viewBox={`0 0 ${W} ${H}`} style={{ height: H }} xmlns="http://www.w3.org/2000/svg">
        <line x1={20} y1={54} x2={W - 20} y2={54} stroke="var(--ink)" strokeWidth="1" opacity="0.3" />
        {/* the difference vector */}
        <line x1={px(UNCOND)} y1={54} x2={px(COND)} y2={54} stroke="var(--ink)" strokeWidth="3" opacity="0.4" />
        <circle cx={px(UNCOND)} cy={54} r="4" fill="var(--ink)" />
        <text x={px(UNCOND)} y={40} textAnchor="middle" className="ll-fig-label">ε&#8202;uncond</text>
        <circle cx={px(COND)} cy={54} r="4" fill="var(--pine)" />
        <text x={px(COND)} y={40} textAnchor="middle" className="ll-fig-label">ε&#8202;cond</text>
        {/* the guided point */}
        <line x1={px(COND)} y1={54} x2={guidedX} y2={54} stroke="var(--amber)" strokeWidth="2" strokeDasharray="4 3" />
        <circle cx={guidedX} cy={54} r="5" fill="var(--amber)" />
        <text x={guidedX} y={80} textAnchor="middle" className="ll-fig-label">ε&#8202;guided</text>
      </svg>

      <div className="ll-widget__row">
        <label className="ll-widget__control">
          <span>guidance scale <b>s = {s.toFixed(1)}</b></span>
          <input type="range" min={0} max={14} step={0.5} value={s} onChange={(e) => setS(+e.target.value)} />
        </label>
      </div>

      <div className="ll-widget__row" style={{ gap: 18 }}>
        <Meter label="prompt adherence" v={adh} color="var(--pine)" />
        <Meter label="diversity / naturalness" v={div} color="var(--amber)" />
      </div>

      <p className="ll-widget__readout">s = {s.toFixed(1)} · {regime}</p>
      <p className="ll-widget__note">
        Illustrative. The number line shows the guided prediction sliding past ε&#8202;cond as s grows — the
        extrapolation ε&#8202;uncond + s·(ε&#8202;cond − ε&#8202;uncond).
      </p>
    </div>
  );
}

function Meter({ label, v, color }: { label: string; v: number; color: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, opacity: 0.7 }}>
        <span>{label}</span>
        <span>{Math.round(v * 100)}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: "var(--rule)", overflow: "hidden", marginTop: 3 }}>
        <div style={{ width: `${Math.max(0, Math.min(1, v)) * 100}%`, height: "100%", background: color }} />
      </div>
    </div>
  );
}
