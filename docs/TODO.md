# Cookie Flute Studio: to-do

Source triaged October 19, 2026. Open work, local implementations awaiting acceptance, and completed local history are separated below. The full idea bank is in [COOKIE-TODO-UPDATED.md](COOKIE-TODO-UPDATED.md).

This audit does not establish deployment status. Project policy is local edits and local testing only; the user handles Cloudflare Pages deployment. Source presence and passing automated tests do not complete iPhone, iPad, Pencil or real-flute checks.

## Session maintenance result (October 19, local)

- Lint reduced from **7 errors / 34 warnings** to **0 errors / 25 warnings**. Remaining effect-dependency debt is open, not “cleanup complete.”
- `npm test` passed the production build and **226 tests**. Added 14 pitch/segmentation/trace behavior tests and repaired two existing test loaders. The same-millisecond deadline regression now passes in the existing source.
- [COMPONENTS.md](../app/flute-studio/COMPONENTS.md) now identifies stale references, available shared components, and unresolved design-document conflicts. No global restyle was approved by the audit.
- Review details and remaining maintenance work: [MAINTENANCE-2026-10-19.md](MAINTENANCE-2026-10-19.md).

## 1. Check on a real iPhone, iPad and flute (while practising)

The previous note recorded user deployment through October 11. That is historical context, not a current deployment check. All checkboxes here remain open until tested on the named device.

- [ ] **Metronome stays loud after using the mic** (new audio context when the last mic closes, October 11).
- [ ] **Pencil:** a resting palm no longer starts text selection; with Apple Pencil only, the Pencil no longer scrolls the page.
- [ ] **Count-in:** one pill per counted bar, subdivision ticks, and the pills stay under the toolbar while the score is scrolled.
- [ ] **Selection pill:** sits above the bars' highest note; drag it anywhere on the pill.
- [ ] **Pitch on iPad:** soft and held notes, the mic level, the pitch tendency test numbers.
- [ ] **Recording** on iPhone: record, keep, save to device.
- [ ] **Move to another device:** code and file, iPhone to iPad and back.
- [ ] **Long tones with a real flute:** repeats, breathing and restarting, moving between groups.
- [ ] **Theory lessons 3 and 4 on iPad** (finger and Pencil), and in Chinese.
- [ ] **Köhler book:** reading and progress on iPad; the page total changing after a turn on phone.
- [ ] **Close-up (October 15, local):** music centred and same place in all three modes; Technique exercises as small cards;
  Rhythm in one screen (slim tap strip, result inside it, one-bar count-in explained), tap line like lesson 7, beat
  counts on one line, purple position line while tapping; display toggles redraw without blanking; Graph shows on.

## 2. Known problems

- [ ] **Remaining lint debt:** 25 warnings, mostly reader/notation effect dependencies. Audit effect ownership and callback stability before changing dependency arrays; verify playback, layout changes, unmount cleanup and saved preferences. Do not suppress them globally.
- [ ] **Dialog focus handling:** the shared `components/Dialog.tsx` handles Escape and backdrop dismissal, but has no shared focus trap or restoration. Preserve the roadmap's existing focus handling if consolidating its custom dialog.
- [ ] **Component documentation conflicts:** reconcile typography, card borders and selection-color rules identified in COMPONENTS.md before a broad visual cleanup. Historical measurements are not current computed-style evidence.

- [ ] **Tempo pill would not change in full screen** (iPad, 2026-10-10, not reproduced). Likely Safari's full-screen × sitting over the toolbar; touch devices no longer use Safari full screen (2026-10-11), so recheck in focus mode.
- [ ] **Phone CSS cleanup:** superseded rules in `studio-shell.css` (listed in the archived to-do); check at phone and tablet widths before deleting.

### Ticket: slurs cut through high notes (Arnold, Fantasy for Flute Solo)

