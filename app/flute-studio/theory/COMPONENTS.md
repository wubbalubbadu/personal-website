# Theory lesson interactions

Use this with `LESSONS.md` and the studio-wide `COMPONENTS.md`. This is the shared implementation contract for new lessons and bug fixes, not permission to redesign existing lessons.

## Frame and conversation

- `LessonFrame.tsx` owns the timeline, centered narration, scene, progress dots, Cookie prompt, feedback, and navigation. Use the studio fonts and `lesson-shell.css`.
- Narration explains the musical idea. Cookie gives one concrete action, then specific feedback. Do not repeat the same sentence in both.
- The lesson-only Cookie stays beside the bubble. It uses `CookieButton`, has no timer or drag behavior, and does not depend on the floating site pet. Tapping its face is optional decoration, never progression.
- Exercise answers and Hint belong in `extra`, inside the bubble. Scene controls such as playback belong in the reserved tools row. Keep controls mounted and disabled after success instead of removing them and shifting their neighbors.
- `LessonNext` is the single progression control. Its label names the next action. Completion makes it ready. Never advance automatically while the learner is inspecting a result.
- Keep staff position, scene height, tools row, and bubble stable within a lesson. Check both short desktop windows and iPad portrait layouts. Avoid hiding Cookie on narrow screens.

## Notation and sound

- `EngravedRow.tsx` / `RowGraphics` own staff, clef, signature, ledger lines, note positions, and beams. Use actual VexFlow glyphs, including `rhythm/RestGlyph.tsx`. Do not draw substitute ellipses or Unicode music characters as notation.
- A rest occupies time but has no pitch. `rest: true` produces a null playback pitch. `measureRest: true` centers the whole-rest symbol in its measure, regardless of the measure's duration.
- `PianoKeys.tsx` is shared. Its keyboard stays a consistent height, including matching scenes. Every playable staff note lights its sounding key, accounting for accidentals and key signatures.
- Red means sounding or a just-demonstrated change. A selected matching item uses an outline, not a red sounding state. Green connections and bubble feedback mean correct. Avoid a separate purple selection system.
- `useRhythmAudio` owns scheduling and stop behavior. Pitch demonstrations have no metronome. Rhythm activities may use its existing click. Say what to listen for; do not use pressing Listen as an assessment.

## Matching, placement, and touch

- `accidentals/MatchNotes.tsx` is the note-to-note pattern. `rests/RestMatch.tsx` uses the same two-row connection interaction for note/rest values.
- Every visible exercise item should be a valid target. Remove decorative unmatched notes instead of silently marking them answered.
- Keep generous invisible hit areas. No permanent rectangular selection cards around notation. A small outline marks the chosen item; a green line joins correct pairs. Keyboard focus must remain visible.
- Support drag, tap-source then tap-target, and Enter/Space. A hover treatment is supplementary, never the only instruction or affordance.
- `rests/SplitSpan.tsx` uses a dashed midpoint as the cut target. A short crossing stroke, tap, or keyboard action reveals the next duration layer. Existing layers stay for comparison.
- Duration spans share a baseline and proportional lengths. A quarter span equals two eighth spans or four sixteenth spans. Do not encode time only as horizontal note spacing.
- Validate after a complete answer. A partial drawing or first bar line is not automatically wrong. Wrong gap answers show why their duration does not fit and leave a retry available.

## Timing and animation

- One action, one visible musical result. Tracing first reveals and sounds that note; the next example waits for the learner.
- Use brief fades or a 200–400 ms movement to explain replacement, division, or correspondence. Keep correct results visible. No required waiting for dialogue to type itself.
- Reduced-motion mode shows the final state immediately. Animated hit layers must not extend over the keyboard or other controls.
- Count-in instructions explicitly name the Start/Count me in control. The tapping control becomes enabled during the exercise. Judge only after the full measure, including silence, has elapsed.

## Verification before handoff

Check initial taps, retry, correct completion, navigation away during sound, keyboard input, and touch-sized targets. Check notation at desktop and iPad widths. Audio scheduler tests do not prove audible quality; viewport emulation does not prove real-device behavior. Keep those limits explicit.

## Dots and ties (lesson 7)

- `RowNote.written` is the printed value; `v` remains the performed quarter-note duration. Tuplets require both. `EngravedRow` accepts `ties` (indices of first notes) and `tuplets` (first/last index and numeral). Ties connect same-pitch noteheads, opposite the stems. Beam levels come from `written`, never a rounded performed duration.
- `dots-and-ties/rhythmSequence.ts` compiles written values and actual:normal ratios onto an integer tick grid. Use the compiled timeline for sound and onset checking. Tied continuations do not create new attacks; `continuations()` lists where they fall.
- `useRhythmAudio.counted` accepts an exact timeline and tie indices. Audio merges tied segments into one voice; the visual timeline retains each printed note. Fractional excerpts end at their actual duration.
- Targets on the music (a note, a dot, a tie, a bar line) are invisible rects (`.dt-hit`): no hover fill or outline, arrow cursor, a focus ring only for keyboards. No dashed placeholder circles. The user rejected hover boxes on targets.
- Teach a new written length by equivalence with one already known (dotted half = half + quarter; a quarter tied to an eighth = 1½ beats = a dotted quarter), not by a free-standing gesture. Ties come first (lengths add), then the dot as their shorthand; crossing a bar line is a later use. No spoken half-beat count. Checks are short answer buttons (`measures-choices`) in the bubble; long answers use `.dt-wide-choices` so they sit on their own line.
- `dots-and-ties/RhythmPractice.tsx` provides count-in, a tap spot that the guide Cookie moves to (`LessonFrame` `cookieAway`: one Cookie on screen, the whole spot is the target, Space works too), a beat line aligned with the notes (`layout.beatX`), playback and grading. `gradeTaps` pairs taps with note starts (closest first) and grades them: green only within 0.1 s, otherwise early, late, extra or missed, all orange. The bubble is green only for a clean attempt. A recorded attempt still permits progress. Stop and unmount cancel scheduled sound.
- Lesson 7 rows use `EngravedRow proportional`, so notes sit exactly on their counts; durations are drawn on a time line under them (`layout.beatX`); each note and its bracket share a colour (`EngravedRow` `tones`: blue, amber, grey; never red, green or purple). Steps about half beats click on every half beat (`counted` with `beatUnit:.5, top:2`) and light each tick.
- Lengths are written as fractions (½, 1½), like note names and the way musicians say them; never decimals.
- Triplets and quintuplets are not in this lesson (see the storyboard); the compiler and engraver still support them for a later lesson.
