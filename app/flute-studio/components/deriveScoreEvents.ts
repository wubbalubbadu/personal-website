import type { OpenSheetMusicDisplay as OSMDType } from "opensheetmusicdisplay";
import { ArticulationEnum, OrnamentEnum } from "opensheetmusicdisplay";

/** OSMD's DynamicEnum and ContDynamicEnum values; the package does not export them. */
enum DynamicEnum { pppppp, ppppp, pppp, ppp, pp, p, mp, mf, f, ff, fff, ffff, fffff, ffffff, sf, sff, sfp, sfpp, fp, rf, rfz, sfz, sffz, fz, other }
enum ContDynamicEnum { crescendo, diminuendo }
import type { ArticulationMode } from "./notePatterns";
import {durationUnits,exactUnitsPerWhole} from "./rhythmGrid";

// Same canonical 12-tone spelling the rest of the app already uses for
// playback/drone/tuner lookups (see ScoreViewer's pitchClasses/semitones,
// PracticeToolDock's pitches array). Built from the note's absolute
// halfTone rather than OSMD's own ToStringShort()/Octave, which turned out
// not to be in scientific-pitch terms — reading those directly produced
// pitches two octaves too low ("C3" for a note that's actually C5) and, for
// some spellings (Db, Gb...), values outside the app's spelling table at
// all, which crashed playback with a non-finite AudioParam.
//
// halfTone is NOT MIDI numbering, despite looking like it: OSMD counts from
// C0 = 0, so middle C is 48, not 60. Subtracting the usual MIDI offset of 1
// here made every derived pitch exactly one octave flat — a two-octave
// scale written C4–C6 came back as C3–C5. That sounded an octave low
// through playback and the drone, and it silently disabled the third-octave
// fingering table, whose `octave === "6"` test could then only ever be hit
// by a written C7.
const PITCH_CLASSES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
function pitchFromHalfTone(halfTone: number): string {
  const octave = Math.floor(halfTone / 12);
  const pitchClass = PITCH_CLASSES[((halfTone % 12) + 12) % 12];
  return `${pitchClass}${octave}`;
}

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
  const lengths:{Numerator:number;Denominator:number}[]=[];
  for (const measure of osmd.Sheet.SourceMeasures) for (const container of measure.VerticalSourceStaffEntryContainers) {
    for (const voiceEntry of container.StaffEntries[0]?.VoiceEntries ?? []) {
      const note=voiceEntry.Notes[0];
      if(note&&!note.IsGraceNote)lengths.push(note.Length);
    }
  }
  return exactUnitsPerWhole(lengths);
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
 * resolveUnitsPerWhole above). Grace notes get d=0 — they borrow time
 * rather than occupying their own beat.
 *
 * A triplet (or anything else whose true length needs a factor of 3, which
 * no power-of-two grid can hit exactly no matter how fine) is the one case
 * resolveUnitsPerWhole can't make exact. Rather than round each such
 * note's length in isolation — which is what silently produced the
 * original "rhythm is wrong" bug, just a smaller-magnitude version of it —
 * this tracks the note's TRUE running position (`exactOnset`, never
 * rounded) alongside the discrete position implied by every duration
 * handed out so far (`roundedOnset`), and derives each note's `d` as the
 * difference between the newly-rounded true position and the previous
 * one. A triplet's three notes might come out slightly uneven this way
 * (e.g. 5,5,6 units instead of a "true" 5.33 each) — but the position
 * right after the triplet, the next downbeat, is always exactly where it
 * belongs, because it's a rounding of the real position rather than a sum
 * of three already-rounded guesses compounding their own error. Good
 * enough: nothing needs a labeled position inside the triplet itself, and
 * the downbeats around it stay correct.
 */
/**
 * How loud each dynamic plays, relative to mf, as amplitude from decibels:
 * ppp −20, pp −15, p −10, mp −5, mf 0, f +4, ff +7, fff +9. Loudness is
 * heard in decibels, so the old linear table (pp .55 … ff 1.32, about 9 dB
 * top to bottom) made p and ff hard to tell apart; this spans about 29 dB,
 * close to MuseScore's playback. Accents change one note only; fp/sfp drop
 * to soft after it.
 */