- **Where:** `/flute-studio/music/malcolm-arnold-fantasy-for-flute-solo`, XML view, bars **39, 51, 99, 130, 138**.
  Private piece: unlock from the gear menu, Private music (code in `.private-music/access-code.txt`, local only).
  Source score: `.private-music/originals/malcolm-arnold-fantasy-for-flute-solo-…/score.musicxml`. Slur settings:
  `components/ScoreViewer.tsx` (`SlurNoteHeadYOffset`); close-up in `components/PracticeNotation.tsx`.
- **Problem:** over runs that climb high, the slur arc is too flat and crosses noteheads and stems.
- **Desired:** the arc clears the highest note under it (about one staff space, like OSMD elsewhere); ends stay on the
  first and last notes; **only slurs that hit a note change**, every other slur in every piece stays exactly as is.
- **Rules:** preserve a local before/after patch or snapshot; no commit without explicit current-session authorization (AGENTS.md overrides the old “commit first” note). No app-wide change to OSMD slur settings (that broke the last two tries).
- **Local implementation found October 19:** `components/slurClearance.ts` is called by ScoreViewer after rendering and during export. Acceptance is still open: this source audit does not establish that only colliding slurs change or that the five named bars are correct. Do not start another competing implementation before reviewing this one.
- **Done when:** the five bars look right on desktop and iPad; a before/after record of every slur shape across all
  pieces shows only the colliding ones changed; close-up, page mode and PDF export still draw correctly.
- **Out of scope:** ties, tuplet brackets, PDF excerpts. **Budget:** one attempt; if it fails, roll back and park.

## 3. Next, decided

- [ ] **Fancier tuner, metronome and drone** (October 21): their cards get options: choose the click sound and accents, choose the drone sound, tuner calibration (A = 440, 442, 443 and so on).

- [ ] **Tempo word without a metronome mark** (Moderato, Allegro): use the word's usual speed range. Needs a rule first.
- [ ] **Personal settings:** design what is remembered globally, per saved set and per exercise, then build.

## Built locally, acceptance still open (source checked October 19)

- [ ] **Score following:** `components/useScoreFollow.tsx` is integrated in ScoreViewer and provides Resume following. Verify page and scroll modes, manual browsing, resume direction, and the distinction between cursor-driven click-track playback and the steady metronome, which should not scroll.
- [ ] **Beginner rhythm drills:** `/flute-studio/rhythm-drills` contains ten seeded levels and reuses lesson 7's RhythmPractice. Verify phone engraving, English/Chinese instructions, attempt grading, reload/share seed behavior and completion. Any endless-mode expansion remains separate work.
- [ ] **Fingering and trill charts:** both now use `fingerings/NotePicker.tsx` for octave selection and note choices. Recheck the original phone concerns: notation size, alignment, scrolling and button usability. Source presence does not close those checks.
- [ ] **Breathing Lab and embouchure:** local revisions exist in their page, model and CSS files. Verify the controls at phone widths, Shorter inhale reachability, and animation behavior. The passing model tests do not prove the visual redesign is accepted.

## Metronome and rhythm, ideas for later (October 9, 2026)

- [ ] **Advanced metronome** (keep the current one simple): choose the click note (quarter, eighth, dotted quarter) so a
  slow piece counted in eighths doesn't need maths; subdivisions; accent any beat; silent beats (e.g. 1, rest, 3, 4).
  A tools-panel version can follow a piece's mixed meter too.
- [ ] **Rhythm sticks option**: show every beat (now) or every eighth.
- [ ] **Close-up rhythm extensions:** the current `components/RhythmTap.tsx` already has audio-clock count-in, tempo-dependent timing, keyboard/pointer tapping and `gradePassage` feedback. Keep its device acceptance check above. Still proposed: simplify tied rhythms, tap subdivisions through rests, and a subdivision guide. No invented spoken mnemonics; students learn by tapping and listening.
- [x] **Count-in accent** fixed 2026-10-09: the first count-in click was booked a render late and dropped, so the accent seemed to move. Playback now books count-in clicks itself with the metronome's sound (`bookClick` in PracticeAudio.tsx).

## Low priority, from the October 11 iPad session

