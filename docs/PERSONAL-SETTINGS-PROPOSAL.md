# Personal settings: what is remembered, and where

Proposal only (October 20, 2026). Covers the TODO item "Personal settings: design what is remembered globally, per
saved set and per exercise, then build." Nothing here is built yet. The inventory reflects the code as it is today
(main checkout plus uncommitted work).

## Decided and built (October 21, 2026)

Haylie's answers, and what was built for each:

1. **Language travels with you** (the imported code's value wins). No change needed.
2. **Reading aids are per piece, over a default.** `lib/readingAids.ts`, key `cookie:reading-aids:v1` (travels). Changing
   an aid in a piece keeps it for that piece and makes it the default for pieces you have not set. Pieces and exercise
   books keep separate defaults. The first default comes from the older device-only reader key, so nothing resets.
3. **One "Show practice tempo" switch.** `lib/practiceTempoMarks.ts`, key `cookie:practice-tempo-marks`, used by
   excerpts, Scale Studio, key exercise books and Cookie's scale routine. An excerpt choice already made carries over;
   otherwise it is shown.
4. **Both metronome menu choices are global.** Subdivide moved to `cookie:reader-click-subdivision`.
5. **Scale Studio memory is per saved set.** Per scale was not clean: pins and pencil marks sit on the book's bars,
   which move whenever a scale is added or removed. ScoreViewer has a `storageId` prop; Scale Studio passes
   `scale-set:<id>` when a set is open. An unsaved setup keeps its generated id rather than one fixed id, so old marks
   are never drawn over different music.
6. **The running practice clock stays on the device.**
7. **Panel states are remembered on this device only** (tools panel More, Tricky bits view, close-up mode, an
   excerpt's last passage tab).

The settings registry is built too: `lib/settingsRegistry.ts` lists every key family with its scope, and
`transfer.ts` takes its device-only list from it.

## Decisions for Haylie (as asked, before the answers above)

1. **Language: you or this device?** Today `cookie:language` travels in a transfer code, so importing from a phone set
   to Chinese switches the laptop to Chinese. Proposal: keep it with you (it travels). The other choice is to keep it
   per device.
2. **Reading aids (note names, accidentals, fingering, beat sticks): one setting for everything, or one each for
   pieces and exercises?** Today pieces and exercise books each have their own copy. Proposal: keep the two copies, and
   add no per-piece override. Turning fingering on for one hard étude would then turn it on for every piece.
3. **One "Show practice tempo" switch.** Excerpts have one (`cookie:excerpt-tempo-mark`) and Scale Studio has another
   (inside its setup). Proposal: merge them into one global switch.
4. **Metronome ▾ menu.** Today "Follows the music" is global but Subdivide is per piece, even though they sit in the
   same menu. Proposal: both global, so the menu always opens the way you last left it. The other choice is both per
   piece, with the last used value as the default for a new piece.
5. **Scale Studio's per-page memory.** Pencil marks, practice pins, subdivision and drone mode are stored under the
   book's generated id. That id changes with every setting (one more key gives a new id), so they seem to vanish.
   Proposal: in Scale Studio, store them per saved set when one is open, else under one fixed "Scale Studio" id. The
   other choice is to not keep pencil marks on generated books at all.
6. **A running practice clock should not travel.** Today `cookie:practice-live` goes into transfer codes, so a code
   made mid-practice starts a running clock on the other device. Proposal: keep it on the device. Sessions still
   waiting for a reflection (`cookie:practice-pending`) keep travelling.
7. **Remember panel states or not?** These are remembered and also travel today: the tools panel's More, the Tricky
   bits Cards or Continuous view, the close-up mode, an excerpt's last passage tab, and RhythmTap's click choice.
   Proposal: keep remembering them, but on this device only. They describe how you last left a screen, not you.

Suggested order if you agree: 6 (a one-line fix), then 3 and 5 (real confusion today), then 4, then the settings
registry below. 1, 2 and 7 only need your yes or no.

## The scopes

| Scope | Meaning | Travels in a transfer code? |
|---|---|---|
| **Device** | About this screen or this browser: zoom, page width, panel layout, the rail. | No |
| **You (global)** | How you like to practise, the same on every page and device: language, reading aids, metronome habits. | Yes, the code's value wins |
| **Per saved set** | A named Scale Studio setup: which scales, range, articulation, rhythm and layout. | Yes, sets merge by id |
| **Per exercise** | One playable exercise (C major thirds, two octaves, in 4s): its tempo and reps. | Yes, merged per field |
| **Per piece** | One score or book: its tempo, drone mode, pins, marks, list status, progress. | Yes, merged per field or mark |
| **Session** | Only true while something is running: a live clock, an open menu. | No |
| **Not remembered** | Resets on each visit on purpose. | No |

## Inventory: every stored key today

All keys start with `cookie`, so all of them are found by `lib/transfer.ts`. Device-only today means it is listed in
`DEVICE_ONLY` in `transfer.ts`.

### Settings (how things look or behave)

| Key | Holds | Written / read in | Scope today | Proposed |
|---|---|---|---|---|
| `cookie:language` | `en` or `zh` | `i18n/LanguageContext.tsx` | You (travels) | You (decision 1) |
| `cookie:reader-view:piece:v1` | size, system and note spacing, page width, note names, accidentals, fingering, beat sticks (tonguing written but no longer used) | `components/ScoreViewer.tsx`; also read directly by `tricky-bits/BitPractice.tsx` | Device, pieces | Split: sizes stay Device; reading aids move to You (decision 2) |
| `cookie:reader-view:exercise:v1` | the same, for unmetered books (Scale Studio, long tones) | `ScoreViewer.tsx` | Device, exercises | As above |
| `cookie:reader-view:screen:v1` | size, system spacing, page width shared by both kinds | `ScoreViewer.tsx` | Device | Device (the one home for sizes) |
| `cookie:reader-view:<kind>:v1:tablet-layout` | iPad page layout choice | `ScoreViewer.tsx` | Device | Device |
| `cookie:reader-show-tricky` | show tricky bit bands on the music | `ScoreViewer.tsx` | You | You |
| `cookie:reader-metronome-follow` | click track follows the music | `ScoreViewer.tsx` | You | You (decision 4) |
| `cookie:click-subdivision:<scoreId>` | 1, 2, 3 or 4 | `ScoreViewer.tsx` | Per piece | You (decision 4) |
| `cookie:reader-drone-mode:<scoreId>` | Tap a note or Follows the music | `ScoreViewer.tsx` | Per piece | Per piece |
| `cookie:excerpt-tempo-mark` | show tempo and tally on excerpts | `components/ExcerptTempoMark.tsx` | You | You, merged with Scale Studio's (decision 3) |
| `cookie:metronome-setup:v1` | tools panel metronome: click note, meter, subdivision, beat marks | `PracticeAudio.tsx`, `lib/metronomeSetup.ts` | You | You |
| `cookie:metronome-more` | tools panel's More open | `PracticeToolDock.tsx` | You (travels) | Device (decision 7) |
| `cookie:closeup-mode` | close-up Technique, Pitch or Rhythm | `components/PassageGuide.tsx` | You (travels) | Device (decision 7) |
| `cookie:rhythm-tap-clicks` | every beat, first beat or none | `components/RhythmTap.tsx` | You (travels) | You (it is a practice habit, unlike a panel state) |
| `cookie:tricky-bits:view` | Cards or Continuous | `tricky-bits/TrickyBitsPage.tsx` | You (travels) | Device (decision 7) |
| `cookie:excerpt-tab:<itemId>` | last passage tab of an excerpt | `components/FixedScoreViewer.tsx` | Per piece (travels) | Per piece, Device (decision 7) |
| `cookie:pomodoro-focus-minutes` | focus length | `usePomodoro.ts` | You | You |
| `cookie:pencil-only:v1` | Apple Pencil only | `lib/pencilMode.ts` | Device | Device |
| `cookie:rail-open` | desktop rail folded or open | `StudioRail.tsx` | Device | Device |
| `cookie:pet-position` | where Cookie sits | `CookiePet.tsx` | Device | Device |
| `cookie:private-music-code` | access code for private music | `lib/privateMusic.ts` | Device | Device |
| `cookie:backup:first-use`, `cookie:backup:last` | backup reminder dates | `lib/transfer.ts` | Device | Device |

### Setups (what to practise)

| Key | Holds | Written / read in | Scope today | Proposed |
|---|---|---|---|---|
| `cookie:scale-book:preferences:v3` | the panel as you last left it: keys, types, forms, range, custom span, order, arrangement, ending, start, groups, line breaks, articulation rotation, rhythm, practice tempo shown | `exercises/scales/ScaleStudio.tsx` | You (replaced whole on import) | You, minus `tempoMarks` (decision 3) |
| `cookie:scale-book:sets:v1` | saved sets: name plus the same config (no tempos, on purpose) | `exercises/scales/saved-sets.ts`, Exercises hub | Per saved set | Per saved set; also the owner of Scale Studio's pins, marks and drone mode (decision 5) |
| `cookie:long-tones:preferences:v1` | exercise, interval pattern, range, custom span, line breaks | `exercises/long-tones/LongToneStudio.tsx` | You (replaced whole) | You |
| `cookie:practice-routine` | the routine checklist for the day | `practice/page.tsx`, `HomeStudioCards.tsx` | You | You |
| `cookie:practice-plan`, `cookie:practice-plan-custom` | Practice activity plan ticks and your own focus items | `PracticeActivityHero.tsx` | You | You |

### Tempos and counts

| Key | Holds | Written / read in | Scope today | Proposed |
|---|---|---|---|---|
| `cookie:score-tempo-ratios-v1` | per score, your tempo as a ratio of the printed opening | `PracticeAudio.tsx`, `lib/scoreTempo.ts` | Per piece | Per piece |
| `cookie:scale-book:tempos:v1` | per scale exercise (`scale-book:type:form:key:range[:in4]`), bpm | `exercises/scales/scale-tracking.ts`, `ScaleStudio.tsx`, `exercises/cookie-scales/page.tsx` | Per exercise | Per exercise (shared by every set, as decided in September) |
| `cookie:reichert:tempos:<bookId>` | per key, bpm, for key exercise books | `components/KeyExerciseViewer.tsx` | Per piece and key | Per exercise (same shape as Scale Studio's, later) |
| `cookie:tricky-bits:v1` | tricky bits with their tempo ladders | `lib/trickyBits.ts` | Per passage | Per passage |
| `cookie:tricky-bits:tallies:v1`, `cookie:tricky-bits:reps:v1` | rep counts | `lib/trickyBits.ts` | Per passage | Per passage |
| `cookie:practice-reps:v1` | reps per day per skill | `lib/repLog.ts` | History | History |
| `cookie:practice-pins:<scoreId>` | pinned practice passages | `ScoreViewer.tsx` | Per piece | Per piece (Scale Studio: per set, decision 5) |

### Your records (not settings, listed so nothing is missed)

`cookie:practice-sessions:v1`, `cookie:practice-cleared-months:v1`, `cookie:practice-deadlines:v1`,
`cookie:practice-mock-runs:v1`, `cookie:pomodoro-rounds`, `cookie:pitch-history`, `cookie:tendency-tests:v1`,
`cookie:music-status:v1` (and the one-time `cookie:music-status:from-favorites` flag, plus legacy
`cookie:music-favorites`), `cookie:music-recents` (from `useRecents("music")`), `cookie:book-progress:v1`,
`cookie:roadmap-learned`, `cookie-theory-v1` (the open lesson's place), `cookie-theory-completed-v1`,
`cookie:rhythm-drills-best`, and per score `cookie:<id>:annotations:v2`, `cookie:<id>:ink`, `cookie:<id>:notes`.
These stay as they are: they are history and progress, and the transfer merge already handles them.

### Session state

| Key | Holds | Proposed |
|---|---|---|
| `cookie:practice-live` | the running practice clock | Device (decision 6) |
| `cookie:practice-pending` | finished sessions waiting for a reflection | Keep travelling; they merge by id |

The other `cookie:` strings in the code (`cookie:practice-updated`, `cookie:music-status`, `cookie:scale-sets-updated`,
`cookie:lesson`, `cookie:mic-closed`, `cookie:open-tools-panel` and similar) are window events, not stored keys.

## Conflicts and confusing cases today

1. **Scale Studio ids change under you.** The reader keys several things by `config.id`. In Scale Studio that id is
   built from the range, grouping (by type or by tonic), ending, start, groups, types, forms and keys. Change one key and you are on a
   new id: the pencil marks (`AnnotationLayer key={id}`), practice pins, subdivision and drone mode seem to go away.
   They come back if you change it back, and the old copies stay in storage. (Decision 5.)
2. **Two switches for one idea.** "Practice tempo" shows on excerpts from one global key and in Scale Studio from its
   setup. Turning it off in one place leaves it on in the other. (Decision 3.)
3. **One menu, two scopes.** In the reader's metronome ▾, Follows the music is global and Subdivide is per piece.
   Nothing on screen says so. (Decision 4.)
4. **Tempos live in four shapes.** Pieces keep a ratio to the printed tempo. Scale exercises keep bpm per exercise id.
   Key exercise books keep bpm per book and key. Tricky bits keep a ladder. Each is right for its job, but key books
   and Scale Studio describe the same kind of thing (a key's exercise) two ways. Proposal: leave pieces and tricky
   bits alone; move key books onto the Scale Studio shape when either page is next touched.
5. **Reader sizes are written twice.** Size, system spacing and page width go into both the per-kind key and the
   shared screen key on every change. The screen copy wins on read. It works, but the per-kind copy of those three
   fields is dead weight and confusing to read.
6. **Another page reads the reader's private key.** `tricky-bits/BitPractice.tsx` parses `cookie:reader-view:piece:v1`
   itself. If the reader's shape changes, Tricky bits breaks silently. It should read through one exported helper.
7. **Panel states travel and overwrite.** Import a code and the other device's tools panel, Tricky bits view and
   close-up mode switch to how the phone had them. Harmless, but surprising. (Decision 7.)
8. **Two keys hold "what is being practised right now".** Scale Studio restores your last panel setup, and a saved
   set holds a named one. Opening Scale Studio without `?set=` shows the last setup, which may be a set you have
   since changed. This is fine (it is your scratch pad), but the panel's "Saved" state is what tells them apart.
   Keep it, and do not add a third copy.
9. **Naming drift.** `cookie-theory-v1`, `cookie-theory-completed-v1` and `cookie:score-tempo-ratios-v1` use dashes
   where everything else uses `cookie:name:v1`. They still transfer (they start with `cookie`), so renaming is
   optional and not worth a migration on its own.

## What this means for `transfer.ts`

- Device-only today: private music code, rail, pet position, `reader-view:*`, pencil-only, backup dates. Proposed
  additions: `practice-live` (decision 6), and if decision 7 is yes: `metronome-more`, `tricky-bits:view`,
  `closeup-mode`, `excerpt-tab:*`.
- If decision 2 moves reading aids to You, they must leave the `reader-view:*` keys (which are device-only), or they
  will never travel. A new key `cookie:reading-aids:v1` (note names, accidentals, fingering, beat sticks, per kind if
  decision 2 keeps two copies) does that.
- Merge rules need no change for any of this. A global setting is a plain value or object, and "the code's value
  wins" is already the rule for those. `:preferences:` keys stay replaced whole.
- The Sync page's groups (`GROUPS` in `transfer.ts`) put anything unmatched under "Settings", so new keys show up
  there without work.

## A settings registry (the one structural change)

Today the scope of a key is spread over three places: the file that writes it, the `DEVICE_ONLY` list, and the
`GROUPS` list. Proposal: one small file, `lib/settingsRegistry.ts`, listing every key pattern with its scope:

```ts
type Scope="device"|"you"|"set"|"exercise"|"piece"|"record"|"session";
export const SETTINGS:{match:RegExp;scope:Scope;owner:string}[]=[
  {match:/^cookie:language$/,scope:"you",owner:"i18n/LanguageContext.tsx"},
  {match:/^cookie:reader-view:/,scope:"device",owner:"components/ScoreViewer.tsx"},
  // one row per key in the inventory above
];
```

`transfer.ts` then derives its device-only list from the rows with scope `device` or `session`, so a new key cannot
be added without someone deciding where it belongs. No stored data changes.

## Minimal migration

Each step stands alone and can ship on its own.

1. **Live clock stays home.** Add `/^cookie:practice-live$/` to `DEVICE_ONLY`. No data change.
2. **One practice-tempo switch.** New key `cookie:practice-tempo-marks` (`"1"` or `"0"`). On first read, if it is
   missing, take `cookie:excerpt-tempo-mark` if set, else Scale Studio's `preferences.tempoMarks`, else on. Write the
   new key and stop reading the other two (leave the old values in place, so an older code still imports cleanly).
3. **Scale Studio's own id for marks and pins.** Pass ScoreViewer a stable storage id: `scale-set:<setId>` when a set
   is open, else `scale-studio`, separate from the engraving id it uses for the music. Old keys under generated ids
   are not moved (there is no way to tell which one you meant); they can be removed from the Sync page's "Stored on
   this device" card.
4. **Metronome menu scope** (if decision 4 is "both global"). New key `cookie:reader-click-subdivision` read before the
   per-piece key; writes go only to the new key. Per-piece keys are ignored from then on.
5. **Reading aids travel** (if decision 2 says so). Copy the aids from `cookie:reader-view:<kind>:v1` into
   `cookie:reading-aids:v1` on first read; the reader reads the new key first. Export one `readReaderView()` helper
   and use it in `BitPractice.tsx`.
6. **Panel states stay home** (if decision 7 is yes). Add the four patterns to `DEVICE_ONLY`.
7. **Registry.** Add `lib/settingsRegistry.ts` and derive `DEVICE_ONLY` from it, once the decisions above are settled.

Nothing in this list deletes or rewrites saved sets, tempos, practice history or marks.

## Not remembered, on purpose

- Which Customize scales sections are open, and the phone tab shown. The panel opens on Scale, or on the group a
  breadcrumb asks for.
- An open menu, dialog or popover.
- Whether the metronome, drone or playback was running. Sound never starts by itself on load.
- The reader's page number for pieces. The score opens at the top. (A "continue where you stopped" for long books
  would be a separate feature, per piece, if wanted.)
