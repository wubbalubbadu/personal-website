# Cookie Flute Studio — backlog

Everything captured from notes, iPad practice sessions and planning chats,
grouped by what shares machinery. Order within each section is roughly
value-per-hour given what already exists in the codebase.

Status key: `[ ]` open · `[x]` done · `[~]` partly done

---

## 1. Bugs — blocking on iPad

These make a feature unusable on the device you actually practise with.

- [ ] **Palm rejection in markup.** Resting a palm on the screen while writing
  with the Pencil draws a line between palm and nib. Needs `pointerType`
  routing: accept `pen` when a pen is present, ignore `touch` contacts with a
  large contact area.
- [ ] **Tapping a note starts the drone.** There is no hover on iPad, so
  tapping a note to see its fingering fires the drone instead. The drone
  should need arming first (press the Drone control, *then* tap a note).
  Open question: how to keep octave selection usable in both places.
- [ ] **Tooltip placement collides with the panel border**, especially the
  fingering tooltip inside View settings.
- [ ] **Tooltip wording assumes a mouse.** "Hover a note" is wrong on a
  tablet. Wording should not name the gesture, or should name both.

## 2. Bugs — annoying but not blocking

- [ ] **Markup moves when view settings change.** Ink is stored as a bitmap
  scaled to the paper; changing notation size or spacing re-lays the music
  underneath it. Real fix is anchoring strokes to note positions rather than
  to pixels (see §6).
- [ ] **Theory tooltips say nothing useful.** A fermata shows no text at all.
  A key signature says "key signature" instead of *which* key it is and which
  notes it alters.
- [ ] **Note spacing appears to do nothing when "start on a new line" is on.**
  Worth re-testing now that the slider touch bug is fixed.
- [ ] **Settings outer range** — the range controls need sensible bounds.

### Fixed this round

- [x] Metronome kept ticking ~4 beats after stop (lookahead beats were not cancelled)
- [x] Tempo `+` fired a burst of clicks instead of changing tempo
- [x] Metronome far too quiet
- [x] Starting the tuner silenced metronome and drone until reload (two AudioContexts)
- [x] Metronome accented beat 1 of 4 in unmetered books
- [x] View settings lost on refresh
- [x] Sliders unusable on touch (gesture stolen by the scroller)
- [x] Pencil/finger selected the score instead of drawing
- [x] Ink jagged, then dotted at speed; nib too thick
- [x] Practice tools panel cropped the fingering tool
- [x] Accidental overlay marked notes the staff already prints, with wrong symbols

---

## 3. The continuity problem — biggest single item

Not three features; one problem. Today, practising "three arpeggios, three
scales, one chromatic" means reconfiguring Scale Studio repeatedly, and
tomorrow there is no record of what you did. A physical book (Voxman, Moyse)
beats the app here purely because you can flip pages.

- [ ] **Practice log.** Dated list of what you worked on, at what tempo.
  Persistent across changing exercises — a sticky note that does not reset.
  Possibly lives in the Cookie pet. Tap a scale to mark it practised; option
  to record it.
- [ ] **Routine runner.** Chain saved scale sets, breathing exercises and long
  tones with timers. The Exercises page already *describes* your routine
  ("technique 30, tone 20, extended techniques") but cannot run it. Saved
  sets, the breathing lab and the pomodoro all exist; nothing sequences them.
- [ ] **Flip-through browsing.** A way to move between exercises like pages,
  rather than reconfiguring a generator each time.
- [ ] **Save view settings into a preset**, so a set restores how it looked.

---

## 4. Small wins — mostly already built

- [ ] **Tempo history.** A tempo per exercise is already stored, but only the
  current value. Keep it dated and you get "C major, two octaves: 60 → 92 over
  six weeks" — the most motivating thing in technique practice, and something
  a teacher genuinely cannot remember for you. Small change plus a sparkline.
- [ ] **Open an exercise at your last tempo** instead of 60. Nearly free once
  tempo history exists.
- [ ] **Reverse fingering lookup.** `notesForKeys()` exists; `FluteDiagram`
  already takes `interactive` and `onToggle`. Both halves built, nothing
  connects them. Press keys, find out what sounds. *(Previously scoped then
  parked — flute fingerings are ambiguous enough that the answer may be worth
  less than it looks. Revisit that call before building.)*
- [ ] **Drop-out metronome.** Clicks two bars, silent two bars, returns. Your
  existing metronome plus a counter.
- [ ] **Advanced metronome.** Subdivisions, accent control, downbeats only,
  1st and 3rd only, irregular patterns.
- [ ] **Highlighter in markup**, in two kinds (technique / sound) so the marks
  can later drive practice suggestions.
- [ ] **Awkward-interval hints.** The fingering data already knows which
  transitions are hard (cross-fingerings, B♭ thumb, third-octave harmonics).
  Scale Studio could flag them per key: "in B major, watch F♯→G♯."
- [ ] **Scale Studio by key.** Better as "select all types for this key" on the
  key picker than as a separate preset — a preset would be a third way to
  express state that already has two axes, and would drift out of sync.
