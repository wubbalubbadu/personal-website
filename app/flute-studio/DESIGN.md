# Cookie Flute Studio: the values

[COMPONENTS.md](COMPONENTS.md) says **which thing to use and the rules** (shape, no boxes in boxes, one list row,
colour, hover, compactness). This file holds **the numbers** those rules use. If the two disagree, COMPONENTS.md wins
and this file has a mistake: fix it here.

Rewritten November 16, 2026. Everything superseded (card shadows, 18 to 24px card radii, cream and grey fills, the
green button, uppercase dark filter tabs, 78px rows) was removed; it is in git history.

- **Using something:** look it up in COMPONENTS.md and use the component listed, not a page-local copy.
- **Building something new:** add it to COMPONENTS.md in the same change.
- **No new `!important`.** Win with a more specific selector. The older layers (`ios-theme.css`, `studio-shell.css`,
  `viewer-fixes.css`) are full of it; match it only where you must override one of them, and say so in a comment.
  Phone reader rules need `:not(#_)` to win.

## Colour

| Name | Value | Use |
|---|---|---|
| Ink | `#292a33` | Primary text, links, the main action's label |
| Body grey | `#45464f` / `#55575f` | Secondary text. Never lighter than `#6f717a` for anything you must read |
| Meta grey | `#85868e` | The 13px line under a row title, counts, captions |
| Canvas and surfaces | `#fff` | Pages, cards, panels |
| Hairline | `#ececef` | Between rows of a list and around a card. Nowhere else |
| Slate | `#edf1f5`, hover `#e2e8ef`, lighter `#f4f6f9` | Every control fill (buttons, steppers, search, view switch, icon buttons) and slate tiles |
| Green tint | `#eef4ec`, ink `#40553d` | Tiles, Learned, the tuner box |
| Pink tint | `#faf0f6` | Tiles |
| Lilac tint | `#f2eef8` | Tiles, a live tap pad |
| Sand tint | `#f7f1e6`, ink `#765621` | Tiles, Working on |
| Selected purple | `#eee7f2` / `#79588e`; on a control `#f1e5f5` / `#6d4585` | Chosen or happening now: a selected option, the playing note, an "on" chip |
| Done green | `#46633d` | The tick on a finished row, a correct answer. Not a button or link colour |
| Dark fill | `#292a33` on white text | A selected tab chip only. Prefer the View switch |
| Armed red | `#a5372f` | The second tap of a delete ("Tap again to delete") only |

Never a neutral grey fill, never cream, never a gradient. State is a fill, never a ring or border.

## Type

Font everywhere: `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif`.

| Role | Size / weight | Notes |
|---|---|---|
| Page title | 28 / 700, line 1.15, -0.02em | Every page `<h1>`, starting 24px from the left and 92px down. One shared rule at the end of `studio-shared.css` lists the page headers; add new ones there |
| Big number | 48 to 54 / 700, -0.035 to -0.055em | Tuner note, tempo, selected pitch |
| Section heading | 20 / 700 | 26px under the section above, 8 to 10px over its content |
| Row title | 16 / 600 on a 20px line | The one list row |
| Row meta | 13 / 400, `#85868e`, 4px under the title | |
| Body | 14 to 15 / 400, line 1.4 | |
| Control label | 13 to 15 / 600 | Buttons, switches |
| Setting label | 14 / 400 | "In", "Hold", "Tempo" beside a stepper: sentence case, never uppercase |

Use few bold weights: 700 for titles, 600 for row titles and controls, 400 for the rest. No 650 to 770 in-betweens.
No uppercase labels.

## Shape

| What it is | Radius |
|---|---|
| Holds information: tile, card, panel, calendar day, stage | 3px |
| Button, stepper, note key, tap pad | 10 to 12px (small 8 to 10px) |
| Choose one of a few, a status, a tag filter | capsule (999px) |
| Floats over the music: bar pill, tempo and rep pills, the phone page turner | capsule |
| Speech bubble (Cookie talking in a lesson) | its own rounded bubble; it is a character, not a container |

## Elevation

Cards and tiles are flat: a `#ececef` hairline or a tint, no shadow, no lift on hover. Only things that float over
content have a shadow: popovers and sheets (ReaderPopover), the practice tools panel, floating pills over the music.

## Layout

- Page container: `padding: 64px 24px <bottom>` under the fixed 64px header; phones (760px and under) 16px sides.
- Tiles pad 10 12 12. Panels in one row share a height (`align-items: stretch`).
- The list row is 60px: `grid-template-columns: minmax(0,1fr) 30px`, padding 9px 0, the trailing tick or status in
  the 30px column. A row action (trash, a menu) sits right after the row's words, not at the far right.
- If a page scrolls because of padding, the padding is wrong.

## Controls

**Action button** (`.action-button` in `studio-shared.css`): slate `#edf1f5`, label `#45464f` (ink for a panel's one
main action), no border, radius 12, height 40, 14 / 600. `--compact` is 34px tall, radius 10, 13px. `--large` has a
44px minimum for a whole screen's action. Hover is one step darker. Icons in front are 18px. An "on" toggle takes the
selected purple.

**Stepper** (`components/Stepper.tsx`): slate, radius 12, 36px tall, value 16 / 600 tabular; small is 28px, radius
10. Signs answer to a 44px square on touch screens.

**View switch** (`.view-switch`): a capsule holding two or more choices, the chosen one white on slate. Use it for
tabs and On / Off pairs too.

**Icon button:** transparent, no border, 36 to 42px; hover is a slate shape behind it.

**Close ×:** only closes. A plain × (1.7 stroke, round caps), no fill, no circle, and no hover change at all
(`.markup-close` in `reader-workspace.css` is the model).

**Trash:** the only way to take something away (`PracticeIcon name="delete"`). Grey `#9a9ca3`, no fill; hover turns
it ink; red only for the armed second tap. Always visible on touch.

**Links:** ink, 600, no underline, no trailing ›, no colour on hover. The hand cursor is only for links that go
somewhere (one global rule in `studio-shell.css`).

## Statuses and tags

A tag (what kind of piece) is an 8px dot and a 13px word on nothing. A status (where you are with it) is a round pill
in its tint with an icon: bookmark for Want to learn (slate, ink `#3d5878`), half circle for Working on (sand),
ticked circle for Learned (green). Chosen is a deeper step of the same tint. In the Library the tags and statuses
share one 28px filter line; do not add a row per filter group.

## Notation glyphs: never hand-draw these

Clefs, noteheads, accidentals and other symbols come from a real glyph (the Unicode musical symbols, see
`StaffNote.tsx`) or a notation library. A freehand SVG clef was tried and reverted. If a glyph sits wrong, fix its
position or size, not the glyph.

## Score reader

`components/ReaderPopover.tsx` is the one surface for View settings, Customize scales and the phone dots menu: white,
hairline, soft shadow, anchored to its button on wide screens and a bottom sheet on phones. Do not add a centred
dialog or a second panel skin.

On phones the reader has two bars (the last block of `studio-shell.css`): identity on top; Listen with metronome and
tempo, Customize, Drone, View and the dots below. Everything else lives in the dots (`components/PhoneMore.tsx`).
Check desktop, iPad and 375px after any change to the bars.
