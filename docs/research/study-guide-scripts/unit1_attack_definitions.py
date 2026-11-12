"""
Study guide, unit 1: the same attack, measured three ways.

"Attack time" sounds like a fact about a note. It is a definition. This script measures each note's attack with:
- ours: 10% to 90% of the way to the peak, on an RMS envelope every ~3 ms (engine.ts),
- Essentia's default: 20% to 90% (LogAttackTime's startAttackThreshold and stopAttackThreshold),
- an envelope *follower* first (fast up, slow down, like Essentia's Envelope or a compressor meter), then 10% to 90%.
It also prints each note's temporal centroid as a share of its length (Essentia's TCToTotal): low means the energy is
at the front of the note, high means it builds toward the end.

Usage:
    python unit1_attack_definitions.py --demo
    python unit1_attack_definitions.py my_staccato.wav     # finds notes by a simple loudness gate

Before running: for a breathy attack that creeps in before the tone, which definition gives the longest attack?
"""
import argparse

import librosa
import numpy as np

from flute_synth import SR, note, silence, take

HOP = 64  # about 2.9 ms at 22 050 Hz, the same step as our engine


def rms_envelope(y, window=192):
    """RMS every HOP samples over a ~8.7 ms window, as in engine.ts loudnessEnvelope."""
    padded = np.pad(y, window // 2)
    frames = librosa.util.frame(padded, frame_length=window, hop_length=HOP)
    return np.sqrt(np.mean(frames ** 2, axis=0))


def follower(y, attack_ms=5.0, release_ms=80.0):
    """A one-pole envelope follower: rises with a short time constant, falls with a long one."""
    up, down = np.exp(-1 / (SR * attack_ms / 1000)), np.exp(-1 / (SR * release_ms / 1000))
    out, level = np.empty(len(y)), 0.0
    for i, x in enumerate(np.abs(y)):
        g = up if x > level else down
        level = g * level + (1 - g) * x
        out[i] = level
    return out[::HOP]


def attack_ms(env, start, end, low, high):
    """Time from `low` to `high` of the way from the start level (0 here: notes start after silence) to the peak."""
    part = env[start:end]
    peak_at = int(np.argmax(part))
    peak = part[peak_at]
    t_low = int(np.argmax(part[:peak_at + 1] >= low * peak))
    t_high = int(np.argmax(part[:peak_at + 1] >= high * peak))
    return (t_high - t_low) * HOP / SR * 1000


def temporal_centroid_share(env, start, end):
    part = env[start:end]
    centroid = np.sum(np.arange(len(part)) * part) / max(np.sum(part), 1e-12)
    return centroid / max(1, len(part))


def notes_by_gate(env):
    """Simple note finding: runs of loudness above a gate 30 dB under the loudest moment."""
    db = 20 * np.log10(np.maximum(env, 1e-6))
    on = db > db.max() - 30
    edges = np.diff(on.astype(int), prepend=0, append=0)
    return list(zip(np.where(edges == 1)[0], np.where(edges == -1)[0]))


def demo():
    """Four notes: a firm tongue, a soft tongue, a swell, and a breath attack (air before the tone)."""
    breath_lead = 0.04 * np.convolve(np.random.default_rng(2).standard_normal(int(SR * 0.08)), np.ones(6) / 6, mode="same")
    breath_lead *= np.linspace(0, 1, len(breath_lead))
    parts = [note(76, 400, attack_ms=6), silence(300),
             note(76, 400, attack_ms=35), silence(300),
             note(76, 600, attack_ms=250, release_ms=40), silence(300),
             breath_lead, note(76, 400, attack_ms=20, breath=0.3, seed=4)]
    labels = ["firm tongue (6 ms ramp)", "soft tongue (35 ms ramp)", "swell (250 ms ramp)", "breath attack (air first)"]
    return take(parts), labels


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("wav", nargs="?")
    parser.add_argument("--demo", action="store_true")
    args = parser.parse_args()

    if args.demo or not args.wav:
        y, labels = demo()
        print("Demo: four notes on E5, each started a different way.\n")
    else:
        y, _ = librosa.load(args.wav, sr=SR, mono=True)
        labels = None

    env = rms_envelope(y)
    follow = follower(y)
    found = notes_by_gate(env)
    if labels and len(found) != len(labels):
        labels = None
    print(f"{'note':<28}{'ours 10-90':>12}{'Essentia 20-90':>16}{'follower 10-90':>16}{'centroid share':>16}")
    for k, (start, end) in enumerate(found):
        name = labels[k] if labels else f"note {k + 1} at {start * HOP / SR:.2f} s"
        a = attack_ms(env, start, end, 0.1, 0.9)
        b = attack_ms(env, start, end, 0.2, 0.9)
        c = attack_ms(follow, start, min(end, len(follow)), 0.1, 0.9)
        share = temporal_centroid_share(env, start, end)
        print(f"{name:<28}{a:>10.0f} ms{b:>14.0f} ms{c:>14.0f} ms{share:>16.2f}")
    print("\nThe follower smooths the start, so its attacks read longer than the raw envelope's. 20% starts later than 10%,"
          "\nso Essentia's numbers are shorter, most of all for the breath attack, where the air creeps in before the tone.")


if __name__ == "__main__":
    main()
