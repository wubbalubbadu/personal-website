# Open decisions, waiting on Haylie

Collected Nov 6, 2026 from `docs/TODO.md` and the notes in `docs/.applied-patches/*.md`. Each line names its source, so you can open the detail. Priority is a suggestion: **High** means it blocks other work or you notice it every session; **Medium** means it's visible but not blocking; **Low** is tidy-up.

Not in here: real-device checks (TODO section 1). Those need you with an iPad and a flute, but they're tests, not decisions.

## 1. Direction (decide these first, other items wait on them)

| # | Decision | Priority | Source |
|---|---|---|---|
| 1 | **Studio home:** 2x2 look A, B or C, the middle path, or keep cards. Then: Tools or Learn as the fourth square, and whether returning players see their own pieces under each square | High | `home-2x2-notes.md`, lab NOTES, TODO §4 |
| 2 | **Studio UI rework** beyond the home (card system, layout, visual language). Needs a planning session with you, not a worker | High | TODO §4 |
| 3 | **Landing page:** Cat host (`/lab/home-1`) or the 3D handheld (`/lab/handheld-3d`), and approve the Cat host copy before it replaces the live home | High | TODO "build sprint", `LAB-STATUS.md` |
| 4 | **3D handheld cartridges:** each plays a mini demo, or drop them. Plus one pick each for hologram look, power-on and click sound | Medium | TODO "3D handheld" |
| 5 | **Phone navigation:** still undecided. Several phone fixes wait on it: 32px header icons, the running clock not fitting at 375, "Learn" cut to "Lear" at 320 | Medium | r6-phone, k-breathing, TODO phone pass |

## 2. Colour and selected states

