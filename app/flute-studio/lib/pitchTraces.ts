import { centsFromMidi, median } from './pitch';
import { toneSummary, type ToneAttempt } from './toneSession';

/**
 * A few earlier pitch traces per written note, so a long tone can be laid
 * over last time's (or your steadiest one) and compared in one plain line.
 *
 * Kept small on purpose. pitchHistory.ts keeps a summary of every note; this
 * keeps the shape of only the last few: cents sampled every 100 ms (more
 * coarsely for very long notes, never more than 120 points), whole numbers,
 * null where the pitch could not be heard. At most five per note, and the
 * steadiest one is always among them, so "best" never disappears just
 * because you practised a lot since.
 *
 * Stored as `{ [midi]: PitchTrace[] }` under `cookie:pitch-traces:v1`;
 * transfer.ts merges it per note and trims it back to five.
 */
export type PitchTrace = { id: string; at: number; ms: number; step: number; c: (number | null)[]; wobble: number; center: number };
export type CompareMode = 'off' | 'last' | 'best';

const KEY = 'cookie:pitch-traces:v1';
export const PITCH_TRACES_KEY = KEY;
export const TRACES_PER_NOTE = 5;
const STEP_MS = 100, MAX_POINTS = 120, CLIP = 80;
/** Same edges the graph skips (ToneTrace): the attack arriving and the air stopping are not the tone. */
const ATTACK_MS = 60, RELEASE_MS = 100;
/** The settled part of a note, as toneSummary measures it. */
const SETTLE_MS = 200;
/** Within this, two wobbles read as the same. */
const SAME_CENTS = 2;

const endOf = (a: ToneAttempt) => a.endedAt ?? a.frames.at(-1)?.at ?? a.startedAt;

/**
 * How much the pitch wanders around its own centre, in cents: the average
 * distance of the settled frames from their median. A note held 20 cents
 * flat but dead still has a small wobble; tuning is a separate matter.
 */
export function wobbleOf(attempt: ToneAttempt) {
  const end = endOf(attempt);
  const cents = attempt.frames.filter(f => f.at - attempt.startedAt >= SETTLE_MS && end - f.at >= RELEASE_MS).map(f => centsFromMidi(f.hz, attempt.target.midi));
  if (cents.length < 5) return null;
  const middle = median(cents);
  return cents.reduce((sum, c) => sum + Math.abs(c - middle), 0) / cents.length;
}

/** The compact copy of one finished note, or null if it was too short or patchy to trust. */
export function traceFromAttempt(attempt: ToneAttempt, at = Date.now()): PitchTrace | null {
  const summary = toneSummary(attempt), wobble = wobbleOf(attempt);
  if (!summary.reliable || wobble === null) return null;
  const end = endOf(attempt), ms = end - attempt.startedAt;
  const step = Math.max(STEP_MS, Math.ceil(ms / MAX_POINTS / 50) * 50);
  const buckets: number[][] = Array.from({ length: Math.ceil(ms / step) }, () => []);
  for (const f of attempt.frames) {
    if (f.at - attempt.startedAt < ATTACK_MS || end - f.at < RELEASE_MS) continue;
    buckets[Math.min(buckets.length - 1, Math.floor((f.at - attempt.startedAt) / step))]?.push(centsFromMidi(f.hz, attempt.target.midi));
  }
  const c = buckets.map(b => b.length ? Math.max(-CLIP, Math.min(CLIP, Math.round(median(b)))) : null);
  return { id: `${attempt.target.midi}-${at}-${attempt.id}`, at, ms: Math.round(ms), step, c, wobble: Math.round(wobble), center: Math.round(summary.center) };
}

/** Five per note: the steadiest, then the newest. Returned oldest first. */
export function trimTraces(list: PitchTrace[]) {
  if (list.length <= TRACES_PER_NOTE) return [...list].sort((a, b) => a.at - b.at);
  const steadiest = list.reduce((best, t) => t.wobble < best.wobble || (t.wobble === best.wobble && t.at > best.at) ? t : best);
  const newest = list.filter(t => t !== steadiest).sort((a, b) => b.at - a.at).slice(0, TRACES_PER_NOTE - 1);
  return [steadiest, ...newest].sort((a, b) => a.at - b.at);
}

export function readAllTraces(): Record<string, PitchTrace[]> {
  try { const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}'); return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {}; } catch { return {}; }
}
function writeAll(all: Record<string, PitchTrace[]>) {
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* quota or private mode: the comparison just has less to show */ }
}
export function readTraces(midi: number): PitchTrace[] {
  const list = readAllTraces()[midi];
  return Array.isArray(list) ? list : [];
}
export function saveTrace(midi: number, trace: PitchTrace) {
  const all = readAllTraces();
  all[midi] = trimTraces([...(all[midi] ?? []).filter(t => t.id !== trace.id), trace]);
  writeAll(all);
}
/** Clear in Long tones throws the take away, and its traces with it. */
export function removeTraces(ids: Iterable<string>) {
  const gone = new Set(ids);
  if (!gone.size) return;
  const all = readAllTraces();
  for (const midi of Object.keys(all)) {
    all[midi] = all[midi].filter(t => !gone.has(t.id));
    if (!all[midi].length) delete all[midi];
  }
  writeAll(all);
}

/** The earlier trace to show for a note: the latest one, or the steadiest, never the note itself. */
export function pickTrace(list: PitchTrace[], mode: CompareMode, exclude?: string) {
  const others = list.filter(t => t.id !== exclude);
  if (mode === 'off' || !others.length) return undefined;
  if (mode === 'last') return others.reduce((a, b) => b.at > a.at ? b : a);
  return others.reduce((a, b) => b.wobble < a.wobble || (b.wobble === a.wobble && b.at > a.at) ? b : a);
}

/** One plain line after the note. No score: just the wobble now and then. */
export function compareLine(now: number, then: PitchTrace, mode: CompareMode, zh = false) {
  const n = Math.round(now), was = then.wobble;
  const cents = (v: number) => zh ? `${v} 音分` : `${v} ${v === 1 ? 'cent' : 'cents'}`;
  if (mode === 'best') {
    if (n <= was) return zh ? `这是你最稳的一次：摆动 ${cents(n)}，之前最好 ${was}` : `Your steadiest yet: wobble ${cents(n)}, best before was ${was}`;
    return zh ? `最稳的那次摆动 ${cents(was)}，这次 ${n}` : `Your steadiest had ${cents(was)} of wobble, this one ${n}`;
  }
  if (Math.abs(n - was) <= SAME_CENTS) return zh ? `和上次差不多稳：摆动 ${cents(n)}` : `About as steady as last time: wobble ${cents(n)}`;
  if (n < was) return zh ? `比上次更稳：摆动 ${cents(n)}，上次 ${was}` : `Steadier than last time: wobble ${cents(n)}, was ${was}`;
  return zh ? `比上次晃一些：摆动 ${cents(n)}，上次 ${was}` : `Less steady than last time: wobble ${cents(n)}, was ${was}`;
}
