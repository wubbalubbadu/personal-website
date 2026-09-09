"use client";

import { useState } from "react";

/**
 * NLL / cross-entropy / perplexity over a small editable distribution. Set the
 * model's predicted probabilities over K symbols; the widget shows the entropy
 * (nats and bits) and the perplexity e^H, with the uniform value (PPL = K) as a
 * reference. Uniform → PPL K; a peaked distribution → PPL well below K.
 */

const SYMBOLS = ["A", "B", "C", "D", "E"];

type Preset = { name: string; weights: number[] };
const PRESETS: Preset[] = [
  { name: "uniform", weights: [1, 1, 1, 1, 1] },
  { name: "DNA (20/20/30/30 + 0)", weights: [20, 20, 30, 30, 0] },
  { name: "peaked", weights: [70, 15, 8, 5, 2] },
  { name: "near-deterministic", weights: [96, 2, 1, 1, 0] },
];

export default function PerplexityLab() {
  const [weights, setWeights] = useState<number[]>([40, 25, 15, 12, 8]);

  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const probs = weights.map((w) => w / total);

  // entropy in nats; 0 * log 0 := 0
  const H = probs.reduce((acc, p) => (p > 0 ? acc - p * Math.log(p) : acc), 0);
  const hasZero = probs.some((p) => p === 0);
  const Hbits = H / Math.LN2;
  const ppl = Math.exp(H);

  const K = SYMBOLS.length;
  const setW = (i: number, v: number) =>
    setWeights((ws) => ws.map((x, j) => (j === i ? v : x)));

  return (
    <div className="ll-widget">
      <div className="ll-widget__row" style={{ flexWrap: "wrap", gap: 8 }}>
        {PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            className="ll-btn"
            style={{ fontSize: 11 }}
            onClick={() => setWeights(p.weights.slice())}
          >
            {p.name}
          </button>
        ))}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", font: "13px var(--font-ui, sans-serif)", marginTop: 10 }}>
        <tbody>
          {SYMBOLS.map((s, i) => (
            <tr key={s}>
              <td style={{ padding: "3px 8px 3px 0", width: 18 }}>{s}</td>
              <td style={{ padding: "3px 8px 3px 0", width: 150 }}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={weights[i]}
                  onChange={(e) => setW(i, +e.target.value)}
                  style={{ width: "100%", verticalAlign: "middle" }}
                />
              </td>
              <td style={{ padding: "3px 8px 3px 0", width: 46, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {(probs[i] * 100).toFixed(0)}%
              </td>
              <td style={{ padding: "3px 0" }}>
                <span
                  style={{
                    display: "inline-block",
                    height: 10,
                    width: `${probs[i] * 160}px`,
                    background: "var(--pine)",
                    borderRadius: 3,
                  }}
                />
                <span className="ll-fig-label" style={{ fontSize: 10, marginLeft: 6, color: "var(--ink)", opacity: 0.55 }}>
                  {probs[i] > 0 ? `−ln p = ${(-Math.log(probs[i])).toFixed(2)}` : "−ln p = ∞"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="ll-widget__readout">
        H = {H.toFixed(3)} nats · {Hbits.toFixed(3)} bits · PPL = e^H = <b>{ppl.toFixed(2)}</b>
      </p>
      <p className="ll-widget__note">
        Uniform over these {K} symbols would give H = ln {K} = {Math.log(K).toFixed(2)} nats and PPL = {K}.
        {hasZero
          ? " A symbol at 0% only survives here because it never actually occurs — evaluate on it and NLL is +∞."
          : ""}
      </p>
    </div>
  );
}
