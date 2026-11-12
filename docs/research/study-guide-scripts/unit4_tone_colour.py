"""
Study guide, unit 4: is a note "bright" because of its tone, or just because it is high?

Spectral centroid (the "centre of mass" of a sound's energy across frequencies) is the usual number for brightness.
This script computes it three ways, as different libraries do:
- in Hz, weighted by power (the textbook version),
- as a bin number weighted by amplitude (Meyda's spectralCentroid: mu(1, ampSpectrum)),
- in Hz divided by the note's pitch (our engine's "brightness"), so the register is taken out,
plus "breath": the share of energy below 8 kHz that is not on a harmonic of the pitch.

The demo plays the same tone colour at C5 and at C6, then a dark and a bright tone at the same pitch, so you can see
which measure follows the tone and which follows the register.

Usage:
    python unit4_tone_colour.py --demo
    python unit4_tone_colour.py note1.wav note2.wav ...   # one held note per file

Before running: which of the three measures will call the C6 note "brighter" even though its tone colour is the same?

What the demo showed when written: centroid in Hz doubled from C5 to C6 with the tone colour unchanged, while the
ratio to pitch stayed at 1.83; and adding breath barely moved the power-weighted centroid but moved Meyda's
amplitude-weighted bin a lot, because amplitude weighting lets the quiet noise between partials count for more.
"""
import argparse

import librosa
import numpy as np

from flute_synth import SR, midi_to_hz

N_FFT = 4096


def tone(midi, partials, seconds=1.0, breath=0.0, seed=0):
    """A steady tone with the given partial amplitudes (1st, 2nd, 3rd...), plus optional low-passed breath."""
    t = np.arange(int(SR * seconds)) / SR
    f = float(midi_to_hz(midi))
    y = sum(a * np.sin(2 * np.pi * f * (k + 1) * t) for k, a in enumerate(partials) if f * (k + 1) < SR / 2)
    noise = np.convolve(np.random.default_rng(seed).standard_normal(len(t)), np.ones(6) / 6, mode="same")
    return 0.2 * (y / np.max(np.abs(y)) + breath * noise)


def measures(y):
    spectrum = np.abs(np.fft.rfft(y[:N_FFT] * np.hanning(N_FFT)))
    freqs = np.fft.rfftfreq(N_FFT, 1 / SR)
    power = spectrum ** 2
    centroid_hz = np.sum(freqs * power) / np.sum(power)
    meyda_bin = np.sum(np.arange(len(spectrum)) * spectrum) / np.sum(spectrum)
    f0 = np.median(librosa.yin(y, fmin=180, fmax=2600, sr=SR, frame_length=2048))
    below = freqs < 8000
    harmonic = np.zeros_like(freqs, dtype=bool)
    for h in range(1, int(8000 / f0) + 1):
        harmonic |= np.abs(freqs - h * f0) <= max(1.5 * SR / N_FFT, 0.03 * h * f0)
    breath = 1 - np.sum(power[below & harmonic]) / np.sum(power[below])
    return f0, centroid_hz, meyda_bin, centroid_hz / f0, breath


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("wavs", nargs="*")
    parser.add_argument("--demo", action="store_true")
    args = parser.parse_args()

    if args.demo or not args.wavs:
        bright, dark = [1, 0.7, 0.5, 0.35, 0.25], [1, 0.25, 0.08, 0.03]
        cases = [("same colour, C5", tone(72, bright)), ("same colour, C6", tone(84, bright)),
                 ("dark tone, A5", tone(81, dark)), ("bright tone, A5", tone(81, bright)),
                 ("bright tone + breath, A5", tone(81, bright, breath=0.6, seed=2))]
        print("Demo: one tone colour at two pitches, then dark against bright at one pitch.\n")
    else:
        cases = [(path, librosa.load(path, sr=SR, mono=True)[0]) for path in args.wavs]

    print(f"{'':<26}{'pitch':>7}{'centroid Hz':>13}{'Meyda bin':>11}{'centroid/pitch':>16}{'breath':>8}")
    for name, y in cases:
        f0, hz, bin_, ratio, breath = measures(y)
        print(f"{name:<26}{librosa.hz_to_note(f0):>7}{hz:>11.0f} Hz{bin_:>11.1f}{ratio:>16.2f}{breath:>7.0%}")
    print(f"\n(Meyda's bin number depends on the FFT size; here {N_FFT} points, so one bin is {SR / N_FFT:.1f} Hz.)")


if __name__ == "__main__":
    main()
