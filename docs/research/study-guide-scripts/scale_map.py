"""
A bar-by-bar map of a monophonic score's scale worlds (study guide, unit 6), made for Syrinx.

For every bar, and for every pair of bars, it finds the scale family that covers the most written time (whole-tone,
pentatonic, diatonic, octatonic, chromatic; see unit6_scale_worlds.py for the method), and reports how many different
pitch classes the bar uses and its range. With --plot it draws every note against time, coloured by its bar's family,
with bar numbers along the bottom.

Usage:
    python scale_map.py ../../../public/music/claude-debussy-syrinx/score.musicxml --plot syrinx.png

Treat the output as a first draft to argue with, not an analysis. It counts written notes and their lengths. It does
not hear phrasing, the harmony a line implies, or which notes are passing.
"""
import argparse
from collections import OrderedDict

from score_notes import name, read_notes, read_words
from unit6_scale_worlds import NAMES, best_scale, describe

FAMILY_COLOUR = {"whole-tone": "#5f8150", "pentatonic": "#a07a3c", "diatonic": "#4f5962",
                 "octatonic": "#7a3f86", "chromatic": "#b06db8"}


def short(family, root):
    if family == "chromatic":
        return "chromatic"
    label = describe(family, root)
    return label.replace(f"{family} ", f"{family} ")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("musicxml")
    parser.add_argument("--plot")
    parser.add_argument("--tension", action="store_true",
                        help="also compute Herremans and Chew's tonal tension with partitura (pip install partitura)")
    parser.add_argument("--min-pitch-classes", type=int, default=4,
                        help="bars with fewer different pitch classes are marked as too few to tell (default 4)")
    args = parser.parse_args()

    notes = read_notes(args.musicxml)
    bars = OrderedDict()
    for n in notes:
        bars.setdefault(n.bar, []).append(n)

    print(f"{len(notes)} notes in {len(bars)} bars.\n")
    words = read_words(args.musicxml)
    if words:
        print("Written directions:")
        for bar, text in words:
            print(f"  bar {bar:>3}: {text}")
        print()

    # Tension (optional): partitura's tension ribbons, averaged per bar. Cloud diameter is how spread out in tonal
    # space the recent notes are; tensile strain is how far their centre is from the key.
    tension_of_bar = {}
    tension_points = None
    if args.tension:
        import warnings
        import partitura
        from partitura.musicanalysis import estimate_tonaltension
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            tension_points = estimate_tonaltension(partitura.load_musicxml(args.musicxml), ws=2.0, ss="onset")
        starts = {}
        for n in notes:
            starts.setdefault(n.bar, n.onset - n.beat)
        bar_list = list(starts.items())
        for k, (bar, start) in enumerate(bar_list):
            end = bar_list[k + 1][1] if k + 1 < len(bar_list) else float("inf")
            inside = [(p["cloud_diameter"], p["tensile_strain"]) for p in tension_points if start <= p["onset_beat"] < end]
            if inside:
                tension_of_bar[bar] = tuple(sum(v) / len(inside) for v in zip(*inside))
    print(f"{'bar':>4}  {'notes':>5}  {'pcs':>3}  {'range':<11} {'diam strain  ' if args.tension else ''}best fit")
    family_of_bar = {}
    for bar, members in bars.items():
        window = [(n.midi, n.quarters) for n in members]
        pcs = {n.midi % 12 for n in members}
        low, high = min(n.midi for n in members), max(n.midi for n in members)
        if len(pcs) < args.min_pitch_classes:
            label, family = f"too few pitch classes to tell ({' '.join(NAMES[p] for p in sorted(pcs))})", None
        else:
            family, root, coverage = best_scale(window)
            label = f"{describe(family, root)}, covers {coverage:.0%}"
        family_of_bar[bar] = family
        tension = ""
        if args.tension:
            d, t = tension_of_bar.get(bar, (float("nan"), float("nan")))
            tension = f"{d:4.2f} {t:6.2f}  "
        print(f"{bar:>4}  {len(members):>5}  {len(pcs):>3}  {name(low) + '-' + name(high):<11} {tension}{label}")

    print("\nTwo bars at a time (steadier, blurs short changes):")
    keys = list(bars)
    previous = None
    for i in range(len(keys) - 1):
        window = [(n.midi, n.quarters) for n in bars[keys[i]] + bars[keys[i + 1]]]
        family, root, coverage = best_scale(window)
        label = describe(family, root)
        if label != previous:
            print(f"  from bars {keys[i]}-{keys[i + 1]}: {label}, covers {coverage:.0%}")
            previous = label

    if args.plot:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        if tension_points is not None:
            fig, (ax, tax) = plt.subplots(2, 1, figsize=(15, 6.6), sharex=True, gridspec_kw={"height_ratios": [3.2, 1]})
        else:
            fig, ax = plt.subplots(figsize=(15, 4.8))
            tax = None
        for n in notes:
            colour = FAMILY_COLOUR.get(family_of_bar[n.bar], "#c5c6cc")
            ax.plot([n.onset, n.onset + max(n.quarters, 0.08)], [n.midi, n.midi], color=colour, linewidth=3 if not n.grace else 1.5,
                    solid_capstyle="butt")
        starts = {}
        for n in notes:
            starts.setdefault(n.bar, n.onset - n.beat)
        for bar, start in starts.items():
            ax.axvline(start, color="#e6e8eb", linewidth=0.8, zorder=0)
            ax.text(start + 0.1, min(n.midi for n in notes) - 2.2, bar, fontsize=7, color="#85868e")
        ticks = list(range(min(n.midi for n in notes) // 12 * 12, max(n.midi for n in notes) + 2, 12))
        ax.set_yticks(ticks, [name(t) for t in ticks])
        ax.set_ylim(min(n.midi for n in notes) - 3, max(n.midi for n in notes) + 2)
        ax.set_xlabel("quarter notes (bar numbers along the bottom)")
        handles = [plt.Line2D([0], [0], color=c, linewidth=4, label=f) for f, c in FAMILY_COLOUR.items()]
        handles.append(plt.Line2D([0], [0], color="#c5c6cc", linewidth=4, label="too few notes to tell"))
        ax.legend(handles=handles, loc="upper right", fontsize=8, ncol=3, frameon=False)
        ax.set_title("Best-fitting scale family per bar (written notes weighted by length)", fontsize=11)
        for side in ("top", "right"):
            ax.spines[side].set_visible(False)
        if tax is not None:
            tax.plot(tension_points["onset_beat"], tension_points["tensile_strain"], color="#79588e", linewidth=1.2, label="tensile strain")
            tax.plot(tension_points["onset_beat"], tension_points["cloud_diameter"], color="#a07a3c", linewidth=1.2, label="cloud diameter")
            tax.set_ylabel("tension")
            tax.legend(loc="upper right", fontsize=8, frameon=False, ncol=2)
            for side in ("top", "right"):
                tax.spines[side].set_visible(False)
            for start in starts.values():
                tax.axvline(start, color="#e6e8eb", linewidth=0.8, zorder=0)
            tax.set_xlabel(ax.get_xlabel())
            ax.set_xlabel("")
        fig.tight_layout()
        fig.savefig(args.plot, dpi=120)
        print(f"\nSaved {args.plot}")


if __name__ == "__main__":
    main()
