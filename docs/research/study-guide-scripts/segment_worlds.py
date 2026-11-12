"""
Where do the scale worlds change? Optimal segmentation instead of sliding windows (study guide, unit 6).

Sliding windows blur boundaries (a window that straddles two passages gets an in-between answer). This script asks a
cleaner question: split the melody into stretches so that each stretch fits one scale well, without splitting more
often than necessary. It solves that exactly with dynamic programming, the same idea as DTW in unit 5:

    cost of a split = sum over its stretches of (time not explained by the stretch's best scale) + a penalty per stretch

The penalty is the one knob: higher means fewer, longer worlds. Short notes can also be made to count for less
(--weight), to test whether quick decorations hide a passage's colour.

Usage:
    python segment_worlds.py ../../../public/music/claude-debussy-syrinx/score.musicxml
    python segment_worlds.py score.musicxml --penalty 3 --weight squared
"""
import argparse

import numpy as np

from score_notes import read_notes
from unit6_scale_worlds import NAMES, SCALES, SIZE_PENALTY

FAMILIES = [(family, root, members) for family, root, members in SCALES] + [("chromatic", 0, frozenset(range(12)))]
MEMBERSHIP = np.array([[1.0 if pc in members else 0.0 for pc in range(12)] for _, _, members in FAMILIES])
SIZES = MEMBERSHIP.sum(axis=1)


def weights(notes, mode):
    q = np.array([n.quarters for n in notes])
    if mode == "length":
        return q
    if mode == "squared":  # long notes count much more than short ones
        return q ** 2
    if mode == "long-only":  # notes shorter than a sixteenth do not count at all
        return np.where(q >= 0.25, q, 0.0)
    raise ValueError(mode)


def segment(notes, penalty, mode, min_notes=3, max_notes=80):
    w = weights(notes, mode)
    pcs = np.zeros((len(notes) + 1, 12))
    for i, n in enumerate(notes):
        pcs[i + 1] = pcs[i]
        pcs[i + 1, n.midi % 12] += w[i]
    best = np.full(len(notes) + 1, np.inf)
    best[0] = 0.0
    back = np.zeros(len(notes) + 1, dtype=int)
    choice = {}
    for end in range(min_notes, len(notes) + 1):
        for start in range(max(0, end - max_notes), end - min_notes + 1):
            if not np.isfinite(best[start]):
                continue
            vector = pcs[end] - pcs[start]
            total = vector.sum()
            if total <= 0:
                continue
            coverage = MEMBERSHIP @ vector / total
            score = np.where(coverage >= 0.85, coverage - SIZE_PENALTY * SIZES, -np.inf)
            k = int(np.argmax(score))
            # Unexplained share, scaled by the stretch's real length so long stretches matter more.
            length = sum(n.quarters for n in notes[start:end])
            cost = best[start] + length * (1 - score[k]) + penalty
            if cost < best[end]:
                best[end], back[end], choice[end] = cost, start, (k, coverage[k])
    stretches, end = [], len(notes)
    while end > 0:
        start = back[end]
        stretches.append((start, end, *choice[end]))
        end = start
    return stretches[::-1]


def label(k):
    family, _, members = FAMILIES[k]
    return "chromatic" if family == "chromatic" else f"{family} {{{' '.join(NAMES[p] for p in sorted(members))}}}"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("musicxml")
    parser.add_argument("--penalty", type=float, default=2.0, help="cost of starting a new world, in quarter notes")
    parser.add_argument("--weight", choices=["length", "squared", "long-only"], default="length")
    args = parser.parse_args()

    notes = read_notes(args.musicxml)
    stretches = segment(notes, args.penalty, args.weight)
    print(f"{len(stretches)} worlds (penalty {args.penalty}, notes weighted by {args.weight}):\n")
    for start, end, k, coverage in stretches:
        first, last = notes[start], notes[end - 1]
        print(f"  bars {first.bar:>2} to {last.bar:>2}  ({end - start:>3} notes)  {label(k)}, covers {coverage:.0%}")


if __name__ == "__main__":
    main()
