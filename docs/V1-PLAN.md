# Cookie Flute Studio 1.0: what is left

Written November 14, 2026 from `TODO.md`, `OPEN-DECISIONS.md`, the catalog files and a quick look at 375px. Local state only; nothing here says what is deployed. Numbers like "decision 5" point at rows in [OPEN-DECISIONS.md](OPEN-DECISIONS.md).

## Where it stands

- **Exercises hub:** 5 entries in `content/exercise-catalog.ts` (Scale Studio, Long tones, Extended Techniques, Breathing Lab, Tonguing Drills) plus Tricky bits. No melody exercise exists yet; "Warm-up melodies" is only an idea in COOKIE-TODO-UPDATED.md.
- **Library:** 48 pieces. Etude 15, Classical 11, Pop 10, Accompaniment 9, Exercise 7, Folk 5, Excerpt 3. Only 7 are flagged beginner. Two books (Köhler Op. 33, Reichert Op. 5).
- **Tests:** last recorded run was 226 passing with 25 lint warnings (October 19). Not rerun today.
- **Uncommitted now:** the Nov 12 flat tile restyle (13 studio files) and the spa prototype in `/lab`.

## A. Your four launch items

### 1. Melody exercises (new, direction set November 14)
- **Decided:** one collection of short exercises (a few bars each: melodies, octave jumps, intervals), listed by the exercise itself. No skill labels, since one exercise often trains several things. Each is shown through the keys and can be transposed. Haylie's own version of a Reichert book.
- **Still open:** one key at a time or all keys written out; key order; the name; which exercises from her routine go in first.
- Earlier notes, kept for reference:
- The only written idea: pick a melody, it is written out moving up by half steps, saved ones sit with saved sets.
- Open before any build: what the exercise is for (tone, intervals, phrasing), where melodies come from (public domain tunes, your own), how many for 1.0, and whether it reuses Scale Studio's engraving and saved sets.
- Copyright: Moyse and Trevor Wye melody books cannot be transcribed. Folk tunes and pre-1930 melodies can.

### 2. More pieces
- Thin spots: beginner (7), excerpts (3), folk (5). Classical has 11 but few slow, lyrical pieces.
- Planned and unbuilt: Taffanel and Gaubert, more Reichert, as pattern generators.
- Each added piece needs: tags, beginner check, default tempo, composer card entry, a read through on iPad.
- Decide a target number so this has an end.

### 3. Phone
Seen today at 375px:
- Header targets are 32px wide (logo 28px). Under the 44px guideline. Waits on decision 5 (phone navigation).
- Home: the "Browse music" tile shows an empty body with "…" while its neighbours show a preview.
- Home: Learn has five tiles, so one sits alone on the last row.
- Reader: two toolbar rows plus the header take about 150px before the music starts. Tempo minus and plus are 26px wide, option arrows 18 to 20px.
- Reader: the red record dot sits high and left of its row, out of line with the pencil.
- Library: tag chips scroll sideways with no hint; status chips still the grey capsules (decision 8).
- No sideways page scroll on home, Library, Exercises or the reader.

Already listed and still open:
- Köhler reader header 13px too wide, gear off the edge (decision 25).
- Running practice clock plus four tabs do not fit; "Learn" cut at 320px.
- Customize scales panel grouping (decision 20).
- Fingering chart, trill chart, Breathing Lab, theory lessons: built or revised, never accepted on a phone.
- Tools button in the phone reader: it shows today; the old note said hidden. Confirm which is meant.
- Superseded phone rules in `studio-shell.css`.

### 4. Icons, sheet music viewer, front page
- **Icons:** no single list of every icon and where it is used. Toolbar icon spacing per page was deferred. Old soft green buttons remain on seven pages (decision 9). Selected state colour is mixed: purple, green, dark, blue (decision 6).
- **Viewer:** Listen and Record swap order by width (decision 22). Slurs cut through high notes in the Arnold. Nine invalid `font:` shorthands render controls small (decision 12). Tempo word without a metronome mark has no speed rule (decision 37).
- **Studio home:** the flat tiles are in progress. Still open: Tools or Learn as a section, where "Your studio" sits, what a returning player sees first (decisions 1, 15).
- **Site front page:** out of 1.0. Decided November 14: 1.0 is the studio only. Cat host or 3D handheld (decision 3) waits until after.

## B. Should fix before launch (not on your list)

- **Drone crash:** transposing a piece with a hand-set drone can crash on E sharp, B sharp, C flat, F flat. Reachable on Daphnis (decision 31).
- **Melodic minor below the flute's range** in "Low B to high D" (decision 32).
- **404s for five CSS modules** on every studio page (decision 45).
- **`<html lang>`** does not follow the language setting (decision 23). One line.
- **Dialog focus:** no focus trap or restore in the shared dialog.
- **Real device checks:** all eleven items in TODO section 1 are unchecked, plus mock audition recording, offline music on iPad and the new tool sounds. Recording, the metronome after mic use and device transfer are the ones that would embarrass a launch.
- **Commit the tile restyle** once you accept it, so 1.0 work starts from a clean tree.

## C. Fine to leave out of 1.0

Sign in and sync, recordings list, auto logging, advanced metronome, keyboard bar selection, the paused experiments, composer cards for pop, theory lesson principle fixes, the 25 lint warnings (no user effect), the spa and handheld lab pages if the landing stays as is.

## Suggested order

1. Decide the 1.0 line: studio only (decided). Still to set: how many melodies and pieces.
2. Section B bugs. Small, no design needed.
3. Phone navigation decision, then the phone list in one pass.
4. Icon inventory and viewer toolbar, with two or three mockups first.
5. Melody exercise: design, then build.
6. Pieces, added in batches alongside the rest.
7. Real device pass on iPhone and iPad with a flute. Last, because everything above changes what is tested.
