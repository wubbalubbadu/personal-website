"use client";

import { useState } from "react";

/**
 * Sinusoidal positional encoding as a heatmap: rows are embedding dimensions
 * (fast frequencies on top, slow on the bottom), columns are sequence
 * positions. Each cell is sin(pos / 10000^(2i/d)). Fast rows flip every step;
 * slow rows barely move across the whole window — that is how one vector
 * encodes both fine and coarse position.
 */

const DIMS = 10;
const POSITIONS = 48;

// frequency for dimension i, geometric from fast (~2pi steps/cycle) to slow.
// The real PE uses 1 / 10000^(2i/d); here the 10 shown rows span a compressed
// range so the slow rows still visibly move across the 48-position window.
const freq = (i: number) => Math.pow(0.045, i / (DIMS - 1));
const pe = (pos: number, i: number) => Math.sin(pos * freq(i));

const CW = 9; // cell width
const CH = 13; // cell height
const PADL = 40;

export default function PositionalEncoding() {
  const [pos, setPos] = useState(12);

  const w = PADL + POSITIONS * CW + 8;
  const h = 20 + DIMS * CH + 8;

  return (
    <div className="ll-widget">
      <div style={{ overflowX: "auto" }}>
        <svg viewBox={`0 0 ${w} ${h}`} style={{ minWidth: 460, width: "100%" }} xmlns="http://www.w3.org/2000/svg">
          <text x={4} y={14} className="ll-fig-label" style={{ fontSize: 9, opacity: 0.6 }}>dim</text>
          <text x={PADL} y={14} className="ll-fig-label" style={{ fontSize: 9, opacity: 0.6 }}>position →</text>
          {Array.from({ length: DIMS }, (_, i) =>
            Array.from({ length: POSITIONS }, (_, p) => {
              const v = pe(p, i); // -1..1
              return (
                <rect
                  key={`${i}-${p}`}
                  x={PADL + p * CW}
                  y={20 + i * CH}
                  width={CW - 0.5}
                  height={CH - 0.5}
                  fill={v >= 0 ? "var(--pine)" : "var(--amber)"}
                  opacity={0.12 + 0.72 * Math.abs(v)}
                />
              );
            }),
          )}
          {Array.from({ length: DIMS }, (_, i) => (
            <text key={i} x={PADL - 6} y={20 + i * CH + 10} textAnchor="end" className="ll-fig-label" style={{ fontSize: 8 }}>
              {i === 0 ? "0 fast" : i === DIMS - 1 ? `${i} slow` : i}
            </text>
          ))}
          {/* position marker */}
          <rect x={PADL + pos * CW - 1} y={18} width={CW + 1} height={DIMS * CH + 3} fill="none" stroke="var(--ink)" strokeWidth="1.5" />
        </svg>
      </div>

      <div className="ll-widget__row">
        <label className="ll-widget__control">
          <span>position <b>{pos}</b></span>
          <input type="range" min={0} max={POSITIONS - 1} step={1} value={pos} onChange={(e) => setPos(+e.target.value)} />
        </label>
      </div>

      <p className="ll-widget__readout">
        dim 0 completes a cycle in ~{(2 * Math.PI / freq(0)).toFixed(1)} steps · dim {DIMS - 1} in ~{Math.round((2 * Math.PI) / freq(DIMS - 1)).toLocaleString()} steps
      </p>
      <p className="ll-widget__note">
        Green = positive, amber = negative sine value. The framed column is the encoding vector for the current position: a
        unique fingerprint built from fast and slow waves.
      </p>
    </div>
  );
}
