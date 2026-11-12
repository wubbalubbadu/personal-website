# Lab status

One row per `app/lab` route in the main checkout, as of Nov 6, 2026. "Last changed" is the newest file date in the folder (git date in brackets when it differs or the folder is uncommitted). "Linked" means `app/lab/LabIndex.tsx` lists it. "Next step" is a suggestion only.

| Route | What it is | Last changed | Linked | Suggested next step |
|---|---|---|---|---|
| `/lab/home-1` | Cat host: the page is a PSP style handheld, its screen is the cat's studio, with the intro and links around it | Nov 4 (git Nov 3, uncommitted edit in `CatHost.tsx`) | Yes | The current favourite landing. Decide whether it goes live on the home page |
| `/lab/home-1b` | The same Cat host page on a Game Boy style portrait handheld | Oct 25 | Yes | Retire once home-1 vs handheld-3d is settled |
| `/lab/home-2` | Memory card: a PS1 memory card screen, one save block per thing she makes | Oct 20 (git Oct 25) | Yes | Archive (unlink) if Cat host is the direction |
| `/lab/home-3` | Staff of notes: one line of music, each note a link that plays | Oct 20 (git Oct 25) | Yes | Archive (unlink) if Cat host is the direction |
| `/lab/handheld-3d` | Her own pink console in three.js, the live cat on its screen, dialogue as a hologram above | Nov 6 (uncommitted) | Yes | Pick it or home-1 as the landing centrepiece. Then commit the folder |
| `/lab/landing-texture` | Three craft passes on the live Cat host: retouched plastic, on a desk, power-on by tuning to A | Nov 5 (uncommitted) | Yes | Pick a pass (or none) and fold it into whichever handheld wins |
| `/lab/mascot` | Cookie in 3D: the PS1 style cat / cookie with the Animalese voice (Oct 20 work) | Oct 24 (git Oct 25) | No | Keep as the mascot's test bench. Its engine now lives in `_kit` and feeds the handhelds |
| `/lab/articulation` | See your articulation: record or open a phrase, see its loudness shape, then any note close up; keep a take to compare | Nov 5 (uncommitted) | No | Try it with a real recording. If useful, decide where it belongs in the studio (Tools or Long tones) |
| `/lab/raindrops` | Each played note falls as a drop on a dark pond, 4:5 canvas for phone sharing, with a blind look test | Nov 5 (git Nov 3, uncommitted edits, two files deleted) | No | Linked to the concert visuals idea. Review the uncommitted rewrite before it gets lost |
| `/lab/nope-jar` | Nope Jar: a tap jar that counts money not spent (prices are rough guesses to edit) | Nov 1 (git Nov 3) | No | Personal toy, not landing work. Leave unlinked or move out of the lab |
| `/lab/studio-home-study` | Codex's three studio home containers: quiet cards, open page, one big preview | Oct 28 | No | Superseded by the 2x2 mockups. Delete once a home direction is picked |
| `/lab/studio-home-claude` | Studio home as a method book contents page, one music stand demo | Oct 28 | No | She found it too niche. Delete once a home direction is picked |
| `/lab/studio-home-tool` | Studio home as the tool itself: stand tools, a live Scale Studio panel, Library search | Oct 28 (git Nov 3) | No | Superseded by the 2x2 mockups. Delete once a home direction is picked |
| `/lab/studio-home-2x2` | Studio home as one 2x2 (Music, Scale Studio, Long tones, At the stand), looks A, B, C | Nov 5 | Yes, via its patch | Not in the main checkout yet: apply `docs/.applied-patches/studio-home-2x2.patch`. Read `home-2x2-notes.md` and pick A, B or C |

`app/lab/_kit` is shared code (mascot engine, sprites), not a route.

## Housekeeping worth doing together

- Five folders are uncommitted (`articulation`, `handheld-3d`, `landing-texture`, and edits in `home-1`, `raindrops`). Commit them before any cleanup so nothing is lost.
- The three old `studio-home-*` studies can go in one pass once the 2x2 decision is made.
- LabIndex calls itself "Home page experiments" but now mixes landing pages and a studio page. If the studio studies stay, a second heading would help.
