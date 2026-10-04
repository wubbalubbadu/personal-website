# Cookie app: updated to-do list

Historical context: [September 26 retrospective and original notes](history/2026-09-26-cookie-retrospective.md).

Updated September 26, 2026 from the pasted notes and current local source, including work in progress, and again on September 28 with the navigation, tools, book and pitch-test work from that session (see "Built September 28" and "Ideas from the September 28 session"). This is a source audit, not confirmation that every feature works on the deployed site or on iPad. The older BACKLOG.md is historical context. September 30 product direction and exploratory ideas were added from the later pasted discussion, without a new source audit. Items below are grouped, not a new priority decision.


## October 3 reader and phone follow-up

- Implemented: stop old playback when switching etudes by remounting the reader; collapse markup into evenly spaced columns while preserving expanded layout; plain All keys/Clear actions and filled selected phone choices; consistent phone arrow glyph sizes; preserve Tap’s joined pill shape on hover; suppress the duplicate drone tooltip while armed; Auto drone uses play/pause rather than another speaker; reserve more engraving space before Tone Lab end repeats.
- Local verification: production build and 32 reader/scale/tone tests pass. Phone-width preview confirms All keys selects every key, Clear deselects every key, and selected choices keep their filled background. Visible opening Tone Lab groups have clearance before repeat signs. Physical iPhone/iPad verification remains open.
- [ ] Deferred: reproduce Köhler page total changing after a turn, including Safari toolbar height changes.
- [ ] Deferred design: Settings versus View styling; desktop label removal/metronome pill; decide whether Back to top belongs inside the page-navigation pill.
- [ ] Phone styling cleanup, review candidates before removal: studio-shell.css blocks around lines 292-313 (earlier phone transport); 595-598 (popover padding); 667-711 (superseded 40px sizes and spacing only, preserve structure/order); 726-728 (earlier second-row sizes); 746-752 (under-400px sizing duplicated by later all-phone rules); 755-777 (intermediate phone dimensions). Verify selectors at phone/tablet widths before deleting. No old rules removed in this pass.
- [ ] Compare expanded/collapsed markup on physical phone; confirm spacing, color targets and shared pencil sizing.

## Built September 29: reader fixes from Arnold's Fantasy

