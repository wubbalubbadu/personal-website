# personal-website

My personal website, live at **[hayliewu.com](https://hayliewu.com)**.

A chat-style landing page, a log of what I am reading, and
**[Cookie Flute Studio](https://hayliewu.com/flute-studio)** — a practice app
for flutists, which is the substantial part.

Built with [vinext](https://github.com/cloudflare/vinext) (Next.js on Cloudflare
Workers) and TypeScript.

---

## Cookie Flute Studio

A practice tool built for my own daily flute practice, mostly on an iPad with
the instrument in my hands. The through-line is that the app knows what is on
the page: the music is **generated**, not stored as files, so the same
description that engraves an exercise also drives playback, the fingering
tooltips and the PDF export.

### Exercises

- **Scale Studio** — generates a scale book from a description: which keys,
  which types (major, minor, chromatic, whole-tone, diminished, augmented),
  scales or arpeggios, range, note order, articulation rotations and rhythm
  variants. Saved sets let you keep a named configuration and reopen it.
- **Long Tones** — held notes by register, and a *De la sonorité* exercise
  (after Moyse) generated at a chosen interval, both directions on one page.
  Includes a live pitch trace: hold a note and watch the line, with duration,
  pitch spread and drift reported per note.

### Reader

Everything is read through one viewer, shared by exercises and repertoire:

- **Engraving** via OpenSheetMusicDisplay from generated MusicXML, with
  adjustable notation size, system spacing, note spacing and page layout
  (single page, fit-to-window, two-page spread)
- **Playback** of the score, a metronome on the Web Audio clock, a tuning drone
  and tap tempo
- **Markup** — draw on the score with a pencil or finger, plus arrows, text
  boxes and sticky notes
- **Note help** — tap a note for its fingering, name, solfège or beat position
- **Vector PDF download** at a fixed traditional notation size, so the printout
  looks like sheet music rather than a screenshot

### Reference

- **Fingering chart** across the flute's range, split by register at E5
- **Trill chart** covering four octaves
- **Body & embouchure** — a 3D model for posture and breathing work
- **Technique roadmap**

### Repertoire

A small library of pieces read through the same viewer.

---

## Learning log

[hayliewu.com/learning-log](https://hayliewu.com/learning-log) — notes from a
CMU course on AI and music, worked through unit by unit with interactive Web
Audio and SVG widgets, alongside standalone notes on individual papers.

---

## Running locally

Requires Node `>=22.13.0`.

```bash
npm install
npm run dev
```

`npm run dev` prints the port it actually bound to — it is not always 3000.

```bash
npm run build    # production build
npm run start    # serve the production build
npm run lint
npm test         # builds, then runs tests/*.test.mjs
```

## Layout

| path | what's there |
| --- | --- |
| `app/` | routes and UI |
| `app/flute-studio/` | Cookie Flute Studio |
| `app/flute-studio/lib/` | pitch detection and note segmentation |
| `app/learning-log/` | course notes and widgets |
| `content/` | music library, fingering data, exercise catalog |
| `db/` | Drizzle schema |
| `docs/BACKLOG.md` | what's planned and what's deliberately parked |

## Notes on the music

Exercises that carry someone else's name are generated from the *procedure*
described in the source, with my own instruction text — no one else's prose or
engraving is reproduced here.
