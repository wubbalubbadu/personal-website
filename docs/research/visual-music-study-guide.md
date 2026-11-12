# Visual music for solo flute: a study guide through real code

This guide turns the open-source survey (`visual-music-open-source.md`) into a path you can walk. The papers behind
each unit are in `reading-list.md`. Each unit takes one
idea you need for the Syrinx visual score, shows where it lives in the code we built, then sends you to the exact
files in established open-source projects that do the same thing differently, and ends with something to play and
something to answer.

Every file path below was checked against the repository on November 5, 2026 (the default branch at that time).
Projects move, so if a path has changed, search the repository for the function name given.

## How to use it

- One unit at a time, roughly a week each at one or two sessions a week. Units 1 to 4 build on each other; 5 to 9 can
  be taken in any order after that.
- Each unit has the same parts:
  - **Why it matters**: what it does for the Syrinx project.
  - **Ours**: the file in this repository to read first, because you have already seen what it does.
  - **Theirs**: two or three files from other projects, with what to look for.
  - **Compare**: the one difference worth noticing.
  - **Play**: a short experiment with your flute.
  - **Check yourself**: questions to answer in your log *before* looking anything up. If you can answer them, move on.
- Write your answers in the three-line log (tried, learned, next). Do not build a system for the log.

Six units have runnable companion scripts in `study-guide-scripts/` (see its README): unit 1 (attack definitions),
unit 2 (pitch thresholds), unit 3 (onset detection functions), unit 4 (tone colour), unit 5 (aligning two takes) and
unit 6 (scale worlds per passage). Each runs on your recordings or with `--demo`.

## Unit 0: set up your bench (one session)

Install three things, then stop setting up:

