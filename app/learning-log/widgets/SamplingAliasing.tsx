"use client";

import { useEffect, useRef, useState } from "react";
import { makeTone, resume, type ToneVoice } from "../audio/engine";

/**
 * Sampling & aliasing. A continuous sine (pine) is sampled at f_s (amber dots).
 * Below Nyquist the dots trace a *different*, lower sine — the alias — which you
 * can also hear.
 *
 * ┌───────────────────────────────────────────────────────────────────┐
 * │  YOUR TURN — implement `aliasedFrequency` (see the TODO below).     │
 * │  It is the heart of the Nyquist story and ~4 lines. The widget      │
 * │  renders now, but the alias overlay + alias playback stay inert     │
 * │  until this returns the folded frequency.                          │
 * └───────────────────────────────────────────────────────────────────┘
 */

/**
 * The frequency a listener actually perceives when a `trueHz` sine is sampled at
 * `fs`. Sampling replicates the spectrum every `fs`; anything above the Nyquist
 * frequency (fs / 2) folds back down into 0…fs/2.
 *
 * TODO(you): finish the fold.
 *   The line below already reduces trueHz into 0…fs (spectrum is fs-periodic).
 *   What's missing: if `m` landed in the upper half (m > fs / 2) it should
 *   *reflect* back down — replace it with `fs - m`. Then return `m`.
 * Example once done: aliasedFrequency(30000, 44100) === 14100
 *                    aliasedFrequency(400,   44100) === 400   (already below Nyquist)
 */
export function aliasedFrequency(trueHz: number, fs: number): number {
  const m = ((trueHz % fs) + fs) % fs;
  // TODO(you): fold `m` down when it is above the Nyquist frequency (fs / 2)
  return m;
}

const W = 520;
const H = 190;
const MID = H / 2;
const SPAN_MS = 20; // window of time drawn, in ms

export default function SamplingAliasing() {
  const [trueHz, setTrueHz] = useState(1400);
  const [fs, setFs] = useState(2000);
  const [playing, setPlaying] = useState<null | "true" | "alias">(null);
  const voiceRef = useRef<ToneVoice | null>(null);

  const nyquist = fs / 2;
  const alias = aliasedFrequency(trueHz, fs);
  const aliased = Math.abs(alias - trueHz) > 0.5;

  useEffect(() => {
    return () => voiceRef.current?.stop();
  }, []);

  async function play(which: "true" | "alias") {
    await resume();
    voiceRef.current?.stop();
    if (playing === which) {
      setPlaying(null);
      return;
    }
    // clamp into the audible band so the demo is hearable even at low fs
    const base = which === "true" ? trueHz : alias;
    const hz = audibleOctave(base);
    const v = makeTone(hz, "sine", 0.22);
    v.start();
    voiceRef.current = v;
    setPlaying(which);
  }

  // continuous wave path
  const truePath = sinePath(trueHz);
  const aliasPath = aliased ? sinePath(alias) : null;

  // sample points over the drawn window
  const dots: { x: number; y: number }[] = [];
  const nSamples = Math.max(2, Math.round((SPAN_MS / 1000) * fs));
  for (let i = 0; i <= nSamples; i++) {
    const t = (i / nSamples) * (SPAN_MS / 1000);
    const x = (i / nSamples) * W;
    const y = MID - (MID - 12) * Math.sin(2 * Math.PI * trueHz * t);
    dots.push({ x, y });
    if (i > 400) break;
  }

  return (
    <div className="ll-widget">
      <svg className="ll-widget__canvas" viewBox={`0 0 ${W} ${H}`} style={{ height: 190 }} xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1={MID} x2={W} y2={MID} className="ll-fig-ink" strokeWidth="1" opacity="0.2" />
        <path d={truePath} className="ll-fig-pine" fill="none" strokeWidth="1.6" opacity="0.85" />
        {aliasPath ? <path d={aliasPath} stroke="var(--amber)" fill="none" strokeWidth="2" strokeDasharray="5 4" /> : null}
        <polyline points={dots.map((d) => `${d.x},${d.y}`).join(" ")} fill="none" stroke="var(--amber)" strokeWidth="1" opacity="0.35" />
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r="3" fill="var(--amber)" />
        ))}
      </svg>

      <div className="ll-widget__row">
        <label className="ll-widget__control">
          <span>true frequency <b>{trueHz} Hz</b></span>
          <input type="range" min={200} max={6000} step={20} value={trueHz} onChange={(e) => setTrueHz(+e.target.value)} />
        </label>
        <label className="ll-widget__control">
          <span>sample rate f&#8347; <b>{fs} Hz</b> · Nyquist {nyquist} Hz</span>
          <input type="range" min={800} max={12000} step={100} value={fs} onChange={(e) => setFs(+e.target.value)} />
        </label>
      </div>

      <div className="ll-widget__row">
        <button type="button" className={`ll-btn${playing === "true" ? " is-live" : ""}`} onClick={() => play("true")}>
          {playing === "true" ? "◼ stop" : "▶ hear true tone"}
        </button>
        <button type="button" className={`ll-btn${playing === "alias" ? " is-live" : ""}`} onClick={() => play("alias")} disabled={!aliased}>
          {playing === "alias" ? "◼ stop" : "▶ hear the alias"}
        </button>
      </div>

      <p className="ll-widget__readout">
        {aliased
          ? `↯ ALIASED — ${trueHz} Hz is sampled as ${Math.round(alias)} Hz`
          : trueHz > nyquist
            ? `above Nyquist but aliasedFrequency() isn't folding yet — implement it`
            : `clean — ${trueHz} Hz is below Nyquist (${nyquist} Hz)`}
      </p>
      <p className="ll-widget__note">
        Tones are shifted into a hearable octave for playback; the point is the pitch relationship, not the absolute frequency.
      </p>
    </div>
  );
}

function sinePath(hz: number): string {
  const n = 240;
  let d = "";
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * (SPAN_MS / 1000);
    const x = (i / n) * W;
    const y = MID - (MID - 12) * Math.sin(2 * Math.PI * hz * t);
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)} `;
  }
  return d;
}

/** Fold a frequency into ~110–1760 Hz so low sample rates are still audible. */
function audibleOctave(hz: number): number {
  let f = Math.max(1, hz);
  while (f < 110) f *= 2;
  while (f > 1760) f /= 2;
  return f;
}
