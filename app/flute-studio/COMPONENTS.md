# Cookie Flute Studio: which component to use

**Reuse before you build.** If something means the same thing as something elsewhere in the studio, it uses the same
component, so changing that component changes it everywhere. Find the job below and use what is listed. If nothing
fits, add a row here in the same change. Values (colours, sizes) live in [DESIGN.md](DESIGN.md).

Rewritten November 16, 2026. The rules come first because most rework has come from breaking one of them, not from
picking the wrong component. Older measurement tables and audits were removed; they are in git history.

## The rules

### 1. Shape says what a thing is

| What it is | Shape | Examples |
|---|---|---|
| Holds information (a tile, card, panel, list, calendar day) | **Square**, radius 3 | Home tiles, insight tiles, item cards, Breathing Lab presets and stage, the tuner box |
| Something you press to do a thing (a button, a stepper, a note key) | **Soft rounded**, radius 10 to 12 | Start, Copy code, the Stepper, tools panel keys and chips, the rhythm tap pad (slate fill, no outline, lilac while live) |
| Choose one of a few, or a status | **Round capsule** | View switch, list status pills, tag filter chips |
| Floats over the music | **Round** soft pill | Bar selection pill, tempo and rep pills |

Do not square everything. Squaring buttons and steppers was tried on November 16 and rejected the same day ("this
Start button is even a square, that's just really weird").

### 2. No boxes inside boxes

A tinted tile does not contain white chips or white cards. Inside a tile, content sits directly on the tint. If a
group needs its own items, make it a list of rows on the page (the Exercise book row), not chips in a tinted box.
Rejected Nov 16: the Technique map as tinted regions full of white chips.

### 3. One list row everywhere

Library rows, a book's numbers and the Technique map are the same row: 60px, title 16 / 600 on a 20px line, one grey
13px line 4px under it, `#ececef` hairlines, the trailing control flush with the hairline's end, one left edge shared
with the page title. If two lists look different, one of them is wrong.

### 4. Lines are the last resort

Group with space first. No vertical dividers between toolbar groups, no rule under a toolbar and another above the
panel below it. Hairlines belong between rows of a list, nowhere else. (The pitch bar lost its dividers Nov 16.)

### 5. Colour

- **Fills:** the home tints only. Slate `#edf1f5` (also every control fill), green `#eef4ec`, pink `#faf0f6`, lilac
  `#f2eef8`, sand `#f7f1e6`. Never a neutral grey, never cream.
- **Selected or happening now:** purple (`#eee7f2` / `#79588e`; on a control `#f1e5f5` / `#6d4585`). Not green, and
  not a black fill. Dark `#292a33` fills are allowed only on a selected tab chip, and prefer the View switch.
- **Done:** green tick (`#46633d`). Green is not a button colour and not a link colour.
- **Links:** ink `#292a33`, 600, no underline, no trailing ›, no colour change on hover.
- **State is a fill, never a ring or border** (today in the calendar, a chosen day, an "on" chip).

### 6. Hover

| Kind | Hover |
|---|---|
| Control with a fill | one step darker, `#e2e8ef` |
| Icon button | slate circle or square behind it |
| Close × | nothing |
| Trash | grey to ink |
| List row | **No hover. A press flash:** while held, the row's words drop to 55% and ease back on release (one rule at the end of `studio-shared.css`). Chosen Nov 16 as option C while she was away; A (arrow after the title) and B (words slide right) were the other two shown. Rejected as hovers: grey band, green title, darker hairlines |
| Home tile | none (flat, no lift) |

### 7. Compact

Tiles pad 10 12 12. Section headings sit 26px under the section above and 8 to 10px over their content. Panels in
one row are the same height (`align-items: stretch`). If a page scrolls because of padding, the padding is wrong.

### 8. Where controls sit

A delete or other row action sits right after the row's words, not at the far right edge of the page ("never a good
design", Nov 16). The far right is for a status or a tick that every row has.

### 9. Page headers

Every page title is 28 / 700, starting at the same left edge and height. A page reached from another page uses
DetailHeader (small back line above the title, one grey meta line under it).

## Use this for that

| Job | Use | Where it lives | Notes |
|---|---|---|---|
| A big card for an exercise, lesson, tool or feature (home, Exercises, Learn) | **Preview card** | `.preview-card` in `home-preview-cards.css`, grid in `components/preview-grid.css`, built in `HomePreviewCards.tsx` / `LearnPreviews.tsx` | Tinted stage with an animated demo on top, words below. Lifts on hover. The only card that lifts. |
| The Practice row on Home (Scale Studio, Long tones, Browse music, Breathing Lab) | **Practice tile** | `.practice-tiles` + `.practice-tile__fit` at the end of `home-preview-cards.css`, markup in `HomePreviewCards.tsx` | Nov 12. A preview card reshaped into one part: the tint fills the tile, the name (15 / 600) sits top left, no subtitle, the demo drawn at its 340 x 172 stage and scaled by `--tile-fit` (0.78; 0.5 on phones) and `--demo-fit` per demo; captions hidden; the name sits on its own line above the demo, never over it. Fixed stage heights: Home Practice 140, Learn and Tools 80; the Exercises, Learn and Tools tab pages all use the Home Practice tile (140). Home Learn is names only, five across, no demos. Breathing Lab is one breath drawn as a thin curve (in 4, out 6) with a moving dot, in the same fit box and padding as Long tones; not the ring. The Theory lessons index (`theory-home.css`, end) uses the same tile: name on top with two lines of room so every card is one size, drawing below, Completed as a small square badge at the drawing's bottom left. Browse music shows the opening of the Badinerie engraved (TrickyPreview, `MUSIC_SAMPLE`), the whole tile opens the Library, no chips. All Practice demos are drawn in ink (end of home-preview-cards.css): black lines, no colour or white boxes; Long tones and Breathing lines both 3px non-scaling so they weigh the same. Radius 3, no shadow, no lift. Every row four across from 761px up, two across on phones. Learn demos are in ink with no note names (end of `home-preview-cards.css`, Nov 12): Theory is three lines of printed expression words (italic serif, dynamics bold italic); Fingering and Trill are the diagram alone; Body & embouchure is the register slider with low and high; Rhythm drills is the bar with ink tap marks, no counts; Roadmap dots are black. Tools are a section of the Learn page (`resources/page.tsx`, ToolCards), and in the rail they are listed under Learn. Tricky bits on Exercises shows your newest saved passage engraved (TrickyPreview), or two bars of the Bumble Bee before you have one; no label, no tally. Breathing is pale lilac `#f2eef8`, not sand. Learn (`.learn-tiles`) and Tools (`ToolCards` → `.tool-tiles`) use the same tile look, on Home and on their own tab pages (Learn, Tools). No sand on Home: Theory and Metronome are lilac too. The Exercises page uses the Practice tiles too (Tricky bits in green). Browse music wraps its engraving in `MusicSweep` (`MusicSweep.tsx`): noteheads light in purple `#79588e` one at a time, left to right, then a short rest; only while on screen, still with reduced motion. Scale Studio's hand-drawn staff is weighted to match OSMD (staff space about 6.2px, staffline 0.62px, stem 0.93px at desktop; `--demo-fit: 0.91`, staff 2.4, stem 3.6), so both notations read as one engraver. Scale Studio passes `bar` to ScaleStudioPreview (one 4/4 bar of eighths, same size as the old music demo). On phones (760px and down) Scale Studio is laid out by the tile's width instead of the fit box: its staff starts 24px in, like Browse music's, and runs to 6px from the right edge; Browse music's OSMD is zoomed 0.91 so both staffs measure about 5.7px per space. |
| A summary of your practice on Home (Today, Working on, Tricky bits, This week) | **Studio cards** | `HomeStudioCards.tsx` + `home-studio-cards.css`; the Today card is `HomeTodayCard.tsx` | Since Nov 12 in the tile look: radius 3, no shadow. Today is white with a hairline, square piece chips and buttons; the other cards are tinted tiles with the name on top (Tricky bits green, This week slate). Only cards with real data appear. Colour only where it means something (list dot, green practice time, sand deadline). Today stacks rows that each appear only with something real: Where you left off, Working on (piece chips), Coming up, Warm-up today (one saved set by rotation), Routine progress. |
| A white card for a piece or item in a list (Working on, tricky bits, lists) | **ItemCard** | `components/ItemCard.tsx` + `item-card.css` | White, radius 3, 1px hairline, no lift. Title 15px / 600, meta 12.5px. Semantic `as` supports list items and articles; `.item-card__body` styles the primary link separately from secondary actions. Used by My Studio and tricky bits. |
| A panel that groups controls or data (Today's practice, calendar, pitch map) | **Practice card** | `.practice-card` (`practice/practice-page.css`, studio card tokens in `studio-card-tokens.css`) | White, 1px hairline `#e4e4e7`, radius 3, no shadow (Nov 16). On My Studio the insight panels are colour tiles instead, see "Insight tile". |
| A row in a long list (Library, saved music) | **Music row** | `MusicRow.tsx` + `music-row.css`, art from `StudioRowArt.tsx` | DESIGN.md "List row". In the Library the list is quiet rules (Nov 14, her pick over square tiles and a grey panel): no box, entries divided by `#ececef` hairlines, a hairline closing the list, no heavy ink rules; heading, chips, hairlines and titles share one left edge, so there is no grey hover band (both a band past the lines and text pushed in were tried and rejected); green title hover was rejected, hover pending. The Want to learn, Working on and Learned filter chips are round (the tag chips stay square). One column at every width (two columns cut titles to one letter). The list button in rows is a round 30px dot with no words (+ when on no list), in a fixed slot every row keeps, flush with the hairline's end, so all tags end on one edge; on book pages and My Studio cards it keeps its words and is square (radius 3). Two lines (title, composer) with the tags to their right at every width; on phones the tags shrink to 20px and wrap to at most two lines in a 150px column. A book's page lists its numbers the same way (`music/books/book.css`). |
| What kind of piece it is (Excerpt, Etude, Exercise, genres) | **Tag pill** | `components/tag-pill.css`, colour from `lib/tagTone.ts` | Tinted pill, words only. Never a new colour map. In Library rows (Nov 14) a tag is a 7px dot in its colour plus the word, no box, matching the Library's tag chips, so the dot means the same thing in the filter and the list; "Coming soon" is the grey word alone. |
| A piece you can open, listed inside something (a deadline's pieces, Home's Today card) | **Piece chip** | `components/piece-chip.css` | White, hairline, the piece's status dot (same as the lists). Not a tag pill: tags describe, chips go somewhere. |
| Which list a piece is on (Want to learn, Working on, Learned) | **Status dot** + **StatusButton** | `components/StatusButton.tsx`, `status-button.css`, tones in `lib/musicStatus.ts` | A dot, not a pill. The button is how anything goes on a list. One pill size everywhere (Nov 14): 28px, 12px type, sides 11/9, like the Library's list chips. `ensureId` saves a thing on first use (a Scale Studio setup becomes a set, `scale-set:<id>`, so each setup has its own status). |
| A date or deadline label ("in 12 days") | **Tag pill**, `data-tone="sand"` | `tag-pill.css` | Same pill shape as tags. |
| Labeled tools in the reader toolbar (Mark up, Listen, Scales, Tempos, View) | **Fixed-width tool** | last block of `studio-shell.css` | 46px each so icons sit at even intervals. Only the tempo controls get a grey pill; page controls stay plain (tried as a pill, rejected: read as another adjustable tool). |
| An excerpt's tempo and tally | **ExcerptTempoMark** | `components/ExcerptTempoMark.tsx` | TempoPill + RepPill, one pair per passage tab, above the music in both PDF (outside the page, so Draw marks never shift) and XML (ScoreViewer `paperTop`, top-left beside the title). Same tally key in both views. View settings "Practice tempo" shows/hides it. |
| A tempo you can play, nudge and set | **TempoPill** | `components/TempoPill.tsx` + `tempo-pill.css` | Metronome tap, −, the number, +. `size` small (pinned on a score by `ScoreTempoMarks`, or above the first selected bar by the reader's "Tempo and count" pin with a RepPill and a CloseButton, `.passage-practice-mark`) or large (inline, tricky bits). Blue so it never reads as printed. `history` (its RepPill key) adds a small trend button once two days are recorded. |
| Work a passage up to a target tempo | **Tempo ladder** | `components/TempoLadder.tsx` + `tempo-ladder.css`, state in ScoreViewer | From the bar-selection pill (stairs icon): a ReaderPopover with From and Target (small Steppers, no TempoPills: nothing plays there), the step (+1, +2, +5, +10) and a plain grey Start; one size, 14 / 600. Then a card over the passage (under it on the first line), draggable by any empty part (grip on top): a line from From to the marked Target cut into steps, Cookie at the current tempo, then step back, RepPill, step up, and a CloseButton. Nothing advances by itself. Reps and each step up go to tempo history (tricky bit key when the bars are one). |
| A tempo over the weeks | **TempoTrend** | `components/TempoTrend.tsx` + `tempo-trend.css`, data in `lib/tempoHistory.ts` | One blue line, a dot per practised day, first and latest numbers; no axes. `TempoHistoryButton` (in TempoPill), `TempoTrendSection` (reader tempo ▾ menu), `small` for My Studio's "Getting faster" rows. Recorded by itself: a counted rep, or 30 s of Listen or click track; one entry a day, the highest. |
| Floating controls next to what they act on (bar selection, clock controls) | **Soft pill** | `.range-bar` in `components/passage-guide.css` (dot grip `.range-bar__grip` drags it aside; resets on a new selection); clock version `.practice-today__actions` | White, hairline border `#d4d5da`, small shadow, round 34 to 38px icon buttons (the bar-selection pill drops to 28px with a mouse, so it covers less music), tooltips name them. See memory "soft pill style". |
| A button with a word that starts, saves or adds something (Start, Add to my routine, Keep offline) | **Plain grey action button** | `.action-button` in `studio-shared.css` | Shared grey fill, ink, hover, border and icon sizing. `--compact` and `--large` retain existing sizes; `--action-*` variables handle measured page dimensions. Used by simulation, Breathing Lab, rhythm drills, mock auditions and offline controls. |
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
| The contents page of any book of numbered things (Reichert, Köhler, Cookie's scale routine, the melodies) | **Exercise book** | `components/ExerciseBook.tsx` (rows styled in `music/books/book.css`), progress in `lib/bookProgress.ts` | Nov 14: every practice book matches. Nov 16: rows use the Library row's exact measures (60px row, 16 / 600 title on a 20px line, 13px meta 4px under, tick flush with the hairline's end) and "Last opened" is grey words, not a green box. The Technique map (`roadmap/page.tsx`) is this same row under area headings: name, one grey line, tick; no tinted boxes, no chips, no dialog. DetailHeader on top with the done count (`useBookDoneText`), then one ruled row per item: bold name, grey detail line, "Last opened" pill, a done tick you set yourself. Don't build a book page any other way. |
| Previous and next through a set (book pieces, pages, tricky bits) | **Book stepper** | `.book-stepper` (`music/books/book.css`) | ‹ 1 / 15 ›. These arrows are controls and stay. |
| A run through several pieces in order (mock audition) | **Mock audition run** | `practice/mock/page.tsx` + `mock-audition.css`, data in `lib/mockAuditions.ts` | Setup (how many, pause, record), a numbered running order, each excerpt in the normal reader with a "next up" screen between, and an end list with times. The reader header holds a Book stepper (`.mock-stepper`) whose record button shows the run's one take; playback is RecordingPlayback. |
| A dialog over the page (edit a deadline, practise a tricky bit) | **Dialog** | `components/Dialog.tsx` + `dialog.css` | Backdrop, white panel, a title row ending in CloseButton, Escape closes, a bottom sheet on phones. `width` medium (forms) or wide (music). Contents style themselves. Current shell moves focus in on open, keeps Tab inside, and returns focus to the opener on close (Nov 16, `lib/focusTrap.ts`); callers must handle that until the shared shell does. |
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
| A practice game screen (rhythm drills) | **RhythmGame layout** | `rhythm-drills/RhythmGame.tsx` + `rhythm-drills.css`; card demo `RhythmDrillsPreview.tsx` | Reuses lesson 7's staff and tap marks (EngravedRow, `dots-and-ties.css`) and the close-up's RhythmTap pad; this file only lays them out: one quiet stats row (difficulty, streak, tempo), the staff, the pad, plain grey actions. No start screen: the drill opens straight away, with Easy / Medium / Hard as a View switch in the stats row and one grey line under it saying what that difficulty includes. Copy this layout for the next game rather than a new skin. |
| An interactive theory lesson | **LessonFrame** | `theory/LessonFrame.tsx` | Shared timeline, narration, Cookie, progress and fixed Next. Reuse lesson control styles. |
| Engraved lesson music, including rests | **EngravedRow / RowGraphics** | `theory/EngravedRow.tsx` | `proportional` spaces notes exactly by time so each sits on its count (lesson 7 only; printed music is not spaced this way). `RowNote.rest` preserves elapsed duration; `measureRest` centers a full-measure rest. RestGlyph uses the same VexFlow font as RhythmNote. |
| Match note and rest lengths by drawing or tapping | **RestMatch** | `theory/rests/RestMatch.tsx` | Two rows from RowGraphics; pointer and keyboard alternatives; shared lesson typography. |
| Progress through a short set (lesson steps, exercise rounds) | **Progress dots** | `theory/ProgressDots.tsx` | Dots, never "2 of 6" in words. |
| Tap a passage's rhythm yourself (close-up Rhythm mode) | **RhythmTap** | `components/RhythmTap.tsx`, styles in `passage-guide.css` | Click choice (every beat, first beat, none), Start, a wide pad (any key or any finger). Answer marks only after grading; per-note grading (`gradePassage`). |
| A tooltip | **has-tip** | `class="has-tip" data-tip="…"` | Icon-only buttons only. Not on close buttons, not where it can overflow the window edge. Mouse only: hidden on touch screens (one rule at the end of `studio-shell.css`). |
| A hover label on the music itself (a note's count while beat sticks are on) | **beat-tip** | `.beat-tip` in `viewer-fixes.css`, rendered by ScoreViewer | Same small dark look as has-tip, above the notehead, hover only (a click on a note never opens it). |
| A quiet housekeeping action (restore defaults, reset a view) | **Text action** | `.text-action` in `studio-shared.css` | Grey words, no border, no fill, darker on hover. The reader's and Scale Studio's "Reset" (`.reader-settings-reset`, a grey pill) should move to it. |
| Counting today's repetitions of a skill (a scale, an exercise) | **RepPill** | `components/RepPill.tsx` + `rep-pill.css`, data in `lib/repLog.ts` | Sits beside its TempoPill and is built the same way, in pink: tally mark, −, the number (type to set it), +. Fixed width. Counts per day; the My Studio day panel and "Most practised" add them up. Used by Scale Studio's tempo marks. |
| All-time count of one skill, beside its RepPill | **RepTotal** | `components/RepPill.tsx` + `rep-pill.css` | Plain pink text, no background ("7 total" / "共 7 次"), every day and tempo added up; a scale's ranges and groupings share one total (`totalGroup`). Hidden at zero. Replaced a planned colour square: use a number, not a colour map, for counts. |
| The hard passages you're working on, across pieces (My Studio) | **PassagesList** | `practice/PassagesList.tsx`, styles `.passages` in `practice/practice-page.css` | The Routine's checklist rows: the circle marks it done (moves to a folded Done group, kept), piece over bars and tempo, a small TempoTrend once there are two days, Trash that asks once. Links come from `bitHref` in `lib/trickyBits.ts`: the piece at those bars, selected, close-up open. |
| Counting a passage's repetitions over weeks | **Rep ladder** (inside `tricky-bits/BitPractice.tsx`) | `tricky-bits/` | One row per tempo, running total kept forever; also logs to `lib/repLog.ts` for the day report. |
| Change a number one step at a time (beats, octave, meter, a note, minutes) | **Stepper** | `components/Stepper.tsx` + `stepper.css` | −, value, + on action grey. `size` medium 36px or small 28px; `tone="text"` for a worded value ("Octave 4"). Hold to repeat (speeds up), arrow keys and Home/End on the value (one tab stop, `role=spinbutton`), 44px touch targets. `onChange` with `min`/`max`, or `onStep` for a list (`wrap` goes round). The end that can't go further is disabled. `className` for width only. Use for settings tempos; playable score tempos use TempoPill and reps use RepPill. Used by Breathing Lab, the tools panel (tempo, drone and fingering octave, meter) and the tendency test. |
| A volume or other 0 to 1 amount | **Volume slider** | `.tp-volume` in `tools-panel.css`, `Volume` in `PracticeToolDock.tsx` | Label left, native range right, `accent-color` selected purple `#6d4585`. Added October 21, 2026 for the metronome's beat and accent volumes. Move to `components/` if a second place needs one. |
| Extra settings for one tool in the tools panel (tuner, drone, metronome) | **Options button** | `Options` in `PracticeToolDock.tsx`, `.tp-options` in `tools-panel.css` | Nov 16. One sliders icon at the right end of the tool's heading line, 30px, purple fill while its options are open. Replaced three grey "More" words. Options are label and control rows under the tool. No dividing lines in the panel: the tuner is a green tile, the other tools a heading and controls. Anything on or sounding is the selected purple; the heard note key is a green or sand fill, never a ring. |
| How the tools sound (click, accent, drone voice, concert A) | **Tool sounds** | `lib/toolSounds.ts` (store, `cookie:tool-sounds:v1`), `lib/useToolSounds.ts`, `components/clickSounds.ts`, `components/sampledDrone.ts` | One studio-wide setting. Always book clicks with `bookClick`/`bookTick` and drones with `droneVoice`, and get pitch from `lib/pitch.ts` / `pitchFrequency`, so the choice and the A reach every page. Never hard-code 440. |
| The rounds of a changing breathing pattern | **Round strip** | `breathing/Sequence.tsx`, `.bl-sequence` in `breathing/breathing-lab.css` | One row of eight cells, in count over out count; the current round in purple `#eee7f2` / `#79588e` with a 3px bar filling as the breath goes by, finished rounds keep a grey bar. A row, never a list, so the phone does not scroll. Also drawn in the home Breathing Lab card (sized up there). |
| A first routine for someone who has none | **Starter routine** | `exercises/StarterRoutine.tsx`, store in `exercises/starter-routine.ts` (`useStarterOffer`, `addStarterRoutine`, `dismissStarter`) | Shown on the Exercises hub in the saved sets' spot (same rows) and on Home in the Today card's spot, only while there are no saved sets and it was not dismissed. Add saves an ordinary Scale Studio set and puts its steps on the Routine; Not now hides it for good. |
| Tapping a rhythm in a lesson (the thing you press on each note) | **Cookie at the tap spot** | `LessonFrame` prop `cookieAway` + the spot in `theory/dots-and-ties/RhythmPractice.tsx` (`.dt-tap-spot`) | The guide Cookie hops from the bubble to the tap spot (none with reduced motion) and says "Tap on me!". The whole spot (320 by 104, 84 high on phones) is the target; Cookie is only the picture and squishes on each tap, Space included; it looks happy after a clean attempt and goes "hmm" (`.is-unsure` in `cookie-button.css`) otherwise. No hover box. Its place by the bubble keeps its width, so nothing moves. Used by lesson 7; lessons 2, 3 and 6 still tap on a second CookieButton (see "Not reused yet").
| Tally marks | **TallySticks** | `components/TallySticks.tsx` + `tally-sticks.css` | Four upright, the fifth across. |
| Reference lists you dip into (Want to learn, Learned, Recently opened) | **List stacks** | `.list-stacks` in `practice/practice-page.css` (My Studio) | A row of piles: the top card shows, two edges peek out when there is more; the title links to the full list; tapping the pile opens its cards in a grid below, animated with view transitions (no animation where unsupported or with reduced motion). Not for what you practise from (Working on, Tricky bits stay open). Radius 3 on the top card and on the edges peeking under it (Nov 12). The Me page's panels (Today's practice, calendar, day list, Practice insights) are radius 3 too, in `studio-shared.css`. |
| Two or more ways to show one thing (Cards / Continuous, List / Shelf / Timeline, Breathing Lab's Cycle / Flower / Body / Embouchure) | **View switch** | `.view-switch` in `studio-shared.css` | Grey track, chosen one white with a hairline, `aria-pressed`. Words only, no glyphs. On a tinted stage it sits below the stage, on white, so the track stays visible. |
| Search a page's list | **Library search** | `.library-find` in `music/library.css` | A short capsule (max 320px) in the view switch's grey track `#edf1f5`, no border, hairline ring on focus. Sits on one row with the view switch. Move to `studio-shared.css` when a second page needs it. |
| Narrow a list by tag | **Tag chips** | `.library-tag` in `music/library.css` | Quiet at rest: a 7px tone dot and the word on nothing, grey hover. Chosen: the tag's own tint (tag-pill pairs). No All chip: tap the chosen one again to clear. One wrapping row; one sideways-scrolling line on phones. Replaced the Library's old filled chips with the dark All. Re-applied Nov 14 after the filled chips and black All had crept back (rules at the end of `music-row.css`); the first dot sits on the page's left edge. Your-list chips (Want to learn, Working on, Learned) are a second row of round grey pills, chosen is white with a hairline like the view switch. Spacing: title, 20, search row, 16, chips, 6 between rows, 20, list. |
| Your lists as shelves (Want to learn, Working on, Learned) | **Music shelf** | `music/MusicShelf.tsx` + `music/music-shelf.css` | Nov 12, printed ink style: three shelves one above another, each a row of printed score covers (paper `#fbfaf6`, 1px ink frame with an inner rule, italic serif title, a short rule, composer in serif small caps) standing on a 3px ink plank; a full shelf scrolls sideways, edge to edge on phones. The list button is its bare dot inside the cover's top-right corner. Empty shelf: one italic grey line. Drag a cover to another shelf on wide screens. No rounded boxes, no grey columns. |
| A composer's dates, nationality and period as one line | **composerFacts** | `music/ComposerTimeline.tsx` | "1685 to 1750 · German · Baroque", Chinese words mapped. The timeline's composer card (a Dialog) uses it; the reader's StoryCard in ScoreViewer still builds its own English-only line and should switch to it. |
| The Library as a timeline of composers | **ComposerTimeline** | `music/ComposerTimeline.tsx` + `music/composer-timeline.css` | Life bars across the centuries, pieces as dots at the year written, over period bands in the roadmap tints. Only composers with a birth year in `content/composers.json` get a row; the rest stay in the List. The name opens the composer card in the shared Dialog. Phones scroll it sideways inside its own box. |
| The top of a page you reach from another page (a book, Cookie's scale routine, a mock audition) | **DetailHeader** | `components/DetailHeader.tsx` + `detail-header.css` | Nov 14. A small "‹ Library" back line above the title, never a column beside it, so the title and everything under it start on the tab pages' left edge and the title sits at their height. Title 28 / 700; the list status is a round pill right after the title on the same line (wraps under it on phones); one grey meta line (composer · count). Lists under it: one-line items get no rules (Cookie's routine, `.book-page__list--plain`), two-line items keep hairlines; no hover colour or band, the hand pointer only. |
| A link in running text or under a card | **Text link** | DESIGN.md / memory "no underlined links" | Ink `#292a33`, 600, no underline, **no trailing ›**. Not green, and no colour change on hover (green links and green hovers rejected Nov 14 as an old-website look). |
| A page's section heading | **Section heading** | `.home-preview__group` | One heading style per page level. |
| The small label inside a card or panel ("WORKING ON", "THIS WEEK", "TRICKY BITS") | **Card label** | to be added as `.card-label` in `studio-shared.css` | 11px, 600, capitals, letter-spacing .06em, grey `#85868e`, optional status dot in front. Gives a card three levels: label, title, meta. Only inside cards and panels, never as a page or section heading (those stay sentence case). Any other capitals in the studio are one-offs to convert or remove. |

| A grey tempo box in a reader toolbar | **ToolbarTempo** | `components/ToolbarTempo.tsx` | Shared minus, input and plus markup; callers retain draft, live tempo, tooltip and commit behavior. The grey appearance remains owned by reader toolbar CSS. |
| One breath, drawn (Breathing Lab's Line view, the Body page's drag control, Home's Breathing tile) | **Breath line** | `breathing/breathLine.ts` (`linePath`, `linePoint`, `countedFullness`) | Nov 16, replaced the two-colour ring she was sick of. A curve that rises on the inhale (blue `#87b4c8`), stays level on a hold (sand `#cab994`) and falls on the exhale (pink `#ca9295`), 4px, with a purple dot riding it over a faint baseline. Never draw a breath as a ring again. |
| A panel of numbers about your practice (calendar, the day, where time goes, most practised, pitch tendencies) | **Insight tile** | end of `practice/practice-page.css` | Nov 16. The Home tile: tint fills it (slate, lilac, green, pink), name top left 15 / 600, radius 3, padding 10 12 12, no border or shadow. Calendar days and pitch cells are 30px squares, white on the tint; today is bold, the chosen day is a white fill, never a ring. |
| A row of settings in a control card (In, Hold, Out, Tempo, Sound) | **Settings row** | `.bl-count-step` in `breathing/breathing-lab.css` | Label left 14 / 400 `#45464f`, control right: a Stepper for numbers, a View switch for on / off. No custom pills, no raised white highlight. Move to `studio-shared.css` when a second page needs it. |

## Tried and rejected (do not bring back)

- A ring for a breath cycle (Nov 16). Use the Breath line.
- Square buttons and steppers (Nov 16). See rule 1.
- Tinted regions filled with white chips; a dialog just to tick a skill (Nov 16).
- Darker hairlines as a row hover; a grey hover band; green title hover.
- A green "Last opened" box in a list row; green primary buttons; black selected buttons.
- White panels floating on a shadow; cards that lift on hover.
- A raised white highlight inside a grey control to mean "on".
- Vertical divider lines in toolbars.
- Warm cream and cool grey fills; sand on Home.
- Trash at the far right edge of a wide row.

## Not reused yet (source audit, October 19, 2026)

Fix these by pointing them at the component above, not by restyling them in place. Highest value first.

1. **Tempo reuse completed locally (October 30).** XML and fixed readers use `ToolbarTempo` for the chosen grey box. Scale Tempos and key-exercise rows use editable `Stepper`; the tools panel already uses it. TempoPill remains the playable blue score/passage control. Stepper signs darken on hover without a separate fill.
2. ~~Roadmap detail dialog~~ gone Nov 16: the Technique map has no dialog now. Old text: **Roadmap detail is its own dialog.** `roadmap/page.tsx:78` (`.roadmap-detail`, tinted by region) still has its own backdrop and panel. A future move onto `Dialog` must preserve the roadmap's focus handling; the shared shell currently only handles Escape and backdrop dismissal. Tricky bit and Deadline dialogs already use `Dialog`.
3. **Legacy list-dot CSS.** `.continue-dot` remains in `home-preview-cards.css:195`, but no TSX consumer was found and `ContinuePracticingCard.tsx` / `HomeStudioBrief.tsx` no longer exist. This is a CSS cleanup candidate, not two live components to migrate. Keep `.status-dot` for list status; check rendered pages before deleting old styles.
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

## Keeping this current

- Adding a component: add a row above, in the same session.
- Finding a one-off: add it to "Not reused yet" with the file and line, even if you don't fix it now.
- Fixing one: delete its entry.
- When she rejects something, add it to "Tried and rejected" with the date, in her words where possible.

Theory interaction rules and component usage: [theory/COMPONENTS.md](theory/COMPONENTS.md). `rests/SplitSpan.tsx` provides accessible duration splitting by cut gesture, tap, or keyboard.

Theory rhythm practice: `theory/dots-and-ties/RhythmPractice.tsx` provides count-in, the Cookie tap spot and onset feedback. `EngravedRow` owns ties and tuplet engraving as well. See the theory interaction contract for timing and completion rules.

### Count-in for rhythm activities
Use `components/CountInPulse.tsx` for reader, metronome, and theory tapping count-ins. Pass the zero-based beat from the audio clock, the count length, and optional group accents. The blue current pulse and completed dots match the reader. Set `active={false}` to reserve its space without showing it. Do not create another “Get ready” counter or run a separate animation timer.

- **ScaleTemposPanel** (components/ScaleTemposPanel.tsx): shared Tempos popover for Scale Studio and Cookie’s Scale Routine. Reuses the same playback, metronome, BPM editing, and page-tempo visibility controls.

The tools-panel tempo uses `Stepper` with `editable`, `liveValue={liveTempo}`, and `LIVE_TEMPO_DELAY`, sharing TempoPill’s draft/blur behavior. Its meter uses a native select with the existing chip appearance and ChevronIcon, like the native selects in Scale Studio. Keep its width fixed across signatures; beat dots stay outside More.

The tools-panel tuner starts listening when its main view opens and releases the microphone when closed or switched to fingering. Keep Retry only for microphone errors; no separate Listen control. The compact view omits instructional paragraphs.

Tools-panel: each tool has one Options button (see the table) instead of a More word; metronome dots sit under its controls. Active drones appear below the note grid as purple chips, each removable by pitch and octave, with Stop all in the footer.
