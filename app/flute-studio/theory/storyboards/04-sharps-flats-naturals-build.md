# Lesson 4 build plan: Sharps, flats and naturals

Step-by-step instructions for building lesson 4. The *why* is in `04-sharps-flats-naturals.md`
(the storyboard) and `../LESSONS.md` (the principles). Read both once before starting. This file
says *what to do*, in order. Do the phases in order; each one ends with checks that must pass
before the next.

## Rules for the whole job

- **Do not commit, push or deploy.** Local edits only (see `AGENTS.md`).
- **Copy rules:** every user-visible string goes through `tr(en, zh)`. No em dashes or en dashes in
  either language. Use the copy in this file word for word; if you need a new line, keep it plain
  and short.
- **Lint rules that bite in this codebase** (`react-hooks`):
  - Never call `setState` synchronously inside `useEffect`. Do the work in the event handler
    instead (see how `MeasuresLesson.tsx` schedules timers in click handlers).
  - Never read `ref.current` during render, including inside values computed during render.
- **Use the existing pieces.** Do not write a new staff, a new note drawing, a new audio engine or a
  new lesson frame. Everything listed under "Existing pieces" below already works.
- **Template to copy from:** `measures/MeasuresLesson.tsx` (lesson 3). Structure the new lesson the
  same way: a `FLOW` array of step ids, one `if(id===...)` block per step that sets `narration`,
  `message`, `scene`, `tools`, `extra`, `tone`, `ready` and optionally `pageNext`, and one
  `<LessonFrame>` at the bottom.
- **After every phase run:**
  ```
  npx eslint app/flute-studio/theory/
  npx tsc --noEmit -p .
  ```
  `tsc` already reports errors in `vite.config.ts` and `worker/index.ts`; those are not yours.
  Anything else must be zero. `lib/pencilMode.ts` has one existing lint error; also not yours.

## Existing pieces (read these files)

