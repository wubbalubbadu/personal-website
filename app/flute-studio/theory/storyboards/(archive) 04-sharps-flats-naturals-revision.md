> **Archived October 7, 2026:** superseded by later lesson 4 rebuilds; the code is the reference now.

# Lesson 4 revision plan (after the first build)

Fixes for the built lesson (`theory/accidentals/AccidentalsLesson.tsx`), from the user's review.
Same rules as `04-sharps-flats-naturals-build.md` (no commits, `tr()` for every string, no dashes,
lint and type check after each part, copy lesson 3's structure). Do the parts in order.

## What went wrong, so it doesn't happen again

1. **The keyboard became the activity.** Steps 1 and 6 asked the learner to find keys, which is
   a piano lesson, not a notation lesson. **Rule from now on:** the learner acts on the *notation*
   (draws a sign, reads a note, matches written notes). The keyboard only shows where a written
   note lives; it lights up, it is never the thing being tested.
2. **Three steps in a row had the same action** (tap in front of a note). Each step now has a
   different kind of action: watch, draw, draw, choose, answer, match.
3. **Things appeared without being explained** (A♯ next to B♭, then E♯ and F sliding in). Every
   pair or comparison must be introduced by the narration or Cookie *before* the learner is asked
   to do anything with it, and nothing on the staff moves sideways when something new appears.

## Part A: shared fixes (all lessons)

### A1. Answers go under the music, not in Cookie's bubble
Answer buttons in the bubble felt unfamiliar, and lesson 1 already puts its answers under the staff
(`NotePractice.tsx`, `lesson-choices`). Make every lesson match lesson 1:
- Lesson 3 (`MeasuresLesson.tsx`) and lesson 4: every `extra={<div className="measures-choices">…}`
  moves into `tools` (the row under the music). Cookie's bubble keeps only Cookie's sentence and
  Next.
- Keep the button look (`measures-choices` buttons), just in the tools row.
- **Once the right answer is picked, the answer buttons disappear** (render them only while the
  question is unsolved). The right answer is confirmed by Cookie's green bubble and the music, not
  by a still-clickable row.

### A2. Progress dots move out of the bubble
They go in their own row **between the scene and Cookie's bubble**, centred.
- `LessonFrame.tsx`: render `<div className="lesson-progress">{progress&&<ProgressDots …/>}</div>`
  after the scene section, **always**, so the row's height is reserved even when there are no
  dots (the layout must not jump when an exercise starts).
- CSS: `.lesson-progress{height:14px;display:flex;justify-content:center;align-items:center;margin:6px 0}`.
  Remove the dots from `.lesson-actions` and the `margin-right` from `.progress-dots`.
- Update `LESSONS.md` principle 8: "progress dots, in their own row under the music".

### A3. Cookie's bubble must not move
The bubble shifts down when an answer is right. Give `.lesson-bubble` a fixed `min-height` that fits
two lines of message plus the Next button (measure it at desktop and at 1180 × 820), and check it
no longer moves between asking, wrong and right in lessons 3 and 4.

## Part B: the theory index card

The lesson 4 card's description wraps to three lines, so the card loses its bottom padding.
- New description: `tr('Sharps, flats and how long a sign lasts.','升号、降号，以及一个记号管多久。')`.
- Check all four cards at desktop width and at 1180 × 820: every description is at most two lines
  and the bottom padding matches lessons 1 to 3. If a title wraps to two lines, shorten nothing
  else; report it instead.

## Part C: the lesson, step by step

New step names: `tr('Half steps','半音')`, `tr('Draw a sharp','画升号')`, `tr('Draw a flat','画降号')`,
`tr('Naturals','还原号')`, `tr('Through the measure','一整个小节')`, `tr('Same key, two names','同一个键，两个名字')`.

The scene stays "staff on top, keyboard below", but in steps 2 and 3 the staff is a **close-up**
(one note, drawn large) so a finger can draw on it. Keep the scene's total height identical in
every step.

### C1. Half steps: watch, then read
Replace "tap any key and see its neighbour" entirely. Nothing asks the learner to tap the keyboard.
- **Scene:** the staff with C D E F G A B C, the keyboard below.
- **Narration:** `tr('Every note you’ve read so far is a white key. From one key to the very next one, black or white, is a half step.','目前你读过的每个音都是一个白键。从一个键到紧挨着的下一个键，不管黑键还是白键，都是一个半音。')`
- **Listen** plays the eight notes; each note and its key light red together.
- **Tap a note on the staff** (not the keyboard): it plays and its key lights. The keyboard is not
  tappable in this step.
- **Then a fixed demonstration, stepped by Next** (allowed: Next may step through a demonstration):
  1. `tr('Show me →','演示给我看 →')`: E and F light on the staff and keyboard with an arc between
     the keys. Cookie: `tr('E and F have no key between them. They’re a half step apart.','E 和 F 之间没有别的键，它们相差一个半音。')`
  2. `tr('And F to G? →','那 F 到 G 呢？ →')`: F and G light, the black key between them pulses
     once. Cookie: `tr('F to G skips a black key, so that’s two half steps. The black key has no line or space of its own. This lesson is about how to write it.','F 到 G 中间隔着一个黑键，所以是两个半音。这个黑键在五线谱上没有自己的位置。这节课就是讲怎么写它。')`
  3. Then the normal `Next: Draw a sharp →`.
- **Remove the hover tint on notes.** Delete `.acc-note-hit:hover{…}` from `accidentals.css`, and
  check every lesson for any other coloured hover on noteheads (there must be none; principle 4,
  colour has fixed jobs).

### C2. Draw a sharp
- **Scene:** a close-up staff with one F; the engraved sharp shown faintly in front of it as a
  guide; the keyboard below with F lit.
- **Narration:** `tr('A sharp raises a note by a half step. It’s written just in front of the note, on the same line or space.','升号把一个音升高半音。它写在音符的前面，和音符在同一条线或同一个间上。')`
- **Interaction: trace the sharp** with finger, pencil or mouse, like lesson 1's treble clef
  tracing. Reuse `traceProgress.ts` (`traceSegment`, `traceComplete`), the same way
  `ClefTracing.tsx` does. The sharp is four straight strokes: two upright lines and two slanted
  bars. Define each stroke as a segment in staff coordinates relative to the note, and tune them
  by drawing the engraved glyph at 25% opacity underneath until they sit on it. A stroke counts
  when `traceComplete` passes for that segment; strokes can be drawn in any order.
- **When all four are done:** the tracing fades, the engraved sharp appears, the keyboard light
  moves one key right, and F then F♯ play. Cookie: `tr('F sharp: one key up from F. Same space on the staff, one sign in front.','升 F：比 F 高一个键。还在五线谱的同一个间，只是前面多了一个记号。')`
- **Clear** button in the tools row (like clef tracing) to start over.
- **Done:** the sharp is complete.

### C3. Draw a flat
Same as C2 with B and a flat (two strokes: the upright line, and the rounded bowl as a short
polyline of segments). When done: the light moves one key left; B then B♭ play. Cookie:
`tr('B flat: one key down from B.','降 B：比 B 低一个键。')`
- **No A♯ here, no E♯ here.** Two names for one key is its own step at the end (C6).

### C4. Naturals: choose the sign
A different action again: choose, don't draw.
- **Scene:** F♯ on the staff (normal size), F♯ lit on the keyboard.
- **Narration:** `tr('A natural cancels a sharp or flat. The note goes back to its plain letter.','还原号取消升号或降号，让音回到原来的音名。')`
- **Cookie:** `tr('Listen: this should be a plain F. Which sign makes it one?','听：这里应该是原来的 F。哪个记号能做到？')` Listen plays plain F.
- **Answers under the music:** three buttons showing the engraved glyphs ♯, ♭, ♮ (drawn with
  `ACCIDENTALS`, not text characters), with `aria-label`s "sharp", "flat", "natural".
- Right (♮): the natural replaces the sharp on the staff, the light moves to F, F plays; buttons
  disappear. Then the same once more with B♭ (should be plain B). Progress dots: 2.
- Wrong: Cookie: `tr('That one moves the note. The natural is the sign that takes it back to plain.','这个记号会让音移动。能让它回到原来音名的，是还原号。')`

### C5. Through the measure: fix the playback and the answers
Keep the three questions. Fix:
- **Play only the measure the question is about.** After the right answer to question 1, play
  measure 1 only (F♯ G F A), not both measures. Then, to show the bar line resets it, Cookie's next
  line says so, and a Listen button plays measure 2 on its own.
- **Answer buttons disappear once right** (Part A1). They move under the music (Part A1).
- **Check:** the reach band ends exactly at the bar line (question 1) or at the natural
  (questions 2 and 3).

### C6. Same key, two names: draw lines to match
Replaces "Read two phrases". No keyboard playing.
- **Scene:** two columns of small staffs, four on the left and four on the right, each with one
  note. Every left note has exactly one partner on the right that is the same key. The keyboard
  stays below as a picture.
- **Narration:** `tr('One key can have two names. The black key between A and B is A sharp, and it’s also B flat. Which name you see depends on the music.','一个键可以有两个名字。A 和 B 之间的黑键，既是升 A，也是降 B。你看到哪个名字，要看是什么音乐。')`
- **First pair is shown, not asked:** A♯ and B♭ are already joined by a line, and both light the
  same key. Cookie: `tr('These two are the same key. Draw a line from each note on the left to its partner on the right.','这两个是同一个键。从左边的每个音，画一条线到右边和它同一个键的音。')`
- **Interaction:** drag from a left note to a right note (pointer events with capture, like
  `BarLineDrawing.tsx`). While dragging, the keyboard lights the left note's key. On release over
  a right note: if they're the same key, the line stays (green), both notes play, both light the
  key. Otherwise the line fades away, the right note's key lights red briefly, and Cookie:
  `tr('Those are different keys. Find where each one lands on the keyboard.','这两个不是同一个键。看看它们各自落在键盘的哪里。')`
- **Pairs** (fresh each time, three drawn from this pool, plus the shown A♯/B♭): C♯/D♭, D♯/E♭,
  F♯/G♭, G♯/A♭, and one white-key pair, always included: E♯/F (or B/C♭). When E♯/F is matched,
  Cookie: `tr('A sharp doesn’t always land on a black key. E sharp is just F.','升号不一定落在黑键上。升 E 其实就是 F。')`
- Right column order is shuffled; left column order is not.
- **Progress dots:** 3 (the pairs the learner draws).
- **Keyboard:** show answer after two wrong lines on the same left note (outline the right partner).
- **Done and lesson end:** after the last pair, Cookie: `tr('Writing a sharp in front of every F gets tiring. Next lesson: how music says “always”.','每个 F 前面都写升号挺累的。下一课：音乐怎么说“一直这样”。')`
  Next: `Finish lesson` → `course.finish('accidentals')`, as before.

### C7. Remove
- The "Read two phrases" step, both phrase data constants and their test cases (keep the carry rule
  tests in `tests/accidentals.test.mjs`).
- The neighbour/arc logic from step 1's keyboard taps (the arc itself stays for the demonstration).
- Update `04-sharps-flats-naturals.md` (storyboard) to this flow and mark it draft 5.

## Part D: checks

At desktop and at 1180 × 820, in English and Chinese:
- [ ] Lint, type check, `node --test tests/accidentals.test.mjs`.
- [ ] No step asks the learner to find a key on the keyboard.
- [ ] No two steps in a row use the same action (watch, draw, draw, choose, answer, match: the two
      drawings are the one allowed repeat, on different signs).
- [ ] No coloured hover on noteheads anywhere in lessons 1 to 4.
- [ ] Progress dots sit between the music and Cookie, and nothing moves when they appear.
- [ ] Answer buttons sit under the music in lessons 1, 3 and 4, and vanish once answered right.
- [ ] Cookie's bubble does not move between asking, wrong and right.
- [ ] Tracing works with a finger on iPad and with a mouse; Clear restarts it.
- [ ] Matching lines can be drawn with a finger; a wrong line never stays on screen.
- [ ] The theory index cards all have at most two lines of description and equal padding.
- [ ] No commits.
