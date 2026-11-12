/**
 * Listening live: the articulation engine, run as the sound arrives instead of on a finished recording.
 *
 * Feed it microphone samples in chunks of any size (`push`). It keeps the same measurements as the recorded analysis
 * (the ~3 ms loudness envelope, YIN pitch and spectrum every ~6 ms, the same note-start rules and the same per-note
 * description), so a note looks the same live as it does when the take is analysed afterwards.
 *
 * What changes live is *when* things are known:
 * - a note that starts after silence is known within ~10 ms,
 * - a tongued start is known ~45 ms late (the rule needs to see the loudness rise again after the dip),
 * - a slurred start is known once the new pitch has held for 24 ms,
 * - how long a note sounded and how it ended are only known when it ends.
 * So each note is "open" (described from what has been heard so far) until it ends, then final.
 *
 * The gate adapts: the room level is the quietest tenth of the last few seconds, so start with a moment of silence.
 */
import {
  ANALYSIS_EVERY, BREATH_MS, DIP_FALL_DB, DIP_RISE_DB, DIP_RISE_WITH_FLUX_DB, DIP_RISE_WITHIN_MS, ENVELOPE_HOP_MS,
  FLUX_SPIKE, FLUX_SPIKE_MIN, GATE_ABOVE_FLOOR_DB, GATE_BELOW_TOP_DB, HOLE_MS, MIN_NOTE_MS, MIN_SOUND_MS, SLUR_MIN_STEP,
  SLUR_STEADY_MS, TONGUE_DEEP_DB, describeNote, describePhrase, lengthWord, makeWork, measureFrame, percentile,
  type EndKind, type Note, type Phrase, type StartKind, type ToneFrame, type Work,
} from "../articulation/engine";

const MAX_SECONDS = 120;
/** The room level is re-estimated from about this much recent loudness. */
const FLOOR_WINDOW_MS = 4000;

type Open = {from: number; kind: StartKind};

export class LiveListener {
  readonly sampleRate: number;
  readonly a4: number;
  readonly hop: number;
  readonly hopMs: number;
  /** Everything heard so far, so the take can be analysed in full afterwards. */
  private buffer: Float32Array;
  private length = 0;
  private amp: Float32Array;
  private db: Float32Array;
  private envelopeCount = 0;
  private work: Work;
  private frames: ToneFrame[] = [];
  private framesDone = 0; // envelope hops whose frame has been measured
  private stepped = 0; // envelope hops the note logic has looked at

  private floorDb = -90;
  private topDb = -90;
  private open: Open | null = null;
  private candidate: number | null = null;
  private below = 0;
  private lastEnd = -Infinity; // envelope hop where the last sound ended
  private lastStart = -Infinity;
  private phrase = -1;
  private settled: number | null = null;
  private run: number[] = [];
  private runStart = 0;
  private frameCursor = 0;
  private fluxHistory: number[] = [];
  /** Each finished note's peak in absolute dB: the loudest-so-far keeps rising, so peaks are re-referenced to it. */
  private peakAbs: number[] = [];

  /** Finished notes, then the open one (if any) last. */
  notes: Note[] = [];
  phrases: Phrase[] = [];
  /** Index of the note still sounding, or null. */
  openIndex: number | null = null;
  /** Counts every change, so a drawing loop knows when to rebuild. */
  version = 0;

  constructor(sampleRate: number, a4 = 440) {
    this.sampleRate = sampleRate;
    this.a4 = a4;
    this.hop = Math.max(1, Math.round((sampleRate * ENVELOPE_HOP_MS) / 1000));
    this.hopMs = (this.hop * 1000) / sampleRate;
    this.buffer = new Float32Array(Math.ceil(sampleRate * MAX_SECONDS));
    const hops = Math.ceil(this.buffer.length / this.hop) + 1;
    this.amp = new Float32Array(hops);
    this.db = new Float32Array(hops).fill(-120);
    this.work = makeWork(sampleRate);
  }

