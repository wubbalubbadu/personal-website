# Theory lessons: principles and course map

The plan every lesson is built against, so lessons don't need redesigning or merging later.
Reference for topics: musictheory.net/lessons. We cover what a player needs to **read and play
a part**, not theory for its own sake.

## Who it's for

A beginner on a treble-clef wind instrument (flute, clarinet, saxophone). No fingerings, no
instrument-specific range assumptions. Ledger lines go both above and below the staff.

**The inclusion test:** does this help you play what's printed on the page?
- Yes, and you meet it in your first year of parts: **core**, taught fully with practice.
- Yes, but rarely, or it's the reason behind something: **brief**, one step or one narration line.
- No (analysis, harmony, composition): **later**, an optional "go deeper" track, never in the core path.

## Design principles

**1. One idea per step, told three ways at once.** The narration says it, the notation shows it,
the sound proves it, and the learner's action confirms it. If one of these doesn't serve the idea,
remove it.

**2. Meaning before name before test.** First the problem ("how do we show a long note?"), then
the thing that solves it, then its name, then a check. Keep useful context from the step before.

**3. Show what the words describe.** "Higher" means the note moves up and plays higher. Animate
only when something changes; a still example that explains the idea stays still.

**4. Real, stable notation.** Standard black engraving (the engine's own glyphs), the same staff
size and position from step to step, no invented notation (a trill is the printed "tr", nothing
else). Colour has fixed jobs: red is a temporary highlight or what's sounding, green is correct.
Show the treble clef when pitch matters; leave it off when a row is about rhythm or meter only (then
notes sit on one line, like a printed rhythm staff). All notation is drawn with `EngravedRow`.

**5. Two voices, nothing else talks.** The narration line above the music teaches, in plain,
friendly sentences. Cookie below the music invites ("Can you tap the second line?") and reacts
to what the learner actually did. No headings, captions or labels repeating either of them.

**6. The learner controls the pace.** No timers that move the lesson on, no auto transitions, no
text that disappears before it's read. A new part of an idea is its own step. Next lives in one
place (Cookie's bubble): a quiet Skip until the step is done, then a filled button. Next only moves
the lesson on: it may step through a demonstration ("Mark beat 2 →"), but it never does something
the learner is meant to do themselves (adding a sign, answering). Every step stays explorable after
it's done.

**7. Obvious, forgiving interaction.** Say the verb: tap, drag, draw, hold, clap. Act on the music
itself rather than on extra controls. Generous hit areas (the whole line, not its middle), mouse
previews where a slip is easy, and it all works on iPad with no hover.

**8. Demonstrate, explore, check.** Practice uses fresh random material, gets harder in order, and
shows how much is left with progress dots (`ProgressDots`: a short row of dots that fill as you go,
in their own row under the music, between the scene and Cookie). Never as words: Cookie says "Next one" and "Last one", not "Question 2 of 6". A miss gets a hint that teaches ("count up from G: G, A, B")
and keeps the question in view, and a drawing or placing task has a Hint and, after a hint or two
misses, Show answer. There is no separate review page at the end: it only repeats exercises the
lesson already had. Checks sit right after the idea they test (a 7/4 question after the top number,
a 9/16 question after the bottom number), and the lesson is complete when its last exercise passes.
Lesson 8's wrap-up is the one place the course puts everything together.

**9. Say why we're moving on.** Each step's narration connects to the last one: from learning to
remembering, to practising, to making music.

**10. A layout that never jumps.** Fixed rows: step dots, narration (room for two lines), a
fixed-height scene, then Cookie. Controls changing never moves the bubble or the music.

**11. Sound is part of the lesson.** Every note you can see can be heard. One wind-like tone for
notes, a click for the beat, a clap for clapping. Visuals stay in sync with the audio. Never play
something that muddies the idea (no multi-note playback while showing one note's length).

**12. Restraint.** At most two controls per step besides Listen. Brief fades only. Balanced text
sizes. Desktop and iPad, portrait and landscape.

**13. Copy.** Bilingual through `tr()`. Plain words, no dashes, no slogans.

**For rhythm specifically,** every step connects three things: **what you see** (the shape),
**how long it lasts** (in beats), and **what you hear or do** (listen, hold, clap).

## Course map

Three tiers, so the list never looks like a hundred lessons:

- **Essentials (8 lessons):** everything needed to read a beginner part. Lesson 8 ends with a
  short wrap-up: read, count, clap and play a real 8-bar melody.
- **Extras:** things every part uses but you can pick up as you meet them.
- **Later:** the "go deeper" theory track, built when there's time.

Each lesson: about 10 minutes, 7 to 12 steps, checks inside the steps rather than a review page at the end.
Pitch and rhythm come in blocks, in the order they turn up in beginner parts: the staff, then
lengths and measures, then sharps, flats and key signatures together (B♭ and F♯ are in almost every
first band part), then the rest of rhythm (rests, dots and ties, 6/8 in two). Triplets come later.
(Revised October 2026: the original map had rests before accidentals and a separate "smaller beats"
lesson; lessons 2 and 3 now cover eighths and sixteenths, and "1 and 2 and" moved into Dots and ties,
where a dotted quarter first needs it.) Any lesson can be opened from the list.

**Lessons connect.** Each one opens from what you can already do and names the question it
answers, and ends by pointing at the next one. The "bridge" column is that opening.

### Essentials

| # | Lesson | Bridge (the question it answers) | Steps cover | musictheory.net topics it absorbs |
|---|---|---|---|---|
| 1 | **The staff and notes** (built) | How is pitch written down? | staff, spaces, notes, treble clef, other clefs *(brief)*, note names, finding notes, practice, ledger lines, Twinkle, read new notes | The Staff, Clefs, Ledger Lines |
| 2 | **Note lengths** (built) | You can write *which* note. How do we write *how long*? | long and short, shapes, build a note, values, beams, hold, clap | Note Duration (part) |
| 3 | **Measures and time signatures** (built) | You can read lengths against a beat. How are beats organised, and how do you keep your place? | why measures help, 4/4 and bar lines, counting note lengths, finding and placing beats, 2/4 and 3/4, the bottom number with 4/4 and 2/2, add bar lines, count, clap and build | Measures and Time Signatures, Simple Meter |
| 4 | **Sharps, flats and naturals** (built) | You can find any letter on the staff. What about the sounds between the letters? | half steps (adjacent keys, including E to F), the sharp, the flat (two names for one key, E♯ = F, as a brief discovery), the natural, through the measure (same note, same octave, until a natural or the bar line), read a phrase (Ode to Joy in D); six steps, no whole steps or double sharps and flats | Steps and Accidentals |
| 5 | **Key signatures** | Writing the same sharp every time is tiring. How does music say "always"? | why they exist, reading one, it applies in every octave, signature vs accidental, naming the major key *(brief trick: last sharp up a half step; the second-last flat, and one flat is F)*, each signature also names a minor key (G major and E minor share one) *(brief: the signature alone can't tell you which; the piece's last note usually does)* | Key Signatures, Key Signature Calculation *(brief)* |
| 6 | **Rests** | Measures have to add up. What fills a beat where you don't play? | a gap in a full measure, the quarter rest, half and whole rests (hat and hole), the whole-measure rest, the eighth rest (sixteenth *brief*), which rest fills the gap, counting through rests, read and clap | Rest Duration |
| 7 | **Dots and ties** | Some notes last longer than any one shape, or across a bar line. How? | why, the dot, the tie across a bar line, counting "1 and 2 and" (a dotted quarter's eighth lands on "and"), dotted-quarter-eighth | Dots and Ties |
| 8 | **6/8 in two, and putting it together** | Lesson 3 counted 6/8 as six eighths. How does it feel as two big beats? Then: read a whole melody. | 6/8 felt in two (each beat a dotted quarter), syncopation *(brief)*; wrap-up: a real 8-bar melody, name, count, clap, play along | Compound Meter *(part)* |

### Extras

| Lesson | Steps cover | musictheory.net topics it absorbs |
|---|---|---|
| **Major and minor scales** | the step pattern, a scale in any key (links to Scale Studio), minor *(brief: natural, harmonic, melodic named)*, scale degrees and the tonic *(brief)* | Major Scale, Minor Scales, Scale Degrees *(brief)* |
| **Dynamics and articulation** | p to f, hairpins, slurs, staccato, accent, tenuto, breath marks; hear each | (not covered there) |
| **Tempo and road maps** | tempo words, fermata, repeats, first and second endings, D.C., D.S., Coda | (not covered there) |
| **Triplets and odd meters** | triplets, 9/8 and 12/8, odd meters like 5/4 and 7/8 *(brief, one step)* | Compound Meter *(rest)*, Odd Meter *(brief)* |

### Later

**The "go deeper" theory track:** chord analysis, intervals, triads and chords, circle of fifths, modes, diatonic
harmony. These can link from the brief mentions above when built.

**What we deliberately don't copy from musictheory.net:** its order (it finishes rhythm before
steps and accidentals because it's teaching theory; we interleave by what shows up in beginner
parts), its drill-heavy checks (we use short, varied checks inside each lesson), and its depth on
meter classification and key-signature calculation (brief here).
