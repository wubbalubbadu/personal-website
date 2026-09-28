# Cookie app: updated to-do list

Historical context: [September 26 retrospective and original notes](history/2026-09-26-cookie-retrospective.md).

Updated September 26, 2026 from the pasted notes and current local source, including work in progress, and again on September 28 with the navigation, tools, book and pitch-test work from that session (see "Built September 28" and "Ideas from the September 28 session"). This is a source audit, not confirmation that every feature works on the deployed site or on iPad. The older BACKLOG.md is historical context. Items below are grouped, not a new priority decision.

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
- [ ] **Breathing Lab has no Chinese.** The page title is translated now; the exercise names, controls and cues are still English only.
- [ ] **Composer cards for the rest of the library.** Gluck and Rimsky-Korsakov were added. Pop, K-pop and folk pieces have no card; decide whether they should (artist notes, or nothing for "Traditional").
- [ ] **Theory lesson 3, Read and play:** the 6/8 round and the new tap judging (every tap must land near its own note) have not been tried on iPad.
- [ ] **Theory housekeeping:** move lesson 2 onto EngravedRow like lesson 3. (The temporary engraved-preview page is deleted.)

## Testing to-dos: existing work, not requests to rebuild

- [ ] **iPad regression pass:** write with a resting palm, tap notes with the drone off/on, edit and move annotations, and use settings controls with touch. Record a specific reproduction only if a problem remains.
- [ ] **Markup after layout changes (implemented; verify only):** change notation size, spacing and orientation; verify new annotations stay attached. Check legacy bitmap ink separately and check whether annotations appear in PDF exports.
- [ ] **Scale custom range and ending (implemented; verify only):** a custom range now overrides “starts on tonic,” and the held ending returns to the actual starting note without leaving the range. Verify several ranges above and below the tonic in Scale Studio.
- [ ] **Long-tone repeats with a real flute:** repeat a group, breathe and restart, then move to another group. Check same-pitch boundaries, quiet endings, noise and accidental pitch jumps. Do not use “100 cents off” alone as a jump rule.
- [ ] **Practice/session history:** test the existing experience before changing it. The earlier source audit found a history reader and session schema, but could not establish a working recording path while the timer was being removed. This is an observation to verify, not authorization to restore the timer or redesign session storage.
- [ ] **Remember tempos consistently:** scale tempos already persist; the shared audio provider remembers user-picked score tempos only in memory. Verify reload behavior and distinguish remembered tempo from a user-selected default tempo.
- [ ] **Saved sets:** reproduce the stale-name complaint when switching between a named set, preset and custom configuration. Named-set switching already updates the field. Also check custom range round-tripping and whether reader view preferences should belong to a set.
- [ ] **Spacing controls:** retest note spacing with “start on a new line” enabled before treating it as an active bug.
- [ ] **Mixed-meter metronome:** the audio engine already accepts a beat grid. Verify that score playback supplies meter changes correctly before adding another metronome implementation.
- [ ] **Reader title and composer consistency:** decide whether the score heading should scale with notation size, then keep the same title sizing and centered composer placement in Portrait, Fit window and Two pages.
- [ ] **Saved exercises model:** saved Scale Studio sets now sit above the Exercises cards and first in the rail (September 28). Still to do: define one model that can contain named scale sets and future saveable exercises such as long tones. Avoid a late-loading layout jump, show when the current configuration is saved, clear the active saved-set name on Restore Defaults, and provide deletion.


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
