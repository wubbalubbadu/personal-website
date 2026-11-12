# How "See your articulation" listens

A guide to the engine behind `/lab/articulation`, written to learn from, not just to use. Each stage
says what it does, what it means for a flutist, where it lives in the code, and one small experiment to try with your
own flute. The code is `app/lab/articulation/engine.ts`; every number below is a named constant at the
top of that file.

Built November 4, 2026. Tested on synthetic flute-like tones (`tests/articulation-engine.test.mjs`), not yet on a
real flute. Your recordings are the real test.

## The big picture

The tuner (`lib/pitch.ts`) asks one question about 24 times a second: which note are you holding? This engine asks
different questions about a whole recording at once: where does each note begin, how fast does it grow, how long does
it really sound, how does it end, and how does the phrase rise and fall? Those need a much finer look, so it measures:

| What | How often | Why that often |
|---|---|---|
| Loudness | every 2.9 ms | A tongued attack takes about 10 to 60 ms. You need many points inside it to time it. |
| Pitch (YIN) | every ~6 ms | Fine enough to see the pitch settle after an attack, cheap enough for a minute of audio. |
| Tone colour (spectrum) | every ~6 ms | Same frames as pitch, so brightness and breath line up with the notes. |

Then it turns those three streams into notes, and notes into phrases.

## Stage 1: the loudness envelope

**What it does.** Every 2.9 ms it takes the last ~8.7 ms of sound and computes its RMS (root mean square: square every
sample, average, square root). That is "how much energy is here right now". It also keeps it in decibels, because
hearing works in ratios: 6 dB is roughly twice the amplitude.

**Why 8.7 ms and not 2.9.** A window shorter than a few cycles of the wave ripples with the wave itself. A low C is
about 3.8 ms per cycle, so 8.7 ms holds two or more cycles and a steady tone reads as steady. (The first version used
5.8 ms and the screenshots showed a sawtooth on long tones; widening fixed it.)

**Code:** `loudnessEnvelope`.

**Try this.** Play one long tone with no vibrato and one with your normal vibrato. Look at the grey loudness area in
the phrase view. How much does your vibrato move the loudness, not just the pitch? Guess first, then look.

## Stage 2: pitch with YIN

YIN (de Cheveigné and Kawahara, 2002) finds the period of a repeating wave in four steps:

1. **Difference function.** Shift the sound by τ samples and measure how different it is from itself. When τ equals
   one period, each cycle lines up with the next and the difference dips toward zero.
2. **Cumulative mean normalisation.** Divide each difference by the average of all the smaller shifts. This removes
   the meaningless dip at τ = 0 and turns the curve into a 0 to 1 score (near 0: clean repeat, near 1: no repeat).
3. **Absolute threshold.** Take the *first* τ whose score falls under 0.12, then slide down to the bottom of that dip.
   The first dip, not the deepest: the deepest is sometimes two periods long, which would read an octave low.
4. **Parabolic interpolation.** Fit a curve through the dip's three lowest points to find the period between whole
   samples. Pitch = sample rate / period.

The score at the chosen τ is the **aperiodicity**. Above 0.3 the frame is treated as noise, not tone: breath, a key
click, the tongue's consonant.

**One trick in the code.** Step 1 is computed with an FFT (difference = energy + shifted energy − 2 × correlation),
which is many times faster than shifting and subtracting directly. That is why a minute of audio takes about three
seconds instead of a minute.

**Code:** `measureFrame`, first half. The tuner's `detectPitch` uses the same idea at a coarser rate.

**Try this.** Play a harmonic (finger low C, overblow to G5) and the normal G5. Does the pitch line treat them the
same? What does the Tone row say about each?

## Stage 3: tone colour from the spectrum

The same ~23 ms frame goes through an FFT, which splits it into frequencies (about 43 Hz apart). From that:

- **Brightness** = spectral centroid ÷ pitch. The centroid is the "centre of mass" of the energy across frequencies.
  Dividing by the pitch makes notes in different registers comparable: 1.0 means the energy sits at the fundamental,
  2.0 means it centres around the second partial. Higher is brighter.
- **Breath** = the share of energy below 8 kHz that is *not* on a harmonic (a multiple of the pitch). Air noise fills
  the gaps between harmonics; a focused tone leaves them empty.
- **Attack noise** = breath measured only in the first 25 ms: the "chiff" of the tongue and the air before the tone
  locks in.
- **Spectral flux** = the share of the spectrum that is new since the last frame. Near zero for a held tone (even with
  vibrato, about 0.2 at most), large when sound comes back after the tongue stops it.

The spectrogram in the close-up draws the same idea as a picture: overtones are horizontal lines, breath is haze
between them, the tongue is a short vertical smear at the start.

**Code:** `measureFrame`, second half; `spectrogram`.

**Try this.** Play the same note three ways: with a covered, dark sound; with your normal sound; and with a bright,
open sound. Use "Keep as a reference" on the first, then compare. Does the Tone row agree with your ears? If not,
that is worth knowing too: brightness numbers depend on the microphone.

## Stage 4: from streams to notes

**The gate.** The quietest 10% of the recording is taken as the room. Anything 12 dB above it (but at most 42 dB below
the loudest moment) counts as sound. Gaps shorter than 12 ms inside a sound are filled; sounds shorter than 30 ms are
dropped as clicks.

**A note starts** in one of three ways:

