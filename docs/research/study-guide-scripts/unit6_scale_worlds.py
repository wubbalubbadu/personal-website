"""
Study guide, unit 6: which scale world is each passage in?

The visual-score idea is that the visuals follow musical meaning, for example the scale a passage lives in (Syrinx
moves between whole-tone, pentatonic and chromatic colours). This script makes that a computation:

1. Take a melody as notes (names and durations), either typed in or found in a recording with pYIN.
2. Slide a window along it (a few notes at a time).
3. For each window, try every scale of each family and measure how much of the window's *time* falls on its notes.
4. Report the family that covers the window best, preferring the more specific family when two cover equally well.

Families (pitch-class sets):
- whole-tone: 6 notes, 2 possible scales (on C and on C♯)
- pentatonic: 5 notes, 12 scales (the black-key shape)
- diatonic (major and its modes): 7 notes, 12 scales
- octatonic (half-whole): 8 notes, 3 scales
- chromatic: everything (the fallback)

Usage:
    python unit6_scale_worlds.py --notes "Bb5:0.6 A5:0.15 Ab5:0.15 G5:0.3 ..."   # note:seconds
    python unit6_scale_worlds.py my_take.wav
    python unit6_scale_worlds.py --demo

What to notice: windows that straddle two passages get in-between answers (on the demo, an "octatonic" window sits
between the whole-tone and pentatonic sections). Sliding windows blur boundaries; finding the boundary itself (where
the best fit changes and stays changed) is the better method, and a good next step to write yourself. From a recording,
repeated notes on one pitch merge into one longer note, which is fine for this question (time on each pitch class) but
not for counting notes.

Before running on Syrinx: mark on your score where you hear the colour change. Then compare with what the script says,
and decide who is right. (The script only counts notes; you hear phrasing, harmony implied by the line, and the
resonance of the room. Disagreements are the interesting part.)
"""
import argparse
import re

import numpy as np

NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]


def pcs(*steps):
    return frozenset(s % 12 for s in steps)


def families():
    scales = []
    for root in range(2):
        scales.append(("whole-tone", root, pcs(*[root + 2 * k for k in range(6)])))
    for root in range(12):
        scales.append(("pentatonic", root, pcs(root, root + 2, root + 4, root + 7, root + 9)))
    for root in range(12):
        scales.append(("diatonic", root, pcs(root, root + 2, root + 4, root + 5, root + 7, root + 9, root + 11)))
    for root in range(3):
        scales.append(("octatonic", root, pcs(*[root + s for s in (0, 1, 3, 4, 6, 7, 9, 10)])))
    return scales


SCALES = families()
# Smaller sets are more specific: a passage that fits a pentatonic scale also fits a diatonic one, and the pentatonic
# answer says more. So among scales that cover the window equally well, the smallest wins.
SIZE_PENALTY = 0.015


def parse_name(name):
    m = re.fullmatch(r"([A-Ga-g])([#b♯♭]?)(-?\d)", name.strip())
    if not m:
        raise ValueError(f"cannot read note name {name!r} (use forms like C5, F#4, Bb5)")
    letter, accidental, octave = m.groups()
    pc = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}[letter.upper()]
    pc += {"#": 1, "♯": 1, "b": -1, "♭": -1, "": 0}[accidental]
    return 12 * (int(octave) + 1) + pc


def best_scale(window):
    """window: list of (midi, seconds). Returns (family, root, coverage) for the best-fitting scale."""
    total = sum(d for _, d in window) or 1
    best = ("chromatic", 0, 1.0, -1.0)
    for family, root, members in SCALES:
        coverage = sum(d for m, d in window if m % 12 in members) / total
        score = coverage - SIZE_PENALTY * len(members)
        if score > best[3] and coverage >= 0.85:
            best = (family, root, coverage, score)
    return best[:3]


def describe(family, root):
    if family == "chromatic":
        return "chromatic (no smaller scale fits)"
    members = next(m for f, r, m in SCALES if f == family and r == root)
    return f"{family} {{{' '.join(NAMES[p] for p in sorted(members))}}}"


def notes_from_audio(path):
    """Finds notes in a recording with pYIN: a new note wherever the rounded pitch changes and holds for 40 ms."""
    import librosa
    y, sr = librosa.load(path, sr=22050, mono=True)
    hop = 256
    f0, voiced, _ = librosa.pyin(y, fmin=180, fmax=2600, sr=sr, frame_length=1024, hop_length=hop)
    frame_s = hop / sr
    midi = np.where(voiced, np.round(librosa.hz_to_midi(np.nan_to_num(f0, nan=1.0))), -1).astype(int)
    notes, current, length = [], None, 0
    for m in midi:
        if m == current:
            length += 1
            continue
        if current is not None and current >= 0 and length * frame_s >= 0.04:
            if notes and notes[-1][0] == current:
                notes[-1] = (current, notes[-1][1] + length * frame_s)
            else:
                notes.append((current, length * frame_s))
        current, length = m, 1
    if current is not None and current >= 0 and length * frame_s >= 0.04:
        notes.append((current, length * frame_s))
    return notes


def demo_notes():
    """A made-up line in three colours: whole-tone, then pentatonic, then chromatic (not from Syrinx)."""
    text = ("Bb5:0.6 Ab5:0.2 Gb5:0.2 E5:0.4 D5:0.3 C5:0.6 "      # whole-tone
            "Db5:0.3 Eb5:0.3 Gb5:0.3 Ab5:0.3 Bb5:0.6 Ab5:0.3 "    # pentatonic (black keys)
            "A5:0.2 Bb5:0.2 B5:0.2 C6:0.2 B5:0.2 Bb5:0.2 A5:0.4")  # chromatic
    return [(parse_name(n), float(d)) for n, d in (item.split(":") for item in text.split())]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("wav", nargs="?")
    parser.add_argument("--notes")
    parser.add_argument("--demo", action="store_true")
    parser.add_argument("--window", type=int, default=6, help="notes per window (default 6)")
    args = parser.parse_args()

    if args.notes:
        notes = [(parse_name(n), float(d)) for n, d in (item.split(":") for item in args.notes.split())]
    elif args.wav and not args.demo:
        notes = notes_from_audio(args.wav)
        print(f"Found {len(notes)} notes in the recording.\n")
    else:
        notes = demo_notes()
        print("Demo: a made-up line, whole-tone, then pentatonic, then chromatic.\n")

    if len(notes) < args.window:
        args.window = max(2, len(notes))
    previous, t = None, 0.0
    starts = np.cumsum([0] + [d for _, d in notes])
    for i in range(len(notes) - args.window + 1):
        window = notes[i:i + args.window]
        family, root, coverage = best_scale(window)
        label = describe(family, root)
        if label != previous:
            names = " ".join(f"{NAMES[m % 12]}{m // 12 - 1}" for m, _ in window)
            print(f"from note {i + 1:3d} ({starts[i]:5.2f} s): {label}, covers {coverage:.0%}   [{names}]")
            previous = label
    print("\nEach line is printed only where the best fit changes. Try --window 4 (more sensitive) or 8 (steadier).")


if __name__ == "__main__":
    main()
