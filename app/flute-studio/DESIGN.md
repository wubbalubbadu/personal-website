# Cookie Flute Studio — Design Reference

Every value below is pulled directly from the CSS actually running on the site
today (`ios-theme.css`, `home-quick-tools.css`, `practice-tool-dock.css`,
`studio-home.css`, `saved-music.css`, `library.css`, `exercises.css`,
`practice-activity-hero.css`). Nothing here is invented — if a page looks
inconsistent, it's because it *isn't* using these values. Check here first.

## Color

| Token | Value | Use |
|---|---|---|
| Ink | `#292a33` | Primary text |
| Muted | `#71747e` / `#85868e` | Secondary text, meta lines |
| Canvas | `#f5f5f7` | Page background |
| Card | `#ffffff` | Surface background |
| Border | `#dedfd9` / `#e4e4e7` / `#e1e2df` | Card and row borders |
| Accent | `#678956` | Primary green — links, active states, icons |
| Accent (dark) | `#46633d` / `#40553d` | Accent text on tinted surfaces |
| Accent (tint) | `#e4ecdf` / `#e7eee3` / `#e5ece1` | Soft button/badge fills |
| Pink | `#f49fff` | Secondary accent (pet, drone, a few icons) |
| Pink (pale) | `#fce7fd` | Pink tint fills |

**Icon-tile tone system** (used for category/type icons throughout):

| Tone | Background | Ink |
|---|---|---|
| Green | `#dcebd9` | `#3f5d39` |
| Pink | `#f7e1f8` | `#68466b` |
| Sand | `#f1e7d6` / `#f2e8d3` | `#6b5a3a` / `#765d2e` |
| Slate/gray | `#e6e8eb` | `#4f5962` |

Flat fills only — no gradients. (Older files had gradient icon tiles; every
place that's been touched this session flattened them. Treat gradients as
a bug if you see one.)

## Typography

Font family, everywhere: `-apple-system, BlinkMacSystemFont, "SF Pro Display",
"SF Pro Text", "Helvetica Neue", Arial, sans-serif`.

| Role | Size | Weight | Line-height | Letter-spacing | Where |
|---|---|---|---|---|---|
| Page title | 42px (36px ≤760px) | 780 | 1.04 | -0.04em | `<h1>` — "Library", "Exercises", the old home title |
| Big display number | 48–54px | 740–770 | ~1 | -0.035 to -0.055em | Tuner note, tempo number, selected pitch |
| Section title | 24px | 700 | 1.15 | -0.025em | "Choose a focus", "Quick tools" |
| Card/dashboard heading | 20px | 700 | 1.15 | -0.02em | Dashboard card titles (Practice activity, Calendar, Practice plan) |
| Row title | 16px | 600 | 1.25 | -0.01em | List row primary text |
| Tool-card title | 14px | 680 | — | -0.015em | Dock tool headings |
| Body / meta | 14px | 400 | 1.35 | 0 | Descriptions, secondary lines |
| Small meta | 11–13px | 400–650 | 1.2–1.4 | 0 | Timestamps, counts, captions |
| Eyebrow | 10–12px | 700–720 | — | 0.08–0.13em, uppercase | "THEORY LESSON", "QUICK TOOLS" section labels |
| Button label | 12–14px | 600–680 | — | 0 | All buttons |

**Rules that actually matter:**
- Big numbers get tight negative letter-spacing (-0.035 to -0.055em) — this is
  what makes them read as confident, not just "large text."
- Eyebrows are the only uppercase text on the site. Don't add another one
  without a reason — one per page, max.
- Never introduce a font-size that isn't in this table. If nothing here fits,
  that's a sign to reconsider the component, not to invent a new size.

## Radius

| Value | Use |
|---|---|
| 12–13px | Buttons, small pills, icon tiles inside dashboard cards |
| 13–14px | List-row icon tiles |
| 18–20px | Cards, list containers, dock tool cards |
| 22–24px | Dashboard cards (Practice activity / Calendar / Practice plan), floating dock panel |
| 999px | True pills only (badges, the tempo/drone selector chips) |

Don't invent a radius outside this set. If something needs to feel "bigger,"
reach for 22–24px, not an arbitrary new number.

## Elevation

| Shadow | Use |
|---|---|
| `0 1px 0 rgba(0,0,0,.05)` | Flat list cards (barely-there separation) |
| `0 8px 28px rgba(41,42,51,.055)` | Raised dashboard cards |
| `0 9px 28px rgba(41,42,51,.03–.10)` | Row/tile hover or card resting state (varies by page, always this family) |
| `0 24px 70–80px rgba(41,42,51,.2–.22)` | The floating practice-tools dock only — nothing else should float this hard |

## Buttons

Two flavors, and only two:

**Soft tint (the default — used for almost everything):**
```css
background: #e7eee3;
color: #40553d;
border: 1px solid #d7e1d2;
border-radius: 12–13px;
font-size: 12–14px;
font-weight: 680;
```
Hover: `background: #dce8d7; transform: translateY(-1px);`

This is what "Tap tempo," "Start metronome," "Play A4" actually are —
*not* solid green. Solid green (`.primary-tool-button`'s base rule) exists
in the CSS but is overridden everywhere it's used. Don't reach for it.

**Dark (rare — used for active/selected states only):**
```css
background: #292a33;
color: #fff;
```
Seen on: active category tab, active dock tab.

## Cards & Rows

- **List row**: `min-height: 78px`, icon tile + title/meta stack + trailing
  chevron or action, `grid-template-columns: 52px minmax(0,1fr) auto`.
  Hover: background tint (`#f4f7f2` / `#f8faf7`), no shadow change.
- **Quick-tool card**: `height: 94px`, icon badge (44px, translucent-white
  circle on a tinted card background) + title/detail stack + chevron. Grid:
  `44px minmax(0,1fr) 14px`. Hover: `translateY(-2px)` + subtle shadow.
- **Dashboard card**: white surface, `1px solid #dedfd9`, `22px` radius,
  `22px` padding, the raised shadow above. Heading is icon-tile (38px,
  11px radius) + title, `11px` gap.

## What this doesn't cover yet

Pages still on the newer token system (`studio-tokens.css`) — currently just
Simulation (`/flute-studio/embouchure`) — are being migrated toward these
values directly (hardcoded, not through tokens) rather than the reverse.
When touching Simulation again, pull numbers from this doc, not from
`studio-tokens.css`.

## Musical notation glyphs — never hand-draw these

Clefs, noteheads, accidentals, and other notation symbols must come from a
real glyph (the Unicode musical-symbol characters, e.g. `𝄞` treble clef,
`♯` sharp — see `StaffNote.tsx`) or a proper notation library. Do not
approximate them with hand-drawn SVG paths/circles — a freehand clef doesn't
read as an actual clef no matter how carefully its coordinates are tuned;
this was tried and reverted. If a glyph is positioned wrong, fix its
position/size, don't replace the glyph itself.
