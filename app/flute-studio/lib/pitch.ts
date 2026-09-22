/**
 * Monophonic pitch detection.
 *
 * Lifted out of PracticeToolDock, where it sat inline and could only ever
 * serve the tuner. Everything that listens — the tuner, the long-tone
 * trace, score following — needs the same estimate, and none of it should
 * have to import a UI component to get it.
 *
 * Pure functions only: no React, no audio graph, no DOM. That is what
 * makes it testable against a synthesised buffer, which the version
 * embedded in the dock never was.
 */

/**
 * A flute clears this comfortably at ordinary device distance; room noise
 * usually does not. Exported because the segmenter needs the same
 * threshold to tell "still holding, quietly" from "stopped playing".
 */
export const SILENCE_RMS = 0.014;

/** The flute's practical range, with headroom at both ends. */
export const MIN_HZ = 170;
export const MAX_HZ = 2500;

/** How certain the estimator is, below which a frame is not trusted. */
const MIN_CLARITY = 0.78;
/** Below this the difference function is considered to have found a dip. */
const DIP_THRESHOLD = 0.15;

export type PitchFrame = {
  hz: number;
  /** Signal level for this buffer — drives onset detection and the gate. */
  rms: number;
  /** 0–1. High means a clean periodic signal rather than a lucky guess. */
  clarity: number;
};

/**
 * One estimate from one buffer, or null when there is nothing to hear.
 *
 * A cumulative-mean-normalised difference function (the YIN family): find
 * the lag at which the signal best matches a delayed copy of itself, then
 * interpolate around it for sub-sample resolution.
 */
export function detectPitch(buffer: Float32Array, sampleRate: number, minimumRms = SILENCE_RMS): PitchFrame | null {
  let sumSquares = 0;
  for (let i = 0; i < buffer.length; i += 1) sumSquares += buffer[i] * buffer[i];
  const rms = Math.sqrt(sumSquares / buffer.length);
  if (rms < minimumRms) return null;

  const analysisSize = Math.floor(buffer.length / 2);
  const minimumLag = Math.floor(sampleRate / MAX_HZ);
  const maximumLag = Math.min(Math.floor(sampleRate / MIN_HZ), analysisSize - 2);
  if (maximumLag <= minimumLag) return null;

  const difference = new Float32Array(maximumLag + 1);
  for (let lag = 1; lag <= maximumLag; lag += 1) {
    let total = 0;
    for (let i = 0; i < analysisSize; i += 1) {
      const delta = buffer[i] - buffer[i + lag];
      total += delta * delta;
    }
    difference[lag] = total;
  }

  // Walk up the lags until the normalised difference dips below the
  // threshold, then follow the dip to its floor — taking the first lag
  // under the threshold rather than its local minimum lands an octave out
  // often enough to matter.
  let runningTotal = 0;
  const normalized = new Float32Array(maximumLag + 1);
  for (let lag = 1; lag <= maximumLag; lag++) {
    runningTotal += difference[lag];
    normalized[lag] = runningTotal > 0 ? difference[lag] * lag / runningTotal : 1;
  }
  let selectedLag = -1;
  let selectedScore = 1;
  for (let lag = minimumLag; lag < maximumLag; lag++) {
    if (normalized[lag] >= DIP_THRESHOLD) continue;
    while (lag + 1 < maximumLag && normalized[lag + 1] < normalized[lag]) lag++;
    selectedLag = lag;
    selectedScore = normalized[lag];
    break;
  }

  const clarity = 1 - selectedScore;
  if (selectedLag < 0 || clarity < MIN_CLARITY) return null;

  // Parabolic interpolation across the three lags around the minimum, so
  // the estimate is not quantised to whole samples.
  const previous = difference[selectedLag - 1] || difference[selectedLag];
  const current = difference[selectedLag];
  const next = difference[selectedLag + 1] || difference[selectedLag];
  const denominator = previous - 2 * current + next;
  const adjustment = denominator === 0 ? 0 : (0.5 * (previous - next)) / denominator;
  const hz = sampleRate / (selectedLag + Math.max(-0.5, Math.min(0.5, adjustment)));

  return hz >= MIN_HZ && hz <= MAX_HZ ? { hz, rms, clarity } : null;
}

/** Nearest equal-tempered MIDI number for a frequency, at A440. */
export const midiFromHz = (hz: number) => Math.round(69 + 12 * Math.log2(hz / 440));

/** Exact frequency of a MIDI number, at A440. */
export const hzFromMidi = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** How far a frequency sits from a MIDI number, in cents (±50 within a semitone). */
export const centsFromMidi = (hz: number, midi: number) => 1200 * Math.log2(hz / hzFromMidi(midi));

/**
 * Running median of the last few estimates.
 *
 * A median rather than a mean because pitch estimators fail by producing
 * an occasional wild outlier — usually an octave — and a mean drags the
 * reading toward it while a median ignores it entirely.
 */
export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
