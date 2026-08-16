# Cookie Flute Studio content

Each piece or exercise gets its own folder containing `metadata.json` and, when available, a MusicXML or MXL score.

Browser-readable score files belong in `public/music/<music-id>/score.mxl`. The original Mystery of Love prototype predates this structure and is currently stored at `public/mystery-of-love.mxl`.

Required categories are `exercise`, `repertoire`, `etude`, `method`, or `warm-up`. Required difficulties are `beginner`, `early-intermediate`, `intermediate`, or `advanced`.

When adding an item, copy an existing folder, give it a unique lowercase ID, complete every metadata field, and add its metadata import to `content/music-library.ts`. Set `status` to `coming-soon` until its viewer is ready.
