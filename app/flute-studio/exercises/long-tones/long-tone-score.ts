/**
 * Long-tone exercises, generated rather than transcribed.
 *
 * Both books work the same way. Moyse starts on a good mf B and walks a
 * small shape down to the bottom of the flute — or up — moving it one
 * semitone at a time; his four exercises differ only in how far apart the
 * notes inside that shape are. Wye instead pins the B down and reaches
 * further from it on each repetition: B–A, B–A♭, B–G. So there are really
 * only two ideas here, `walk` and `widen`, and every exercise in either
 * book is one of them with different numbers.
 *
 * That is why nothing below mentions Moyse or Wye. A melodic exercise
 * later is the same object with a longer shape.
 *
 * Kept separate from scale-score.ts: a scale is a path through a key, a
 * long tone is a shape on a chromatic ladder with no key and no degrees.
 */

import { registerForMidi } from "../../../../content/fingerings/flute";

/** Note values, as multiples of a quarter note. */
const VALUE_BEATS = { quarter: 1, half: 2, dottedHalf: 3, whole: 4 } as const;
export type NoteValue = keyof typeof VALUE_BEATS;

/**
 * The B Moyse tells you to find before anything else — the high B, not the
 * one an octave below it. Everything starts here and walks outwards.
 */
export const PIVOT_MIDI = 83;
/** Low B — the bottom of the instrument. */
export const LOWEST_MIDI = 59;
/** High D — as far up as these books ask you to go. */
export const HIGHEST_MIDI = 98;

/** The stretch of the flute an exercise is asked to cover. */
export type ToneSpan = { low: number; high: number };

/**
 * Where the exercise runs, shared by every exercise on the page rather
 * than set per exercise — a student who only has two octaves has them for
 * held notes and for Moyse alike.
 */
export const RANGE_PRESETS = [
  { id: "standard", label: "Low C to high C", zh: "低音 C 到高音 C", low: 60, high: 96 },
  { id: "full", label: "Low B to high D", zh: "低音 B 到高音 D", low: 59, high: 98 },
] as const;
export type RangePresetId = (typeof RANGE_PRESETS)[number]["id"] | "custom";


/**
 * Every semitone of the range, in order, split into registers.
 *
 * No pivot and no direction: this is not a shape being moved around, it is
 * the whole instrument one note at a time, which is why it takes none of
 * the pattern settings the other exercises do.
 */
export function heldNoteSections(span: ToneSpan) {
  const sections: { id: string; label: string; zh: string; notes: ToneNote[] }[] = [];
  for (let midi = span.low; midi <= span.high; midi += 1) {
    const register = registerForMidi(midi);
    const last = sections[sections.length - 1];
    const note: ToneNote = { ...spellMidi(midi, false), value: "whole", fermata: true };
    if (last && last.id === register.id) last.notes.push(note);
    else sections.push({ id: register.id, label: register.en, zh: register.zh, notes: [note] });
  }
  return sections;
}

export type Direction = "down" | "up";

export type TonePattern = {
  id: string;
  label: string;
  zhLabel: string;
  /**
   * Semitones between adjacent notes of a group — and the number of the
   * exercise in the book: his No. 1 moves in half steps, No. 2 in whole
   * steps, and so on.
   */
  step: number;
  /**
   * Notes per group, phase by phase. The exercise walks the whole range in
   * slurred pairs, then walks it again in threes, then in fives, then in
   * nines: the interval never changes, the phrase just gets longer, which
   * is the whole progression of one of his exercises.
   *
   * Confirmed against a transcription of the pages: every phase advances
   * its starting note by exactly (length - 1) x step, so the groups chain
   * head to tail rather than overlapping.
   */
  phases: readonly number[];
  /**
   * Hairpins and dynamic words. Left off for now — the book marks them "ad
   * libitum" anyway — but the shape is here so taper, swell, sudden
   * change and the rest can be added as a setting without reworking this.
   */
  dynamic?: { from: string; to: string; shape: "crescendo" | "diminuendo" };
};

export type ToneNote = { step: string; alter: number; octave: number; midi: number; value: NoteValue; fermata: boolean };
export type ToneBlock = { label: string; heading?: string; notes: ToneNote[] };

