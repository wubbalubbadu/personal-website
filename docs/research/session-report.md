# Session report: visual music for solo flute (November 2 to 5, 2026)

Everything below is local work on branch `claude/trusting-tesla-1qfjln`. Nothing has been committed, pushed or deployed.
All code and documents are in `see-your-articulation.patch` (42 files), which applies cleanly to the current `main`.

## How to get it onto your laptop

1. Download the zip (it holds the patch, all documents, figures and demo media).
2. In your local copy of the site: `git apply see-your-articulation.patch`, then `npm install` and `npm run dev`.
3. Pages: `http://localhost:3000/lab/articulation` and `http://localhost:3000/lab/raindrops`.
4. Python scripts: see `docs/research/study-guide-scripts/README.md` (needs `pip install librosa matplotlib`, plus
   `partitura` for the Syrinx tension lane).

To undo the patch locally: `git checkout .` and delete the new folders listed below.

## What was built

### Research and guides (`docs/research/`)
| File | What it is |
|---|---|
| `visual-music-open-source.md` | The survey: open-source projects in six areas, with licenses, activity, browser support, a ranked "most useful" list and gaps nobody fills |
| `visual-music-study-guide.md` | A nine-unit study path through real code: for each idea, our file, the exact files in aubio, librosa, Essentia, matchmaker, synctoolbox, partitura, hydra and others, an experiment with the flute, and questions to answer first |
| `reading-list.md` | The key papers per unit, with links |
| `articulation-engine-explained.md` | How the articulation engine listens, stage by stage, with experiments |
| `syrinx-scale-worlds.md` + `figures/syrinx-scale-worlds.png` | A bar-by-bar data map of Syrinx from the studio's own score: scale family, tension, Debussy's markings, and optimal boundaries between "worlds" |
| `study-guide-scripts/` | Nine runnable Python scripts (units 1 to 6 and the Syrinx analysis), each with a `--demo` |

### Code
| Where | What it is | Tested |
|---|---|---|
| `app/lab/articulation/` | "See your articulation": record or open a take; phrase view (loudness, pitch, tone, note blocks, phrases), one note close up with spectrogram, shapes compared, keep a reference and compare takes, save the numbers | 16 engine tests; fake-microphone recording; production build |
| `app/lab/raindrops/` | Raindrops: each note becomes a drop on a pond (pitch sets place, attack the splash, length the rings, ending the fade); constellation of each phrase; demo take; live mode from the microphone; save as a 1080 by 1350 H.264 video; blind-test shuffle | 7 mapping tests, 3 live-versus-recorded tests; fake-microphone live run; video export |
| `tests/` | `articulation-engine.test.mjs`, `raindrops-mapping.test.mjs`, `raindrops-live.test.mjs` | 26 tests, all passing |
| Small edits | Tools page card and preview, `COMPONENTS.md` rows | Lint and type-check clean |

## Main findings so far

- No maintained score follower exists for the browser; matchmaker (Python) is the reference to learn from.
- Bugs found and fixed while testing the engine: deep vibrato read as 17 false tongued notes; a note 45 cents sharp with
  vibrato split into false slurs; slurring into a softer note gave a nonsense attack time; even staccato read as a
  fading phrase.
- Definitions matter: Essentia times attacks from 20% to 90%, ours from 10%; librosa's YIN gives the same answer at any
  threshold; Meyda's spectral flux is flagged in its own code as broken.
- Syrinx: the data finds the form without being told (the opening motive gives identical numbers at bars 1, 3, 26 and
  28), Debussy's markings fall where the data changes, the whole-tone ending begins at bar 31 ("En retenant jusqu'à la
  fin"), and the boundaries are robust while the labels depend on how short notes are weighted.

## Not done, and known limits

- Nothing has been tested with a real flute. All tests use synthetic tones. The cut-offs between words (crisp,
  staccato, tapered) are tuned to those tones, not to you.
- No live score following yet; the visual score (worlds changing at chosen bars) exists only as a draft table in
  `syrinx-scale-worlds.md`.
- Live raindrops have only run against a fake microphone.
- Older tests in the repository (9) fail under plain `node --test` for import reasons unrelated to this work.

## Suggested next steps, in order

1. Record the three reference takes (study guide, unit 0) and run them through the articulation tool and the scripts.
   Note every place the words disagree with your ears.
2. Mark your own colour map of Syrinx, then compare it with `syrinx-scale-worlds.md`.
3. Tune the engine's cut-offs from step 1.
4. Then: offline alignment of a Syrinx recording to the score (unit 5), so the raindrops' world can change at the bars
   you chose. That is the first real visual score.
