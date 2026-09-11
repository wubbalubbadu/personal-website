import type { OpenSheetMusicDisplay as OSMDType } from "opensheetmusicdisplay";

// Same canonical 12-tone spelling the rest of the app already uses for
// playback/drone/tuner lookups (see ScoreViewer's pitchClasses/semitones,
// PracticeToolDock's pitches array). Built from the note's absolute
// halfTone (standard MIDI numbering, 60 = C4) rather than OSMD's own
// ToStringShort()/Octave, which turned out not to be in scientific-pitch
// terms — reading those directly produced pitches two octaves too low
// ("C3" for a note that's actually C5) and, for some spellings (Db, Gb...),
// values outside the app's spelling table at all, which crashed playback
// with a non-finite AudioParam. halfTone sidesteps both problems.
const PITCH_CLASSES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
function pitchFromHalfTone(halfTone: number): string {
  const octave = Math.floor(halfTone / 12) - 1;
  const pitchClass = PITCH_CLASSES[((halfTone % 12) + 12) % 12];
  return `${pitchClass}${octave}`;
}

const EPSILON = 1e-6;

// OSMD's NoteEnum: C=0, D=2, E=4, F=5, G=7, A=9, B=11 (whole/half-step
// spacing of the natural letters, not a plain 0-6 index).
const NOTE_ENUM_LETTERS: Record<number, string> = { 0: "C", 2: "D", 4: "E", 5: "F", 7: "G", 9: "A", 11: "B" };

/**
 * Which pitch classes (e.g. "B♭", "F♯") this piece's key signature alters,
 * as the app's own canonical spelling. Used to mark notes whose accidental
 * comes from the key signature rather than a printed accidental — this
 * used to be hardcoded to "any F♯" (Mystery of Love's key, G major, is the
 * one piece that was hand-authored before this existed) and would mark
 * essentially nothing, or the wrong thing, in any other key: a flat-key
 * piece has no F♯s to find, and whatever chromatic F♯ happened to appear
 * elsewhere in the piece got marked instead — "a random sharp" with no
 * relation to the actual key. Reads the same KeyInstruction OSMD itself
 * drew the key signature from, so it's automatically right for whatever
 * piece is loaded, sharps or flats, without re-hardcoding a specific key.
 */
export function resolveKeyAccidentals(osmd: OSMDType): Set<string> {
  const accidentals = new Set<string>();
  const firstMeasure = osmd.Sheet.SourceMeasures[0];
  for (const staffEntry of firstMeasure?.FirstInstructionsStaffEntries ?? []) {
    for (const instruction of staffEntry?.Instructions ?? []) {
      const keyInstruction = instruction as { Key?: number; AlteratedNotes?: number[] };
      if (typeof keyInstruction.AlteratedNotes === "undefined") continue;
      const symbol = (keyInstruction.Key ?? 0) < 0 ? "♭" : "♯";
      for (const note of keyInstruction.AlteratedNotes) {
        const letter = NOTE_ENUM_LETTERS[note];
        if (letter) accidentals.add(`${letter}${symbol}`);
      }
    }
  }
  return accidentals;
}

/**
 * How many `.d` units make one whole note for this piece, i.e. how fine a
 * grid its note durations actually need. Hand-authored pieces (Mystery of
 * Love, Scale Studio) are written against a fixed 16-units-per-whole-note
 * grid (quarter=4, eighth=2, sixteenth=1) — fine for anything down to
 * sixteenth notes. But rounding every duration onto that same grid, the way
 * an earlier version of this function did, silently corrupts anything
 * finer: a 32nd note (1/32 of a whole note) doesn't land on a 16-unit grid
 * point at all, so it got rounded up to a full sixteenth — and every note
 * after it drifted out of place by the rounding error, compounding measure
 * by measure (exactly the "rhythm marking is wrong" bug).
 *
 * Rather than hardcode a resolution, this checks the piece's actual note
 * lengths and picks the coarsest power-of-two grid (16, then 32, then 64)
 * that every one of them lands on exactly — so a piece with only
 * sixteenths still gets the plain 16-grid, and one with 32nd or 64th notes
 * gets bumped to whatever grid represents them exactly, with zero rounding
 * error either way.
 */
function resolveUnitsPerWhole(osmd: OSMDType): number {
  for (const candidate of [16, 32, 64]) {
    let exact = true;
    scan: for (const measure of osmd.Sheet.SourceMeasures) {
      for (const container of measure.VerticalSourceStaffEntryContainers) {
        for (const voiceEntry of container.StaffEntries[0]?.VoiceEntries ?? []) {
          const note = voiceEntry.Notes[0];
          if (!note || note.IsGraceNote) continue;
          const scaled = note.Length.RealValue * candidate;
          if (Math.abs(scaled - Math.round(scaled)) > EPSILON) { exact = false; break scan; }
        }
      }
    }
    if (exact) return candidate;
  }
  return 64; // finer than a 64th is vanishingly rare in solo flute repertoire; closest available grid
}

/**
 * Reads the note sequence straight out of OSMD's already-parsed score —
 * the same data it used to draw the page — instead of it being hand-typed
 * per piece. Assumes a single staff (solo melodic line, e.g. unaccompanied
 * flute) and a single note per voice entry (no chords); a piece with real
 * polyphony/chords would need this extended to walk more than Notes[0].
 *
 * Within that single staff, a "container" (one vertical timeline slot) can
 * still hold more than one VoiceEntry — the case that matters here is a
 * grace note: OSMD puts the grace note and the main note it decorates in
 * the SAME container, as VoiceEntries[0] and VoiceEntries[1]. Reading only
 * VoiceEntries[0] (an earlier version of this function did) silently
 * dropped the main note every time — not just miscounted its duration,
 * dropped the event entirely, so the note's pitch never appeared anywhere
 * and every event index after it was off by one for the rest of the piece.
 * That's why a bug could look like it only started "partway through" a
 * piece: everything before the first grace note lined up by coincidence,
 * and everything from there on was reading one event behind where it
 * should have been. Walking every VoiceEntry in the container (in their
 * given order, which is already grace-before-main) fixes that at the
 * source instead of working around a shifted index downstream.
 *
 * Duration (`d`) is in `unitsPerBeat`-per-quarter-note units (see
 * resolveUnitsPerWhole above) — an exact integer, never rounded, so onset
 * tracking downstream (playback timing, rhythm-count labels) can't drift.
 * Grace notes get d=0 — they borrow time rather than occupying their own
 * beat.
 */
export function deriveScoreEvents(osmd: OSMDType) {
  const unitsPerWhole = resolveUnitsPerWhole(osmd);
  const pitches: (string | null)[] = [];
  const events: { p: string | null; d: number }[] = [];
  const measureStarts: number[] = [];

  for (const measure of osmd.Sheet.SourceMeasures) {
    measureStarts.push(pitches.length);
    for (const container of measure.VerticalSourceStaffEntryContainers) {
      for (const voiceEntry of container.StaffEntries[0]?.VoiceEntries ?? []) {
        const note = voiceEntry.Notes[0];
        if (!note) continue;
        const duration = note.IsGraceNote ? 0 : (Math.round(note.Length.RealValue * unitsPerWhole) || 1);
        if (note.isRest()) {
          pitches.push(null);
          events.push({ p: null, d: duration });
        } else {
          const short = pitchFromHalfTone(note.halfTone);
          pitches.push(short);
          events.push({ p: short, d: duration });
        }
      }
    }
  }
  return { pitches, events, measureStarts, unitsPerBeat: unitsPerWhole / 4 };
}