  /** How much has been heard, ms. */
  get heardMs() { return (this.length * 1000) / this.sampleRate; }
  /** The recording so far. */
  get samples() { return this.buffer.subarray(0, this.length); }
  get full() { return this.length >= this.buffer.length; }

  push(chunk: Float32Array) {
    const room = this.buffer.length - this.length;
    if (room <= 0) return;
    const take = chunk.length <= room ? chunk : chunk.subarray(0, room);
    this.buffer.set(take, this.length);
    this.length += take.length;
    this.advance(false);
  }

  /** The sound has stopped (the microphone was closed): close whatever is open. */
  finish() {
    this.advance(true);
    if (this.open) this.close(this.stepped, "intoSilence");
    this.rebuild();
  }

  // -------------------------------------------------------------------------------------------------------------

  private advance(ending: boolean) {
    const hop = this.hop, half = Math.round(hop * 1.5);
    // Loudness for every hop whose window is complete.
    for (;;) {
      const k = this.envelopeCount, centre = k * hop + (hop >> 1);
      if (centre + half > this.length && !(ending && centre < this.length)) break;
      const from = Math.max(0, centre - half), to = Math.min(this.length, centre + half);
      let sum = 0;
      for (let i = from; i < to; i++) sum += this.buffer[i] * this.buffer[i];
      const rms = to > from ? Math.sqrt(sum / (to - from)) : 0;
      this.amp[k] = rms;
      this.db[k] = 20 * Math.log10(Math.max(rms, 1e-6));
      this.envelopeCount++;
    }
    // Pitch and tone every ANALYSIS_EVERY hops, once the frame's samples (window plus the longest lag) are in.
    const reach = this.work.window / 2 + this.work.lagMax;
    for (;;) {
      const k = this.framesDone;
      const centre = k * hop + (hop >> 1);
      if (centre + reach > this.length && !ending) break;
      if (centre >= this.length) break;
      this.frames.push(measureFrame(this.buffer.subarray(0, this.length), centre, this.sampleRate, this.a4, this.work, (centre * 1000) / this.sampleRate));
      this.framesDone += ANALYSIS_EVERY;
    }
    // Note logic runs behind both: it needs 45 ms of loudness after a dip and the frames around it.
    const lookahead = Math.round((DIP_RISE_WITHIN_MS + 5) / this.hopMs);
    const framesReachMs = this.frames.length ? this.frames[this.frames.length - 1].at : -Infinity;
    let changed = false;
    while (this.stepped < this.envelopeCount - (ending ? 0 : lookahead) && (ending || this.stepped * this.hopMs + 35 <= framesReachMs)) {
      changed = this.step(this.stepped) || changed;
      this.stepped++;
    }
    if (changed || this.open) this.rebuild();
  }

  private updateLevels(s: number) {
    // Loudest so far, and the room: the quietest tenth of the last few seconds, re-estimated every ~150 ms.
    this.topDb = Math.max(this.topDb, this.db[s]);
    if (s % 50 === 0 || s < 50) {
      const span = Math.round(FLOOR_WINDOW_MS / this.hopMs), from = Math.max(0, s - span);
      const sample: number[] = [];
      for (let i = from; i <= s; i += 3) sample.push(this.db[i]);
      this.floorDb = percentile(sample, 0.1);
    }
  }

  private gate() { return Math.max(this.floorDb + GATE_ABOVE_FLOOR_DB, this.topDb - GATE_BELOW_TOP_DB, -75); }

  private smoothed(i: number) {
    let sum = 0, count = 0;
    for (let k = Math.max(0, i - 2); k <= Math.min(this.envelopeCount - 1, i + 2); k++) { sum += this.db[k]; count++; }
    return sum / count;
  }