1. **After silence.** Sound begins after the gate closed.
2. **Tongued.** The loudness falls at least 4 dB and rises again at least 6 dB within 45 ms, *and* there is evidence the
   tone was interrupted: the dip is deep (12 dB or more both ways), or the pitch drops out at the dip, or the spectrum
   jumps (flux) as the sound returns.
3. **Slurred.** The pitch moves at least three quarters of a semitone away from where the last note settled and holds
   the new pitch for 24 ms.

Two of those rules came from failures found while building:

- Without the "evidence of interruption" rule, a deep fast vibrato (7 Hz, swinging about 12 dB) was read as 17 tongued
  notes. Vibrato dips the loudness but never interrupts the tone.
- Without the three-quarter-semitone rule, a note played 45 cents sharp with vibrato kept crossing into the next
  semitone and was read as a string of slurs.

**Code:** `soundRegions`, `findStarts`.

**Try this.** Play four notes double-tongued fast, then the same four single-tongued slowly. Does it find every note in
both? If it misses some in the fast version, look at the loudness lane: how deep are your dips? That number is your
tongue's "gap", and it is a real thing to practise.

## Stage 5: measuring each note

| Measure | Definition | Flute meaning |
|---|---|---|
| Attack | Time from 10% to 90% of the way from where the note started to its peak | How firm the tongue (or breath) start is. Crisp < 18 ms, clean < 45, gentle < 110, otherwise swelled. |
| No new attack | A slurred-in note that does not grow by at least 3 dB | The air never stopped, so there is nothing to time. |
| Sounds for | From the start until the note falls 12 dB below its peak | How long the note really sounds, not how long it is written. |
| Fill | Sounds for ÷ time until the next note starts | The heart of staccato. Full ≥ 88%, detached ≥ 62%, staccato ≥ 38%, staccatissimo below. |
| Release | From falling under 70% of the held level until the sound is gone (10% of peak) | Stopped < 30 ms (tongue or air stop), natural < 90, otherwise tapered. |
| Held | Slope of the loudness across the middle, dB per second | Does the note hold, grow, or die away? |
| Settles in | Time until the pitch stays within 35 cents of the note for three frames | How fast the pitch locks after the attack. |
| Wavers | Spread of the pitch in the held part, cents | Vibrato width plus instability. |

Each of these is a **convention**, not a fact about music. The 10% to 90% attack is the standard in audio research
because the very start and the very top are hard to pin down. The cut-offs between words were chosen to match the test
tones, not real players. Your recordings will tell you whether they fit.

**Code:** `describe`, `lengthWord`.

## Stage 6: phrases

A silence of 350 ms or more is treated as a breath and starts a new phrase. Shorter silences, like the gaps between
staccato notes, stay inside the phrase.

The phrase's loudness line goes through **each note's peak**, plus points along any long note so a swell inside one
note still shows. It does not follow the raw envelope, because the silences between staccato notes are articulation,
not a diminuendo. (The first version followed the smoothed envelope and called an even staccato passage "fades".)

The shape word compares the average loudness of the phrase's three thirds: an arch if the middle is at least 2 dB above
both ends, grows or fades if the ends differ by 3 dB, dips if the middle is lower, otherwise level.

**Code:** `describePhrase`.

**Try this.** Play the opening of Syrinx twice: once as you would perform it, once thinking only "louder toward the
high note". Before you look, predict where each version's loudest moment falls as a percentage of the phrase.

## What it cannot do yet

- **Room echo.** Reverb keeps sound going after you stop, so releases read longer and staccato reads fuller in a live
  room. Record close to the flute, or in a drier room, when you compare.
- **Very fast slurred runs.** Notes shorter than about 45 ms merge; the slur rule needs 24 ms of steady pitch.
- **Extended techniques.** Flutter tongue, multiphonics, whistle tones and jet whistles are not modelled. Flutter will
  probably read as many tongued notes.
- **Phone microphones.** The recorder turns off echo cancellation, noise suppression and automatic gain, but some
  devices apply processing anyway, which flattens dynamics and can shorten releases.
- **Absolute numbers.** Brightness and breath depend on the microphone and distance. Compare takes recorded the same
  way, not numbers from different setups.

## Checking it against reality

Before trusting a threshold, check it on a recording you know:

1. Open the recording in Sonic Visualiser (free) and add the "Tony" or pYIN note plugin to see another tool's notes.
2. Compare the note starts with what this tool found. Where they disagree, look at that moment in both.
3. Save the numbers from this tool ("Save the numbers (JSON)") and write down the cases where the word was wrong. That
   list is how the cut-offs should change.

## From here to the raindrops

The saved JSON already has what a raindrop needs for each note: `midi` (where it falls), `peakDb` (size), `attackMs`
(how sharply it lands), `soundedMs` and `fill` (how long it lives), `releaseMs` and `release` (how it fades), and
`breathiness` (how misty it is). The phrase's `contour` and `shape` could set the weather. The raindrops page now does
this: see `/lab/raindrops` and its mapping in `app/lab/raindrops/rain.ts`. It works on a recording; live from the
microphone is the next step.

## Questions to answer from your own recordings

1. What attack time do your staccato notes have when they sound good to you? Is it under 18 ms, or does "crisp" not
   match what you hear?
2. Is your staccatissimo really under 38% fill, or do you play it more by the attack than by the length?
3. When you taper a phrase ending, how long is the release? Does it change between a soft and a loud ending?
4. Which of the cut-offs would you move first, and in which direction?
