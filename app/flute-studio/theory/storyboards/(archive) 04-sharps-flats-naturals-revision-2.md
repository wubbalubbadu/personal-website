> **Archived October 7, 2026:** superseded by later lesson 4 rebuilds; the code is the reference now.

# Lesson 4 revision 2 (corrected after review)

Builds on the current code (revision 1 is in: `SignTracing.tsx`, `MatchNotes.tsx`, `pairs.ts`, the
progress-dot row, answers under the music). This replaces Part C of
`04-sharps-flats-naturals-revision.md`; Parts A and B there still stand. Same rules as before: no
commits, every string through `tr()`, no dashes, lint and type check after each part.

## The user's feedback on revision 1

1. **Half steps opens awkwardly.** It asks you to tap a note on the staff to light its key. The
   natural instinct is to tap the keyboard, which does nothing, and lighting a key from a note
   teaches nothing new. Then it jumps straight to "E and F have no key between them" with no
   concrete example first.
2. **Interactions exist for their own sake.** An interaction should be the moment the learner
   takes in the new idea, not a tap to fill the step.
3. **Sharp and flat should be one connected idea.** Show two notes with a black key between them.
   Draw a sharp on the lower note and a flat on the upper one, and the learner discovers they're
   the same key. "Same key, two names" comes out of that flow instead of being a separate puzzle.
4. **Nobody reads the narration line.** The eye goes straight to Cookie's bubble at the bottom and
   skips the line at the top. The gap between the two is too big, and the narration arrives all
   at once with no reason to look up.
5. **Choosing the natural from three signs isn't a real exercise.** The natural needs a reason:
   plain notes don't need a sign, so why have one? Because once a sharp is written, you need a way
   to bring the note back. Take the sharp note you just made and bring it back with a natural.
6. **Through the measure, question 1:** the second measure is shown but nothing asks about it.
7. **The matching step is unreadable.** Eight small staffs are stacked so tightly that the clefs
   are cropped, so you can't tell which note is which (see the screenshot of the current build).

A reviewer then corrected the first draft of this plan; those corrections are already folded in
below: no dashed notehead between C and D, the same notes carried from step 1 into step 2 (C♯ and
D♭), restrained narration with explanations in the scene rather than in Cookie, exact wording for
the accidental rule, a question 3 that fits its measure, E♯ shown before it's matched, and a
matching screen that fits at 1180 × 820.

## Principles this adds (put these in LESSONS.md)

- **Principle 1, add:** "Every interaction is the moment the learner takes in the idea: they make
  the new thing happen, or notice it. Never an interaction only to have one."
- **Principle 5, add:** "Explanations live where the eye is: in the narration and next to the thing
  they describe in the scene (a label beside the lit keys), never only in Cookie. Cookie invites
  the action and reacts. One idea per stage, and the narration changes with each stage."

## Part A: narration that gets read (lesson 4 only, for now)

Try this in lesson 4 first. If it works, lesson 3 gets it in a later pass; don't change lessons 1
to 3 now.

1. **One idea per stage.** A step can give its narration per stage (the same stages that already
   drive Cookie's messages). When the stage changes, the new sentence fades in (opacity 0 to 1,
   0.25 s). No darkening, no delay on Cookie: both update together.
2. **Teaching goes in the scene, not in Cookie.** When a step defines something (half step, sharp,
   flat, natural), the definition is the narration, and where it describes a thing on screen, a
   short label sits beside that thing (for example "half step" above the arc joining two lit keys).
   Cookie's line only invites the action ("Press Listen", "Draw the sharp") or reacts to it.
3. `prefers-reduced-motion`: no fade.

## Part B: the lesson, new flow

Five steps:

```ts
const FLOW=['between','sharpflat','natural','measure','same'] as const;
names: tr('Between the notes','音与音之间'), tr('Sharp and flat','升号与降号'),
       tr('Bringing it back','还原'), tr('Through the measure','一整个小节'),
       tr('Same key, two names','同一个键，两个名字')
```

The scene stays "staff on top, keyboard below". The **keyboard is always playable** (tapping a key
sounds it and lights it), because that's what everyone tries first, but no step ever *tests* a key.

### Step 1: Between the notes (a demonstration, stepped by Next)

Staff: C and D. Keyboard: C4 to D5 as now. The staff never shows anything between C and D: no
dashed or ghost notehead. The middle sound exists only on the keyboard in this step; step 2
answers how to write it.

