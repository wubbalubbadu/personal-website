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

## Dots, ties and rhythm practice

- `RowNote.written` is the printed value; `v` remains the performed quarter-note duration. Tuplets require both. `EngravedRow` accepts `ties` (indices of first notes) and `tuplets` (first/last index and numeral). Ties connect same-pitch noteheads, opposite the stems. Beam levels come from `written`, never a rounded performed duration.
- `dots-and-ties/rhythmSequence.ts` compiles written values and actual:normal ratios onto an integer tick grid. Use the compiled timeline for sound and onset checking. Tied continuations do not create new attacks.
- `useRhythmAudio.counted` accepts an exact timeline and tie indices. Audio merges tied segments into one voice; the visual timeline retains each printed note. Fractional excerpts end at their actual duration.
- `dots-and-ties/TieGesture.tsx` joins two endpoints by drawing or selecting them in order. Tapping the finished tie removes it for comparison. No freehand tracing score is needed for this gesture.
- `dots-and-ties/RhythmPractice.tsx` provides count-in, Cookie/Space input, a separate proportional beat ruler, playback, and slower practice. Assess after the entire measure. A recorded attempt permits progress; green correctness must never mean participation. Tuplet feedback compares tap spacing without an evenness pass/fail gate. Stop and unmount cancel scheduled sound.
- Quintuplets are an optional challenge after completing the four core rhythms. They are demonstrated as five sixteenths in the time of four, not five eighths with an unstated ratio.
