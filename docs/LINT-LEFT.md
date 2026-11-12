# Lint left in app/flute-studio (November 6, 2026)

Base: main f553b92 + ipad-pass + q1-density + q2-perf + m-reader-keys + m3-reader-ipad (uncommitted, local).

## Result

`npx eslint app/flute-studio`: **0 errors, 0 warnings.** `--report-unused-disable-directives` finds no stale
suppressions. What is left is lint that is switched off line by line: **68 `eslint-disable` comments**, grouped
below. None is a global disable.

Effort: **S** = minutes, one file, no behaviour change. **M** = an hour or so, needs a browser check.
**L** = half a day or more, touches playback or layout timing and needs a careful check.

## By rule

### react-hooks/set-state-in-effect (35)

Almost all are the same pattern: read localStorage (or `matchMedia`, `navigator`) after mount and put it in state, so
the server render and the first client render match. Correct, but it renders twice.

- **Fix:** a shared `useStoredValue(key)` built on `useSyncExternalStore` (like `lib/bookProgress.ts` already does)
  and move the reads onto it.
- **Effort:** S each for the simple readers (`AccountMenu`, `PracticeActivityHero`, `i18n/LanguageContext`,
  `theory/useCourseProgress`, `theory/useLessonSave` x2, `roadmap/page`, `usePomodoro`, `practice/PracticeCard`,
  `practice/page`, `transfer/page`, `tricky-bits/TrickyBitsPage`, `lib/pencilMode` x2, `components/OfflineButton`,
  `components/RecordingPanel`, `breathing/BodyView`, `embouchure/Breathing`). About 18, **M overall** once the hook
  exists.
- **Leave or L:** `ScoreViewer` x6 (1091, 1130, 1183, 1205, 2098, 2606), `ReaderPopover` (resets its placement gate),
  `AnnotationLayer`, `RhythmTap` x2, `ScoreTempoMarks`, `KeyExerciseViewer`, `ScaleStudio`, `LongToneStudio`,
  `TonePracticeReader`, `TendencyTest` x2. These reset state when a piece, mode or layout changes; rewriting them as
  keyed components or derived state is possible but each needs a playback/layout check. **L total; low value.**

### react-hooks/exhaustive-deps (24)

Effects that run on narrow triggers on purpose (re-engrave only when the asset changes, reschedule only on bpm, and so on).

- **Fix:** `useEffectEvent` for the callback part, as done for the 26 warnings on November 4.
- `ScoreViewer` x10 (1022, 1284, 1286, 1306, 1398, 1967, 2039, 2208, 2240, 2592) and `PracticeAudio` x2 (292, 303):
  **L**. Playback, bpm rescheduling and the drone; each needs listening, not just a render check.
- `FixedScoreViewer` x2, `ScoreTempoMarks`, `AnnotationLayer`, `tricky-bits/BitPractice`, `rhythm-drills/RhythmGame`,
  `practice/mock/page`, `tools/tendency/TendencyTest` x2, `tools/tendency/ChromaticStaff`: **M** each.
- `lib/storage.ts`, `lab/warmup/WarmupMelodies`: **S**.

### @next/next/no-img-element (2)

`AnnotationLayer` (legacy ink as a data URL) and `FixedScoreViewer` (PDF page images). `next/image` doesn't help a
data URL or a vinext static page. **Keep**; the comments already say why.

### jsx-a11y (5)

- `ScoreViewer:3339` (static element with a click handler): one comment line suppresses `no-static-element-interactions`
  and `click-events-have-key-events`. A wrapper that forwards taps on the page controls. **M**: needs a role and key
  handling, or moving the handler onto the buttons.
- `embouchure/Breathing:66` `no-noninteractive-tabindex`: the 3D model is a focusable `role="application"` with arrow
  key rotation. **Keep** (intentional, labelled).
- `practice/mock/page:164` `no-autofocus`: the mock audition's Start button. **S** to replace with a focus effect; keep
  if the autofocus is wanted.
- `components/RecordingPlayback:35` `media-has-caption`: a practice recording has no captions to give. **Keep.**

### @typescript-eslint/no-unused-vars (1)

`lib/noteSegmenter.ts:94`: an unused destructured value. **S.**

## Suggested order

1. The S items: `noteSegmenter`, `lib/storage`, `WarmupMelodies`, `mock/page` autofocus (10 minutes).
2. `useStoredValue` hook plus the ~18 simple storage readers (one sitting, check each page once).
3. The M exhaustive-deps outside ScoreViewer.
4. Leave the ScoreViewer and PracticeAudio ones until playback is being worked on anyway.
