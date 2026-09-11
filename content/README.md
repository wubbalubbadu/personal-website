# Cookie Flute Studio content

Each piece or exercise gets its own folder containing `metadata.json` and, when available, a MusicXML or MXL score.

Browser-readable score files belong in `public/music/<music-id>/score.mxl` (and `score.pdf` alongside it, if you have a PDF version — set `pdfPath` in the metadata to enable the download button in the viewer). The original Mystery of Love prototype predates this structure and is currently stored at `public/mystery-of-love.mxl`.

Required categories are `exercise`, `repertoire`, `etude`, or `pop`. Required difficulties are `beginner`, `early-intermediate`, `intermediate`, or `advanced`.

When adding a piece with a real score (not a generated exercise like Scale Studio):
1. Copy an existing content folder, give it a unique lowercase ID, fill in every metadata field, and add its metadata import to `content/music-library.ts`.
2. Drop the score at `public/music/<id>/score.mxl` (+ `score.pdf` if you have one).
3. Add `app/flute-studio/music/<id>/page.tsx`, modeled on `music/txt-deja-vu/page.tsx` — just a `ScoreViewer` with `title`/`composer`/`asset`/`id`/`backHref` (and `pdfPath` if applicable). **You do not need to transcribe the notes by hand** — `ScoreViewer` derives the note/rhythm data straight from the loaded score itself (see `components/deriveScoreEvents.ts`). Only pass `pitches`/`events`/`measureStarts` explicitly if a piece needs the sequence overridden (e.g. one melodic line pulled out of a multi-voice/chord score — the auto-derivation currently assumes a single staff, single voice, no chords, which covers solo flute pieces).

Set `status` to `coming-soon` until the viewer page exists.