const dB = (value: number) => Math.round(10 ** (value / 20) * 100) / 100;
const DYNAMIC_LEVEL: Partial<Record<DynamicEnum, number>> = {
  [DynamicEnum.pppppp]: dB(-20), [DynamicEnum.ppppp]: dB(-20), [DynamicEnum.pppp]: dB(-20), [DynamicEnum.ppp]: dB(-20),
  [DynamicEnum.pp]: dB(-15), [DynamicEnum.p]: dB(-10), [DynamicEnum.mp]: dB(-5), [DynamicEnum.mf]: 1,
  [DynamicEnum.f]: dB(4), [DynamicEnum.ff]: dB(7), [DynamicEnum.fff]: dB(9), [DynamicEnum.ffff]: dB(9), [DynamicEnum.fffff]: dB(9), [DynamicEnum.ffffff]: dB(9),
};
/** The quietest and loudest a hairpin with no closing dynamic can reach. */
const LEVEL_FLOOR = dB(-20), LEVEL_CEILING = dB(9);
const ACCENTS = new Set([DynamicEnum.sf, DynamicEnum.sff, DynamicEnum.sfz, DynamicEnum.sffz, DynamicEnum.fz, DynamicEnum.rf, DynamicEnum.rfz, DynamicEnum.sfp, DynamicEnum.sfpp, DynamicEnum.fp]);
const AFTER_ACCENT: Partial<Record<DynamicEnum, number>> = { [DynamicEnum.sfp]: dB(-10), [DynamicEnum.fp]: dB(-10), [DynamicEnum.sfpp]: dB(-15) };

/** Letters as OSMD's NoteEnum semitones, and the order sharps and flats are added to a key. */
const LETTERS = [0, 2, 4, 5, 7, 9, 11];
const SHARP_ORDER = [5, 0, 7, 2, 9, 4, 11], FLAT_ORDER = [11, 4, 9, 2, 7, 0, 5];
/** AccidentalEnum values to semitones: SHARP, FLAT, NONE, NATURAL, DOUBLESHARP, DOUBLEFLAT. */
const ACCIDENTAL_STEPS: Record<number, number> = { 0: 1, 1: -1, 3: 0, 4: 2, 5: -2 };
/**
 * The note a trill alternates with: the next letter up, sharpened or
 * flattened by the key signature, unless the trill prints its own
 * accidental (tr♯, tr♭). Accidentals earlier in the bar are not tracked.
 */
function trillUpper(note: { halfTone: number; Pitch: { FundamentalNote: number; AccidentalHalfTones: number } }, fifths: number, printed: number | undefined) {
  const at = LETTERS.indexOf(note.Pitch.FundamentalNote);
  if (at < 0) return null;
  const letter = LETTERS[(at + 1) % 7], step = (letter - LETTERS[at] + 12) % 12;
  const fromKey = fifths > 0 && SHARP_ORDER.slice(0, fifths).includes(letter) ? 1 : fifths < 0 && FLAT_ORDER.slice(0, -fifths).includes(letter) ? -1 : 0;
  const alter = printed !== undefined && printed in ACCIDENTAL_STEPS ? ACCIDENTAL_STEPS[printed] : fromKey;
  return pitchFromHalfTone(note.halfTone - note.Pitch.AccidentalHalfTones + step + alter);
}

