> **Archived October 8, 2026:** superseded by draft 3 (three scenes) after a second review.

# Lesson 5: Key signatures (storyboard, draft 2)

Bridge: *Lesson 4's sharp lasts one measure. This phrase needs F♯ in every measure. Is there a way to say "always"?*
Six steps, about 9 minutes. Plan only, not an implementation spec. Built against LESSONS.md; the principles
there decide anything this leaves open. Draft 1 is in `(archive) 05-key-signatures-draft-1.md`.

**Outcome:** the learner sees a signature, knows which notes it changes (in every octave), and understands that an
accidental overrides it only for that spot on the staff, until the bar line. Naming the key is not part of this
lesson (see "Naming the key" below).

## Who it's for

The same beginner as lesson 4. They can read letter names, sharps, flats and naturals, and know an accidental
lasts for the same line or space until the bar line (lesson 4's own wording). They have never seen signs next to
the clef. We don't assume they can hear a "wrong" note, so sound demonstrates and the learner acts on the staff.

## What carries over from lesson 4

- Same frame, same `EngravedRow`, same keyboard under the staff (white keys lettered, black keys not), in every
  step. The keyboard is how a plain-looking F proves it is sharp (the black key lights), so it stays.
- Notes and keys always connect: tapping a note plays it **as it sounds** (signature included) and lights its key.
- Selected (outline) vs sounding (red), as lesson 4 revision 3 settled.
- No metronome in pitch examples.

## Before building: what EngravedRow needs

`EngravedRow` draws clefs, time signatures and accidentals, but no key signature. It needs:

1. A `keySignature` prop: a count of sharps (positive) or flats (negative), drawn after the clef and before the time
   signature in the standard treble positions (sharps F C G D A E B on F5 C5 G5 D5 A4 E5 B4; flats B E A D G C F on
   B4 E5 A4 D5 G4 C5 F4), using the existing `accidentalGlyphs.ts` paths and their measured widths (revision 3, A2).
2. **A reserved signature slot**, so step 1 and step 3 can add signs without moving anything: the room for the
   signature is laid out from the start, empty slots can show a faint outline as a tap target, and a sign fades in
   when placed.
3. **Accidentals that fade out without relayout:** in step 1 the written sharps disappear but the notes keep their
   x positions (the row is laid out with `reserveAcc`). Only that step needs this; the final phrase lays out
   normally.
4. The sounding pitch (`soundingMidi`) to apply the signature to every octave unless lesson 4's rule overrides it:
   an accidental, including a natural, holds for the same staff position until the bar line. An F5 natural leaves
   F4 in the same measure sharp.

Build and screenshot these first: one to three sharps and flats, each followed by 4/4, at phone and iPad widths;
step 1's row before and after the sharps fade (no note moves).

## Steps

| # | Step | Narration (teaching) | Learner does | Check |
|---|---|---|---|---|
| 1 | **Say it once** | Three stages in one scene. Problem: `tr('This phrase needs F sharp in every measure. We keep writing the sharp after each bar line.','这段旋律每个小节都要用升 F。每过一条小节线，就得再写一次升号。')` Solution: `tr('Music can say it once, at the start: every F is sharp.','乐谱可以在开头只说一次：所有的 F 都升高。')` Name: `tr('That sign beside the clef is a key signature. It sits on the F line, so every F is F sharp.','谱号旁边的这个记号叫调号。它写在 F 的那条线上，所以每个 F 都是升 F。')` | Listen to the phrase with its written sharps. Tap the faint spot beside the clef: one ♯ appears there and the written sharps fade; no note moves. Listen again: it sounds the same. Tap a plain F: it plays F♯ and the black key lights. | none |
| 2 | **Every F, in every octave** | `tr('The sign sits on one line, but it changes every F, high or low.','这个记号只写在一条线上，但高低所有的 F 都要升。')` | Tap the F in the first space: it plays F♯, though the sign is on the top line. Exercise: tap every note that sounds sharp. Fresh random rows, progress dots, a hint that teaches (`tr('Look for every F: the top line and the first space.','找出每个 F：第五线和第一间。')`). | 2 rows |
| 3 | **More sharps, always in order** | Two stages. `tr('Each sign tells you which letter to change. It applies in every octave.','每个记号告诉你哪个音名要变。高低八度都算。')` Then the order: `tr('Sharps always come in the same order: F, C, G, D, A, E, B. Two sharps are always F and C.','升号总是按同样的顺序出现：F、C、G、D、A、E、B。两个升号一定是 F 和 C。')` | Tap the next faint spot: C♯ joins the signature (it can't be any other sharp) and every C in the row lights. Tap again: G♯ joins. Each new sign's letter appears briefly beside it, so F, C, G builds up in place. Exercise: tap every note a two-sharp signature changes. Hint: `tr('Two sharps: F and C. Find every F and every C.','两个升号：F 和 C。找出所有的 F 和 C。')` | 1 row |
| 4 | **Flats, in the opposite order** | Demonstration first. `tr('A flat works the same way. Every B is B flat.','降号也一样。每个 B 都是降 B。')` Then: `tr('Flats come in the opposite order: B, E, A, D, G, C, F.','降号的顺序正好反过来：B、E、A、D、G、C、F。')` | Tap a B: it plays B♭. Tap the next faint spot: E♭ joins and every E lights; the letters build up as in step 3. Exercise: tap every note the signature changes. Two flats, then three signs of either kind (the one transfer example). Hint: `tr('Read the signature left to right, then find every note with those letters.','从左往右读调号，再找出所有这些音名的音。')` | 2 rows |
| 5 | **The signature and an accidental** | Connects to lesson 4. `tr('A natural cancels the signature only on its own line or space, and only until the bar line.','还原号只取消它所在那条线或那个间上的调号，而且只到小节线为止。')` | Two measures, F♯ signature. Measure 1: F5 with ♮, then F5 plain, then F4 plain; measure 2: F5 plain. Tap each: F, F, F♯ (different spot), then F♯ (new measure). Exercise: tap the notes that sound sharp. | 2 rows |
| 6 | **Read a phrase** | The payoff and the bridge. `tr('Now the phrase reads cleanly. Next: what fills a beat where you don’t play?','现在这段旋律读起来干净多了。下一课：不吹的拍子用什么来填？')` | A short phrase in G with Fs in both octaves and one F natural. Tap every note that sounds sharp, then Listen: the phrase plays with those notes lit. | 1 |

Eight checks in all (draft 1 had 18). The lesson is complete when step 6 passes. No review page.

## Notes

- **Step 1 is the heart of the lesson.** The learner adds the signature themselves and hears that nothing changed,
  while the notes hold still. Next must not add the sign for them (principle 6). Steps 3 and 4 reuse the same gesture.
- **The opening phrase** is written for the lesson: four bars in G, Fs on the top line only (step 2 introduces the
  low F), one F♯ per measure printed only where lesson 4's rule needs it (a second F in the same measure stays
  plain). No borrowed tune, so no wrong-key compromises. Step 6 reuses its style but not its notes.
- **Signatures covered:** one and two sharps and flats taught; three appears once, as the last row of step 4.
- **The order is shown, not drilled.** The point is that a signature is never a random set: two sharps are always F
  and C, and flats run the same letters backwards. No exercise asks the learner to recite the order; the letters
  building up beside the signs and the narration carry it.
- **Not covered:** reciting the order from memory, the circle of fifths, naming the key, minor keys.

## Naming the key (moved)

Decided October 8, 2026: the "which key is it" tricks and minor keys move to the Extras lesson "Major and minor
scales", where keys, the tonic and minor already live. There, say the tricks name the major key that goes with the
signature, and don't use "the last note usually tells you" for minor.
