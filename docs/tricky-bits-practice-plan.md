# Tricky bits: practise inside the bit (plan, draft 1; first version built October 8, 2026)

> **Built:** `BitPractice` (wrapped music, Listen, TempoPill on the shared metronome, a rep ladder per tempo with +1 and −, total), used by the card dialog and a new Continuous view (switch at the top right). Reps are stored per tempo (`cookie:tricky-bits:reps:v1`); old totals moved onto the fastest tempo. The clock logs one "Tricky bits" session for the page. Later the same day: Listen uses the reader's playback cursor (`measureStops`/`cursorAt`); the reader's Show on the page has a "Tricky bits" toggle (bookmark icon, only on pieces with saved bits) that shades them yellow (`.tricky-bar`), while opening from a bit still selects it in purple (purple = selected). **Not yet:** the goal tempo (hidden from the practice view, still saved). **Idea (parked):** the rep counter as its own component, e.g. on Scale Studio ("this scale 3 times") or in the tools panel, maybe as a small pill like the tempo pill; the user worries about adding controls.

October 8, 2026. From the user's review of the tricky bit dialog. Not built. Questions at the end.

## The goal

Today a tricky bit is a place to look at a passage. It should be a place to **practise** it: play it at a tempo a few
times, step the tempo up, see how many reps you did at each tempo, and never scroll while doing it.

## What's wrong now (from the review)

1. The music is cut off on the right (bar 46 is clipped) instead of wrapping to a second line.
2. The dialog scrolls; you can't practise and scroll at the same time.
3. Controls are scattered: Listen, a tempo chip (69), a round +, "+6", a goal bar, a separate − / + rep counter at the
   bottom. It isn't clear what "69" or "+6" do.
4. No metronome, though you're practising against a tempo.
5. Reps are one total. The way you actually practise is "5 at 69, then 5 at 75", so reps belong to a tempo.
6. Listen's moving line doesn't behave like the playback cursor in the score reader.
7. "Open full piece" opens the start of the piece, not the bit.

## The redesign

**Layout, top to bottom, all visible without scrolling (desktop, iPad, phone landscape):**

1. Header: the piece and bars ("Fantasy for Flute Solo, bars 43 to 46"), the 1 / 3 stepper, a plain × (DESIGN.md).
2. The music, **wrapped onto as many lines as it needs** at the dialog's width, never cut off or scrolled sideways.
   A short bit stays one line and the dialog stays short.
3. One control row: **Listen**, **Metronome** (clicks at the current tempo, same sound as the practice dock's), and
   the current tempo as a number you can tap to change.
4. The **tempo ladder**: one row per tempo you've worked at, low to high. Each row: the tempo, its tally sticks, and a
   single **+1** button. The current tempo's row is highlighted; tapping another row makes it current (and sets the
   metronome). A last row "Add 75" (current plus your step) starts the next tempo. The goal tempo, if set, is a quiet
   marker at the top of the ladder, and the row that reaches it turns green.
5. Total reps for the bit in small text beside the ladder heading.

**Listen** uses the reader's own playback cursor (the purple one from the score viewer) so it moves the same way.

**Open full piece** opens the reader at bar 43 with bars 43 to 46 highlighted in **yellow** (the same shape as the
purple measure selection, a different colour). The reader's View menu gets **Show tricky bits**: every saved bit in
the piece highlighted in yellow, tap one to open its dialog.

**Data:** tallies move from one number per bit to `{tempo: count}` per bit. Existing totals migrate onto the bit's
highest tempo so nothing is lost. Transfer merge rules need the new shape.

## Who builds what (suggestion)

- **Codex:** "Open full piece" at the bit with the yellow highlight, and the View menu toggle. Well specified, no
  taste calls, and testable.
- **Claude:** the dialog layout, the ladder and the wrapped music (design-heavy, needs screenshots).
- The tally data change and its migration can go to either, with a test.

## Questions for you

1. **Reps per tempo:** is "+1 per rep" right, or do you want to log a set at once ("5 at 69")?
2. **Tempo changes:** keep a fixed step (+6 today) for the "Add next tempo" row, or type any tempo each time?
3. **Should a bit's reps reset** (each day or each week), or keep counting forever? The tally sticks get long otherwise.
4. **Me page cards for tricky bits:** show the little line of music on each card (like the Tricky bits page), or keep
   them as text cards?
