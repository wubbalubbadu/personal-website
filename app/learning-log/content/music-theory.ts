import type { Unit } from "./types";

/**
 * Lecture 0 — "Music Theory Fundamentals". Transcribed from lecture notes
 * (originally a mix of Chinese and Japanese). This is the shared vocabulary the
 * later units lean on: sound gets *names* (notes, intervals, scales, keys), then
 * those names get *used* (melody, chords, rhythm).
 */
export const musicTheoryUnit: Unit = {
  id: "music-theory",
  title: "Music Theory Fundamentals",
  blurb:
    "Lecture 0. Music theory is a way of turning sound into data you can talk about. First the names — notes, intervals, scales, keys, timbre — then how they're used: melody, chords, rhythm.",
  chapters: [
    // ── 1 · The names of sound ─────────────────────────────────────
    {
      id: "names-of-sound",
      title: "The names of sound",
      summary:
        "Theory = a summary of what sounds good. It works in three layers — the *names* of sounds, their *usage*, and *style*. This lecture is all about the names: notes, octaves, intervals, scales, keys, and timbre.",
      slides: [
        {
          id: "what-is-theory",
          title: "Theory is sound, turned into language",
          lede: "Three layers: names → usage → style. Lecture 0 is the bottom layer.",
          blocks: [
            {
              type: "keypoints",
              items: [
                "**Music theory = a summary of the patterns behind sounds people find pleasant.**",
                "It is a way of *datafying* — putting into language — something you normally just hear.",
              ],
            },
            {
              type: "keypoints",
              title: "Layer 1 · Names of sounds",
              items: [
                "verse / chorus · triple / quadruple metre · downbeat / backbeat",
                "major / minor · major chord / minor chord · stepwise vs leap motion",
                "seventh chord · parallel key · polyrhythm · metric modulation · side-stepping",
              ],
            },
            {
              type: "keypoints",
              title: "Layer 2 · Usage of sounds",
              items: [
                "the pre-chorus chord · an uplifting chord vs a grieving one",
                "an East-Asian scale · an EDM scale · a scale from current rock",
                "an emotional melody · a floating melody · a lazy groove · a summer groove · a brisk groove",
              ],
            },
            {
              type: "keypoints",
              title: "Layer 3 · Style",
              items: [
                "classical · modern jazz · modern composition technique · folk idioms",
                "differences between dance genres · Western vs Eastern tendencies · what makes J-pop sound like J-pop",
                "the fingerprint of Chopin, of Asian Kung-Fu Generation, of Yasutaka Nakata",
              ],
            },
            {
              type: "aside",
              variant: "note",
              title: "Scope",
              text: "Everything below is Layer 1 — just the vocabulary. Usage and style are what the rest of the course builds on top of it.",
            },
          ],
        },
        {
          id: "note-names",
          title: "Note name + octave number",
          lede: "哆瑞咪发嗦啦西哆 = 1 2 3 4 5 6 7 1 = C4 D4 E4 F4 G4 A4 B4 C5",
          blocks: [
            {
              type: "prose",
              text: "Frequency determines pitch. Rather than say *\"give me a 440 Hz tone\"*, musicians named the useful frequencies: **C, D, E, F, G, A, B**. Those seven letters are the **note names**. `C` is the note we sing as *Do* — it tells you the note's basic position in the scale.",
            },
            {
              type: "keypoints",
              title: "Two parts to a full name — e.g. C4",
              items: [
                "**Note name** (`C`) — the repeating role, like a day of the week. The brain hears C4 and C5 as *the same note*.",
                "**Octave number** (`4`) — *which* C, an absolute position, like \"Wednesday the 15th\". Middle C on a piano is **C4**.",
              ],
            },
            {
              type: "keypoints",
              title: "Accidentals",
              items: [
                "**♯ (sharp)** — raise the pitch a half step. On a keyboard, the black key just above a white one.",
                "**♭ (flat)** — lower the pitch a half step.",
              ],
            },
            {
              type: "aside",
              variant: "intuition",
              title: "Why an octave feels like \"the same note\"",
              text: "An octave is exactly a 2:1 frequency ratio. C4 ≈ 261 Hz, C5 ≈ 522 Hz (261 × 2). Double any frequency and you land on the same letter, one octave up.",
            },
          ],
        },
        {
          id: "intervals",
          title: "Intervals are frequency ratios",
          lede: "The distance between two notes is really the ratio of their frequencies.",
          blocks: [
            {
              type: "keypoints",
              title: "The simple ratios",
              items: [
                "**Octave** — 2:1.",
                "**Perfect fifth** — ≈ 3:2. Do = C4 ≈ 261.6 Hz, Sol = G4 ≈ 392.0 Hz, and 392.0 / 261.6 ≈ 1.5. This is why C→G and D→A feel like the *same distance*.",
                "**Perfect fourth** — 4:3.",
                "**Major third** — 5:4, and so on with small whole-number ratios.",
              ],
            },
            {
              type: "prose",
              text: "**But you can't tune to pure ratios and still change key.** A chord tuned perfectly in one key drifts out of tune in another. Modern music fixes this with **equal temperament**: split the octave (2:1) into **12 mathematically equal semitones**. Every interval except the octave is then a deliberate approximation.",
            },
            {
              type: "formula",
              tex: "\\text{one semitone} = 2^{1/12} \\approx 1.05946",
              caption: "Multiply a frequency by this twelve times and you have doubled it — one octave.",
            },
            { type: "widget", widget: "interval-ratios", caption: "Play the intervals, see the ratio, and compare pure (just) tuning against equal temperament — the small difference is what \"out of tune\" sounds like." },
            {
              type: "keypoints",
              title: "Degree → interval → semitones",
              items: [
                "1st · unison · 0 — — — 5th · perfect fifth · 7",
                "2nd · minor / major 2nd · 1 / 2 — — — 6th · minor / major 6th · 8 / 9",
                "3rd · minor / major 3rd · 3 / 4 — — — 7th · minor / major 7th · 10 / 11",
                "4th · perfect 4th · 5 — — aug 4th / dim 5th (tritone) · 6 — — — 8th · octave · 12",
              ],
            },
          ],
        },
        {
          id: "scales",
          title: "Scales",
          lede: "An ordered set of note names, built by a fixed interval pattern.",
          blocks: [
            {
              type: "prose",
              text: "A **scale** is an ordered set of note names whose construction rule is a pattern of **intervals**. Each member gets an ID number by its musical function — its **degree**. Keep the interval pattern the same and it sounds \"the same\" from any starting note; the pattern itself is just a subjective rule people validated as pleasant over time.",
            },
            {
              type: "keypoints",
              title: "Common patterns (W = whole step, H = half step)",
              items: [
                "**Natural major** — scale degrees 1 2 3 4 5 6 7 — pattern **W W H W W W H**.",
                "**Chinese pentatonic** — 1 2 3 5 6 — pattern **W W (m3) W (m3)**.",
                "Others: natural minor, Phrygian, Dorian, …",
              ],
            },
            {
              type: "keypoints",
              title: "Two degrees do most of the emotional work",
              tone: "result",
              items: [
                "**1st degree — the tonic.** Stability and resolution. Where pieces end.",
                "**5th degree — the dominant.** Maximum tension. Where the pre-chorus lift comes from.",
              ],
            },
            { type: "widget", widget: "scale-explorer", caption: "Pick a root and a scale pattern; the keyboard lights up and plays it. Try the same pattern from different roots — same tune, different pitch." },
          ],
        },
        {
          id: "keys",
          title: "Key & key signature",
          lede: "Key = a centre note + a scale structure around it.",
          blocks: [
            {
              type: "prose",
              text: "Major and minor differ only in **which note is the centre**. Centre everything on C → C major. Centre on A → A minor (same seven white keys). That central note is the **tonal centre**, or **tonic**.",
            },
            {
              type: "keypoints",
              items: [
                "**Major** — Do Re Mi Fa So La Si — bright.",
                "**Minor** — C D ♭E F G ♭A ♭B — darker.",
                "If a piece has a clear centre that everything else orbits, it has **tonality**. Most music does.",
              ],
            },
            {
              type: "aside",
              variant: "note",
              title: "Atonal music, and why games need it",
              text: "Since the 20th century composers also write *atonal* music — no centre. It shows up in horror, thrillers, and RPG boss fights. Film music is *linear*: the audience rides the director's timeline, cue A always leads to cue B. Game music is *non-linear*: the player decides. Loop the village theme for an hour without grating; then cut to battle music within 0.1 s of a boss appearing.",
            },
            {
              type: "keypoints",
              title: "Modulation — changing key mid-song",
              items: ["the working scale changes (so the available chords change)", "the centre note moves"],
            },
            {
              type: "prose",
              text: "**Key signature.** Any key other than C major / A minor needs sharps or flats on specific notes. Writing an accidental next to every note would be exhausting — E major would be covered in sharps — so the composer declares them once at the start of the staff instead.",
            },
          ],
        },
        {
          id: "timbre-waveform",
          title: "Timbre I — waveform",
          lede: "Frequency → pitch. Amplitude → loudness. Waveform → timbre.",
          blocks: [
            {
              type: "prose",
              text: "On a classic synth you pick a wave *shape* with a switch, then build a sound on top of it. The shape decides which **harmonics** (integer multiples of the fundamental) are present and how loud.",
            },
            {
              type: "keypoints",
              title: "The four shapes + noise",
              items: [
                "**Sine** — quiet, transparent. No harmonics at all.",
                "**Triangle** — slightly muffled. Odd harmonics only, nth at 1/n² of the fundamental.",
                "**Square** — bright but hollow. Odd harmonics only, nth at 1/n.",
                "**Sawtooth** — glaring and rich. *All* integer harmonics, nth at 1/n.",
                "**White noise** — hiss. Every frequency band at once, fluctuating randomly.",
              ],
            },
            { type: "widget", widget: "waveform-timbre", caption: "Switch shapes; see the wave and its harmonic bars; play it. The 1/n vs 1/n² roll-off is why triangle sounds so much softer than saw." },
            {
              type: "prose",
              text: "Put a plucked bass string through a spectrum analyser and you see peaks at **55 Hz, 110, 165, 220, 275, …** — every instrument with a clear pitch does this. The lowest peak is the **fundamental**; its integer multiples are the **harmonics**. Real instruments also have energy at *non*-integer frequencies; all of the extra content above the fundamental is collectively the **overtones**.",
            },
          ],
        },
        {
          id: "timbre-envelope",
          title: "Timbre II — the amplitude envelope",
          lede: "The other half of timbre is how loudness changes over time.",
          blocks: [
            {
              type: "prose",
              text: "Even one snare hit has a shape in time — some sounds vanish instantly (*tat!*), others ring on (*hmmm*). The **amplitude envelope** is that loudness-vs-time curve. A voice or a whistle shapes it continuously with breath; a classic synth breaks it into four knobs — **ADSR**.",
            },
            { type: "widget", widget: "adsr", caption: "Drag Attack / Decay / Sustain / Release, watch the curve, and play a note through it. Fast attack + short decay = a pluck; slow attack + high sustain = a pad." },
            {
              type: "keypoints",
              title: "ADSR",
              items: [
                "**Attack** — time from note-on to peak volume.",
                "**Decay** — time to fall from the peak down to the sustain level.",
                "**Sustain** — the held level while the key is down (a *level*, not a time), as a % of the peak.",
                "**Release** — time for the sound to fade out after note-off.",
              ],
            },
          ],
        },
      ],
    },

    // ── 2 · Melody ────────────────────────────────────────────────
    {
      id: "melody",
      title: "Melody",
      summary:
        "Melody = combinations of notes drawn from a scale. A melodic line has an arc: expose a motive, develop it, let repetition accumulate, then resolve by stopping.",
      slides: [
        {
          id: "what-is-melody",
          title: "What melody is",
          blocks: [
            {
              type: "aside",
              variant: "note",
              title: "Recap",
              text: "A scale is an ordered set of note names, its rule defined by intervals, its members numbered by function — the degree.",
            },
            {
              type: "keypoints",
              tone: "result",
              items: ["**Melody = various combinations of notes from a scale.**"],
            },
            {
              type: "prose",
              text: "A song has four parts: **drums, bass, upper part, melody**. Lump the first three together and you have the *accompaniment*; split the accompaniment back apart and you get upper part, bass, and drums.",
            },
            { type: "figure", figure: "song-layers", caption: "Melody on top; drums / bass / upper part underneath as the accompaniment." },
          ],
        },
        {
          id: "three-stage",
          title: "Expose → develop → resolve",
          lede: "A motive is the shortest recognizable fragment of a melody — its \"musical gene\".",
          blocks: [
            {
              type: "prose",
              text: "A melodic line moves through stages: **expose** a small motive (the seed), **develop** it moderately, let **repetition accumulate**, then **resolve** the accumulation by stopping the repetition.",
            },
            { type: "figure", figure: "melody-arc", caption: "Expose a motif → make variations → liquidation." },
            {
              type: "keypoints",
              items: [
                "Altering the theme during development is called a **variation**.",
                "The final resolving move is **liquidation** — winding the idea down.",
                "Liquidation is optional: just starting a *new* motive also tells the listener \"that idea is over\". But a proper ending lands better.",
              ],
            },
          ],
        },
      ],
    },

    // ── 3 · Chords ───────────────────────────────────────────────
    {
      id: "chords",
      title: "Chords",
      summary:
        "Stack every-other note of a scale and it sounds good. Triads in C major give seven chords; drop the unsettling one and you have the six basic chords, each with a function (T / S / D) and a mood.",
      slides: [
        {
          id: "what-is-chord",
          title: "What a chord is",
          blocks: [
            {
              type: "keypoints",
              tone: "result",
              items: ["**A chord = notes from a scale played together** (not necessarily struck at exactly the same instant)."],
            },
            {
              type: "aside",
              variant: "analogy",
              title: "Role",
              text: "The chord is the bed of the music — the film's set and lighting. The melody is the actor moving around in front of it.",
            },
            {
              type: "prose",
              text: "The trick: inside a scale, **take every other note** and sound them together — that stack tends to be consonant.",
            },
          ],
        },
        {
          id: "major-minor",
          title: "Major & minor, revisited",
          blocks: [
            {
              type: "keypoints",
              items: [
                "**Major** — Do Re Mi Fa So La Si.",
                "**Minor** — C D ♭E F G ♭A ♭B.",
                "Difference = which note is the centre. Centre C → major; centre A → minor.",
              ],
            },
            { type: "figure", figure: "bright-dark-axis", caption: "Classical theory placed major near \"bright\" and minor near \"dark\" — mirror images (\"dualism\"). Modern pop smears across the whole axis." },
            {
              type: "prose",
              text: "Classical music treated major and minor as mirror-symmetric opposites — *dualism*. As composers reached for more complicated feelings, that clean opposition dissolved.",
            },
          ],
        },
        {
          id: "six-chords",
          title: "The six basic chords",
          lede: "Triads: stack three notes a 3rd apart. In C major, seven fit the scale — one is a dud.",
          blocks: [
            {
              type: "keypoints",
              items: [
                "A three-note chord is a **triad**. Stacking notes a 3rd apart is **tertian** stacking.",
                "Jazz theory starts one stack higher — four notes, a **seventh chord** (outer notes a 7th apart).",
                "Restrict to *no accidentals* + *stacked in 3rds* + *triad* and exactly **seven** chords qualify.",
              ],
            },
            {
              type: "prose",
              text: "Those seven split into three types — some rooted on do / fa / sol, some on re / mi / la, and one loner rooted on **ti**. The ti–re–fa triad (diminished) is the only one of the seven that sounds genuinely unsettling. Drop it and the remaining **six are the basic chords.**",
            },
            { type: "widget", widget: "chord-functions", caption: "Play each of the six, see its notes and its function/mood. Notice I, IV, V are major and bright; ii, iii, vi are minor and soft." },
            {
              type: "keypoints",
              title: "The six (C major)",
              items: [
                "**I** · C–E–G · major · tonic — *stable, home*",
                "**ii** · D–F–A · minor · subdominant — *gentle, about to set off*",
                "**iii** · E–G–B · minor · dominant-parallel — *melancholy bit-part, transitional*",
                "**IV** · F–A–C · major · subdominant — *warm, bright neighbour*",
                "**V** · G–B–D · major · dominant — *tense, needs to go home*",
                "**vi** · A–C–E · minor · tonic-parallel — *the hero's shadow, wistful*",
              ],
            },
          ],
        },
        {
          id: "nexus",
          title: "Connection theory (the Nexus system)",
          lede: "TDS gives you the points; the Nexus system studies the lines between them.",
          blocks: [
            {
              type: "keypoints",
              title: "TDS function theory",
              items: [
                "C major has 6 basic chords: I ii iii IV V vi.",
                "They carry functions: **tonic (T)**, **dominant (D)**, **subdominant (S)**.",
                "The moves *between* functions are the skeleton of a piece.",
              ],
            },
            {
              type: "prose",
              text: "The **Nexus system** is about the ~30 possible connections, each with its own feel: **IV→V** is smooth, **ii→V** is full of drive, **vi→IV** is tense and surprising, **I→vi** is a soft sidestep.",
            },
            {
              type: "keypoints",
              title: "Two control knobs on any connection",
              items: [
                "**Chord-quality change** — major→minor, minor→major, or same. e.g. IV→V is major→major; ii→V is minor→major. Controls the **brightness** shift.",
                "**Root motion** — how far the root moves (a 2nd, 3rd, 5th…). e.g. IV→V is up a 2nd; ii→V is down a 5th. Controls the sense of **momentum**.",
              ],
            },
          ],
        },
      ],
    },

    // ── 4 · Rhythm ───────────────────────────────────────────────
    {
      id: "rhythm",
      title: "Rhythm",
      summary:
        "Drums keep time with three voices — kick, hi-hat, snare. Rhythm is measured on a grid of bars and beats at a tempo in BPM; where you place the hits (downbeat vs upbeat, 8th vs 16th, ghost notes, strong vs weak) is the groove.",
      slides: [
        {
          id: "drum-parts",
          title: "The three parts of a drum kit",
          blocks: [
            {
              type: "keypoints",
              items: [
                "**Kick** — holds down the lowest part of the rhythm.",
                "**Hi-hat** — the highest, sharpest voice; the *finest* subdivision, so it sets the detailed feel.",
                "**Snare** — sits between kick and hi-hat and braces the backbeat.",
              ],
            },
            {
              type: "aside",
              variant: "note",
              title: "Rhythm section",
              text: "Drums + bass together are the *rhythm section*. Keep the drum part identical and change the bass and the whole impression changes — an 8-beat bass vs a 16-beat bass feels like a different song.",
            },
          ],
        },
        {
          id: "rhythm-scale",
          title: "The grid — bars, beats, tempo",
          blocks: [
            {
              type: "keypoints",
              items: [
                "**Time signature** — how the basic pulses group. 4/4 = four-beat; 3/4 = three-beat. Anything else is **irregular time** (prog, jazz — advanced).",
                "**Bar** — one group of pulses (\"1 2 3 4\" or \"1 2 3\").",
                "**Beat** — each individual count. A 4/4 song groups four beats per bar.",
              ],
            },
            { type: "widget", widget: "rhythm-grid", caption: "The kick / snare / hi-hat grid from the notes, made playable. Toggle cells, set the BPM, hit play. The default is a basic backbeat." },
            {
              type: "keypoints",
              title: "Tempo — speed, in BPM (beats per minute)",
              items: [
                "**60 BPM** — one beat a second, like a clock.",
                "Pop sits around a doubled feel, **120 BPM**. Dance / EDM: **120–140**.",
                "**Double-time** — halve the note values → more energy, for a drop or a rap section.",
                "**Half-time** — double the note values → more space and depth, for a bridge or a chill section.",
              ],
            },
          ],
        },
        {
          id: "beat-types",
          title: "Placing the hits",
          lede: "Split a beat in two: the first half is the downbeat, the second the upbeat.",
          blocks: [
            {
              type: "keypoints",
              title: "Downbeat vs upbeat hi-hat",
              items: [
                "**Downbeat hi-hat** — feels heavy and grounded. Hard rock (AC/DC, Asian Kung-Fu Generation) and stomping dance tunes (*Beat It*, *Another One Bites the Dust*) — you can't help nodding along.",
                "**Upbeat hi-hat** — feels light and lifted. Starts from four-on-the-floor dance drums; heavy in techno and trance, and a run of fast Japanese rock (KANA-BOON, Base Ball Bear).",
              ],
            },
            {
              type: "keypoints",
              title: "Subdivision & ornament",
              items: [
                "**8-beat vs 16-beat** — how finely the hi-hat divides the beat.",
                "**8+16 combo** — in dance music, hi-hat plays 8ths while a shaker layers 16ths.",
                "**Ghost notes** — the quiet decorative hits the rhythm section slips in between the loud ones.",
              ],
            },
            {
              type: "keypoints",
              title: "Strong vs weak beats (4/4)",
              items: [
                "**1 — strong** · kick + bass · *lands / drops*",
                "**2 — weak** · clap / snare · *drive*",
                "**3 — secondary strong** · bass + chord accent · *steady, supporting*",
                "**4 — weak** · clap / hi-hat · *lightness before the loop repeats*",
              ],
            },
            {
              type: "aside",
              variant: "note",
              title: "3/4",
              text: "Waltz time is strong–weak–weak.",
            },
          ],
        },
      ],
    },
  ],
};
