# Study guide scripts

Small runnable companions to `../visual-music-study-guide.md`. Each runs on your own recordings, or with `--demo` on
synthetic flute-like audio so you can try it before recording anything.

| Script | Unit | What it shows |
|---|---|---|
| `unit1_attack_definitions.py` | 1, attack | One note's attack measured three ways: ours (10% to 90%), Essentia's default (20% to 90%), and after an envelope follower; plus the temporal centroid share |
| `unit2_yin_thresholds.py` | 2, pitch | YIN's four steps in plain NumPy, run at the thresholds used by librosa (0.10), our engine (0.12) and aubio (0.15), against pYIN |
| `unit3_onsets.py` | 3, onsets | Four classic onset detection functions (energy, high-frequency content, spectral flux, complex domain) and librosa's detector, scored on staccato, tongued legato and slurred notes |
| `unit4_tone_colour.py` | 4, tone colour | Spectral centroid in Hz, as Meyda's amplitude-weighted bin number, and divided by the pitch; plus breath, on the same colour at two octaves and dark against bright |
| `unit5_align_takes.py` | 5, alignment | Two takes lined up with dynamic time warping: where each note lands, and where you took more or less time |
| `unit6_scale_worlds.py` | 6, theory as numbers | Labels each stretch of a melody with the scale family that fits it best (whole-tone, pentatonic, diatonic, octatonic, chromatic), from typed notes or a recording |
| `scale_map.py` | 6, on Syrinx | The unit 6 method bar by bar on a MusicXML score, with Debussy's written directions and (with `--tension`, needs `pip install partitura`) Herremans and Chew's tonal tension; draws the figure in `../figures/` |
| `segment_worlds.py` | 6, on Syrinx | Splits a score into scale "worlds" with dynamic programming instead of sliding windows; a penalty sets how many, and `--weight` makes short notes count for less |
| `score_notes.py` | 6 | Reads a single-line MusicXML part into notes (bar, beat, pitch, length, grace) and its written directions |
| `flute_synth.py` | all | The synthetic flute used by `--demo` |

## Setup (once)

```bash
cd docs/research/study-guide-scripts
python3 -m venv .venv
.venv/bin/pip install librosa matplotlib
```

Then, for example:

```bash
.venv/bin/python unit3_onsets.py --demo --plot onsets.png
.venv/bin/python unit5_align_takes.py syrinx_take1.wav syrinx_take2.wav --plot path.png
```

Written and checked against librosa 1.0.0 (November 2026). librosa 1.0 made most arguments keyword-only; if you use an
older version and a call fails, that is the likely reason.

## A habit for every script

Write down your guess before you run it. The guess is where the learning happens; the output only tells you whether
you were right.

## What the demos showed when they were written

- **Unit 1:** the firm tongue read 9 ms either way; the swell 203 ms (ours) against 180 ms (20% start); the breath
  attack 23 ms against 17 ms, the biggest relative gap. The follower made even the firm tongue read 29 ms.
- **Unit 2:** stricter thresholds were confident about fewer frames of a slightly breathy note (52% at 0.10, 69% at
  0.12, 93% at 0.15) and pYIN covered 98% with no octave jumps. librosa's own `yin` gave the same answer at every
  threshold, because it falls back to the deepest dip; that is why the script computes the steps itself.
- **Unit 3:** energy and high-frequency content found only 1 of 5 slurred notes; spectral flux found all 13 notes with
  none invented; complex domain found all 13 but invented 5 at note endings.
- **Unit 4:** the same tone colour read 960 Hz at C5 and 1920 Hz at C6, but 1.83 relative to pitch both times; a dark
  A5 (944 Hz) read almost the same in Hz as a bright C5 (960 Hz), and 1.07 against 1.83 relative to pitch. Adding breath
  moved the power-weighted centroid by 1% but Meyda's amplitude-weighted bin by 41%: amplitude weighting gives the
  noise floor much more say.
- **Unit 5:** with known rubato, the path placed each note start within 7 to 27 ms (median 19 ms, under one 23 ms frame).
  A 20% rush lasting a fifth of a second mostly disappears in half-second tempo averages, so read the per-note lines.
- **Unit 6:** on a made-up whole-tone, pentatonic, chromatic line, each section was labelled correctly, with in-between
  labels (octatonic, diatonic) on windows that straddled two sections.
