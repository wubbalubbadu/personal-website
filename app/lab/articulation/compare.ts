/**
 * Two takes side by side: the typical (median) value of each measurement, over the notes where it means something.
 * Medians, not averages, so one odd note (a cracked attack, a note cut by a breath) does not move the answer.
 * No imports beyond types, so it runs in `node --test`.
 */
import type {LengthWord, Note} from "./engine";

export type TakeSummary = {
  notes: number;
  /** Attack time, over notes with an attack (not slurred-in notes). */
  attackMs: number | null;
  /** Share of the time to the next note that a note sounds, over notes with a next note that are not slurred. */
  fill: number | null;
  /** Release time, over notes that end (not slurred into the next). */
  releaseMs: number | null;
  settleMs: number | null;
  wobbleCents: number | null;
  breathiness: number | null;
  lengths: Partial<Record<LengthWord, number>>;
};

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b), middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
const present = <T,>(values: (T | null)[]) => values.filter((v): v is T => v !== null);

export function summarize(notes: Note[]): TakeSummary {
  const lengths: Partial<Record<LengthWord, number>> = {};
  for (const note of notes) lengths[note.length] = (lengths[note.length] ?? 0) + 1;
  return {
    notes: notes.length,
    attackMs: median(notes.filter(n => n.attack !== "none").map(n => n.attackMs)),
    fill: median(present(notes.filter(n => n.length !== "slurred").map(n => n.fill))),
    releaseMs: median(notes.filter(n => n.release !== "joined").map(n => n.releaseMs)),
    settleMs: median(present(notes.map(n => n.settleMs))),
    wobbleCents: median(present(notes.map(n => n.wobbleCents))),
    breathiness: median(present(notes.map(n => n.breathiness))),
    lengths,
  };
}