1. **This site locally**, with the articulation tool and raindrops (apply the patch, `npm run dev`).
2. **Sonic Visualiser** with the **pYIN / Tony** plugins
   ([Sonic Visualiser](https://github.com/sonic-visualiser/sonic-visualiser), [Tony](https://github.com/sonic-visualiser/tony)).
   This is your second opinion on every measurement.
3. **Python with librosa** ([librosa](https://github.com/librosa/librosa)), for units 2, 3 and 5. A notebook is
   enough.

Record three takes you will reuse all the way through: (a) one note, four staccato then four staccatissimo; (b) a long
tone that tapers; (c) the opening of Syrinx, twice. Keep them; every unit refers back to them.

## Unit 1: loudness and the shape of an attack

**Why it matters.** Articulation is the shape of the loudness over time. Everything the raindrops do with splash,
length and fade comes from this one curve.

**Ours.** `app/lab/articulation/engine.ts`: `loudnessEnvelope` (RMS every ~3 ms over an ~8.7 ms window)
and `describe` (attack from 10% to 90% of the way to the peak, "sounds for" until 12 dB below the peak, release from
70% of the held level).

**Theirs.**
- Essentia, [`src/algorithms/standard/envelope.cpp`](https://github.com/MTG/essentia/blob/HEAD/src/algorithms/standard/envelope.cpp):
  a different kind of envelope, a follower with separate `attackTime` and `releaseTime` parameters (a one-pole smoother
  whose coefficient is `exp(-1 / (samplerate * time))`). It reacts fast going up and slow coming down, like an
  audio compressor's level meter.
- Essentia, [`src/algorithms/sfx/logattacktime.cpp`](https://github.com/MTG/essentia/blob/HEAD/src/algorithms/sfx/logattacktime.cpp):
  attack time as the log of the time between `startAttackThreshold` and `stopAttackThreshold`. The defaults are **20%
  and 90%** of the maximum (see the parameter declarations in
  [`logattacktime.h`](https://github.com/MTG/essentia/blob/HEAD/src/algorithms/sfx/logattacktime.h)); its description
  says the 20% start avoids noise.
- Essentia, [`src/algorithms/sfx/tctototal.cpp`](https://github.com/MTG/essentia/blob/HEAD/src/algorithms/sfx/tctototal.cpp):
  the temporal centroid (where the "centre of mass" of the envelope is in time) divided by the total length. Low means
  the energy is at the front (a percussive, staccato shape), high means it is at the back (a swell).

**Compare.** We start the attack at 10%, Essentia at 20%. Neither is right; they are conventions. A breathy flute
attack spends a long time between 10% and 20%, so the same note gets a slower attack from us than from Essentia.

**Run.** `study-guide-scripts/unit1_attack_definitions.py --demo` measures four kinds of attack all three ways, then
run it on your take (a).

**Play.** Take (a) in the articulation tool. Note the attack of each staccato note. Then predict: if we moved the start
to 20%, would the staccato attacks get shorter by a lot or a little? Why?

**Check yourself.**
1. Why measure an attack from 10% (or 20%) and not from 0%?
2. What would a temporal centroid near 0.5 mean for a single flute note?
3. An envelope follower with a 5 ms attack and a 100 ms release: what would it do to a staccato passage?

## Unit 2: pitch, the YIN family

**Why it matters.** Pitch decides where each drop lands, and pitch is what a monophonic score follower listens to.

**Ours.** `engine.ts`, `measureFrame` (YIN with an FFT-based difference function, threshold 0.12, every ~6 ms), and
the tuner's coarser `app/flute-studio/lib/pitch.ts` (`detectPitch`, threshold 0.15). The articulation guide
(`articulation-engine-explained.md`, Stage 2) walks through the four YIN steps.

**Theirs.**
- aubio, [`src/pitch/pitchyin.c`](https://github.com/aubio/aubio/blob/HEAD/src/pitch/pitchyin.c): the plainest C
  version. `aubio_pitchyin_diff` is step 1, `aubio_pitchyin_getcum` is step 2, and the tolerance (`o->tol = 0.15`) is
  the step 3 threshold. Short enough to read in one sitting.
- librosa, [`librosa/core/pitch.py`](https://github.com/librosa/librosa/blob/HEAD/librosa/core/pitch.py): `yin`
  (default `trough_threshold=0.1`, with `_cumulative_mean_normalized_difference` and `_parabolic_interpolation` as
  separate helpers), and `pyin`, which keeps several pitch candidates per frame and picks a path through them with a
  hidden Markov model. Read `pyin` after unit 5: it is the same idea as an HMM score follower, applied to pitch.
- pitchy, [`index.js`](https://github.com/ianprime0509/pitchy/blob/HEAD/index.js): a different method, McLeod's
  (MPM). `Autocorrelator` does the correlation; `PitchDetector.findPitch` returns a pitch and a "clarity". Clarity is
  the same kind of number as YIN's aperiodicity, turned the other way up.

**Compare.** Three thresholds for the same step: librosa 0.1, ours 0.12, aubio 0.15. A lower threshold is stricter
(fewer frames get a pitch, fewer octave errors); a higher one finds a pitch in breathier sound but guesses wrong more
often.

**Run.** `study-guide-scripts/unit2_yin_thresholds.py` implements the four steps in about 20 lines of NumPy and runs
them at all three thresholds. Read `yin_frame` first, then run it on a breathy note of yours.

**Play.** Play a low C with a breathy, unfocused sound, then focused. In the articulation tool, where does the pitch line
drop out? Do the same in Sonic Visualiser with pYIN. Who keeps the pitch longer in the breathy version?

**Check yourself.**
1. In your own words: why does YIN take the *first* dip below the threshold, not the deepest dip?
2. What does an aperiodicity of 0.4 tell you about a frame of flute sound?
3. Why might a probabilistic tracker like pYIN handle a fast passage better than frame-by-frame YIN?

## Unit 3: where notes begin (onset detection)

**Why it matters.** Every drop starts at an onset, and a score follower needs onsets to know you moved on.

**Ours.** `engine.ts`, `findStarts`: sound after silence; a tongue dip (fall, rise, *and* evidence of interruption:
a deep dip, a pitch dropout, or a spectral-flux spike); a slur (a pitch move of at least three-quarters of a semitone,
held for 24 ms). `app/lab/raindrops/live.ts` runs the same rules live.

**Theirs.**
- aubio, [`src/spectral/specdesc.c`](https://github.com/aubio/aubio/blob/HEAD/src/spectral/specdesc.c): nine "onset
  detection functions" in one file: `energy`, `hfc` (high-frequency content), `complex`, `phase`, `wphase`, `specdiff`,
  `kl`, `mkl`, `specflux`. Each turns a spectrum into one number per frame that jumps at note starts. This file is a
  menu of ideas.
- aubio, [`src/onset/onset.c`](https://github.com/aubio/aubio/blob/HEAD/src/onset/onset.c): how a detection function
  becomes onsets: a threshold (`aubio_onset_set_threshold`), a silence gate (`aubio_onset_set_silence`), and a minimum
  time between onsets (`minioi`). Our `MIN_NOTE_MS` and gate are the same two ideas.
- librosa, [`librosa/onset.py`](https://github.com/librosa/librosa/blob/HEAD/librosa/onset.py): `onset_strength`
  (spectral flux on a mel spectrogram), `onset_detect` (peak picking), and `onset_backtrack`, which moves each onset
  back to the preceding energy minimum. That is exactly why our tongued notes start *at the bottom of the dip*.
- A cautionary read: Meyda, [`src/extractors/spectralFlux.ts`](https://github.com/meyda/meyda/blob/HEAD/src/extractors/spectralFlux.ts).
  The file says at the top that it is not type-checked "because there are major issues with it", and its loop starts
  at a negative index. Popular code is not automatically correct; that is why we test against known inputs.

**Compare.** aubio and librosa look for *rises* in a detection function; ours also needs *evidence that the tone was
interrupted*. That came from a failure: deep vibrato produced 17 false tongued notes until the evidence rule was added
(see `tests/articulation-engine.test.mjs`, the vibrato tests).

**Run.** `study-guide-scripts/unit3_onsets.py --demo --plot onsets.png` draws four of aubio's detection functions
under the sound and scores them on staccato, tongued and slurred notes. Then run it on your take (a).

**Play.** Double-tongue four fast notes on one pitch, then single-tongue them slowly. In the articulation tool, are all
eight found? In the loudness lane, how deep are your fast dips compared with your slow ones?

**Check yourself.**
1. Why does a flute slur defeat an energy-based onset detector?
2. What does `onset_backtrack` fix, and when would you *not* want it?
3. Pick two of aubio's nine detection functions. Which would suit flute tonguing better, and why?

## Unit 4: tone colour in numbers

**Why it matters.** Breathiness becomes mist, brightness could become colour. Tone is what a flutist hears first and
what visualizers usually ignore.

**Ours.** `engine.ts`, the second half of `measureFrame`: brightness (spectral centroid divided by the pitch), breath
(energy *between* the harmonics), flatness, flux. `NoteSpectrogram.tsx` draws the same spectrum as a picture.

**Theirs.**
- Meyda, [`src/extractors/spectralCentroid.ts`](https://github.com/meyda/meyda/blob/HEAD/src/extractors/spectralCentroid.ts)
  and [`spectralFlatness.ts`](https://github.com/meyda/meyda/blob/HEAD/src/extractors/spectralFlatness.ts): short,
  readable versions of two of ours.
- Essentia's spectral descriptors in [`src/algorithms/spectral/`](https://github.com/MTG/essentia/tree/HEAD/src/algorithms/spectral),
  for example [`flatnessdb.cpp`](https://github.com/MTG/essentia/blob/HEAD/src/algorithms/spectral/flatnessdb.cpp)
  (browse the folder; read one you have not met).

**Compare.** Meyda's centroid (`mu(1, ampSpectrum)` in
[`extractorUtilities.ts`](https://github.com/meyda/meyda/blob/HEAD/src/extractors/extractorUtilities.ts)) is a *bin
number*, weighted by amplitude; multiply by sample rate divided by buffer size to get Hz. Ours is weighted by power, in
Hz, then divided by the pitch, so a high note is not "brighter" just because it is higher. Which one matches what you
mean by a bright sound?

**Run.** `study-guide-scripts/unit4_tone_colour.py --demo`, then give it three files of yours (one held note each).

**Play.** One note three ways (covered, normal, open), using "Keep as a reference" in the articulation tool. Does the
brightness number agree with your ears? Try the same with a different microphone or distance: how much does the number
move?

**Check yourself.**
1. Why divide the centroid by the pitch?
2. Why is "breath" measured between harmonics and not as total high-frequency energy?
3. What would make brightness numbers useless for comparing two different days?

## Unit 5: following the score (alignment)

**Why it matters.** This is the heart of a visual score: knowing *where in Syrinx* you are, so the visuals can change at
the right bar. Nothing in our code does this yet; this unit is where you learn it.

**Theirs, in reading order.**
1. synctoolbox, [`synctoolbox/dtw/core.py`](https://github.com/groupmm/synctoolbox/blob/HEAD/synctoolbox/dtw/core.py):
   offline dynamic time warping. `compute_warping_path` builds the accumulated cost and backtracks the best path.
   Learn DTW here, where it is not yet complicated by "online".
2. matchmaker, [`matchmaker/dp/oltw_dixon.py`](https://github.com/pymatchmaker/matchmaker/blob/HEAD/matchmaker/dp/oltw_dixon.py):
   online time warping after Dixon (2005). Look for the bounded search band (`self.w`, from `window_size` seconds) and
   `max_run_count`, which stops the path running too long in one direction.
3. matchmaker, [`matchmaker/dp/oltw_arzt.py`](https://github.com/pymatchmaker/matchmaker/blob/HEAD/matchmaker/dp/oltw_arzt.py):
   the default follower. `get_window` returns the search window; `window_size` and `step_size` set how far ahead it
   looks and how far it moves.
4. matchmaker, [`matchmaker/prob/hmm.py`](https://github.com/pymatchmaker/matchmaker/blob/HEAD/matchmaker/prob/hmm.py):
   `PitchHMM`, the probabilistic family. The file also holds several ways to build a transition matrix
   (`gaussian_transition_matrix`, `jiang_transition_matrix`, `gumbel_transition_matrix` and more): each is a different
   belief about how a performer moves through a score.
5. The contract every follower meets: [`HOW_TO_MAKE_CUSTOM_SCORE_FOLLOWERS.md`](https://github.com/pymatchmaker/matchmaker/blob/HEAD/HOW_TO_MAKE_CUSTOM_SCORE_FOLLOWERS.md).
   A follower subclasses `OnlineAlignment` and implements `step(features)`. That is the whole interface.
6. To get Syrinx into the same form: partitura, [`partitura/io/importmusicxml.py`](https://github.com/CPJKU/partitura/blob/HEAD/partitura/io/importmusicxml.py).
7. For a compact C++ reading: rvdtw~, [`oDTW/oDTW.h`](https://github.com/RVirmoors/RVdtw-/blob/HEAD/oDTW/oDTW.h)
   (class `oDTW`, with `getBackPath` and markers). GPL, so read, do not copy.

**Compare.** DTW (items 1 to 3) finds the cheapest path through a grid of "how different is this moment from that
moment". The HMM (item 4) keeps a probability for every score position and updates it. DTW is easier to picture; the
HMM is easier to make tolerant of rubato and fermatas, because the transition matrix says how likely a long hold is.

**Run.** `study-guide-scripts/unit5_align_takes.py --demo --plot path.png` first, to see DTW recover rubato it was
told about. Then run it on your two Syrinx takes.

**Play.** Align your two Syrinx takes to each other offline (the script above uses `librosa.sequence.dtw` on chroma).
Plot the path. Where does it bend? Those bends are your rubato: the places you took time differently in the two takes.

**Check yourself.**
1. Why can't offline DTW be used live, and what does online time warping give up to run live?
2. In an HMM follower, what does a high self-transition probability mean musically?
3. Syrinx's opening motive returns later. Why is that hard for any follower, and what would help?

## Unit 6: music theory as numbers

**Why it matters.** The project's promise is visuals driven by meaning (scale types, tension, Larson's forces) rather
than decibels. This unit is where theory becomes something a program can compute.

**Ours.** `app/lab/raindrops/rain.ts`, `place`: the pitch-class circle, where a whole-tone scale becomes a hexagon. A
small, honest start.

**Theirs.**
- partitura, [`partitura/musicanalysis/tonal_tension.py`](https://github.com/CPJKU/partitura/blob/HEAD/partitura/musicanalysis/tonal_tension.py):
  Herremans and Chew's "tension ribbons" on the spiral array, Apache-licensed, so you may reuse it. Read
  `helical_to_cartesian` (the helix), `major_key` and `minor_key` (key points), `cloud_diameter` and
  `center_of_effect`, then the `CloudDiameter` and `TensileStrain` classes. Start here.
- midi-miner, [`tension_calculation.py`](https://github.com/ruiguo-bio/midi-miner/blob/HEAD/tension_calculation.py):
  Elaine Chew's spiral array in code. `pitch_index_to_position` places each pitch on a helix; `major_key_position` and
  `minor_key_position` build key points from them; `cal_key` finds the key; `cal_diameter` and the centroid functions
  measure tension. GPL; read for the idea.
- tonnetz-viz, [`js/tonnetz.js`](https://github.com/cifkao/tonnetz-viz/blob/HEAD/js/tonnetz.js): the Tonnetz as a
  live drawing, with two layouts (`LAYOUT_RIEMANN`, `LAYOUT_SONOME`) and "ghost" notes that linger for `ghostDuration`
  ms after release, the same idea as our constellation.
- Larson's *Musical Forces* (2012) for gravity, magnetism and inertia; no public code exists
  ([Project MUSE](https://muse.jhu.edu/book/13634)).

**Compare.** The spiral array is built for harmony: chords and keys. A solo flute line implies harmony without stating
it. Where does midi-miner's approach break for Syrinx, and what would you feed it instead?

**Run.** `study-guide-scripts/unit6_scale_worlds.py` labels each stretch of a melody with the scale family that fits
it best. Type in the opening of Syrinx yourself (`--notes "Bb5:0.6 ..."`), or give it a recording. Then
`study-guide-scripts/scale_map.py` runs the same method bar by bar on the studio's Syrinx score, with tension from
partitura; the results and their limits are written up in `syrinx-scale-worlds.md`. Make your own map of the piece
before you read that note.

**Play.** Write the first two bars of Syrinx as MIDI numbers by hand. Mark which notes belong to a whole-tone set,
which to a pentatonic set, which to neither. Then look at where they land on the raindrops circle (turn on note names).

**Check yourself.**
1. Why does a whole-tone scale make a hexagon on the pitch-class circle, and what shape does a diminished seventh make?
2. In your words, Larson's "gravity" and "magnetism": how would you compute each for one note?
3. What does midi-miner need that a monophonic recording does not give you?

## Unit 7: from music to pictures (mapping)

**Why it matters.** A visual score is a mapping: which musical quality becomes which visual quality. The mapping is the
artwork; the code is plumbing.

**Ours.** `app/lab/raindrops/rain.ts`: the mapping table at the top of the file, then `dropFor` and `drawPond`.

**Theirs.**
- hydra-synth, [`src/glsl/glsl-functions.js`](https://github.com/hydra-synth/hydra-synth/blob/HEAD/src/glsl/glsl-functions.js):
  about fifty named operators (`osc`, `noise`, `voronoi`, `shape`, `kaleid`, `rotate`, `modulate`, `blend`, `colorama`
  and more), each a small piece of shader code with named arguments. Read it as a *vocabulary*: a visual language
  where pieces combine.
- butterchurn, [`src/visualizer.js`](https://github.com/jberg/butterchurn/blob/HEAD/src/visualizer.js): the Milkdrop
  model, where presets map audio energy to shader parameters. Read it to understand what you are *not* doing.

**Compare.** Hydra's operators take numbers; butterchurn feeds them from FFT energy; ours feeds them from per-note
measurements. A visual score would feed them from *the score position* (unit 5) plus the measurements.

**Play.** Before writing any code, write a two-column table for one Syrinx passage: musical event or quality on the
left, visual change on the right. Then play the passage and decide whether the table *feels* right while you play.

**Check yourself.**
1. Name one mapping in `rain.ts` you disagree with, and what you would change it to.
2. What is the difference between mapping *loudness* to size and mapping a *crescendo* to size?
3. How would a reusable visual score file let someone else perform your visuals?

## Unit 8: bodies and air (the teaching side)

**Why it matters.** For the later teaching guide: showing posture, fingers and embouchure, not just sound.

**Theirs.**
- Flute_Vision_CV, [`main.py`](https://github.com/G-1592/Flute_Vision_CV/blob/HEAD/main.py): one flutist's MediaPipe
  project, split into modules: `hand_tracking` (finger values, menu buttons), `posture` (`face_detector`,
  `analyse_the_posture`), `flute_fingering` (`notes`, `flute_fingerings`), `practice` (`check_note`), and `UI`. A good
  model of how to structure such a tool. No license, so read only.
- MediaPipe ([repository](https://github.com/google-ai-edge/mediapipe)): the hand and face landmark tasks, which also
  run in the browser.
- Heller et al., *An Augmented Flute for Beginners* ([NIME 2017](https://nime.org/proc/nime2017_fheller/)): sensors
  for the jet angle, because a camera cannot see the air.

**Compare.** Flute_Vision_CV works without sound; our tools work without a camera. A teaching tool probably needs both:
which question needs which sense?

**Play.** Film yourself from the side for 30 seconds of long tones. Watch for head and elbow movement. Then ask: could a
pose tracker see the thing your teacher corrects most often?

**Check yourself.**
1. Which embouchure problems are visible to a camera, and which only audible?
2. Why does Flute_Vision_CV calibrate per user before judging finger angles?

## Unit 9: live, latency, and testing whether visuals mean anything

**Why it matters.** The Vision Pro goal is one listener watching one live performer. Live means latency; a listener
means you can test.

**Ours.** `app/lab/raindrops/live.ts`: the header lists when each fact is known live (after-silence starts in ~10 ms,
tongued starts ~45 ms late, endings only at the end). `tests/raindrops-live.test.mjs` checks live and recorded agree.

**Theirs.**
- WebXR samples ([immersive-web/webxr-samples](https://github.com/immersive-web/webxr-samples)): how a page enters
  an immersive session.
- Erdmann, von Berg and Steffens (2025), [Frontiers in Virtual Reality](https://www.frontiersin.org/articles/10.3389/frvir.2025.1552321/full):
  a mixed-reality visualization of a live performance, tested against a baseline with *random* colour and movement.

**Compare.** Their baseline is the method to steal. If listeners cannot tell your score-driven visuals from random
ones, the visuals are decoration.

**Run.** On `/lab/raindrops`, save one video of a take with the real mapping, then tick "Blind test: shuffle which note
gets which look" and save another. The shuffled one keeps every drop on time but moves each note's look (place, size,
splash, rings, fade, mist, shimmer) to another note (`shuffleLooks` in `rain.ts`).

**Play.** Show both videos to a friend without saying which is which (rename the files; the shuffled one says
"shuffled" in its name). Can they tell which follows the music? Ask them how, too: their reason tells you which mapping
carries meaning.

**Check yourself.**
1. What is the largest visual delay a listener would notice when watching a flutist's tongue start a note?
2. Why is a random baseline more convincing than asking "did you like it?"

## A capstone, when units 1 to 7 are done

Make a one-minute video of the opening of Syrinx where the pond's world changes at two places in the score that you
choose for musical reasons (for example, where the whole-tone colour changes). Use offline alignment (unit 5) to find
those places in your recording, the raindrops mapping (unit 7) for the drops, and the random-baseline test (unit 9) on
one friend. That video is the first real visual score, and it is worth posting.

## Progress checklist

- [ ] Unit 0: bench set up, three takes recorded
- [ ] Unit 1: loudness and attack
- [ ] Unit 2: pitch
- [ ] Unit 3: onsets
- [ ] Unit 4: tone colour
- [ ] Unit 5: alignment
- [ ] Unit 6: theory as numbers
- [ ] Unit 7: mapping
- [ ] Unit 8: bodies and air
- [ ] Unit 9: live and testing
- [ ] Capstone video
