# Theory lesson interactions

Use this with `LESSONS.md` and the studio-wide `COMPONENTS.md`. This is the shared implementation contract for new lessons and bug fixes, not permission to redesign existing lessons.

## Frame and conversation

- `LessonFrame.tsx` owns the timeline, centered narration, scene, progress dots, Cookie prompt, feedback, and navigation. Use the studio fonts and `lesson-shell.css`.
- Narration explains the musical idea. Cookie gives one concrete action, then specific feedback. Do not repeat the same sentence in both.
- The lesson-only Cookie stays beside the bubble. It uses `CookieButton`, has no timer or drag behavior, and does not depend on the floating site pet. Tapping its face is optional decoration, never progression.
- Exercise answers and Hint belong in `extra`, inside the bubble. Scene controls such as playback belong in the reserved tools row. Keep controls mounted and disabled after success instead of removing them and shifting their neighbors.
- **One button look for every lesson control** (defined once in `lesson-shell.css`): the quiet cream fill (`#f3f0e9`, no border, 12px radius, 44px tall, 500 weight). Picked and right are the same soft green fill (`#e4ecdf` / `#40553d`), wrong is soft orange (`#fff2e8` / `#a35432`). No borders or outlines for selection. Use the existing classes (`measures-choices` for an answer group, `measures-secondary` for a single control, `lesson-playback-button` for Hear/Stop); never restyle them per lesson. Only Next (green) and Skip (plain text) look different. Lesson 1's note-name tiles (`lesson-choices`) keep their size but use the same colours.
- **Where controls go:** answers, Check, Hint and Show answer go in `extra` (the bubble, under the question, one row, Next on the right). Listen/Hear, Count me in, Add a sharp and exploration toggles go in the tools row under the music. A long answer row must still fit on one line at 1180×820 beside the reserved Next label; measure it.
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
- Teach a new written length by equivalence with one already known (dotted half = half + quarter; a quarter tied to an eighth = 1½ beats = a dotted quarter), not by a free-standing gesture. Ties come first (lengths add), then the dot as their shorthand; crossing a bar line is a later use. No spoken half-beat count. Checks are short answer buttons (`measures-choices`) in the bubble; long answers use `.dt-wide-choices` so they sit on their own line. Checks apply the idea to a new case (3/4 measure, dotted eighth), never re-ask the demo.
- `dots-and-ties/RhythmPractice.tsx` provides count-in, a tap spot that the guide Cookie moves to (`LessonFrame` `cookieAway`: one Cookie on screen, the whole spot is the target, Space works too), a beat line aligned with the notes (`layout.beatX`), playback and grading. `gradeTaps` pairs taps with note starts (closest first) and grades them: green only within 0.1 s of a point 25 ms early (people tap a little ahead of a heard beat), otherwise early, late, extra or missed, all orange. The bubble is green only for a clean attempt. A recorded attempt still permits progress. Stop and unmount cancel scheduled sound. Guides and note lighting stay hidden during the attempt; they appear with the grading. The count-in names the meter first. Taps are timed from the event's timeStamp through `getOutputTimestamp` (`position(at)` in `useRhythmAudio`).
- Lesson 7 rows use `EngravedRow proportional`, so notes sit exactly on their counts. Under them: the counts, ticks only when a step is about parts of a beat (half beats, or sixteenths in beat 1), and one neutral bracket for the note being taught. No note colours (the user found blue "2 beats" turning into blue "3 beats" confusing). When a tie becomes a dot, the dotted note keeps the tied note's slot as a hidden note, so nothing slides: only the tie or dot changes. Half-beat steps click on every half beat (`counted` with `beatUnit:.5, top:2`).
- Use readable beat equations such as `1 + 0.5 = 1.5 beats`; avoid tiny fraction glyphs. Musical examples use the shared engraved note glyphs.
- Triplets and quintuplets are not in this lesson (see the storyboard); the compiler and engraver still support them for a later lesson.

- All tapping count-ins use `../components/CountInPulse.tsx`, driven by the existing audio clock, with layout space reserved while inactive.
- `LessonFrame` reserves the ready Next label width even while showing Skip. Answer options must not shift when a result appears.
- A new question gets a new scene key; animated transforms are only for changes within the same example.

### Dots and ties interaction refinements
- Show both duration spans before joining. On joining, reveal the tie and retract the inner bracket ends to connect the spans. Keep one fixed label baseline, replacing the parts with the total; reduced motion shows the final state directly.
- Teaching gestures do not automatically play the whole phrase. Notes remain explicit playback targets. Rhythm-only bottom-space notation sounds F4 (MIDI 65).
- Short answer prompts occupy a centered full row, with responses below and navigation on a separate reserved row. No large hover fills behind notation. Numeric answers reuse the quiet lesson-tools button treatment, stay fully legible after success, and use the existing green selected fill rather than a circular underline.
- CountInPulse includes the reader's white rounded pill, not just its dots.
- Finish records completion and returns directly to the lesson list.

- Lesson 7 reserves fixed narration, scene, and Cookie rows at each breakpoint. All duration brackets use the same baseline, with one label row. Do not reduce scene height for a question or let conditional controls move the bubble. Verify coordinates across states.

## Rhythm practice and articulation (lessons 8 and 9)

- Rhythm practice uses the existing exact-ratio compiler and RhythmPractice tap surface. Its renderer passes tuplet numerals as well as beams. Paired eighths, triplet eighths, and quintuplet sixteenths occupy the same one-beat span.
- Articulation uses EngravedRow slurs and marks. Slurs clear mixed stems; ties still require matching pitches. The selected note has an outline; red remains reserved for playback.
- Articulation playback uses useRhythmAudio with a continuous phase across slurred notes. Staccato shortens the sounding portion without changing note starts; accents change the attack; tenuto fills the written duration. This is an illustrative synthesized wind sound, not a recorded flute performance.
- Both reuse LessonFrame, fixed scene/bubble layout, existing lesson choices, course completion, and direct return to the course list. No card subtitles.

Playback controls keep the same footprint when their label changes to Stop: use
`lesson-playback-button` with both labels in the same grid cell, hiding the inactive
label from sight and accessibility. Pointer release clears button focus so subsequent
Space taps do not leave a focus ring on Count me in. Keyboard navigation retains
`:focus-visible`. Two/three subdivision choices use a soft selected fill, never a
selection outline.
