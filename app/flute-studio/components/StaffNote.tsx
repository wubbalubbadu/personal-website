"use client";

/**
 * A single note on a treble staff.
 *
 * Generalised out of the embouchure page, which already had exactly this
 * drawing, so the fingering chart does not grow a second one that drifts.
 *
 * Fixed geometry — the staff lines are hardcoded constants, not measured
 * from a rendered SVG, so they cannot shift between notes. Ledger lines
 * extend above and below as needed; the staff itself never moves.
 *
 * One thing the embouchure version did not need: `spelling` draws the note
 * the way it is named rather than always as a sharp, because a fingering
 * chart lists E♭ and D♯ as one entry and should print whichever the reader
 * asked for. `notation: "whole"` is available for a stemless head, but the
 * studio's default everywhere is the embouchure page's own look.
 */

const HALF = 6; // px per diatonic staff step
const BOTTOM_LINE = 140; // fixed y of the staff's bottom line (E4)
const NOTE_X = 108;
const SHARP_LETTERS = ["C", "C", "D", "D", "E", "F", "F", "G", "G", "A", "A", "B"];
const SHARP_SEMITONES = [1, 3, 6, 8, 10];
const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];

const yFor = (step: number) => BOTTOM_LINE - step * HALF;

function ledgersBelow(step: number) {
  const lines: number[] = [];
  for (let l = -2; l >= step; l -= 2) lines.push(l);
  return lines;
}
function ledgersAbove(step: number) {
  const lines: number[] = [];
  for (let l = 10; l <= step; l += 2) lines.push(l);
  return lines;
}

export function StaffNote({
  midi,
  spelling,
  notation = "quarter",
  label,
  width = 170,
}: {
  midi: number;
  /** e.g. "E♭" or "F♯" — how to print this pitch. Defaults to sharps. */
  spelling?: string;
  notation?: "whole" | "quarter";
  label?: string;
  width?: number;
}) {
  const match = spelling?.match(/^([A-G])([♯♭]?)$/);
  const letter = match ? match[1] : SHARP_LETTERS[midi % 12];
  const accidental = match ? match[2] : SHARP_SEMITONES.includes(midi % 12) ? "♯" : "";
  const octave = Math.floor(midi / 12) - 1;
  // E4 is step 0; each diatonic step is half a staff space.
  const step = (octave - 4) * 7 + LETTERS.indexOf(letter) - 2;
  const y = yFor(step);
  const whole = notation === "whole";
  // Stem points away from ledger-line territory: up below the staff, down above.
  const stemUp = step < 0 ? true : step > 8 ? false : step < 4;

  return (
    <svg
      viewBox="0 0 170 175"
      width={width}
      role="img"
      aria-label={label ?? `${letter}${accidental}${octave} on the treble staff`}
      style={{ maxWidth: "100%" }}
    >
      {[0, 2, 4, 6, 8].map(s => (
        <line key={s} x1={14} x2={156} y1={yFor(s)} y2={yFor(s)} stroke="currentColor" strokeWidth={1} />
      ))}
      <text x={11} y={yFor(2) + 19} fontSize={105} fontFamily="Georgia, 'Times New Roman', serif">
        𝄞
      </text>
      {[...ledgersBelow(step), ...ledgersAbove(step)].map(s => (
        <line key={s} x1={NOTE_X - 10} x2={NOTE_X + 10} y1={yFor(s)} y2={yFor(s)} stroke="currentColor" strokeWidth={1.2} />
      ))}
      {accidental && (
        <text x={NOTE_X - 23} y={y + 5} fontSize={22} fontFamily="Georgia, 'Times New Roman', serif">
          {accidental}
        </text>
      )}
      <ellipse
        cx={NOTE_X}
        cy={y}
        rx={whole ? 8.5 : 7.5}
        ry={5.5}
        transform={`rotate(-18 ${NOTE_X} ${y})`}
        fill={whole ? "none" : "currentColor"}
        stroke={whole ? "currentColor" : "none"}
        strokeWidth={whole ? 2.2 : 0}
      />
      {!whole && (
        <line
          x1={stemUp ? NOTE_X + 7 : NOTE_X - 7}
          x2={stemUp ? NOTE_X + 7 : NOTE_X - 7}
          y1={y}
          y2={stemUp ? y - 44 : y + 44}
          stroke="currentColor"
          strokeWidth={1.4}
        />
      )}
    </svg>
  );
}
