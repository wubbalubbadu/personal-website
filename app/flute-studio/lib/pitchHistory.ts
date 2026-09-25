import { toneSummary, type ToneAttempt } from './toneSession';

/**
 * What's kept of a measured note once the session ends: a few numbers, not
 * the trace. A trace is thousands of frames; this is ~100 bytes, so years of
 * practice fit in localStorage. The trace stays in memory for the session.
 */
/**
 * `center` is how the note ended up (the last take); `first` is the first try
 * that session, present only when the note was played again. First tries show
 * your instinct, finals show what you can do: keeping both means a corrected
 * note is never held against you, and your habits still show.
 */
export type PitchRecord = { at: number; pitch: string; midi: number; ms: number; center: number; drift: number; exercise: string; first?: number };

const KEY = 'cookie:pitch-history';
const LIMIT = 6000;
export const PITCH_UPDATED = 'cookie:pitch-updated';
/** Beyond this, a note reads as off. Same line the live grade uses. */
export const OFF_CENTS = 10;
/** Only notes held at least this long can show an ending drop. */
export const LONG_NOTE_MS = 1500;
/** A long tone worth the name. The report nudges toward it. */
export const HOLD_GOAL_MS = 10000;

export function readPitchHistory(): PitchRecord[] {
  try { const saved = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(saved) ? saved : []; } catch { return []; }
}
export function appendPitchHistory(records: PitchRecord[]) {
  if (!records.length) return;
  try { localStorage.setItem(KEY, JSON.stringify([...readPitchHistory(), ...records].slice(-LIMIT))); } catch { /* quota or private mode: the report still shows */ }
  window.dispatchEvent(new Event(PITCH_UPDATED));
}
/** Unreliable notes (too short, too patchy) are left out: they would teach the map noise. */
export function recordsFromAttempts(attempts: ToneAttempt[], exercise: string, at = Date.now(), firstTry?: (targetId: number) => ToneAttempt | undefined): PitchRecord[] {
  return attempts.flatMap(a => {
    const s = toneSummary(a);
    if (!s.reliable) return [];
    const earlier = firstTry?.(a.target.id), e = earlier && toneSummary(earlier);
    return [{ at, pitch: a.target.pitch, midi: a.target.midi, ms: Math.round(s.duration), center: Math.round(s.center), drift: Math.round(s.drift), exercise, ...(e?.reliable ? { first: Math.round(e.center) } : {}) }];
  });
}

const median = (values: number[]) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b), mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const endingDrops = (r: PitchRecord) => r.ms >= LONG_NOTE_MS && r.drift < -OFF_CENTS && Math.abs(r.drift) > Math.abs(r.center);

export type PitchReport = { notes: number; needWork: number; longNotes: number; endingDrops: number; medianHoldMs: number; worst: PitchRecord[] };
/** The card shown when Pitch closes: this session only. */
export function sessionReport(records: PitchRecord[]): PitchReport {
  const long = records.filter(r => r.ms >= LONG_NOTE_MS);
  const off = records.filter(r => Math.abs(r.center) > OFF_CENTS || endingDrops(r));
  const size = (r: PitchRecord) => Math.max(Math.abs(r.center), endingDrops(r) ? Math.abs(r.drift) : 0);
  return { notes: records.length, needWork: off.length, longNotes: long.length, endingDrops: long.filter(endingDrops).length,
    medianHoldMs: median(records.map(r => r.ms)), worst: [...off].sort((a, b) => size(b) - size(a)).slice(0, 3) };
}

/** Only recent readings count, so a habit you have fixed stops following you around. */
export const RECENT_PER_NOTE = 8;
export type NoteTendency = { midi: number; pitch: string; count: number; instinct: number; final: number; instinctFlat: number; instinctSharp: number; finalFlat: number; finalSharp: number };
/**
 * Per written note, over its most recent readings: which way your first try
 * leans (instinct), and where you ended up (final). A note you always fix
 * leans in `instinct` but not in `final`.
 */
export function noteTendencies(records: PitchRecord[]): Map<number, NoteTendency> {
  const byMidi = new Map<number, PitchRecord[]>();
  for (const r of records) byMidi.set(r.midi, [...(byMidi.get(r.midi) ?? []), r]);
  const share = (values: number[], test: (v: number) => boolean) => values.filter(test).length / values.length;
  return new Map([...byMidi].map(([midi, all]) => {
    const rs = all.slice(-RECENT_PER_NOTE), instinct = rs.map(r => r.first ?? r.center), final = rs.map(r => r.center);
    return [midi, { midi, pitch: rs.at(-1)!.pitch, count: rs.length, instinct: Math.round(median(instinct)), final: Math.round(median(final)),
      instinctFlat: share(instinct, v => v < -OFF_CENTS), instinctSharp: share(instinct, v => v > OFF_CENTS),
      finalFlat: share(final, v => v < -OFF_CENTS), finalSharp: share(final, v => v > OFF_CENTS) }];
  }));
}
const leans = (flat: number, sharp: number, share: number) => Math.max(flat, sharp) >= share;
/**
 * Still off after trying again: seen enough to trust (3+), and the final
 * result leans the same way most of the time. A note that is sometimes flat
 * and sometimes sharp is inconsistent, not biased — a different problem.
 */
export function focusNotes(tendencies: Map<number, NoteTendency>, minCount = 3, share = .6) {
  return [...tendencies.values()].filter(t => t.count >= minCount && leans(t.finalFlat, t.finalSharp, share))
    .sort((a, b) => Math.abs(b.final) - Math.abs(a.final));
}
/** Your first try leans, but you bring it in: a habit worth knowing, not a mistake. */
export function correctedNotes(tendencies: Map<number, NoteTendency>, minCount = 3, share = .6) {
  return [...tendencies.values()].filter(t => t.count >= minCount && leans(t.instinctFlat, t.instinctSharp, share) && !leans(t.finalFlat, t.finalSharp, share))
    .sort((a, b) => Math.abs(b.instinct) - Math.abs(a.instinct));
}
export function habits(records: PitchRecord[]) {
  const long = records.filter(r => r.ms >= LONG_NOTE_MS);
  return { longNotes: long.length, endingDropShare: long.length ? long.filter(endingDrops).length / long.length : 0, medianHoldMs: median(records.map(r => r.ms)), sessions: new Set(records.map(r => r.at)).size };
}