| What | Where | How you use it |
|---|---|---|
| Lesson frame (step dots, narration, scene, Cookie's bubble, Next) | `theory/LessonFrame.tsx` | Props: `title, zh, steps, current, onJump, heading, narration, message, tone, next, extra, status`, children = the scene. |
| Engraved staff | `theory/EngravedRow.tsx` | `<EngravedRow notes={[{v:1,p:1}]} bars={[4]} clef meter={null} active={i}>{layout=>overlays}</EngravedRow>`. `v` = length in quarter notes, `p` = staff position. Children receive `layout` (`layout.xs[i]` = note x). |
| Staff coordinates | `theory/model.ts` | `noteY(p)=200-p*12`. Positions: C4 = -2, D4 = -1, E4 = 0, F4 = 1, G4 = 2, A4 = 3, B4 = 4, C5 = 5, D5 = 6. `PITCHES` gives letter and MIDI for -2 to 10. |
| Accidental glyphs | `theory/accidentalGlyphs.ts` | `ACCIDENTALS.sharp/flat/natural` are SVG path strings. Draw with `transform="translate(X Y) scale(.064 -.064)"` where X is 35 left of the note's x and Y is `noteY(p)` (see `ScaleStudioPreview.tsx` line ~107 for a working example). |
| Audio | `theory/rhythm/useRhythmAudio.ts` | `const audio=useRhythmAudio()`. One note: `audio.play([1],[midi])`. A melody with its rhythm: `audio.play(values,midis)`. `audio.active` = index sounding now. `audio.stop()`. Use this hook only; do not use `useLessonAudio` in this lesson. |
| Course progress | `theory/useCourseProgress.ts` | `course.finish('accidentals')` after you add the key (phase 3). |
| Answer buttons in Cookie's bubble | `measures/measures.css` classes `measures-choices`, `is-correct`, `is-wrong` | Import `../measures/measures.css` and reuse the classes; do not invent new button styles. |
| Lesson 1 keyboard | `theory/LessonDiagram.tsx`, the `sequence-keyboard` block near line 60 | Phase 1 moves this into a shared component. |

---

## Phase 0: progress dots in every lesson

Decision (LESSONS.md principle 8): progress is shown as a short row of dots that fill, in Cookie's
bubble, never as words like "Question 2 of 6".

1. **Create `theory/ProgressDots.tsx`:**
   `export default function ProgressDots({done,total,zh}:{done:number;total:number;zh:boolean})`.
   Renders `<span className="progress-dots" role="img" aria-label={zh?`已完成 ${done} / ${total}`:`${done} of ${total} done`}>`
   containing `total` `<i>` elements; the first `done` get class `is-done`.
2. **CSS in `theory/lesson-shell.css`:**
   ```css
   .progress-dots{display:inline-flex;gap:6px;align-items:center;margin-right:6px}
   .progress-dots i{width:8px;height:8px;border-radius:50%;border:1.5px solid #c9bfae;background:transparent;transition:background .2s,border-color .2s}
   .progress-dots i.is-done{background:#678956;border-color:#678956}
   @media(prefers-reduced-motion:reduce){.progress-dots i{transition:none}}
   ```
3. **LessonFrame:** add an optional prop `progress?:{done:number;total:number}`. Render
   `<ProgressDots .../>` as the first child of `.lesson-actions`, and make `.lesson-actions` render
   when `progress` is set even if there is no action or extra.
4. **Adopt it in the built lessons.** Replace progress *text* only; keep every other message.
   - Lesson 1 (`FirstNotes.tsx`): delete the `<p className="lesson-count">…</p>` line (around line
     171) and pass `progress={{done:quiz.round+(quiz.correct?1:0),total:quiz.questions.length}}`
     on the quiz steps. Delete the now-unused `.lesson-count` rule in `lesson-shell.css`.
   - Lesson 2 (`rhythm/RhythmLesson.tsx`): on the tap step, the message
     `` `${taps.length} of ${tapPattern.length}…` `` becomes `tr('Keep going…','继续……')` and
     `progress={{done:taps.length,total:tapPattern.length}}`. On the hold step, show
     `progress={{done:round+(correct?1:0),total:HOLD_VALUES.length}}`.
   - Lesson 3 (`measures/MeasuresLesson.tsx`), `progress` on: Counting quiz (3 questions), Other
     top numbers quiz (3), The bottom number quiz (2), Draw bar lines (3 rounds), Read and play
     (3 rounds), and Beats and notes "try" phase (8 beats; change the message
     "N beats marked, M to go" to `tr('Keep going.','继续。')` once at least one is marked).
5. **Check:** open each lesson at `http://localhost:3000/flute-studio/theory/first-notes`,
   `/rhythm`, `/measures`, go to each quiz, and confirm the dots show and fill. No "of" counters
   remain: `grep -n " of \${" app/flute-studio/theory -r` should only match aria-labels.

---

## Phase 1: foundations

### 1a. Pitch with accidentals: `theory/accidentals/pitch.ts`

```ts
export type Acc='sharp'|'flat'|'natural';
export type ReadNote={v:number;p:number;acc?:Acc};   // acc = the sign WRITTEN in front of this note
```
Write these pure functions (no React):

- `letterMidi(p:number):number` returns the MIDI of the plain letter at position `p`, from
  `PITCHES` in `model.ts` (`PITCHES[p+2].midi`).
- `midiOf(p:number,acc?:Acc):number`: letter MIDI, +1 for sharp, -1 for flat, +0 for natural or none.
- `soundingAcc(notes:ReadNote[],bars:number[]):(Acc|undefined)[]`: the accidental each note
  *sounds* with, by the rule: a written sign applies to later notes **at the same position `p`**
  in the **same measure**, until another sign at that position replaces it; a bar line clears
  everything. (`bars` holds note indices that start a new measure, like EngravedRow's `bars`.)
  Return `'natural'` as `undefined` so callers only see sharp, flat or nothing.
- `soundingMidi(notes,bars):number[]`: `midiOf(p, soundingAcc[i])` for each note.

**Test file `tests/accidentals.test.mjs`** (copy the import style of `tests/direction-words.test.mjs`):
- F♯ G F | F → sounding MIDI 66, 67, 66, 65.
- B♭ B B♮ B → 70, 70, 71, 71.
- F♯ then F an octave higher (p = 8) in the same measure → the high F stays 77 (same position rule).
- Twinkle and Ode to Joy data from step 6 below → the MIDI lists given there.

Run with `node --test tests/accidentals.test.mjs` (no build needed). All must pass.

### 1b. Accidentals in EngravedRow

1. `RowNote` gets an optional `acc?:'sharp'|'flat'|'natural'`.
2. `layoutRow`: add `const ACC_ROOM=22`. When placing note `i`, if `notes[i].acc` is set **or** the
   new option `reserveAcc` is true, advance `cursor` by `ACC_ROOM` before `xs.push(...)`. Include
   that room in the `fixed` total so the row still fits between `startX` and `endX`. Add
   `reserveAcc?:boolean` to the options object and pass it through from a new `EngravedRow` prop
   of the same name.
3. Draw it inside each note's `<g>` (the group is already translated to the note), before the
   notehead: `{n.acc&&<path className="engraved-row__acc" d={ACCIDENTALS[n.acc]} transform="translate(-35 0) scale(.064 -.064)"/>}`.
   Because it's inside the note group, it turns red with the note when `active`.
4. `engraved-row.css`: `.engraved-row__acc{animation:engraved-in .2s ease both}` so a sign fades in
   when added (the `engraved-in` keyframes already exist there).
5. **Check:** temporarily render `<EngravedRow notes={[{v:1,p:1,acc:'sharp'},{v:1,p:4,acc:'flat'},{v:1,p:1,acc:'natural'}]}/>`
   somewhere you can see it. Each sign must sit just left of its notehead, vertically centred on
   the note's line or space, at the same size as the notehead's height. Compare with a printed
   score. Remove the temporary render.

### 1c. Shared keyboard: `theory/PianoKeys.tsx`

Move the keyboard out of `LessonDiagram.tsx` into its own component so lessons 1 and 4 share it.

```ts
type Props={
  low:number;high:number;              // MIDI of the lowest and highest WHITE keys shown
  labels:boolean;                      // letters on white keys (black keys are never labelled)
  blackPlayable:boolean;               // lesson 1 passes false (keeps its current behaviour)
  lit?:{midi:number;tone:'red'|'green'|'outline'}[];
  arc?:[number,number]|null;           // draw a small arc over two keys (step 1)
  onKey?:(midi:number)=>void;
  zh:boolean;
};
```
- Keep lesson 1's look: white keys 42 wide, `rx` 3, same CSS classes (`white-key`, `black-key`,
  `is-key-active`). Black keys sit between C-D, D-E, F-G, G-A and A-B only.
- Every key is a `role="button"` with `tabIndex={0}` and Enter/Space handling when playable, and an
  `aria-label` of its name (black keys: both names, e.g. "F sharp or G flat").
- Hit area = the whole key rectangle. Black keys are drawn after white keys so they get the tap.
- `lit` tones: red fill for "sounding or pointed at", green for "right", outline for the neighbour
  in step 1. Add the CSS next to the existing keyboard rules in `lesson-shell.css`.
- Replace the inline keyboard in `LessonDiagram.tsx` with
  `<PianoKeys low={60} high={72} labels={step>=5} blackPlayable={false} .../>`, wiring its
  existing `onKey` and lit logic.
- **Check:** lesson 1, "Note names" step looks and behaves exactly as before (tap keys, names
  appear from that step on, notes light).

---

## Phase 2: the lesson

Files: `theory/accidentals/page.tsx` (two lines, like `measures/page.tsx`),
`theory/accidentals/AccidentalsLesson.tsx`, `theory/accidentals/accidentals.css`.

Title: `tr('Sharps, flats and naturals','升号、降号与还原号')`.

```ts
const FLOW=['half','sharp','flat','natural','measure','read'] as const;
const names=[tr('Half steps','半音'),tr('Sharps','升号'),tr('Flats','降号'),tr('Naturals','还原号'),tr('Through the measure','一整个小节'),tr('Read two phrases','读两段旋律')];
```

**Every step's scene** is the same layout: an `EngravedRow` (treble clef, no time signature) on top,
`<PianoKeys low={60} high={74} labels blackPlayable .../>` below it, centred, max-width about 420px.
Only the notes change. Add an `accidentals.css` rule so the scene keeps one fixed height across
steps (LESSONS.md principle 10).

**Navigation:** copy lesson 3's `navigate(n)` pattern: stop audio, reset that step's state, set the
step. `next` defaults to `tr(`Next: ${names[step+1]} →`, `下一步：${names[step+1]} →`)` with
`ready` from the step. Next never performs the learner's action.

### Step 1, `half`: Between the notes

- **Notes:** C4 D4 E4 F4 G4 A4 B4 C5, all `v:1`, `p` -2 to 5.
- **Narration:** `tr('Every note you’ve read so far is a white key. From one key to the very next one, black or white, is a half step.','目前你读过的每个音都是一个白键。从一个键到紧挨着的下一个键，不管黑键还是白键，都是一个半音。')`
- **Tap a white key** (or its note on the staff, via a tap rect over each note in `children`):
  play `[key, key+1]` as `audio.play([1,1],[k,k+1])`; light `k` red and `k+1` outline; `arc=[k,k+1]`;
  light the matching staff note red with `active`.
- **Tap a black key:** play it alone; no staff light; set a flag `sawBlack`.
- **Messages, in this priority:**
  1. after tapping E or B: `tr('No black key between these two, and it’s still a half step. E to F and B to C are the two places that happens.','这两个键之间没有黑键，但还是相差一个半音。E 到 F、B 到 C，就是这两个地方。')`
  2. right after a black key: `tr('That key has no line or space of its own yet. Writing it is what this lesson is about.','这个键在五线谱上还没有自己的位置。怎么写它，就是这节课要学的。')`
  3. after any other tap: `tr('Those two are next to each other: a half step. Now try E.','这两个键挨着：一个半音。现在点一下 E。')`
  4. at the start: `tr('Tap any key and see its neighbour.','点任意一个键，看看它旁边的键。')`
- **Done (`ready`):** E (or B) has been tapped and at least two taps in total.

### Step 2, `sharp`: Sharps

- **Notes:** F4 (`p:1`) and C5 (`p:5`), `v:1`, `reserveAcc` on, `acc` from state (`sharpF`, `sharpC` booleans).
- **Slots:** in `children`, for each note without a sign draw the sharp path at
  `translate(layout.xs[i]-35, noteY(p)) scale(.064 -.064)` with class `acc-preview`
  (`fill:#292a33; opacity:.18`; on hover-capable devices `.acc-slot:hover .acc-preview{opacity:.4}`).
  Over it, a transparent tap rect: `x=xs[i]-50 y=noteY(p)-24 width=40 height=48`, class `acc-slot`,
  `role="button"`, `aria-label` "Add a sharp to F" / "给 F 加升号", Enter and Space work.
  Tapping the real sign (same rect) removes it.
- **On add:** set the state; play `midiOf(p,'sharp')`; light that key red. **On remove:** play the
  plain note; light the white key.
- **Narration:** `tr('A sharp raises a note by a half step. The note stays on its line or space, and the sharp is written just in front of it.','升号把一个音升高半音。音符还在原来的线或间上，升号写在它的前面。')`
- **Messages:** start `tr('Tap in front of the F to add a sharp.','点 F 的前面，加一个升号。')`;
  after F has had a sharp `tr('F sharp: one key up from F. Now add a sharp to the C.','升 F：比 F 高一个键。现在给 C 也加一个升号。')`;
  done `tr('Every note can take a sharp. Tap a sharp to take it off and compare.','每个音都可以加升号。点升号可以去掉它，比较一下。')`.
- **Done:** both notes have had a sharp at least once (track "ever added", not current state).

### Step 3, `flat`: Flats

- **Part A notes:** B4 (`p:4`, flat togglable like step 2) and A4 with a written sharp (`p:3, acc:'sharp'`).
- **Narration:** `tr('A flat lowers a note by a half step. It’s written in front of the note too.','降号把一个音降低半音，也写在音符前面。')`
- **Messages:** start `tr('Tap in front of the B to add a flat.','点 B 的前面，加一个降号。')`;
  after the flat `tr('B flat: one key down from B. Now tap the A sharp next to it.','降 B：比 B 低一个键。现在点旁边的升 A。')`;
  tapping the A♯ note plays 70 and lights the same key: `tr('Same key! One key can have two names. Which name you see depends on the music around it.','同一个键！一个键可以有两个名字。你看到哪个名字，要看它周围的音乐。')`
- **Part B (same step, after A♯ was tapped):** append E♯ (`p:0, acc:'sharp'`) and F (`p:1`) to the
  row. Message: `tr('A sharp doesn’t always land on a black key: E sharp is just F. Tap them both.','升号不一定落在黑键上：升 E 其实就是 F。两个都点点看。')`
  Both light the F key (MIDI 65).
- **Done:** E♯ and F have both been tapped.

### Step 4, `natural`: Naturals

- **Notes:** F4 with sharp, B4 with flat. Tapping a sign switches it to a natural; tapping the
  natural switches back.
- **Narration:** `tr('A natural cancels a sharp or flat. The note goes back to its plain letter.','还原号取消升号或降号，让音回到原来的音名。')`
- **Messages:** start `tr('Tap the sharp to change it into a natural.','点升号，把它换成还原号。')`;
  after F `tr('Back to plain F. Now the flat on the B.','回到了 F。再试试 B 上的降号。')`;
  done `tr('Sharp, flat and natural: you know all three signs.','升号、降号和还原号，三个记号你都认识了。')`
- **Done:** both have been switched to a natural at least once.

### Step 5, `measure`: Through the measure

- **Narration:** `tr('A sharp or flat keeps going for the same note, in the same spot on the staff, until a natural or the bar line. Bar lines from lesson 3 matter here.','升号或降号会一直管着五线谱上同一个位置的同一个音，直到遇到还原号或小节线。第 3 课的小节线在这里就有用了。')`
- **Three questions** in order, with `progress={{done,total:3}}`, answers in the bubble
  (`extra`, `measures-choices` buttons), the asked note circled
  (`<circle className="measure-circle" cx={layout.xs[i]} cy={noteY(p)} r="24"/>`, class from lesson 3).

| # | Notes (all `v:1`) | Bars | Circled | Choices | Answer |
|---|---|---|---|---|---|
| 1 | F♯4 G4 F4 A4 \| F4 G4 A4 G4 | `[4]` | index 2 | Yes / No | Yes |
| 2 | B♭4 B4 B♮4 B4 | none | index 1 | Flat / Plain | Flat |
| 3 | same row as 2 | none | index 3 | Flat / Plain | Plain |

- **Questions:** 1 `tr('Is this F sharp too?','这个 F 也是升 F 吗？')`; 2 `tr('Is this B flat, or plain?','这个 B 是降 B，还是原来的 B？')`; 3 `tr('And this one?','那这个呢？')`
- **Right answers:**
  1 `tr('Yes. The sharp earlier in the measure still counts. After the bar line, the next F is plain again.','对。小节前面的升号还管着它。过了小节线，下一个 F 就又是原来的 F 了。')`
  2 `tr('Yes: the flat earlier in this measure still counts.','对：这个小节前面的降号还管着它。')`
  3 `tr('Right: the natural cancelled the flat for the rest of the measure.','对：还原号把降号取消了，一直到这个小节结束。')`
- **Wrong answers** (the question stays): `tr('Look earlier in this measure for a sign on the same note.','看看这个小节前面，同一个音有没有记号。')`
- **After each right answer:** draw the reach band in `children`: a rect from the sign's x
  (`xs[signIndex]-40`) to the bar line (`layout.barXs[0]`) or to the natural, at
  `y=noteY(p)-14 height=28`, class `acc-reach` (`fill:#b9362e; opacity:.08`). Then play the row with
  `audio.play(values, soundingMidi(notes,bars))` so the keys light in turn. Next becomes
  `tr('Next question →','下一题 →')` until the last one.
- **Done:** all three answered correctly.

### Step 6, `read`: Read two phrases

Data (MIDI lists must match `soundingMidi`; the test in phase 1a checks this):

```ts
// Twinkle in F, second line: B♭ B♭ A A | G G F(half). Only the first B♭ carries a sign.
const TWINKLE={notes:[{v:1,p:4,acc:'flat'},{v:1,p:4},{v:1,p:3},{v:1,p:3},{v:1,p:2},{v:1,p:2},{v:2,p:1}],bars:[4]};
// midi: 70 70 69 69 67 67 65
// Ode to Joy in D, first line, beginner-book rhythm: F♯ F♯ G A | A G F♯ E | D D E F♯ | F♯ E E(half)
const ODE={notes:[{v:1,p:1,acc:'sharp'},{v:1,p:1},{v:1,p:2},{v:1,p:3},{v:1,p:3},{v:1,p:2},{v:1,p:1,acc:'sharp'},{v:1,p:0},
  {v:1,p:-1},{v:1,p:-1},{v:1,p:0},{v:1,p:1,acc:'sharp'},{v:1,p:1,acc:'sharp'},{v:1,p:0},{v:2,p:0}],bars:[4,8,12]};
// midi: 66 66 67 69 69 67 66 64 62 62 64 66 66 64 64
```
Both rows use `meter={{top:4,bottom:4}}` (a real tune shows its time signature).

- **Flow:** phrase 1, then phrase 2, `progress={{done:phrasesDone,total:2}}`. State: `phrase`,
  `cursor` (index of the note to play), `misses` (on the current note), `finished`.
- **The red note:** `active={cursor}`.
- **Tap a key:** always play it. If it equals `soundingMidi[cursor]`: light it green briefly,
  `cursor+1`, reset `misses`. Otherwise `misses+1`, light the tapped key red, and show a hint.
- **Hints:** if the note has no written sign but `soundingAcc` gives it one:
  `tr('This note has no sign, but look earlier in the measure.','这个音前面没有记号，但看看这个小节前面。')`
  otherwise `tr('Not that one. Find the letter first, then check for a sign.','不是这个。先找到音名，再看有没有记号。')`
- **Show answer:** after 2 misses on the same note, a `Show answer` / `显示答案` button in the
  tools row outlines the right key.
- **Messages:** phrase 1 start `tr('Twinkle, starting on F. Play each red note on the keyboard.','《小星星》，从 F 开始。在键盘上弹出每个红色的音。')`;
  phrase 2 start `tr('Ode to Joy. Watch for the sharps.','《欢乐颂》。注意升号。')`;
  phrase 1 finished `tr('That’s the tune with its flat. Press Listen to hear it.','这就是加了降号的旋律。点“听一听”听听看。')`
  with Next `tr('Next phrase →','下一段 →')`; phrase 2 finished
  `tr('That was a lot of sharps to write. Next lesson: how music says “always”.','要写这么多升号挺累的。下一课：音乐怎么说“一直这样”。')`
- **Listen** (tools row, shown when a phrase is finished): `audio.play(values, soundingMidi(...))`,
  the correct melody with its rhythm. Never replay the learner's taps.
- **Finish:** after phrase 2, Next is `tr('Finish lesson','完成课程')` →
  `course.finish('accidentals')`, then `tr('Back to theory lessons','回到乐理课')` linking to
  `/flute-studio/theory` (copy lesson 3's `done` pattern).

---

## Phase 3: wiring

1. `useCourseProgress.ts`: add `accidentals` to `Completion`, the default object and the read from
   storage.
2. `theory/page.tsx`: add a fourth card after lesson 3, same markup as the lesson 3 card:
   title `4. ${tr('Sharps, flats and naturals','升号、降号与还原号')}`, text
   `tr('Write the notes between the letters, and read how long a sign lasts.','写出音名之间的音，并读懂一个记号管多久。')`,
   art: `<EngravedRow clef notes={[{v:1,p:1,acc:'sharp'},{v:1,p:4,acc:'flat'},{v:1,p:1,acc:'natural'},{v:1,p:3}]} viewBox="30 0 860 310"/>`,
   `is-complete` from `completed.accidentals`, link `/flute-studio/theory/accidentals`.
3. `LESSONS.md`: mark lesson 4 `(built)` in the essentials table.

---

## Phase 4: final checks

Run the dev server (it is usually already running at `http://localhost:3000`; if not, use the
`cookie-site-dev` launch configuration). Then, at desktop width **and** at iPad size (1180 × 820):

- [ ] Lint and type check as above; `node --test tests/accidentals.test.mjs` passes.
- [ ] Lessons 1, 2 and 3 still work, with progress dots replacing every counter.
- [ ] Lesson 4: every step can be completed by touch alone (no hover needed), and Skip works on
      each step.
- [ ] The scene height never changes between steps; Cookie's bubble never jumps.
- [ ] Every accidental is the engraved glyph, left of its note, the right size.
- [ ] Keyboard: white keys show letters, black keys don't; every key is tappable with a finger.
- [ ] Step 5's band stops at the bar line or the natural.
- [ ] Step 6: a carried sign (the second B♭, the second F♯ in measure 1) is required to be played
      flat or sharp; Listen plays the correct melody with the half note held.
- [ ] Switch the site to Chinese: every string is translated, no English left, no dashes.
- [ ] No commits made.

Report back with what you built, the check results, and anything you could not make work, with the
exact error.
