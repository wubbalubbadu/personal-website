"""
Study guide, unit 3: onset detection functions, side by side.

Implements four of aubio's classic "onset detection functions" in plain NumPy (energy rise, high-frequency content,
spectral flux, complex domain; see aubio's src/spectral/specdesc.c), plus librosa's onset_detect with and without
backtracking. Each function turns the spectrum into one number per frame that should jump when a note starts.

On the demo, which has staccato notes, tongued legato on one pitch, and a slurred scale, it prints how many of the
true note starts each method finds (within 40 ms), and how many it invents. Watch the slurred notes: energy-based
methods cannot see a slur, because the loudness never changes. That is why our engine also listens for pitch changes.

Usage:
    python unit3_onsets.py my_take.wav            # prints onset times for each method
    python unit3_onsets.py --demo                 # synthetic take with known note starts, scored
    python unit3_onsets.py --demo --plot out.png  # also draws the detection functions (needs matplotlib)

Before running: which method do you expect to miss the most notes, and on which kind of articulation?

What the demo showed when this script was written (librosa 1.0.0, November 5, 2026), to compare with your own run:
- energy and high-frequency content: found every staccato and tongued note, but only 1 of the 5 slurred notes.
- spectral flux: found all 13 and invented none (a slur changes the spectrum even when the loudness stays level).
- complex domain: found all 13 but invented 5, all at note *endings* (a release changes phase and magnitude too).
- librosa (default settings): found all 13, invented 7. With backtrack=True it moved onsets back to the preceding
  energy minimum, which for notes after silence is far too early, so fewer landed within 40 ms.
On a real flute the numbers will differ; the pattern (energy cannot see slurs) should not.
"""
import argparse

import librosa
import numpy as np

from flute_synth import SR, note, silence, take

N_FFT, HOP = 1024, 128  # 128 samples is about 5.8 ms at 22 050 Hz


def demo():
    """Returns (samples, true onset times in seconds, a label per onset)."""
    parts, onsets, labels, t = [], [], [], 0.2
    def add(sound, label=None):
        nonlocal t
        if label:
            onsets.append(t)
            labels.append(label)
        parts.append(sound)
        t += len(sound) / SR
    for _ in range(4):  # staccato
        add(note(74, 150, attack_ms=6, release_ms=10), "staccato")
        add(silence(250))
    add(silence(300))
    for _ in range(4):  # tongued legato on one pitch: a short dip between notes, no silence
        add(note(79, 280, attack_ms=12, release_ms=25), "tongued")
    add(silence(400))
    for i, midi in enumerate([72, 74, 76, 77, 79]):  # slurred: no dips at all, only pitch changes
        add(note(midi, 260, attack_ms=10 if i == 0 else 0.1, release_ms=0.1 if i < 4 else 20), "slurred")
    return take(parts), np.array(onsets), labels


def detection_functions(y):
    """Four classic onset detection functions, one value per frame."""
    S = librosa.stft(y, n_fft=N_FFT, hop_length=HOP)
    mag, phase = np.abs(S), np.angle(S)
    bins = np.arange(mag.shape[0])[:, None]
    energy = np.sum(mag ** 2, axis=0)
    out = {}
    # Energy rise: how much louder this frame is than the last.
    out["energy"] = np.maximum(0, np.diff(energy, prepend=energy[0]))
    # High-frequency content: energy weighted by frequency, so bright attack transients count most.
    hfc = np.sum(bins * mag ** 2, axis=0)
    out["hfc"] = np.maximum(0, np.diff(hfc, prepend=hfc[0]))
    # Spectral flux: the sum of every bin's increase since the last frame.
    out["spectral flux"] = np.sum(np.maximum(0, np.diff(mag, axis=1, prepend=mag[:, :1])), axis=0)
    # Complex domain: how far each bin is from where steady sound would have put it (predicted magnitude and phase).
    predicted_phase = 2 * np.roll(phase, 1, axis=1) - np.roll(phase, 2, axis=1)
    predicted = np.roll(mag, 1, axis=1) * np.exp(1j * predicted_phase)
    out["complex"] = np.sum(np.abs(mag * np.exp(1j * phase) - predicted), axis=0)
    out["complex"][:2] = 0
    return {k: v / (v.max() or 1) for k, v in out.items()}


