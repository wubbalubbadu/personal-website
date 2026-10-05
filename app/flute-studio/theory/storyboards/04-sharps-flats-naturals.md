# Lesson 4: Sharps, flats and naturals (storyboard, draft 5: after the first build)

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
- **The keyboard from lesson 1,** shared rather than redrawn, now with its black keys drawn. It is a
  picture of where a written note lives: it lights up and is never tapped.
  **White keys show their letters; black keys don't.** The lesson is about reading the signs, not
  memorising a piano, so letters remove keyboard unfamiliarity as a source of wrong answers. Black
  keys stay unlabelled so the lesson stays about the written signs.

The scene is the same throughout: a staff on top, the keyboard below, both visible together, so
the eye learns "this mark on the staff is that key".

## What went wrong in the first build, so it doesn't happen again

1. **The keyboard became the activity.** Steps asked the learner to find keys: a piano lesson, not a notation lesson. The learner acts on the notation (draws a sign, reads a note, matches written notes). The keyboard only shows where a written note lives: it lights up and is never tapped.
2. **Three steps in a row had the same action** (tap in front of a note). Each step now has a different kind of action: watch, draw, draw, choose, answer, match.
3. **Things appeared without being explained** (A sharp beside B flat, then E sharp and F sliding in). A pair or comparison is introduced before the learner is asked to do anything with it, and nothing on the staff moves sideways when something new appears.

## The steps

The scene is the same layout in every step (staff or close-up on top, keyboard below, a row for progress dots, then Cookie), at one fixed height. Answers sit under the music; progress dots have their own row between the music and Cookie.

### 1. Half steps (watch, then read)

**Teaching point:** keys next to each other are a half step apart, and a black key has no line or space of its own.

**Scene:** C D E F G A B C on the staff, the keyboard below as a picture (not tappable).

**Interaction:** Listen plays the eight notes, each note and its key lighting red together. Tapping a note on the staff plays it and lights its key; notes take no colour on hover. Then a demonstration stepped by Next (Next may step a demonstration):
1. *Show me:* E and F light with an arc between the keys. "E and F have no key between them. They're a half step apart."
2. *And F to G?* F and G light and the black key between them pulses once. "F to G skips a black key, so that's two half steps. The black key has no line or space of its own. This lesson is about how to write it."

### 2. Draw a sharp (draw)

**Teaching point:** a sharp raises a note by a half step, written in front of the note on the same line or space.

**Scene:** a close-up staff with one F, the engraved sharp faint in front of it as a guide, F lit on the keyboard.

**Interaction:** trace the sharp with finger, pencil or mouse: four straight strokes (two uprights, two bars), in any order, each counted by `traceSegment` and `traceComplete` as in the clef tracing. Done: the engraved sharp appears, the light moves one key right, F then F sharp play. Clear starts over.

### 3. Draw a flat (draw)

Same as step 2 with B and a flat (the stem, then the curve of the bowl). The light moves one key left; B then B flat play. No A sharp or E sharp here.

### 4. Naturals (choose)

**Scene:** F sharp on the staff, F sharp lit. Cookie: "Listen: this should be a plain F. Which sign makes it one?" Listen plays plain F.

**Interaction:** three buttons under the music showing the engraved sharp, flat and natural. The natural replaces the sharp, the light moves to F, F plays, the buttons disappear. Then again with B flat (should be plain B). Progress dots: 2. A wrong choice: "That one moves the note. The natural is the sign that takes it back to plain."

### 5. Through the measure (answer)

**Teaching point:** an accidental applies to that same note, in the same octave, for the rest of the measure, until a natural cancels it or the bar line ends it. (In lesson 5 the rule becomes "return to the key signature".)

Three questions with Yes/No or Flat/Plain buttons under the music, which disappear once the answer is right: F sharp G F A | F G A G (the second F circled), then B flat B B natural B twice (the second B, then the last B). After a right answer, a light band shows the sign's reach (ending at the bar line or the natural) and only the measure in question plays; for question 1, a Listen button plays measure 2 on its own to hear the bar line start over.

### 6. Same key, two names (match)

**Teaching point:** one key can have two names; a sharp can even land on a white key.

**Scene:** two columns of small staffs, four on the left and four on the right, one note each; the keyboard below as a picture. The first pair, A sharp and B flat, is shown already joined, both lighting the same key. The rest are drawn fresh each time: E sharp and F always, plus two from C sharp/D flat, D sharp/E flat, F sharp/G flat, G sharp/A flat. The right column is shuffled so no line is level; the left is not.

**Interaction:** drag from a left note to the right note that is the same key (pointer capture, like drawing bar lines). While dragging, the left note's key lights. A match stays as a green line and both notes play; a miss fades away, the wrong note's key lights red briefly, and Cookie says the two are different keys. Show answer after two misses on the same note outlines its partner. Progress dots: 3.

**End:** "Writing a sharp in front of every F gets tiring. Next lesson: how music says 'always'." Finish lesson.

## Summary

| Step | Action | Teaching point |
|---|---|---|
| 1. Half steps | Watch (Listen, tap a note, two demonstration steps) | Adjacent keys are a half step apart; a black key has no line or space. |
| 2. Draw a sharp | Draw | Raise a note by a half step; written in front, same line or space. |
| 3. Draw a flat | Draw | Lower a note by a half step. |
| 4. Naturals | Choose | A natural cancels a sharp or flat. |
| 5. Through the measure | Answer | Same note until a natural or the bar line. |
| 6. Same key, two names | Match | One key, two names; E sharp is just F. |

## Not in this lesson

Whole steps (the scales extra), double sharps and double flats, accidentals across octaves,
courtesy accidentals (one line in lesson 5), key signatures (lesson 5).

## Decisions

- Progress: progress dots in their own row under the music, never words.
- Answers sit under the music (as in lesson 1), and disappear once answered right.
- Next: may step through a demonstration, never performs the learner's action.
- The keyboard shows, it is never the activity.
- The ending is the matching step, not a reading step: no phrases, no naturals in real tunes.

The build plan was `04-sharps-flats-naturals-build.md`; the revision plan followed it.
