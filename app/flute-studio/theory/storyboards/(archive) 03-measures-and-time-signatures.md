> **Archived October 7, 2026:** the plan for lesson 3's rebuild, which is done; the code is the reference now.

# Lesson 3: Measures and time signatures

Built against `../LESSONS.md`. A first build exists in `../measures/MeasuresLesson.tsx` (seven pages:
Measures, Count beats, Find the beat, Top number, Bottom number, Add a bar line, Build a measure; top
and bottom numbers shown side by side; 6/8 left out; cut time as the `𝄵` character). This file reviews
that build and sets the plan for the rebuild.

**The one message:** 4/4 means four beats in every measure, so we count 1 2 3 4. Which count a note
lands on is decided by the lengths before it. We count so we can play the rhythm in time.

**Bridge from lesson 2:** "You know how long each note lasts in beats. How do you keep your place, so
you play each note at the right moment?"

---

## Review of the current build

Most problems come from one place: the lesson draws its music with its own renderer (`Score` in
MeasuresLesson.tsx), and that renderer doesn't engrave like real notation.

**Notation (affects every page)**
- **Mismatched scale.** Staff lines are 22 units apart, but noteheads, stems and the clef are sized for
  the lessons' 24-unit staff. Notes look swollen and the clef oversized: the "not professional" look.
- **Time signatures are typed text** (Georgia), not engraved digits, and tiny on the comparison pages.
- **Spacing is proportional to length and ignores bar lines.** A whole note leaves a big hole, so the
  measures are visible before any bar line exists (the "invisible bar line"), and in the bar-line
  exercise the gaps give the answer away. Bar lines sit at the start of the next beat with no padding,
  so they touch the notes.
- **Symbols from a system font** (𝄵 for cut time) and plain text for counts.

**Page by page**
1. **Measures:** "Listen" plays the whole tune with nothing to watch for, then "Add measures" flashes bar
   lines in. The notes don't move, so nothing shows *why* the bar lines land where they do.
2. **Count beats:** "Hear 1 2 3 4" uses the browser's speech voice, detached from the music. Intended:
   the counts light up in time as the notes play.
3. **Find the beat:** 2 questions; the answer buttons sit in Cookie's bubble, away from the music. "Place
   the beats" uses a separate row of red dots floating up and left of the notes, not the music itself.
4. **Top number:** three small cards with tiny time signatures; nothing moves or plays.
5. **Bottom number:** two small cards, tiny numbers, a system-font ¢, no sound.
6. **Add a bar line:** dashed guides in uneven places (from the spacing); the gaps leak the answer; a
   separate Check button.
7. **Build a measure:** tapping a note cycles its length and the counts run straight across (1 2 3 4 1 2)
   with no bar line. Unclear what it tests, and it repeats page 6's idea.

Across the lesson: most checks test the same thing (count until 4 beats end), and there's no clapping or
playing, so "why we count" never pays off.

---

## Plan for the rebuild

### Step 1: one engraved staff for all lessons

A shared `EngravedRow` used by lessons 2 and 3 and later lessons:
- the lessons' staff coordinates (24-unit spacing, `noteY`), so notes, clef and staff always match;
- engraved glyphs only, from the VexFlow font the app already uses: noteheads, stems, flags and beams
  (as `RhythmNote`), the treble clef, time-signature digits (`v0` to `v9`), common time C (`v41`) and cut
  time ¢ (`vb6`);
- **engraver's spacing:** each note gets a minimum width plus a little more for longer notes (not
  strictly proportional), and each bar line gets padding on both sides, so spacing never reveals the
  measures and bar lines never touch notes;
- **re-spacing animation:** the same notes can be laid out without bar lines (evenly) and with them;
  switching slides every note to its new place (400 ms);
- counts in the score reader's colours (counts `#b65a3c`, held counts gray), beat sticks `#d65b43`, and
  a red "now" highlight that follows playback.

### Step 2: the pages (8, plus optional free play)

One kind of activity per page, and no two exercises check the same way: watch, choose, tap on the music,
switch, draw, clap, then a mixed final check.

**1. Measures** *(watch)*
- **Start:** the Jingle Bells chorus, evenly spaced, no bar lines, no time signature. One control:
  **Add bar lines**. There is no separate "listen first" step.
- **Add bar lines:** the music plays and counts itself (see "Hearing the count" below): "1 2 3 4, 1 2
  3 4". Each time the count returns to 1, a bar line drops in just before that note and the notes
  after it slide to make room.
- **Then the time signature is written in, not popped in:** once the last bar line lands, a 4 writes in
  at the start (top), then a quarter note appears beside a second 4 (bottom), each with one line of
  narration.
- **Narration, in two beats:** first "A long row of notes is hard to follow, so music is split into
  measures: small groups of beats with a bar line after each." Then, as the 4/4 writes in: "The time
  signature says how: 4 beats in every measure, and each beat is a quarter note."
