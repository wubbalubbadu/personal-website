import { centsFromMidi, median } from './pitch';
import type { TimedFrame } from './noteSegmenter';

export type ToneTarget = { id: number; midi: number; group: number; pitch: string };
export type ToneAttempt = { id: number; target: ToneTarget; startedAt: number; endedAt: number | null; frames: TimedFrame[] };
export type ToneSnapshot = { cursor: number; live: ToneAttempt | null; attempts: ToneAttempt[]; heard: boolean; cursorAfter: boolean };
export const TONE_MIN_RMS = .004;
const CONFIRM_MS = 120;
const BREATH_MS = 550;
const REATTACK_GAP_MS = 180;

/** Score position and measured pitch stay separate: an inaccurate note is never recentered. */
export class ToneSession {
  cursor = 0;
  repeat = false;
  private attempts: ToneAttempt[] = [];
  /** The first try at each note this session, kept when a replay replaces it: it is the player's instinct. */
  private firstTries = new Map<number, ToneAttempt>();
  private live: ToneAttempt | null = null;
  private candidate: TimedFrame[] = [];
  private lastHeard = 0;
  private serial = 0;
  private afterBreath = false;
  constructor(readonly targets: ToneTarget[]) {}
  private finish() {
    if (!this.live) return;
    this.attempts.push({ ...this.live, endedAt: this.lastHeard });
    this.live = null;
  }
  pause() { this.finish(); this.candidate = []; this.afterBreath = true; }
  select(index: number) {
    this.pause();
    this.cursor = Math.max(0, Math.min(this.targets.length - 1, index));
    this.afterBreath = false;
  }
  clear() { this.firstTries.clear(); this.attempts = []; this.live = null; this.candidate = []; this.afterBreath = false; }
  private nextIndex() {
    const target = this.targets[this.cursor];
    const next = this.targets[this.cursor + 1];
    if (this.repeat && target && (!next || next.group !== target.group))
      return this.targets.findIndex(t => t.group === target.group);
    return next ? this.cursor + 1 : this.cursor;
  }
  push(frame: TimedFrame | null, at: number) {
    if (!this.targets.length) return;
    if (!frame) {
      this.candidate = [];
      const next = this.targets[this.nextIndex()];
      const sharedBoundary = next && next.group !== this.targets[this.cursor].group && next.midi === this.targets[this.cursor].midi;
      if (this.live && at - this.lastHeard >= (sharedBoundary ? REATTACK_GAP_MS : BREATH_MS)) { this.finish(); this.afterBreath = true; }
      return;
    }
    // Resume can arrive without intervening null frames (mic was paused).
    if (this.live && frame.at - this.lastHeard >= BREATH_MS) {
      this.finish(); this.afterBreath = true; this.candidate = [];
    }
    const target = this.targets[this.cursor];
    let nextIndex = this.nextIndex();
    let next = this.targets[nextIndex];
    // If a repeated boundary note had no detectable breath, recover on the next
    // distinct written pitch. Do not fabricate a separate take for the missed onset.
    const following = this.targets[nextIndex + 1];
    if (!this.repeat && this.live && next.group !== target.group && next.midi === target.midi
      && following?.group === next.group && following.midi !== target.midi
      && Math.abs(centsFromMidi(frame.hz, following.midi)) < 42) {
      nextIndex++; next = following;
    }
    const matchesNext = nextIndex !== this.cursor && (next.midi !== target.midi || this.afterBreath) && Math.abs(centsFromMidi(frame.hz, next.midi)) < 42;
    const shouldAdvance = matchesNext && (!this.repeat || next.group === target.group || this.afterBreath);
    // A pitch change must persist. A lone outlier stays in the trace, not the score position.
    if (!this.live || shouldAdvance) {
      const previous = this.candidate.at(-1);
      if (previous && (Math.abs(1200 * Math.log2(this.candidate[0].hz / frame.hz)) > 100 || frame.at - previous.at > 120)) this.candidate = [];
      this.candidate.push(frame);
      if (frame.at - this.candidate[0].at < CONFIRM_MS) return;
      const fresh = !this.live;
      if (this.live) this.finish();
      // A new sound after silence is placed by its pitch, once it has held
      // steady (so a scratchy attack cannot send the playhead anywhere).
      const placed = fresh && !this.repeat && (this.afterBreath || !this.attempts.length) ? this.place(median(this.candidate.map(f => f.hz))) : null;
      if (placed !== null) this.cursor = placed;
      else if (shouldAdvance && (this.attempts.length > 0 || this.afterBreath)) this.cursor = nextIndex;
      const target = this.targets[this.cursor];
      // Playing a note again replaces it, and everything after it in its
      // group: only the latest take of a group is kept.
      for (const a of this.attempts) if (a.target.group === target.group && a.target.id >= target.id && !this.firstTries.has(a.target.id)) this.firstTries.set(a.target.id, a);
      this.attempts = this.attempts.filter(a => a.target.group !== target.group || a.target.id < target.id);
      this.live = { id: ++this.serial, target, startedAt: this.candidate[0].at, endedAt: null, frames: [...this.candidate] };
      this.candidate = [];
      this.afterBreath = false;
    } else {
      // Keep ambiguous transition samples rather than throwing them away.
      this.live.frames.push(...this.candidate, frame);
      this.candidate = [];
    }
    this.lastHeard = frame.at;
  }
  /**
   * Listen first, then place: after silence, the pitch says where the player
   * went. The note the score expects wins; failing that, this group's first
   * note means going again; failing that, the nearest group that starts on
   * this pitch (later groups before earlier ones at the same distance).
   * Returns null when nothing matches — then it is a wrong note, measured
   * against the expected one.
   */
  private place(hz: number): number | null {
    const near = (t: ToneTarget | undefined) => !!t && Math.abs(centsFromMidi(hz, t.midi)) < 42;
    const current = this.targets[this.cursor];
    const played = this.attempts.at(-1)?.target.id === this.cursor;
    if (near(played ? this.targets[this.cursor + 1] : current)) return null;
    const groupStart = this.targets.findIndex(t => t.group === current.group);
    if (near(this.targets[groupStart])) return groupStart;
    const starts = this.targets.map((t, i) => i).filter(i => i === 0 || this.targets[i - 1].group !== this.targets[i].group);
    const g = current.group;
    const ranked = starts.filter(i => this.targets[i].group !== g)
      .sort((a, b) => Math.abs(this.targets[a].group - g) - Math.abs(this.targets[b].group - g) || this.targets[b].group - this.targets[a].group);
    return ranked.find(i => near(this.targets[i])) ?? null;
  }
  /** The first try at a note this session, if it was later played again. */
  firstTry(targetId: number) { return this.firstTries.get(targetId); }
  isSounding() { return this.live !== null; }
  snapshot(): ToneSnapshot {
    return { cursor: this.cursor, live: this.live ? { ...this.live, frames: [...this.live.frames] } : null, attempts: [...this.attempts], heard: !!this.live, cursorAfter: !this.live && this.afterBreath && this.attempts.at(-1)?.target.id === this.cursor };
  }
}

