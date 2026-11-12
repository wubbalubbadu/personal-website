/**
 * The articulation engine: a recording in, notes and phrases out, with every measurement named.
 *
 * Deliberately separate from the tuner's pitch code (lib/pitch.ts, lib/noteSegmenter.ts). The tuner samples every
 * 42 ms and only needs to know which note you are holding; this engine needs to see the inside of a note: how fast it
 * starts, how long it really sounds, how it ends, how its tone changes. So it works on a whole take at once and much
 * finer:
 *
 * - a loudness envelope every ~3 ms (an attack takes 10 to 60 ms, so 42 ms frames cannot see one),
 * - YIN pitch every ~6 ms, with its aperiodicity (how far from a clean repeating wave the sound is),
 * - a spectrum every ~6 ms for tone colour: brightness (spectral centroid relative to the pitch), breathiness (energy
 *   that is not on a harmonic), flatness, and spectral flux (how much the spectrum just changed, which spikes at
 *   tongued attacks the loudness line can miss).
 *
 * From those: sound regions (above the noise gate), note starts (a tongue dip, a pitch change, or sound after silence),
 * per-note descriptors, and phrases (groups of notes between breaths) with their loudness shape.
 *
 * No imports and no DOM, so it runs in the browser and in `node --test` unchanged. Every threshold is an exported
 * constant so the page can show how it decides, and so they can be tuned against real recordings.
 */

// ---------------------------------------------------------------------------------------------------------------
// Settings. Each one is shown on the page ("How it reads your playing"), so keep the comments honest.
// ---------------------------------------------------------------------------------------------------------------

/** Loudness envelope step. About 3 ms: fine enough to time an attack. */
export const ENVELOPE_HOP_MS = 2.9;
/** Pitch and tone are measured every this many envelope steps (about 6 ms). */
export const ANALYSIS_EVERY = 2;
/** Lowest pitch looked for: below the alto flute's low G, so every flute fits. */
export const MIN_HZ = 180;
/** Highest pitch looked for: above the piccolo's top C is not needed for the C flute; 2600 Hz clears high D. */
export const MAX_HZ = 2600;
/** YIN's "absolute threshold": the first lag whose normalised difference dips under this is the period. */
export const YIN_THRESHOLD = 0.12;
/** Above this aperiodicity the frame is noise (breath, key click) rather than a pitched tone. */
export const PERIODIC_MAX = 0.3;
/** The gate sits this far above the quietest part of the take... */
export const GATE_ABOVE_FLOOR_DB = 12;
/** ...but never more than this far below the loudest part. */
export const GATE_BELOW_TOP_DB = 42;
/** Silences shorter than this inside a sound are ignored (a flicker, not a gap). */
export const HOLE_MS = 12;
/** Sounds shorter than this are ignored (a click, not a note). */
export const MIN_SOUND_MS = 30;
/** A tongue dip: the loudness falls at least this much... */
export const DIP_FALL_DB = 4;
/** ...and rises again at least this much within DIP_RISE_WITHIN_MS. */
export const DIP_RISE_DB = 6;
/** A smaller rise still counts when the spectrum jumps at the same moment (spectral flux this many times its median). */
export const DIP_RISE_WITH_FLUX_DB = 3;
export const FLUX_SPIKE = 3;
/** ...and at least this share of new spectrum (vibrato stays near 0.2 at most; a re-attack after a tongue stop goes well past). */
export const FLUX_SPIKE_MIN = 0.35;
export const DIP_RISE_WITHIN_MS = 45;
/** A dip this deep (both ways) is a tongue even without other evidence; vibrato rarely swings this far. */
export const TONGUE_DEEP_DB = 12;
/** A slur: a new pitch held steadily for at least this long. */
export const SLUR_STEADY_MS = 24;
/** ...and at least this far (in semitones) from the pitch the previous note settled on. */
export const SLUR_MIN_STEP = 0.75;
/** Two note starts closer than this are the same start. */
export const MIN_NOTE_MS = 45;
/** A silence at least this long is a breath, and starts a new phrase. */
export const BREATH_MS = 350;
/** The attack is timed from 10% to 90% of the way from where the note started to its peak. */
export const ATTACK_FROM = 0.1;
export const ATTACK_TO = 0.9;
/** A note "sounds" while it is within 12 dB of its peak (a quarter of the peak amplitude). */
export const SOUNDING_FRACTION = 0.25;
/** The release starts when the note falls below 70% of its sustained level. */
export const RELEASE_FROM = 0.7;

/** How much of the gap to the next note a note fills: the cut-offs between the length words. */
export const LENGTH_CUTOFFS = {full: 0.88, detached: 0.62, staccato: 0.38} as const;
/** A slurred note only gets an attack time if it grows at least this much (×1.4 is about 3 dB) after the change. */
export const SLUR_ATTACK_RISE = 1.4;
/** Attack time cut-offs in ms. */
export const ATTACK_CUTOFFS = {crisp: 18, clean: 45, gentle: 110} as const;
/** Release time cut-offs in ms. */
export const RELEASE_CUTOFFS = {stopped: 30, natural: 90} as const;

// ---------------------------------------------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------------------------------------------

