# Cookie development notes: retrospective

Archived September 26, 2026. The original notes are undated; this is the summary date, not a claim about when each idea or bug originated.

## What the old notes were about

The project was moving from a collection of flute tools toward a connected practice experience. The notes grouped that ambition into three recurring needs:

1. Make practice on iPad dependable: Pencil input, readable help, predictable drone controls, usable sliders and annotations that stay with the music.
2. Reduce setup between exercises: save scale sets, remember tempos, move through a routine, and retain a record of practice.
3. Connect listening with the score: show pitch traces, follow long tones and eventually support broader repertoire feedback.

Breathing visuals, beginner material, fingering drills and repertoire transformations were additional teaching ideas. Themes, performance simulation, recommendations and monetisation were exploratory possibilities, not completed features or settled commitments.

## What changed by this review

The September 26 local source audit found live pitch detection, long-tone traces, group repeat controls and close-up review. These no longer belong on a list of features to build from scratch. General pitch-and-rhythm following for repertoire remains a separate, broader task.

The reader now has drone arming, Pencil/contact handling, contextual theory explanations and anchored new annotations. The old description of all markup as a bitmap is outdated, although legacy bitmap ink still exists. Real iPad behavior and legacy-mark migration still warrant verification.

Scale Studio has named saved sets, grouped exercises and persistent per-exercise tempos. The practice page has a linked routine checklist and history display. The remaining continuity work is a runnable sequence, dated tempo progress and a reliable session-recording path. At review time, local changes removed the session timer, so the existence of the history display alone did not establish working recording.

These findings describe local source, including uncommitted work. They do not establish deployment or real-device acceptance.

## Fixes the older backlog already recorded

The old checklist marked metronome stop lag, bursts from tempo adjustment, low volume, tuner/audio conflicts, unwanted accents in unmetered music, lost view preferences, touch-slider problems, score selection while drawing, rough ink, cropped practice controls and incorrect accidental overlays as fixed. Preserve these as historical reports rather than reopening them without reproduction. They were not all independently retested for this retrospective.

## Selected Git history landmarks

Dates and descriptions below come from local commit metadata. They are navigation aids, not release dates or independent proof that every change worked.

| Date | Commit | Recorded subject |
| --- | --- | --- |
| 2026-09-21 | `6543e6a` | debugging for ipad, played around w/pitch tracing |
| 2026-09-22 | `4833072` | bugs, pitch tracing 1st iter |
| 2026-09-22 | `9896f12` | markup works when you do view settings!!!!!!! |
| 2026-09-25 | `e0a3aaa` | theory cards! and tuning lab UI |
| 2026-09-25 | `8528d13` | pitch tracking zoom in |
| 2026-09-25 | `160eab6` | theory lesson v1 on l1l2, cookie frontpage |
| 2026-09-25 | `159533a` | front page animation |
| 2026-09-26 | `8e60655` | music uploader npm run music:uploader |
| 2026-09-26 | `d1296f5` | uploader update |

## Ideas worth preserving without making them obligations

- Breathing support visuals and relaxation exercises.
- Repertoire-derived drills, sight-reading generation, breath planning and practice coverage.
- Reverse fingering lookup, difficult transitions and silent finger practice.
- Earlier-versus-current recordings or pitch attempts.
- Beginner material, excerpts, accompaniment and transposition.
- Offline access and settings/practice sync across devices.
- Curated recommendations, performance scenarios, Cookie reactions, themes and monetisation.

“Hard to move bar on iPad,” “settings outer range,” “smart drone,” and “scan hard stuff” did not have enough context to become requirements. They remain in the original notes. Revisit only if the intended behavior becomes clear or the issue happens again.

## Lessons from this cleanup

- Separate a missing feature from an existing feature that needs testing.
- Separate source implementation, deployment and actual flute/iPad verification.
- A checklist is not a routine runner; a history screen is not proof that sessions are being saved.
- Do not inherit old effort estimates such as “nearly free” without checking the current code.
- Keep measurable pitch feedback distinct from unvalidated sound-quality diagnoses.
- Preserve ideas without treating every scribble as a commitment.

## Sources and next steps

- [Original pasted notes, preserved verbatim](2026-09-26-original-cookie-notes.txt).
- [Older backlog](../BACKLOG.md), retained in place.
- [Updated active to-do list](../COOKIE-TODO-UPDATED.md), including source-file references for the audit.
- Local Git history inspected September 26, 2026.

This is a retrospective of those notes and the source audit, not a reconstruction of every past chat or every project decision.
