# Audio audit (November 6, 2026)

**Base:** main `f553b92` plus `ipad-pass.patch`, `q1-density.patch` and `q2-perf.patch`. Line numbers refer to that base.
This was a source read of every file in `app/flute-studio` that creates audio nodes. Nothing was measured in a browser.
`app/flute-studio/lab/` is left out.

**Fixes:** `docs/.applied-patches/o4-audio.patch`, 3 files. They apply to the base above.
- `tsc` shows no new errors.
- eslint is clean on the changed files.
- `tests/pitch-stream-races` and `tests/tool-metronome-scheduler` pass, 12 of 12.

## Fixed in the patch

1. **Pitch test misses on iPad.** `lib/usePitchStream.ts:107-117` (used by the pitch tendency test) wired mic → high-pass → analyser and stopped there.
   - The tuner (`PracticeToolDock.tsx:423-426`) and long tones (`lib/useToneSession.ts:44-47`) both carry a comment that Safari only runs nodes that lead to an output, so a dangling analyser reads silence on iPad.
   - Now: the same muted gain to the speakers. It is still silent, so there is no feedback.
   - This was not checked on an iPad.
2. **Mic nodes left behind on every retry.** The same hook never disconnected its source, filter and analyser.
   - They sat on the studio's shared, long-lived AudioContext, and the test's retries make a new chain each time.
   - Now: `stop()` disconnects them, like the tuner and long tones do.
3. **A pop when lesson audio stops.** `theory/rhythm/useRhythmAudio.ts:20` faded every voice out by first setting its gain to 1. Voices play at 0.05 to 2.4:
   - A spoken count at 0.05 jumped 20× louder for 60 ms on Stop, on a page hide, or on starting again.
   - The 2.4 melody dropped by more than half at once.
   - Now: the fade starts from the voice's own level.
   - `theory/useLessonAudio.ts:15` has the same line, but its voices are always at 1, so it is harmless there.
4. **Test fixture.** `tests/pitch-stream-races.test.mjs`: the fake context gains `createGain`, `destination` and `disconnect`, which real contexts have. Without them, fix 1 failed in the fake only.

## Findings left as they are

### AudioContexts

| Context | Created | Closed | Note |
|---|---|---|---|
| Studio context | `PracticeAudio.tsx:56` (`getAudio`) | when the layout unmounts (`:305`), and swapped for a fresh one after the mic on touch devices (`:284`) | Fine. Metronome, drones, reader, close-up, tuner and the pitch test share it. |
| Theory lessons | `theory/useLessonAudio.ts:25` | on unmount (`:41`) | Fine, but it is a second live context next to the studio's. |
| Rhythm lessons | `theory/rhythm/useRhythmAudio.ts:27,57` | on unmount (`:128`) | Same. |
| Breathing Lab | `breathing/BreathingLab.tsx:67` | on unmount (`:64`) | Same. It also misses the studio's iPad mic swap and its resume on return. |

No context is leaked, since each one closes. Still, a lesson page runs two contexts at once. That matters most on iPad:
- Safari's call-volume routing after the mic only gets fixed for the studio context.
- Lesson clicks have their own balance, which is item 9 in COMPONENTS.md "Not reused yet".

Moving lessons and the Breathing Lab onto `getAudio()` is the real fix. It is medium work, because lesson audio has its own mute, error and resume handling.

### Leaked nodes

No real leaks. One-shot sources disconnect themselves on `ended`:
- clicks (`components/clickSounds.ts:102`)
- drone voices (`components/sampledDrone.ts:90`)
- lesson and Breathing Lab tones.

A drone voice's extra parts (breath noise, the added fifth or octave) stop with its main oscillator, and nothing then reaches them. The only mic graph that stayed connected was fixed above.

Allocation churn, not a leak:
- `useRhythmAudio` builds a new metronome buffer for every click (`:42`, `:94`). Caching one per context would do.
- `useLessonAudio` builds a buffer per note, which is needed because every pitch differs.

### Hard stops (small clicks on Stop or Pause)

Every envelope at note start and note end is ramped. I found no `gain.value` jump on a sounding node apart from fix 3. The clicks left come from calling `stop()` on a source that is mid-sound:

| Where | When | Fix |
|---|---|---|
| `components/ScoreViewer.tsx:2084` (`stopPlayback`), `:2031`, `:2120` | Pause or Stop during Listen, smart drone and the click-track drone | Route a run's notes through one bus gain and fade it about 30 ms before `stop()`. Medium, because playback, smart drone and track drone each keep their own node list. |
| `components/PracticeNotation.tsx:96` | Stopping the close-up's Listen | Same idea, small. |
| `breathing/BreathingLab.tsx:61` | Stopping the exercise mid-tone | Stop only tones not yet started, and let a sounding one finish its own fade. Small. |
| `PracticeAudio.tsx:226` and `lib/toolMetronomeScheduler.ts:74` | Stopping the metronome cuts a click already sounding | Cancel only clicks not yet started. **Tried and taken out of the patch:** `tests/tool-metronome-scheduler.test.mjs:38` asserts that dispose stops every sound. Decide the behaviour, then update that one assertion. |
| `PracticeAudio.tsx:283` | The iPad mic swap stops held drones without a fade before closing the old context | Rare (only after the mic closes); left. |

### Drift

- **Metronome (free-running and tools panel):** each beat or bar starts at the previous start plus its length, on the audio clock. There is no timer arithmetic, so no drift.
  - On return from a background tab, missed beats are skipped rather than played in a burst (`PracticeAudio.tsx:166`, `toolMetronomeScheduler.ts:33`).
  - A tempo change cancels only clicks more than 0.1 s ahead.
- **Drones:** continuous oscillators, so no drift. Smart and track drones are booked at times taken from the playback timeline, so they stay locked to the notes.
- **Reader playback:** note times are `audioStart + elapsed`, with no accumulation.
- **Close-up loop** (`PracticeNotation.tsx:93`): a `setTimeout` books the next pass at the exact audio time `start+duration`, so no drift. But if that timer fires more than about 50 ms late (a background tab), the first notes of the next pass are booked in the past and play bunched together. A larger lead, or booking the next pass right away, would fix it. Small.
- **Lesson rhythm audio:** books everything up front on the audio clock, so no drift.

## Suggested order

1. Check the patch's iPad fix with a real pitch test on iPad. It is the one item that could have been silently broken for users.
2. Decide the metronome's stop behaviour (cut a sounding click, or let it ring out), then update that one test assertion.
3. Add a bus gain to reader playback to remove the Pause click.
4. Move lessons and the Breathing Lab onto the studio context, together with COMPONENTS.md item 9 (lesson click levels).