/** One pitch and tone measurement, every ANALYSIS_EVERY envelope steps. */
export type ToneFrame = {
  /** Centre of the frame, ms from the start of the take. */
  at: number;
  /** Pitch in Hz, or null when the frame is not a clean tone. */
  hz: number | null;
  /** Fractional MIDI number of `hz` at the given A, or null. */
  midi: number | null;
  /** YIN's normalised difference at the chosen lag: 0 is a perfect repeating wave, 1 is noise. */
  aperiodicity: number;
  /** Spectral centroid in Hz: where the "centre of mass" of the sound's energy sits. */
  centroid: number;
  /** Spectral flatness 0 to 1: near 0 for a few strong partials, near 1 for hiss. */
  flatness: number;
  /** Spectral flux: the share of the spectrum that is new since the previous frame, 0 to 1. Spikes at attacks. */
  flux: number;
  /** Fraction of energy (below 8 kHz) not on a harmonic of the pitch: breath noise. Null without a pitch. */
  noise: number | null;
};

export type StartKind = "afterSilence" | "tongued" | "slurred";
export type EndKind = "intoSilence" | "intoTongue" | "joined";
export type LengthWord = "full" | "detached" | "staccato" | "staccatissimo" | "slurred";
export type AttackWord = "none" | "crisp" | "clean" | "gentle" | "swelled";
export type ReleaseWord = "stopped" | "natural" | "tapered" | "joined";

export type Note = {
  index: number;
  phrase: number;
  /** The note's start, ms. */
  startMs: number;
  /** Where the next note starts, or the end of the sound, ms. */
  endMs: number;
  startKind: StartKind;
  endKind: EndKind;
  /** Nearest MIDI number, or null when no steady pitch was found (a very short or noisy note). */
  midi: number | null;
  /** How far from that MIDI number, in cents. */
  cents: number | null;
  /** Peak loudness, dB below the loudest moment of the take (0 = the loudest). */
  peakDb: number;
  /** When the peak came, ms after the start. */
  peakAfterMs: number;
  /** 10% to 90% rise time, ms. */
  attackMs: number;
  /** Where that rise starts and ends, and where the release starts and ends, ms from the start of the take. */
  marks: {attackFrom: number; attackTo: number; releaseFrom: number; releaseTo: number; soundedTo: number};
  /** The held level as a fraction of the peak (1 = the note never falls from its peak). */
  sustainLevel: number;
  /** From the start until the sound fell 12 dB below its peak, ms. */
  soundedMs: number;
  /** Time to the next note's start, ms (null for the last note of a phrase). */
  gapToNextMs: number | null;
  /** soundedMs / gapToNextMs, 0 to 1 (null without a next note). */
  fill: number | null;
  /** From falling below 70% of the sustained level until the sound ended, ms. */
  releaseMs: number;
  /** Loudness change across the held part, dB per second (positive grows, negative dies away). */
  sustainSlopeDbPerS: number;
  /** Time until the pitch settled on the note, ms (null without a pitch). */
  settleMs: number | null;
  /** Spread of the pitch across the held part, cents (vibrato and wobble). */
  wobbleCents: number | null;
  /** Spectral centroid divided by the pitch: how many partials up the sound's energy centres. Higher is brighter. */
  brightness: number | null;
  /** Breath noise in the held part, 0 to 1. */
  breathiness: number | null;
  /** Breath noise in the first 25 ms, 0 to 1: the "chiff" of the attack. */
  attackNoise: number | null;
  length: LengthWord;
  attack: AttackWord;
  release: ReleaseWord;
};

export type PhraseShape = "arch" | "grows" | "fades" | "dips" | "level";

export type Phrase = {
  index: number;
  startMs: number;
  endMs: number;
  /** Indices into `notes`. */
  notes: number[];
  shape: PhraseShape;
  /** Where the loudest moment falls, 0 (start) to 1 (end). */
  peakAt: number;
  /** Loudest minus quietest point of the phrase's loudness line, dB. */
  rangeDb: number;
  /** Lowest and highest MIDI numbers played. */
  lowMidi: number | null;
  highMidi: number | null;
  /** Where the highest note falls, 0 to 1. */
  highAt: number | null;
  /** The most common length word. */
  mostly: LengthWord | null;
  /** The phrase's loudness line: each note's peak (and points along long notes), dB below the take's loudest. */
  contour: {at: number; db: number}[];
};

export type Analysis = {
  sampleRate: number;
  durationMs: number;
  a4: number;
  envelopeHopMs: number;
  /** Loudness every envelope step, dB (absolute, full scale = 0). */
  envelopeDb: Float32Array;
  /** The same, as amplitude (RMS). */
  envelopeAmp: Float32Array;
  frames: ToneFrame[];
  floorDb: number;
  topDb: number;
  gateDb: number;
  notes: Note[];
  phrases: Phrase[];
};

// ---------------------------------------------------------------------------------------------------------------
// Small maths
// ---------------------------------------------------------------------------------------------------------------

const toDb = (amp: number) => 20 * Math.log10(Math.max(amp, 1e-6));

function percentile(values: ArrayLike<number>, p: number): number {
  const sorted = Array.from(values).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))))];
}

function medianOf(values: number[]): number | null {
  if (!values.length) return null;
  return percentile(values, 0.5);
}

