"use client";

import { useState } from "react";

/**
 * Tensor size reduction factor. TSR = (total elements in) / (total elements out),
 * ignoring the batch dimension. Pre-loaded with the lecture's worked example:
 * input [B, 10, 5, 4, 2] → bottleneck [B, 100] → TSR = 400 / 100 = 4.
 */

function parseShape(s: string): number[] | null {
  const parts = s
    .replace(/[[\]()]/g, "")
    .split(/[,\s×x*]+/)
    .filter(Boolean);
  const nums = parts.map((p) => (/^b$/i.test(p) ? 1 : Number(p)));
  if (nums.some((n) => !Number.isFinite(n) || n <= 0)) return null;
  return nums;
}

const prod = (xs: number[]) => xs.reduce((a, b) => a * b, 1);

export default function TsrCalc() {
  const [inShape, setInShape] = useState("B, 10, 5, 4, 2");
  const [outShape, setOutShape] = useState("B, 100");

  const inN = parseShape(inShape);
  const outN = parseShape(outShape);
  const inTotal = inN ? prod(inN) : null;
  const outTotal = outN ? prod(outN) : null;
  const tsr = inTotal && outTotal ? inTotal / outTotal : null;

  return (
    <div className="ll-widget">
      <div className="ll-widget__row">
        <label className="ll-widget__control">
          <span>input shape</span>
          <input
            type="text"
            value={inShape}
            onChange={(e) => setInShape(e.target.value)}
            style={inputStyle}
            spellCheck={false}
          />
        </label>
        <label className="ll-widget__control">
          <span>bottleneck shape</span>
          <input
            type="text"
            value={outShape}
            onChange={(e) => setOutShape(e.target.value)}
            style={inputStyle}
            spellCheck={false}
          />
        </label>
      </div>

      <div className="ll-formula" style={{ marginTop: 12 }}>
        <div className="ll-formula__tex" style={{ whiteSpace: "normal" }}>
          {inN ? (
            <>
              TSR = ({inN.map((n, i) => (i ? ` · ${n}` : n)).join("")}) / ({outN ? outN.map((n, i) => (i ? ` · ${n}` : n)).join("") : "—"})
              {" = "}
              {inTotal} / {outTotal ?? "—"}
              {" = "}
              <b style={{ fontStyle: "normal" }}>{tsr !== null ? round(tsr) : "—"}</b>
            </>
          ) : (
            <span style={{ color: "var(--warn)" }}>enter shapes like `B, 10, 5, 4, 2`</span>
          )}
        </div>
        <p className="ll-formula__cap">
          B (batch) counts as 1 on both sides, so it drops out. TSR &gt; 1 means compression; the lecture example gives exactly 4.
        </p>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  font: "13px var(--font-pix, monospace)",
  padding: "8px 10px",
  border: "1px solid var(--rule)",
  borderRadius: 8,
  background: "var(--panel)",
  color: "var(--ink)",
};

function round(x: number): string {
  return Number.isInteger(x) ? String(x) : x.toFixed(2);
}
