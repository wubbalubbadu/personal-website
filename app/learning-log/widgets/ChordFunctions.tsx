"use client";

import { useEffect, useRef, useState } from "react";
import { playChord } from "../audio/notes";
import { resume } from "../audio/engine";

/**
 * The six basic chords of C major (§3.3). Click one to hear the triad and read
 * its function + mood; or play the I–V–vi–IV loop that half of pop is built on.
 */

const CHORDS = [
  { rn: "I", notes: ["C4", "E4", "G4"], quality: "major", fn: "tonic (T)", mood: "stable · home" },
  { rn: "ii", notes: ["D4", "F4", "A4"], quality: "minor", fn: "subdominant (S)", mood: "gentle · about to set off" },
  { rn: "iii", notes: ["E4", "G4", "B4"], quality: "minor", fn: "dominant-parallel", mood: "melancholy · transitional" },
  { rn: "IV", notes: ["F4", "A4", "C5"], quality: "major", fn: "subdominant (S)", mood: "warm · bright neighbour" },
  { rn: "V", notes: ["G4", "B4", "D5"], quality: "major", fn: "dominant (D)", mood: "tense · needs to go home" },
  { rn: "vi", notes: ["A4", "C5", "E5"], quality: "minor", fn: "tonic-parallel", mood: "wistful · the hero's shadow" },
];

export default function ChordFunctions() {
  const [active, setActive] = useState<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const seqRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      stopRef.current?.();
      seqRef.current.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  async function hit(c: (typeof CHORDS)[number]) {
    await resume();
    stopRef.current?.();
    stopRef.current = playChord(c.notes, { type: "triangle", gain: 0.16, hold: 0.7 });
    setActive(c.rn);
    window.setTimeout(() => setActive((a) => (a === c.rn ? null : a)), 900);
  }

  async function loop() {
    await resume();
    seqRef.current.forEach((t) => window.clearTimeout(t));
    const order = ["I", "V", "vi", "IV"];
    seqRef.current = order.map((rn, i) =>
      window.setTimeout(() => {
        const c = CHORDS.find((x) => x.rn === rn)!;
        stopRef.current?.();
        stopRef.current = playChord(c.notes, { type: "triangle", gain: 0.16, hold: 0.8 });
        setActive(rn);
      }, i * 850),
    );
    seqRef.current.push(window.setTimeout(() => setActive(null), order.length * 850 + 400));
  }

  const cur = CHORDS.find((c) => c.rn === active);

  return (
    <div className="ll-widget">
      <div className="ll-widget__row">
        <div className="ll-chiprow">
          {CHORDS.map((c) => (
            <button
              key={c.rn}
              type="button"
              className={`ll-chip${active === c.rn ? " is-on" : ""}`}
              onClick={() => hit(c)}
              style={{ minWidth: 92 }}
            >
              <b>{c.rn}</b> · {c.notes.map((n) => n.replace(/\d/, "")).join("–")}
            </button>
          ))}
        </div>
        <button type="button" className="ll-btn" onClick={loop}>▶ I–V–vi–IV</button>
      </div>
      <p className="ll-widget__readout">
        {cur ? `${cur.rn}  ·  ${cur.quality}  ·  ${cur.fn}  ·  ${cur.mood}` : "pick a chord"}
      </p>
      <p className="ll-widget__note">I, IV, V are major and bright; ii, iii, vi are minor and soft. The seventh scale triad (ti–re–fa, diminished) is the unsettling one left out.</p>
    </div>
  );
}
