/**
 * Turns a stream of pitch frames into played notes.
 *
 * This is the piece everything else waits on. The trace needs to know
 * which note it is drawing; score following needs a list of what was
 * actually played to align against what was written. Both are downstream
 * of one question: when does a new note begin?
 *
 * Deliberately not a React hook and deliberately not time-aware beyond
 * the timestamps it is handed — so it can be driven by a synthesised
 * sequence of frames in a test rather than only by a live microphone.
 */
import { centsFromMidi, median, midiFromHz, type PitchFrame } from "./pitch";

/** A frame plus when it arrived, in milliseconds. */
export type TimedFrame = PitchFrame & { at: number };

export type PlayedNote = {
  midi: number;
  startedAt: number;
  endedAt: number | null;
  /** Every frame belonging to this note, for drawing its trace. */
  frames: TimedFrame[];
};

/**
 * What the segmenter can see when deciding whether a frame opens a new
 * note. Kept as an explicit object so the rule is a pure function of its
 * inputs and can be unit-tested without driving the whole machine.
 */
export type AdvanceContext = {
  /** The frame just received. */
  frame: TimedFrame;
  /** Nearest MIDI number for that frame. */
  midi: number;
  /** The note currently being accumulated. */
  current: PlayedNote;
  /**
   * Loudness just before this frame — the median RMS of the last few
   * frames, so a single quiet buffer does not read as a dip.
   */
  recentRms: number;
  /** How long the current note has been sounding, in ms. */
  heldMs: number;
};

/**
 * How much louder than the preceding dip a frame must be to count as a
 * fresh attack. A tongued repeat dips and recovers; a slur does not.
 */
export const ONSET_RISE_RATIO = 1.8;
/** A note has to last this long before a new one can displace it. */
export const MIN_NOTE_MS = 70;
/**
 * Tone can drop below the gate briefly — the taper of a diminuendo, a
 * breath mid-note — without the note being over. The tuner already waits
 * this long before declaring silence; the segmenter uses the same figure
 * so the two never disagree about whether you are still playing.
 */
export const LOST_TONE_MS = 1050;

/**
 * Does this frame start a new note?
 *
 * ─────────────────────────────────────────────────────────────────────
 * TODO(haylie): this rule is yours to write.
 *
 * The obvious version is "the pitch changed", and it is wrong on its own:
 * two tongued notes at the same pitch never change pitch, so the
 * segmenter logs one note of double length and everything after it is off
 * by one for the rest of the take. Repeated-note tonguing and Taffanel
 * patterns are full of these.
 *
 * The other half is an onset: a sharp rise in `frame.rms` after a dip
 * means the note was re-articulated. `recentRms` is there for exactly
 * that comparison, and `ONSET_RISE_RATIO` is a starting point for how
 * sharp "sharp" should be.
 *
 * The tension worth thinking about, because it decides the feel:
 *
 *   - Too eager, and vibrato or a swell inside one long note splits it
 *     into several. A player holding a note sees it chopped up.
 *   - Too reluctant, and repeated notes merge. Nothing looks wrong — the
 *     trace is smooth and plausible — but every note after it is
 *     mislabelled. That is the worse failure, because it is silent.
 *
 * `MIN_NOTE_MS` and `heldMs` exist to keep a single noisy frame from
 * splitting a note; use them or don't.
 *
 * Return true to close `current` and open a new note at `midi`.
 * ─────────────────────────────────────────────────────────────────────
 */
export function startsNewNote(context: AdvanceContext): boolean {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { frame, midi, current, recentRms, heldMs } = context;
  // Placeholder: pitch-change only. Correct for slurs, wrong for repeats.
  return midi !== current.midi;
}

/**
 * Feeds frames in, gets notes out.
 *
 * Holds no React state so the same instance can be driven from a hook, a
 * test, or a recorded session replayed after the fact.
 */
export class NoteSegmenter {
  private notes: PlayedNote[] = [];
  private current: PlayedNote | null = null;
  private recent: number[] = [];
  private lastHeardAt = 0;

  /** Push one frame. Pass `null` for a buffer that was below the gate. */
  push(frame: TimedFrame | null, at: number) {
    if (!frame) {
      // Silence does not end a note straight away — see LOST_TONE_MS. The
      // note stays open and its trace simply has a gap, which is what a
      // diminuendo or a quick breath actually looks like.
      if (this.current && at - this.lastHeardAt > LOST_TONE_MS) this.close(this.lastHeardAt);
      return;
    }

    this.lastHeardAt = frame.at;
    const midi = midiFromHz(frame.hz);
    this.recent = [...this.recent.slice(-5), frame.rms];

    if (!this.current) {
      this.open(midi, frame);
      return;
    }

    const advance = startsNewNote({
      frame,
      midi,
      current: this.current,
      recentRms: median(this.recent.slice(0, -1)),
      heldMs: frame.at - this.current.startedAt,
    });

    if (advance) {
      this.close(frame.at);
      this.open(midi, frame);
    } else {
      this.current.frames.push(frame);
    }
  }

  private open(midi: number, frame: TimedFrame) {
    this.current = { midi, startedAt: frame.at, endedAt: null, frames: [frame] };
  }

  private close(at: number) {
    if (!this.current) return;
    this.current.endedAt = at;
    this.notes.push(this.current);
    this.current = null;
  }

  /** Everything played so far, including the note still sounding. */
  result(): PlayedNote[] {
    return this.current ? [...this.notes, this.current] : [...this.notes];
  }

  reset() {
    this.notes = [];
    this.current = null;
    this.recent = [];
    this.lastHeardAt = 0;
  }
}

/**
 * The durable shape of a played note.
 *
 * Full traces are roughly 24 frames a second of three numbers each, which
 * does not belong in localStorage — so a session keeps its traces in
 * memory and only ever persists this. Deciding it now is cheap; adding it
 * after the storage format ships is not.
 */
export type NoteSummary = {
  midi: number;
  startedAt: number;
  durationMs: number;
  /** Mean deviation from equal temperament, in cents. */
  meanCents: number;
  /** Cents from the first stable reading to the last — did it sag? */
  driftCents: number;
  minCents: number;
  maxCents: number;
};

export function summarise(note: PlayedNote): NoteSummary {
  const cents = note.frames.map(frame => centsFromMidi(frame.hz, note.midi));
  const settled = cents.slice(Math.min(3, cents.length - 1));
  return {
    midi: note.midi,
    startedAt: note.startedAt,
    durationMs: (note.endedAt ?? note.frames.at(-1)?.at ?? note.startedAt) - note.startedAt,
    meanCents: cents.length ? cents.reduce((sum, c) => sum + c, 0) / cents.length : 0,
    driftCents: settled.length > 1 ? settled[settled.length - 1] - settled[0] : 0,
    minCents: cents.length ? Math.min(...cents) : 0,
    maxCents: cents.length ? Math.max(...cents) : 0,
  };
}
