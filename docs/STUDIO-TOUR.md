# Cookie Flute Studio: a page-by-page tour

The studio as it is on Nov 6, 2026 (main f553b92 plus the patches in `docs/.applied-patches/STACK-ORDER.md`). For each page: what it's for, what you do there, and the one screenshot that shows it best for a portfolio.

**Before taking screenshots**
- iPad landscape (1024x768 or 1180x820) is the main target. Most flutists practise on an iPad on the stand, and the studio is designed for it.
- Use a studio with real data: a few pieces in Working on, a deadline, two tricky bits, a week of practice. Empty states hide most of what makes My Studio and Home interesting.
- Take reader shots mid-action (playback cursor visible, an overlay on), not at rest.
- No routes under `/lab`, and skip `/flute-studio/ticket-check`, which is an internal component check page.

The header on every page: tabs (Library, Exercises, Learn, My Studio), a practice clock, a tuning fork that opens the tools panel (tuner, drone, metronome), and the gear menu.

---

## Home `/flute-studio`

**For:** a tour of what the studio does, then your own studio at a glance.
**Key interactions:**
- Practice cards (Scale Studio, Long tones, Browse music, Breathing Lab), each with a small animated demo of the real tool.
- Learn cards and Tools cards. The Tuner, Metronome and Drone cards open the practice dock right on the page.
- "Your studio": a Today card (where you left off, Working on, the next deadline, a warm-up set, the next tricky bit), plus Tricky bits and This week.

**Screenshot:** the top of the page on iPad landscape with the four Practice demos mid-animation. A second shot of the Today card with real data shows it's personal, not just a brochure.
*The home is being redesigned (see `docs/.applied-patches/home-2x2-notes.md`), so this shot may date fastest.*

## Library `/flute-studio/music`

**For:** every piece and exercise book in one place.
**Key interactions:**
- Search, and three views: List, Shelf and Timeline (composers on a timeline).
- Tag chips (Classical, Etude, Excerpts, Beginner...).
- One-tap lists: Want to learn, Working on, Learned (the StatusButton).
- Tap a composer for a short bio and a note on the piece.

**Screenshot:** Timeline view with a composer card open. It's the most distinctive view, and it shows the content has depth beyond a file list.

## Score reader `/flute-studio/music/[id]`

**For:** practising a piece from interactive sheet music. This is the studio's centre.
**Key interactions:**
- Playback with a purple cursor that follows the music, page turns or scrolling, and Page Up/Down for Bluetooth pedals.
- Tempo control with tempo words and rit./accel. read from the score, a count-in, a steady click or one that follows the music, and an auto drone (the longest held pitch in each bar).
- Overlays: beat sticks, counts, note names, fingerings on tap.
- Select bars to loop them, open a close-up (rhythm tapping, pitch graph) or save them as a tricky bit.
- Mark Up with Apple Pencil, record yourself, transpose, download a PDF, keep the piece offline.
- Excerpts open as the printed page (IMSLP) with passage tabs that switch to engraved XML.

**Screenshot:** Badinerie on iPad landscape during playback, with the cursor mid-bar, beat sticks on and the tempo toolbar visible. A second option is a selected passage with the close-up open.

## Music book `/flute-studio/music/books/[bookId]`

**For:** numbered etude books (Köhler Op. 33 Book 1) read in order.
**Key interactions:** the list of numbered pieces with opening tempo word, meter and bars; your progress through the book; and a ‹ 1 / 15 › stepper inside the reader.

**Screenshot:** the book page with a few pieces ticked done.

## Exercises `/flute-studio/exercises`

**For:** the hub for technique work.
**Key interactions:**
- Animated cards for each exercise.
- Your saved Scale Studio sets appear here, so a set you built once is one tap away.

**Screenshot:** the hub with two saved sets showing above the exercise cards.

## Scale Studio `/flute-studio/exercises/scales`

**For:** building any scale, in any key and pattern, the way you want to play it today. Unlike a printed scale book, it isn't fixed.
**Key interactions:**
- Choose key, type (major, minors, chromatic, whole tone, diminished, augmented, arpeggios), pattern (thirds, octaves...), articulation and range. It's engraved live.
- Presets, named saved sets, a tempo pill and rep counts per day.

**Screenshot:** the Customize panel open beside an engraved two-octave pattern (for example, harmonic minor in thirds). It shows the score being generated, which no PDF can do.

## Cookie's scale routine `/flute-studio/exercises/cookie-scales`

**For:** a fixed daily scale routine laid out like a book of exercises. It also lives in the Library.
**Screenshot:** optional. Scale Studio tells the story better.

## Long tones `/flute-studio/exercises/long-tones`

**For:** sound and pitch work.
**Key interactions:**
- Hold a note. The mic listens automatically and draws a live pitch graph, coloured by how close you are.
- A repeat rule, and history per note.
- Your tendencies feed a sharp/flat map in My Studio.

**Screenshot:** the close-up stage mid-note, with the pitch line inside the green band and a grade card showing. Use a real or replayed take; an empty graph says nothing.

## Breathing Lab `/flute-studio/breathing`

**For:** guided breathing at a pace you set.
**Key interactions:** the breathing ring counts in and out, an eight-round strip shows the pattern, and you can set the counts, lengthen the exhale or shorten the inhale.

