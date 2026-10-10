# Cookie Flute Studio: which component to use

**The rule: reuse before you build.** If something on the page means the same thing as something elsewhere in the
studio, it uses the same component, so changing that component changes it everywhere. Before adding UI, find its job
below and use what is listed. If nothing fits, add a component here instead of styling a one-off.

Values (colours, sizes, shadows) live in [DESIGN.md](DESIGN.md). This file says *which piece* to use. Started
October 8, 2026 from a scan of the studio; the "Not reused yet" section lists what the scan found.

## Use this for that

| Job | Use | Where it lives | Notes |
|---|---|---|---|
| A big card for an exercise, lesson, tool or feature (home, Exercises, Learn) | **Preview card** | `.preview-card` in `home-preview-cards.css`, grid in `components/preview-grid.css`, built in `HomePreviewCards.tsx` / `LearnPreviews.tsx` | Tinted stage with an animated demo on top, words below. Lifts on hover. The only card that lifts. |
| A summary of your practice on Home (Today, Working on, Tricky bits, This week) | **Studio cards** | `HomeStudioCards.tsx` + `home-studio-cards.css` | Preview cards with a neutral grey top; only cards with real data appear. Colour only where it means something (list dot, green practice time, sand deadline). |
| A white card for a piece or item in a list (Working on, tricky bits, lists) | **Item card** | `.working-card` in `practice/practice-page.css` | White, 1px border `#e6e6ea`, radius 18, no lift. Title 600, meta grey. Should move to `components/` (see below). |
| A panel that groups controls or data (Today's practice, calendar, pitch map) | **Practice card** | `.practice-card` (`practice/practice-page.css`, studio card tokens in `studio-card-tokens.css`) | White, card shadow, no border. |
| A row in a long list (Library, saved music) | **Music row** | `MusicRow.tsx` + `music-row.css`, art from `StudioRowArt.tsx` | DESIGN.md "List row". |
| What kind of piece it is (Excerpt, Etude, Exercise, genres) | **Tag pill** | `components/tag-pill.css`, colour from `lib/tagTone.ts` | Tinted pill, words only. Never a new colour map. |
| A piece you can open, listed inside something (a deadline's pieces) | **Piece chip** | `.piece-chip` in `practice/practice-page.css` | White, hairline, the piece's status dot (same as the lists). Not a tag pill: tags describe, chips go somewhere. Move to `components/` when a second page needs it. |
| Which list a piece is on (Want to learn, Working on, Learned) | **Status dot** + **StatusButton** | `components/StatusButton.tsx`, `status-button.css`, tones in `lib/musicStatus.ts` | A dot, not a pill. The button is how anything goes on a list. |
| A date or deadline label ("in 12 days") | **Tag pill**, `data-tone="sand"` | `tag-pill.css` | Same pill shape as tags. |
| A tempo you can play, nudge and set | **TempoPill** | `components/TempoPill.tsx` + `tempo-pill.css` | Metronome tap, −, the number, +. `size` small (pinned on a score by `ScoreTempoMarks`, or above the first selected bar by the reader's "Tempo and count" pin with a RepPill and a CloseButton, `.passage-practice-mark`) or large (inline, tricky bits). Blue so it never reads as printed. |
| Floating controls next to what they act on (bar selection, clock controls) | **Soft pill** | `.range-bar` in `components/passage-guide.css`; clock version `.practice-today__actions` | White, hairline border `#d4d5da`, small shadow, round 34 to 38px icon buttons (the bar-selection pill drops to 28px with a mouse, so it covers less music), tooltips name them. See memory "soft pill style". |
| A button with a label that starts or saves something | **Soft tint button** (for now) | DESIGN.md "Buttons" | The user dislikes big tinted blocks; the soft pill is being tried instead. Don't add new big buttons until this is settled. |
| A selected tab or filter chip | **Filter chip** | DESIGN.md "Filter/category tabs" | The only place dark `#292a33` fills are allowed. |
| Switch between passages of one excerpt piece | **Filter chip** (passage tabs) | `.excerpt-passages` in `music/excerpt-reader.css` | Same recipe as the Library chips, restated there because the reader doesn't load `library.css`. |
| Close a panel, dialog, sheet or toolbar | **CloseButton** | `components/CloseButton.tsx` + `close-button.css` | Plain dark × (the Mark Up icon), no fill, no hover change, no tooltip. Pass `className` only for placement. Used by every close in the studio. |
| Remove something (a step, a session, a saved set, a piece from a list) | **Trash** | `PracticeIcon name="delete"` | Grey, red on hover, visible on touch. Never ×. |
| Fold and unfold a section | **Chevron** | `ChevronIcon` in `components/HeaderIcons.tsx` | Rotates 180° when open. Never a typed ⌄ or ›. Prefer not folding at all: a long section shows its first row and a "Show all N" text action (My Studio); folded headings alone looked dead. |
| Header and toolbar icons | **HeaderIcons / PracticeIcon** | `components/HeaderIcons.tsx`, `components/PracticeIcon.tsx` | 20px box, 1.7 stroke, round caps. Don't draw new inline SVGs for an icon that exists. |
| Back to the previous page | **BackChevron** | `components/BackChevron.tsx`, `back-button.css` | |
| Previous and next through a set (book pieces, pages, tricky bits) | **Book stepper** | `.book-stepper` (`music/books/book.css`) | ‹ 1 / 15 ›. These arrows are controls and stay. |
| A dialog over the page (edit a deadline, practise a tricky bit) | **Dialog** | `components/Dialog.tsx` + `dialog.css` | Backdrop, white panel, a title row ending in CloseButton, Escape closes, a bottom sheet on phones. `width` medium (forms) or wide (music). Contents style themselves. |
| A menu or panel that opens from a button | **ReaderPopover** | `components/ReaderPopover.tsx` | Anchored to its button. |
| Extra choices for one reader tool (Metronome, Drone) | **Tool ▾ menu** | a ReaderPopover with `<ChevronIcon/>` as trigger, right after the tool button (`.metronome-options`, `.drone-options`) | The ▾ joins its tool as one tile: same grey or purple behind both, square inner corners, hover only darkens icons. Choices are `.reader-choice` rows; remembered per piece. |
| SubdivisionIcon | **SubdivisionIcon** | `components/SubdivisionIcon.tsx` | Quarter, two eighths, four sixteenths drawn with the scale-notation glyphs; used in the metronome ▾ menu. |
| An interactive theory lesson | **LessonFrame** | `theory/LessonFrame.tsx` | Shared timeline, narration, Cookie, progress and fixed Next. Reuse lesson control styles. |
| Engraved lesson music, including rests | **EngravedRow / RowGraphics** | `theory/EngravedRow.tsx` | `tones` colours chosen notes to match something drawn for them (lesson 7 brackets). `proportional` spaces notes exactly by time so each sits on its count (lesson 7 only; printed music is not spaced this way). `RowNote.rest` preserves elapsed duration; `measureRest` centers a full-measure rest. RestGlyph uses the same VexFlow font as RhythmNote. |
| Match note and rest lengths by drawing or tapping | **RestMatch** | `theory/rests/RestMatch.tsx` | Two rows from RowGraphics; pointer and keyboard alternatives; shared lesson typography. |
| Progress through a short set (lesson steps, exercise rounds) | **Progress dots** | `theory/ProgressDots.tsx` | Dots, never "2 of 6" in words. |
| Tap a passage's rhythm yourself (close-up Rhythm mode) | **RhythmTap** | `components/RhythmTap.tsx`, styles in `passage-guide.css` | Click choice (every beat, first beat, none), Start, a wide pad (any key or any finger). Answer marks only after grading; per-note grading (`gradePassage`). |
| A tooltip | **has-tip** | `class="has-tip" data-tip="…"` | Icon-only buttons only. Not on close buttons, not where it can overflow the window edge. |
| A hover label on the music itself (a note's count while beat sticks are on) | **beat-tip** | `.beat-tip` in `viewer-fixes.css`, rendered by ScoreViewer | Same small dark look as has-tip, above the notehead, hover only (a click on a note never opens it). |
| A quiet housekeeping action (restore defaults, reset a view) | **Text action** | `.text-action` in `studio-shared.css` | Grey words, no border, no fill, darker on hover. The reader's and Scale Studio's "Reset" (`.reader-settings-reset`, a grey pill) should move to it. |
| Counting today's repetitions of a skill (a scale, an exercise) | **RepPill** | `components/RepPill.tsx` + `rep-pill.css`, data in `lib/repLog.ts` | Sits beside its TempoPill and is built the same way, in pink: tally mark, −, the number (type to set it), +. Fixed width. Counts per day; the My Studio day panel and "Most practised" add them up. Used by Scale Studio's tempo marks. |
| Counting a passage's repetitions over weeks | **Rep ladder** (inside `tricky-bits/BitPractice.tsx`) | `tricky-bits/` | One row per tempo, running total kept forever; also logs to `lib/repLog.ts` for the day report. |
| Tapping a rhythm in a lesson (the thing you press on each note) | **Cookie at the tap spot** | `LessonFrame` prop `cookieAway` + the spot in `theory/dots-and-ties/RhythmPractice.tsx` (`.dt-tap-spot`) | The guide Cookie hops from the bubble to the tap spot (none with reduced motion) and says "Tap on me!". The whole spot (320 by 104, 84 high on phones) is the target; Cookie is only the picture and squishes on each tap, Space included; it looks happy after a clean attempt and goes "hmm" (`.is-unsure` in `cookie-button.css`) otherwise. No hover box. Its place by the bubble keeps its width, so nothing moves. Used by lesson 7; lessons 2, 3 and 6 still tap on a second CookieButton (see "Not reused yet").
| Tally marks | **TallySticks** | `components/TallySticks.tsx` + `tally-sticks.css` | Four upright, the fifth across. |
| Reference lists you dip into (Want to learn, Learned, Recently opened) | **List stacks** | `.list-stacks` in `practice/practice-page.css` (My Studio) | A row of piles: the top card shows, two edges peek out when there is more; the title links to the full list; tapping the pile opens its cards in a grid below, animated with view transitions (no animation where unsupported or with reduced motion). Not for what you practise from (Working on, Tricky bits stay open). |
| Two or three ways to show one page (Cards / Continuous) | **View switch** | `.view-switch` in `studio-shared.css` | Grey track, chosen one white with a hairline, `aria-pressed`. |
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

## Not reused yet (from the scan, October 8, 2026)

Fix these by pointing them at the component above, not by restyling them in place. Highest value first.

1. **Tempo is still drawn two other ways.** Scale Studio, tricky bits and Breathing Lab use `TempoPill` now. Left: the practice dock metronome (`.tp-chip` / `.tp-stepper`, `PracticeToolDock.tsx`) and the reader toolbar's tempo box (`.tempo-step` / `.tempo-field` / `.scale-book__tempo-field`).
2. **Roadmap detail is its own dialog.** `roadmap/page.tsx` (`.roadmap-detail`, tinted by region) still has its own backdrop and panel. Move it onto `Dialog` (the tint can stay on its contents). Tricky bit and Deadline dialogs already use `Dialog`.
3. **Two kinds of list dot.** `.status-dot` (lists) and `.continue-dot` (`ContinuePracticingCard.tsx`,
   `HomeStudioBrief.tsx`). If they mean the same lists, use `.status-dot`.
4. **Number steppers.** `.tricky-step`, `.tp-stepper`, `.bl-stepper`, `.tendency__stepper`, `.score-tempo-mark__step`:
   five − / + designs. One stepper, used by the tempo pill and anything else that counts.
5. **Item cards live in the Me page CSS.** `.working-card` is the right look for a white item card but sits in
   `practice/practice-page.css`. Move it to `components/` (an `ItemCard`) so tricky bits, deadlines and lists elsewhere
   can use it. `.tricky-card` and `.tricky-preview-card` are the next candidates to fold in.
6. **Big action buttons.** Start, Save, Continue and others were each styled separately (and were black until today).
   Decide the action-button look (soft pill with a word, or something else), add it here, then convert them together.

7. **Rhythm tapping on a second Cookie.** `rhythm/RhythmLesson.tsx` (hold step), `measures/MeasuresLesson.tsx` (page 7) and
   `rests/RestsLesson.tsx` (step 1) tap on `CookieButton` while the guide Cookie is also on screen; lesson 2's tap step uses a 👏
   `.rhythm-clap`. The user found two cookies confusing in lesson 7, where the guide Cookie now moves to the tap spot (`cookieAway`). The
   user is still deciding whether these lessons follow; do not switch them yet (lesson 2's hold step needs press-and-hold).

## Keeping this current

- Adding a component: add a row above, in the same session.
- Finding a one-off: add it to "Not reused yet" with the file and line, even if you don't fix it now.
- Fixing one: delete its entry.

Theory interaction rules and component usage: [theory/COMPONENTS.md](theory/COMPONENTS.md). `rests/SplitSpan.tsx` provides accessible duration splitting by cut gesture, tap, or keyboard.

Theory rhythm practice: `theory/dots-and-ties/RhythmPractice.tsx` provides count-in, the Cookie tap spot and onset feedback. `EngravedRow` owns ties and tuplet engraving as well. See the theory interaction contract for timing and completion rules.
