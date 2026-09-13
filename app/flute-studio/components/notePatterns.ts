export type ArticulationMode = "slur" | "tongue" | "staccato" | "tenuto";
export type ArticulationGroup = { size: number; mode: ArticulationMode };

/**
 * "whole" keeps a single group sized to the actual note count at XML-build
 * time rather than a fixed size:1 group — a size:1 group would make every
 * note both the start AND end of its own slur, drawing a tiny arc over each
 * note instead of one continuous phrase mark across the run. Only matters
 * for slur; tongue/staccato/tenuto don't care about position, so "whole
 * run, one mode" and "repeating group of 1" would behave the same for them.
 */
export type ArticulationSelection = { kind: "whole"; mode: ArticulationMode } | { kind: "groups"; groups: ArticulationGroup[] };

export function resolveArticulationPattern(selection: ArticulationSelection, totalNotes: number): ArticulationGroup[] {
  return selection.kind === "whole" ? [{ size: Math.max(1, totalNotes), mode: selection.mode }] : selection.groups;
}

export function resolveArticulation(pattern: ArticulationGroup[], index: number): { mode: ArticulationMode; positionInGroup: number; groupSize: number } {
  const cycleLength = pattern.reduce((sum, g) => sum + Math.max(0, g.size), 0);
  if (cycleLength <= 0) return { mode: "tongue", positionInGroup: 0, groupSize: 1 };
  let offset = index % cycleLength;
  for (const group of pattern) {
    if (offset < group.size) return { mode: group.mode, positionInGroup: offset, groupSize: group.size };
    offset -= group.size;
  }
  return { mode: "tongue", positionInGroup: 0, groupSize: 1 };
}

export const articulationPresetIds = ["allSlurred", "allTenuto", "allStaccato", "slur2Tongue2", "tongue2Slur2", "slur2Tongue1", "tongue1Slur2Tongue1", "tongue1Slur3", "slur3Tongue1"] as const;
export type ArticulationPresetId = typeof articulationPresetIds[number];

export function articulationPresetSelection(id: ArticulationPresetId): ArticulationSelection {
  switch (id) {
    case "allSlurred": return { kind: "whole", mode: "slur" };
    case "allTenuto": return { kind: "whole", mode: "tenuto" };
    case "allStaccato": return { kind: "whole", mode: "staccato" };
    case "slur2Tongue2": return { kind: "groups", groups: [{ size: 2, mode: "slur" }, { size: 2, mode: "tongue" }] };
    case "tongue2Slur2": return { kind: "groups", groups: [{ size: 2, mode: "tongue" }, { size: 2, mode: "slur" }] };
    case "slur2Tongue1": return { kind: "groups", groups: [{ size: 2, mode: "slur" }, { size: 1, mode: "tongue" }] };
    case "tongue1Slur2Tongue1": return { kind: "groups", groups: [{ size: 1, mode: "tongue" }, { size: 2, mode: "slur" }, { size: 1, mode: "tongue" }] };
    case "tongue1Slur3": return { kind: "groups", groups: [{ size: 1, mode: "tongue" }, { size: 3, mode: "slur" }] };
    case "slur3Tongue1": return { kind: "groups", groups: [{ size: 3, mode: "slur" }, { size: 1, mode: "tongue" }] };
  }
}

/** Compact, stable string for use as a React key / storage-id suffix. */
export function serializeArticulationSelection(selection: ArticulationSelection): string {
  return selection.kind === "whole" ? `whole-${selection.mode}` : `groups-${selection.groups.map(g => `${g.size}${g.mode.slice(0, 2)}`).join("_")}`;
}

export function selectionsEqual(a: ArticulationSelection, b: ArticulationSelection): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "whole") return a.mode === (b as { mode: ArticulationMode }).mode;
  const groups = (b as { groups: ArticulationGroup[] }).groups;
  return a.groups.length === groups.length && a.groups.every((g, i) => g.size === groups[i].size && g.mode === groups[i].mode);
}

export const defaultArticulationSelection: ArticulationSelection = { kind: "whole", mode: "tongue" };

export type RhythmChoice = "even" | "dottedLongShort" | "dottedShortLong" | "triplet";
export type RhythmDivision = { divisions: number; type: string; dots: number; tuplet?: "start" | "stop" };

/**
 * 4 divisions/quarter for even (today's plain-16th grid, unchanged). Any
 * dotted/triplet choice needs 12 — the LCM of a 16th's 3 divisions, a
 * dotted-8th's 9, and a triplet-8th's 4 — the smallest grid that represents
 * all three exactly, with zero rounding.
 */
export function divisionsPerQuarter(choice: RhythmChoice): number {
  return choice === "even" ? 4 : 12;
}

export function resolveRhythm(count: number, choice: RhythmChoice): RhythmDivision[] {
  const result: RhythmDivision[] = [];
  for (let i = 0; i < count; i++) {
    if (choice === "even") { result.push({ divisions: 1, type: "16th", dots: 0 }); continue; }
    if (choice === "triplet") {
      // A trailing 1-2 notes that can't fill a full group of 3 (count isn't
      // a multiple of 3) are rendered as plain, untripled 16ths instead of
      // a fractional/orphaned triplet — not just for a missing bracket, but
      // because a note carrying a triplet time-modification with no actual
      // tuplet grouping corrupts VexFlow's tick accounting: it doesn't fail
      // on that note itself, it silently poisons state that only surfaces
      // as "Invalid note initialization object" once enough later content
      // (another measure's worth of real tuplets) gets processed — found by
      // bisection, since a single scale's worth in isolation never
      // triggered it, only concatenating a second key's scale after it did.
      if (i >= count - (count % 3)) { result.push({ divisions: 3, type: "16th", dots: 0 }); continue; }
      const position = i % 3;
      result.push({ divisions: 4, type: "eighth", dots: 0, tuplet: position === 0 ? "start" : position === 2 ? "stop" : undefined });
      continue;
    }
    const longFirst = choice === "dottedLongShort";
    const isLong = (i % 2 === 0) === longFirst;
    result.push(isLong ? { divisions: 9, type: "eighth", dots: 1 } : { divisions: 3, type: "16th", dots: 0 });
  }
  return result;
}

export type SyllableScheme = { mode: "off" } | { mode: "alternate"; startLetter: "T" | "K" } | { mode: "tripletGrouped" };

/**
 * tongueIndex counts only tongue/staccato notes seen so far (the caller
 * skips slurred ones without incrementing it), so T/K alternation tracks
 * actual tongue strokes rather than note position in the run.
 */
export function resolveSyllable(mode: ArticulationMode, tongueIndex: number, scheme: SyllableScheme): "T" | "K" | null {
  if (scheme.mode === "off" || mode === "slur") return null;
  if (scheme.mode === "tripletGrouped") return tongueIndex % 3 === 1 ? "K" : "T";
  const isT = (tongueIndex % 2 === 0) === (scheme.startLetter === "T");
  return isT ? "T" : "K";
}

export function serializeSyllableScheme(scheme: SyllableScheme): string {
  return scheme.mode === "alternate" ? `alt-${scheme.startLetter}` : scheme.mode;
}