const SHARP_SPELLING = [
  ["C", 0], ["C", 1], ["D", 0], ["D", 1], ["E", 0], ["F", 0],
  ["F", 1], ["G", 0], ["G", 1], ["A", 0], ["A", 1], ["B", 0],
] as const;
const FLAT_SPELLING = [
  ["C", 0], ["D", -1], ["D", 0], ["E", -1], ["E", 0], ["F", 0],
  ["G", -1], ["G", 0], ["A", -1], ["A", 0], ["B", -1], ["B", 0],
] as const;

/**
 * Long tones carry no key signature, so every accidental is written out
 * and the only question is which way to spell it. The books use the
 * direction of travel: flats going down, sharps going up.
 */
export function spellMidi(midi: number, preferFlats: boolean) {
  const [step, alter] = (preferFlats ? FLAT_SPELLING : SHARP_SPELLING)[((midi % 12) + 12) % 12];
  return { step, alter, octave: Math.floor(midi / 12) - 1, midi };
}

/**
 * The twelve names as a flutist writes them — sharps where the sharp
 * spelling is the common one, flats where it is not. Used by the range
 * picker, which is choosing a note rather than notating one, so it wants
 * one name per key rather than both spellings.
 */
export const PITCH_CLASSES = [
  { pc: 0, label: "C" }, { pc: 1, label: "C\u266f" }, { pc: 2, label: "D" }, { pc: 3, label: "E\u266d" },
  { pc: 4, label: "E" }, { pc: 5, label: "F" }, { pc: 6, label: "F\u266f" }, { pc: 7, label: "G" },
  { pc: 8, label: "A\u266d" }, { pc: 9, label: "A" }, { pc: 10, label: "B\u266d" }, { pc: 11, label: "B" },
] as const;

/** Octaves the flute actually reaches, for the picker's dropdown. */
export const OCTAVES = [3, 4, 5, 6, 7];

export const midiFor = (octave: number, pc: number) => (octave + 1) * 12 + pc;
export const octaveOf = (midi: number) => Math.floor(midi / 12) - 1;
export const pitchClassOf = (midi: number) => ((midi % 12) + 12) % 12;

export const noteName = (midi: number, preferFlats = true) => {
  const { step, alter, octave } = spellMidi(midi, preferFlats);
  return `${step}${alter < 0 ? "♭" : alter > 0 ? "♯" : ""}${octave}`;
};

/**
 * Where the exercise actually begins.
 *
 * Moyse starts on a good B, but the range is a fact about the player, not
 * about the exercise — a student who only has two octaves still gets to do
 * this. When B is inside their range it stays the anchor; when it is not,
 * the nearest note they have takes its place, which is what a teacher
 * would do. Anchoring on B regardless produced an empty page for any range
 * that did not happen to contain it.
 */
const startingNote = (span: ToneSpan) => Math.max(span.low, Math.min(span.high, PIVOT_MIDI));

/**
 * One phase of the exercise: the same group length walked from the pivot
 * to the end of the range, each group starting where the last one
 * finished.
 */
function phaseBlocks(pattern: TonePattern, length: number, direction: Direction, span: ToneSpan): ToneBlock[] {
  const sign = direction === "down" ? -1 : 1;
  const flats = direction === "down";
  const advance = (length - 1) * pattern.step;
  const blocks: ToneBlock[] = [];
  if (advance <= 0) return blocks;
  for (let seed = startingNote(span); ; seed += sign * advance) {
    const midis = Array.from({ length }, (_, index) => seed + sign * index * pattern.step);
    if (midis.some(midi => midi < span.low || midi > span.high)) break;
    blocks.push({
      label: noteName(midis[0], flats),
      notes: midis.map((midi, index) => ({
        ...spellMidi(midi, flats),
        // Every note passes through except the one you land on, which is
        // the point of the exercise and is held.
        value: index === midis.length - 1 ? "half" : "quarter",
        fermata: false,
      })),
    });
  }
  // The last group of a phase closes on a held note rather than moving on.
  const last = blocks[blocks.length - 1];
  if (last) {
    const tail = last.notes[last.notes.length - 1];
    last.notes[last.notes.length - 1] = { ...tail, value: "whole", fermata: true };
  }
  return blocks;
}

/**
 * The whole exercise in one direction: pairs first, then threes, then
 * fives, then nines, each phase covering the range again.
 */