/** In-place iterative radix-2 FFT. `re` and `im` have the same power-of-two length. `inverse` skips the 1/N. */
function fft(re: Float64Array, im: Float64Array, inverse = false) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const angle = ((inverse ? 2 : -2) * Math.PI) / size;
    const wr = Math.cos(angle), wi = Math.sin(angle);
    const half = size >> 1;
    for (let start = 0; start < n; start += size) {
      let cr = 1, ci = 0;
      for (let k = 0; k < half; k++) {
        const a = start + k, b = a + half;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

const nextPow2 = (n: number) => 2 ** Math.ceil(Math.log2(Math.max(2, n)));

// ---------------------------------------------------------------------------------------------------------------
// Stage 1: the loudness envelope
// ---------------------------------------------------------------------------------------------------------------

export function loudnessEnvelope(samples: Float32Array, sampleRate: number) {
  const hop = Math.max(1, Math.round((sampleRate * ENVELOPE_HOP_MS) / 1000));
  // Window = three hops (~8.7 ms), centred on the step: long enough to cover several cycles of most flute notes, so a
  // steady tone reads as steady instead of rippling with the wave, and still short beside a 10 to 60 ms attack.
  const half = Math.round(hop * 1.5);
  const count = Math.max(1, Math.floor(samples.length / hop));
  const amp = new Float32Array(count), db = new Float32Array(count);
  // Running sum of squares, so each window costs two lookups.
  const squares = new Float64Array(samples.length + 1);
  for (let i = 0; i < samples.length; i++) squares[i + 1] = squares[i] + samples[i] * samples[i];
  for (let k = 0; k < count; k++) {
    const centre = k * hop + (hop >> 1);
    const from = Math.max(0, centre - half), to = Math.min(samples.length, centre + half);
    const rms = to > from ? Math.sqrt((squares[to] - squares[from]) / (to - from)) : 0;
    amp[k] = rms;
    db[k] = toDb(rms);
  }
  return {hop, hopMs: (hop * 1000) / sampleRate, amp, db};
}

// ---------------------------------------------------------------------------------------------------------------
// Stage 2: pitch (YIN) and tone colour (spectrum), every ~6 ms
// ---------------------------------------------------------------------------------------------------------------

/**
 * Measures pitch and tone around sample `centre`. Shares the work buffers between calls (the caller owns them).
 *
 * YIN, step by step (de Cheveigné and Kawahara 2002):
 * 1. Difference function d(τ): how different the signal is from itself shifted by τ samples. At the true period the
 *    wave lines up with its next cycle and d dips. Computed with an FFT (d = E₀ + E_τ − 2·correlation).
 * 2. Cumulative mean normalisation d′(τ) = d(τ)·τ / Σd: removes the trivial dip at τ = 0 and makes the threshold
 *    meaningful (d′ near 0 is a clean repeat; near 1 is no repeat).
 * 3. Absolute threshold: take the first τ whose d′ dips under YIN_THRESHOLD, then slide to the bottom of that dip.
 *    The first dip, not the deepest one, avoids landing an octave low.
 * 4. Parabolic interpolation around the dip for a sub-sample period. Pitch = sampleRate / period.
 */
type Work = {
  window: number; lagMax: number; lagMin: number; n: number;
  zr: Float64Array; zi: Float64Array; cr: Float64Array; ci: Float64Array;
  sr: Float64Array; si: Float64Array; hann: Float64Array; prevMag: Float64Array; cmnd: Float64Array;
  energy: Float64Array;
};

function makeWork(sampleRate: number): Work {
  // ~23 ms, rounded to the nearest power of two (1024 at 44.1 and 48 kHz): holds about four cycles of the lowest note.
  const window = 2 ** Math.round(Math.log2((sampleRate * 23) / 1000));
  const lagMax = Math.ceil(sampleRate / MIN_HZ), lagMin = Math.floor(sampleRate / MAX_HZ);
  const n = nextPow2(window + lagMax);
  const hann = new Float64Array(window);
  for (let i = 0; i < window; i++) hann[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (window - 1));
  return {
    window, lagMax, lagMin, n,
    zr: new Float64Array(n), zi: new Float64Array(n), cr: new Float64Array(n), ci: new Float64Array(n),
    sr: new Float64Array(window), si: new Float64Array(window), hann,
    prevMag: new Float64Array(window / 2), cmnd: new Float64Array(lagMax + 2), energy: new Float64Array(window + lagMax + 1),
  };
}

function measureFrame(samples: Float32Array, centre: number, sampleRate: number, a4: number, w: Work, at: number): ToneFrame {
  const {window, lagMax, lagMin, n, zr, zi, cr, ci, sr, si, hann, prevMag, cmnd, energy} = w;
  const start = Math.round(centre - window / 2);
  const read = (i: number) => (i >= 0 && i < samples.length ? samples[i] : 0);

  // --- YIN via one complex FFT holding both real inputs: a = first `window` samples, b = window + lagMax samples.
  zr.fill(0); zi.fill(0);
  for (let i = 0; i < window + lagMax; i++) {
    const x = read(start + i);
    if (i < window) zr[i] = x;
    zi[i] = x;
    energy[i + 1] = energy[i] + x * x;
  }
  fft(zr, zi);
  // Unpack A (from re) and B (from im), then C = conj(A)·B, the spectrum of the cross-correlation.
  for (let k = 0; k < n; k++) {
    const j = (n - k) % n;
    const ar = (zr[k] + zr[j]) / 2, ai = (zi[k] - zi[j]) / 2;
    const br = (zi[k] + zi[j]) / 2, bi = -(zr[k] - zr[j]) / 2;
    cr[k] = ar * br + ai * bi;
    ci[k] = ar * bi - ai * br;
  }
  fft(cr, ci, true);
  const e0 = energy[window];
  let running = 0;
  cmnd[0] = 1;
  for (let lag = 1; lag <= lagMax; lag++) {
    const d = Math.max(0, e0 + (energy[lag + window] - energy[lag]) - (2 * cr[lag]) / n);
    running += d;
    cmnd[lag] = running > 0 ? (d * lag) / running : 1;
  }
  let chosen = -1;
  for (let lag = Math.max(2, lagMin); lag < lagMax; lag++) {
    if (cmnd[lag] < YIN_THRESHOLD) {
      while (lag + 1 < lagMax && cmnd[lag + 1] < cmnd[lag]) lag++;
      chosen = lag;
      break;
    }
  }
  if (chosen < 0) {
    // No dip under the threshold: take the deepest, and let the aperiodicity say how much to trust it.
    let best = Math.max(2, lagMin);
    for (let lag = best; lag < lagMax; lag++) if (cmnd[lag] < cmnd[best]) best = lag;
    chosen = best;
  }
  const aperiodicity = cmnd[chosen];
  const p = cmnd[chosen - 1], c = cmnd[chosen], q = cmnd[chosen + 1] ?? c;
  const denominator = p - 2 * c + q;
  const shift = denominator ? Math.max(-0.5, Math.min(0.5, (0.5 * (p - q)) / denominator)) : 0;
  const periodic = aperiodicity <= PERIODIC_MAX && e0 > 1e-9;
  const hz = periodic ? sampleRate / (chosen + shift) : null;
  const pitched = hz !== null && hz >= MIN_HZ && hz <= MAX_HZ ? hz : null;

  // --- Spectrum of the Hann-windowed frame, for tone colour.
  for (let i = 0; i < window; i++) { sr[i] = read(start + i) * hann[i]; si[i] = 0; }
  fft(sr, si);
  const binHz = sampleRate / window;
  const topBin = Math.min(window / 2, Math.floor(8000 / binHz));
  let power = 0, weighted = 0, logSum = 0, rising = 0, level = 0, counted = 0;
  for (let k = 1; k < window / 2; k++) {
    const mag = Math.hypot(sr[k], si[k]);
    // Spectral flux as a share: how much of this frame's spectrum is new since the last frame. Near 0 for a held
    // tone (even with vibrato), large when sound returns after a tongue stop. A share rather than a sum, so loud
    // and quiet playing compare.
    rising += Math.max(0, mag - prevMag[k]);
    level += (mag + prevMag[k]) / 2;
    prevMag[k] = mag;
    if (k <= topBin) {
      const pw = mag * mag;
      power += pw;
      weighted += pw * k * binHz;
      logSum += Math.log(pw + 1e-12);
      counted++;
    }
  }
  const flux = level > 1e-9 ? rising / level : 0;
  const centroid = power > 0 ? weighted / power : 0;
  const flatness = power > 0 && counted ? Math.exp(logSum / counted) / (power / counted) : 1;

  let noise: number | null = null;
  if (pitched && power > 0) {
    let harmonic = 0;
    for (let h = 1; h * pitched < 8000; h++) {
      const centreBin = (h * pitched) / binHz;
      const width = Math.max(1.5, centreBin * 0.03);
      for (let k = Math.max(1, Math.ceil(centreBin - width)); k <= Math.min(topBin, Math.floor(centreBin + width)); k++) {
        harmonic += sr[k] * sr[k] + si[k] * si[k];
      }
    }
    noise = Math.max(0, Math.min(1, 1 - harmonic / power));
  }

  return {
    at,
    hz: pitched,
    midi: pitched ? 69 + 12 * Math.log2(pitched / a4) : null,
    aperiodicity,
    centroid,
    flatness,
    flux,
    noise,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Stage 3: sound regions, note starts, notes
// ---------------------------------------------------------------------------------------------------------------

type Region = {from: number; to: number}; // envelope indices, `to` exclusive

function soundRegions(db: Float32Array, gateDb: number, hopMs: number): Region[] {
  const on = Array.from(db, v => v > gateDb);
  const hole = Math.round(HOLE_MS / hopMs);
  // Close short holes.
  for (let i = 0; i < on.length; ) {
    if (on[i]) { i++; continue; }
    let j = i;
    while (j < on.length && !on[j]) j++;
    if (i > 0 && j < on.length && j - i <= hole) for (let k = i; k < j; k++) on[k] = true;
    i = j;
  }
  const regions: Region[] = [];
  for (let i = 0; i < on.length; ) {
    if (!on[i]) { i++; continue; }
    let j = i;
    while (j < on.length && on[j]) j++;
    if ((j - i) * hopMs >= MIN_SOUND_MS) regions.push({from: i, to: j});
    i = j;
  }
  return regions;
}

function smooth(values: Float32Array, radius: number): Float32Array {
  const out = new Float32Array(values.length);
  for (let i = 0; i < values.length; i++) {
    let sum = 0, count = 0;
    for (let k = Math.max(0, i - radius); k <= Math.min(values.length - 1, i + radius); k++) { sum += values[k]; count++; }
    out[i] = sum / count;
  }
  return out;
}

type Start = {at: number; kind: StartKind}; // envelope index

function findStarts(region: Region, db: Float32Array, smoothDb: Float32Array, frames: ToneFrame[], hopMs: number, fluxMedian: number): Start[] {
  const starts: Start[] = [{at: region.from, kind: "afterSilence"}];
  const riseSteps = Math.round(DIP_RISE_WITHIN_MS / hopMs);
  const fallSteps = Math.round(60 / hopMs);
  const minSteps = Math.round(MIN_NOTE_MS / hopMs);

  // Tongue dips: a local minimum of the smoothed loudness with a fall before it and a rise after it.
  for (let i = region.from + 2; i < region.to - 2; i++) {
    if (!(smoothDb[i] <= smoothDb[i - 1] && smoothDb[i] < smoothDb[i + 1])) continue;
    let before = -Infinity, after = -Infinity;
    for (let k = Math.max(region.from, i - fallSteps); k < i; k++) before = Math.max(before, smoothDb[k]);
    for (let k = i + 1; k <= Math.min(region.to - 1, i + riseSteps); k++) after = Math.max(after, smoothDb[k]);
    const fall = before - smoothDb[i], rise = after - smoothDb[i];
    if (fall < DIP_FALL_DB || rise < DIP_RISE_WITH_FLUX_DB) continue;
    // Vibrato also swells and dips the loudness, several times a second. A tongue is different: it interrupts the
    // tone. So a dip only counts with evidence of that: it is deep, the pitch drops out at the dip, or the spectrum
    // jumps as the sound comes back.
    const atMs = i * hopMs;
    const spike = frames.some(f => f.at >= atMs - 10 && f.at <= atMs + 30 && f.flux > Math.max(fluxMedian * FLUX_SPIKE, FLUX_SPIKE_MIN));
    const dropout = frames.some(f => Math.abs(f.at - atMs) <= 12 && f.hz === null);
    const deep = fall >= TONGUE_DEEP_DB && rise >= TONGUE_DEEP_DB;
    const tongued = rise >= DIP_RISE_DB ? deep || dropout || spike : spike && (dropout || deep);
    if (!tongued) continue;
    const previous = starts[starts.length - 1];
    if (i - previous.at < minSteps) {
      // Too close: keep the deeper of the two dips (never replace the start of the sound).
      if (previous.kind === "tongued" && db[i] < db[previous.at]) previous.at = i;
      continue;
    }
    starts.push({at: i, kind: "tongued"});
  }

  // Slurs: the pitch moves to a new note and holds it steadily, with no dip nearby. Measured from the pitch the
  // note settled on (which follows slow drift), and only a move of SLUR_MIN_STEP or more counts: a note played far
  // out of tune with vibrato keeps crossing the line to the next semitone without ever being a new note.
  const fromMs = region.from * hopMs, toMs = region.to * hopMs;
  const inside = frames.filter(f => f.at >= fromMs && f.at < toMs);
  const steady = Math.max(3, Math.round(SLUR_STEADY_MS / (hopMs * ANALYSIS_EVERY)));
  const mean = (list: number[]) => list.reduce((x, y) => x + y, 0) / list.length;
  let settled: number | null = null, run: number[] = [], runStart = 0;
  for (const frame of inside) {
    if (frame.midi === null) { run = []; continue; }
    const pitch = frame.midi;
    if (settled !== null && Math.abs(pitch - settled) < SLUR_MIN_STEP) {
      run = [];
      settled += (pitch - settled) * 0.05;
      continue;
    }
    if (run.length && Math.abs(pitch - run[0]) >= 0.5) run = [];
    if (!run.length) runStart = frame.at;
    run.push(pitch);
    if (run.length < steady) continue;
    if (settled !== null) {
      const at = Math.round(runStart / hopMs);
      const near = starts.some(start => Math.abs(start.at - at) * hopMs < 40);
      if (!near && at > region.from && at < region.to) starts.push({at, kind: "slurred"});
    }
    settled = mean(run);
    run = [];
  }

  starts.sort((a, b) => a.at - b.at);
  const merged: Start[] = [];
  for (const start of starts) {
    const last = merged[merged.length - 1];
    if (last && start.at - last.at < minSteps) continue;
    merged.push(start);
  }
  return merged;
}

function describe(
  index: number, from: number, to: number, startKind: StartKind, endKind: EndKind, endsSound: boolean,
  amp: Float32Array, hopMs: number, frames: ToneFrame[], topDb: number,
): Omit<Note, "phrase" | "gapToNextMs" | "fill" | "length"> {
  // The peak is looked for away from the boundary with the next note: at a slur or a tongued change the next note's
  // sound bleeds into the last few milliseconds, and a louder next note would otherwise become this note's peak.
  const guard = endsSound ? 0 : Math.min(Math.round(20 / hopMs), Math.floor((to - from) / 5));
  // The same at the front of a slurred note: the previous note's sound is still ringing for a few milliseconds.
  const frontGuard = startKind === "slurred" ? Math.min(Math.round(15 / hopMs), Math.floor((to - from) / 5)) : 0;
  let peak = 0, peakIndex = from + frontGuard;
  for (let i = from + frontGuard; i < to - guard; i++) if (amp[i] > peak) { peak = amp[i]; peakIndex = i; }
  // Where the rise starts: silence, the bottom of a tongue dip, or (for a slur) the quietest moment of the change.
  let base = 0;
  if (startKind === "tongued") base = amp[from];
  if (startKind === "slurred") {
    base = Infinity;
    for (let i = from; i <= Math.min(peakIndex, from + Math.round(40 / hopMs)); i++) base = Math.min(base, amp[i]);
  }
  // A slur into a note no louder than the change itself has no attack to time: the air never stopped.
  const noAttack = startKind === "slurred" && peak < base * SLUR_ATTACK_RISE;
  const low = base + ATTACK_FROM * (peak - base), high = base + ATTACK_TO * (peak - base);
  let t10 = from, t90 = noAttack ? from : peakIndex;
  if (!noAttack) {
    for (let i = from; i <= peakIndex; i++) if (amp[i] >= low) { t10 = i; break; }
    for (let i = t10; i <= peakIndex; i++) if (amp[i] >= high) { t90 = i; break; }
  }
  const attackMs = (t90 - t10) * hopMs;

  // Sustained level: the median of the held part, after the peak, before the last fifth.
  const held: number[] = [];
  for (let i = peakIndex; i < to - Math.floor((to - peakIndex) / 5); i++) held.push(amp[i]);
  const sustain = held.length >= 4 ? (medianOf(held) as number) : peak;

  let soundEnd = from;
  for (let i = to - 1; i >= from; i--) if (amp[i] >= SOUNDING_FRACTION * peak) { soundEnd = i; break; }
  let releaseStart = peakIndex;
  for (let i = to - 1; i >= peakIndex; i--) if (amp[i] >= RELEASE_FROM * sustain) { releaseStart = i; break; }
  let releaseEnd = to;
  if (endsSound) for (let i = to - 1; i >= releaseStart; i--) if (amp[i] >= 0.1 * peak) { releaseEnd = i + 1; break; }
  const releaseMs = endKind === "joined" ? 0 : Math.max(0, (releaseEnd - releaseStart) * hopMs);
  const soundedMs = endKind === "joined" ? (to - from) * hopMs : Math.max(hopMs, (soundEnd + 1 - from) * hopMs);

  // Loudness slope across the held part, by least squares on dB.
  let slope = 0;
  const heldFrom = peakIndex, heldTo = Math.max(peakIndex + 1, releaseStart);
  if (heldTo - heldFrom >= 8) {
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    const count = heldTo - heldFrom;
    for (let i = heldFrom; i < heldTo; i++) {
      const x = (i - heldFrom) * hopMs / 1000, y = toDb(amp[i]);
      sx += x; sy += y; sxx += x * x; sxy += x * y;
    }
    const denominator = count * sxx - sx * sx;
    slope = denominator ? (count * sxy - sx * sy) / denominator : 0;
  }

  // Pitch and tone from the frames inside the note.
  const startMs = from * hopMs, endMs = to * hopMs;
  const inside = frames.filter(f => f.at >= startMs && f.at < endMs);
  const bodyFrom = startMs + Math.min(40, (endMs - startMs) / 3);
  const body = inside.filter(f => f.at >= bodyFrom && f.at <= releaseStart * hopMs + hopMs);
  const bodyPitched = (body.length ? body : inside).filter(f => f.midi !== null);
  const midiFloat = medianOf(bodyPitched.map(f => f.midi as number));
  const midi = midiFloat === null ? null : Math.round(midiFloat);
  let cents: number | null = null, wobble: number | null = null, settleMs: number | null = null;
  if (midi !== null) {
    const offsets = bodyPitched.map(f => ((f.midi as number) - midi) * 100);
    cents = Math.round(medianOf(offsets) as number);
    const mean = offsets.reduce((a, b) => a + b, 0) / offsets.length;
    wobble = Math.round(Math.sqrt(offsets.reduce((a, b) => a + (b - mean) ** 2, 0) / offsets.length));
    for (let i = 0; i + 2 < inside.length; i++) {
      const ok = [0, 1, 2].every(k => inside[i + k].midi !== null && Math.abs(((inside[i + k].midi as number) - midi) * 100) < 35);
      if (ok) { settleMs = Math.round(inside[i].at - startMs); break; }
    }
  }
  const tone = body.filter(f => f.hz !== null);
  const brightness = medianOf(tone.map(f => f.centroid / (f.hz as number)));
  const breathiness = medianOf(tone.map(f => f.noise as number));
  const opening = inside.filter(f => f.at < startMs + 25);
  const attackNoise = medianOf(opening.map(f => f.noise ?? Math.min(1, f.flatness * 4)));

  const attack: AttackWord = noAttack ? "none" : attackMs < ATTACK_CUTOFFS.crisp ? "crisp" : attackMs < ATTACK_CUTOFFS.clean ? "clean" : attackMs < ATTACK_CUTOFFS.gentle ? "gentle" : "swelled";
  const release: ReleaseWord = endKind === "joined" ? "joined" : releaseMs < RELEASE_CUTOFFS.stopped ? "stopped" : releaseMs < RELEASE_CUTOFFS.natural ? "natural" : "tapered";

  return {
    index, startMs, endMs, startKind, endKind, midi, cents,
    peakDb: Math.round((toDb(peak) - topDb) * 10) / 10,
    peakAfterMs: Math.round((peakIndex - from) * hopMs),
    attackMs: Math.round(attackMs),
    marks: {
      attackFrom: Math.round(t10 * hopMs), attackTo: Math.round(t90 * hopMs),
      releaseFrom: Math.round(releaseStart * hopMs), releaseTo: Math.round((endKind === "joined" ? to : releaseEnd) * hopMs),
      soundedTo: Math.round(startMs + soundedMs),
    },
    sustainLevel: peak > 0 ? Math.round((sustain / peak) * 100) / 100 : 1,
    soundedMs: Math.round(soundedMs),
    releaseMs: Math.round(releaseMs),
    sustainSlopeDbPerS: Math.round(slope * 10) / 10,
    settleMs,
    wobbleCents: wobble,
    brightness: brightness === null ? null : Math.round(brightness * 100) / 100,
    breathiness: breathiness === null ? null : Math.round(breathiness * 100) / 100,
    attackNoise: attackNoise === null ? null : Math.round(attackNoise * 100) / 100,
    attack, release,
  };
}

function lengthWord(note: Pick<Note, "endKind" | "fill" | "soundedMs">): LengthWord {
  if (note.endKind === "joined") return "slurred";
  if (note.fill === null) return note.soundedMs < 110 ? "staccatissimo" : note.soundedMs < 200 ? "staccato" : "full";
  if (note.fill >= LENGTH_CUTOFFS.full) return "full";
  if (note.fill >= LENGTH_CUTOFFS.detached) return "detached";
  if (note.fill >= LENGTH_CUTOFFS.staccato) return "staccato";
  return "staccatissimo";
}

// ---------------------------------------------------------------------------------------------------------------
// Stage 4: phrases
// ---------------------------------------------------------------------------------------------------------------

function describePhrase(index: number, members: Note[], db: Float32Array, hopMs: number, topDb: number): Phrase {
  const startMs = members[0].startMs, endMs = members[members.length - 1].endMs;
  // The phrase's loudness line goes through each note's peak, not through the raw envelope: the silences between
  // staccato notes are articulation, not a diminuendo. Long notes add points along their held part (smoothed over
  // ~150 ms) so a swell or fade inside one note still shows.
  const smoothed = smooth(db, Math.max(1, Math.round(75 / hopMs)));
  const contour: {at: number; db: number}[] = [];
  for (const note of members) {
    const {attackTo, releaseFrom} = note.marks;
    if (releaseFrom - attackTo >= 400) {
      for (let at = attackTo; at <= releaseFrom; at += 80) {
        contour.push({at, db: Math.round((smoothed[Math.min(smoothed.length - 1, Math.round(at / hopMs))] - topDb) * 10) / 10});
      }
    } else contour.push({at: note.startMs + note.peakAfterMs, db: note.peakDb});
  }
  contour.sort((p, q) => p.at - q.at);

  const span = Math.max(1, endMs - startMs);
  const mean = (list: number[]) => list.reduce((x, y) => x + y, 0) / list.length;
  const overall = mean(contour.map(p => p.db));
  const third = (part: number) => {
    const values = contour.filter(p => Math.min(2, Math.floor(((p.at - startMs) / span) * 3)) === part).map(p => p.db);
    return values.length ? mean(values) : overall;
  };
  const [a, b, c] = [third(0), third(1), third(2)];
  const shape: PhraseShape = contour.length < 2 ? "level" : b >= Math.max(a, c) + 2 ? "arch" : c >= a + 3 ? "grows" : a >= c + 3 ? "fades" : b <= Math.min(a, c) - 2 ? "dips" : "level";
  const loudest = contour.reduce((best, p) => (p.db > best.db ? p : best), contour[0]);
  const levels = contour.map(p => p.db);

  const pitched = members.filter(n => n.midi !== null);
  let lowMidi: number | null = null, highMidi: number | null = null, highAt: number | null = null;
  if (pitched.length) {
    lowMidi = Math.min(...pitched.map(n => n.midi as number));
    const high = pitched.reduce((best, n) => ((n.midi as number) > (best.midi as number) ? n : best));
    highMidi = high.midi;
    highAt = endMs > startMs ? Math.round(((high.startMs - startMs) / (endMs - startMs)) * 100) / 100 : 0;
  }
  const tally = new Map<LengthWord, number>();
  for (const note of members) tally.set(note.length, (tally.get(note.length) ?? 0) + 1);
  const mostly = [...tally.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] ?? null;

  return {
    index, startMs, endMs, notes: members.map(n => n.index), shape,
    peakAt: Math.round(((loudest.at - startMs) / span) * 100) / 100,
    rangeDb: Math.round((percentile(levels, 0.95) - percentile(levels, 0.05)) * 10) / 10,
    lowMidi, highMidi, highAt, mostly, contour,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// The whole take
// ---------------------------------------------------------------------------------------------------------------

export type Progress = {stage: "listening" | "notes"; fraction: number};

/**
 * Analyses a mono take. A generator so the page can run it a slice at a time and stay responsive (a minute of audio
 * is a few seconds of work); `analyzeTake` below runs it in one go.
 */
export function* analyzeSteps(samples: Float32Array, sampleRate: number, a4 = 440): Generator<Progress, Analysis, void> {
  const envelope = loudnessEnvelope(samples, sampleRate);
  const {hop, hopMs, amp, db} = envelope;
  const work = makeWork(sampleRate);
  const frames: ToneFrame[] = [];
  const step = hop * ANALYSIS_EVERY;
  const total = Math.max(1, Math.floor(samples.length / step));
  for (let k = 0; k < total; k++) {
    const centre = k * step + (hop >> 1);
    frames.push(measureFrame(samples, centre, sampleRate, a4, work, (centre * 1000) / sampleRate));
    if (k % 400 === 399) yield {stage: "listening", fraction: k / total};
  }
  yield {stage: "notes", fraction: 1};

  const floorDb = percentile(db, 0.1);
  const topDb = percentile(db, 0.998);
  const gateDb = Math.max(floorDb + GATE_ABOVE_FLOOR_DB, topDb - GATE_BELOW_TOP_DB);
  const smoothDb = smooth(db, 2);
  const regions = soundRegions(db, gateDb, hopMs);
  const sounding = frames.filter(f => db[Math.min(db.length - 1, Math.round(f.at / hopMs))] > gateDb).map(f => f.flux);
  const fluxMedian = Math.max(1e-6, percentile(sounding, 0.5));

  const notes: Note[] = [];
  const regionOf: number[] = [];
  regions.forEach((region, r) => {
    const starts = findStarts(region, db, smoothDb, frames, hopMs, fluxMedian);
    starts.forEach((start, s) => {
      const next = starts[s + 1];
      const to = next ? next.at : region.to;
      const endKind: EndKind = !next ? "intoSilence" : next.kind === "slurred" ? "joined" : "intoTongue";
      const described = describe(notes.length, start.at, to, start.kind, endKind, !next, amp, hopMs, frames, topDb);
      notes.push({...described, phrase: 0, gapToNextMs: null, fill: null, length: "full"});
      regionOf.push(r);
    });
  });

  // Phrases: a new one after every breath-length silence.
  let phrase = 0;
  for (let i = 0; i < notes.length; i++) {
    if (i > 0) {
      const silence = notes[i].startMs - notes[i - 1].endMs;
      if (regionOf[i] !== regionOf[i - 1] && silence >= BREATH_MS) phrase++;
    }
    notes[i].phrase = phrase;
  }
  for (let i = 0; i < notes.length; i++) {
    const next = notes[i + 1];
    if (next && next.phrase === notes[i].phrase) {
      const gap = Math.round(next.startMs - notes[i].startMs);
      notes[i].gapToNextMs = gap;
      notes[i].fill = Math.round(Math.min(1, notes[i].soundedMs / gap) * 100) / 100;
    }
    notes[i].length = lengthWord(notes[i]);
  }
  const phrases: Phrase[] = [];
  for (let p = 0; p <= phrase && notes.length; p++) {
    const members = notes.filter(n => n.phrase === p);
    if (members.length) phrases.push(describePhrase(p, members, db, hopMs, topDb));
  }

  return {
    sampleRate, durationMs: (samples.length * 1000) / sampleRate, a4, envelopeHopMs: hopMs,
    envelopeDb: db, envelopeAmp: amp, frames, floorDb, topDb, gateDb, notes, phrases,
  };
}

export function analyzeTake(samples: Float32Array, sampleRate: number, a4 = 440): Analysis {
  const steps = analyzeSteps(samples, sampleRate, a4);
  for (;;) {
    const next = steps.next();
    if (next.done) return next.value;
  }
}

/** Mixes any number of channels down to one. */
export function toMono(channels: Float32Array[]): Float32Array {
  if (channels.length === 1) return channels[0];
  const out = new Float32Array(channels[0].length);
  for (const channel of channels) for (let i = 0; i < out.length; i++) out[i] += channel[i] / channels.length;
  return out;
}

const NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
/** "A4", "E♭5". */
export const noteName = (midi: number) => `${NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;

/** A plain summary for saving or for the raindrops later: no typed arrays, numbers rounded. */
export function exportable(analysis: Analysis) {
  return {
    sampleRate: analysis.sampleRate,
    durationMs: Math.round(analysis.durationMs),
    a4: analysis.a4,
    notes: analysis.notes.map(n => ({...n, name: n.midi === null ? null : noteName(n.midi)})),
    phrases: analysis.phrases,
  };
}

/**
 * A spectrogram of part of the take, for drawing: rows are frequency bins from 0 to `maxHz`, columns are time steps
 * of `hopMs`, values are dB relative to the loudest cell (0 at the top, negative below). The overtones of a flute
 * note show as horizontal lines; breath and the tongue's "chiff" show as haze between and above them.
 */
export function spectrogram(samples: Float32Array, sampleRate: number, fromMs: number, toMs: number, maxHz = 6000) {
  const size = 2 ** Math.round(Math.log2((sampleRate * 46) / 1000)); // ~46 ms: fine frequency detail
  const hop = Math.max(1, Math.round((sampleRate * 4) / 1000)); // a column every ~4 ms
  const hann = new Float64Array(size);
  for (let i = 0; i < size; i++) hann[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1));
  const binHz = sampleRate / size;
  const rows = Math.min(size / 2, Math.ceil(maxHz / binHz));
  const first = Math.round((fromMs / 1000) * sampleRate), last = Math.round((toMs / 1000) * sampleRate);
  const columns = Math.max(1, Math.floor((last - first) / hop));
  const data = new Float32Array(columns * rows);
  const re = new Float64Array(size), im = new Float64Array(size);
  let top = -Infinity;
  for (let c = 0; c < columns; c++) {
    const start = first + c * hop - size / 2;
    for (let i = 0; i < size; i++) {
      const j = start + i;
      re[i] = (j >= 0 && j < samples.length ? samples[j] : 0) * hann[i];
      im[i] = 0;
    }
    fft(re, im);
    for (let r = 0; r < rows; r++) {
      const db = 10 * Math.log10(re[r] * re[r] + im[r] * im[r] + 1e-14);
      data[c * rows + r] = db;
      if (db > top) top = db;
    }
  }
  for (let k = 0; k < data.length; k++) data[k] -= top;
  return {columns, rows, data, hopMs: (hop * 1000) / sampleRate, binHz, fromMs};
}

// ---------------------------------------------------------------------------------------------------------------
// Building blocks for listening live (app/lab/raindrops/live.ts runs these as the sound arrives, so live and
// recorded analysis measure notes the same way).
// ---------------------------------------------------------------------------------------------------------------
export {makeWork, measureFrame, describe as describeNote, describePhrase, lengthWord, smooth, percentile};
export type {Work};
