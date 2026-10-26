# Cookie Flute Studio: which component to use

**The rule: reuse before you build.** If something on the page means the same thing as something elsewhere in the
studio, it uses the same component, so changing that component changes it everywhere. Before adding UI, find its job
below and use what is listed. If nothing fits, add a component here instead of styling a one-off.

Values (colours, sizes, shadows) live in [DESIGN.md](DESIGN.md). This file says *which piece* to use. Started
October 8, 2026 from a scan of the studio. Source-audited October 19, 2026; components added that week recorded October 20; the older computed-style measurements below have not been remeasured in a browser.

## Use this for that

| Job | Use | Where it lives | Notes |
|---|---|---|---|
| A big card for an exercise, lesson, tool or feature (home, Exercises, Learn) | **Preview card** | `.preview-card` in `home-preview-cards.css`, grid in `components/preview-grid.css`, built in `HomePreviewCards.tsx` / `LearnPreviews.tsx` | Tinted stage with an animated demo on top, words below. Lifts on hover. The only card that lifts. |
| A summary of your practice on Home (Today, Working on, Tricky bits, This week) | **Studio cards** | `HomeStudioCards.tsx` + `home-studio-cards.css`; the Today card is `HomeTodayCard.tsx` | Preview cards with a neutral grey top; only cards with real data appear. Colour only where it means something (list dot, green practice time, sand deadline). Today stacks rows that each appear only with something real: Where you left off, Working on (piece chips), Coming up, Warm-up today (one saved set by rotation), Routine progress. |
| A white card for a piece or item in a list (Working on, tricky bits, lists) | **Item card** | `.working-card` in `practice/practice-page.css` | White, radius 18, inset-like 1px shadow `#ececef`, no lift. Current source: title 15px / 650, meta grey; see the historical target below. Should move to `components/` (see below). |
| A panel that groups controls or data (Today's practice, calendar, pitch map) | **Practice card** | `.practice-card` (`practice/practice-page.css`, studio card tokens in `studio-card-tokens.css`) | White, card shadow, no border. |
| A row in a long list (Library, saved music) | **Music row** | `MusicRow.tsx` + `music-row.css`, art from `StudioRowArt.tsx` | DESIGN.md "List row". |
| What kind of piece it is (Excerpt, Etude, Exercise, genres) | **Tag pill** | `components/tag-pill.css`, colour from `lib/tagTone.ts` | Tinted pill, words only. Never a new colour map. |
| A piece you can open, listed inside something (a deadline's pieces, Home's Today card) | **Piece chip** | `components/piece-chip.css` | White, hairline, the piece's status dot (same as the lists). Not a tag pill: tags describe, chips go somewhere. |
| Which list a piece is on (Want to learn, Working on, Learned) | **Status dot** + **StatusButton** | `components/StatusButton.tsx`, `status-button.css`, tones in `lib/musicStatus.ts` | A dot, not a pill. The button is how anything goes on a list. |
| A date or deadline label ("in 12 days") | **Tag pill**, `data-tone="sand"` | `tag-pill.css` | Same pill shape as tags. |
| Labeled tools in the reader toolbar (Mark up, Listen, Scales, Tempos, View) | **Fixed-width tool** | last block of `studio-shell.css` | 46px each so icons sit at even intervals. Only the tempo controls get a grey pill; page controls stay plain (tried as a pill, rejected: read as another adjustable tool). |
| An excerpt's tempo and tally | **ExcerptTempoMark** | `components/ExcerptTempoMark.tsx` | TempoPill + RepPill, one pair per passage tab, above the music in both PDF (outside the page, so Draw marks never shift) and XML (ScoreViewer `paperTop`, top-left beside the title). Same tally key in both views. View settings "Practice tempo" shows/hides it. |
| A tempo you can play, nudge and set | **TempoPill** | `components/TempoPill.tsx` + `tempo-pill.css` | Metronome tap, −, the number, +. `size` small (pinned on a score by `ScoreTempoMarks`, or above the first selected bar by the reader's "Tempo and count" pin with a RepPill and a CloseButton, `.passage-practice-mark`) or large (inline, tricky bits). Blue so it never reads as printed. `history` (its RepPill key) adds a small trend button once two days are recorded. |
| Work a passage up to a target tempo | **Tempo ladder** | `components/TempoLadder.tsx` + `tempo-ladder.css`, state in ScoreViewer | From the bar-selection pill (stairs icon): a ReaderPopover with From and Target (small Steppers, no TempoPills: nothing plays there), the step (+1, +2, +5, +10) and a plain grey Start; one size, 14 / 600. Then a card over the passage (under it on the first line), draggable by any empty part (grip on top): a line from From to the marked Target cut into steps, Cookie at the current tempo, then step back, RepPill, step up, and a CloseButton. Nothing advances by itself. Reps and each step up go to tempo history (tricky bit key when the bars are one). |
| A tempo over the weeks | **TempoTrend** | `components/TempoTrend.tsx` + `tempo-trend.css`, data in `lib/tempoHistory.ts` | One blue line, a dot per practised day, first and latest numbers; no axes. `TempoHistoryButton` (in TempoPill), `TempoTrendSection` (reader tempo ▾ menu), `small` for My Studio's "Getting faster" rows. Recorded by itself: a counted rep, or 30 s of Listen or click track; one entry a day, the highest. |
| Floating controls next to what they act on (bar selection, clock controls) | **Soft pill** | `.range-bar` in `components/passage-guide.css` (dot grip `.range-bar__grip` drags it aside; resets on a new selection); clock version `.practice-today__actions` | White, hairline border `#d4d5da`, small shadow, round 34 to 38px icon buttons (the bar-selection pill drops to 28px with a mouse, so it covers less music), tooltips name them. See memory "soft pill style". |
| A button with a word that starts, saves or adds something (Start, Add to my routine, Keep offline) | **Plain grey action button** | DESIGN.md "Buttons" | `#f1f1f2` / `#45464f`, hover `#e8e8ea`, 10 to 12px corners, 13 to 15px / 600, optional 18px icon in front. No shared class yet: copy the nearest one and list it under "Not reused yet" item 5. Never dark, never green. |
| A selected tab or filter chip | **Filter chip** | DESIGN.md "Filter/category tabs" | The only place dark `#292a33` fills are allowed. The Library no longer uses it (see Tag chips). |
| Switch between passages of one excerpt piece | **Filter chip** (passage tabs) | `.excerpt-passages` in `music/excerpt-reader.css` | Same recipe as the Library chips, restated there because the reader doesn't load `library.css`. |
| Close a panel, dialog, sheet or toolbar | **CloseButton** | `components/CloseButton.tsx` + `close-button.css` | Plain dark × (the Mark Up icon), no fill, no hover change, no tooltip. Pass `className` only for placement. Used by every close in the studio. |
| Remove something (a step, a session, a saved set, a piece from a list) | **Trash** | `PracticeIcon name="delete"` | Grey, ink `#292a33` on hover, red only on the armed second tap ("Tap again to delete"), visible on touch. Never ×. |
| Fold and unfold a section | **Chevron** | `ChevronIcon` in `components/HeaderIcons.tsx` | Rotates 180° when open. Never a typed ⌄ or ›. Prefer not folding at all: a long section shows its first row and a "Show all N" text action (My Studio); folded headings alone looked dead. |
| Tool and reference category art (fingering, trill, breathing, tuner) | **ResourceIcon** | `components/ResourceIcon.tsx` | Shared 24px subject icons for Resources and tool previews; use HeaderIcons / PracticeIcon for toolbar actions. |
| Choose a pitch in the fingering or trill chart | **NotePicker / PitchName / StepButton** | `fingerings/NotePicker.tsx`, styles in `fingerings/fingerings.css` | Shared octave View switch and note buttons, with `aria-pressed`; the caller supplies available pitches and selection. `nearestSameName` keeps the note name when the octave changes. Load the shared chart stylesheet. Inherits chart typography. |
| The engraved note beside a fingering or trill diagram | **Chart staff** | `.chart-staff` in `fingerings/fingerings.css`, sized by `staffBoxStyle(highestStep)` and `staffStep(pitch)` from `fingerings/NotePicker.tsx` | Box as tall as the highest note of the shown octave needs, so stepping through one octave never moves anything. The note itself is EngravedNote. |
| Resume score following after browsing | **ResumeFollowingPill** | `components/useScoreFollow.tsx`, `reader-workspace.css` | Used by ScoreViewer with the hook's direction and resume callback. Do not add another scroll timer. |
| Header and toolbar icons | **HeaderIcons / PracticeIcon** | `components/HeaderIcons.tsx`, `components/PracticeIcon.tsx` | 20px box, 1.7 stroke, round caps. Don't draw new inline SVGs for an icon that exists. |
| Back to the previous page | **BackChevron** | `components/BackChevron.tsx`, `back-button.css` | |
| Previous and next through a set (book pieces, pages, tricky bits) | **Book stepper** | `.book-stepper` (`music/books/book.css`) | ‹ 1 / 15 ›. These arrows are controls and stay. |
| A run through several pieces in order (mock audition) | **Mock audition run** | `practice/mock/page.tsx` + `mock-audition.css`, data in `lib/mockAuditions.ts` | Setup (how many, pause, record), a numbered running order, each excerpt in the normal reader with a "next up" screen between, and an end list with times. The reader header holds a Book stepper (`.mock-stepper`) whose record button shows the run's one take; playback is RecordingPlayback. |
| A dialog over the page (edit a deadline, practise a tricky bit) | **Dialog** | `components/Dialog.tsx` + `dialog.css` | Backdrop, white panel, a title row ending in CloseButton, Escape closes, a bottom sheet on phones. `width` medium (forms) or wide (music). Contents style themselves. Current shell does not manage focus trapping or restoration; callers must handle that until the shared shell does. |
| A menu or panel that opens from a button | **ReaderPopover** | `components/ReaderPopover.tsx` | Anchored to its button. |
| Extra choices for one reader tool (Metronome, Drone) | **Tool ▾ menu** | a ReaderPopover with `<ChevronIcon/>` as trigger, right after the tool button (`.metronome-options`, `.drone-options`) | The ▾ joins its tool as one tile: same grey or purple behind both, square inner corners, hover only darkens icons. Choices are `.reader-choice` rows; remembered per piece. |
| SubdivisionIcon | **SubdivisionIcon** | `components/SubdivisionIcon.tsx` | Quarter, two eighths, a triplet, four sixteenths drawn with the scale-notation glyphs; used in the metronome ▾ menu. |
| Listen back to a local recording | **RecordingPlayback** | `components/RecordingPlayback.tsx`, `practice-recorder.css` | Shared play/pause icons, seek slider, 12px tabular time, hidden native audio. Pass the measured recording duration for blobs without metadata. |
| Move a piece to another key | **Key control** | `keyControls` in `components/ScoreViewer.tsx` (View panel, when `config.transposable`), logic in `lib/transpose.ts`, styles `.reader-key` in `reader-workspace.css` | Half-step arrows around the key name with the move under it, then an Octave lower / As written / Octave higher choice, and "Original key" as a text action. Warns in one sentence when the moved piece leaves the flute's range, with a one-tap octave fix. The XML is rewritten before OSMD reads it, so everything downstream follows. |
| Keep a piece or book on this device for no Wi-Fi | **OfflineButton / OfflineBadge** | `components/OfflineButton.tsx` + `offline.css`; the per-device list is `transfer/OfflineMusicCard.tsx` | `icon` in the reader header (tick in the purple on tint once kept), `label` as a word button on a book page, the badge as a small grey mark after a Library title. Removing a kept copy only works online. |
| A short message in the reader (drone tip, a reader notice, the recorder's mic message) | **Notice pill** | `.drone-hint` in `reader-workspace.css`, placed by ScoreViewer's `--reader-notice-top` | White pill, 13px grey, fades after 2.5s, no ×. Always just under the toolbar, above the sheet, so it never covers music. One place for every reader notice. |
| The browser refused the microphone (or has none) | **MicBlocked** | `components/MicBlocked.tsx` | One plain sentence saying where the switch is. Recorder: shown in the Notice pill. Pitch, tendency test, tuner: in that spot's own status line. No title, colour, box or Try again: pressing Mic/Listen/Record again retries. |
| A View-panel shortcut that opens another page (Scales in this piece) | **Practice tools tile** | `.reader-display-options .tool` in ScoreViewer's View panel, under "Practice tools" | Same tile as "Show on the page" (icon over word), never shows "on". Not a green text link: a lone link line looked unfinished. |
| A practice exercise in the close-up (Technique) | **Exercise card** | `.passage-guide__card` in `components/passage-guide.css` | White bordered card, as wide as its music, wrapping with the others and stretching to fill the row. Music centred on top; name (plus Scale Studio › or Shuffle) and Listen under it. No section headings. |
| Tap results under close-up notes (Rhythm) | **RhythmMarks** | `components/RhythmTap.tsx` | The theory lessons' tap line (dots-and-ties .dt-*): counts on one line under the lowest dynamic, grey ruler + grey dot per note start, green/red taps, dashed link early/late to its note. Purple `.practice-position` line while tapping. |
| A practice game screen (rhythm drills) | **RhythmGame layout** | `rhythm-drills/RhythmGame.tsx` + `rhythm-drills.css`; card demo `RhythmDrillsPreview.tsx` | Reuses lesson 7's staff and tap marks (EngravedRow, `dots-and-ties.css`) and the close-up's RhythmTap pad; this file only lays them out: page title, one quiet stats row (level, streak, tempo, lives), the staff, the pad, plain grey actions. Copy this layout for the next game rather than a new skin. |
| An interactive theory lesson | **LessonFrame** | `theory/LessonFrame.tsx` | Shared timeline, narration, Cookie, progress and fixed Next. Reuse lesson control styles. |
| Engraved lesson music, including rests | **EngravedRow / RowGraphics** | `theory/EngravedRow.tsx` | `proportional` spaces notes exactly by time so each sits on its count (lesson 7 only; printed music is not spaced this way). `RowNote.rest` preserves elapsed duration; `measureRest` centers a full-measure rest. RestGlyph uses the same VexFlow font as RhythmNote. |
| Match note and rest lengths by drawing or tapping | **RestMatch** | `theory/rests/RestMatch.tsx` | Two rows from RowGraphics; pointer and keyboard alternatives; shared lesson typography. |
| Progress through a short set (lesson steps, exercise rounds) | **Progress dots** | `theory/ProgressDots.tsx` | Dots, never "2 of 6" in words. |
| Tap a passage's rhythm yourself (close-up Rhythm mode) | **RhythmTap** | `components/RhythmTap.tsx`, styles in `passage-guide.css` | Click choice (every beat, first beat, none), Start, a wide pad (any key or any finger). Answer marks only after grading; per-note grading (`gradePassage`). |
| A tooltip | **has-tip** | `class="has-tip" data-tip="…"` | Icon-only buttons only. Not on close buttons, not where it can overflow the window edge. Mouse only: hidden on touch screens (one rule at the end of `studio-shell.css`). |
| A hover label on the music itself (a note's count while beat sticks are on) | **beat-tip** | `.beat-tip` in `viewer-fixes.css`, rendered by ScoreViewer | Same small dark look as has-tip, above the notehead, hover only (a click on a note never opens it). |
| A quiet housekeeping action (restore defaults, reset a view) | **Text action** | `.text-action` in `studio-shared.css` | Grey words, no border, no fill, darker on hover. The reader's and Scale Studio's "Reset" (`.reader-settings-reset`, a grey pill) should move to it. |
| Counting today's repetitions of a skill (a scale, an exercise) | **RepPill** | `components/RepPill.tsx` + `rep-pill.css`, data in `lib/repLog.ts` | Sits beside its TempoPill and is built the same way, in pink: tally mark, −, the number (type to set it), +. Fixed width. Counts per day; the My Studio day panel and "Most practised" add them up. Used by Scale Studio's tempo marks. |
| The hard passages you're working on, across pieces (My Studio) | **PassagesList** | `practice/PassagesList.tsx`, styles `.passages` in `practice/practice-page.css` | The Routine's checklist rows: the circle marks it done (moves to a folded Done group, kept), piece over bars and tempo, a small TempoTrend once there are two days, Trash that asks once. Links come from `bitHref` in `lib/trickyBits.ts`: the piece at those bars, selected, close-up open. |
| Counting a passage's repetitions over weeks | **Rep ladder** (inside `tricky-bits/BitPractice.tsx`) | `tricky-bits/` | One row per tempo, running total kept forever; also logs to `lib/repLog.ts` for the day report. |
| Change a number one step at a time (beats, octave, meter, a note, minutes) | **Stepper** | `components/Stepper.tsx` + `stepper.css` | −, value, + on action grey. `size` medium 36px or small 28px; `tone="text"` for a worded value ("Octave 4"). Hold to repeat (speeds up), arrow keys and Home/End on the value (one tab stop, `role=spinbutton`), 44px touch targets. `onChange` with `min`/`max`, or `onStep` for a list (`wrap` goes round). The end that can't go further is disabled. `className` for width only. Not for tempo (TempoPill) or reps (RepPill). Used by Breathing Lab, the tools panel (tempo, drone and fingering octave, meter) and the tendency test. |
| A volume or other 0 to 1 amount | **Volume slider** | `.tp-volume` in `tools-panel.css`, `Volume` in `PracticeToolDock.tsx` | Label left, native range right, `accent-color` selected purple `#6d4585`. Added October 21, 2026 for the metronome's beat and accent volumes. Move to `components/` if a second place needs one. |
| How the tools sound (click, accent, drone voice, concert A) | **Tool sounds** | `lib/toolSounds.ts` (store, `cookie:tool-sounds:v1`), `lib/useToolSounds.ts`, `components/clickSounds.ts`, `components/sampledDrone.ts` | One studio-wide setting. Always book clicks with `bookClick`/`bookTick` and drones with `droneVoice`, and get pitch from `lib/pitch.ts` / `pitchFrequency`, so the choice and the A reach every page. Never hard-code 440. |
| The rounds of a changing breathing pattern | **Round strip** | `breathing/Sequence.tsx`, `.bl-sequence` in `breathing/breathing-lab.css` | One row of eight cells, in count over out count; the current round in purple `#eee7f2` / `#79588e` with a 3px bar filling as the breath goes by, finished rounds keep a grey bar. A row, never a list, so the phone does not scroll. Also drawn in the home Breathing Lab card (sized up there). |
| A first routine for someone who has none | **Starter routine** | `exercises/StarterRoutine.tsx`, store in `exercises/starter-routine.ts` (`useStarterOffer`, `addStarterRoutine`, `dismissStarter`) | Shown on the Exercises hub in the saved sets' spot (same rows) and on Home in the Today card's spot, only while there are no saved sets and it was not dismissed. Add saves an ordinary Scale Studio set and puts its steps on the Routine; Not now hides it for good. |
| Tapping a rhythm in a lesson (the thing you press on each note) | **Cookie at the tap spot** | `LessonFrame` prop `cookieAway` + the spot in `theory/dots-and-ties/RhythmPractice.tsx` (`.dt-tap-spot`) | The guide Cookie hops from the bubble to the tap spot (none with reduced motion) and says "Tap on me!". The whole spot (320 by 104, 84 high on phones) is the target; Cookie is only the picture and squishes on each tap, Space included; it looks happy after a clean attempt and goes "hmm" (`.is-unsure` in `cookie-button.css`) otherwise. No hover box. Its place by the bubble keeps its width, so nothing moves. Used by lesson 7; lessons 2, 3 and 6 still tap on a second CookieButton (see "Not reused yet").
| Tally marks | **TallySticks** | `components/TallySticks.tsx` + `tally-sticks.css` | Four upright, the fifth across. |
| Reference lists you dip into (Want to learn, Learned, Recently opened) | **List stacks** | `.list-stacks` in `practice/practice-page.css` (My Studio) | A row of piles: the top card shows, two edges peek out when there is more; the title links to the full list; tapping the pile opens its cards in a grid below, animated with view transitions (no animation where unsupported or with reduced motion). Not for what you practise from (Working on, Tricky bits stay open). |
| Two or more ways to show one thing (Cards / Continuous, List / Shelf / Timeline, Breathing Lab's Cycle / Flower / Body / Embouchure) | **View switch** | `.view-switch` in `studio-shared.css` | Grey track, chosen one white with a hairline, `aria-pressed`. Words only, no glyphs. On a tinted stage it sits below the stage, on white, so the track stays visible. |
| Search a page's list | **Library search** | `.library-find` in `music/library.css` | A short capsule (max 320px) in the view switch's grey track `#f1f1f4`, no border, hairline ring on focus. Sits on one row with the view switch. Move to `studio-shared.css` when a second page needs it. |
| Narrow a list by tag | **Tag chips** | `.library-tag` in `music/library.css` | Quiet at rest: a 7px tone dot and the word on nothing, grey hover. Chosen: the tag's own tint (tag-pill pairs). No All chip: tap the chosen one again to clear. One wrapping row; one sideways-scrolling line on phones. Replaced the Library's old filled chips with the dark All. |
| Your lists as a board (Want to learn, Working on, Learned) | **Music shelf** | `music/MusicShelf.tsx` + `music/music-shelf.css` | Three grey `#f5f5f7` columns of white item cards (title, composer, one tag as dot and word, a book's done bar). Moved by the card's StatusButton (dot only), or dragged on wide screens. Arriving on Learned: sage wash and a tick; none with reduced motion. Phones: one column at a time, swiped, the next peeking. |
| A composer's dates, nationality and period as one line | **composerFacts** | `music/ComposerTimeline.tsx` | "1685 to 1750 · German · Baroque", Chinese words mapped. The timeline's composer card (a Dialog) uses it; the reader's StoryCard in ScoreViewer still builds its own English-only line and should switch to it. |
| The Library as a timeline of composers | **ComposerTimeline** | `music/ComposerTimeline.tsx` + `music/composer-timeline.css` | Life bars across the centuries, pieces as dots at the year written, over period bands in the roadmap tints. Only composers with a birth year in `content/composers.json` get a row; the rest stay in the List. The name opens the composer card in the shared Dialog. Phones scroll it sideways inside its own box. |
| A link in running text or under a card | **Text link** | DESIGN.md / memory "no underlined links" | Green `#46633d`, 600, no underline, **no trailing ›**. |
| A page's section heading | **Section heading** | `.home-preview__group` | One heading style per page level. |
| The small label inside a card or panel ("WORKING ON", "THIS WEEK", "TRICKY BITS") | **Card label** | to be added as `.card-label` in `studio-shared.css` | 11px, 600, capitals, letter-spacing .06em, grey `#85868e`, optional status dot in front. Gives a card three levels: label, title, meta. Only inside cards and panels, never as a page or section heading (those stay sentence case). Any other capitals in the studio are one-offs to convert or remove. |

## Text sizes by component (measured October 8, 2026)

Size / weight as the browser actually renders them (computed style, not the CSS, which has override layers). Use the
"Target" column for anything new; rows marked **mismatch** are where the same job renders differently today.

| Text | Where measured | Renders as | Target |
|---|---|---|---|
| Page title | every tab (`h1`) | 42 / 780 | 42 / 780 |
| Section heading | `.home-preview__group`, every page | 20 / 650 | 20 / 650 (chosen October 8) |
| Card label | Home shelf labels, rail captions, dock titles (all slightly different today) | | 11 / 600 capitals, grey (decided October 9) |
| Big card title | preview cards: Home 16 / 600, tab-page grids 15 / 600 | | 16 / 600; 15 / 600 in the smaller tab-page grid |
| Item card title | My Studio `.working-card` | 16 / 600 | 16 / 600 |
| List row title | Library rows | 16 / 600 | 16 / 600 |
| Meta line under a title | item cards, Library rows | 13 / 400 | 13 / 400, grey `#85868e` |
| List or checklist item | Routine | 15 / 400 | 15 / 400 |
| Panel heading inside a card | Today's practice, Routine | 16 / 600 | 16 / 600 |
| Text link | "+ Deadline", "Take the pitch test" | 14 / 600 | 14 / 600, green `#46633d` |
| Tag pill | everywhere | 12 / 560 | 12 / 560 |
| Count beside a heading | Routine "0 of 4" 14 / 400 | | 14 / 400 grey |
| Studio nav tab | top bar | 14 / 500 | 14 / 500 |
| Toolbar icon label (word under an icon) | reader header tools | 10.5 / 500 | 10.5 / 500 |
| Tempo number | Scale Studio tempo mark 15 / 500 tabular; tricky bit chip 14 / 600; dock `.tp-chip` 13 / 600; dock stepper 16 / 400 | **mismatch** (four ways) | 15 / 500 tabular, from the tempo mark |
| Big number | My Studio clock 30 / 450; stats row 22 / 600 | | Clock 30 / 450; stats 22 / 600 |

**Weights in use:** 400 (text), 500 (labels, numbers), 600 (titles, links), 650 to 780 (headings only). Avoid new
in-between weights (560, 680, 720); move toward 400 / 500 / 600 / 700.

## Colour, underline and hover: what the studio does today (audit, October 8, 2026)

Facts from a scan, not settled rules yet. Use them so new work matches what exists.

**Green** (`#46633d`, `#40553d`, `#678956` and near-greens) is the oldest accent, in about 25 stylesheets. Its jobs
today: text links, "done / correct" (ticked routine steps, lesson answers), active and selected states in the tools
dock and Breathing Lab, soft tint buttons. Heaviest in `reader-workspace.css`, `practice/practice-page.css`,
`practice-tool-dock.css`, `passage-guide.css`.

**Purple** (`#79588e`, `#eee7f2`, `#62567a` and family) is newer, in about 11 stylesheets. Its jobs today: what is
playing or active in the reader (the playback cursor, the measure selection, the tricky bit tempo chip), selected chips
in Scale Studio's settings (`studio-shell.css` has the most), the lavender "Classical" tag. That is why Scale Studio and
the reader read purple and the rest reads green.

**Decided October 8: purple = selected, green = links and done.** Purple marks what is chosen or active right now
(selected bars, the playing note, the chosen tempo, a selected option). Green marks text links and finished things
(ticked steps, correct answers, learned). Tag tints (lavender "Classical" and so on) are a separate palette and stay.
Most purple already means "selected". Still to convert: green used for *selected* states in the tools dock and
Breathing Lab (`practice-tool-dock.css`, `breathing/breathing-lab.css`), and the dark `#292a33` selected chips in
Scale Studio's settings (`studio-shell.css`), once we decide whether selected chips go purple too.

**Underlines:** links are never underlined. The hover underlines that were left (tools dock fingering link, Home shelf
link, fingering alternatives, long-tone report, My Studio empty-state links, the studio page back link) were removed
October 8. Two deliberate underlines stay: the reader's tappable music terms and Scale Studio's breadcrumb
(`.scale-book__crumb`, grey, never green), plus a focus-visible underline on Scale Studio's section titles for keyboards.

**Hover and press, by kind:**

| Kind | Hover | Notes |
|---|---|---|
| Preview card (tinted stage) | lifts 3px + deeper shadow | Every page now. Exercises and Learn didn't lift until October 8: a blanket rule in `viewer-fixes.css` (`.exercise-hub a{transform:none!important}`, the wrapper both pages share) cancelled it; it now skips `.preview-card`. Theory lessons were outside that wrapper, which is why they lifted. |
| Item card (white) | border darkens, no lift | |
| List row | background tint | DESIGN.md "List row". |
| Icon button | grey circle `#f1f1f4` | |
| Close | nothing | CloseButton. |
| Text link | colour only | |
| Any button, pressed | **no feedback** | `viewer-fixes.css:59` sets `transform:none!important` on every `.studio-route button`, which also cancels the `scale(.98)` press in `studio-shared` for buttons. Links still get it. Decide whether buttons should press too. |

## Not reused yet (source audit, October 19, 2026)

Fix these by pointing them at the component above, not by restyling them in place. Highest value first.

1. **Tempo is still drawn two other ways.** Scale Studio, tricky bits and Breathing Lab use `TempoPill`. Left: the tools
   panel metronome (a medium `Stepper` beside a `.tp-chip` Tap, `PracticeToolDock.tsx`) and the reader toolbar's grey
   tempo box (`.tempo-step` / `.tempo-field`). On October 25 Haylie tried the blue TempoPill in the toolbar and chose to
   keep the grey box there; its − / + and chevron share one hover (darken only) and the chevron matches their weight.
2. **Roadmap detail is its own dialog.** `roadmap/page.tsx:78` (`.roadmap-detail`, tinted by region) still has its own backdrop and panel. A future move onto `Dialog` must preserve the roadmap's focus handling; the shared shell currently only handles Escape and backdrop dismissal. Tricky bit and Deadline dialogs already use `Dialog`.
3. **Legacy list-dot CSS.** `.continue-dot` remains in `home-preview-cards.css:195`, but no TSX consumer was found and `ContinuePracticingCard.tsx` / `HomeStudioBrief.tsx` no longer exist. This is a CSS cleanup candidate, not two live components to migrate. Keep `.status-dot` for list status; check rendered pages before deleting old styles.
4. **Item cards live in the My Studio page CSS.** `.working-card` is the right look for a white item card but sits in
   `practice/practice-page.css:424`. Move it to `components/` (an `ItemCard`) so tricky bits, deadlines and lists elsewhere
   can use it. `.tricky-card` and `.tricky-preview-card` are the next candidates to fold in.
5. **Plain grey action button, six copies.** The look is settled (DESIGN.md "Buttons") but each page restates it:
   `.emb-action` (`embouchure/workbench.css:90`), `.bl-start` (`breathing/breathing-lab.css`), `.rd-button`
   (`rhythm-drills/rhythm-drills.css:13`), `.mock-button` (`practice/mock/mock-audition.css:36`), `.offline-label`
   (`components/offline.css:11`) and `.starter-routine__add` (`exercises/exercises.css`). Heights (34 to 44px), radius
   (10 or 12px) and weight (500 or 600) drift between them. Make one `.action-button` in `studio-shared.css` with a
   size modifier and point these at it.
6. **The Key control's arrows.** `.reader-key__stepper` (`reader-workspace.css:1070`) is a third − / + design: icon
   arrows around a two-line value (key name over the move). Its two-line value is why it isn't a `Stepper`; either give
   Stepper a two-line `display` or keep this and say so here.
7. **Green "on" chips in the tools panel.** `.tp-chip.is-on` (`tools-panel.css:72`, Accent) is green for a selected
   state; purple is the selected colour. Also the accompaniment file's trash turns red on hover
   (`studio-shell.css:818`); trash hover is ink.

8. **Rhythm tapping on a second Cookie.** `rhythm/RhythmLesson.tsx` (hold step), `measures/MeasuresLesson.tsx` (page 7) and
   `rests/RestsLesson.tsx` (step 1) tap on `CookieButton` while the guide Cookie is also on screen; lesson 2's tap step uses a 👏
   `.rhythm-clap`. The user found two cookies confusing in lesson 7, where the guide Cookie now moves to the tap spot (`cookieAway`). The
   user is still deciding whether these lessons follow; do not switch them yet (lesson 2's hold step needs press-and-hold).

## Audit limits and unresolved rules (October 19, 2026)

This pass checks source and reuse, not computed styles, touch behavior or accessibility acceptance.
The October 8 measurement tables are historical evidence, not current browser measurements.

- `.card-label` remains a proposal: no matching shared selector or TSX consumer was found. Do not assume the row above describes an available class.
- The current `.working-card b` rule is 15px / 650 in `practice/practice-page.css:428`; the earlier 16px / 600 target is a design discrepancy, not a completed migration.
- DESIGN.md's typography table says section titles are 24px / 700, while this document's later target and `.home-preview__group` source are 20px / 650. Use the existing component when adding a section; resolve the document conflict before a broad typography pass.
- DESIGN.md says cards have no borders in its Color table but describes a bordered dashboard card later. Item cards currently use a 1px shadow outline, and tricky-bit cards still have a border. Do not flatten these differences under the label of an audit.
- The close-button implementation is shared, but the catalog's “used by every close” is an intention rather than an exhaustive accessibility claim. Dialog focus behavior still needs a separate check.
- Selection colour is purple and the action button is plain grey (both recorded in DESIGN.md); what is unresolved is folding the copies into shared classes (items 5 and 7 above). This audit does not change mascot interactions or approve a global restyle.

## Keeping this current

- Adding a component: add a row above, in the same session.
- Finding a one-off: add it to "Not reused yet" with the file and line, even if you don't fix it now.
- Fixing one: delete its entry.

Theory interaction rules and component usage: [theory/COMPONENTS.md](theory/COMPONENTS.md). `rests/SplitSpan.tsx` provides accessible duration splitting by cut gesture, tap, or keyboard.

Theory rhythm practice: `theory/dots-and-ties/RhythmPractice.tsx` provides count-in, the Cookie tap spot and onset feedback. `EngravedRow` owns ties and tuplet engraving as well. See the theory interaction contract for timing and completion rules.

### Count-in for rhythm activities
Use `components/CountInPulse.tsx` for reader, metronome, and theory tapping count-ins. Pass the zero-based beat from the audio clock, the count length, and optional group accents. The blue current pulse and completed dots match the reader. Set `active={false}` to reserve its space without showing it. Do not create another “Get ready” counter or run a separate animation timer.

- **ScaleTemposPanel** (components/ScaleTemposPanel.tsx): shared Tempos popover for Scale Studio and Cookie’s Scale Routine. Reuses the same playback, metronome, BPM editing, and page-tempo visibility controls.

The tools-panel tempo uses `Stepper` with `editable`, `liveValue={liveTempo}`, and `LIVE_TEMPO_DELAY`, sharing TempoPill’s draft/blur behavior. Its meter uses a native select with the existing chip appearance and ChevronIcon, like the native selects in Scale Studio. Keep its width fixed across signatures; beat dots stay outside More.

The tools-panel tuner starts listening when its main view opens and releases the microphone when closed or switched to fingering. Keep Retry only for microphone errors; no separate Listen control. The compact view omits instructional paragraphs.

Tools-panel secondary labels (status, More, octave) share 13px/500 text. Each More action aligns right; metronome dots share its footer row. Active drones appear below the note grid as existing green chips, each removable by pitch and octave, with Stop all in the footer.