export function toneBlocks(pattern: TonePattern, direction: Direction, span: ToneSpan): ToneBlock[][] {
  return pattern.phases.map(length => phaseBlocks(pattern, length, direction, span)).filter(phase => phase.length);
}

/** Lowest and highest note the exercise will ask for. */
export function toneRange(pattern: TonePattern, direction: Direction, span: ToneSpan) {
  const all = toneBlocks(pattern, direction, span).flat().flatMap(block => block.notes.map(note => note.midi));
  return all.length ? { low: Math.min(...all), high: Math.max(...all) } : { low: PIVOT_MIDI, high: PIVOT_MIDI };
}

const DIVISIONS = 4;

function noteXml(note: ToneNote, slur: "start" | "stop" | null) {
  const notations: string[] = [];
  if (slur === "start") notations.push('<slur type="start" number="1"/>');
  if (slur === "stop") notations.push('<slur type="stop" number="1"/>');
  if (note.fermata) notations.push('<fermata type="upright"/>');
  const dot = note.value === "dottedHalf" ? "<dot/>" : "";
  const type = note.value === "dottedHalf" ? "half" : note.value;
  return `<note><pitch><step>${note.step}</step><alter>${note.alter}</alter><octave>${note.octave}</octave></pitch>`
    + `<duration>${VALUE_BEATS[note.value] * DIVISIONS}</duration>${dot}<type>${type}</type>`
    + `${notations.length ? `<notations>${notations.join("")}</notations>` : ""}</note>`;
}

/**
 * One group as one measure.
 *
 * A measure per group rather than a strict metre: these are read as
 * shapes, and the barline's job here is to close the repeat, not to count
 * beats. The time signature is emitted but not printed, exactly as the
 * scale book does it, so the engraver still has something to space
 * against.
 */
function groupXml(block: ToneBlock, pattern: TonePattern, number: number) {
  const beats = block.notes.reduce((total, note) => total + VALUE_BEATS[note.value], 0);
  const attributes = number === 1
    ? `<attributes><divisions>${DIVISIONS}</divisions><key><fifths>0</fifths></key>`
      + `<time print-object="no"><beats>${beats}</beats><beat-type>4</beat-type></time>`
      + `<clef><sign>G</sign><line>2</line></clef></attributes>`
    : "";
  const heading = block.heading
    ? `<direction placement="above"><direction-type><words font-weight="bold" font-size="11">${block.heading}</words></direction-type></direction>`
    : "";
  // Every group repeats — the instruction is to play each one twice.
  const open = '<barline location="left"><bar-style>heavy-light</bar-style><repeat direction="forward"/></barline>';
  const close = '<barline location="right"><bar-style>light-heavy</bar-style><repeat direction="backward"/></barline>';
  const words = (text: string) => `<direction placement="below"><direction-type><words font-style="italic" font-weight="bold">${text}</words></direction-type></direction>`;
  const wedge = (type: string) => `<direction placement="below"><direction-type><wedge type="${type}"/></direction-type></direction>`;
  const dynamic = pattern.dynamic;
  const notes = block.notes.map((note, index) => {
    // The whole group is under one slur: it is one breath.
    const slur = block.notes.length < 2 ? null
      : index === 0 ? "start" as const
      : index === block.notes.length - 1 ? "stop" as const
      : null;
    const before = dynamic && index === 0 ? words(dynamic.from) + wedge(dynamic.shape) : "";
    const after = dynamic && index === block.notes.length - 1 ? wedge("stop") + words(dynamic.to) : "";
    return before + after + noteXml(note, slur);
  }).join("");
  return `<measure number="${number}" implicit="yes">${attributes}${open}${heading}${notes}${close}</measure>`;
}

/**
 * The held-note book: every note of the range, one to a bar, each with the
 * register it belongs to named above the first of them.
 *
 * Each register starts on a new line whether or not line breaks are on —
 * the heading is the point of the split, and a heading stranded mid-line
 * reads as a label on one note rather than on the section it opens.
 */
