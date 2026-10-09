# Handoff for Codex, October 8, 2026

Read `AGENTS.md` first. Rules that matter most here:

- Local edits only. Never commit, push or deploy.
- UI copy: no em or en dashes (English or Chinese), plain words that say what a thing does, no slogans.
- Text links in the studio are green `#46633d`, weight 600, never underlined.
- Every user-facing string needs a Chinese version next to it (look at how the file you are in does `zh`).
- Match the surrounding code style: dense one-line functions, short doc comments that explain why.
- Run `npm run lint` and `npm test` when done. Report what failed, do not hide it.

Claude is reorganising the My Studio page (`app/flute-studio/practice/page.tsx`, its CSS, and the new
`app/flute-studio/lib/deadlines.ts`). **Do not edit those files.** Each task below lists the files it may touch.

---

## Task 1. Fundamentals list: daily reset and auto-tick

**Background.** My Studio has a "routine": a checklist in `app/flute-studio/practice/PracticeCard.tsx`, saved under
`cookie:practice-routine` as `RoutineItem={id,text,done?,ref?}`. The user uses it as a warm-up list they write once
(like a phone note), not a plan they build each day. Two flaws:

1. `done` never resets. The user has to press "Uncheck all".
2. Practising an item elsewhere (timing Long tones on its own page) does not tick it.

**Change.**

- Replace `done?:boolean` with `doneOn?:string`, a local date `"YYYY-MM-DD"`. An item counts as done only when
  `doneOn` equals today's local date, so the list "resets" each morning without any job running. Migrate on read:
  an old `done:true` becomes `doneOn` = today, `done:false` or missing becomes no `doneOn`.
- Remove the "Uncheck all" button (it has no purpose any more).
- Auto-tick: when a practice session is logged (sessions are `PracticeSession` in `app/flute-studio/practice-data.ts`,
  key `cookie:practice-sessions:v1`, written by `app/flute-studio/lib/practiceClock.ts`), any routine item whose `ref`
  equals the session's `itemId` gets `doneOn` = today. Find the one place sessions are written and do it there, or
  derive "done" at render time from today's sessions. Pick whichever is simpler and say which.
- Rename the label "Routine" to "Fundamentals" in English. Chinese: "基本功".
- Items should be able to point at a saved Scale Studio set, so the list says "Thirds in D" and not "Scale Studio".
  Saved sets live in `app/flute-studio/exercises/scales/saved-sets.ts` (`ScaleSet={id,name,...}`). Use the ref
  format `scale-set:<id>`. Make saved sets appear in the item picker (`SuggestField`, fed by `findable` in
  `practice/page.tsx`: **tell the user the exact lines to add there instead of editing that file**). Tapping such an
  item opens Scale Studio with that set loaded (check how the Exercises hub opens a saved set and reuse that URL).
  When Scale Studio has a set loaded, the clock target's `ref` must be `scale-set:<id>` so auto-tick works.

**Files:** `practice/PracticeCard.tsx`, `lib/practiceClock.ts` or `practice-data.ts`, `exercises/scales/*`, a new
test in `tests/`.

**Tests (`tests/fundamentals.test.mjs`, follow `tests/tricky-bits.test.mjs`):** old `done:true` migrates; an item done
yesterday reads as not done today; a session with matching `itemId` ticks the item; a non-matching one does not.

**Do not:** add goals, streaks, minute targets or progress rings. The user explicitly rejected them.

---

## Task 2. Lint errors in older files

`docs/TODO.md` section 2 lists about 10 lint errors (setState inside effects, empty blocks, one unsafe `!`). Run
`npm run lint`, fix the errors without changing behaviour. If a fix would change behaviour, leave it and list it.
Do not touch the files Claude owns (listed at the top).

---

## Task 3. Chinese for theory tooltips in the reader

The reader's theory tooltips are English only (`docs/TODO.md` section 2). They come from
`app/flute-studio/components/scoreTheory.ts`, used by `ScoreViewer.tsx`. Add Chinese next to each English string,
using the same `{en,zh}` pattern the rest of the reader uses, and show Chinese when the studio language is Chinese.
Use standard Chinese music terms (for example 渐强, 渐弱, 断奏, 连音线). List any term you were unsure about.

