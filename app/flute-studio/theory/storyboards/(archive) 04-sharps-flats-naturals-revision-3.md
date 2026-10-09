> **Archived October 7, 2026:** superseded: lesson 4 changed substantially after this revision (see the code).

# Lesson 4 revision 3 (amended after review)

Builds on the current code (revisions 1 and 2 are in). Same rules: no commits, every string
through `tr()`, no dashes, lint and type check after each part.

**Priority order** (from the review): correct notation first, then consistent sound, then a stable
matching hint, then tracing feedback. Don't add animations or activities beyond what's listed.

## Feedback this answers

From the user, on revision 2: step 1 stopped being interactive; nothing tied the middle sound to
the black key; the two "half step" labels overlapped; the "how do we write it" question appeared on
the E and F screen; "Not always →" meant nothing; step 2 dropped its reference notes; "Lesson 5
shows why" was confusing; notation was crushed (a sharp touching the time signature); "Bringing it
back" was unclear; the natural should accept being drawn as two "7" shapes.

From a reviewer who tested the build at 1180 × 820: the tracing close-up prints middle C without
its ledger line and changes the clef's proportions; one staff showing C, C♯, D♭, D would break the
measure rule (the last D would still be flat); finishing a tracing jumps to the next stage before
the learner sees the result; the matching hint shrinks and moves both staffs and lights only one
key; sequences play metronome clicks that single taps don't; drawing instructions were put in the
narration.

## Part A: notation (do first)

### A1. One staff renderer
`SignTracing.tsx` draws its own staff, clef and notes, which is why middle C has no ledger line and
the proportions differ. Remove that drawing code. The tracing scene renders a normal `EngravedRow`
(with `reserveAcc`) and shows it close up by **cropping the viewBox** around the notes (zoom without
changing proportions). The tracing overlay is drawn in `EngravedRow`'s `children`, in the same
coordinates, using `layout.xs[i]` and `noteY(p)`. There must be exactly one place that draws
staffs, clefs, ledger lines, notes and accidentals.

### A2. Accidental clearance
An accidental must clear the clef, the time signature, a bar line and the previous note by at
least 12 staff units. Measure each `ACCIDENTALS` path's width once in the browser (`getBBox()`),
store the widths in `accidentalGlyphs.ts` beside the paths, and size the room before a note from
them instead of the fixed `ACC_ROOM=22`.

### A3. Short rows
Rows with four notes or fewer use the narrower width phones already use (`phoneRowRight`), centred.

### A4. Check with screenshots
F♯ right after a 3/4 time signature; C♯ right after the clef; B♭ right after a bar line; two
sharped notes in a row; middle C in the tracing close-up (ledger line present). Nothing touches;
proportions match the other steps.

## Part B: sound and selection

1. **No metronome in pitch examples.** Every `audio.play` call in lesson 4 passes
   `metronome=false`. Sequences and single taps must sound alike.
2. **Notes and keys always connect** (every step). Tapping a note on the staff plays it (as it
   sounds, via `soundingMidi`) and lights its key; tapping a key plays it and lights it, and lights
   the matching staff note if there is one.
3. **Selected vs sounding.** The last thing tapped stays **selected**: an outline ring on the key and
   on the note, until something else is tapped. Whatever is **sounding** right now is filled red.
   They must look different, and both can show at once.

## Part C: step 1, Between the notes (three stages)

The staff holds four slots from the start: **C D E F**. E and F are drawn at 25% opacity until
stage 3, so nothing slides when they appear. The keyboard is below, playable (Part B).

Half steps are shown as **short curved arrows** above the keys, from one key to the next, with
**one caption** above the keyboard: `tr('Each arrow: one half step','每个箭头：一个半音')`. No text on
individual arrows.

| Stage | Next label | Scene | Narration | Cookie |
|---|---|---|---|---|
| 1 | (start) | C and D at full opacity, keys lit. | `tr('C and D sit right next to each other on the staff.','C 和 D 在五线谱上紧挨着。')` | `tr('Tap a note, or press Listen.','点一个音符，或者点“听一听”。')` |
| 2 | `tr('What’s between them? →','它们中间有什么？ →')` | The black key between C and D lights. A **?** appears above the staff, centred between C and D (outside the lines, never on a line or space). Arrows: C to the black key, the black key to D. Listen plays C, the black key, D; the ? turns red with the black key. | `tr('On the keyboard, a black key sits between C and D. Each step to the next key is a half step.','在键盘上，C 和 D 之间有一个黑键。到下一个键的每一步，都是一个半音。')` | `tr('Press Listen and follow the arrows.','点“听一听”，跟着箭头听。')` |
| 3 | `tr('And E and F? →','那 E 和 F 呢？ →')` | E and F come to full opacity; one arrow from E straight to F; the C to D arrows stay; the black key and ? stay lit. | `tr('E and F have no key between them, so they’re one half step apart.','E 和 F 之间没有别的键，所以它们只差一个半音。')` | `tr('So how do we write the black key between C and D? It has no line or space of its own.','那 C 和 D 之间的黑键怎么写？它在五线谱上没有自己的线或间。')` |

- `ready` after stage 3. The question is asked while C, ?, D and the lit black key are still on
  screen.
- **Optional, not a stage:** a tools-row button `tr('Hear every half step','听所有半音')` plays every
  key from middle C to the next C (one per 0.4 s, no metronome) with arrows appearing as each one
  sounds. It isn't required to finish the step.

## Part D: step 2, Sharp and flat