- [ ] **Clear practice history by month** on Sync devices (the Stored on this device card deletes whole groups today).
- [ ] **Excerpt tempo and tally on XML pages beside the printed tempo mark** (now in the page's top-left corner).
- [ ] **More excerpt XML:** passages of the same symphony that only have the printed page.

## Phone pass (October 11): to prioritise

- [ ] **Customize scales panel:** many buttons without clear grouping, and the chosen options use a bigger font than the tabs.
- [ ] **Library status chips** (Want to learn / Working on / Learned): grey capsules with a dot stand out on the phone; find a cleaner look (not black, not plain white).
- [ ] **Breathing Lab:** verify the local revision against the original in-animation-control and Shorter inhale scrolling issues; see the local acceptance list.
- [ ] **Fingering chart on phone:** verify the implemented octave picker against the original notation-size, centering and scrolling complaints; see the local acceptance list.
- [ ] **Trill chart on phone:** recheck notation size and scrolling with the shared octave picker; see the local acceptance list.
- [ ] **Body and embouchure page:** review the local redesign before deciding whether further design work is needed (low traffic).
- [ ] **Theory lessons on phone:** not yet tested.
- [ ] **Toolbar icon spacing per page** (Scale Studio, Long Tones, pieces with piano): left as is for now; revisit with a list of each page's toolbar.
- [ ] **Running practice clock on phone:** made compact (October 14) but four tabs plus a running clock still do not fit at 375px. Decide: shorten a tab label, hide the stop square while running (stop from the clock's panel), or let the tabs scroll.

## Completed local history (not deployment evidence)

### October 14

- [x] **Scales in this piece ›** under a piece's title: opens Scale Studio with exactly the scales and arpeggios its runs use (harmonic and melodic minor kept apart, diminished sevenths as the diminished arpeggio).
- [x] **Practice calendar counts tallies** (a rep as half a minute), so tally-only days are shaded and tappable.
- [x] **Count-in pinned under the toolbar**, so it stays in view while the score is scrolled.
- [x] **Bar numbers in a fixed lane** just above the staff (they floated over high passages, Leonore bar 3).
- [x] **Tempo returns to your starting number** when Follows-the-music playback stops.
- [x] **Tapping a shaded tricky bit selects all its bars**, so its tools and Steady click follow those bars.
- [x] **Score title on two lines:** composer and work share one grey serif line; Scales in this piece moved into View.
- [x] **Two pages on a narrow window** falls back to the normal single page (it showed 16 nearly empty pages).

## 4. Decided for later

- [ ] **Studio home and overall UI rework** (October 25): Haylie doesn't like how the cards and layout feel, on the home page and across the studio. Needs a deliberate planning session first (what the home is for, card system, layout, visual language) before any build; not a worker task.

- **Theory lessons:** done for now (reviewed in another thread); LESSONS.md keeps the plan if it resumes.

- [ ] **Auto-logging practice:** count time with a piece or exercise open while you play. Waits for clear rules (idle time, a tab left open).
- [ ] **Recordings list in My Studio:** waits for sync so recordings are not dependent on browser-local storage. Browser storage retention is not guaranteed; the earlier blanket seven-day claim is not a verified requirement.
- [ ] **Sign-in and sync between devices:** today only the manual code or file move exists.
- [ ] **Composer cards** for pop, K-pop and folk pieces: decide whether they get one.

## From the October 19 to 23 build sprint (local, not deployed)

- [ ] **Cat host copy approval** (/lab/home-1), then decide when it replaces the live home page. Drop the unused Geist font preload first.
- [x] **Tempo ladder end tempo:** keep the last tempo (decided October 25; already how it works).
- [ ] **Real-device checks:** mock audition recording, offline sheet music on iPad, new tool sounds, score-following swipes.
- [x] **/lab/cat-host** (Codex): deleted October 25 (moved to the Trash).
- [x] **NEC framing:** "master's in flute performance" everywhere (October 25).
- [ ] **Paused experiments, no code yet:** sight-reading generator, blind intonation and attack map, warm-up melodies, breath budget, tendency test extras, markup manager, overtone playground, memory mode, interval X-ray, recommend me a piece.
