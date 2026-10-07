# Lesson 4: Sharps, flats and naturals (storyboard, draft 6: after the second review)

Bridge: *Every note you've read so far is a white key. How do we write the keys between them?*
Six steps, about 5 to 7 minutes. Plan only, not an implementation spec. Built against LESSONS.md;
the principles there decide anything this document leaves open.

## Who it's for

A beginner to music, not just to an instrument. They read letter names on the treble staff
(lesson 1), note lengths (lesson 2) and measures (lesson 3). We don't assume they can hear that a
note is "wrong", so nothing asks them to find something by ear: sound demonstrates, and the
learner acts on the staff and the keyboard, where an answer can be seen.

This is an introduction the learner can finish, not a drill. The symbols come first (steps 2 to
4), the rule for how they carry through a measure is tested once all three are familiar (step 5),
and the musical payoff is a real tune at the end (step 6).

## What carries over from lessons 1 to 3

- **Same frame.** Step dots, one narration line above the music, a fixed-height scene, at most one
  row of controls under the music, Cookie's bubble at the bottom with the reaction and Next.
- **Next only navigates.** Actions (adding a sign, answering) happen on the music or in the
  answer buttons, never on Next.
- **Same buttons.** Answers sit under the music in the controls row, as lesson 1's do, in lesson 3's
  light rounded buttons; Listen sits in the same row. No black buttons.
- **Same colours.** Red is "sounding or pointed at" (a note on the staff and its key light up red
  together), green is "right".
- **Same notation.** `EngravedRow` with the treble clef, same size and position as lessons 1 and 3.
- **Same help.** Misses get a hint that teaches; Show answer after two misses.
- **Progress is visible** in exercises as progress dots in Cookie's bubble (LESSONS.md principle 8),
  never as words.
- **The keyboard from lesson 1,** shared rather than redrawn, now with its black keys drawn. It sounds
  when tapped and lights the key, but no step ever tests a key: it shows where a written note lives.
  **White keys show their letters; black keys don't.** The lesson is about reading the signs, not
  memorising a piano, so letters remove keyboard unfamiliarity as a source of wrong answers. Black
  keys stay unlabelled so the lesson stays about the written signs.

The scene is the same throughout: a staff on top, the keyboard below, both visible together, so
the eye learns "this mark on the staff is that key".

## What went wrong in the earlier builds, so it doesn't happen again

1. **The keyboard became the activity.** Steps asked the learner to find keys: a piano lesson, not a notation lesson. The keyboard sounds when tapped (everyone tries it first), but no step ever tests a key.
2. **Interactions existed for their own sake.** An interaction is the moment the learner takes in the new idea (they make the new thing happen, or notice it), never a tap to fill the step. Tapping a note to light its key taught nothing.
3. **Sharp and flat were two puzzles instead of one idea.** Two notes with a black key between them: draw a sharp on the lower one and a flat on the upper one, and the learner discovers they are the same key.
4. **Nobody reads the narration line.** The eye goes to Cookie's bubble. So: one idea per stage, the narration changes with each stage and fades in, the teaching lives in the narration and in labels beside the thing on screen (never only in Cookie), and Cookie only invites and reacts.
5. **A natural needs a reason.** Picking it from three signs was not an exercise. Plain notes need no sign; a natural exists to bring back a note a sharp has changed.
6. **Everything on screen is asked about, and readable.** No dead measures; staffs at full size with complete clefs; every tap target at least 48 by 48 CSS pixels.

## The steps

Five steps. The scene is the same layout in every step (staff or close-up on top, keyboard below, a row for progress dots, then Cookie), at one fixed height; the keyboard is always playable. Answers sit under the music; progress dots have their own row between the music and Cookie. The narration is per stage and fades in (0.25 s; none with reduced motion).

### 1. Between the notes (a demonstration, stepped by Next)

Staff: C and D (never anything between them: no dashed or ghost notehead). Stage 1: "C and D sit right next to each other on the staff." Stage 2 (*What's between them?*): the black key lights, C, the black key and D play in turn, with "half step" above each of the two arcs; "On the keyboard there's one more key between them. Each neighbour is a half step away." Stage 3 (*Not always*): E and F, one arc, "E and F have no key between them. They're already a half step apart." Cookie ends on the question the next step answers: how do we write that middle sound?

### 2. Sharp and flat (draw both, discover they're the same)

The same C and D, with room in front of each; the black key between them outlined. Trace a sharp in front of C (the engraved sign appears, C sharp plays, the black key lights), then a flat in front of D (D flat plays, the same key lights). Press Listen: C sharp then D flat, identical. Then *One more*: E sharp and F, both engraved, on the same white key. "A sharp doesn't always land on a black key. E sharp is the key just above E: F."

### 3. Bringing it back (why a natural exists)

One measure of 3/4: F sharp, A, F. The sharp still holds for the last F: Listen plays it sharp (lit on the black key, circled). "A natural cancels the sharp. This F returns to the white key." Trace the natural in front of the last F; Listen now plays the last F on the white key. This replaces picking a sign from three.

### 4. Through the measure (answer)

An accidental applies to that same note, in the same octave, until a natural or the bar line. Three questions, each about a circled note in a 4/4 measure that adds up: F sharp G F A (the second F: sharp), F sharp G A G | F A G A (the F after the bar line: plain), B flat B natural A B (the last B: plain). Answer buttons sit under the music and go once right (the row keeps its height). After a right answer only the measure holding the circled note plays, with a light band from the sign to where it ends.

### 5. Same key, two names (match)

Two full-size staffs, one above the other, each with its whole clef. Top: C sharp, F sharp, A sharp, E sharp. Bottom: their partners, shuffled. C sharp to D flat is already joined (found in step 2); E sharp to F was shown at the end of step 2. Connect each top note to its partner: drag, or tap one and then the other. A match stays green and both notes play; a miss fades away. The keyboard is hidden until Hint shows it with the current top note's key lit (it hides again when that pair is matched). Progress dots: 3. The lesson ends with the bridge to key signatures: "Writing a sharp in front of every F gets tiring. Next lesson: how music says always."

## Summary

| Step | Action | Teaching point |
|---|---|---|
| 1. Between the notes | Watch and listen (Next steps the demonstration) | Adjacent keys are a half step apart, with or without a black key between. |
| 2. Sharp and flat | Draw a sharp, draw a flat, listen | Raise or lower a note by a half step; the two signs can name the same key. |
| 3. Bringing it back | Listen, draw a natural | A natural cancels a sharp; that is why it exists. |
| 4. Through the measure | Answer | Same note until a natural or the bar line. |
| 5. Same key, two names | Match | One key, two names; E sharp is just F. |

## Not in this lesson

Whole steps (the scales extra), double sharps and double flats, accidentals across octaves,
courtesy accidentals (one line in lesson 5), key signatures (lesson 5).

## Decisions

- Progress: progress dots in their own row under the music, never words.
- Answers sit under the music (as in lesson 1), and disappear once answered right.
- Next: may step through a demonstration, never performs the learner's action.
- The keyboard sounds when tapped but is never the thing being tested.
- The narration is per stage and fades in (lesson 4 only for now; lessons 1 to 3 later if it works).
- The ending is the matching step, not a reading step.
