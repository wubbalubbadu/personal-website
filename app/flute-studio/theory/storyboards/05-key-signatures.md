# Lesson 5: Key signatures (storyboard, draft 3, built October 8, 2026)

Bridge: *Lesson 4's sharp lasts one measure. This phrase needs F♯ in every measure. Is there a way to say "always"?*
Three steps, short on purpose: each step has its own check, so the lesson stays small. Plan only, not an
implementation spec. Built against LESSONS.md; the principles there decide anything this leaves open. Drafts 1 and
2 are archived beside this file.

**Outcome:** the learner sees a signature, knows which letters it changes (in every octave, across bar lines), and
can override it for one note with a natural. Naming the key is in the Extras lesson "Major and minor scales".

**The sequence across lessons 4 and 5:** change a note → how long the change lasts → set a default for the music →
override the default for one note.

| Sign beside a note (lesson 4) | Sign in the key signature (lesson 5) |
|---|---|
| Applies to that line or space, through the measure. | Applies to that letter in every octave, across bar lines. |
| Changes the note for now. | Sets what to play unless a sign beside a note overrides it. |

## Who it's for

The same beginner as lesson 4. They can read letter names, sharps, flats and naturals, and know an accidental
lasts for the same line or space until the bar line (lesson 4's own wording). They have never seen signs next to
the clef. We don't assume they can hear a "wrong" note, so sound demonstrates and the learner acts on the staff.

## What carries over from lesson 4

- Same frame, same `EngravedRow`, same keyboard under the staff (white keys lettered, black keys not), in every
  step. The keyboard is how a plain-looking F proves it is sharp (the black key lights).
- Notes and keys always connect: tapping a note plays it **as it sounds** (signature included) and lights its key.
- Selected (outline) vs sounding (red), as lesson 4 revision 3 settled.
- No metronome in pitch examples.

## Listening rule

Every listening instruction names something to notice ("Do these two Fs still play the black key?"). Tapping a
note sounds it directly. Listen stays available for replaying a row, but pressing it is never the activity and
never required to finish a step.

## Before building: what EngravedRow needs

1. A `keySignature` prop: a count of sharps (positive) or flats (negative), drawn after the clef and before the time
   signature in the standard treble positions (sharps F C G D A E B on F5 C5 G5 D5 A4 E5 B4; flats B E A D G C F on
   B4 E5 A4 D5 G4 C5 F4), using the existing `accidentalGlyphs.ts` paths and their measured widths (revision 3, A2).
2. **A reserved signature slot**, so signs can be added without moving anything: the room is laid out from the
   start, an empty slot can show a faint outline as a tap target, and a sign fades in when added.
3. **Accidentals that fade out without relayout:** in step 1 the written sharps disappear but the notes keep their
   x positions (`reserveAcc`). Only step 1 needs this.
4. The sounding pitch (`soundingMidi`) applies the signature to every octave unless lesson 4's rule overrides it:
   an accidental, including a natural, holds for the same staff position until the bar line. An F5 natural leaves
   F4 in the same measure sharp.

Build and screenshot these first: one to three sharps and flats, each followed by 4/4, at phone and iPad widths;
step 1's row before and after the sharps fade (no note moves).

## Steps

| # | Step | Narration (teaching) | Learner does | Check |
|---|---|---|---|---|
| 1 | **Say it once** | Problem: `tr('This phrase needs F sharp in every measure. We have to write the sharp again after the bar line.','这段旋律每个小节都要用升 F。过了小节线，就得再写一次升号。')` Solution: `tr('Music can say it once, at the start: every F is sharp.','乐谱可以在开头只说一次：所有的 F 都升高。')` Name, after the check: `tr('That sign beside the clef is a key signature. It sits on the top line, but it changes every F, high or low.','谱号旁边的这个记号叫调号。它写在第五线上，但高低所有的 F 都要升。')` | Two measures in G, 4/4. Measure 1 has F♯ on the top line, measure 2 has F♯ in the first space, each with its sharp written. Tap the faint spot beside the clef: one ♯ appears and the written sharps fade; no note moves. (This tap is the transformation, not a check.) Cookie asks: `tr('The low F has no sharp beside it now. Will it play sharp or plain?','低音 F 旁边已经没有升号了。它会弹升音还是原音？')` The learner answers Sharp or Plain (as lesson 4's questions), then hears the F and sees its key light. Miss hint: `tr('The signature changes every F, even this one.','调号会改变每个 F，这个也一样。')` | 1 |
| 2 | **Which letters change?** | Sharps: `tr('A signature can hold more sharps. They always come in the same order, and each new one keeps the ones before it. Two sharps are always F and C.','调号里可以有更多升号。它们总是按同样的顺序出现，新加的会保留前面的。两个升号一定是 F 和 C。')` Flats: `tr('Flats have their own order: B, then E, then A.','降号也有自己的顺序：先 B，再 E，再 A。')` After the flats: `tr('It’s the sharp order backwards.','正好是升号顺序倒过来。')` | A demonstration the learner steps through with one control (`tr('Add a sharp','加一个升号')`, then `tr('Add a flat','加一个降号')`): F♯ → F♯ C♯ → F♯ C♯ G♯, then B♭ → B♭ E♭ → B♭ E♭ A♭, on a short phrase. Each new sign lights its letter's notes in every octave. The full order sits faint beside the signature as a reference (F C G D A E B, later B E A D G C F); added letters turn solid. Tapping a sign in the signature lights its notes again. Check: a signature with no phrase, `tr('Which letters does this signature change?','这个调号改变了哪些音名？')`, answered with letter buttons (as lesson 1, more than one can be chosen). Two sharps, then two flats, then three of either. Hint: `tr('Read the signs left to right. Each one sits on its letter’s line or space.','从左往右读。每个记号都写在它那个音名的线或间上。')` | 3 |
| 3 | **Change one back** | Connects to lesson 4. `tr('A natural cancels the signature only on its own line or space, and only until the bar line.','还原号只取消它所在那条线或那个间上的调号，而且只到小节线为止。')` Bridge, once it passes: `tr('Now you can read what the signature asks and when to ignore it. Next: what fills a beat where you don’t play?','现在你会读调号，也知道什么时候不按它来。下一课：不吹的拍子用什么来填？')` | F♯ signature, two measures. Measure 1: F5, F5, F4; measure 2: F5. Cookie: `tr('We want this F to sound plain. Add the sign it needs.','我们想让这个 F 弹原来的音。加上它需要的记号。')` The learner chooses from ♯ ♭ ♮ and places it before the first F5; tapping the second F5 shows it also plays F. Then three Sharp or Plain questions: the next F on the same line (plain), the low F in the same measure (sharp, different spot) and the F after the bar line (sharp, new measure). Hint for both: `tr('The natural only covers its own line or space, until the bar line.','还原号只管它自己那条线或那个间，到小节线为止。')` | 1 placement + 3 |

Eight checks across three steps. The lesson is complete when step 3's last question passes. No review page.

## Notes

- **Step 1 is the heart of the lesson.** The learner adds the signature and the notes hold still. The question is
  about the **low** F on purpose: the sign is on the top line, so answering Sharp for the first-space F shows
  they read the rule, not the position. Answers are buttons, not keys: the keyboard is never tested (lesson 4's rule). Next must not add the sign for them (principle 6).
- **Step 2's adding is a demonstration, not a check.** The learner steps through it (principle 6 allows Next or a
  control to step a demonstration), and nothing there counts as understanding. The check asks a different kind of
  question (which letters?) from steps 1 and 3 (sharp or plain?), so the lesson doesn't repeat one task.
- **Flats are shown directly** (B, E, A) and only then compared with the sharp order, so the learner never has to
  reverse a sequence they barely know.
- **The order is shown, not drilled.** The full order stays visible as a reference; no exercise asks the learner
  to recite it. Why the order is what it is waits for the scales lesson.
- **Signatures covered:** up to three sharps and three flats, all in step 2.
- **Not covered:** reciting the order, the circle of fifths, naming the key, minor keys.

## Open details for building

- Step 1's phrase is written for the lesson (no borrowed tune). It needs one F per measure, in different octaves,
  and nothing else altered.
- Step 2's letter buttons: whether a wrong extra letter counts as a miss right away or only on Check. Lesson 1's
  letter buttons answer on tap with one right letter, so this needs a small Check control (still within principle
  12's two controls).
