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

## 4. Decided for later

- [ ] **Auto-logging practice:** count time with a piece or exercise open while you play. Waits for clear rules (idle time, a tab left open).
- [ ] **Recordings list in My Studio:** waits for sync, so takes are not lost when a browser clears its data (Safari clears site data after about 7 days unused).
- [ ] **Sign-in and sync between devices:** today only the manual code or file move exists.
- [ ] **Composer cards** for pop, K-pop and folk pieces: decide whether they get one.
