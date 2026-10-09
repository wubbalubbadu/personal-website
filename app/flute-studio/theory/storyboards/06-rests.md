# Lesson 6: Rests (storyboard, draft 2)

Plan only. Five scenes, approximately 5 to 7 minutes; timing is an estimate, not a target to pad.
This follows Key signatures, lesson 5. No implementation in this draft.

## Outcome and scope

Read quarter, half, whole, eighth and sixteenth rests; understand that time continues during
silence; choose a rest for a simple gap. Recognize a whole-measure rest in 3/4 as well as 4/4.
Use quarter-note beats for duration examples. Do not imply these beat counts apply in every meter.
No dotted rests, multimeasure rests, syncopation drills, or rules for combining rests across beats.

The learning sequence is: hear/see a gap -> give it a symbol -> relate symbols to known note
lengths -> recognize shorter values -> use rests in a measure. No keyboard is needed here.

## Before building

Verified against current source: `RowNote` has no rest field, `musicGlyphs.ts` contains note
outlines only, and `useRhythmAudio.play` creates a tone for every duration event.

- Add whole, half, quarter, eighth and sixteenth rest outlines from the same VexFlow font as
  the existing glyphs, preserving attribution. Use standard engraving anchors, not bounding-box
  centering: whole hangs from line 4, half sits on line 3; the other rests use their conventional
  central staff positions. Show five staff lines without a clef for these rhythm examples.
- Extend RowNote with an explicit rest discriminator, plus an explicit whole-measure-rest flag.
  Keep `v` as actual elapsed duration in quarter-note units. A whole-measure rest in 3/4 has
  v=3 but uses the whole-rest glyph, never a dotted-half glyph. Rest events have no pitch,
  accidental, stem or beam. Beam groups must break at rests.
- Center a whole-measure rest between its measure boundaries, allowing for the opening meter.
  Do not position it as an ordinary beat-1 note. Other rests participate in normal rhythmic layout.
- Extend audio scheduling explicitly for rests. They advance time without creating a tone.
  Do not use missing pitch or zero duration as silence: the current missing-pitch fallback sounds
  MIDI 67. Preserve ordinary note callers and separate silent active events from sounding red notes.
- Reuse the existing metronome click (`metronome=true` for play), count-in and Cookie tap control.
  Lesson 3 scores taps against the audio clock. `rhythmModel.assessTaps` only compares intervals
  between taps and does not establish their position against the beat; do not reuse it unchanged.
- Before building scenes, screenshot all five rests at desktop and iPad portrait/landscape sizes,
  including whole-measure rests in 3/4 and 4/4. Verify a rest keeps elapsed time, counts and bar
  totals intact without sounding. Check that existing note-only playback remains unchanged.

## 1. Silence takes time

Start with four quarter notes in 4/4, with counts 1 2 3 4 below the staff. Cookie:
`tr('Tap the second note to make beat 2 silent.','点第二个音符，让第 2 拍安静下来。')`

Tapping replaces that note with an engraved quarter rest without moving the other notes.
One short playback follows the action: the beat marker continues evenly through all four beats,
but the instrument does not sound on beat 2. The existing metronome click is clearly separate from
the instrument. No autoplay on arrival, looping, or second required Listen action.

Narration: `tr('A rest marks silence. Keep counting while you are not playing.',
'休止符表示这里不出声，但拍子还要继续数。')`
Then identify the highlighted symbol beside it: quarter rest / 四分休止符.
Cookie: `tr('Tap Cookie on beats 1, 3 and 4. Keep counting silently on beat 2.',
'在第 1、3、4 拍点饼干。第 2 拍不点，心里继续数。')`
One Start control gives four count-in clicks, then the one-measure attempt. Keep counts below
visible: this is supported performance, not number recall. No microphone or physical clap detection.
Pointer and Space/Enter activate the same tap control; ignore repeated keydown events.

Expected note onsets are 0, 2 and 3 quarter-note units after the count-in. Assess all taps over
one complete measure using the audio clock, with forgiving timing windows. Do not pass as soon
as the third tap arrives: an extra tap during the rest or later in the measure must be noticed.
Ignore count-in taps. Reuse Lesson 3's timing approach, adapted for silent events and omitted taps.
Feedback distinguishes a tap during the rest, a missed note and early/late timing. Hint:
`tr('Keep counting 2, but wait until 3 to tap again.','第 2 拍继续数，等到第 3 拍再点。')`
Success: `tr('You kept the beat through the silence.','休止的时候，你也保持住了拍子。')`
Retry is explicit, never automatic. Skip remains available without marking this check passed.

Purpose: the gap does not disappear and the following note does not move earlier.
Keep a replay available with the focus: 'Follow the count through the silence.'

## 2. Same length, different job

Bridge: `tr('Rests have lengths, just like notes.','休止符和音符一样，也有不同的时值。')`
Show whole, half and quarter notes paired with their rests. Use short staff fragments so the
rectangular rests have their real line context: whole hangs below line 4; half sits on line 3.
In 4/4, show duration spans of 4, 2 and 1 beats beside the pairs. These spans are teaching guides,
not invented musical symbols. A small shared 4/4 context remains visible.

Narration: `tr('The whole rest hangs from the fourth line. The half rest sits on the middle line.',
'全休止符挂在第四线下面，二分休止符坐在第三线上。')`

After the demonstration, hide the reference and its duration labels, then present one matching
set with shuffled rests. Hint restores the reference within reserved space, without shrinking
or moving the exercise. Matching with that support is allowed; it is not an unaided-recall claim.
Cookie: `tr('Draw a line from each note to the rest with the same length.',
'把每个音符和时值相同的休止符连起来。')`
Tap one item then its partner is an equal alternative to drawing. Forgiving endpoints; crossing
connectors are allowed. A correct connection reveals equal duration spans; a miss preserves
correct pairs and compares the two selected lengths. Three pairs, not three separate pages.

