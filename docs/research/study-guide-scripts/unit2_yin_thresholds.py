"""
Study guide, unit 2: how YIN's threshold changes what it hears.

The same step of YIN (the "absolute threshold") is 0.1 in librosa, 0.12 in our engine and 0.15 in aubio. This script
implements YIN's four steps in plain NumPy (so you can read them), runs it at all three thresholds on one recording,
and reports for each:
- "confident": how much of the sounding time has a dip below the threshold (a pitch YIN is sure of),
- octave jumps: how often a confident pitch leaps by about an octave from the previous one (a classic YIN error).
Then pYIN from librosa, which handles uncertainty differently (several candidates per frame, chosen by an HMM).

One finding worth knowing: librosa's own `yin` falls back to the deepest dip when nothing is under the threshold, so
its threshold changes very little. That is why this script computes the steps itself.

Usage:
    python unit2_yin_thresholds.py my_long_tone.wav
    python unit2_yin_thresholds.py --demo        # a clean note, then the same note a little breathy

Before running it, write down your guess: which threshold is confident in more of a breathy note, and which makes more
octave errors?
"""
import argparse

import librosa
import numpy as np

from flute_synth import SR, note, silence, take

FMIN, FMAX = 180, 2600


def yin_frame(frame, sr, threshold):
    """YIN on one frame. Returns (pitch in Hz or None, the normalised difference at the chosen lag)."""
    half = len(frame) // 2
    max_lag, min_lag = int(sr / FMIN), int(sr / FMAX)
    # Step 1, difference function: how different the frame is from itself shifted by each lag.
    diff = np.array([np.sum((frame[:half] - frame[lag:lag + half]) ** 2) for lag in range(max_lag + 1)])
    # Step 2, cumulative mean normalisation: divide by the running mean, so values near 0 mean "repeats cleanly".
    cmnd = np.ones_like(diff)
    running = np.cumsum(diff[1:])
    cmnd[1:] = diff[1:] * np.arange(1, max_lag + 1) / np.maximum(running, 1e-12)
    # Step 3, absolute threshold: the FIRST lag under the threshold, slid down to the bottom of its dip.
    below = np.where(cmnd[min_lag:max_lag] < threshold)[0]
    if len(below) == 0:
        return None, float(cmnd[min_lag:max_lag].min())
    lag = below[0] + min_lag
    while lag + 1 < max_lag and cmnd[lag + 1] < cmnd[lag]:
        lag += 1
    # Step 4, parabolic interpolation around the dip for a pitch between whole samples.
    a, b, c = cmnd[lag - 1], cmnd[lag], cmnd[lag + 1]
    shift = 0.5 * (a - c) / (a - 2 * b + c) if (a - 2 * b + c) != 0 else 0
    return sr / (lag + shift), float(b)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("wav", nargs="?")
    parser.add_argument("--demo", action="store_true")
    args = parser.parse_args()

    if args.demo or not args.wav:
        print("Demo: one second of a clean C5, then one second of the same note with some breath in it.\n")
        y, sr = take([note(72, 1000), silence(200), note(72, 1000, breath=0.45, seed=3)]), SR
    else:
        y, sr = librosa.load(args.wav, sr=SR, mono=True)

    frame_length, hop = 1024, 256
    frames = librosa.util.frame(y, frame_length=frame_length, hop_length=hop).T
    rms = np.sqrt(np.mean(frames ** 2, axis=1))
    sounding = rms > rms.max() * 0.05
    print(f"{int(sounding.sum())} sounding frames of {len(frames)}\n")

    for threshold in (0.10, 0.12, 0.15):
        pitches = [yin_frame(f, sr, threshold)[0] if s else None for f, s in zip(frames, sounding)]
        confident = [p for p in pitches if p is not None]
        midi = librosa.hz_to_midi(np.array(confident)) if confident else np.array([])
        jumps = np.abs(np.diff(midi))
        octave_jumps = int(np.sum((jumps > 10) & (jumps < 14)))
        median = librosa.midi_to_note(np.median(midi)) if len(midi) else "-"
        print(f"threshold {threshold:.2f}: confident in {100 * len(confident) / max(1, sounding.sum()):5.1f}% "
              f"of sounding frames, median {median}, octave jumps {octave_jumps}")

    f0, voiced, _ = librosa.pyin(y, fmin=FMIN, fmax=FMAX, sr=sr, frame_length=frame_length, hop_length=hop)
    n = min(len(f0), len(sounding))
    voiced = voiced[:n] & sounding[:n]
    midi = librosa.hz_to_midi(f0[:n][voiced])
    jumps = np.abs(np.diff(midi))
    print(f"pYIN          : voiced in   {100 * voiced.sum() / max(1, sounding.sum()):5.1f}% of sounding frames, "
          f"octave jumps {int(np.sum((jumps > 10) & (jumps < 14)))}")


if __name__ == "__main__":
    main()