Two clearly separate comparisons, so no reference note is changed by an earlier sign:
**measure 1: C, C** and **measure 2: D, D**, with a bar line between them and no time signature
(a short centred row). The sign goes on the second note of each measure. A bar line resets
accidentals, so the plain first D is correct.

| Stage | Narration (teaching) | Cookie (instruction / reaction) | Learner does | Then |
|---|---|---|---|---|
| 1 | `tr('A sharp raises a note by a half step.','升号把一个音升高半音。')` | `tr('Draw a sharp in front of the second C.','在第二个 C 前面画一个升号。')` | Traces the sharp. | The engraved ♯ replaces the tracing and **stays**; C then C♯ play; an arrow goes from C up to the black key. Cookie: `tr('That’s C sharp, one half step up from C.','这就是升 C，比 C 高一个半音。')` **Nothing else changes until the learner presses Next** (`tr('Now a flat →','再来降号 →')`). |
| 2 | `tr('A flat lowers a note by a half step.','降号把一个音降低半音。')` | `tr('Draw a flat in front of the second D.','在第二个 D 前面画一个降号。')` | Traces the flat. | The ♭ stays; D then D♭ play; an arrow goes from D down to **the same black key**. Cookie: `tr('That’s D flat. Look at the keyboard.','这就是降 D。看看键盘。')` Next: `tr('Compare them →','比一比 →')` |
| 3 | `tr('C sharp and D flat are the same key: one sound, two names.','升 C 和降 D 是同一个键：一个音，两个名字。')` | `tr('Both names are correct. Press Listen to hear them.','两个名字都对。点“听一听”听听看。')` | Listen plays C♯ then D♭. | Both light the same key. Next: `tr('What about E? →','那 E 呢？ →')` |
| 4 | `tr('A sharp doesn’t always land on a black key. E sharp is the next key up from E: F.','升号不一定落在黑键上。升 E 是 E 往上紧挨着的键：F。')` | `tr('Press Listen.','点“听一听”。')` | The row becomes measure 1: E, E♯ and measure 2: F (nothing to draw). | An arrow from E to F; E♯ and F light the same white key. Cookie after Listen: `tr('E sharp and F: the same key again.','升 E 和 F：又是同一个键。')` |

`ready` after stage 4. Tracing success never advances a stage by itself.

## Part E: step 3, Naturals

- Step name `tr('Naturals','还原号')`.
- Notes: F♯, A, F in 3/4 (laid out by `EngravedRow`, Part A).
- Keep the two stages and the wording from revision 2 for the narration. Instructions go in Cookie:
  stage 2 Cookie: `tr('Draw a natural in front of the last F. It’s two little 7s, one upside down.','在最后一个 F 前面画一个还原号。它是两个小 7，一个倒过来。')`
- After the natural is drawn, it stays; Listen plays the measure; Next moves on (no automatic jump).

## Part F: tracing judge (`SignTracing.tsx`)

Judge the **whole shape**, drawn in any number of strokes in any order, with two conditions:

1. **Every part is reached:** each part of the sign (sharp: 2 uprights and 2 bars; flat: stem and
   bowl; natural: 2 uprights and 2 bars) has at least 50% of its length covered by ink.
2. **The whole is covered and the ink is on it:** at least 75% of the total guide length covered,
   and at least 60% of the ink within the tolerance of the guide (stops scribbling).

Hand-test and list the results in the report:

| Drawing | Should |
|---|---|
| Natural as two "7" shapes | pass |
| Natural as four separate strokes | pass |
| Natural, one upright only | fail |
| Sharp, both uprights only (the long parts) | fail |
| Sharp, all four parts in any order | pass |
| A scribble over the whole sign area | fail |
| Flat, stem only | fail |

Tolerance stays generous for fingers (keep the current tolerance in screen terms at 1180 × 820), so
precise drawing is never required.

## Part G: matching hint (step 5)

The matching activity stays. Fix the hint:
- **The notation never moves.** The keyboard does not push the staffs; show it as an overlay in the
  tools row area (absolutely positioned, the scene's height unchanged), or reserve its space from
  the start if that fits at 1180 × 820. Measure before and after: the staffs' `getBoundingClientRect`
  must be identical with the hint open and closed.
- **Say exactly what it shows.** Before any wrong attempt on the current top note:
  `tr('Here’s the key for your top note.','这是你上面那个音的键。')` with that key lit. After a
  wrong attempt: light both attempted keys (the top note's and the wrongly chosen bottom note's),
  and say `tr('Here are both keys. They’re different, so try another partner.','这是两个音各自的键。它们不一样，换一个试试。')`
- Tap-one-then-the-other stays as the main way to match; dragging is an extra.

## Part H: checks

At desktop and 1180 × 820, English and Chinese:
- [ ] Lint, type check, `node --test tests/accidentals.test.mjs`.
- [ ] The A4 screenshots: no touching glyphs, middle C's ledger line in the close-up, same
      proportions as other steps.
- [ ] No metronome click in any lesson 4 playback.
- [ ] Selected (outline) and sounding (red fill) look different on notes and keys.
- [ ] Step 1: E and F are present but faint from the start; nothing slides; the question is asked
      with C, ?, D and the black key on screen; "Hear every half step" is optional.
- [ ] Step 2: measures C C | D D; signs on the second notes; arrows from C up and D down end on the
      same key; tracing never advances the stage by itself.
- [ ] Part F table: every row behaves as listed.
- [ ] Step 5: hint open and closed, the staffs don't move; the hint text matches what's lit.
- [ ] No commits.