  /** One envelope hop through the note logic. Returns whether a note opened or closed. */
  private step(s: number): boolean {
    this.updateLevels(s);
    const gate = this.gate();
    const loud = this.db[s] > gate;

    if (!this.open) {
      if (!loud) { this.candidate = null; return false; }
      if (this.candidate === null) this.candidate = s;
      if ((s - this.candidate + 1) * this.hopMs < 9) return false;
      // A breath-length silence before this sound starts a new phrase.
      if ((this.candidate - this.lastEnd) * this.hopMs >= BREATH_MS || this.phrase < 0) this.phrase++;
      this.openNote(this.candidate, "afterSilence");
      this.candidate = null;
      this.settled = null; this.run = [];
      return true;
    }

    if (!loud) {
      this.below++;
      if (this.below * this.hopMs > HOLE_MS) {
        const end = s - this.below + 1;
        this.below = 0;
        this.close(end, "intoSilence");
        this.lastEnd = end;
        return true;
      }
    } else this.below = 0;

    // Tongue dip, judged 45 ms after it happened (the same test as the recorded analysis).
    const riseSteps = Math.round(DIP_RISE_WITHIN_MS / this.hopMs), fallSteps = Math.round(60 / this.hopMs);
    const m = s - riseSteps, minSteps = Math.round(MIN_NOTE_MS / this.hopMs);
    if (m > this.open.from + 2 && m - this.lastStart >= minSteps && this.isTongueDip(m, riseSteps, fallSteps)) {
      this.close(m, "intoTongue");
      this.openNote(m, "tongued");
      return true;
    }

    // Slur: frames up to now, measured from where the note settled, as in the recorded analysis.
    const steady = Math.max(3, Math.round(SLUR_STEADY_MS / (this.hopMs * ANALYSIS_EVERY)));
    let opened = false;
    // Frames are taken another 45 ms behind the tongue test, so a tongued note that also changes pitch is caught as
    // tongued first (as in the recorded analysis) and not mistaken for a slur.
    while (this.frameCursor < this.frames.length && this.frames[this.frameCursor].at <= m * this.hopMs - DIP_RISE_WITHIN_MS) {
      const frame = this.frames[this.frameCursor++];
      if (frame.at < this.open.from * this.hopMs) continue;
      if (frame.midi === null) { this.run = []; continue; }
      const pitch = frame.midi;
      if (this.settled !== null && Math.abs(pitch - this.settled) < SLUR_MIN_STEP) {
        this.run = [];
        this.settled += (pitch - this.settled) * 0.05;
        continue;
      }
      if (this.run.length && Math.abs(pitch - this.run[0]) >= 0.5) this.run = [];
      if (!this.run.length) this.runStart = frame.at;
      this.run.push(pitch);
      if (this.run.length < steady) continue;
      const wasSettled = this.settled !== null;
      this.settled = this.run.reduce((a, b) => a + b, 0) / this.run.length;
      this.run = [];
      if (!wasSettled) continue;
      const at = Math.round(this.runStart / this.hopMs);
      if (at - this.lastStart >= minSteps && Math.abs(at - this.lastStart) * this.hopMs >= 40 && at > this.open.from) {
        this.close(at, "joined");
        this.openNote(at, "slurred");
        opened = true;
      }
    }
    return opened;
  }

  private isTongueDip(m: number, riseSteps: number, fallSteps: number) {
    const here = this.smoothed(m);
    if (!(here <= this.smoothed(m - 1) && here < this.smoothed(m + 1))) return false;
    let before = -Infinity, after = -Infinity;
    for (let k = Math.max(this.open!.from, m - fallSteps); k < m; k++) before = Math.max(before, this.smoothed(k));
    for (let k = m + 1; k <= m + riseSteps; k++) after = Math.max(after, this.smoothed(k));
    const fall = before - here, rise = after - here;
    if (fall < DIP_FALL_DB || rise < DIP_RISE_WITH_FLUX_DB) return false;
    const atMs = m * this.hopMs;
    const fluxMedian = Math.max(1e-6, percentile(this.fluxHistory, 0.5));
    const near = this.frames.filter(f => f.at >= atMs - 15 && f.at <= atMs + 30);
    const spike = near.some(f => f.at >= atMs - 10 && f.flux > Math.max(fluxMedian * FLUX_SPIKE, FLUX_SPIKE_MIN));
    const dropout = near.some(f => Math.abs(f.at - atMs) <= 12 && f.hz === null);
    const deep = fall >= TONGUE_DEEP_DB && rise >= TONGUE_DEEP_DB;
    return rise >= DIP_RISE_DB ? deep || dropout || spike : spike && (dropout || deep);
  }