def peaks(func, threshold=0.12, wait_frames=8):
    """Simple peak picking: local maxima above a threshold over the local mean, at least `wait_frames` apart."""
    found, last = [], -wait_frames
    local = np.convolve(func, np.ones(15) / 15, mode="same")
    for i in range(1, len(func) - 1):
        if func[i] > func[i - 1] and func[i] >= func[i + 1] and func[i] - local[i] > threshold and i - last >= wait_frames:
            found.append(i)
            last = i
    return librosa.frames_to_time(np.array(found, dtype=int), sr=SR, hop_length=HOP)


def score(found, truth, labels, tolerance=0.04):
    hit = [any(abs(f - t) <= tolerance for f in found) for t in truth]
    extra = sum(1 for f in found if not any(abs(f - t) <= tolerance for t in truth))
    by_kind = {}
    for ok, label in zip(hit, labels):
        got, total = by_kind.get(label, (0, 0))
        by_kind[label] = (got + ok, total + 1)
    kinds = ", ".join(f"{k} {g}/{n}" for k, (g, n) in by_kind.items())
    return f"found {sum(hit)}/{len(truth)} ({kinds}), invented {extra}"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("wav", nargs="?")
    parser.add_argument("--demo", action="store_true")
    parser.add_argument("--plot")
    args = parser.parse_args()

    truth, labels = None, None
    if args.demo or not args.wav:
        y, truth, labels = demo()
        print(f"Demo: {len(truth)} notes (4 staccato, 4 tongued legato, 5 slurred).\n")
    else:
        y, _ = librosa.load(args.wav, sr=SR, mono=True)

    functions = detection_functions(y)
    results = {name: peaks(f) for name, f in functions.items()}
    # librosa at its own default hop (512 samples, ~23 ms): its peak-picking defaults are counted in frames and tuned
    # for that hop, so running it at our finer hop would be unfair to it.
    envelope = librosa.onset.onset_strength(y=y, sr=SR)
    results["librosa"] = librosa.onset.onset_detect(onset_envelope=envelope, sr=SR, units="time")
    results["librosa + backtrack"] = librosa.onset.onset_detect(onset_envelope=envelope, sr=SR, units="time", backtrack=True)

    for name, found in results.items():
        if truth is not None:
            print(f"{name:>20}: {score(found, truth, labels)}")
        else:
            print(f"{name:>20}: {len(found)} onsets at " + ", ".join(f"{t:.2f}" for t in found[:30]))

    if args.plot:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        times = librosa.frames_to_time(np.arange(len(next(iter(functions.values())))), sr=SR, hop_length=HOP)
        fig, axes = plt.subplots(len(functions) + 1, 1, figsize=(12, 9), sharex=True)
        axes[0].plot(np.arange(len(y)) / SR, y, color="#555", linewidth=0.5)
        axes[0].set_ylabel("sound")
        for ax, (name, f) in zip(axes[1:], functions.items()):
            ax.plot(times, f, color="#62567a", linewidth=1)
            ax.set_ylabel(name, rotation=0, ha="right")
            for t in results[name]:
                ax.axvline(t, color="#a07a3c", linewidth=0.8, alpha=0.7)
        if truth is not None:
            for ax in axes:
                for t in truth:
                    ax.axvline(t, color="#5f8150", linewidth=0.6, linestyle=":")
        axes[-1].set_xlabel("seconds (green dotted: true note starts; brown: detected)")
        fig.tight_layout()
        fig.savefig(args.plot, dpi=110)
        print(f"\nSaved {args.plot}")


if __name__ == "__main__":
    main()