export function toneSummary(attempt: ToneAttempt) {
  const frames = attempt.frames;
  const duration = (attempt.endedAt ?? frames.at(-1)?.at ?? attempt.startedAt) - attempt.startedAt;
  const cents = frames.map(f => centsFromMidi(f.hz, attempt.target.midi));
  const settled = frames.filter(f => f.at - attempt.startedAt >= 200);
  const usable = settled.length ? settled : frames;
  const center = median(usable.map(f => centsFromMidi(f.hz, attempt.target.midi)));
  const firstAt = usable[0]?.at ?? 0, lastAt = usable.at(-1)?.at ?? 0;
  const head = usable.filter(f => f.at <= firstAt + 500).map(f => centsFromMidi(f.hz, attempt.target.midi));
  const tail = usable.filter(f => f.at >= lastAt - 500).map(f => centsFromMidi(f.hz, attempt.target.midi));
  const drift = median(tail) - median(head);
  let covered = 0;
  for (let i = 1; i < frames.length; i++) covered += Math.min(80, frames[i].at - frames[i - 1].at);
  const reliable = duration >= 700 && frames.length >= 10 && covered / Math.max(1, duration) >= .65;
  const severity = Math.max(Math.abs(center), duration >= 1500 ? Math.abs(drift) : 0);
  return { duration, center, drift, cents, reliable, grade: !reliable ? 'uncertain' : severity <= 10 ? 'green' : severity <= 25 ? 'amber' : 'red' };
}

/** Rounded typical offset, distinct from the severity color (which also includes drift). */
export function tonePitchLabel(attempt: ToneAttempt, zh = false) {
  const summary = toneSummary(attempt);
  if (!summary.reliable) return { short: '?', description: zh ? '可靠数据不足' : 'Not enough reliable pitch data' };
  const cents = Math.round(summary.center);
  const short = cents > 0 ? `↑ ${cents}¢` : cents < 0 ? `↓ ${Math.abs(cents)}¢` : '0¢';
  const description = zh
    ? `典型音准：${cents > 0 ? '偏高' : cents < 0 ? '偏低' : '居中'} ${Math.abs(cents)} 音分`
    : `Typical pitch: ${Math.abs(cents)} cents ${cents > 0 ? 'sharp' : cents < 0 ? 'flat' : 'from target'}`;
  const drift = Math.round(summary.drift);
  return { short, description: description + (summary.duration >= 1500 && Math.abs(drift) >= 10
    ? (zh ? `；末尾${drift > 0 ? '升高' : '降低'} ${Math.abs(drift)} 音分` : `; ending ${Math.abs(drift)} cents ${drift > 0 ? 'higher' : 'lower'} than the beginning`) : '') };
}

export type ToneFinding = { kind: 'ok' | 'center' | 'ending' | 'uncertain'; grade: string; short: string; text: string };
/**
 * The one thing worth saying about a note. A flute note is usually either
 * off throughout (center) or fine until the air runs out (ending), and the
 * fix differs, so the two are never merged into one number. The mark under
 * the note shows only this; the graph card shows both numbers.
 */
export function toneFinding(attempt: ToneAttempt, zh = false): ToneFinding {
  const s = toneSummary(attempt);
  if (!s.reliable) return { kind: 'uncertain', grade: 'uncertain', short: '?', text: zh ? '数据不足' : 'Not enough data' };
  const center = Math.round(s.center), drift = Math.round(s.drift);
  const ending = s.duration >= 1500 && Math.abs(drift) > 10 && Math.abs(drift) > Math.abs(center);
  if (ending) return { kind: 'ending', grade: s.grade, short: `${zh ? '尾' : 'end'} ${drift < 0 ? '↓' : '↑'}${Math.abs(drift)}¢`,
    text: zh ? `结尾${drift < 0 ? '下降' : '升高'} ${Math.abs(drift)} 音分` : `Ending ${drift < 0 ? 'drops' : 'rises'} ${Math.abs(drift)}¢` };
  if (Math.abs(center) <= 10) return { kind: 'ok', grade: s.grade, short: '✓', text: zh ? '音准良好' : 'In tune' };
  return { kind: 'center', grade: s.grade, short: `${center < 0 ? '↓' : '↑'}${Math.abs(center)}¢`,
    text: zh ? `偏${center < 0 ? '低' : '高'} ${Math.abs(center)} 音分` : `${Math.abs(center)}¢ ${center < 0 ? 'flat' : 'sharp'}` };
}
