import { analyser, getContext, getMaster } from "./engine";

/**
 * Pitched-note helpers on top of the shared engine: name → frequency (equal
 * temperament, A4 = 440), and a one-shot note/chord player with an ADSR
 * envelope. Everything routes through the master bus *and* the shared analyser
 * so a spectrogram can see it.
 */

const CHROMA: Record<string, number> = {
  C: 0, "C#": 1, DB: 1, D: 2, "D#": 3, EB: 3, E: 4, FB: 4, F: 5,
  "F#": 6, GB: 6, G: 7, "G#": 8, AB: 8, A: 9, "A#": 10, BB: 10, B: 11, CB: 11,
};

/** "C4", "C#4", "Db3", "A4" → Hz. Returns 0 for an unparseable name. */
export function noteToFreq(note: string): number {
  const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(note.trim());
  if (!m) return 0;
  const key = (m[1].toUpperCase() + (m[2] === "b" ? "B" : m[2])).toUpperCase();
  const semis = CHROMA[key];
  if (semis === undefined) return 0;
  const octave = parseInt(m[3], 10);
  const midi = (octave + 1) * 12 + semis;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export type Adsr = { attack: number; decay: number; sustain: number; release: number };
export const DEFAULT_ADSR: Adsr = { attack: 0.01, decay: 0.12, sustain: 0.6, release: 0.25 };

export type NoteOpts = {
  type?: OscillatorType;
  gain?: number;
  /** Seconds the "key" is held before the release phase. */
  hold?: number;
  adsr?: Partial<Adsr>;
};

/** Play one frequency with an ADSR envelope. Returns a function to release early. */
export function playFreq(freq: number, opts: NoteOpts = {}): () => void {
  const ctx = getContext();
  const { type = "triangle", gain = 0.3, hold = 0.4 } = opts;
  const a = { ...DEFAULT_ADSR, ...opts.adsr };

  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;

  const t0 = ctx.currentTime;
  const peak = Math.max(0.0001, gain);
  const sus = Math.max(0.0001, peak * a.sustain);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + Math.max(0.001, a.attack));
  g.gain.exponentialRampToValueAtTime(sus, t0 + a.attack + Math.max(0.001, a.decay));

  osc.connect(g);
  g.connect(getMaster());
  g.connect(analyser());
  osc.start();

  let releaseAt = t0 + a.attack + a.decay + Math.max(0, hold);
  const release = (when?: number) => {
    const r = when ?? ctx.currentTime;
    g.gain.cancelScheduledValues(r);
    g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), r);
    g.gain.exponentialRampToValueAtTime(0.0001, r + Math.max(0.005, a.release));
    osc.stop(r + a.release + 0.05);
  };
  const timer = window.setTimeout(() => release(), (releaseAt - t0) * 1000);

  osc.onended = () => {
    osc.disconnect();
    g.disconnect();
  };
  return () => {
    window.clearTimeout(timer);
    release();
  };
}

export function playNote(note: string, opts?: NoteOpts): () => void {
  return playFreq(noteToFreq(note), opts);
}

/** Play several notes at once (a chord). Returns one release function for all. */
export function playChord(notes: string[], opts?: NoteOpts): () => void {
  const releases = notes.map((n) => playFreq(noteToFreq(n), { gain: 0.2, ...opts }));
  return () => releases.forEach((r) => r());
}
