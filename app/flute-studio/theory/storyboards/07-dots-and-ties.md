# Lesson 7: Dots and ties (storyboard, redesign, revision 3)

October 10, 2026. Replaces draft 3 (now `(archive) 07-dots-and-ties.md`) after the user's review of the first build,
then revised the same day after a second and a third review. Local only; no commit or deployment. Read with LESSONS.md and
theory/COMPONENTS.md.

## Why a redesign

The first build was a list of mechanisms (add a dot, count "and", place an eighth, connect two notes, split a beat into
three) without a question behind each one. This plan builds every step on what the learner already knows from lessons
2, 3 and 6:

- a quarter note is 1 beat, a half note 2, a whole note 4, an eighth half a beat;
- two eighths share one count (lesson 3 brackets them under one number);
- a measure of 4/4 holds exactly 4 beats.

The lesson answers one question: **how do we write lengths that no single note shape gives us?** First answer: a tie
(lengths add up). Second: the dot, the usual shorthand for the same tie.

## Feedback and where it is answered

First review:

| # | Feedback | Answer |
|---|---|---|
| 1 | Hover boxes (fill, red dashed circle) on the dot target, the dot and the bar line | No hover fill or outline on any target. Targets are the music itself with an invisible hit area, arrow cursor, a keyboard focus ring only. No dashed placeholder circles. |
| 2 | The dot was added with no question behind it | Step 1 opens with: half = 2 beats, whole = 4; how do we write 3? |
| 3 | "Between the beats" and counting "and" were confusing | Step gone. No "and" counting. Half a beat is "halfway through beat 2", built on lesson 3's "two eighths share one count". |
| 4 | "Where should the missing eighth start?" made no sense | Nothing is missing. A reading question with three plain answers: Beat 2 / Halfway through 2 / Beat 3. |
| 5 | Connect-the-notes did not work; teach ties by equivalence | See revision 2, point 3. |
| 6 | Triplets were confusing | Out of this lesson (below). |
| 7 | Muddled representation | One staff, one row of counts, one time line, one kind of bracket. |
| 8 | Two cookies in practice | See revision 2, point 8. |
| 9 | Practice instruction too dense | "Tap once when each new note starts. Keep counting while a note holds." The tie rule only on the tie round. |

Second review (revision 2):

| # | Feedback | Answer |
|---|---|---|
| 0 | Theory lessons index did not scroll | The index's route scrolls (`theory-home.css`); phones already had their own scroll area. |
| 1 | Likes adding the dot by tapping the note | Kept. |
| 2 | 1½ beats is hard to feel; brackets not proportional; unclear which notes a bracket means | A time line under the staff where every half beat takes the same room, with half-beat ticks. Step 2 clicks on every half beat (beats louder) and lights each tick, so 1½ reads as three halves. Each note and its bracket share a colour (blue, amber, grey). Labels use fractions (½, 1½), not decimals: they match note names and how musicians say lengths. |
| 3 | Ties introduced from the bar line made no sense | Step 3 shows two notes, the learner ties them, and the narration says the tie combined them into one sound of 1 + ½ = 1½ beats, the same as a dotted quarter. The bar line is step 4, a later use. |
| 4 | Too many buttons | Slower is gone. Teaching steps have no buttons under the music (the action plays the result once; tapping a note replays it). Practice keeps Count me in and Hear it. |
| 5 | Wrong taps showed green | New grading: taps pair with note starts (closest first, never two taps to one start) and are green only within 0.1 s. Early, late, extra and missed are orange, and the message counts each kind. |
| 6 | Triplets | Their own later lesson; not built. |
| 7 | Do not switch lessons 2, 3 and 6 to a new tap target yet | Left alone; noted in COMPONENTS.md. |
| 8 | Replace the Tap pad: Cookie should move to the tap area and say "Tap on me" | Built: Cookie hops from the bubble to the tap spot (reduced motion: no hop) and back when practice ends or the step changes. The whole spot is the target; Cookie squishes on each tap. |

Third review (revision 3):

