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
remove it. Every interaction is the moment the learner takes in the idea: they make the new thing
happen, or notice it. Never an interaction only to have one.

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
Explanations live where the eye is: in the narration and next to the thing they describe in the
scene (a label beside the lit keys), never only in Cookie. Cookie invites the action and reacts.
One idea per stage, and the narration changes with each stage (lesson 4 fades each new sentence
in; lessons 1 to 3 do not yet).

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
A short beginner wrap-up is the place to put the reading skills together; its final position follows the practical reading lessons below.

**9. Say why we're moving on.** Each step's narration connects to the last one: from learning to
remembering, to practising, to making music.

**10. A layout that never jumps.** Fixed rows: step dots, narration (room for two lines), a
fixed-height scene, then Cookie. Controls changing never moves the bubble or the music.

**11. Sound is part of the lesson.** Every note you can see can be heard. One wind-like tone for
notes, a click for the beat, a clap for clapping. Visuals stay in sync with the audio. Never play
something that muddies the idea (no multi-note playback while showing one note's length).
Every listening instruction names something to notice ("Do these two Fs still play the black key?").
Tapping a note sounds it directly; Listen can replay a row, but pressing it is never the activity and
never required to finish a step.

**12. Restraint.** At most two controls per step besides Listen. Brief fades only. Balanced text
sizes. Desktop and iPad, portrait and landscape.

**13. Copy.** Bilingual through `tr()`. Plain words, no dashes, no slogans.

**For rhythm specifically,** every step connects three things: **what you see** (the shape),
**how long it lasts** (in beats), and **what you hear or do** (listen, hold, clap).

## Course map

The first track is **Beginner music reading**, not a claim to cover every symbol a player will meet.
Lessons 1–7 establish pitches and durations. The following short lessons cover markings that
actually appear in flute parts. Deeper theory comes afterward, without making it a prerequisite
for reading a simple tune. These are future directions, not approved implementation storyboards.

Keep lessons short and focused; use only the steps the topic needs, with checks inside the steps rather than a review page at the end.
Pitch and rhythm come in blocks, in the order they turn up in beginner parts: the staff, then
lengths and measures, then sharps, flats and key signatures together (B♭ and F♯ are in almost every
first band part), then rests and dots and ties. Practical flute markings follow. Compound meter and triplets can be separate follow-ups.
(Revised October 2026: the original map had rests before accidentals and a separate "smaller beats"
lesson; lessons 2 and 3 now cover eighths and sixteenths, and "1 and 2 and" moved into Dots and ties,
where a dotted quarter first needs it.) Any lesson can be opened from the list.

**Lessons connect.** Each one opens from what you can already do and names the question it
answers, and ends by pointing at the next one. The "bridge" column is that opening.

### Beginner music reading

| # | Lesson | Bridge (the question it answers) | Steps cover | musictheory.net topics it absorbs |
|---|---|---|---|---|
| 1 | **The staff and notes** (built) | How is pitch written down? | staff, spaces, notes, treble clef, other clefs *(brief)*, note names, finding notes, practice, ledger lines, Twinkle, read new notes | The Staff, Clefs, Ledger Lines |
| 2 | **Note lengths** (built) | You can write *which* note. How do we write *how long*? | long and short, shapes, build a note, values, beams, hold, clap | Note Duration (part) |
| 3 | **Measures and time signatures** (built) | You can read lengths against a beat. How are beats organised, and how do you keep your place? | why measures help, 4/4 and bar lines, counting note lengths, finding and placing beats, 2/4 and 3/4, the bottom number with 4/4 and 2/2, add bar lines, count, clap and build | Measures and Time Signatures, Simple Meter |
| 4 | **Sharps, flats and naturals** (built) | You can find any letter on the staff. What about the sounds between the letters? | between the notes (find the black keys between C, D and E; half steps), sharps (C♯, D♯) and flats going down (E♭, D♭), matching the two names of each black key, E♯ = F, naturals (the sharp lasts the measure; tap the extra one away; draw ♮), through the measure, same key two names; five steps, no whole steps or double sharps and flats | Steps and Accidentals |
| 5 | **Key signatures** | Writing the same sharp every time is tiring. How does music say "always"? | three short steps: say it once (a signature replaces the written sharps; it applies in every octave), which letters change (sharps and flats each keep a fixed order, shown, not drilled), change one back (a natural overrides it only on that line or space, until the bar line). Naming the key moved to Major and minor scales | Key Signatures |
| 6 | **Rests** | Measures have to add up. What fills a beat where you don't play? | a gap in a full measure, the quarter rest, half and whole rests (hat and hole), the whole-measure rest, the eighth rest (sixteenth *brief*), which rest fills the gap, counting through rests, read and clap | Rest Duration |
| 7 | **Dots and ties** | Some notes last longer than any one shape, or across a bar line. How? | why, the dot, the tie across a bar line, counting "1 and 2 and" (a dotted quarter's eighth lands on "and"), dotted-quarter-eighth | Dots and Ties |
| 8 | **Slurs and articulation** | A curved line can mean something different from a tie. How do we start and connect flute notes? | tie versus slur; a slur joins notes without re-tonguing, while a tie prolongs the same pitch; staccato, accent, tenuto and breath marks; contrast a few short phrases, not a long drill | practical flute notation |
| 9 | **Trills** | What does “tr” above a note ask us to do? | recognize the sign, alternate the written note and its upper neighbor, use the key signature and any specified accidental; show a slow example before normal speed; link to the existing trill chart for fingerings; avoid presenting stylistic starting-note conventions as universal | practical flute notation |
| 10 | **Repeats and directions** | Where do we go when the music sends us back? | repeat signs, first and second endings; a short guided route through a score; introduce D.C., D.S. and Coda only as far as a compact example can explain clearly | score navigation |
| 11 | **Dynamics, tempo and expression** | How loudly, how fast, and with what character should we play? | common p, mp, mf, f and hairpins; common tempo words, ritardando and a tempo; fermata and a few common expression words; distinguish loudness, speed and character without making a vocabulary catalogue | practical performance markings |

**October 9 direction:** Keep these practical lessons short. Not every symbol needs a game,
drawing activity or forced listening task. A clear engraved example, a useful sound comparison
with a named listening focus, and one recognition or score-reading check may be enough. Dots
and ties can briefly contrast a slur, then the articulation lesson develops that distinction.
A dot beside a note adds duration; a staccato dot above or below it changes articulation.

A brief real-melody wrap-up can follow the practical reading sequence. Decide its exact position
and content when these short lesson drafts exist, rather than forcing every topic into eight lessons.

### After beginner reading

- **6/8 in two:** build on dotted quarters and show two groups of three eighths; a focused rhythm follow-up.
- **Major and minor scales:** step patterns, tonic, scale degrees, major/minor key names and their signatures. Connect to Scale Studio. Key-name shortcuts belong here, after the musical meaning of a key.
- **Triplets and other meters:** triplets, 9/8, 12/8 and introductory irregular grouping when needed.

### Later

**The "go deeper" theory track:** chord analysis, intervals, triads and chords, circle of fifths, modes, diatonic
harmony. These can link from the brief mentions above when built.

**What we deliberately don't copy from musictheory.net:** its order (it finishes rhythm before
steps and accidentals because it's teaching theory; we interleave by what shows up in beginner
parts), its drill-heavy checks (we use short, varied checks inside each lesson), and its depth on
meter classification (brief here) and key-signature calculation (a later scales topic here).
