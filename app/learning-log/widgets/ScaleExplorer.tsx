"use client";

import { useEffect, useRef, useState } from "react";
import { noteToFreq, playFreq } from "../audio/notes";
import { resume } from "../audio/engine";

/**
 * Build a scale from a root + an interval pattern, light it up on one octave of
 * keys, and play it ascending. Same pattern from a different root = the same
 * tune, transposed — the point of §1.3.
 */

const CHROMA = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const IS_BLACK = [false, true, false, true, false, false, true, false, true, false, true, false];

// step patterns in semitones (sum to 12)
const PATTERNS: { name: string; steps: number[] }[] = [
  { name: "major (W W H W W W H)", steps: [2, 2, 1, 2, 2, 2, 1] },
  { name: "natural minor", steps: [2, 1, 2, 2, 1, 2, 2] },
  { name: "pentatonic (W W m3 W m3)", steps: [2, 2, 3, 2, 3] },
  { name: "Dorian", steps: [2, 1, 2, 2, 2, 1, 2] },
  { name: "Phrygian", steps: [1, 2, 2, 2, 1, 2, 2] },
];

export default function ScaleExplorer() {
  const [rootPc, setRootPc] = useState(0); // 0 = C
  const [patIdx, setPatIdx] = useState(0);
  const [lit, setLit] = useState<number | null>(null);
  const stopsRef = useRef<(() => void)[]>([]);

  useEffect(() => () => stopsRef.current.forEach((s) => s()), []);

  // pitch classes (0..11 offsets from root) that belong to the scale
  const degrees: number[] = [0];
  for (const s of PATTERNS[patIdx].steps) degrees.push(degrees[degrees.length - 1] + s);
  const scalePcs = new Set(degrees.map((d) => (rootPc + d) % 12));

  async function playScale() {
    await resume();
    stopsRef.current.forEach((s) => s());
    stopsRef.current = [];
    degrees.forEach((d, i) => {
      const midiFromC4 = 60 + rootPc + d;
      const name = CHROMA[(rootPc + d) % 12] + (4 + Math.floor((rootPc + d) / 12));
      const freq = noteToFreq(name) || 261.63 * Math.pow(2, (midiFromC4 - 60) / 12);
      window.setTimeout(() => {
        stopsRef.current.push(playFreq(freq, { type: "triangle", gain: 0.28, hold: 0.18 }));
        setLit((rootPc + d) % 12);
      }, i * 220);
    });
    window.setTimeout(() => setLit(null), degrees.length * 220 + 300);
  }

  // 2 octaves of white/black keys for layout. Key colours are fixed (not themed)
  // so a piano still reads as a piano in dark mode.
  const keys = Array.from({ length: 24 }, (_, i) => i);
  const whiteWidth = 100 / 14; // 14 white keys in 2 octaves
  const WHITE = "#f3f3ee";
  const BLACK = "#23261f";

  let whiteIdx = 0;
  return (
    <div className="ll-widget">
      <div style={{ position: "relative", height: 120, marginBottom: 4, background: BLACK, borderRadius: 6, padding: 3 }}>
        {keys.map((i) => {
          const pc = i % 12;
          const black = IS_BLACK[pc];
          const inScale = scalePcs.has(pc);
          const isRoot = pc === rootPc;
          if (!black) {
            const x = whiteIdx * whiteWidth;
            whiteIdx++;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `calc(3px + ${x}%)`,
                  width: `calc(${whiteWidth}% - 2px)`,
                  top: 3,
                  bottom: 3,
                  border: "1px solid rgba(0,0,0,0.25)",
                  borderRadius: "0 0 4px 4px",
                  background: isRoot ? "var(--pine)" : inScale ? "#bcd8cd" : WHITE,
                  boxSizing: "border-box",
                }}
              />
            );
          }
          const x = (whiteIdx - 0.32) * whiteWidth;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `calc(3px + ${x}%)`,
                width: `${whiteWidth * 0.64}%`,
                top: 3,
                height: "60%",
                borderRadius: "0 0 3px 3px",
                background: isRoot ? "var(--pine)" : inScale ? "var(--amber)" : BLACK,
                border: inScale ? "none" : "1px solid #000",
                zIndex: 2,
                boxSizing: "border-box",
              }}
            />
          );
        })}
      </div>

      <div className="ll-widget__row">
        <label className="ll-widget__control">
          <span>root</span>
          <select value={rootPc} onChange={(e) => setRootPc(+e.target.value)} style={selStyle}>
            {CHROMA.map((n, i) => (
              <option key={n} value={i}>{n}</option>
            ))}
          </select>
        </label>
        <label className="ll-widget__control">
          <span>pattern</span>
          <select value={patIdx} onChange={(e) => setPatIdx(+e.target.value)} style={selStyle}>
            {PATTERNS.map((p, i) => (
              <option key={p.name} value={i}>{p.name}</option>
            ))}
          </select>
        </label>
        <button type="button" className={`ll-btn${lit !== null ? " is-live" : ""}`} onClick={playScale}>
          ▶ play scale
        </button>
      </div>
      <p className="ll-widget__readout">
        {[...scalePcs].sort((a, b) => a - b).map((pc) => CHROMA[pc]).join(" · ")}
      </p>
      <p className="ll-widget__note">Green = tonic (1st degree). Change the root and the shape slides along the keyboard unchanged.</p>
    </div>
  );
}

const selStyle: React.CSSProperties = {
  font: "13px var(--font-ui)",
  padding: "7px 8px",
  border: "1px solid var(--rule)",
  borderRadius: 8,
  background: "var(--panel)",
  color: "var(--ink)",
};
