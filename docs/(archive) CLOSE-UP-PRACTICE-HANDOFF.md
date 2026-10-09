> **Archived October 7, 2026:** an October 2 prototype handoff; Close-up was redesigned afterwards (technique list, Pitch mode with the Tone Lab, selection). Kept for the reasoning only.

# Close-up practice: proposal and implementation handoff

Updated: October 2, 2026

## Read this first

This is an unfinished local prototype, not an approved design. The user dislikes the current exercise choices and has not approved the layout. Do not continue polishing or verifying the phone layout yet. Settle the musical usefulness and design with the user first.

The latest implementation priority is **a real dotted-rhythm exercise**, with both long–short and short–long versions of the selected notes. The user also expects the system to recognize relevant musical patterns. For Arnold, they specifically pointed out diminished chords. That statement needs to be checked against the actual selected notes, not applied to every Arnold selection.

The current generic Even rhythm and Change the articulation cards did not satisfy the user. Do not treat those cards as the accepted first milestone.

Do not commit, push, or deploy. The user handles Git and uses Cloudflare. Preserve the many existing unrelated working-tree changes.

## Product intent

Help a flutist practise a short selected section through visual, playable exercises derived from its music. The music should be the main content. Short explanations support the notation; a prose analysis report and a form full of inputs are not the experience.

This must work across pieces without manually designing each section. Arnold measures 41–46 are the main motivating example. The latest screenshot shows measures 43–46 in the close-up. Mendelssohn Scherzo and Daphnis are additional useful examples, not special-case implementations.

“Passage” was not intuitive to the user. The current button is **Close-up**. “Analysis” was another user suggestion, so naming can still be reconsidered. Do not reintroduce “Passage Lab.”

## Agreed interaction direction

1. The user explicitly enters Close-up or Analysis.
2. Prompt them to tap the starting measure.
3. Prompt them to tap the ending measure. Tapping the same measure again selects one measure.
4. Open an enlarged view of that selection.
5. Start in **Practice**.

Ordinary measure taps outside this mode retain their existing casual selection/playback behaviour. Do not require a normal measure selection, then a separate passage-selection command, then another endpoint selection.

Keep one continuous range for the initial version. Multiple disconnected selections are not required. Allow the user to change the selected range and return to the full score.

## Content organisation

### Practice: the default

Anything that changes the music to create an exercise belongs here. Show actual notation with playback and a short purpose statement.

Immediate priority:

- Dotted rhythm: long–short and short–long alternatives using the selected pitch order.
- A musically relevant observation or preparation exercise when supported by the selected notes, such as a diminished pattern or a related scale.

Possible later strategies, not a requirement to ship all at once:

- Short bursts followed by rests.
- Repeated adjacent pairs, then shifted pairs.
- Alternate group sizes.
- Reversed pitch order.
- Slurred, tongued or staccato variants.
- Even rhythm or another simplification, when it actually addresses the passage.

Do not fill the view with the same generic cards for every selection. A library of strategies should supply relevant suggestions. The student can try different approaches; the software does not know which technique is personally difficult for them.

### Rhythm: explain the original

This is primarily a teacher demonstration area. Preserve the written rhythm while helping someone understand it.

Ideas still requiring design work:

- Play or loop the original against a metronome.
- Align beats and subdivisions beneath the notation.
- Show how a tie sustains through subdivisions without a new attack.
- Demonstrate tuplet grouping, optionally with counting syllables.

Do not infer a tuplet from vague spoken wording such as “seven triplets.” Read its actual ratio and beat context from the score. Do not put altered-rhythm exercises here merely because their subject is rhythm; those belong in Practice.

### Display aids

Note names and explicit accidentals can be controls on the close-up. Fingerings could be added later. A separate Pitch category is not required. Pitch detection is not a priority for this version.

## Musical interpretation requirements

### Related scales are preparation suggestions

A scale can help prepare a movement even when the passage is not exactly that scale. Do not equate “these pitches fit a scale” with “this passage is in that key.”

Useful output identifies the shared notes or movement, then shows an exercise in notation beneath the selected music. Reuse Scale Studio's generation where appropriate. Preserve useful pitch spelling and register.

