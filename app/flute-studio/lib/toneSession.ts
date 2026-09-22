import { centsFromMidi, median, midiFromHz } from './pitch';
import type { TimedFrame } from './noteSegmenter';

export type ToneTarget = { id: number; midi: number; group: number; pitch: string };
export type ToneAttempt = { id: number; target: ToneTarget; startedAt: number; endedAt: number | null; frames: TimedFrame[] };
export type ToneSnapshot = { cursor: number; live: ToneAttempt | null; attempts: ToneAttempt[]; heard: boolean; cursorAfter: boolean };
const CONFIRM_MS = 120;
const BREATH_MS = 550;
const REATTACK_GAP_MS = 180;

/** Score position and measured pitch stay separate: an inaccurate note is never recentered. */
export class ToneSession {
  cursor = 0;
  repeat = false;
  private attempts: ToneAttempt[] = [];
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
  clear() { this.attempts = []; this.live = null; this.candidate = []; this.afterBreath = false; }
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
      if (previous && (midiFromHz(previous.hz) !== midiFromHz(frame.hz) || frame.at - previous.at > 120)) this.candidate = [];
      this.candidate.push(frame);
      if (frame.at - this.candidate[0].at < CONFIRM_MS) return;
      if (this.live) this.finish();
      if (shouldAdvance && (this.attempts.length > 0 || this.afterBreath)) this.cursor = nextIndex;
      this.live = { id: ++this.serial, target: this.targets[this.cursor], startedAt: this.candidate[0].at, endedAt: null, frames: [...this.candidate] };
      this.candidate = [];
      this.afterBreath = false;
    } else {
      // Keep ambiguous transition samples rather than throwing them away.
      this.live.frames.push(...this.candidate, frame);
      this.candidate = [];
    }
    this.lastHeard = frame.at;
  }
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