- **Optional:** tapping a measure plays just that measure (a soft tint, no border). Not required.
- **Cookie:** "Press Add bar lines and count along." → after: "Every time the count gets back to 1, a
  new measure starts."
- **Next ready:** after the animation finishes.

**Hearing the count** *(shared by pages 1, 2 and 7)*
- The counts are spoken on the beat, in time with the notes and clicks: "one, two, three, four", in
  English for both languages (everyone knows them). Held counts inside a half or whole note are spoken
  more softly.
- Clips: `public/audio/counts/{one,two,three,four}.wav`, made with the macOS Samantha voice, leading
  silence trimmed so each word starts at its first sample (22 kHz mono WAV, not AAC, which adds a
  startup gap). They're scheduled on the audio clock like the clicks, so they land exactly on the beat;
  the browser's speech voice can't keep time, which is why the first build's count sounded detached.
  A mute toggle keeps just the clicks.

**2. Counting by length** *(watch and listen, then choose)*
- **Start:** the chorus with bar lines and 4/4. **Play:** the counts write themselves in under the notes
  as the music plays and are spoken on the beat; a half note gets its number, then its held number in
  gray (spoken softly); the whole note gets 1, then 2 3 4 in gray. No separate "Show counts" button.
- **Then 4 quick questions on the same page:** a note is circled in red; answer buttons 1 2 3 4 sit right
  under the staff. Right: that measure's counts appear and are spoken. Wrong: the counts write in up to
  the circled note so the learner sees why, then they try again.
- **Answers vary:** the four questions have four different answers (1, 2, 3 and 4 in random order), and
  at least one depends on a half note before it.
- **Cookie:** "Press Play and count along out loud." → questions: "Which beat does the circled note start
  on?" → wrong: "Count from the bar line: the half note takes 1 and 2, so this is 3."
- **Next ready:** all 4 questions right.

**3. Beats and notes are different things** *(tap on the music)*
- **Idea:** the beat keeps going *through* a long note, and two short notes can *share* one beat. (Page 2
  already showed the held count; this page shows both sides.)