The current helper only ranks shared pitch classes and nearby motion. It is a preliminary heuristic, not reliable harmonic analysis. It has no diminished-chord recognition yet.

### Arnold and diminished patterns

The user says the relevant Arnold material contains diminished chords and expects that to inform the suggestions. Inspect the actual notes in measures 41–46, including local groupings, spelling and repeated interval shapes.

Distinguish a diminished triad, a diminished seventh arpeggio and an octatonic/diminished scale. Do not label an entire six-measure selection from one matching subset or force an arbitrary root onto a symmetrical diminished seventh collection. Show the particular notes/groups supporting a useful observation.

Source available locally:

`/Users/hayliewu/Desktop/musescore stuff for website/Arnold Fantasie for Flute.mscz`

Local reader:

`http://localhost:3000/flute-studio/music/malcolm-arnold-fantasy-for-flute-solo`

The private-library access flow already exists. Do not write access credentials into this document or tracked source.

### Dotted-rhythm exercise: proposed next implementation

This has **not** been built yet.

Recommended starting behaviour:

- Make Dotted rhythm the first exercise card.
- Offer long–short and short–long without opening a settings form.
- Preserve pitch order, octave and spelling.
- Define a consistent pair duration, then divide each pair 3:1 or 1:3.
- Generate valid, beamed notation and schedule playback from the same durations.
- Keep the original available for comparison.

The following are musical decisions to resolve explicitly rather than silently:

- Whether to preserve the original pair duration or generate a fresh regular practice grid. Tuplet runs make this distinction important.
- How to handle rests, ties, grace notes, uneven source durations and an odd last note.
- Whether a phrase/rest boundary resets the pairing.
- What pulse the tempo number represents in the exercise.

One workable initial scope is to transform suitable consecutive note runs, avoid crossing rests, and leave unmatched notes unchanged. Alternatively, label a rebarred pitch-only drill clearly. Do not imply that a changed meter or tuplet grouping is the original rhythm.

## Design constraints

- Current design is **not approved**. The user said to defer phone verification because they do not like the design yet.
- Keep the app's existing visual language and familiar toolbar placement.
- Notation, not prose or administrative controls, should dominate.
- Avoid a large input form, mandatory tempo goals and repetition tallies at entry.
- Close buttons must be plain icons: **no box, pill, border, shadow or hover background**. An invisible touch target and keyboard focus indication are appropriate.
- Selected purple controls must remain purple on hover.
- Avoid generic analytics text such as “four equally spaced notes occur in a row.”
- Do not introduce microphone-based evaluation or automatic claims that a student played correctly.
- Listen and Auto drone are separate features. Do not couple their controls or playback state while adding practice playback.

## What currently exists in code

The following is implemented locally, but remains a prototype:

- Close-up button in interactive MusicXML readers with `practiceGuide` enabled.
- Start/end measure selection with a prompt and a shaded starting measure.
- Enlarged original selection in the reader's existing stage area.
- Practice selected by default, with a secondary Rhythm view.
- Note-name and accidental display toggles.
- Per-example Listen controls and a Repeat option.
- Even-rhythm and articulation transformations.
- A heuristic related-scale card generated by Scale Studio code.
- A basic Rhythm view that plays the original against quarter-note clicks.
- The previous text analysis and current/goal tempo input form have been removed from this view.

The outer reader's Listen button is currently disabled while the close-up is open, because examples have their own Listen controls. This is a prototype decision, not a user-approved final interaction.

The current close-up audio uses a small independent synthesizer. It is not the complete existing score-playback engine. Grace-note handling, tempo changes, articulation fidelity, metronome interaction and loop behaviour need further review before claiming parity.

### Not implemented

- Dotted-rhythm cards or transformations.
- Diminished-chord recognition or chord-based preparation exercises.
- A musically robust strategy recommender.
- Visual rhythm teaching cards beyond the basic playback example.
- Note-linked evidence highlighting for recommendations.
- Fingerings in the close-up.

## Code map

Paths are relative to `/Users/hayliewu/Documents/ChatGPT/Personal Website`.