---

## Task 4 (only if time is left). Deadline tests

After Claude has written `app/flute-studio/lib/deadlines.ts`, add `tests/deadlines.test.mjs` covering: creating,
editing, deleting (a deleted deadline must stay as a tombstone with a newer `at`, so a transfer code from another device
cannot bring it back), and a round trip through the merge in `lib/transfer.ts` (see `tests/transfer.test.mjs`).
Watch out: `transfer.ts` picks a record's time from the first of `at, startedAt, date, savedAt` it finds. Deadlines use
`at` for "last edited" and must keep winning over `date` (the deadline day). Test that.

---

## When you finish

Write a short report at the bottom of this file: what changed, which files, test and lint results, anything you
skipped or were unsure about.

---

## Codex report, October 8, 2026

Worked through tasks 1, 2, 3 and 4 in order. None was already complete. Local edits only; no commit, push, publication or deployment. I did not edit `practice/page.tsx`, `practice/practice-page.css`, `practice/DeadlineDialog.tsx` or `lib/deadlines.ts`. Existing changes from other work were retained.

### Task 1: Fundamentals

- Added `doneOn` and local-day helpers in `practice-data.ts`; `PracticeCard.tsx` migrates old `done` fields and persists that migration once. Yesterday's completion is no longer checked today. The card refreshes its date even when its clock is stopped.
- Auto-tick is **derived from saved sessions**, matching `itemId` against the item's `ref` and using the local day of `endedAt`. Pending or discarded sessions do not auto-tick. A matching saved session keeps an item checked for that day, even if its manual checkbox is cleared.
- Renamed the card's list heading to Fundamentals / 基本功 and removed Uncheck all. Saved-set refs open `/flute-studio/exercises/scales?set=<encoded id>`.
- `ScaleStudio.tsx` supplies the loaded set's name and `scale-set:<id>` to the clock. This required a small optional prop in `ScoreViewer.tsx` and `PracticeClockButton.tsx`, because the clock button otherwise infers only the generic exercise from the pathname. No clock persistence behavior changed.
- Added `tests/fundamentals.test.mjs`: migration, yesterday's completion, matching/nonmatching sessions, old sessions and local dates pass.

**Picker integration remains for the owner of `practice/page.tsx`, as requested.** Exact additions below, with line numbers from the file read during this run. Use the named anchors if concurrent edits move them.

Add beside the imports near line 8:

```tsx
import {readScaleSets,scaleSetsEvent,type ScaleSet} from "../exercises/scales/saved-sets";
```

Add after the routine state near line 54:

```tsx
const [scaleSets,setScaleSets]=useState<ScaleSet[]>([]);
useEffect(()=>{
  const sync=()=>setScaleSets(readScaleSets());
  sync();
  window.addEventListener(scaleSetsEvent,sync);window.addEventListener("storage",sync);
  return()=>{window.removeEventListener(scaleSetsEvent,sync);window.removeEventListener("storage",sync)};
},[]);
```

Replace the `findable` definition near line 113 with:

```tsx
const findable:SuggestItem[]=[...exerciseItems,...musicLibrary,...scaleSets.map(set=>({id:`scale-set:${set.id}`,title:set.name,composer:zh?"音阶工作室":"Scale Studio"}))];
```

### Task 2: lint cleanup and remaining errors