| Stage | Next label | What happens | Narration | Label in the scene | Cookie |
|---|---|---|---|---|---|
| 1 | (start) | C and D on the staff, their keys lit. | `tr('C and D sit right next to each other on the staff.','C 和 D 在五线谱上紧挨着。')` | none | `tr('Press Listen to hear them.','点“听一听”听听它们。')` |
| 2 | `tr('What’s between them? →','它们之间有什么？ →')` | The black key between them lights; C, the black key, D play in turn. The staff is unchanged. | `tr('On the keyboard there’s one more key between them. Each neighbour is a half step away.','在键盘上，它们之间还有一个键。相邻的两个键相差一个半音。')` | "half step" (半音) above each of the two arcs: C to the black key, the black key to D. | `tr('Press Listen again and follow the three keys.','再点一次“听一听”，跟着这三个键听。')` |
| 3 | `tr('Not always →','也不总是这样 →')` | E and F replace C and D; their keys light, one arc, they play. | `tr('E and F have no key between them. They’re already a half step apart.','E 和 F 之间没有别的键，它们本来就相差一个半音。')` | "half step" above the E to F arc. | `tr('So how do we write that middle sound between C and D? Let’s find out.','那 C 和 D 中间那个音怎么写？我们来看看。')` |

`ready` after stage 3.

### Step 2: Sharp and flat (draw both, discover they're the same)

Staff: **C and D**, the same notes as step 1, with room in front of each (`reserveAcc`). The black
key between them is outlined on the keyboard. This answers the question step 1 ended on.

| Stage | Narration | Learner does | Then |
|---|---|---|---|
| 1 | `tr('A sharp raises a note by a half step. It’s written in front of the note.','升号把一个音升高半音，写在音符前面。')` | Traces the sharp in front of C (existing `SignTracing`). | The engraved ♯ appears, C♯ plays, the black key lights. Cookie: `tr('That’s C sharp. Now try the other side.','这就是升 C。再从另一边试试。')` |
| 2 | `tr('A flat lowers a note by a half step.','降号把一个音降低半音。')` | Traces the flat in front of D. | The engraved ♭ appears, D♭ plays, **the same black key lights**. |
| 3 | `tr('C sharp and D flat are the same key: two names for one sound.','升 C 和降 D 是同一个键：一个音，两个名字。')` | Presses Listen: C♯ then D♭, identical. | Cookie: `tr('Which name you see depends on the music. Lesson 5 shows why.','你看到哪个名字，要看是什么音乐。第 5 课会讲为什么。')` |
| 4 | `tr('A sharp doesn’t always land on a black key. E sharp is the key just above E: F.','升号不一定落在黑键上。升 E 就是 E 上面紧挨着的键：F。')` | Presses Next (`tr('One more →','还有一个 →')`) to see it: the staff changes to E♯ and F (both engraved, nothing to draw), the F key lights for both, Listen plays both. | Cookie: `tr('Same sound again, two names.','又是同一个音，两个名字。')` |

The tracing guide for whichever sign is next is the only faint sign shown. `ready` after stage 4.

### Step 3: Bringing it back (why a natural exists)

Staff: one measure, F♯ A F, with the time signature 3/4 (lesson 3 knowledge; the measure is full).

| Stage | Narration | Learner does | Then |
|---|---|---|---|
| 1 | `tr('This sharp also applies to later Fs in the same octave, until the bar line.','这个升号也管着同一个八度里后面的 F，一直到小节线。')` | Presses Listen. | All three play; the last F sounds as F♯ (lit on the black key, circled on the staff). Cookie: `tr('This last F is sharp too. What if the music wants plain F here?','最后这个 F 也是升 F。如果音乐在这里要的是原来的 F 呢？')` |
| 2 | `tr('A natural cancels the sharp. This F returns to the white key.','还原号取消升号。这个 F 回到白键上。')` | Traces the natural in front of the last F. | The engraved ♮ appears; Listen plays F♯ A F, the last F now on the white key. Cookie: `tr('Back to plain F. That’s what a natural is for.','回到了原来的 F。这就是还原号的用处。')` |

Natural tracing: two upright strokes and two slanted bars, defined like the sharp's in
`SignTracing`. `ready` after stage 2. This replaces the "pick a sign from three" step completely.

### Step 4: Through the measure (fix the dead measure)

