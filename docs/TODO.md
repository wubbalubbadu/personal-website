# Cookie Flute Studio: to-do

Updated October 15, 2026. Only open items. Everything built locally and not yet deployed is marked so. The full idea bank
(and the older per-session notes) is in [COOKIE-TODO-UPDATED.md](COOKIE-TODO-UPDATED.md); pick ideas
from there when you want something new, then move them here.

## 1. Check on a real iPhone, iPad and flute (while practising)

Deployed by you through October 11. Built since then (October 11 to 14) is local until the next deploy.

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

Lint cleanup is complete locally: 0 errors, 28 warnings remain. Intentional hydration and interactive-canvas exceptions are documented beside the code.

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
- **Rules:** commit first as a revert point; no app-wide change to OSMD slur settings (that broke the last two tries).
- **Approach:** after drawing, find slurs whose arc crosses a notehead or stem; redraw only those, raised.
- **Done when:** the five bars look right on desktop and iPad; a before/after record of every slur shape across all
  pieces shows only the colliding ones changed; close-up, page mode and PDF export still draw correctly.
- **Out of scope:** ties, tuplet brackets, PDF excerpts. **Budget:** one attempt; if it fails, roll back and park.

## 3. Next, decided

- [ ] **Score following** (from the reader redesign): follow the playing bar in page and scroll modes; stop following when you browse, with Resume following; metronome-only playback never moves the score.
- [ ] **Tempo word without a metronome mark** (Moderato, Allegro): use the word's usual speed range. Needs a rule first.
- [ ] **Personal settings:** design what is remembered globally, per saved set and per exercise, then build.

## Metronome and rhythm, ideas for later (October 9, 2026)

- [ ] **Advanced metronome** (keep the current one simple): choose the click note (quarter, eighth, dotted quarter) so a
  slow piece counted in eighths doesn't need maths; subdivisions; accent any beat; silent beats (e.g. 1, rest, 3, 4).
  A tools-panel version can follow a piece's mixed meter too.
- [ ] **Rhythm sticks option**: show every beat (now) or every eighth.
- [ ] **Rhythm tapping in close-up: first version built 2026-10-10** (close-up Rhythm mode, `RhythmTap.tsx`). Still to come: In a close-up, tap the selected bars' rhythm as a game: count-in, slow-down (tempo pill), graded like lesson 7's practice (gradeTaps, 0.1 s window, orange for off). Any key counts as a tap (alternate keys or fingers for fast figures like septuplets); on iPad any finger anywhere on the pad. Later layers: simplify a tied rhythm (break ties), tap the subdivisions through rests, a guide for feeling the subdivision. No made-up words ("Mississippi strawberry pie") since they don't work for Chinese students; learn by tapping and listening.
- [ ] **Beginner rhythm drills.** A set of 10 tapping exercises, generated fresh each time and getting harder, "how many can you pass"; reuses the lesson 7 practice interface. For students, not the user.
- [x] **Count-in accent** fixed 2026-10-09: the first count-in click was booked a render late and dropped, so the accent seemed to move. Playback now books count-in clicks itself with the metronome's sound (`bookClick` in PracticeAudio.tsx).

## Low priority, from the October 11 iPad session

- [ ] **Clear practice history by month** on Sync devices (the Stored on this device card deletes whole groups today).
- [ ] **Excerpt tempo and tally on XML pages beside the printed tempo mark** (now in the page's top-left corner).
- [ ] **More excerpt XML:** passages of the same symphony that only have the printed page.

## Phone pass (October 11): to prioritise

- [ ] **Customize scales panel:** many buttons without clear grouping, and the chosen options use a bigger font than the tabs.
- [ ] **Library status chips** (Want to learn / Working on / Learned): grey capsules with a dot stand out on the phone; find a cleaner look (not black, not plain white).
- [ ] **Breathing Lab:** the in-animation controls (Cycle, Flower & balls, Body, Embouchure) are an older style; Shorter inhale still needs scrolling.
- [ ] **Fingering chart on phone:** notation too small, things off-centre, old button style, too much scrolling. Idea: pick an octave, show the note on the staff, not every button at once.
- [ ] **Trill chart on phone:** notation slightly small; still a lot of scrolling.
- [ ] **Body and embouchure page:** fonts, interaction and look all need a redesign (low traffic).
- [ ] **Theory lessons on phone:** not yet tested.
- [ ] **Toolbar icon spacing per page** (Scale Studio, Long Tones, pieces with piano): left as is for now; revisit with a list of each page's toolbar.
- [ ] **Running practice clock on phone:** made compact (October 14) but four tabs plus a running clock still do not fit at 375px. Decide: shorten a tab label, hide the stop square while running (stop from the clock's panel), or let the tabs scroll.

## Done October 14 (local, deploy to use)

- [x] **Scales in this piece ›** under a piece's title: opens Scale Studio with exactly the scales and arpeggios its runs use (harmonic and melodic minor kept apart, diminished sevenths as the diminished arpeggio).
- [x] **Practice calendar counts tallies** (a rep as half a minute), so tally-only days are shaded and tappable.
- [x] **Count-in pinned under the toolbar**, so it stays in view while the score is scrolled.
- [x] **Bar numbers in a fixed lane** just above the staff (they floated over high passages, Leonore bar 3).
- [x] **Tempo returns to your starting number** when Follows-the-music playback stops.
- [x] **Tapping a shaded tricky bit selects all its bars**, so its tools and Steady click follow those bars.
- [x] **Score title on two lines:** composer and work share one grey serif line; Scales in this piece moved into View.
- [x] **Two pages on a narrow window** falls back to the normal single page (it showed 16 nearly empty pages).

## 4. Decided for later

- **Theory lessons:** done for now (reviewed in another thread); LESSONS.md keeps the plan if it resumes.

- [ ] **Auto-logging practice:** count time with a piece or exercise open while you play. Waits for clear rules (idle time, a tab left open).
- [ ] **Recordings list in My Studio:** waits for sync, so takes are not lost when a browser clears its data (Safari clears site data after about 7 days unused).
- [ ] **Sign-in and sync between devices:** today only the manual code or file move exists.
- [ ] **Composer cards** for pop, K-pop and folk pieces: decide whether they get one.
