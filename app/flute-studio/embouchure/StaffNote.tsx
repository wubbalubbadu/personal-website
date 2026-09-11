'use client';
import {noteName} from './poses';

// Fixed geometry — the staff lines are hardcoded constants, not measured from
// a rendered SVG, so they cannot drift between notes. Ledger lines extend
// above/below as needed; the staff itself never moves.
const HALF = 6; // px per diatonic staff step
const BOTTOM_LINE = 140; // fixed y of the staff's bottom line (E4)
const NOTE_X = 108;
const letters = ['C','C','D','D','E','F','F','G','G','A','A','B'];
const sharpSemitones = [1, 3, 6, 8, 10];

function yFor(step: number) { return BOTTOM_LINE - step * HALF; }
function ledgerLinesBelow(step: number) {
  const lines: number[] = [];
  for (let l = -2; l >= step; l -= 2) lines.push(l);
  return lines;
}
function ledgerLinesAbove(step: number) {
  const lines: number[] = [];
  for (let l = 10; l <= step; l += 2) lines.push(l);
  return lines;
}

export default function StaffNote({midi}: {midi: number}) {
  const letter = letters[midi % 12];
  const isSharp = sharpSemitones.includes(midi % 12);
  const octave = Math.floor(midi / 12) - 1;
  // E4 is step 0; each diatonic step is half a staff space. Matches poses.ts's register math.
  const step = (octave - 4) * 7 + ['C', 'D', 'E', 'F', 'G', 'A', 'B'].indexOf(letter) - 2;
  const y = yFor(step);
  const below = ledgerLinesBelow(step);
  const above = ledgerLinesAbove(step);
  // Stem points away from ledger-line territory: up below the staff, down above it.
  const stemUp = step < 0 ? true : step > 8 ? false : step < 4;

  return (
    <svg viewBox="0 0 170 175" width={170} role="img" aria-label={`${noteName(midi)} on treble staff`} style={{maxWidth: '100%', overflow: 'visible'}}>
      {[0, 2, 4, 6, 8].map(s => (
        <line key={s} x1={14} x2={156} y1={yFor(s)} y2={yFor(s)} stroke="currentColor" strokeWidth={1} />
      ))}
      <text x={11} y={yFor(2) + 19} fontSize={105} fontFamily="Georgia, 'Times New Roman', serif">𝄞</text>
      {below.map(s => (
        <line key={`b${s}`} x1={NOTE_X - 9} x2={NOTE_X + 9} y1={yFor(s)} y2={yFor(s)} stroke="currentColor" strokeWidth={1.2} />
      ))}
      {above.map(s => (
        <line key={`a${s}`} x1={NOTE_X - 9} x2={NOTE_X + 9} y1={yFor(s)} y2={yFor(s)} stroke="currentColor" strokeWidth={1.2} />
      ))}
      {isSharp && <text x={NOTE_X - 23} y={y + 5} fontSize={22} fontFamily="Georgia, 'Times New Roman', serif">♯</text>}
      <ellipse cx={NOTE_X} cy={y} rx={7.5} ry={5.5} transform={`rotate(-18 ${NOTE_X} ${y})`} fill="currentColor" />
      <line
        x1={stemUp ? NOTE_X + 7 : NOTE_X - 7}
        x2={stemUp ? NOTE_X + 7 : NOTE_X - 7}
        y1={y}
        y2={stemUp ? y - 44 : y + 44}
        stroke="currentColor"
        strokeWidth={1.4}
      />
    </svg>
  );
}