Keep three questions, answers under the music. **Once the right answer is picked, the buttons
are removed but their row keeps its height** (render the row with `visibility:hidden` contents, or
an empty row of the same height), so nothing can be clicked after a right answer and nothing below
moves. Every row shows the 4/4 time signature, and every measure on screen is asked about:

| # | Notes | Bars | Circled | Choices | Answer | Right answer (Cookie) |
|---|---|---|---|---|---|---|
| 1 | F♯ G F A (one measure) | none | the 2nd F | Sharp / Plain | Sharp | `tr('Sharp. The sign earlier in the measure still counts.','升 F。小节前面的记号还管着它。')` |
| 2 | F♯ G A G \| F A G A | `[4]` | the F after the bar line | Sharp / Plain | Plain | `tr('Plain. The bar line ended the sharp.','原来的 F。小节线让升号结束了。')` |
| 3 | B♭ B♮ A B (one measure) | none | the last B | Flat / Plain | Plain | `tr('Plain. The natural cancelled the flat.','原来的 B。还原号把降号取消了。')` |

Question text for all three: `tr('Is the circled note sharp (or flat), or plain?','圈出的音是升（降）音，还是原来的音？')`
written per question with only the relevant word (sharp or flat). After a right answer, play only
the measure that holds the circled note, and draw the reach band from the sign to where it ends.

### Step 5: Same key, two names (readable matching)

Replace the two columns of eight small staffs with **two full-size staffs, one above the other**,
each with the clef drawn completely:

- **Top staff:** four notes, left to right: C♯, F♯, A♯, E♯.
- **Bottom staff:** their partners in shuffled order: D♭, G♭, B♭, F.
- **The first pair is already joined** as the example: C♯ to D♭, the pair from step 2. Cookie:
  `tr('You found this pair in step 2. Connect each top note to its partner below.','这一对你在第 2 步已经找到了。把上面的每个音连到下面和它同一个键的音。')`
  E♯ to F was shown at the end of step 2, so the learner has seen it before being asked.
- **Hide the keyboard on this step** so the two staffs fit. A `Hint` button in the tools row shows
  the keyboard with the current top note's key lit; it hides again when that pair is matched.
- **Two ways to connect**, both must work: drag from a top note to a bottom note (as
  `MatchNotes.tsx` does now), or tap a top note (it gets a red ring) then tap a bottom note.
- Right: the line stays (green), both notes play. Wrong: the line fades, Cookie:
  `tr('Those are different keys. Press Hint to see where each one is.','这两个不是同一个键。点“提示”看看它们各在哪里。')`
- Progress dots: 3.
- **Targets in real screen pixels:** every note's tap and drop target is at least 48 × 48 CSS
  pixels at 1180 × 820 and at desktop width. Measure with `getBoundingClientRect`, not in staff
  units.
- **Fit check:** narration, both staffs with the gap between them, the tools row, the progress row
  and Cookie must all fit at 1180 × 820 without scrolling.
- The lesson ends here, as now (Finish lesson, then the bridge line to lesson 5).

## Part C: remove

- The "tap a note to light its key" interaction and the old half-steps messages.
- The separate "Draw a sharp" and "Draw a flat" steps (merged into step 2).
- The three-sign choice for naturals.
- The two-column small-staff layout in `MatchNotes.tsx`.
- Any dashed or ghost notehead between two letters.
- Update the storyboard `04-sharps-flats-naturals.md` to this flow (draft 6).

## Part D: checks

At desktop and 1180 × 820, English and Chinese:
- [ ] Lint, type check, `node --test tests/accidentals.test.mjs`.
- [ ] Step 1: the staff shows only C and D (nothing between); the "half step" labels sit by the arcs.
- [ ] Step 2: after drawing both signs, the same black key is lit for C♯ and D♭; stage 4 shows E♯ and F on the same white key.
- [ ] Step 3: the last F sounds sharp before the natural is drawn and plain after.
- [ ] Step 4: every measure on screen is asked about; every measure adds up to 4/4; after a right answer the buttons are gone and nothing below moves.
- [ ] Step 5: every note can be named by eye; clefs complete; keyboard hidden until Hint; drag and
      tap-tap both work; targets at least 48 × 48 CSS pixels; everything fits at 1180 × 820.
- [ ] Narration fades in with each stage (0.25 s) in lesson 4 only; no definition appears only in
      Cookie's bubble; with reduced motion, no fade.
- [ ] The keyboard sounds when tapped in every step but is never the thing being checked.
- [ ] No commits.