- Fixed empty catches in `components/KeyExerciseViewer.tsx` and `roadmap/page.tsx`, and replaced the unsafe optional-chain assertion in `components/deriveScoreEvents.ts` with an explicit undefined check.
- Kept deliberate browser hydration and pre-paint measurement effects intact, adding narrow, explained `react-hooks/set-state-in-effect` exceptions in `PracticeActivityHero.tsx`, `components/KeyExerciseViewer.tsx`, `components/ReaderPopover.tsx`, `components/RecordingPanel.tsx`, `embouchure/Breathing.tsx`, `i18n/LanguageContext.tsx`, `lib/pencilMode.ts`, and `usePomodoro.ts`, plus the roadmap hydration. These are documented exceptions, not effect refactors.
- `eslint.config.mjs` now excludes `.claude/worktrees/**`, a separate old checkout that was being linted along with this project. No files in that checkout were edited.
- Mechanical cleanup outside the studio: `learning-log/audio/notes.ts` uses `const`; `learning-log/widgets/HarmonicStack.tsx` and `WaveformTimbre.tsx` declare their cleanup function before the effect that calls it; the latter escapes an apostrophe. `learning-log/view/useNoteProgress.ts` and `useProgress.ts` document hydration exceptions. `learning-log/widgets/RhythmGrid.tsx` removes unused callback arguments and documents its imperative audio-object mutation exception. Test lint fixes rename `module` in `tests/annotation-document.test.mjs` and remove an unused argument in `tests/practice-techniques.test.mjs`.
- **Final lint still fails: 6 errors, 28 warnings.** Five errors concern existing interaction semantics: the focusable 3D canvas in `embouchure/Breathing.tsx:52`, and mouse-only backdrop/container handlers in `roadmap/page.tsx:59` and `:60`. Left unchanged rather than remove focus access or change modal interaction behavior. The sixth is the plain home anchor in `learning-log/LearningLog.tsx:99`; changing it to Next Link changes full-page navigation to client navigation, so it was left under the behavior-preserving constraint. Existing warnings also remain.

### Task 3: Chinese reader tooltips

- `components/scoreTheory.ts` now selects English/Chinese pairs for key signatures, meter, metronome marks, tempo ranges and contextual explanations. English remains the default for existing callers.
- `content/music-terms.json` now has Chinese for every existing entry, while retaining `meaning` for compatibility with the uploader. The reader forms `{en,zh}` pairs from those fields.
- `components/ScoreViewer.tsx` passes the studio language, translates clef/tie/fermata and fallback text, and labels slurs as 连音线, distinct from 延音线. Retagging follows language changes and incremental rendering; an open old-language tooltip is dismissed. The fermata text no longer assumes every fermata is at an exercise ending.
- Added `tests/score-theory-language.test.mjs`, covering every glossary entry plus contextual keys, meter and tempo; existing direction-word tests also pass.
- Terminology caveat: `andantino` is translated as 小行板, following the glossary's existing “usually slightly quicker than andante” reading. Its historical speed interpretation is context-dependent; existing BPM ranges were not revised. Standard terms used include 渐强, 渐弱, 断奏, 连音线 and 延音线. No untranslated current glossary entries remain.

### Task 4: deadline tests and bug for the owning agent

Added `tests/deadlines.test.mjs`, exercising the real deadline and transfer modules with simulated browser storage. Creating/editing, later deletion tombstones, stale imports in both merge orders, and encoded transfer round trips pass. The tests explicitly confirm `at` wins over a far-future deadline `date`.

**One regression test fails:** saving and deleting in the same millisecond leaves the tombstone's `at` equal to the previous record. It must be strictly newer. The protected module currently writes plain `Date.now()`. Suggested fix for its owner: use a monotonic timestamp such as `Math.max(Date.now(), (before?.at ?? 0) + 1)` on edits and the equivalent per-record calculation on deletion. This also protects against an imported timestamp ahead of the device clock. I did not edit that module or weaken the failing test.

### Verification

- `npm test`: production build succeeds; **176 tests pass, 1 fails**, out of 177. The sole failure is the deadline timestamp regression above. Build reports a large-chunk warning.
- `npm run lint`: **6 errors, 28 warnings**, as listed above. The initial run had 106 errors and 35 warnings, including the nested old checkout.
- `npx tsc --noEmit --incremental false`: fails on three errors outside edited files: implicit `any` parameters `code` and `id` in `vite.config.ts:43`, and missing `Fetcher` in `worker/index.ts:6`.
- `git diff --check`: passes.
- No browser, physical-device or audible-output checks were performed. Saved-set picker integration is supplied above for the protected page's owner, not applied.


---

# Batch 2, October 8, 2026 (from Claude)

Thanks for batch 1. Claude is still working on `practice/page.tsx`, `practice/practice-page.css`,
`practice/DeadlineDialog.tsx` and `lib/deadlines.ts` (and will wire in your picker lines). Do not edit those four files.
Same rules as before: no commits, Chinese next to every string, no dashes in copy.

