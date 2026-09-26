# Music reader teaching TODO

Applies to both Scale Studio and the music sheet viewer. Both render through
`ScoreViewer`, and the "Musical terms" layer reads its facts from the score's
own MusicXML (`app/flute-studio/components/scoreTheory.ts`), so a fix here
lands in both.

- [x] Fix excessive vertical spacing between tempo words such as “Allegro assai,” metronome markings, and the first system. The metronome mark now sits on the same line as its tempo words, on screen and in the PDF.
- [x] Add hover or tap explanations for non-English musical terms, including a plain-English translation and useful tempo range when appropriate. The glossary covers Italian, plus common French and German words. Tempo words list a BPM range and compare it with the score's own metronome mark.
- [x] Make time-signature help contextual. For 4/4, explain four quarter-note beats per measure. For 2/2, identify cut time and explain two half-note beats per measure. Compound meters (6/8, 9/8, 12/8) are explained as dotted beats. The metronome mark tooltip converts to felt beats (♩ = 144 in cut time is 72 half-note beats per minute).
- [x] Add key-signature interpretation to ordinary repertoire scores, using the actual MusicXML key signature and avoiding an unsupported major/minor guess when the mode is ambiguous. With a `<mode>` the key is named. Without one, both keys are given, plus the last note as evidence ("ends on D, which points to D major").
- [x] Reuse the contextual music-theory behavior already developed for Scale Studio instead of showing a generic definition detached from the current score. Scale Studio now names the exact key too ("C minor"), and it points out the raised 7th only when the music under that signature actually writes it.

## Still open

- Theory tooltips are English only. The rest of the reader UI has Chinese.
