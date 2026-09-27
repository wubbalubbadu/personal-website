# Cookie app: updated to-do list

Historical context: [September 26 retrospective and original notes](history/2026-09-26-cookie-retrospective.md).

Updated September 26, 2026 from the pasted notes and current local source, including work in progress. This is a source audit, not confirmation that every feature works on the deployed site or on iPad. The older BACKLOG.md is historical context. Items below are grouped, not a new priority decision.

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
- [ ] **Mic on/off was hard to see** *(fixed, verify)*: the Mic button now has a red ring that swells with the input level plus a pulsing dot while listening, and turns grey when paused.
- [ ] **Can't mark up while the score is playing.** Not reproduced yet. Nothing in `AnnotationLayer` checks playback, so suspects are things playback does to the page: page turns or scrolling that follow the playhead, or the marks layer being re-measured (`layoutVersion`) mid-stroke. Reproduce on iPad: start playback, open Mark Up, draw. If marking during playback should be off by design instead, grey the Mark Up tools while playing rather than silently ignoring strokes.
- [ ] **The selected measure stays green during playback, and it's distracting.** Needs a different design for "where playback starts / where it is now" rather than a permanent green bar. Design first.
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
- [ ] **Saved exercises model:** add a Saved tab to Exercises and define one model that can contain named scale sets and future saveable exercises such as long tones. Avoid a late-loading layout jump, show when the current configuration is saved, clear the active saved-set name on Restore Defaults, and provide deletion.


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
