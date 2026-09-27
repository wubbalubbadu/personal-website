# Cookie Flute Studio content

## Library music

Add, replace or edit pieces with the local uploader:

```
npm run music:uploader
```

It converts a MuseScore file (`.mscz` / `.mscx`), lets you pick the part the student reads, and writes:

- `public/music/<id>/score.musicxml`: the reading part the viewer loads
- `public/music/<id>/full-score.musicxml`: every part, kept for a future accompaniment
- an entry in `content/music-catalog.json`: title, composer, `tags`, optional `beginner` and `defaultTempo`

Every piece is served by the one shared page, `app/flute-studio/music/[id]/page.tsx`. Don't add a page per piece: `ScoreViewer` reads the notes, rhythm, ties and bars straight from the score (see `app/flute-studio/components/deriveScoreEvents.ts`), so nothing is transcribed by hand. A hand-typed copy is how Mystery of Love ended up playing tied notes twice.

Musical-term explanations come from `content/music-terms.json`. On convert, the uploader lists any marking in the score that the glossary can't explain, with a box for its meaning; meanings you fill in are added to the file when you save. You can also edit the file by hand (one term per line, lowercase keys).

Tags are free text and a piece can have several. The metronome starts at `defaultTempo` if set, otherwise the score's tempo marking, otherwise 76.

A few older pieces keep their files at other paths (`public/mystery-of-love.mxl`, `public/music/<id>/score.mxl` with a `score.pdf`); the catalog's `scorePath` and `pdfPath` point at them.

## Exercises

Exercises come from `content/exercise-catalog.ts`.