- [ ] **Finger training / tremolo mode.** Drill hard fingerings; hand model
  shows which fingers move; focus on minimising tension.

---

## 5. The spine — "the app knows what you're playing"

Scale Studio generates it, the reader displays it, the fingering chart
explains it, detection hears it, derived exercises transform it. This is what
makes the project more than a collection of tools. Protect it.

- [ ] **Play-along detection (pitch + rhythm).** Tractable and closer than it
  looks: `deriveScoreEvents` gives expected pitch and duration per note, and
  the tuner already does live pitch detection. You have both halves; matching
  them with tolerance is ordinary work.
- [x] **Long tones with a pitch trace.** The honest half of "sound analysis":
  hold a note, watch the line. Flat means steady. Objectively measurable.
  *(Built: `lib/pitch.ts` detector, `lib/noteSegmenter.ts`, `lib/usePitchStream.ts`,
  `long-tones/ToneTrace.tsx`.)*
- [ ] **Note-advance rule for repeated notes.** `startsNewNote()` in
  `lib/noteSegmenter.ts` currently advances on pitch change alone, which is
  correct for long tones — you hold one note until the air runs out, and there
  are no repeats to miss. Score following is where it breaks: two tongued notes
  at the same pitch never change pitch, so they log as one note of double length
  and every note after it is mislabelled, silently. The fix is onset detection
  (a sharp rise in `rms` after a dip, `ONSET_RISE_RATIO` is a starting point).
  Decide it against real recorded tonguing, not in the abstract.
- [ ] **Derived exercises from repertoire.** Turn Mystery of Love into a
  tonguing or flexibility study. `notePatterns.ts` already has articulation
  rotations, rhythm variants and syllable schemes; applying them to a piece's
  existing pitches is mostly plumbing. Establishes a pattern: any library
  piece can spawn a technique exercise.
- [ ] **Sight-reading roulette.** Scale Studio already generates MusicXML.
  Point it at random short phrases in a chosen key and range → infinite
  sight-reading material, the thing every flutist runs out of.
- [ ] **Breath budget planner.** Mark breath points; it tells you how many
  beats each phrase costs at your tempo. `deriveScoreEvents` already has every
  duration. A wind-player problem nobody builds tools for.
- [ ] **Heatmap of what you avoid.** Colour the chromatic range by how often
  you have actually played each note. Most people discover they never go above
  D6, or quietly skip flat keys — then generate an exercise for the cold spots.
- [ ] **You versus you.** Play today's attempt against the same exercise from
  three weeks ago. More motivating than a streak counter.
- [ ] **Anchor markup to notes, not pixels.** Prerequisite for markup that
  survives re-layout, and for ink appearing in the PDF export.
- [ ] **MusicXML cleanup.** Slot in whenever something blocks on it.

> ⚠️ **Do not ship tone-quality verdicts.** "Your sound is airy" is a research
> problem: measurable in principle (harmonic-to-noise ratio, spectral
> centroid), but turning a number into a diagnosis is a judgment call, and a
> confident wrong verdict is worse than none — especially for a student who
> will believe it. Ship pitch stability, note-start consistency and dynamic
> steadiness. Those are defensible.

---

## 6. Breathing cluster — best daily-work material

Self-contained, visual, no backend, and `BodyView.tsx` plus the 3D model are
already there. Every session produces something you can see, which is what
sustains a daily habit.

- [ ] **Breathing bag visual.** A bag inflating, or small bags filling, to show
  support. Plus a duration indicator or visual hint.
- [ ] **More exercises.** The "siiii" exercise for finding support, and others.
- [ ] **Relaxation checklist.** Walk the body model through the points to
  relax, checking posture as it goes.

---

## 7. A different app — worth building, keep off the critical path

- [ ] **Practice recommender.** Drop the "AI" framing: the value is *your*
  curation — knowing this student needs Andersen rather than Köhler, and why.
  A decision tree you author is more useful and more trustworthy than
  something generated. Start with the daily-exercise sequence you actually use,
  and show the real exercise sequence rather than generic advice.
- [ ] **Stage simulator.** A gallery of mock situations (audition halls,
  warm-up rooms), visual-novel style, to reduce performance stress. No
  technical risk — it is writing. Good non-coding day.
- [ ] **Cookie reacts to practice data.** Livelier on a streak, sleepy after a
  quiet week. Cheap, and it turns stats into something you feel.
- [ ] **Play the app like a flute.** Map the interactive diagram to your
  fingers; drill fingerings on a train with no instrument. Good for the third
  octave.
- [ ] **Monetisation.** First piece free; watch an ad to open more; donate for
  ad-free. Ads shown *before* opening, never interrupting practice.
- [ ] **Technical checklist / "scan hard stuff"** — captured from notes, needs
  fleshing out before it is actionable.

---

## Suggested order

1. Finish the iPad bugs (§1) — you practise there daily
2. The continuity problem (§3) — biggest gap between the app and a paper book
3. Tempo history and the small wins (§4) — cheap, motivating
4. Breathing cluster (§6) — sustainable daily work
5. Play-along detection (§5) — the spine, and the hardest thing worth doing

§7 waits. Accounts, if they ever happen, gate personalised planning.