- **Start:** one large 4/4 measure: half note, two eighths, quarter. The count 1 2 3 4 is not shown.
- **Tap anywhere above the staff:** a red beat stick (the library's style) drops there and snaps to the
  nearest beat; a right one stays, clicks and speaks its count; one too far from any beat fades.
- **Cookie:** "There are 4 beats in this measure. Tap above the staff where each one falls." → after
  beats 1 and 3: "Where's beat 2, while the half note is still sounding?" → after 3: "Two eighth notes,
  one beat: they share beat 3." → done: "That's what beat sticks show in the music library."
- **Then:** a second measure with the answer beats in different places (quarter, half, two eighths), so
  it's not the same tapping pattern twice.
- **Next ready:** both measures done.

**4. Other top numbers** *(switch and watch, then 2 quick questions)*
- **Start:** the time signature from page 1, now big (about three staff heights) at the left of the scene,
  one measure of quarter notes on a normal staff beside it.
- **Switch 2 · 3 · 4:** the top digit blinks and changes; quarter notes slide in or out; it plays twice,
  counted aloud (1 2, 1 2 3 or 1 2 3 4), beat 1's click louder.
- **Hear it in real music:** once 3 has been tried, "Hear Happy Birthday" plays its first two lines with
  the counting shown. It starts just before beat 1, so the first count shown is 3, with one line:
  "Happy Birthday starts just before beat 1."
- **Then 2 practice questions:** a barred measure (not the same one); "Which top number?" 2, 3 or 4.
  This practises the question that the final check asks.
- **Cookie:** "Switch the top number and count along." → after 3: "Same beat, grouped in threes. Now hear
  Happy Birthday: 1 2 3." → questions: "How many beats in this measure? Pick the top number."
- **Next ready:** 2 and 3 tried, Happy Birthday played, and both questions right.

**5. The bottom number** *(switch and watch)*
- **Start:** the same big time signature, 4/4, with one measure of two half notes counted `1 (2) 3 (4)`.
  Beside the bottom 4, the note it stands for (a quarter note), engraved.
- **Switch 4/4 · 2/2 · 6/8:** the bottom digit blinks and changes, and so does the note beside it.
  2/2: the same two half notes, now counted `1 2`, clicks half as often. 6/8: six eighths (two beamed
  groups of three) counted 1 to 6. Each plays once, counted aloud.
- **Tap the time signature:** 4/4 swaps with C, 2/2 with ¢ (engraved).
- **Narration:** "The bottom number says which note gets one count. A 4 means the quarter note, which is
  what you'll see most." After 2/2 plays: "It sounds the same. What changes is which note you count as
  one." With 6/8 chosen, one line: "6/8 is often felt as two big beats. Its own lesson in Extras covers
  that."
- **Next ready:** 2/2 and 6/8 tried. No quiz.

**6. Draw the bar lines** *(draw)*
- **Start:** a rhythm with its time signature, evenly spaced, no bar lines, only the final double bar. A
  pencil cursor over the staff.
- **Draw:** a downward stroke across the staff leaves a pencil line; on release it snaps to the nearest gap
  between notes and becomes a real bar line (the notes re-space around it). Under each finished measure
  its beat total appears: green when full, orange "5 beats" when not. Tap a bar line to erase it.
- **Rounds:** 3, getting harder: 4/4 quarters only; 4/4 with a half and a whole; 3/4. "Rhythm 2 of 3".
- **Cookie:** "Draw a bar line wherever a measure is full." → wrong: "That measure has 5 beats. 4/4 holds
  4." → right: "Every measure holds exactly 4!"
- **Next ready:** 3 rounds right.

**7. Count and clap** *(perform: why we count)*
- **Start:** two measures with bar lines and counts; Listen, Count me in, and the clap button from lesson 2.
- **Count me in:** 4 clicks with big counts 1 2 3 4 above the staff, then the clicks keep the beat while you
  clap each note; the current count lights; each clap flashes the note it matches.
- **Rounds:** 2, the second in 3/4.
- **Cookie:** "Press Count me in and clap each note." → right: "Right in time!" → uneven: "Count along out
  loud and try again." → end: "That's reading rhythm: count, then play."
- **Next ready:** both pass.

**8. Read new rhythms** *(final check, mixed)*
- 4 fresh questions, one of each kind: draw the bar lines (4/4); which beat does the circled note start
  on?; which time signature fits this barred rhythm (2/4, 3/4 or 4/4)?; draw the bar lines (3/4).
- 3 of 4 on the first try to finish, else "New set". Progress "Question 2 of 4".
- **Cookie:** "Last one: rhythms you haven't seen." → pass: "You can find your place in any rhythm now."

**9. Free play** *(optional)*
- A small beat machine: 2/4, 3/4, 4/4, 6/8 and a tempo; a low drum on beat 1, ticks on the others. Next is
  "Back to theory lessons".

**Removed:** Build a measure, the browser speech voice, the required measure tap and its border, the separate
dot row for beat placement, the small comparison cards, and the Check button.

### Step 3: order of work

1. `EngravedRow`: engraved time signatures and engraver's spacing (fixes the look everywhere).
2. Pages 1, 4 and 5 (the demos) on the new staff.
3. Pages 2, 3 and 6 (the exercises), then 7 and 8.
4. Move lesson 2's scenes onto `EngravedRow` too, so both lessons look identical.

## Revision after the second play-through

- **Counting:** Frère Jacques (measures 1, 3, 5) replaces Jingle Bells. Measure 3 has eighth pairs; each pair gets one count, centred under a small bracket.
- **Beats and notes:** Cookie demonstrates first. Next marks one beat at a time on half note + four sixteenths + two eighths, playing that beat and explaining it. Then you mark 8 beats across two busy measures by drawing a short pencil line (taps get a hint, and lines off the beat are rejected). No tap pad.
- **Page 1** names "the time signature". **Page 4** points at the 2/4, 3/4, 4/4 buttons.
- **Draw bar lines:** rounds are 4/4 mixed, 4/4 with eighths, 3/4 with eighths. Wrong answers say "Tap a bar line to erase it". Only measures closed by a bar line are judged.
- **Read and play** (was Count and clap): reading, not copying (lesson 2's tap step is the copying one). You tap the CookieButton; Start counts one whole measure in, shown in Cookie's bubble. Listen appears only after a first try. Rounds: 4/4 with eighths, 3/4 with eighths, 6/8 (eighth gets the beat, slower).
- **Read new rhythms:** each question says what it is ("First, draw the bar lines in this 4/4 rhythm"). Material uses eighths. The result appears in Cookie's bubble right after the last answer; there is no results screen.

## Revision after the third play-through

- **The review page ("Read new rhythms") is gone.** It only repeated earlier exercises. The lesson finishes on the last Read and play rhythm. No lesson gets a review page (see LESSONS.md principle 8).
- **Counting:** 3 questions, not 4, phrased as "Which beat…", "Next one…", "Last one…".
- **Beats and notes:** Hint puts a dashed mark on the next missing beat and explains it ("Beat 4 is inside the half note, halfway to the next note"). Show answer appears after a hint or two misses. A stroke counts as a beat if it's under 45% of the way to the neighbouring beat on that side, so a line between a half note and the next note lands on the beat inside the half note. Misses say what's there (a note that starts between beats, or a beat inside a long note).
- **Other top numbers:** the quiz is 3 questions: "This piece is in 7/4. How many beats in each measure?" (4 / 7 / 11), then two measures to count with eighths, and Cookie says the quarter note gets one beat.
- **The bottom number:** after trying 2/2 and 6/8, one question: what does 9/16 mean? Phrase answers, stacked in Cookie's bubble.
- **Read and play:** Cookie says "I'll give you 4 counts to get ready" (3 in 3/4, 6 in 6/8). Start waits about a second with "Here come 4 counts to get ready…" before the count-in.