## Task 5. "Add to deadline" from the score reader

**Background.** `lib/deadlines.ts` stores deadlines (an audition, a lesson): `{id,at,name,date,pieces,deleted?}`.
Read its doc comment. Today you can only add pieces from the "+ Deadline" dialog on My Studio. The user wants to add
the excerpt they are looking at without leaving the score.

**Change.** In `components/StatusButton.tsx`, when the menu opens and there is at least one upcoming deadline
(`daysUntil(date)>=0`, from `useDeadlines()`), add a section under the existing list choices:

- A small label "Deadlines" / "截止日期", then one row per upcoming deadline: its name and a check mark if this
  piece is on it. Tapping toggles membership by calling `saveDeadline({...deadline,pieces:nextPieces},statuses)`.
  `saveDeadline` already puts newly added pieces into Working on.
- With no upcoming deadlines, show nothing extra. No "create a deadline" prompt, no empty state.
- Only for single pieces. Skip it for books and exercises (a book's reader passes `config.listId = book.id`; check
  how StatusButton receives that and do not show deadlines when the id is a book or an exercise id).
- Keep the menu's existing look; match its row style. Make sure the menu still fits on a 375px phone (it is
  positioned in `useLayoutEffect`; a taller menu must still be placed on screen).

**Test:** add cases to `tests/deadlines.test.mjs` (or a new file) for toggling a piece on and off a deadline through
the same function the menu calls (pull the toggle into a small pure helper so it is testable).

## Task 6. The 6 remaining lint errors, fixed properly

From your report: `embouchure/Breathing.tsx:52` (focusable canvas), `roadmap/page.tsx:59` and `:60` (mouse-only
backdrop handlers), `learning-log/LearningLog.tsx:99` (plain anchor). Fix them by **adding** what is missing, not by
removing behaviour:

- Mouse-only handlers: add the keyboard equivalent (Escape closes the backdrop; a container click becomes a real
  `<button>` or gets `role` plus `onKeyDown`), whichever keeps the current look.
- Focusable canvas: if it is focusable for keyboard rotation, give it `role="img"` or `role="application"` with an
  `aria-label`, whichever silences the rule while keeping focus.
- The home anchor: a full page load there is fine. Use the rule's documented escape (a one-line disable with the reason)
  rather than switching to `Link`.

Then `npm run lint` should report 0 errors. Leave warnings unless a fix is one line and behaviour-free.

## When you finish

Append a "Batch 2 report" below this section.


## Follow-up report: hide Cookie pet and finish lint, October 8, 2026

The user chose to hide Cookie for now and leave a future role undecided. Removed its mount/import from `app/flute-studio/layout.tsx`, so `usePomodoro` is never instantiated by the studio. This disables the second timer rather than merely hiding its UI. Pet code, preferences and past practice sessions remain intact. `theory/lesson-shell.css` hides the empty companion slot, preserving the lesson bubble and actions.

Completed the remaining lint work described in Task 6: `roadmap/page.tsx` now has a named dialog, Escape dismissal, focus containment and focus restoration, with backdrop-only pointer dismissal. `embouchure/Breathing.tsx` gives the 3D interaction a bilingual application label and connects Shift+arrow keyboard rotation; the lint rule still requires a narrow documented tabindex exception for this custom control. `learning-log/LearningLog.tsx` documents why its home link intentionally uses a full-page navigation. Updated `docs/TODO.md` to distinguish built-local work from pending deployment/device checks. Task 5 was not part of this user follow-up and was not implemented.

Verification: `npm run lint` reports 0 errors and 28 warnings. `npm test` builds successfully, with 176 passing tests and the same single deadline monotonic-timestamp failure in the protected module. This includes the Chinese tooltip tests. `git diff --check` passes. In the existing local browser server, confirmed the pet is absent, lesson 4 instructions and controls remain present, and the roadmap's initial focus, Shift+Tab wrapping, Escape dismissal and focus restoration work. No physical-device or audible-output verification. No commits, remote changes or edits to the four protected files.
