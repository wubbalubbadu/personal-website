# One-off styles audit (November 6, 2026)

Base: main `f553b92` plus `ipad-pass.patch`, `q1-density.patch` and `q2-perf.patch`, applied in that order. Line
numbers refer to that base, before `o-oneoffs.patch`. This was a source scan (grep plus reading), with a browser check
only for the embouchure View switch. `app/flute-studio/lab/` is left out on purpose: lab pages are experiments.

Effort: **trivial** = a class swap or a one-line delete, same look or the documented look. **Easy** = a swap that changes
how it looks a little, so it needs a quick look at phone and desktop. **Medium** = the markup or the page's layout must
change too. **Design** = it needs a decision first.

Fixed in `docs/.applied-patches/o-oneoffs.patch` are marked ✓.

## 1. One-offs: own styling where a component exists

### Buttons that should be the plain grey action button (`.action-button`)

DESIGN.md retired the soft green tint for buttons on October 16, but these still use it, or a private grey.

| Where | What it is | Effort |
|---|---|---|
| `tools/tendency/TendencyTest.tsx:136,154,155,185,186`, styles `tools/tendency/tendency.css:24-26` | Pitch test Start / Try again / Retake (`.tendency__primary` green tint, `.tendency__secondary`) | Easy |
| `transfer/page.tsx:102,103,127,131,132`, styles `transfer/transfer.css:11-13` | Transfer Copy / Paste / Merge (`.transfer-card__primary` green tint, `__secondary`) | Easy |
| `roadmap/page.tsx:84`, styles `roadmap/roadmap.css:43` | Roadmap "Mark as done" (`.roadmap-detail__mark`, green tint and a border) | Easy |
| `PracticeRecorder.tsx:63`, `components/SessionReview.tsx:26`, `practice/mock/page.tsx:199`, styles `studio-shell.css:527`, `practice-clock-button.css:46` | Recorder Save (`.recorder-save`, green tint, two copies) | Easy |
| `components/RhythmTap.tsx:134`, styles `components/passage-guide.css:201`, `:219` | Close-up rhythm Start (`.rhythm-tap__start`, green tint pill, restated with `!important`) | Easy |
| `exercises/scales/ScaleStudio.tsx:793,795`, styles `studio-shell.css:428` | Scale Studio "Save set" (`.scale-book__save-button`, `!important` sizes) | Easy (`--compact`) |
| `components/ScoreViewer.tsx:3263`, styles `reader-workspace.css:937` | Reader "Play from the start" (`.reader-play-start`, private grey `#efeff2` / `#292a34`) | Trivial look-wise, but full width needs `--action-*` vars |
| `components/PracticeNotation.tsx:126`, styles `tricky-bits/tricky-bits.css:33` and `:77` | Listen in a tricky bit (`.practice-listen`, grey fill in the dialog, a white bordered pill on the practice page) | Medium (two contexts disagree) |
| `theory/LessonFrame.tsx:57,58,75`, styles `studio-shell.css:208` | Lesson Next (`.lesson-next`, green tint with `!important`) | Design (LessonFrame's fixed Next is its own component; decide whether it follows) |

### Two-way choices that should be the View switch (`.view-switch`)

| Where | What it is | Effort |
|---|---|---|
| ✓ `embouchure/page.tsx:112`, `embouchure/workbench.css:11-18` | Embouchure / Breathing (dark selected fill). COMPONENTS.md already lists it as a View switch user | Trivial, done |
| ✓ `tools/tendency/TendencyTest.tsx:179`, `tools/tendency/tendency.css:18-21` | Results "Relative to your tuning / Against A = 440" (dark selected fill) | Trivial, done (not seen in a browser: needs a finished test; static width about 320px, fits 375) |
| `music/[id]/page.tsx:86`, `components/FixedScoreViewer.tsx:124`, styles `studio-shell.css:939` | Reader `.format-switch` (Score / Interactive), dark selected with `!important` | Easy |

### Selected options that should not be dark (purple `#f1e5f5` / `#6d4585` per the November 4 proposal, or a filter chip)

| Where | What it is | Effort |
|---|---|---|
| `breathing/BreathingLab.tsx:85`, styles `breathing/breathing-lab.css:17` | Breathing pattern chips (`.bl-exercises`) | Design (already an open question in COMPONENTS.md) |
| `components/PassageGuide.tsx:76`, `components/RhythmTap.tsx:133`, styles `components/passage-guide.css:254` | Close-up mode chips (Technique / Pitch / Rhythm) and the click choice (every beat / first beat / none), both dark | Design: the modes are tabs (dark allowed); the click choice is an option (purple) |
| `tools-panel.css:73` | `.tp-chip.is-on` green selected (already Not reused yet, item 7) | Design, pending the proposal |

### Close buttons

| Where | What it is | Effort |
|---|---|---|
| ✓ `exercises/long-tones/TonePracticeReader.tsx:121` | Long-tone Pitch close drew its own × button with an inline SVG, while the file already imports CloseButton | Trivial, done (now the same call as AnnotationLayer's Mark Up close) |
| `components/passage-guide.css:163-164` | Close-up close restyles CloseButton grey `#727982` with a hover colour change; CloseButton is `#111`, no hover change | Easy |

### Cards and pills

| Where | What it is | Effort |
|---|---|---|
| `practice/page.tsx:196`, `practice/mock/page.tsx:185,229`, styles `practice/practice-page.css:388` | `.deadline-card` (and mock cards reusing it): its own white card next to ItemCard on the same page | Medium |
| `tricky-bits/TrickyBitsPage.tsx:99`, styles `tricky-bits/tricky-bits.css:100` | `.tricky-sheet__bit`: white bordered card for a tricky bit; ItemCard is the tricky-bit card elsewhere | Medium |
| `tricky-bits/TrickyBitsPage.tsx:54,121`, `components/StatusButton.tsx:55`, styles `tricky-bits.css:14`, `components/status-button.css:15` | Two hand-built menus (`.tricky-card__menu`, `.status-button__menu`) instead of ReaderPopover | Medium |
| `components/RecordingPanel.tsx:17`, styles `studio-shell.css:485` | Record popup ("Latest recording") restyled like the tools panel instead of ReaderPopover | Medium |
| `breathing/BreathingLab.tsx:99`, styles `breathing/breathing-lab.css:35` | `.bl-controls`: white hairline card, close to Practice card | Design (the lab's look is its own) |
| `practice/PracticeCard.tsx:117`, styles `practice/practice-page.css:12` | Routine `.routine-count` "2 of 4" as a green pill (700 weight); the target is 14 / 400 grey text | Easy |
| `viewer-fixes.css:119` + `components/ScoreViewer.tsx:929` | Reader StoryCard: own surface and its own English-only facts line, not `composerFacts` (already noted in COMPONENTS.md) | Medium |

### Text links with no shared class

COMPONENTS.md's "Text link" has no class: it points to DESIGN.md and memory. So every page restates green `#46633d` /
600 / no underline. I found 20 copies: `.tp-link`, `.dock-fingering-link`, `.today-card__more`,
`.composer-timeline__extra`, `.composer-card li a`, `.tendency__link`, `.trill-chart__footnote a`,
`.tricky-dialog__panel footer a`, `.tricky-sheet__bit>header a`, `.chart-now__sibling`, `.passage-guide__card>h3 a`,
`.transfer-card__file`, `.scale-book__add-group`, `.pitch-card__test`, `.working__edit`, `.studio-fold__more`,
`.section-head__action`, `.routine-list__open` (plus two that are green for a "done" state, which is fine). Suggestion: add
`.text-link` to `studio-shared.css` and a row in COMPONENTS.md, then move these over one page at a time. Easy each, but
it touches 15 files.

### Also known, still open

`reader-settings-reset` (`ScoreViewer.tsx:3311`, `ScaleTemposPanel.tsx:38`, `KeyExerciseViewer.tsx:46`, plus one more)
should become `.text-action`, as COMPONENTS.md says. That is not trivial: `.text-action` is scoped to `.studio-route`,
and the reader panel may render outside it.

### Dead CSS (no TSX consumer found)

These rules match nothing in the studio's TSX, so they are not one-offs on screen, just weight. Check rendered pages
before deleting, because a class name could be built at runtime.

- `PracticeActivityHero.tsx` itself is imported nowhere, and that makes all of `practice-activity-hero.css` dead.
- In `practice-tool-dock.css`: `.primary-tool-button`, `.dock-close`, `.dock-panel-close`, `.dock-tabs`, `.dock-tool`.
- In `reader-workspace.css`: `.aids-collapse`, `.reader-terms`, `.reader-view-settings`.
- `scale-book.css` and related: `.scale-book__customize`, `.scale-book__play`, `.scale-book__panel-close`, `.scale-book__paper`, `.scale-book__panel`.
- In `music/library.css`: `.filter-menu-reset`, `.pick-one-trigger`, `.collection-actions`, `.row-save`, `.library-search`, `.filter-menu-pop`.
- In `viewer-fixes.css`: `.page-nav-btn`, `.page-mode-toggle`, `.tap-tempo-btn`.
- In `practice/practice-page.css`: `.focus-card__*`, `.practice-today__primary`, `.practice-today__reset`, `.practice-page__add-deadline`, `.working-card__remove`, `.working__edit`.
- Other files: `.exercise-hub__action`, `.studio-navigation__tools`, `.pitch-check__mic`, `.tricky-chip`, `.tricky-step`, `.tp-listen`, `.tp-stop`, `.rhythm-pad`, `.tendency__presets`, `.home-inset-list`.

## 2. Rule check: dark buttons, close vs delete, underlines, hand cursors

### Dark action buttons

None found. Every dark `#292a33` fill is a selected state:
- Allowed: studio nav, filter chips, reader mode tabs, the exercise hub tabs and the excerpt passage tabs are tabs.
- Not allowed: the dark selected states listed in section 1 (format switch, Breathing Lab, close-up chips, and before this patch the embouchure and pitch-test switches).

### × that deletes, or a hover fill on a close

- **Deletes with ×:** none. Every remove uses `PracticeIcon name="delete"`:
  - Exercises hub and Scale Studio saved sets
  - tricky bits
  - My Studio routine and sessions
  - mock auditions
  - offline music and transfer storage

  One borderline case: active drone chips in the tools panel show "C4 ×" (`PracticeToolDock.tsx:669`). That × stops a sound and deletes nothing, so I left it.
- **Hover fill on a close:**
  - ✓ `annotation-layer.css:31-32` gave the Mark Up close a `#f0f3f6` hover fill, outranking CloseButton's no-fill rule. Mark Up's close is the model for every close, so this was the clearest break. Removed.
  - ✓ `exercises/long-tones/tone-trace.css:70` (`.tone-dock button:hover`) outranked CloseButton and filled the long-tone graph's close (`TonePracticeReader.tsx:155`) on hover. It now skips `.close-button`.
  - Leftover close styles on dead classes (`.scale-book__panel-close`, `.dock-close`) do nothing.

### Underlined links

- `practice/practice-page.css:380`: the "Undo" after deleting a session is an underlined dark word. Design call: Text action or green text link. Easy either way.
- Deliberate and documented, so left alone: Scale Studio's breadcrumb (`reader-workspace.css:424`, `studio-shell.css:560`) and the focus-visible underline on section titles (`studio-shell.css:462`).

### Hand cursor on things that are not navigating links

The global rule (`studio-shell.css:878`) forces the arrow on buttons, `role="button"`, tabs, summaries, labels and
inputs, so the roughly 190 `cursor:pointer` declarations on buttons are dead code (harmless, worth deleting with the
next cleanup). Hands that still show:

| Where | What | Status |
|---|---|---|
| `components/tempo-pill.css:14`, `components/rep-pill.css:11` | The typed number inside TempoPill and RepPill (a text field, not in the global list) | ✓ removed, now the normal text cursor |
| `theory/accidentals/accidentals.css:48` | The grey "?" in the accidentals lesson, `aria-hidden` decoration | ✓ removed |
| `theory/accidentals/accidentals.css:65` | `.acc-match`, the whole drawing surface in Match notes (`role="group"`) | Design: arrow, or `grab` while dragging |
| `theory/lesson-shell.css:88` | `.theory-staff.is-placing`, tap-to-place surface | Design (arrow or crosshair) |
| `exercises/long-tones/tone-trace.css:78` | Long-tone noteheads (`.vf-stavenote`) you tap | Easy: make the notes `role="button"`, which also helps keyboards |
| `cookie-pet.css:25` | The docked Cookie pet | Excluded on purpose in the global rule; left |

## What the patch does

`docs/.applied-patches/o-oneoffs.patch` changes 10 files (+17 / -23). It applies to the base above, not to the fancier-tools worktree. All items are marked ✓ above:

- Mark Up close: no hover fill.
- Long-tone graph close: no hover fill.
- Long-tone Pitch close: now CloseButton.
- TempoPill and RepPill number fields: text cursor.
- Accidentals "?": arrow cursor.
- Embouchure / Breathing: View switch.
- Pitch test results: View switch.

Checks: tsc shows no new errors and eslint is clean on the three changed TSX files. I looked at the embouchure switch at 375px (grey track, white chosen choice, no sideways scroll). I didn't check the pitch-test switch or the long-tone closes in a browser, because they need a finished test or Pitch mode running.
