"use client";

import { useState } from "react";

/**
 * Jukebox's three-level cascade. Each level is a separate VQ-VAE with its own
 * hop length, so a fixed Transformer context window (in tokens) buys a very
 * different amount of *music* at each level. This is the whole argument for the
 * cascade: a bottom-only LM sees ~1.5 s and can never learn long-range form.
 */

const FS = 44_100;

const LEVELS = [
  { name: "Top", hop: 128 },
  { name: "Middle", hop: 32 },
  { name: "Bottom", hop: 8 },
];

/** Tokens per second of audio at this level: one token every `hop` samples. */
function tokenRate(hop: number, fs: number): number {
  return fs / hop;
}

/**
 * Seconds of audio a `tokens`-long context window covers at a level whose
 * tokens each span `hop` raw samples, given `fs` samples per second.
 * At tokens = 8192: Top ≈ 23.8 s, Middle ≈ 5.9 s, Bottom ≈ 1.5 s.
 */
function secondsCovered(tokens: number, hop: number, fs: number): number {
  return (tokens * hop) / fs;
}

export default function JukeboxCascade() {
  const [tokens, setTokens] = useState(8192);

  const rows = LEVELS.map((l) => ({
    ...l,
    rate: tokenRate(l.hop, FS),
    secs: secondsCovered(tokens, l.hop, FS),
  }));
  const maxSecs = Math.max(...rows.map((r) => r.secs));

  return (
    <div className="ll-widget">
      <div className="ll-widget__row">
        <label className="ll-widget__control">
          <span>context window <b>{tokens.toLocaleString()} tokens</b></span>
          <input
            type="range"
            min={1024}
            max={16384}
            step={1024}
            value={tokens}
            onChange={(e) => setTokens(+e.target.value)}
          />
        </label>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", font: "13px var(--font-ui, sans-serif)", marginTop: 6 }}>
        <thead>
          <tr style={{ textAlign: "left", opacity: 0.6 }}>
            <th style={th}>level</th>
            <th style={th}>hop</th>
            <th style={th}>token rate</th>
            <th style={th}>seconds covered</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td style={td}>{r.name}</td>
              <td style={td}>{r.hop}×</td>
              <td style={td}>{Math.round(r.rate).toLocaleString()} Hz</td>
              <td style={td}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      display: "inline-block",
                      height: 10,
                      width: `${maxSecs ? (r.secs / maxSecs) * 120 : 0}px`,
                      background: "var(--pine)",
                      borderRadius: 3,
                    }}
                  />
                  <b style={{ fontWeight: 600 }}>{r.secs.toFixed(1)} s</b>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="ll-widget__readout">
        {tokens.toLocaleString()} tokens = {rows[0].secs.toFixed(1)} s at the top level, but only {rows[2].secs.toFixed(1)} s at the bottom
      </p>
      <p className="ll-widget__note">
        Same token budget, three very different spans of music. Train a bottom-only language model and it never
        sees more than a bar or two — hence the cascade.
      </p>
    </div>
  );
}

const th: React.CSSProperties = { padding: "4px 10px 4px 0", fontWeight: 500 };
const td: React.CSSProperties = { padding: "5px 10px 5px 0", borderTop: "1px solid var(--rule)" };