  private openNote(from: number, kind: StartKind) {
    this.open = {from, kind};
    this.lastStart = from;
    this.below = 0;
    // Keep a running sample of spectral flux while sounding, for the tongue test's "spike" baseline.
    for (const frame of this.frames.slice(-40)) this.fluxHistory.push(frame.flux);
    if (this.fluxHistory.length > 600) this.fluxHistory = this.fluxHistory.slice(-600);
    this.version++;
  }

  private close(to: number, endKind: EndKind) {
    const open = this.open;
    if (!open) return;
    this.open = null;
    const index = this.finalCount();
    if ((to - open.from) * this.hopMs < MIN_SOUND_MS && open.kind === "afterSilence" && endKind === "intoSilence") {
      // A click, not a note.
      this.notes.length = index;
      this.openIndex = null;
      this.version++;
      return;
    }
    const described = describeNote(index, open.from, Math.max(open.from + 1, to), open.kind, endKind, endKind === "intoSilence", this.amp, this.hopMs, this.frames, this.topDb);
    const note: Note = {...described, phrase: this.phrase, gapToNextMs: null, fill: null, length: "full"};
    note.length = lengthWord(note);
    this.peakAbs[index] = note.peakDb + this.topDb;
    this.notes[index] = note;
    this.notes.length = index + 1;
    // The note before this one now knows when the next one started.
    const previous = this.notes[index - 1];
    if (previous && previous.phrase === note.phrase) {
      previous.gapToNextMs = Math.round(note.startMs - previous.startMs);
      previous.fill = Math.round(Math.min(1, previous.soundedMs / previous.gapToNextMs) * 100) / 100;
      previous.length = lengthWord(previous);
    }
    this.openIndex = null;
    this.version++;
  }

  /** Notes that have ended (the open one, if any, sits after them). */
  private finalCount() { return this.openIndex === null ? this.notes.length : this.openIndex; }

  /** Re-describes the open note from what has been heard so far, and the phrases. */
  private rebuild() {
    const count = this.finalCount();
    if (this.open) {
      const to = Math.max(this.open.from + 1, this.stepped);
      const described = describeNote(count, this.open.from, to, this.open.kind, "intoSilence", false, this.amp, this.hopMs, this.frames, this.topDb);
      this.notes[count] = {...described, phrase: this.phrase, gapToNextMs: null, fill: null, length: "full"};
      this.notes.length = count + 1;
      this.openIndex = count;
    } else {
      this.notes.length = count;
      this.openIndex = null;
    }
    for (let i = 0; i < count; i++) {
      if (this.peakAbs[i] !== undefined) this.notes[i].peakDb = Math.round((this.peakAbs[i] - this.topDb) * 10) / 10;
    }
    const byPhrase = new Map<number, Note[]>();
    for (const note of this.notes) {
      const list = byPhrase.get(note.phrase) ?? [];
      list.push(note);
      byPhrase.set(note.phrase, list);
    }
    this.phrases = [...byPhrase.entries()].map(([index, members]) => describePhrase(index, members, this.db, this.hopMs, this.topDb));
    this.version++;
  }
}

/** The AudioWorklet that forwards microphone samples to the page in blocks of 1024 (about 23 ms). */
export const TAP_WORKLET = `
class RaindropsTap extends AudioWorkletProcessor {
  constructor() { super(); this.block = new Float32Array(1024); this.filled = 0; }
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel) for (let i = 0; i < channel.length; i++) {
      this.block[this.filled++] = channel[i];
      if (this.filled === this.block.length) { this.port.postMessage(this.block.slice()); this.filled = 0; }
    }
    return true;
  }
}
registerProcessor("raindrops-tap", RaindropsTap);
`;