export function heldNotesMusicXML(span: ToneSpan, newLines = false): string {
  let number = 0;
  const measures = heldNoteSections(span).flatMap((section, sectionIndex) =>
    section.notes.map((note, noteIndex) => {
      number += 1;
      const first = noteIndex === 0;
      const attributes = number === 1
        ? `<attributes><divisions>${DIVISIONS}</divisions><key><fifths>0</fifths></key>`
          + `<time print-object="no"><beats>4</beats><beat-type>4</beat-type></time>`
          + `<clef><sign>G</sign><line>2</line></clef></attributes>`
        : "";
      const brk = (first && sectionIndex > 0) || (newLines && !first) ? '<print new-system="yes"/>' : "";
      const heading = first
        ? `<direction placement="above"><direction-type><words font-weight="bold" font-size="11">${section.label}</words></direction-type></direction>`
        : "";
      const open = '<barline location="left"><bar-style>heavy-light</bar-style><repeat direction="forward"/></barline>';
      const close = '<barline location="right"><bar-style>light-heavy</bar-style><repeat direction="backward"/></barline>';
      return `<measure number="${number}" implicit="yes">${attributes}${brk}${open}${heading}${noteXml(note, null)}${close}</measure>`;
    }));
  return `<?xml version="1.0" encoding="utf-8"?><score-partwise version="4.0">`
    + `<part-list><score-part id="P1"><part-name>Flute</part-name></score-part></part-list>`
    + `<part id="P1">${measures.join("")}</part></score-partwise>`;
}

/**
 * Both directions on one page: the descending exercise, then the ascending
 * one starting on a new line. Two pages would mean choosing between them,
 * and they are the same exercise.
 */
export function longToneMusicXML(pattern: TonePattern, span: ToneSpan, newLines = false): string {
  let number = 0;
  const parts: string[] = [];
  for (const direction of ["down", "up"] as Direction[]) {
    const phases = toneBlocks(pattern, direction, span);
    phases.forEach((phase, phaseIndex) => {
      phase.forEach((block, blockIndex) => {
        number += 1;
        // A new line whenever the phrase length changes, and whenever the
        // exercise turns around: those are the seams a reader looks for.
        const seam = blockIndex === 0 && (phaseIndex > 0 || direction === "up");
        const heading = blockIndex === 0 ? phaseHeading(direction, phase[0].notes.length) : undefined;
        const body = groupXml({ ...block, heading }, pattern, number);
        parts.push(seam || (newLines && number > 1)
          ? body.replace(/(<measure[^>]*>)/, '$1<print new-system="yes"/>')
          : body);
      });
    });
  }
  return `<?xml version="1.0" encoding="utf-8"?><score-partwise version="4.0">`
    + `<part-list><score-part id="P1"><part-name>Flute</part-name></score-part></part-list>`
    + `<part id="P1">${parts.join("")}</part></score-partwise>`;
}

/**
 * What each phase is called on the page. Both halves of the exercise are
 * printed together, so which way this one runs has to be said out loud —
 * and the phrase length is what changes from phase to phase, so it is the
 * other half of the label.
 */
const phaseHeading = (direction: Direction, notes: number) =>
  `${direction === "down" ? "Descending" : "Ascending"} — ${notes} notes`;


/**
 * Moyse's four, which are one exercise at four spacings rather than four
 * exercises — so they are offered as one entry with the interval chosen
 * separately, which is how the book reads.
 */
/**
 * Every interval gets the same phases. A wider interval covers the range
 * in fewer groups, and a phrase long enough to run off the end of the
 * flute produces no groups at all and drops out on its own (see
 * toneBlocks) — so the phase list says what the exercise IS rather than
 * hard-coding which ones happen to fit, which is how the 5-note phrase
 * went missing from major thirds.
 */
const PHASES = [2, 3, 5, 9];
export const toneIntervals = [
  { id: "moyse-1", label: "Half steps", zh: "半音", step: 1, phases: PHASES },
  { id: "moyse-2", label: "Whole steps", zh: "全音", step: 2, phases: PHASES },
  { id: "moyse-3", label: "Minor thirds", zh: "小三度", step: 3, phases: PHASES },
  { id: "moyse-4", label: "Major thirds", zh: "大三度", step: 4, phases: PHASES },
] as const;

export const tonePatterns: readonly TonePattern[] = toneIntervals.map(interval => ({
  id: interval.id,
  label: interval.label,
  zhLabel: interval.zh,
  step: interval.step,
  phases: interval.phases,
}));

export const patternById = (id: string) => tonePatterns.find(pattern => pattern.id === id) ?? tonePatterns[0];
