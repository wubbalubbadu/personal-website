"""
A tiny synthetic "flute" for the study-guide scripts, so every script runs before you have recorded anything.

Not a real flute: a few harmonics, optional breath noise, optional vibrato, and an attack and release per note.
Use your own recordings as soon as you have them; synthetic sound is only for checking that a method works at all.
"""
import numpy as np

SR = 22050


def midi_to_hz(midi):
    return 440.0 * 2 ** ((np.asarray(midi, dtype=float) - 69) / 12)


def note(midi, ms, gain=0.3, attack_ms=10, release_ms=10, breath=0.0, vibrato_cents=0.0, seed=0):
    """One note as a NumPy array: harmonics, a linear attack and release, optional breath and vibrato."""
    rng = np.random.default_rng(seed)
    n = int(SR * ms / 1000)
    t = np.arange(n) / SR
    wobble = vibrato_cents * np.sin(2 * np.pi * 5.3 * t) * np.minimum(1, t / 0.3)
    freq = midi_to_hz(midi) * 2 ** (wobble / 1200)
    phase = 2 * np.pi * np.cumsum(freq) / SR
    tone = (np.sin(phase) + 0.45 * np.sin(2 * phase) + 0.2 * np.sin(3 * phase)) / 1.65
    # Breath: low-passed noise, the way air noise sits mostly below a few kHz.
    noise = np.convolve(rng.standard_normal(n), np.ones(6) / 6, mode="same")
    shape = np.minimum.reduce([np.ones(n), np.arange(n) / max(1, SR * attack_ms / 1000), (n - np.arange(n)) / max(1, SR * release_ms / 1000)])
    return gain * (tone + breath * noise) * shape


def silence(ms):
    return np.zeros(int(SR * ms / 1000))


def take(parts):
    """Joins notes and silences, with a little room noise everywhere."""
    y = np.concatenate([silence(200), *parts, silence(300)])
    return y + 0.0006 * np.random.default_rng(1).standard_normal(len(y))


def syrinx_like_line(stretch=None):
    """
    A short line in the style of the Syrinx opening (not the piece itself): a held note, a quick turn, a descent.
    `stretch` gives one timing factor per note, to make a second "take" with different rubato.
    """
    line = [(82, 700), (81, 140), (80, 140), (79, 300), (77, 260), (76, 260), (74, 900)]
    stretch = stretch or [1.0] * len(line)
    parts = []
    for (midi, ms), factor in zip(line, stretch):
        parts.append(note(midi, ms * factor, gain=0.25, attack_ms=12, release_ms=15, vibrato_cents=12 if ms > 400 else 0))
        parts.append(silence(20))
    return take(parts)
