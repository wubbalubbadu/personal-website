"use client";

import { useState } from "react";

/**
 * Performance RNN's event-stream representation. Step through the tokens and
 * watch a little C-major arpeggio build up on the piano roll as the cursor
 * advances. Only NOTE_ON / NOTE_OFF / TIME_SHIFT / VELOCITY — no bar lines, no
 * durations; time is whatever the TIME_SHIFTs add up to.
 */

type Ev =
  | { kind: "VELOCITY"; v: number }
  | { kind: "NOTE_ON"; note: number; name: string }
  | { kind: "NOTE_OFF"; note: number; name: string }
  | { kind: "TIME_SHIFT"; ms: number };

const EVENTS: Ev[] = [
  { kind: "VELOCITY", v: 80 },
  { kind: "NOTE_ON", note: 60, name: "C4" },
  { kind: "TIME_SHIFT", ms: 800 },
  { kind: "NOTE_OFF", note: 60, name: "C4" },
  { kind: "NOTE_ON", note: 64, name: "E4" },
  { kind: "NOTE_ON", note: 67, name: "G4" },
  { kind: "TIME_SHIFT", ms: 1000 },
  { kind: "NOTE_OFF", note: 64, name: "E4" },
  { kind: "NOTE_OFF", note: 67, name: "G4" },
];

const TOTAL_MS = 1800;
const ROWS = ["G4", "E4", "C4"];
const ROW_NOTE: Record<string, number> = { G4: 67, E4: 64, C4: 60 };

const W = 520;
const ROLL_X = 44;
const ROLL_W = W - ROLL_X - 10;
const ROW_H = 26;

function label(e: Ev): string {
  if (e.kind === "VELOCITY") return `VELOCITY<${e.v}>`;
  if (e.kind === "NOTE_ON") return `NOTE_ON<${e.name}>`;
  if (e.kind === "NOTE_OFF") return `NOTE_OFF<${e.name}>`;
  return `TIME_SHIFT<${e.ms}>`;
}

export default function PerfRnnTokens() {
  const [step, setStep] = useState(2); // number of events applied

  // replay the first `step` events → cursor time + note segments
  let t = 0;
  const open: Record<number, number> = {};
  const segs: { note: number; on: number; off: number }[] = [];
  for (let i = 0; i < step; i++) {
    const e = EVENTS[i];
    if (e.kind === "TIME_SHIFT") t += e.ms;
    else if (e.kind === "NOTE_ON") open[e.note] = t;
    else if (e.kind === "NOTE_OFF" && open[e.note] !== undefined) {
      segs.push({ note: e.note, on: open[e.note], off: t });
      delete open[e.note];
    }
  }
  // notes still held run to the cursor
  for (const k of Object.keys(open)) segs.push({ note: +k, on: open[+k], off: t });

  const px = (ms: number) => ROLL_X + (ms / TOTAL_MS) * ROLL_W;

  return (
    <div className="ll-widget">
      <div className="ll-widget__row" style={{ flexWrap: "wrap", gap: 5 }}>
        {EVENTS.map((e, i) => (
          <span
            key={i}
            style={{
              font: "11px var(--font-pix, monospace)",
              padding: "3px 6px",
              borderRadius: 5,
              border: "1px solid var(--rule)",
              background: i < step ? "var(--pine-wash)" : "transparent",
              color: i < step ? "var(--ink)" : "var(--ink)",
              opacity: i < step ? 1 : 0.4,
            }}
          >
            {label(e)}
          </span>
        ))}
      </div>

      <svg className="ll-widget__canvas" viewBox={`0 0 ${W} ${ROWS.length * ROW_H + 24}`} style={{ height: ROWS.length * ROW_H + 24, marginTop: 8 }} xmlns="http://www.w3.org/2000/svg">
        {ROWS.map((r, i) => (
          <g key={r}>
            <text x={8} y={16 + i * ROW_H + ROW_H / 2} className="ll-fig-label" style={{ fontSize: 10 }}>{r}</text>
            <line x1={ROLL_X} y1={16 + i * ROW_H} x2={W - 10} y2={16 + i * ROW_H} className="ll-fig-ink" strokeWidth="1" opacity="0.2" />
          </g>
        ))}
        {segs.map((s, i) => {
          const row = ROWS.findIndex((r) => ROW_NOTE[r] === s.note);
          if (row < 0) return null;
          return (
            <rect
              key={i}
              x={px(s.on)}
              y={16 + row * ROW_H + 3}
              width={Math.max(2, px(s.off) - px(s.on))}
              height={ROW_H - 8}
              rx="2"
              fill="var(--pine)"
              opacity="0.55"
            />
          );
        })}
        {/* cursor */}
        <line x1={px(t)} y1={12} x2={px(t)} y2={16 + ROWS.length * ROW_H} stroke="var(--amber)" strokeWidth="1.6" />
        <text x={px(t)} y={ROWS.length * ROW_H + 22} textAnchor="middle" className="ll-fig-label" style={{ fontSize: 9, fill: "var(--amber)" }}>
          {t} / {TOTAL_MS} ms
        </text>
      </svg>

      <div className="ll-widget__row">
        <button type="button" className="ll-btn" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step <= 1}>
          ◀ back
        </button>
        <button type="button" className="ll-btn" onClick={() => setStep((s) => Math.min(EVENTS.length, s + 1))} disabled={step >= EVENTS.length}>
          step ▶
        </button>
        <button type="button" className="ll-btn" onClick={() => setStep(2)}>reset</button>
      </div>
      <p className="ll-widget__note">
        Time is only ever the running total of the TIME_SHIFTs — there is no bar line and no note duration, so one wrong
        TIME_SHIFT would shift everything after it.
      </p>
    </div>
  );
}
