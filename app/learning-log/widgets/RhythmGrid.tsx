"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { resume } from "../audio/engine";
import { StepSequencer, VOICES, type Voice } from "../audio/drums";

/**
 * The kick / snare / hi-hat grid from §4.2, made playable. 16 steps = 2 bars of
 * 4/4 at eighth-note resolution. Toggle cells, set the tempo, hit play; the
 * column under the playhead lights up. Default is a plain backbeat.
 */

const STEPS = 16;
const LABEL: Record<Voice, string> = { hat: "Hi-hat", snare: "Snare", kick: "Kick" };

function backbeat(): Record<Voice, boolean[]> {
  const blank = () => Array<boolean>(STEPS).fill(false);
  const hat = blank().map((_, i) => i % 2 === 0); // eighths
  const snare = blank();
  [4, 12].forEach((i) => (snare[i] = true)); // beats 2 and 4
  const kick = blank();
  [0, 8, 10].forEach((i) => (kick[i] = true));
  return { hat, snare, kick };
}

export default function RhythmGrid() {
  const [pattern, setPattern] = useState<Record<Voice, boolean[]>>(backbeat);
  const [bpm, setBpm] = useState(110);
  const [playing, setPlaying] = useState(false);
  const [head, setHead] = useState(-1);
  const seqRef = useRef<StepSequencer | null>(null);

  const seq = useMemo(
    () => new StepSequencer(pattern, bpm, STEPS, (s) => setHead(s)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useEffect(() => {
    seqRef.current = seq;
    return () => seq.stop();
  }, [seq]);

  // keep the live sequencer pointed at current state
  useEffect(() => {
    seq.pattern = pattern;
  }, [pattern, seq]);
  useEffect(() => {
    seq.setBpm(bpm);
  }, [bpm, seq]);

  async function toggle() {
    await resume();
    if (playing) {
      seq.stop();
      setPlaying(false);
      setHead(-1);
    } else {
      seq.start();
      setPlaying(true);
    }
  }

  const flip = (v: Voice, i: number) =>
    setPattern((p) => ({ ...p, [v]: p[v].map((on, j) => (j === i ? !on : on)) }));

  return (
    <div className="ll-widget">
      <div style={{ overflowX: "auto" }}>
        <table className="ll-seq">
          <tbody>
            {VOICES.map((v) => (
              <tr key={v}>
                <th>{LABEL[v]}</th>
                {pattern[v].map((on, i) => (
                  <td key={i}>
                    <button
                      type="button"
                      aria-label={`${LABEL[v]} step ${i + 1}`}
                      aria-pressed={on}
                      className={`ll-seq-cell${on ? " is-on" : ""}${head === i ? " is-head" : ""}${i % 4 === 0 ? " is-beat" : ""}`}
                      onClick={() => flip(v, i)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ll-widget__row">
        <button type="button" className={`ll-btn${playing ? " is-live" : ""}`} onClick={toggle}>
          {playing ? "◼ stop" : "▶ play"}
        </button>
        <label className="ll-widget__control">
          <span>tempo <b>{bpm} BPM</b></span>
          <input type="range" min={60} max={160} step={1} value={bpm} onChange={(e) => setBpm(+e.target.value)} />
        </label>
        <button type="button" className="ll-chip" onClick={() => setPattern(backbeat())}>reset to backbeat</button>
        <button
          type="button"
          className="ll-chip"
          onClick={() => setPattern((p) => ({ ...p, hat: p.hat.map((_, i) => true) }))}
        >
          hi-hat → 16ths
        </button>
      </div>
      <p className="ll-widget__note">
        16 cells = 2 bars of 4/4; every 4th cell (darker) is a beat. Snare on 2 &amp; 4 is the backbeat. Push the kick onto an upbeat cell and feel it get syncopated.
      </p>
    </div>
  );
}
