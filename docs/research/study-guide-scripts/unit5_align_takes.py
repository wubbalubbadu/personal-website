"""
Study guide, unit 5: aligning two takes with dynamic time warping (DTW).

Score following starts here. Before following a score live, learn to line up two recordings of the same music
offline: for every moment of take A, find the matching moment of take B. The path that does this is a map of your
rubato: where it runs steeper than the diagonal, take B took more time.

What it does:
1. Turns each take into a sequence of chroma vectors (how much of each of the 12 pitch classes is sounding, every
   ~23 ms). Chroma ignores octave and tone colour, so two takes compare by notes.
2. Runs librosa.sequence.dtw on the two sequences, which finds the cheapest path through the grid of "how different
   is this moment of A from that moment of B".
3. Prints, for evenly spaced moments of A, the matching moment of B and how much faster or slower B was there.
4. With --plot, draws the cost grid and the path.

Usage:
    python unit5_align_takes.py syrinx_take1.wav syrinx_take2.wav --plot path.png
    python unit5_align_takes.py --demo --plot path.png   # two synthetic takes with known, different rubato

Before running on your Syrinx takes, write down where you think you took the most time differently. Then compare.
"""
import argparse

import librosa
import numpy as np

from flute_synth import SR, syrinx_like_line

HOP = 512


def chroma(y):
    return librosa.feature.chroma_cqt(y=y, sr=SR, hop_length=HOP)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("a", nargs="?")
    parser.add_argument("b", nargs="?")
    parser.add_argument("--demo", action="store_true")
    parser.add_argument("--plot")
    args = parser.parse_args()

    known = None
    if args.demo or not (args.a and args.b):
        # Take B holds the first note longer, rushes the turn, and broadens the ending.
        stretch = [1.4, 0.8, 0.8, 1.0, 1.0, 1.2, 1.3]
        y_a, y_b = syrinx_like_line(), syrinx_like_line(stretch)
        print("Demo: take B holds the first note 40% longer, rushes the turn by 20%, and broadens the last two notes.\n")
        # Where each note starts in each take, to check the path against (200 ms lead-in, 20 ms between notes).
        lengths = [700, 140, 140, 300, 260, 260, 900]
        starts = lambda f: np.cumsum([0.2] + [(ms * k + 20) / 1000 for ms, k in zip(lengths, f)])[:-1]
        known = (starts([1.0] * 7), starts(stretch))
    else:
        y_a, _ = librosa.load(args.a, sr=SR, mono=True)
        y_b, _ = librosa.load(args.b, sr=SR, mono=True)

    X, Y = chroma(y_a), chroma(y_b)
    D, path = librosa.sequence.dtw(X=X, Y=Y, metric="cosine")
    path = path[::-1]  # librosa returns the path from the end; reverse it to read forwards in time
    time_a = librosa.frames_to_time(path[:, 0], sr=SR, hop_length=HOP)
    time_b = librosa.frames_to_time(path[:, 1], sr=SR, hop_length=HOP)

    def b_at(t):
        """The moment of take B matching moment t of take A (the first path point at or after t)."""
        i = min(np.searchsorted(time_a, t), len(time_a) - 1)
        return time_b[i]

    print(f"Take A {len(y_a) / SR:.2f} s, take B {len(y_b) / SR:.2f} s, path of {len(path)} steps.\n")
    if known is not None:
        print("Note starts: where each note starts in B, and where the path says it does")
        errors = []
        for k, (ta, tb) in enumerate(zip(*known)):
            found = b_at(ta)
            errors.append(abs(found - tb))
            print(f"  note {k + 1}: A {ta:5.2f} s -> B true {tb:5.2f} s, path {found:5.2f} s (off by {abs(found - tb) * 1000:4.0f} ms)")
        print(f"  median error {np.median(errors) * 1000:.0f} ms (one chroma frame is {HOP / SR * 1000:.0f} ms)\n")

    print("Local tempo of B against A (over half-second spans of A):")
    for t in np.arange(0, time_a[-1] - 0.5, 0.5):
        ratio = (b_at(t + 0.5) - b_at(t)) / 0.5
        word = "slower" if ratio > 1.1 else "faster" if ratio < 0.9 else "about the same"
        print(f"  A {t:4.1f}-{t + 0.5:4.1f} s: B takes {ratio:4.2f}x the time ({word})")

    if args.plot:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        fig, ax = plt.subplots(figsize=(7, 6))
        ax.imshow(D.T, origin="lower", aspect="auto", cmap="Greys",
                  extent=[0, X.shape[1] * HOP / SR, 0, Y.shape[1] * HOP / SR])
        ax.plot(time_a, time_b, color="#79588e", linewidth=2, label="DTW path")
        ax.plot([0, time_a[-1]], [0, time_a[-1] * (len(y_b) / len(y_a))], color="#a07a3c", linestyle="--", linewidth=1, label="same tempo throughout")
        if known is not None:
            ax.scatter(*known, color="#5f8150", zorder=3, s=25, label="true note starts")
        ax.set_xlabel("take A (s)")
        ax.set_ylabel("take B (s)")
        ax.legend(loc="upper left")
        ax.set_title("Where the path is steeper than the dashed line, B took more time")
        fig.tight_layout()
        fig.savefig(args.plot, dpi=110)
        print(f"\nSaved {args.plot}")


if __name__ == "__main__":
    main()
