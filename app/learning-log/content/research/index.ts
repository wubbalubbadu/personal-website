/**
 * Research maps: a survey of projects to work through, not slides to read.
 *
 * Each map opens into its own checklist view (`view/ResearchView.tsx`):
 * projects to check off, gaps to pin as "could be mine", and questions with a
 * box for my own first answer. Same hash routing as notes (`#<id>`), so ids
 * must be unique against notes and course chapters.
 */
import { visualMusicOss } from "./visual-music-oss";

export type License = "easy" | "copyleft" | "unclear" | "closed" | "paper";
export type Browser = "yes" | "partly" | "no";

export type Project = {
  id: string;
  name: string;
  href: string;
  what: string;
  license: License;
  /** As written on the repo, e.g. "MIT" or "AGPL-3.0". */
  licenseLabel: string;
  /** Last push and rough stars, or a year for papers. */
  activity: string;
  browser: Browser;
  /** What to learn from it or reuse. */
  note?: string;
};

export type Area = {
  id: string;
  title: string;
  /** What this area teaches, in a few sentences. */
  teaches: string;
  projects: Project[];
};

export type ResearchMap = {
  id: string;
  title: string;
  kind: string;
  summary: string;
  date: string;
  /** Where I already am, before the survey. */
  start: string;
  areas: Area[];
  /** Ranked picks: project ids from the areas, with why. */
  picks: { ids: string[]; why: string }[];
  gaps: { id: string; title: string; detail: string }[];
  questions: { id: string; text: string }[];
};

export const researchMaps: ResearchMap[] = [visualMusicOss];

export const researchIds: Set<string> = new Set(researchMaps.map((r) => r.id));

export function getResearch(id: string): ResearchMap | undefined {
  return researchMaps.find((r) => r.id === id);
}
