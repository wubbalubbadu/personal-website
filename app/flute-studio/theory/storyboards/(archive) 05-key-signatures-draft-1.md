> **Archived October 8, 2026:** superseded by draft 2 after review.

# Lesson 5: Key signatures (storyboard, draft 1)

Bridge: *Lesson 4's sharp lasts one measure. This tune needs F♯ in every measure. Is there a way to say "always"?*
Eight steps, about 10 minutes. Plan only, not an implementation spec. Built against LESSONS.md; the principles
there decide anything this leaves open. Not reviewed yet: the questions at the end need answers before building.

## Who it's for

The same beginner as lesson 4. They can read letter names, sharps, flats and naturals, and know an accidental lasts
until the bar line. They have never seen signs next to the clef. We don't assume they can hear a "wrong" note, so
sound demonstrates and the learner acts on the staff.

## What carries over from lesson 4

- Same frame, same `EngravedRow`, same keyboard under the staff (white keys lettered, black keys not).
- Notes and keys always connect: tapping a note plays it **as it sounds** (signature included) and lights its key.
  This is what makes the lesson work: the learner taps a plain-looking F and the black key lights.
- Selected (outline) vs sounding (red), as lesson 4 revision 3 settled.
- No metronome in pitch examples.

## Before building: what EngravedRow needs

`EngravedRow` draws clefs, time signatures and accidentals, but no key signature. It needs:

1. A `keySignature` prop: a count of sharps (positive) or flats (negative), drawn after the clef and before the time
   signature in the standard treble positions (sharps F C G D A E B on F5 C5 G5 D5 A4 E5 B4; flats B E A D G C F on
   B4 E5 A4 D5 G4 C5 F4), using the existing `accidentalGlyphs.ts` paths and their measured widths (revision 3, A2).
2. Notes laid out after the signature with the same clearance rule as accidentals (12 staff units).
3. The sounding pitch (`soundingMidi`) to apply the signature unless the note has its own accidental, with lesson
   4's measure rule on top (an accidental, including a natural, lasts to the bar line, then the signature returns).

Build and screenshot these first: one to three sharps and flats, each followed by 4/4, at phone and iPad widths.

## Steps

| # | Step | Narration (teaching) | Learner does | Check |
|---|---|---|---|---|
| 1 | **The same sharp, again and again** | A four-bar tune with F♯ written every time it appears. `tr('This tune uses F sharp in every measure. Lesson 4’s rule makes us write the sharp each time.','这首曲子每个小节都用到升 F。按第 4 课的规则，每次都要写升号。')` | Tap a sharp: every ♯ in the row lights at once (they are all the same sign). Listen plays the tune. | none |
| 2 | **Say it once** | The problem, then the solution, then the name. `tr('Music can say it once, at the start: every F is sharp.','乐谱可以在开头只说一次：所有的 F 都升高。')` Then, after the learner acts: `tr('That sign beside the clef is a key signature.','谱号旁边的这个记号叫调号。')` | Tap the empty spot beside the clef (a faint outline marks it): one ♯ appears there and every sharp in the row fades away. Listen: it sounds exactly the same. | none |
| 3 | **Reading it** | `tr('The sharp sits on the top line, F. So every F is F sharp.','升号在第五线上，也就是 F。所以每个 F 都是升 F。')` | Tap the F notes in the row: each plays F♯ and lights the black key, though it has no sign of its own. | none |
| 4 | **Every F, in every octave** | `tr('It counts for every F, high or low, even where the sign isn’t.','它对每个 F 都有效，不管高低，也不管升号写在哪一行。')` | Exercise: a row with Fs in both octaves and other letters. Tap every note that sounds sharp. Fresh random rows, progress dots, a hint that teaches (`tr('Look for every F: the top line and the first space.','找出每个 F：第五线和第一间。')`). | 4 rows |
| 5 | **More sharps, and flats** | Signatures with two and three sharps, then one, two and three flats. `tr('A signature can have more signs. They always come in the same order, so you only need to read them, not remember them.','调号可以有好几个记号。它们总是按同样的顺序出现，所以只要会读，不用背。')` | Tap a sign in the signature: its letter's notes light up across the row and the key lights. Then the exercise: name which letters the signature changes (letter buttons, as lesson 1). | 5 signatures, easy to hard |
| 6 | **The signature and an accidental** | Connects to lesson 4. `tr('A natural in a measure still wins, but only until the bar line. Then the key signature is back.','小节里的还原记号仍然有效，但只到小节线为止。之后调号又回来了。')` | Two measures: F♯ signature, a ♮ on an F in measure 1, plain Fs after it and in measure 2. Tap each F: it plays F, F, then F♯ after the bar line. Exercise: tap the notes that sound sharp. | 4 rows |
| 7 | **Which key is it? (brief)** | One demonstrated step, not a drill. Sharps: `tr('The last sharp, up one half step, names the key.','最后一个升号，再往上一个半音，就是这个调。')` (keyboard shows F♯ to G). Flats: `tr('With flats, the second-last flat names the key. One flat is F.','降号调看倒数第二个降号。只有一个降号的是 F 调。')` A last line about minor: `tr('Every signature also belongs to a minor key. The last note of a piece usually tells you which.','每个调号也对应一个小调。乐曲的最后一个音通常会告诉你是哪一个。')` | Tap the last sharp: the arrow and the next key light. Two quick checks (G and D major; F and B♭ major). | 2 + 2 |
| 8 | **Play it** | The payoff and the bridge. A real tune with a signature, no accidentals in the line. `tr('Now the tune reads cleanly. Next: what fills a beat where you don’t play?','现在这首曲子读起来干净多了。下一课：不吹的拍子用什么来填？')` | Listen with the notes lighting; tap any note to hear it. Then name the key from the signature (one question). | 1 |

The lesson is complete when step 8's question passes. No review page.

## Notes

- **Step 2 is the heart of the lesson.** The learner makes the change themselves and hears that nothing changed.
  That is the "say it once" idea told three ways (principle 1). Next must not do it for them (principle 6).
- **Step 5 is the risky one:** six signatures in one step could be too much. If it feels long, split sharps (5a)
  and flats (5b), which still keeps the lesson at 9 steps.
- **Minor is one sentence** in step 7, matching the course map ("brief"). No minor exercise.
- **Not covered:** the order of sharps as a thing to memorise, the circle of fifths, keys past three sharps or flats.
  Those go in the Later track.

## Questions for you before building

1. **The tune for steps 1 and 8.** It needs F♯ in nearly every measure and nothing else changed. "Mary had a little
   lamb" in D uses only D, E, F♯ and A, so it fits step 1, but D major's real signature has two sharps (C♯ never
   appears in the tune). Options: use Mary with a one-sharp signature (correct notes, but the "which key" trick in
   step 7 would then say G), find a G major tune with plenty of F♯, or have step 1 use Mary in D and teach two sharps
   from the start. What do you prefer, or do you have a tune your students know?
2. **How far to go:** up to three sharps and three flats (A and E♭ major) as drafted, or stop at two? For flute and
   band parts, F, B♭, E♭, G and D cover most first pieces.
3. **Step 7 (naming the key):** keep it as a short demonstrated step with four checks, or make it narration only?
4. **Minor:** one sentence as drafted, or leave minor out of Essentials entirely?
