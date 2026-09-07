"use client";

import { useEffect, useRef, useState } from "react";
import { playFreq } from "../audio/notes";
import { resume } from "../audio/engine";

/**
 * Hear an interval as a ratio. Root is fixed at C4; each interval plays the root
 * plus a second note, tuned either by the pure whole-number ratio (just
 * intonation) or by equal temperament. The "cents off" readout is the size of
 * that compromise.
 */

const ROOT = 261.63; // C4
const INTERVALS: { name: string; degree: string; ratio: [number, number]; semis: number }[] = [
  { name: "Octave", degree: "8ve", ratio: [2, 1], semis: 12 },
  { name: "Perfect fifth", degree: "5th", ratio: [3, 2], semis: 7 },
  { name: "Perfect fourth", degree: "4th", ratio: [4, 3], semis: 5 },
  { name: "Major third", degree: "M3", ratio: [5, 4], semis: 4 },
  { name: "Minor third", degree: "m3", ratio: [6, 5], semis: 3 },
];

export default function IntervalRatios() {
  const [tuning, setTuning] = useState<"just" | "equal">("just");
  const [active, setActive] = useState<string | null>(null);
  const stopRef = useRef<(() => void)[]>([]);

  useEffect(() => () => stopRef.current.forEach((s) => s()), []);

  async function play(iv: (typeof INTERVALS)[number]) {
    await resume();
    stopRef.current.forEach((s) => s());
    const top =
      tuning === "just"
        ? ROOT * (iv.ratio[0] / iv.ratio[1])
        : ROOT * Math.pow(2, iv.semis / 12);
    stopRef.current = [
      playFreq(ROOT, { type: "triangle", gain: 0.22, hold: 0.9 }),
      playFreq(top, { type: "triangle", gain: 0.22, hold: 0.9 }),
    ];
    setActive(iv.name);
    window.setTimeout(() => setActive(null), 1200);
  }

  return (
    <div className="ll-widget">
      <div className="ll-widget__row">
        <div className="ll-chiprow">
          {INTERVALS.map((iv) => {
            const justHz = ROOT * (iv.ratio[0] / iv.ratio[1]);
            const etHz = ROOT * Math.pow(2, iv.semis / 12);
            const cents = 1200 * Math.log2(etHz / justHz);
            return (
              <button
                key={iv.name}
                type="button"
                className={`ll-chip${active === iv.name ? " is-on" : ""}`}
                onClick={() => play(iv)}
              >
                ▶ {iv.name} · {iv.ratio[0]}:{iv.ratio[1]}
                <span style={{ opacity: 0.6 }}> · {cents >= 0 ? "+" : ""}{cents.toFixed(1)}¢</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="ll-widget__row">
        <div className="ll-chiprow">
          <button type="button" className={`ll-chip${tuning === "just" ? " is-on" : ""}`} onClick={() => setTuning("just")}>
            just (pure ratio)
          </button>
          <button type="button" className={`ll-chip${tuning === "equal" ? " is-on" : ""}`} onClick={() => setTuning("equal")}>
            equal temperament
          </button>
        </div>
      </div>
      <p className="ll-widget__note">
        Root = C4 ≈ 261.6 Hz. The <b>¢</b> value is how far equal temperament sits from the pure ratio, in cents (100¢ = one semitone). The fifth is only 2¢ off — nearly free. The major third is a noticeable 14¢ flat in equal temperament.
      </p>
    </div>
  );
}