Purpose: transfer known note lengths, rather than memorize five unrelated new facts.

## 3. Shorter silences

Show a quarter-rest duration span dividing into two equal eighth-rest spans, then one eighth
span dividing into two sixteenth-rest spans. Reveal each level on a learner tap. Keep previous
levels visible, centered beneath their parent. This is a duration diagram, not a score that
should be rewritten with extra rests. Do not repeat the entire note-length tree.

Narration: `tr('Two eighth rests last as long as one quarter rest.',
'两个八分休止符的时值等于一个四分休止符。')`
Then: `tr('Two sixteenth rests last as long as one eighth rest.',
'两个十六分休止符的时值等于一个八分休止符。')`

No hook-tracing task. Tapping the duration span to split it is the meaningful construction action.

One check, with the completed diagram hidden and available through Hint:
`tr('How many sixteenth rests last as long as one quarter rest?',
'几个十六分休止符的时值等于一个四分休止符？')`
Choices 2, 3, 4 inside Cookie's response area. On a miss, restore the two-stage split, let the
learner expand the remaining eighth, and show four equal spans filling the original duration.
Retain this explanation for a supported retry. No timed sixteenth tapping or new spoken counting.

## 4. A whole measure of silence

Show a whole-measure rest centered in 4/4, then a learner-controlled change to 3/4.
The symbol stays the same, while four count markers become three. Keep the staff fixed.
Narration: `tr('This symbol also means a whole measure of silence. Count the beats in the time signature.',
'这个记号也表示整小节休止。要数几拍，看拍号。')`

For the check, use a fresh 2/4 measure with no count markers shown.
Cookie: `tr('How many beats of silence fill this 2/4 measure?','这个 2/4 小节要休止几拍？')`
Choices 2, 3, 4 inside the existing response area. Correct: 2. On a miss, reveal the two counts under
the measure, explaining that a whole-measure rest is not always four beats.

Purpose: distinguish the whole-measure use from the previously taught four-beat value.
No broader meter review.

## 5. Fill the silence

Narration: `tr('Notes and rests together fill the measure.','音符和休止符一起填满一个小节。')`
Two short, authored 4/4 measures with one gap each. Keep the measure visible throughout a retry.

- First: quarter note, one-beat gap on beat 2, half note on beats 3 and 4. Choose a quarter rest.
- Second: eighth note then a half-beat gap completing beat 1, quarter note on beat 2, half note
  on beats 3 and 4. Choose an eighth rest.

Cookie: `tr('Drag the rest that fills this gap.','把合适的休止符拖进空缺。')`
Tap a rest then the gap is equivalent. Both rounds offer quarter, half and eighth rest glyphs
in the same positions, with accessible names. Keep hint counts available. Preview a wrong choice
at the gap: its duration span visibly falls short or extends past the target span. This is an
annotation overlay, not altered engraving. Then return the rest to its original choice position;
keep the span comparison and specific feedback visible until retry. Existing notes never move.
Feedback: 'This rest is too long for the gap.' / '这个休止符比空缺长。', or
'This rest leaves part of the gap empty.' / '这个休止符还填不满空缺。'
Two progress dots; no extra final exam.

After both pass, completion is recorded. Replay remains available, but no second play-along task.
Closing bridge: `tr('Next, dots and ties let us write more note lengths.',
'下一课，用附点和连音线写出更多时值。')`

## Shared behavior and review limits

- Reuse LessonFrame, EngravedRow, established typography, fixed Next and Cookie response area.
  Teaching above music; action and feedback in Cookie. No repeated instructions elsewhere.
- Standard engraved rests, including line context for half and whole rests. Rhythm examples can
  omit the clef; rests do not move vertically to indicate pitch. Keep scene size and position stable.
- Instrument is silent during a rest. A neutral count marker may move through it; red means a
  sounding note, not a rest making sound. Selection has an outline; correct answers use green.
- All playback is user initiated. No mandatory Listen task. Stop audio on navigation and replay.
- One count-and-tap attempt, one three-pair match, one duration question, one whole-measure
  question, and two gap placements. Eight successful responses, counting each matching pair once.
- Review navigation remains direct and ungated; no waiting for Cookie text to type out.
- Motion explains changes: the replaced note lifts/fades and the rest settles into its slot;
  the neutral beat marker pulses evenly through silence; split spans separate beneath their
  parent; count markers change from four to three. Use brief 200-350 ms transitions, no layout
  bounce or moving controls. Reduced-motion uses immediate state changes and static highlights.
  Feedback text stays until the learner acts. No animation delays the next interaction.

## Reference and verification

- musictheory.net, Rest Duration: https://www.musictheory.net/lessons/13 . Topic reference;
  its interactive lesson was not inspectable through the text browser, so no animation claims.
- Music Theory Academy, Rests: https://www.musictheoryacademy.com/how-to-read-sheet-music/rests/ .
  Corresponding note/rest values, placement of half and whole rests, and whole-bar rests.
- My Music Theory, Adding Rests: https://mymusictheory.com/rhythm/adding-rests/ .
  Rest choice must preserve beat grouping, not merely total the right duration. Our two authored
  gaps avoid introducing that larger set of writing rules.

Before implementation, verify glyph placement, exact bar totals and the whole-measure exception.
Before calling it complete, check desktop/iPad drawing alternatives, stable layout, and audible
silence with a continuing beat. This document does not claim those have been built or tested.