| # | Feedback | Answer |
|---|---|---|
| 1 | Notes sat off their counts (the quarter after a dotted half was drawn near beat 3½) | `EngravedRow` has an opt-in `proportional` spacing; this lesson (and its practice) uses it, so every notehead sits on its count, tick and bracket. Other lessons keep engraver spacing; 35 layouts compared identical to before. |
| 2 | No spoken half-beat count | None, and the open question is dropped. |
| 3 | Introduce the tie first, then the dot as its shorthand | New order: tie a half to a quarter (2 + 1 = 3); the dot as the shorter way to write it; the same for a quarter tied to an eighth (1½, a dotted quarter); then "a dotted quarter lasts as long as how many eighth notes?" with half-beat ticks. A dotted half check ("how many quarter notes?") was added. The bar line stays as a later step. |
| 4 | Cookie should react to the practice result | Cookie at the tap spot uses the same tone as the questions: happy (the questions' pressed face) for a clean attempt, a new small "hmm" face (flat mouth, eyes aside) when taps were off. |
| 5 | Practice: three rounds, harder each time, not all 4/4, with the short-long figure and a tie | 4/4 dotted quarter, eighth, half; 3/4 eighth, dotted quarter, quarter (short-long); 4/4 short-long then a quarter tied to an eighth. Cut time skipped: it makes the half note the beat, which needs its own explanation. |

## Triplets: removed from this lesson

Triplets divide a beat into three, a new idea rather than a longer or joined length. They move to a short follow-up
lesson of their own (LESSONS.md, "After beginner reading"). Quintuplets go with them. Syncopation is not named; the
tied practice round gives a first taste.

## Shared look

- 4/4 rhythm staff with no clef, the same viewBox and staff position in every step, notes spaced in proportion to time.
- Under the staff: counts, the time line (beat ticks, half-beat ticks when halves matter, a black tick at a bar line),
  then one bracket per note in that note's colour (blue, amber, grey).
- During playback the sounding note and the current count and tick turn red. Half-beat steps click on every half beat.
- Targets: invisible hit areas over the music; no hover change; arrow cursor; a focus ring for keyboards only.
- Questions use the lesson 3 answer buttons in Cookie's bubble. Fractions (½, 1½), never decimals.
- Every action plays its result once. Tapping a note replays it with its pulses. No buttons under the music.

## 1. Tie two notes

Sees: half note (blue, "2 beats"), quarter (amber), quarter (grey). Narration: "A half note lasts 2 beats. What if the
first sound should last 3 beats?" Action: "Tap between the half note and the next quarter note to tie them." Feedback:
tie, both blue, "2 + 1 = 3 beats", plays as one sound. "A tie joins two notes of the same pitch into one sound. Their
lengths add up: 2 + 1 = 3 beats."

## 2. The dot

Sees: the tied half and quarter. Narration: "A tie like this is a little awkward to read, so it is usually written with a
dot instead." Action: "Tap the half note to add a dot." Feedback: the notes become a dotted half, same bracket, same
sound. "A dot adds half of the note's value. Half of 2 is 1, so a dotted half lasts 2 + 1 = 3 beats: the same sound as
the tie." Tapping the dot shows the tie again. Check: "A dotted half lasts as long as how many quarter notes?" (3), with
one amber bracket per beat after the answer.

## 3. One and a half beats

Sees: quarter (blue, 1 beat), eighth (amber, ½), eighth, half, with half-beat ticks. Action 1: tie the first two
("1 + ½ = 1½ beats"). Action 2: "Now tap the quarter note to write it with a dot": a dotted quarter, bracket
"1½ = 3 halves", played with a click on every half beat. Check: "A dotted quarter lasts as long as how many eighth
notes?" (3), with three amber half-beat brackets after the answer: "so the next note starts halfway through a beat."

## 4. Across the bar line

Unchanged from revision 2: tie beat 4 to the next beat 1; "A dot can't do this, because each measure must add up to its
own 4 beats."

## 5. Rhythm practice

Three rounds: (1) 4/4 dotted quarter, eighth, half; (2) 3/4 eighth, dotted quarter, quarter ("Now 3/4, three beats in
a measure, and short then long"); (3) 4/4 eighth, dotted quarter, quarter tied to eighth, eighth ("A tied note is one
sound, so it gets one tap"). The count-in is one measure. Cookie at the tap spot, grading and feedback as in revision 2;
Cookie looks happy after a clean attempt and goes "hmm" otherwise.

## Open questions

- Lessons 2, 3 and 6 still tap on a second CookieButton; switch them to the Cookie tap spot once decided.
- Triplets as their own lesson, or folded into the 6/8 follow-up?
- A one-line tie versus slur contrast here, or leave it to the articulation lesson?

## Built (October 10, local)

`dots-and-ties/DotsTiesLesson.tsx`, `RhythmPractice.tsx`, `rhythmSequence.ts` (`gradeTaps`), `dots-and-ties.css`;
`LessonFrame.tsx` (`cookieAway`, Cookie's mood there) and `lesson-shell.css`; `cookie-button.css` (`is-unsure`);
`EngravedRow.tsx` (`tones`, `proportional`); `theory-home.css` (index scroll).
`TieGesture.tsx` and the short-lived `TapPad` were deleted. Tests in `tests/dots-and-ties.test.mjs`.