| File | Role |
| --- | --- |
| `app/flute-studio/components/ScoreViewer.tsx` | Close-up button, selection state, selection highlight, raw XML capture and reader-stage integration. Contains substantial unrelated changes from earlier work; do not replace wholesale. |
| `app/flute-studio/components/PassageGuide.tsx` | Current close-up UI. Internal filename is historical; visible title is Close-up. |
| `app/flute-studio/components/practiceExcerpt.ts` | Extracts selected measures, carries initial attributes, adjusts boundary slurs/ties, builds exercise variants, adds labels and suggests a related scale. |
| `app/flute-studio/components/PracticeNotation.tsx` | Small OSMD renderer, exercise playback, moving position line and looping. |
| `app/flute-studio/components/passage-guide.css` | Current, unapproved close-up layout and close-button styling. |
| `app/flute-studio/components/passageAnalysis.ts` | Earlier pitch/duration analysis helpers. Its old prose output is no longer the UI. |
| `app/flute-studio/components/deriveScoreEvents.ts` | Existing notation-to-playback events, including ties, articulation and dynamics. |
| `app/flute-studio/components/notePatterns.ts` | Existing scale rhythm/articulation patterns. Inspect for reusable dotted-rhythm logic. |
| `app/flute-studio/exercises/scales/scale-score.ts` | Existing Scale Studio notation and pitch generation. |
| `app/flute-studio/viewer-fixes.css` | Broad hover rules. Close controls were excluded from generic gray hover. |
| `tests/passage-analysis.test.mjs` | Existing analysis tests plus preliminary related-scale suggestion tests. |

## Engineering cautions from this prototype

- Preserve written MusicXML structure for the original view. A flattened playback event list cannot faithfully reconstruct ties, tuplets, beams and spelling.
- `PracticeNotation` enables automatic beaming only for the generated even-rhythm example. Enabling it on the original Daphnis selection caused tied noteheads to overlap; disabling it restored spacing.
- Extraction carries the active clef, key, time signature and divisions into the first selected measure. It also carries the preceding dynamic. Boundary slurs/ties need regression coverage.
- The extractor uses the first score part. Verify that this matches the reading part for any multi-part source before widening support.
- Source pitch spelling is used for scale-card evidence. Scale titles use `keyForType` to avoid calling a generated F-sharp minor scale G-flat minor.
- `sempreStaccato` is currently passed as a boolean based on the selection's starting measure. A selection crossing the instruction's start needs more precise handling.
- Keep timing units explicit. Mendelssohn's displayed 84 is one click per 3/8 measure. Daphnis uses quarter note = 33. Do not replace these with an unexplained multiplied number in the UI.
- There are many unrelated uncommitted and untracked files from earlier work. The size of the full working-tree diff does not describe this feature alone.

## Verification performed so far

- An intermediate production build passed.
- Five focused passage-analysis/related-scale tests passed before the latest small spelling and engraving adjustments.
- Type checking at that point reported existing errors in ScaleStudio, Vite config and worker types, with no errors reported in the new close-up files.
- Browser checks on Mendelssohn measures 1–3 showed the selection workflow, original notation, generated notation, note-name labels, a G harmonic minor suggestion and an active playback position line.
- Browser checks on Daphnis measures 4–9 showed the extracted notation and revealed the automatic-beaming problem described above. The corrected first-note spacing was then checked.
- A brief 390px browser-width check was started before the user requested stopping phone verification. The viewport was restored. No physical iPhone or iPad testing was performed. **Do not continue mobile testing until the user approves the design.**

These checks do not mean the design or musical recommendations were accepted. Later edits have not received a final complete verification pass. No commit, push or deployment was performed.

## Recommended next agent sequence

1. Read the current files and preserve unrelated work.
2. Inspect Arnold's actual selected notes to ground the diminished-pattern discussion.
3. Implement and demonstrate a dotted-rhythm card with both directions, including clear timing semantics and matching playback.
4. Replace or demote generic cards that are unhelpful for the selected music.
5. Present the revised musical content and desktop design to the user before spending effort on phone polish.
6. After the user accepts the direction, expand the reusable pattern suggestions and rhythm-teaching tools.

The goal is a musically useful practice aid, not a finished-looking dashboard of generic transformations.