**Screenshot:** mid-exhale, with the ring partly filled and the round strip below. It's calm and very readable.

## Rhythm drills `/flute-studio/rhythm-drills`

**For:** reading and tapping rhythms.
**Key interactions:**
- Pick Easy, Medium or Hard. A new rhythm is made each time (sometimes a real bar from the Library, named after you play it).
- A one-bar count-in, then you tap. Each tap is graded under its note.

**Screenshot:** the result of a round, with tap marks under each note and one late tap in orange.

## Tricky bits `/flute-studio/tricky-bits`

**For:** the hard passages you saved from pieces, practised across pieces.
**Key interactions:** each bit is engraved small. You can listen, set a tempo, and use a tempo ladder (one row per tempo you've worked at, with its tally), then jump to the piece at those bars.

**Screenshot:** one bit open with a ladder of three or four tempos and tallies. It shows slow-practice method, which flute teachers will recognise.

## Learn `/flute-studio/theory` and the Learn tab

**For:** reading music, for any instrument (treble clef only, no fingerings).
**Key interactions:**
- Lessons (first notes, rhythm, measures, rests, dots and ties, accidentals, key signatures, articulation, rhythm practice) built as short steps.
- Cookie (the cat) narrates. Each step has one idea and one thing to do: drag a note, tap a rhythm, pick a clef.

**Screenshot:** a mid-lesson step on iPad with Cookie's line and the interactive staff, for example placing a note on a ledger line.

## Fingering chart `/flute-studio/fingerings`

**For:** every fingering from low B up, with alternates.
**Key interactions:** a note picker by octave that stays still while you step through notes, and the real flute diagram beside the note.

**Screenshot:** a high-register note with an alternate fingering shown.

## Trill chart `/flute-studio/trills`

**For:** trill fingerings over four octaves, with the keys that move highlighted.
**Screenshot:** a trill with the moving key marked, picker docked at the bottom.

## Body and embouchure `/flute-studio/embouchure`

**For:** a 3D look at posture, air and the lips, from low notes to high.
**Key interactions:** move through registers. The 3D cutaway shows the jaw and the air angle change, with one short line per body part.

**Screenshot:** the 3D cutaway in the high register with the cue text. It's the most visually striking page in the studio.

## Technique roadmap `/flute-studio/roadmap`

**For:** every flute skill on one map, and what each skill builds on.
**Key interactions:** regions you can tick off, and a skill's detail with what it needs first.

**Screenshot:** the full map with a few regions ticked and one detail open.

## Resources `/flute-studio/resources`

**For:** reference material, kept apart from things you do in a session.
**Screenshot:** skip.

## My Studio `/flute-studio/practice`

**For:** your practice: today, what you're working on, and how it's going.
**Key interactions:**
- Today's practice: a timer and a routine checklist.
- Coming up: deadlines, with their pieces.
- Working on, and Tricky bits.
- Want to learn / Learned / Recently opened as piles.
- Practice insights: a calendar heat map, the day's sessions, where your time goes, most practised.
- Pitch tendencies: a sharp/flat map by note.

**Screenshot:** Practice insights with a month of data (heat map plus day panel), or the pitch tendency map. Both read as real product analytics.

## Mock audition `/flute-studio/practice/mock?deadline=…`

**For:** rehearsing an audition. It's built from a deadline's excerpts.
**Key interactions:** choose how many excerpts, the pause between them, and whether to record. It then serves them at random, like a panel would, with one recording for the whole run.

**Screenshot:** an excerpt on screen mid-run with the recording indicator. It's a strong "this solves a real musician's problem" image.

## Tools `/flute-studio/tools` and the practice dock

**For:** things that run while you play. The tuner, metronome and drone open in a dock that stays over any page (on phone, a bottom sheet).

**Screenshot:** the score reader with the dock open over it (tuner showing a note), to show that the tools work alongside the music.

## Pitch tendency test `/flute-studio/tools/tendency`

**For:** finding which notes you play sharp or flat.
**Key interactions:** tune your A, then play chromatically up and down the staff range, with retries. The result is a heat map relative to your own tuning.

**Screenshot:** the finished heat map.

## Sync devices `/flute-studio/transfer`

**For:** moving your studio between devices without an account: a code to copy or a file to send, merged on the other side.
**Key interactions:** copy code, send as file, paste to receive (with a summary before you combine), storage by group with delete, and offline music.

**Screenshot:** skip for a portfolio, or show the Receive card with a pasted code's summary. It's worth mentioning in text: no backend, merge rules, tombstones.

## Gear menu (every page)

Language (English / 中文), Apple Pencil only drawing, Sync devices with a backup reminder, private music access, about.

---

## A shortlist for a portfolio

If only six shots:
1. Score reader during playback (beat sticks, cursor, toolbar).
2. Scale Studio, Customize open beside the engraved pattern.
3. Long tones, live pitch graph.
4. Body and embouchure, 3D cutaway.
5. My Studio insights or the pitch tendency map.
6. Mock audition mid-run, or the reader with the tools dock open.

Chinese is fully supported. One screenshot pair (the same page in English and 中文) shows this quickly.