| # | Decision | Priority | Source |
|---|---|---|---|
| 6 | **Make every "selected" state purple?** Currently green in the tools panel (drone notes, Accent), dark in Breathing Lab's pattern card and the tendency switch, light blue in the pitch close-up (maybe deliberate: blue is pitch) | Medium | r4-controls #2, r2-tools, r3-pitch-rhythm |
| 7 | **Library tag chips:** filled, weight 560, dark "All", versus COMPONENTS.md's quiet chips with no All | Medium | r4-controls #3 |
| 8 | **Library status chips on phone** (grey capsule with dot) stand out. Find a cleaner look, not black and not plain white | Low | TODO phone pass |
| 9 | **Old soft green buttons** (recorder Save, lesson Next, roadmap Mark, Rhythm Start, My Studio clock, Scale Studio Customize and Play): convert each when its page is next touched? | Medium | r4-controls #4 |
| 10 | **Gear menu chosen language:** purple fill wins, but another rule says "tick only" and no tick is drawn. Which one is meant? | Low | h3-transfer #2 |
| 11 | **Accompaniment trash turns red on hover** (the studio's trash only does that when armed) | Low | r4-controls #6 |

## 3. Size and layout

| # | Decision | Priority | Source |
|---|---|---|---|
| 12 | **Invalid `font:` shorthands in 9 places** have always rendered small (12px / 500). Fixing them makes tempo and rep pills, Library chips and others bigger and bolder, which is a visible change | Medium | r4-controls #1 |
| 13 | **Reader and Scale Studio tempo − and +** are 34px wide, locked by old `!important` rules. Widening needs another `!important` or a cleanup of those layers | Low | r1-landscape, r4 #5, m3 #3 |
| 14 | **Pitch map cells** are 36px (under 44). They would fit at 44px in portrait | Medium | r8-tendency |
| 15 | **"Your studio" on the home** is two screens down on iPad. Move it up? (Folds into decision 1) | Medium | h1-home-ipad #1 |
| 16 | **Book list in landscape** spans the full window, so the done tick is about 1100px from the title. Cap the width around 760px? | Low | r7-books |
| 17 | **My Studio lists** (Want to learn, Learned, Recently opened) keep an empty column when one list is empty | Low | h2-mystudio #1 |
| 18 | **Send and Receive cards** on Sync devices have uneven heights | Low | h3-transfer #1 |
| 19 | **Phone Theory home:** drawing above the words (twice as wide) instead of a left column | Low | e2-learn-phone |
| 20 | **Customize scales panel on phone:** many buttons without clear grouping | Medium | TODO phone pass |
| 21 | Smaller items: Rhythm drills title 30px vs 36px elsewhere; Tools 2x2 Drone card 22px taller than needed; "Op. 33, Book 1 No. 6" without composer | Low | r4 #7, h1 #2 and #3 |

## 4. Reader and keyboard

| # | Decision | Priority | Source |
|---|---|---|---|
| 22 | **Listen and Record swap places by width**, so Tab order is wrong on one of them. Pick one visual order for all widths | Medium | m3-reader-ipad #1, ipad-pass #1 |
| 23 | **Set `<html lang>` from the language setting** so VoiceOver reads Chinese with a Chinese voice. One line in the shared layout | Medium | m3-reader-ipad #2 |
| 24 | **Keyboard bar selection** (a bar cursor with arrows) for Play range, close-up and tricky bits. This is a feature, not polish | Low | m-reader-keys |
| 25 | **Phone Köhler reader header** is 13px too wide (gear past the edge at 375) | High (phone) | ipad-pass #2 |

## 5. Theory lessons (principles check)

| # | Decision | Priority | Source |
|---|---|---|---|
| 26 | Does a single picker count as one control? If yes, write it into principle 12, and five steps stop breaking it | Low | e3 #5 |
| 27 | Lesson 6 step 2 teaches position and length at once | Medium | e3 #6 |
| 28 | Lesson 1 step 9 changes by itself on a timer. Lesson 1 step 12 "Free play" has no idea attached | Low | e3 #7, #8 |
| 29 | "0.5 beat" or "halfway through a beat" in lesson 7 | Low | e3 #9 |
| 30 | Update the course map where it drifted (lessons 3 and 7) | Low | e3 |

## 6. Behaviour found by tests (bugs with a suggested fix; say go)

| # | Decision | Priority | Source |
|---|---|---|---|
| 31 | **Transposing a piece with a hand-set drone can crash the drone** (E♯, B♯, C♭, F♭ have no frequency). Reachable today on Daphnis | High | t-tests finding 5 |
| 32 | Melodic minor in "Low B to high D" goes below the flute's range (C and D melodic minor reach B♭3) | Medium | t-tests finding 3 |
| 33 | A narrow custom range can let one note outside it | Low | t-tests finding 4 |
| 34 | rit./accel. in a "2+2+3/8" bar lands at the bar's end | Low | t-tests finding 1 |
| 35 | Three exercises are "featured" though the type says keep it to one. Change the data or the comment? | Low | t-tests finding 2 |
| 36 | Pinned on purpose, confirm they're what you want: empty hand-set drone means no drone; transfer ties go to the imported code; no flute-range cap on interval forms | Low | t-tests "pinned" |

## 7. Features waiting on a rule or a design

| # | Decision | Priority | Source |
|---|---|---|---|
| 37 | **Tempo word without a metronome mark** (Moderato, Allegro): which speed range per word | Medium | TODO §3 |
| 38 | **Personal settings:** what is remembered globally, per saved set, per exercise | Medium | TODO §3 |
| 39 | **Auto-logging practice:** rules for idle time and a tab left open | Low | TODO §4 |
| 40 | **Sign-in and sync,** which also unblocks a Recordings list in My Studio | Low | TODO §4 |
| 41 | **Composer cards for pop, K-pop and folk:** yes or no | Low | TODO §4 |
| 42 | **Advanced metronome** (click note, accents, silent beats) and rhythm sticks every eighth | Low | TODO metronome ideas |
| 43 | **Paused experiments:** sight-reading, blind intonation, warm-up melodies, breath budget, markup manager, overtone playground, memory mode, interval X-ray, piece recommender. Which, if any, come back | Low | TODO build sprint |
| 44 | **PDF excerpts load ScoreViewer anyway** (85 KB). Lazy loading risks a blank flash; try on a real iPad first? | Medium | q2-perf #1 |
| 45 | **404s for five CSS-only modules on every studio page** (vinext quirk). Worth a look before launch | Medium | q2-perf #2 |
| 46 | **"Orchestral excerpts" became "Excerpts"** in the Library chips. Keep it, or undo (one string)? | Low | q1-density |

## Suggested order

1. Decisions 1 to 3 in one sitting (home, UI rework scope, landing). Many layout items in section 3 depend on them.
2. Say go on 31 (drone crash) and 25 (phone Köhler header). They're bugs, not taste.
3. Decision 6 (purple everywhere) and 12 (font shorthands), with a quick before/after.
4. The rest as each page is next touched.
