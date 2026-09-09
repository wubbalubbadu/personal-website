/**
 * Standalone notes — one per paper, talk, or blog post I read closely.
 *
 * These are deliberately *not* part of the AI-for-Music course tree. Each note
 * is its own log in the index and opens into the same Reader / Slides views a
 * chapter uses (a Note is structurally a Chapter, plus a card `kind` and an
 * optional `source` link).
 *
 * Add one: drop a `content/notes/<slug>.ts` exporting a `Note`, then list it
 * here. The `id` is its hash route (`/learning-log#<id>`), so keep it short and
 * unique against the course's chapter ids.
 */
import type { Slide } from "../types";
import { vidMusician } from "./vidmusician";
import { videoEchoedInMusic } from "./vem";

export type Note = {
  /** Hash route (`#<id>`) and progress-store key. Unique across chapters too. */
  id: string;
  /** Short name — the index card and the Reader heading. */
  title: string;
  /** Small tag on the index card, e.g. "Paper note". */
  kind: string;
  /** One-line takeaway, shown on the card and under the Reader heading. */
  summary: string;
  /** Optional external link, shown in the header while the note is open. */
  source?: { label: string; href: string };
  slides: Slide[];
};

export const notes: Note[] = [vidMusician, videoEchoedInMusic];

export const noteIds: Set<string> = new Set(notes.map((n) => n.id));

export function getNote(id: string): Note | undefined {
  return notes.find((n) => n.id === id);
}