export function deriveScoreEvents(osmd: OSMDType) {
  const unitsPerWhole = resolveUnitsPerWhole(osmd);
  const pitches: (string | null)[] = [];
  const events: { p: string | null; d: number; tied: boolean; articulation: ArticulationMode; slurContinuation: boolean; level: number; accent?: boolean; trill?: string }[] = [];
  // Every dynamic and hairpin in the first staff, in score time (whole notes
  // from the start), so each note can look up how loud it should play.
  type Mark = { at: number; dynamic?: DynamicEnum; wedge?: { rising: boolean; until: number } };
  const marks: Mark[] = [];
  for (const measure of osmd.Sheet.SourceMeasures) {
    for (const expression of measure.StaffLinkedExpressions?.[0] ?? []) {
      const at = measure.AbsoluteTimestamp.RealValue + expression.Timestamp.RealValue;
      if (expression.InstantaneousDynamic) marks.push({ at, dynamic: expression.InstantaneousDynamic.DynEnum });
      const wedge = expression.StartingContinuousDynamic;
      if (wedge?.EndMultiExpression) marks.push({ at, wedge: { rising: wedge.DynamicType === ContDynamicEnum.crescendo, until: wedge.EndMultiExpression.AbsoluteTimestamp.RealValue } });
    }
  }
  marks.sort((a, b) => a.at - b.at);
  let level = 1, markIndex = 0, fifths = 0, wedge: { from: number; start: number; until: number; to: number } | null = null;
  const EPS = 1e-6;
  const measureStarts: number[] = [];

  for (const measure of osmd.Sheet.SourceMeasures) {
    measureStarts.push(pitches.length);
    for (const entry of measure.FirstInstructionsStaffEntries ?? []) for (const instruction of entry?.Instructions ?? []) {
      const key = (instruction as { Key?: unknown; keyTypeOriginal?: unknown });
      if ("keyTypeOriginal" in key && typeof key.Key === "number") fifths = key.Key;
    }
    for (const container of measure.VerticalSourceStaffEntryContainers) {
      // Catch up on the marks up to this moment. An accent printed right here
      // belongs to this note only; a hairpin ramps toward the next dynamic
      // after it ends, or one step louder/softer if none follows.
      const now = measure.AbsoluteTimestamp.RealValue + container.Timestamp.RealValue;
      let accentHere = false;
      while (markIndex < marks.length && marks[markIndex].at <= now + EPS) {
        const mark = marks[markIndex++];
        if (mark.dynamic !== undefined && ACCENTS.has(mark.dynamic)) { if (Math.abs(mark.at - now) < EPS) accentHere = true; level = AFTER_ACCENT[mark.dynamic] ?? level; wedge = null; }
        else if (mark.dynamic !== undefined && DYNAMIC_LEVEL[mark.dynamic] !== undefined) { level = DYNAMIC_LEVEL[mark.dynamic]!; wedge = null; }
        else if (mark.wedge && mark.wedge.until > mark.at) {
          const next = marks.find(later => later.dynamic !== undefined && DYNAMIC_LEVEL[later.dynamic] !== undefined && later.at >= mark.wedge!.until - EPS && later.at <= mark.wedge!.until + .25);
          // With no dynamic at its end, a hairpin moves about one step (5 dB).
          const to = next ? DYNAMIC_LEVEL[next.dynamic!]! : Math.min(LEVEL_CEILING, Math.max(LEVEL_FLOOR, level * (mark.wedge.rising ? dB(5) : dB(-5))));
          wedge = { from: level, start: mark.at, until: mark.wedge.until, to };
        }
      }
      if (wedge && now >= wedge.until - EPS) { level = wedge.to; wedge = null; }
      const loudness = wedge ? wedge.from + (wedge.to - wedge.from) * (now - wedge.start) / (wedge.until - wedge.start) : level;
      for (const voiceEntry of container.StaffEntries[0]?.VoiceEntries ?? []) {
        const note = voiceEntry.Notes[0];
        if (!note) continue;
        const short = note.isRest() ? null : pitchFromHalfTone(note.halfTone);
        if (note.IsGraceNote) { pitches.push(short); events.push({ p: short, d: 0, tied: false, articulation: "tongue", slurContinuation: false, level: loudness }); continue; }
        // A tie is two separate written notes (that's how MusicXML/OSMD
        // represent it — see .NoteTie/.Tie.StartNote), not one continuous
        // one; nothing here merges them. So without this check, the second
        // note plays back as a fresh attack — the note IS correctly read
        // as tied for notation purposes (hover already showed that), the
        // gap was purely on the playback side never asking. `tied` marks a
        // note as continuing the sound of whatever came before it rather
        // than starting a new one; togglePlayback uses it to skip the
        // re-attack and extend the previous note's tone across it instead.
        const tied = !!note.NoteTie && note.NoteTie.StartNote !== note;
        // Slur wins over a printed articulation mark if a note somehow has
        // both — a slurred note is legato regardless of what's under it.
        const slur = note.NoteSlurs[0];
        const hasMark = (kind: ArticulationEnum) => voiceEntry.Articulations.some(a => a.articulationEnum === kind);
        const articulation: ArticulationMode = slur ? "slur" : hasMark(ArticulationEnum.staccato) ? "staccato" : hasMark(ArticulationEnum.tenuto) ? "tenuto" : "tongue";
        const slurContinuation = !!slur && slur.StartNote !== note;
        // The score-wide grid is the LCM of OSMD's rational duration
        // denominators, so this is exact for tuplets as well as binary note
        // values. No running rounded onset means no accumulated drift.
        const duration = durationUnits(note.Length,unitsPerWhole);
        if(!Number.isInteger(duration)||duration<=0)throw new Error(`Unsupported score duration ${note.Length.toString()}`);
        pitches.push(short);
        const ornament = voiceEntry.OrnamentContainer;
        const trill = short && ornament?.GetOrnament === OrnamentEnum.Trill ? trillUpper(note as unknown as Parameters<typeof trillUpper>[0], fifths, ornament.AccidentalAbove as number | undefined) : null;
        events.push({ p: short, d: duration, tied, articulation, slurContinuation, level: Math.round(loudness * 100) / 100, ...(accentHere ? { accent: true } : {}), ...(trill ? { trill } : {}) });
      }
    }
  }
  return { pitches, events, measureStarts, unitsPerBeat: unitsPerWhole / 4 };
}
