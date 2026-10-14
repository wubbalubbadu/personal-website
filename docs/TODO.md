# Cookie Flute Studio: to-do

Updated October 7, 2026. Only open items. Everything built locally and not yet deployed is marked so. The full idea bank
(and the older per-session notes) is in [COOKIE-TODO-UPDATED.md](COOKIE-TODO-UPDATED.md); pick ideas
from there when you want something new, then move them here.

## 1. Deploy, then check on a real iPhone, iPad and flute

Built and checked in the desktop browser only. The preview has no microphone, so nothing that listens has been tried.

- [ ] **Deploy** the local work (you deploy via Cloudflare Pages). Includes the private-music fix: the access code is now kept on the device, so you enter it once (it used to be forgotten each browser session).
- [ ] **Cookie pet hidden locally:** the pet is unmounted, disabling its separate focus timer. Code and saved data are preserved for a future role. Desktop browser confirms the pet is absent and lesson instructions remain usable.
- [ ] **Chinese reader tooltips built locally:** glossary, keys, meter and tempo translations pass automated tests; visual/device review remains pending.
- [ ] **Practice clock (new):** the clock button in the top bar and the reader's top bar; Today's practice on My Studio; "Save this practice?" with a note; deleting a session and Undo. Check the top bar still fits on a phone with the extra button.
- [ ] **My Studio redesign (new):** shelf, calendar with day panel, pitch map with square cells, at phone and iPad sizes.
- [ ] **Theory lesson 4 (rebuilt):** all five steps on iPad with a finger and a pencil (drawing ♯ ♭ ♮), and in Chinese.
- [ ] **Theory lesson 3:** the 6/8 round and tap judging.
- [ ] **Pitch on iPad:** detection hears nothing or drops soft and held notes (fix in, unverified); the mic level ring; the pitch tendency test (tune its numbers after a real run).
- [ ] **Reader:** markup while playing (not reproduced); playback start like MuseScore; music terms easy to tap; pinch zoom; tempos remembered after reload; Arnold's tempos, accel./rit., dynamics; switching pieces stops the old one.
- [ ] **Phone layouts:** reader toolbar, Breathing Lab, charts, tools sheet (pull down to close).
- [ ] **Recording:** record, keep, save to device on iPhone.
- [ ] **Move to another device:** code and file, iPhone to iPad and back, Copy code in Safari.
- [ ] **Long tones with a real flute:** repeats, breathing and restarting, moving between groups.
- [ ] **Köhler book:** reading and progress on iPad; the page total changing after a turn on phone.

## 2. Known problems

Lint cleanup is complete locally: 0 errors, 28 warnings remain. Intentional hydration and interactive-canvas exceptions are documented beside the code.

- [ ] **Tempo pill would not change in full screen** (iPad, 2026-10-10, not reproduced). Likely Safari's full-screen × sitting over the toolbar; touch devices no longer use Safari full screen (2026-10-11), so recheck in focus mode.
- [ ] **Bar numbers sit very high** over high notes (Leonore 3, bar 3): the engraver places the number above the highest note; consider a fixed lane just above the staff.
- [ ] **Slurs cut through high runs** (Arnold bars 39 and 51): the arch should follow the highest note under it.
- [ ] **Phone CSS cleanup:** superseded rules in `studio-shell.css` (listed in the archived to-do); check at phone and tablet widths before deleting.

## 3. Next, decided

- [ ] **Theory lessons:** continue the course plan in `app/flute-studio/theory/LESSONS.md` (next: rests, key signatures, dots and ties, smaller beats). Move lesson 2 onto `EngravedRow` like lessons 3 and 4.
- [ ] **Lesson 4 polish:** the matching step's keyboard is small; B and C (no black key between) is only mentioned in narration, not shown.
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
- [ ] **Tempo pill returns to your starting number** after Follows-the-music playback stops (it stays on the last section's tempo).
- [ ] **Opening a saved tricky bit selects its bars**, so Steady click counts in their time signature.
- [ ] **Excerpt tempo and tally on XML pages beside the printed tempo mark** (now in the page's top-left corner).
- [ ] **Close-up notation about 1.5× the score**, drawn once at its final size (no visible resize).
- [ ] **More excerpt XML:** passages of the same symphony that only have the printed page.
- [ ] **Verify on iPad while practising:** metronome stays loud after the mic; Pencil (palm, and Pencil-only not scrolling); count-in pills and subdivision; selection pill placement and drag.

## Phone pass (October 11): to prioritise

- [ ] **Customize scales panel:** many buttons without clear grouping, and the chosen options use a bigger font than the tabs.
- [ ] **Library status chips** (Want to learn / Working on / Learned): grey capsules with a dot stand out on the phone; find a cleaner look (not black, not plain white).
- [ ] **Breathing Lab:** the in-animation controls (Cycle, Flower & balls, Body, Embouchure) are an older style; Shorter inhale still needs scrolling.
- [ ] **Fingering chart on phone:** notation too small, things off-centre, old button style, too much scrolling. Idea: pick an octave, show the note on the staff, not every button at once.
- [ ] **Trill chart on phone:** notation slightly small; still a lot of scrolling.
- [ ] **Body and embouchure page:** fonts, interaction and look all need a redesign (low traffic).
- [ ] **Theory lessons on phone:** not yet tested.
- [ ] **Toolbar icon spacing per page** (Scale Studio, Long Tones, pieces with piano): left as is for now; revisit with a list of each page's toolbar.
- [ ] **Running practice clock on phone** widens and covers the tabs.

## Ideas for later (October 14)

- [ ] **Related scales for a whole piece:** like the close-up's "G major (or E minor)" but for the full score. Options discussed: one Scale Studio set of every key the piece uses, a section-by-section key list linking to Scale Studio, and/or scales limited to the piece's own range. Decide where it opens from and what it produces.

## 4. Decided for later

- [ ] **Auto-logging practice:** count time with a piece or exercise open while you play. Waits for clear rules (idle time, a tab left open).
- [ ] **Recordings list in My Studio:** waits for sync, so takes are not lost when a browser clears its data (Safari clears site data after about 7 days unused).
- [ ] **Sign-in and sync between devices:** today only the manual code or file move exists.
- [ ] **Composer cards** for pop, K-pop and folk pieces: decide whether they get one.
