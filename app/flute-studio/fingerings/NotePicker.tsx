"use client";

import type { CSSProperties, ReactNode } from "react";
import { ChevronIcon } from "../components/HeaderIcons";

/**
 * The note picker the fingering chart and the trill chart share: an octave
 * switch (the studio's View switch) and that one octave's notes as a row of
 * capsules. Only one octave is on screen at a time, so a phone shows a dozen
 * notes instead of fifty.
 */

/** A pitch such as "C♯4" written as the name with the octave as a small number. */
export function PitchName({ value }: { value: string }) {
  return <>{value.slice(0, -1)}<sub>{value.slice(-1)}</sub></>;
}

export type PickerOctave = { id: string; label: string; title: string };
export type PickerNote = { pitch: string; label: ReactNode };

export function NotePicker({
  octaves,
  octave,
  onOctave,
  notes,
  selected,
  onSelect,
  zh,
}: {
  octaves: PickerOctave[];
  octave: string;
  onOctave: (id: string) => void;
  notes: PickerNote[];
  selected: string;
  onSelect: (pitch: string) => void;
  zh: boolean;
}) {
  return (
    <div className="note-picker">
      <div className="view-switch note-picker__octaves" role="group" aria-label={zh ? "音区" : "Octave"}>
        {octaves.map(o => (
          <button key={o.id} type="button" aria-pressed={o.id === octave} title={o.title} onClick={() => onOctave(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
      <div className="note-picker__notes" role="group" aria-label={zh ? "音" : "Notes"}>
        {notes.map(n => (
          <button key={n.pitch} type="button" aria-pressed={n.pitch === selected} onClick={() => onSelect(n.pitch)}>
            {n.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Previous or next note, either side of the staff. An icon button: no fill until hovered. */
export function StepButton({ direction, onClick, zh }: { direction: "previous" | "next"; onClick?: () => void; zh: boolean }) {
  const label = direction === "previous" ? (zh ? "上一个音" : "Previous note") : (zh ? "下一个音" : "Next note");
  return (
    <button type="button" className={`chart-step chart-step--${direction}`} aria-label={label} disabled={!onClick} onClick={onClick}>
      <ChevronIcon />
    </button>
  );
}

/**
 * The note to show after switching octave: the same name nearest the current note (the first octave holds both C4
 * and C5, so from C6 it is C5), or the octave's lowest note when the name is not in it.
 */
export function nearestSameName(pitches: string[], current: string) {
  const same = pitches.filter(p => p.slice(0, -1) === current.slice(0, -1));
  if (!same.length) return pitches[0];
  const distance = (p: string) => Math.abs(staffStep(p) - staffStep(current));
  return same.reduce((best, p) => distance(p) < distance(best) ? p : best);
}

const LETTERS = "CDEFGAB";
/** Staff steps above C0 for a written pitch ("E♭5"), as EngravedNote counts them. */
export function staffStep(pitch: string) {
  const match = /^([A-G])[♯♭]?(\d)$/.exec(pitch);
  return match ? Number(match[2]) * 7 + LETTERS.indexOf(match[1]) : 0;
}

/**
 * Size for a `.chart-staff` box. EngravedNote's drawing grows taller (by 5
 * units a step above the staff's top line area) for high notes. The box is
 * as tall as the highest note in the shown octave needs, so stepping through
 * one octave never moves anything, and a low octave does not carry the
 * altissimo's empty room above it.
 */
export function staffBoxStyle(highestStep: number): CSSProperties {
  return { ["--staff-extra" as string]: Math.max(0, highestStep - 38) * 5 };
}