- [ ] **Tempo follows the page:** starts at the score's own mark (69, not the catalog's 70); the number counts the printed beat, so B reads 120 (♩.) and the metronome clicks dotted quarters there. Your speed is kept as a share of the printed one across sections.
- [ ] **accel. and rit. play:** Arnold's accel. poco a poco (bars 16–17) speeds up smoothly into B, and the rit. at 74 slows into Allegro marziale. Where a score is vague, the end is: a dashed line if drawn, else the next tempo mark (within 8 bars for accel., 4 for rit.), else a tempo / a rehearsal mark / a double bar, else 4 or 2 bars at about ±25%; a rit. with no target holds until "a tempo". The metronome clicks on the same bending beats.
- [ ] **Dynamics are audible:** pp to ff now spans about 29 dB (was 9), hairpins included. **Grace notes play** just before their main note.
- [ ] **Pausing** quiets the metronome until Listen or Metronome is pressed again (no free-running click in the wrong tempo).
- [ ] **Playback cursor:** a purple line moves through the music, reaching each note as it sounds; the page follows it. Notes are no longer coloured red.
- [ ] **Stems reach the middle line** on every score, so high runs keep their beams on the staff.
- [ ] **Tap a bar while listening** jumps playback there; Pause and Play resume where you stopped.
- [ ] **Drone on:** tap a note to drone it, anywhere else in the bar to select the bar.
- [ ] **Smoother scrolling on long pieces;** the header no longer tucks away on desktop and iPad (phone keeps it).
- [ ] **Markings:** tempo headings bold as one ("Andante con moto"); loco, ritmico, expressivo explained.
- [x] Tempo mark at F no longer collides (rehearsal boxes and ♩ = n marks are placed clear of the words in every piece).
- [ ] **Saved sets (September 30):** Restore defaults clears the set name; after opening a set and changing it, **Save new** sits beside Update so a different set never overwrites the old one. Verify on iPad.
- [ ] **Copy code (Move to another device)** failed on iPhone: Safari needs the clipboard write inside the tap. Now uses a ClipboardItem with the pending code. Verify on iPhone.
- [ ] **Next low-hanging items:**
  - **Meter change with the same tempo** (4/4 to 6/8): keep the eighth notes the same length and regroup the metronome clicks.
  - **A new tempo word with no ♩ = n** (Moderato, Allegro…): move to that word's usual speed from the glossary (textbook ranges only, never a wild jump).
  - ~~The two failing tests~~ fixed September 30: both were stale expectations (the embouchure model gained a surrounding-air layer; the lesson tone's onset is fuller but still click-free), now checked by intent. 75 of 75 pass.
  - **A held note swelling under a hairpin** is a bigger job.
- [ ] **Slurs cut through high runs** (Arnold bars 17, 19, 24): the even-arch reshape lifts a slur at most 4 spaces, so a long slur over a run that climbs to high notes crosses the noteheads. Fix: let the arch follow the highest note under it (an asymmetric curve, or raise the control points over the peak), as engravers do.

## Small fixes September 30

- [x] **Breathing Lab Chinese:** completed remaining UI translations and adjusted the Start button/tempo row so the Chinese label fits. Local desktop preview checked.
- [x] **Backlog cleanup:** removed the stale failing-test entry and consolidated repeated saved-set and tempo notes. Older session context remains.
- [x] **Score tempo after reload:** save the user's speed as a ratio of the current printed tempo. Playback section changes update the reference without overwriting that preference. Verified Arnold at 46 after reload, B at 80 during playback, then 46 after another reload.
- [x] **Live tempo through accel./rit.:** the reader's number follows the audio scheduler's sampled ramp speeds, including rests, without changing scheduling or saving those automatic values as a preference. Acceleration observed in local preview.
- Chinese spot-check: theory cards and existing lesson narration/actions have bilingual text. Translated two shared accessibility labels found in the check (studio navigation and Cookie companion). This was not an exhaustive review of every exercise state.
- Validation: production build and all 78 tests passed; reader lint errors and project TypeScript errors predate these edits.
- [ ] **Device checks:** verify the translated layout and both tempo behaviors on iPhone/iPad. These changes are local, not deployed.

## Private practice library September 30

- [x] **Uploader visibility:** individual MusicXML pieces can be saved as Public library or Private practice. Private pieces are encrypted with the local access code before being included in the website.
- [x] **Settings unlock:** enter the code to reveal private pieces in the library, navigation and practice pages. Access lasts for the current browser tab; Lock removes the pieces and revokes their score URLs. English and Chinese controls are included.
- [x] **Personal scores:** Elysian Fields and Arnold’s Fantasy moved into the private library. Local originals are preserved outside the public files.
- [x] **Elysian upload failure:** repaired OSMD’s handling of very short invisible spacing notes, which caused “Invalid note initialization object: {}”. Original musical timing is preserved.
- Local validation: 80 tests and production build pass. Elysian Fields renders all 10 pages after unlocking and refresh; Lock removes the score. Both old Arnold MusicXML URLs return 404 locally. Existing project TypeScript errors remain.
- [ ] Publish and verify the locked library and old public score URLs on the deployed site. Earlier public downloads cannot be revoked.
- [ ] Check access and notation on physical iPhone/iPad. Private books and scanned excerpts are not supported by this upload option yet.

## Built September 28: verify on a real phone, iPad and flute

Built and checked in the desktop preview only. The preview cannot use the microphone, so nothing that listens has been tried with real playing.

- [ ] **Navigation:** desktop left rail (folds, opens to show Library saved music, Exercises and saved sets, Learn pages, Tools); phone slim top bar that slides away on scroll-down; iPad keeps the top bar. Check all three sizes.
- [ ] **Tools panel:** one panel with tuner, 12 drone notes and metronome, opened from the tuning-fork icon in every header. Phone: bottom sheet, pull down to close. Check the tuner and drones with a real flute, and that pulling the sheet down closes it on iPhone.
- [ ] **Pitch tendency test** (Tools, and a link in My Studio): range on a staff (drag or ±), tune both A's, chromatic up and down, retry unclear notes, heat map relative to your own tuning. Needs a real run. Tune these numbers afterwards: 1.5 s per note (0.5 s attack ignored), the 9 s skip, ±8¢ counts as off, 15¢ disagreement triggers a retry.
- [ ] **Köhler Op. 33 Book 1** as a book: one Library row, a book page with progress and Continue, "‹ 1 / 15 ›" in the reader. Check reading and progress on iPad.
- [ ] **Slurs** are redrawn as even arches with bounded height. Look through several pieces (Syrinx, Badinerie, the etudes) for any slur that now collides with notes.
- [ ] **Markings:** tempo words bold, expression words italic, glossary tooltips now work with trailing full stops ("Allegro."); 19 terms added. Spot-check other pieces.
- [ ] **Starting tempos** now come from each piece's marking (glossary BPM ranges). Check a few feel right.
- [ ] **Phone layouts:** Breathing Lab fits one screen and scrolls; fingering and trill charts are compact; score toolbar is two rows; reader settings open as a half-screen sheet. Check on iPhone.
- [ ] **Playback:** the green start-bar tint now hides while playing (addresses the "selected measure stays green" bug below); verify.
- [ ] **Pinch zoom in the reader** now works like zooming a photo: two fingers scale the whole page (notes, rhythm sticks, marks) and pan it, with no re-layout. Checked in a phone-size preview at 2×; try on iPhone and iPad, including drawing with the pencil while zoomed.
- [ ] **Refresh glitches:** the giant notation flash on Home is gone (card styles load with the studio), and the tools button and cookie no longer appear in the bottom-right corner (the cookie only shows in lessons now).
- [ ] **Lists instead of stars:** Want to learn, Working on, Learned. Tap + on a Library row (or the list button in a score's header, or on a book's page) to add to Want to learn, then pick another list from the menu. Library chips: All, the three lists, then the tags, all visible. My Studio, Home and the rail show your lists. Anything starred before moved to Want to learn. Scale Studio's star is now a "Save set" button. Check on phone and iPad.
- [ ] **Recording, phone style:** tap Record and only the button changes (pulsing red square and the time, no panel). Tap it again to stop: "Keep this recording?" with the take, Delete and Save to device (downloads an .m4a on iPhone). Needs a real device: the preview blocks the microphone.
- [ ] **Move to another device** (gear menu, top right, now also on phone; the "HW" avatar is gone): Copy code or Send as file, then paste or open it on the other device. Combines with what's there: practice history, pitch records, saved music and book progress from both devices are kept; settings take the code's values; screen layout (rail, reader zoom and page width, cookie position) stays per device. Pencil drawings are optional since they make the code long. Try phone to iPad and back, and a code sent through Messages or WeChat (line wrapping is ignored).

## Already implemented: remove from the build list

- Live pitch detection and long-tone pitch traces, with score-linked tracking and review.
- Long-tone group repeat controls and logic for restarting or moving between groups. Real playing still needs the checks below.
- Drone arming: tapping a score note starts a drone only when the drone is armed.
- Pencil-only mode and palm/contact rejection logic.
- Anchored annotations for new marks, plus editable text, sticky notes and a highlighter. Old bitmap ink still has a separate legacy path.
- Contextual key-signature explanations and fermata handling.
- Named scale sets, grouped scale books, and stored per-exercise scale tempos. Opening a saved set updates the save-name field.
- A practice routine checklist with links to pieces/exercises. This is not yet an automatic routine runner.
- Long-tone close-up mode. Extending it to ordinary pieces is a separate idea.

## Bugs from iPad testing (September 27, before sharing with family and friends)

Found while testing on iPad. Items marked *fixed, verify* were changed in code but could not be checked on a real iPad from the desktop.

- [ ] **Pitch detection hears nothing on iPad** *(fixed, verify)*. Likely cause: Safari only processes audio nodes that lead to an output, and the mic analyser was left unconnected, so it read silence. The analyser now feeds a muted gain to the speakers (`lib/useToneSession.ts`, `PracticeToolDock.tsx`). If it is still silent, the next suspect is the shared AudioContext being created before the mic at a different sample rate than the iPad microphone; try creating the mic graph on a context opened after `getUserMedia`. The Mic button now shows a live level ring, and after 2 seconds of pure silence the readout says the mic isn't sending sound, which tells these two cases apart.
- [ ] **Pitch detection still unreliable on iPad** (September 28): it may not pick up softer playing, and it doesn't keep going while you keep playing. Check the silence gate (`SILENCE_RMS` in `lib/pitch.ts`) against iPad mic levels, and whether the note segmenter stops following a held or repeated note.
- [ ] **Mic on/off was hard to see** *(fixed, verify)*: the Mic button now has a red ring that swells with the input level plus a pulsing dot while listening, and turns grey when paused.
- [ ] **Can't mark up while the score is playing** (reported again September 28: "no markup at playback"). Not reproduced yet. Nothing in `AnnotationLayer` checks playback, so suspects are things playback does to the page: page turns or scrolling that follow the playhead, or the marks layer being re-measured (`layoutVersion`) mid-stroke. Reproduce on iPad: start playback, open Mark Up, draw. If marking during playback should be off by design instead, grey the Mark Up tools while playing rather than silently ignoring strokes.
- [ ] **Playback selection like MuseScore.** The selected measure used to stay green during playback; since September 28 the tint hides while playing and returns when stopped, and the selection is kept so Play starts there again *(verify)*. Still wanted: MuseScore-style logic for choosing where playback starts and showing where it is now.
- [ ] **Music terms (mf, crescendo…) were hard to tap: the tap selected the bar instead** *(fixed, verify)*. Terms now accept a tap within about 14 px of the glyph, unless the tap is directly on a note.
- [x] **Breathing Lab Chinese** (September 30): exercise names, phase/cue text, sequence, controls, accessibility labels and loading/model fallback messages translated. Checked in the local desktop preview; phone/iPad verification remains.
- [ ] **Composer cards for the rest of the library.** Gluck and Rimsky-Korsakov were added. Pop, K-pop and folk pieces have no card; decide whether they should (artist notes, or nothing for "Traditional").
- [ ] **Theory lesson 3, Read and play:** the 6/8 round and the new tap judging (every tap must land near its own note) have not been tried on iPad.
- [ ] **Theory housekeeping:** move lesson 2 onto EngravedRow like lesson 3. (The temporary engraved-preview page is deleted.)

## Testing to-dos: existing work, not requests to rebuild

- [ ] **iPad regression pass:** write with a resting palm, tap notes with the drone off/on, edit and move annotations, and use settings controls with touch. Record a specific reproduction only if a problem remains.
- [ ] **Markup after layout changes (implemented; verify only):** change notation size, spacing and orientation; verify new annotations stay attached. Check legacy bitmap ink separately and check whether annotations appear in PDF exports.
- [ ] **Scale custom range and ending (implemented; verify only):** a custom range now overrides “starts on tonic,” and the held ending returns to the actual starting note without leaving the range. Verify several ranges above and below the tonic in Scale Studio.
- [ ] **Long-tone repeats with a real flute:** repeat a group, breathe and restart, then move to another group. Check same-pitch boundaries, quiet endings, noise and accidental pitch jumps. Do not use “100 cents off” alone as a jump rule.
- [ ] **Practice/session history:** test the existing experience before changing it. The earlier source audit found a history reader and session schema, but could not establish a working recording path while the timer was being removed. This is an observation to verify, not authorization to restore the timer or redesign session storage.
- [ ] **Remember tempos consistently:** score speed now persists as a ratio of the printed tempo (September 30), separately from automatic section changes. Arnold reload verified locally at 46 against the opening 69, including after playback reached B at 80. Check on iPhone/iPad; scale tempos already have separate persistence.
- [ ] **Saved sets verification:** check the September 30 Restore defaults / Save new changes on iPad (listed above), preset/custom switching, and custom range round-tripping. Whether reader view preferences belong to a set remains a design question.
- [ ] **Spacing controls:** retest note spacing with “start on a new line” enabled before treating it as an active bug.
- [ ] **Mixed-meter metronome:** the audio engine already accepts a beat grid. Verify that score playback supplies meter changes correctly before adding another metronome implementation.
- [ ] **Reader title and composer consistency:** decide whether the score heading should scale with notation size, then keep the same title sizing and centered composer placement in Portrait, Fit window and Two pages.
- [ ] **Saved exercises model:** saved Scale Studio sets now sit above the Exercises cards and first in the rail (September 28). Still to do: define one model that can contain named scale sets and future saveable exercises such as long tones. Avoid a late-loading layout jump, show when the current configuration is saved, verify the built Restore Defaults name reset, and check deletion.


## Confirmed additions

### 1. Complete more theory lessons

Continue the established [course plan](../app/flute-studio/theory/LESSONS.md), rather than starting another theory framework. That plan marks lessons 1 and 2 as built. The remaining essentials cover measures/time signatures, rests, accidentals, key signatures, dots/ties, and smaller beats with a final melody. Follow with the planned extras. Completion includes the learning interaction and practice checks, not just explanatory text.

- [ ] Complete more lessons using that sequence and existing design principles.
- [ ] Translate contextual reader theory explanations; the teaching TODO currently lists these as English-only.

### 2. More personalized settings

Let people retain preferences that make repeated practice less repetitive. The exact settings and their scope need design first. Candidate examples are a default scale tempo and preferred reader setup. Distinguish global preferences, saved-set choices, and remembered values for an individual exercise so they do not unexpectedly override each other.

- [ ] Design the preference model, then implement the selected settings.
- The old global playable-note-range idea is withdrawn for now. Do not include it automatically in this feature.

## Product features to design before implementation

These are distinct features worth retaining visibly. Inclusion is not a commitment to build them all, and order below is not a priority ranking.

### Difficult passages as exercises (from Arnold's Fantasy, September 29)

Pull hard passages out of a piece and practise them as small exercises.

- **First interaction (October 1 direction):** the player taps a start and end measure in any MusicXML score, or enters a range. Do not require microphone detection or automatically label a passage difficult. The first generic guide is implemented locally for library MusicXML: it reads the selected events, moves the score to the selection, offers an evidence-limited scale link or pitch-pattern advice, identifies ties and three/six notes per beat, and saves self-reported tempo goals and five-correct tallies by passage. Arnold 41–46 is the pilot: close-note oscillation in 41–43 gives way to six-note-per-beat broken figures in 44–46, so the complete range does not get a false single-scale label. Mendelssohn measure 12 links to G melodic minor. Browser-checked locally on both pieces; no device or deployment verification.
- **Next, rhythm close-up:** enlarge the selected printed bars without losing ties, rests, or the beat grouping. A beat/subdivision line and a slow tap-along mode can help students read the rhythm before changing notes. If a tie crosses the selection boundary, show the adjoining note rather than making it look like a fresh attack. The current guide navigates to the passage but does not yet engrave a separate close-up or transformed exercise.
- **Technique transformations:** for a uniform untied run, offer long–short and short–long dotted rhythms, repeated pairs (1–2–1–2, then 3–4–3–4), offset pairs (lead with note 1, then repeat 2–3; exact boundary behavior still to confirm), and groupings of three or four. Keep the original pitches and an immediate return to the written rhythm. Do not apply these automatically to irregular or tied material.
- **Keep a list:** "Difficult passages I'm working on", global like the three lists, visible outside the piece (My Studio, Home's Today card), each opening the piece at that passage.
- **Scale connection:** compare the actual pitch sequence with scale shapes and offer a Scale Studio link when the match is clear. The key signature alone does not prove a chromatic run's key. Arnold 16–17 repeats a pitch pattern, so label it as a pattern until a key is supported by more evidence.
- **Other drill ideas for later:** a tenuto every 4 or 5 notes, fermatas on selected notes, or wider regroupings. Reuse Scale Studio's engine where possible.
- **Later:** the passage looped with the metronome, stepping the tempo up.

### Guided practice and an activity library

First step built September 28: the three lists (Want to learn, Working on, Learned) replace the save star everywhere. Still to design: what counts as practice activity (manual, session, microphone) and the routine runner.

**Plan agreed September 28 (build later, in this order):**

- **Pieces and routines are different.** Lists (Want to learn, Working on, Learned) are for pieces and books: things you finish. Scales and exercises never finish, so saved sets are your *routine* instead of going on a list. Exercises in the Library still show the list + for now; move them to the routine side when this is built.
- **1. A "Today" card on Home**, replacing the Practice tracker box:
  - *Where you left off:* the last score opened, at the page you were on.
  - *Working on:* one or two pieces from that list, one tap to open.
  - *Warm-up today:* one saved set, chosen by rotation (the one played longest ago), with Start.
- **2. Ms. Cookie's starter routine** for someone with no sets yet: for example long tones plus C, G and F major, one octave, slow. "Add these sets" turns them into normal saved sets they can change. More routines later (beginner scales, intermediate, a week of keys).
- **3. Rotation and "practised".** Opening a set is not practising it. Simplest honest signal: a set counts as played when you press Listen or Record in it (or the metronome runs). The microphone can confirm later.
- **4. Routine runner** (from the original idea): step through today's sets and pieces with Next and Previous, optional timers.

The current experience feels scattered: open a score, use some tools, then decide what to do next. Explore a connected flow that helps someone choose practice material, work through it, and return knowing what they did. A Goodreads-like library could show **want to work on**, **currently working on**, and **worked on**, alongside actual playing activity.

Keep direct sheet-music browsing available for people who do not want guidance. Do not force a routine or account into every score-opening interaction. Design what counts as practice activity: opening a score alone does not establish that someone played it. Manual confirmation, a practice session, and microphone-observed playing are different evidence sources.

A routine runner could connect existing saved sets and checklist items, such as three arpeggios, three scales, one chromatic, then long tones. Next/previous navigation and optional timers are possible parts of that flow, not a settled specification.

### Technical excerpt cards

Select or highlight a few measures in a piece and save that passage to a personal collection of difficult material. Pull up a list of cards drawn from different repertoire and practise those passages directly, without searching through every full score.

Design questions: how to select measures on iPad, what each card shows, whether to add a difficulty/focus note, and how a card returns to its source score. This is the clarified meaning of “technical checklist / scan hard stuff.” Automatic diagnosis is not required by this idea.

### Smart drone that follows the music

While practising with the metronome, change the drone's pitch as the active measure changes, so the sustained reference fits the music at that point. Interpreting the spoken “Smart Drum” as the earlier smart-drone idea because the described behavior changes a tonic/reference pitch.

Before implementation, decide how the active measure advances and where its reference pitch comes from: a chosen tonic, a manually assigned note, or harmonic information. A measure boundary alone does not tell the app which drone note is musically appropriate. Keep this distinct from metronome meter changes.

### Transpose a score into another key

Choose a target key or interval and practise the piece transposed. This is a full score feature, not just a label or a Scale Studio key picker.

Design the interaction and scope: whole piece or selected passage, readable note/accidental spelling, playable range, and how to return to the original. Decide whether the drone, fingering help and pitch targets should follow the transposed version before building it.

### Offline sheet music on iPad

Save selected sheet music onto the device so it can be reopened and read without Wi-Fi. Make it clear which pieces are available offline and allow saved copies to be managed.

Define whether annotations and associated files also travel with each download. Verify reopening the app and selected score without a network connection. Local preference storage by itself does not establish offline score availability.

### A shared practice profile across iPad and laptop

Use either device and keep relevant settings, library status and practice history consistent. Authentication identifies the user; stored user data and synchronization provide continuity. These are related but separate parts of the feature.

Decide what syncs, what stays device-specific, and what happens when offline changes meet newer changes on another device. An account system is an implementation choice to support this experience, not the experience itself.

First step built September 28 without a server: **Move to another device** (a code or file, merged on arrival). Automatic sync with a sign-in stays a future feature. If it's ever built, keep the studio local-first: write to the device as now and sync in the background, so nothing waits on the network.

### Tempo progress over time

Keep dated tempos for an exercise so a player can see progression across weeks. Existing stored tempos represent a latest value, not this history. Design how an entry is recorded and reviewed without adding busywork.

### Compare practice attempts

Return to a previous attempt at the same material and compare it with today's. Decide what is saved, such as audio, pitch trace or a short practice note, and how the comparison helps the player. Existing long-tone repeat handling does not establish cross-session comparison.

### Accompaniment files

Associate accompaniment with a piece so the player can use it during practice. Decide whether the first version simply plays a user-selected file or needs synchronized score position, looping and tempo controls. Those are different scopes.

### Close-up practice for ordinary repertoire

Extend the useful close-up experience beyond long tones to simple tunes or selected passages. Design passage selection, navigation and a return to full-score context before reusing the long-tone presentation.

### Metronome extensions

Add drop-out practice, subdivisions and selectable accent patterns. Treat these as distinct controls with a clear practice purpose. Mixed-meter behavior already has supporting code and remains a verification task above.

### General score following

Provide pitch and rhythm feedback for ordinary repertoire, including tongued repetitions of the same pitch. This goes beyond the implemented long-tone tracker. Define supported music and behavior around mistakes, pauses and repeats before implementation.

## Ideas from the September 28 session

Not built. Grouped by area; not a priority order.

### Pitch and tools
- **Pitch tendency test, loud and soft:** play the range at your loudest and softest to see how pitch moves with dynamics and how well you manage it.
- **Simpler tendency test:** a major-scale version for players who don't know the chromatic scale yet.
- **Quick intonation check in Scale Studio:** test the scale on screen, reusing the tendency test's measuring.
- **Tendency results over time:** list past tests in My Studio and show whether notes are improving. Decide whether test results ever merge with the long-tone pitch history (kept separate for now).
- **Fancier Tools page:** a full pitch-detection tuner view, and a metronome with subdivisions (see Metronome extensions).
- **Tools in the score viewer on phone:** the phone work hides the Tools button there; decide whether it should show (the user needs the tuner while reading).

### Exercises and books
- **Warm-up melodies tool:** one tool, like Scale Studio, where you choose a melody (or pick one at random) and it is written out moving up by half steps; saved warm-ups appear with saved sets.
- **More books:** Taffanel & Gaubert (to type by hand) and Reichert, possibly as pattern generators rather than transcriptions, since many daily exercises are one pattern through every key. Book format: a section break after each piece in MuseScore.
- **Copyright before transcribing:** Trevor Wye and Moyse are still in copyright and can't be published; Taffanel & Gaubert, Reichert, Köhler, Gariboldi, Boehm and Andersen are generally public domain (confirm per edition).
- **Exercises list view:** a card/list toggle, with skill tags (Tone, Technique as "Finger Lab", Articulation, Dynamics, Breathing), source ("Taffanel & Gaubert No. 4", a teacher's warm-up) and search once there are enough exercises. A "From the Library" row for etudes and warm-ups.
- **Technique pattern generator:** select a hard measure in a piece and the studio guides you through different ways to practise it (for example rhythm variations, articulation changes, slow-then-fast, chunking). Related to Technical excerpt cards and Repertoire-derived exercises below; this is the guided-practice part.
- **Uploader for books:** rename a book and replace one after it is added (today: edit content/music-books.json by hand).

### Library and reading
- **Tunes shelf:** possibly group Pop, K-pop, Film and Folk under one "Tunes" filter. Undecided.
- **Smarter search and recommendations:** suggest sheet music based on your interests; a short survey or "recommend me a piece" built on the catalog's tags and metadata.
- **Note names that don't clutter:** small labels under the staff instead of between the notes, and an "only the hard ones" mode that labels ledger-line notes only (useful for high etudes).
- **Rhythm close-up:** zoom into a tricky bar (Syrinx), show which beat each note falls on, and guide the player through it.

### Home and layout
- **Home redesign:** open with "Welcome to Cookie Flute Studio" and a plain line about what you can do; one highlight per area, each linking to its tab; drop the My Studio panels from Home now that My Studio is in the rail.

### Housekeeping
- ~~Delete HomeQuickTools.tsx and its stylesheet~~ done September 28.
- ~~Library lint in `music/page.tsx`~~ done September 28 (favourites use the shared saved-items store; `?tag=` now lights its chip even in lower case).

## September 30 product direction and exploratory ideas

Added from the September 30 pasted discussion. These are product thoughts and possible experiments, not implemented features, audited capabilities, a priority ranking, or commitments to build. Overlap with existing ideas is intentional where this discussion adds a concrete interaction.

### Quiet practice companion

- Keep Cookie quiet: no Duolingo-style streak pressure, XP, notifications, or obsessive timers. Continuity should help players remember where they left off and what they were working on.
- Opening a score does not equal practising. The earlier proposal to count Listen, Record, or metronome use as “practised” needs reconsideration: those actions alone do not establish actual playing. Saved recordings/takes could provide concrete evidence and become the practice history itself. A recording of even one measure can represent meaningful work.
- Explore local-first storage of saved takes before requiring a backend or cloud system. This is a future storage idea, separate from the current recording/download flow.
- Strengthen the curated, verified public-domain library and customizable exercises/scales. Content itself may be a major source of value.
- Avoid adding more buttons to the phone reader toolbar. Group new controls or expose them contextually.
- Connect existing tools around a passage: selecting bar 17 could connect its notes, tempo, loop, intervals, rhythm variants, recording, and later return to the same work. Each connection still needs its own design and validation; the discussion's claims that these combinations are cheap or already supported are not engineering estimates.

### Passage practice, rhythm and fingering experiments

- **Immediate “Practice this measure”:** long-press a measure to open a passage workspace with looping, slower playback, count-in, tempo steps and rhythm variations, then return to the score. A concrete interaction for the difficult-passage feature above.
- **Freeze mode:** when a player stops, pause accompaniment/metronome and offer the last one or two bars as a loop. Requires reliable score position and stop detection; do not infer why the player stopped.
- **Tempo staircase:** after two completed repetitions, increase tempo automatically. Manual completion can avoid relying on correctness detection; “again” keeps the current tempo.
- **Reverse staircase:** begin with a tiny passage at a fast tempo, then add notes or measures instead of increasing speed.
- **Rhythm surgery:** expand a bar into beat lines, subdivisions, durations, ties, metronome clicks and a moving cursor. Extends rhythm close-up.
- **Silent fingering:** display/play a passage for fingering along without blowing, optionally showing difficult transitions.
- **One-hand exercises:** derive patterns that isolate primarily left-hand or right-hand changes.
- **Finger-change analysis:** use pitches and a fingering model to flag transitions with many simultaneous key changes. A mechanical description, not an automatic verdict that a passage is difficult.
- **Interval X-ray:** label leaps with their interval; tap to drone the destination or alternate the two notes.
- **Landing-note trainer:** hear the first note, then play the destination in silence; reveal cents only after the attack.

### Intonation and ear-training experiments

- **Blind intonation / “Don't chase the tuner”:** hide live cents during playing and reveal the result or pitch trace after release. These are variants of one delayed-feedback idea.
- **Dynamic intonation map:** sustain pp → ff → pp and plot pitch against measured microphone level. Relative level is not a calibrated acoustic loudness measurement; interpretation needs real-flute validation.
- **Attack map:** repeat a note five times and compare initial pitch, roughly the first 300 ms, with settled pitch.
- **Long-tone stability:** report stable-region pitch variance, duration and drift, without judging tone beauty or quality.
- **Drone roulette / harmony hearing:** give a reference note and a named interval, let the player find it, then reveal/check the target.

### Memory, pulse and performance experiments

- **Progressively obscured score:** white out increasing portions of a passage, potentially using generated mosaic or patch patterns. The player reconstructs missing music from memory. Manual progression can support this without automatic correctness detection.
- **Scale memory:** briefly show the scale, then hide it, or remove more notes each repetition.
- **Random starts:** choose a bar or rehearsal mark to test knowledge beyond sequential recall.
- **Performance recovery:** cue a new starting point or jump the displayed score forward to practise recovery from memory gaps.
- **No-stop run:** reduce distracting controls during a recorded run; review pauses afterward without interrupting the performance. Automatic pause marking needs validation.
- **Random metronome interruptions:** remove clicks for one to four measures, then restore them to test internal pulse.
- **Ghost metronome:** start with four clicks, disappear for eight beats, return briefly, and gradually lengthen the silence.
- **Tempo wobble:** deliberately vary tempo for follow-or-resist experiments. Keep this exploratory rather than claiming an established teaching benefit.

### Breath planning, variety and factual history

- **Breath budget:** calculate phrase duration from tempo and rhythm, compare with the player's entered comfortable duration, and recalculate after adding a breath mark.
- **Breath-route comparison:** compare phrase lengths for two alternative breath placements.
- **Practice dice:** generate constrained combinations of key, range, rhythm, tempo and dynamic, or a passage with a variation. Randomness, not a recommendation engine.
- **Small optional challenges:** examples include a quiet scale, a passage from memory, or a held note with a chosen drift target. No streaks, pressure or required daily participation.
- **Practice receipt:** summarize factual recorded activity, such as bars worked on, loop counts, tempos, scale runs, long tones and saved takes. Display only events the app actually records.
- **Score heatmap:** subtly tint frequently worked measures, distinguishing practice evidence from navigation or tool use.
- **Personal difficulty map:** surface passages repeatedly looped, slowed, annotated, restarted or saved. Explain these behavioral signals rather than declaring difficulty as fact.

### Cookie as a broader flute world

Cookie could also offer things to learn, explore, make and hear when someone has no intention of practising. Possible organizing areas are **Play** (scores, exercises and tools), **Learn** (theory, listening, acoustics and instrument), **Explore** (stories, history, glossary and games), and **Community** (shared recordings and collaborations). This is an exploratory structure, not an approved navigation redesign.

### Anonymous recordings and community experiments

- **Beginner tune recording wall:** a tune page with direct recording/upload and optional anonymous sharing. A possible small prototype, not a selected next task.
- **Same piece, many flutists:** hear different interpretations underneath a score, optionally shuffled or grouped by self-described student/teacher status.
- **Musical postcards:** share a 20–60 second recording on a Cookie card via a link that recipients can open without an account.
- **Flute radio:** shuffle short recordings explicitly shared by participants.
- **Tune of the week:** a shared easy public-domain tune with score, context and optional recording wall.
- **Asynchronous duets:** record one part, then let another player record the second over it.
- **Chain performance:** divide a piece into phrases and assemble contributions from different players.
- Keep community small and centered on music: no follower counts, DMs, public-profile pressure, streak competitions or leaderboards. Optional reactions could acknowledge the playing or say “I'm learning this too.” Public sharing requires separate storage, consent and moderation design; local saved takes do not establish this infrastructure.

### Listening, repertoire and discovery

- **Mystery flute:** short listening games about instrument, mode, articulation, dynamic, meter, interval or other audible features.
- **“What am I hearing?” lessons:** compare audio examples of staccato, crescendo, meter or tonic endings.
- **Repertoire stories:** short, source-grounded composer/piece pages explaining context and unusual character markings, with score and listening examples.
- **Interactive score museum:** annotated repertoire with tappable questions about notation, rhythm and harmony.
- **Flute history timeline:** instruments, repertoire and sound examples from traverso through modern and electronic/extended-technique flute.
- **Notation detective:** identify an unusual marking in a score fragment, then reveal its explanation.
- **Score archaeology:** compare public-domain editions and distinguish editorial decisions from composer markings.
- **Optional daily question / trivia:** short questions drawn from verified glossary, instrument and repertoire content.
- **Flute traditions map:** explore dizi, shakuhachi, bansuri, quena, ney and other flute traditions through sourced sound/context pages.
- **“I found this marking” search:** musician-friendly explanations and examples for terms such as cédez, sons filés and bisbigliando, extending the glossary beyond tooltips.
- **Intentionally unserious repertoire quiz:** playful “Which flute piece are you?” results, clearly separate from educational assessment.

### Instrument, acoustics and creative play

- **Instrument anatomy:** tap flute parts and keys for explanations, with possible fingering/pad animations.
- **Acoustics sandbox:** explore tube length, tone holes, standing waves and blowing angle through an explicitly simplified model.
- **Overtone playground:** hear/see a harmonic series and connect it to flute harmonic fingerings.
- **“Why does this fingering work?”:** explain effective tube length and unusual fingerings alongside the chart.
- **Tiny composition toy:** write four measures, hear them, and export/share a small tune without expanding into a full notation editor.
- **Finish the melody:** supply two measures and let the player write the ending, optionally sharing versions.
- **Musical Mad Libs:** generate a short playable melody from a mood, meter and restricted notes.
- **Beginner pathway:** assemble the flute, make a first sound, learn B/A/G, try rhythm, play a first tune, and optionally share it. Connect existing theory where useful while keeping the pathway self-contained.

## Other retained ideas

Each is an independent idea, not a hidden part of another feature or an implementation commitment.

- **Repertoire-derived exercises:** turn a selected passage into an articulation or flexibility drill while preserving a useful link to its original context.
- **Sight-reading generator:** create short unfamiliar phrases with chosen key, range and difficulty.
- **Breath planning:** mark breath points and inspect phrase length at the practice tempo.
- **Reverse fingering lookup:** select pressed keys and inspect possible notes, allowing ambiguous fingerings.
- **Difficult-interval hints:** flag transitions that may need targeted fingering practice.
- **Finger/tremolo drills:** practise selected finger transitions, including an interactive diagram for practice without the instrument.
- **Practice coverage:** show which notes or ranges have actually been practised; distinguish this from pitch-tendency analysis.
- **Breathing visuals:** show support/duration with a bag-like visual and add more breathing exercises.
- **Relaxation guide:** work through posture and tension checkpoints.
- **Beginner material and orchestral excerpts:** add appropriate repertoire and exercises; choose concrete content first.
- **Pre-practice tuning:** design a convenient tuning step that can be skipped.
- **Curated recommendations:** suggest exercises using an explicitly designed teaching approach.
- **Performance-situation practice:** explore audition or stage scenarios; define the learning activity before building scenes.
- **Cookie activity reactions:** reflect practice activity in the character once that activity is meaningfully recorded.
- **Themes/skins:** offer alternate visual appearances without reducing notation readability.
- **Invitation codes:** retain as an idea; the access or sharing purpose is not yet defined.
- **Monetisation:** consider donations or access models later, with a separately designed user experience.
- **Touch help for reader controls:** design accessible explanations if iPad testing confirms controls are hard to understand. Hover-only hints are currently hidden on touch devices.

## Set aside

- **“Hard to move bar on iPad”:** the control is still unidentified. Reopen only if it happens again.
- **“Settings outer range”:** possibly a global range of notes a student can play. The original use case is no longer remembered; the user explicitly set this aside. Do not make it a current requirement.
- **“MusicXML cleanup”:** no concrete current task. Record specific file/rendering failures if found.

Do not inherit old claims that a feature is “nearly free” or “mostly plumbing.” Do not add automated tone-quality diagnoses such as “too airy” without validated evidence.

## Audit references

- Pitch and repeat tracking: `app/flute-studio/lib/toneSession.ts`, `useToneSession.ts`, `usePitchStream.ts`, and `exercises/long-tones/TonePracticeReader.tsx`.
- Markup and touch: `components/AnnotationLayer.tsx`, `lib/annotationAnchors.ts`, `lib/annotationDocument.ts`, and `reader-workspace.css`.
- Drone and theory: `components/ScoreViewer.tsx`, `components/scoreTheory.ts`, and `docs/music-reader-teaching-todo.md`.
- Scales: `exercises/scales/ScaleStudio.tsx`, `saved-sets.ts`, and `scale-score.ts`.
- Practice and metronome: `practice/page.tsx`, `practice-data.ts`, and `PracticeAudio.tsx`.

Previously checked-off audio, slider, layout and accidental-overlay fixes remain historical completed items in BACKLOG.md. Reopen them only if reproduced.
