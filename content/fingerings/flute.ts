import type { FluteKeyId } from "./keys";

/**
 * Standard closed-hole Boehm flute fingerings.
 *
 * Replaces the two hand-written tables that lived inside ScoreViewer, which
 * had real errors: D was missing the E♭ lever, E♭ was given G's fingering
 * (so two different notes claimed the same keys), and four "third octave"
 * entries were verbatim copies of first-octave ones.
 *
 * Every note lists its fingerings most-used first. A beginner should only
 * ever be shown `fingerings[0]`; the rest exist so the chart can reveal
 * them on request rather than presenting a wall of equivalent options.
 * That is a UI decision the data deliberately does not make for it.
 */
export type FingeringKind = "standard" | "alternate";

export type Fingering = {
  keys: FluteKeyId[];
  /** Names the alternate ("Thumb B♭", "1-1"); omitted for the standard one. */
  label?: string;
  zhLabel?: string;
  kind: FingeringKind;
  /** When you would actually reach for this one. */
  use?: string;
  zhUse?: string;
  requires?: "b-foot" | "open-hole";
};

export type NoteFingerings = {
  /** Scientific pitch of the sounding note, e.g. "E♭4". */
  pitch: string;
  /** Every name this pitch goes by, sharp spelling first. */
  names: string[];
  fingerings: Fingering[];
};

/**
 * The foot touches are mechanically linked: the pinky cannot close a low
 * one without the ones above it going down too. Pressing C♯ closes C♯
 * alone; pressing C closes C and C♯; pressing B closes all three.
 *
 * Stated once and applied to every fingering rather than typed out per
 * note. Hand-listing it is exactly how the low notes and the altissimo
 * drifted apart — D7 showed a lone C key, the B-foot E♭7 a lone B, and C7
 * on a C foot no foot touch at all.
 */
const FOOT_LINKAGE: Partial<Record<FluteKeyId, FluteKeyId[]>> = {
  RB: ["RC", "RCs"],
  RC: ["RCs"],
};
function withLinkedKeys(keys: FluteKeyId[]): FluteKeyId[] {
  const all = new Set(keys);
  for (const key of keys) for (const linked of FOOT_LINKAGE[key] ?? []) all.add(linked);
  return [...all];
}

const std = (keys: FluteKeyId[]): Fingering => ({ keys, kind: "standard" });

/**
 * C4 up to C♯5. The flute's fundamental is D — everything below it is the
 * foot joint, which is why the low three take the pinky off the E♭ lever
 * and onto the foot keys instead.
 */
const firstOctave: NoteFingerings[] = [
  // Low B exists only on a B-foot instrument; the chart hides it, and the
  // B key itself, on a C foot.
  { pitch: "B3", names: ["B"], fingerings: [{ keys: ["T", "L1", "L2", "L3", "R1", "R2", "R3", "RB"], kind: "standard", requires: "b-foot" }] },
  { pitch: "C4", names: ["C"], fingerings: [std(["T", "L1", "L2", "L3", "R1", "R2", "R3", "RC"])] },
  { pitch: "C♯4", names: ["C♯", "D♭"], fingerings: [std(["T", "L1", "L2", "L3", "R1", "R2", "R3", "RCs"])] },
  { pitch: "D4", names: ["D"], fingerings: [std(["T", "L1", "L2", "L3", "R1", "R2", "R3"])] },
  // The E♭ lever is a normally-closed key that the pinky OPENS, so D — the
  // flute's fundamental, everything shut — takes no pinky at all, and the
  // pinky comes down here and stays down for everything above.
  { pitch: "E♭4", names: ["E♭", "D♯"], fingerings: [std(["T", "L1", "L2", "L3", "R1", "R2", "R3", "REb"])] },
  { pitch: "E4", names: ["E"], fingerings: [std(["T", "L1", "L2", "L3", "R1", "R2", "REb"])] },
  { pitch: "F4", names: ["F"], fingerings: [std(["T", "L1", "L2", "L3", "R1", "REb"])] },
  {
    pitch: "F♯4", names: ["F♯", "G♭"],
    fingerings: [
      std(["T", "L1", "L2", "L3", "R3", "REb"]),
      { keys: ["T", "L1", "L2", "L3", "R2", "REb"], label: "Middle-finger F♯", zhLabel: "中指 F♯", kind: "alternate", use: "Mainly for trills and a few awkward leaps — not for ordinary playing, as the pitch is less stable.", zhUse: "主要用于颤音和个别不便的跳进，音准不如标准指法稳定，日常演奏不建议使用。" },
    ],
  },
  { pitch: "G4", names: ["G"], fingerings: [std(["T", "L1", "L2", "L3", "REb"])] },
  { pitch: "G♯4", names: ["G♯", "A♭"], fingerings: [std(["T", "L1", "L2", "L3", "LGs", "REb"])] },
  { pitch: "A4", names: ["A"], fingerings: [std(["T", "L1", "L2", "REb"])] },
  {
    pitch: "B♭4", names: ["B♭", "A♯"],
    fingerings: [
      { keys: ["T", "L1", "R1", "REb"], label: "1-1", zhLabel: "1-1", kind: "standard", use: "The default, and the one to learn first. Works in any key, and lets a passage move between B♭ and B♮ without resetting the thumb.", zhUse: "默认指法，也是最先要学会的。任何调都能用，并且在同一乐句里 B♭ 与还原 B 交替时不必重新调整拇指。" },
      { keys: ["TBb", "L1", "REb"], label: "Thumb B♭", zhLabel: "拇指 B♭", kind: "alternate", use: "For flat keys with no B♮ in sight — the thumb moves once and every B in the piece is flat.", zhUse: "适用于整段没有还原 B 的降号调：拇指换一次位置，全曲的 B 都是降 B。" },
      { keys: ["T", "L1", "RBb", "REb"], label: "Side lever", zhLabel: "侧键", kind: "alternate", use: "For fast B♮–B♭ movement, where neither the thumb nor 1-1 can switch in time.", zhUse: "用于 B 与降 B 的快速交替，此时拇指或 1-1 都来不及切换。" },
    ],
  },
  { pitch: "B4", names: ["B"], fingerings: [std(["T", "L1", "REb"])] },
  { pitch: "C5", names: ["C"], fingerings: [std(["L1", "REb"])] },
  { pitch: "C♯5", names: ["C♯", "D♭"], fingerings: [std(["REb"])] },
];

/**
 * D5–C♯6 are the first octave overblown: identical fingerings, faster air.
 * Generated rather than retyped so the two registers cannot drift apart —
 * the previous tables shared one object for exactly this reason, and that
 * part was right.
 */
const NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "G♯", "A", "B♭", "B"];
function upOneOctave(pitch: string) {
  const match = pitch.match(/^(.+?)(\d)$/)!;
  return `${match[1]}${Number(match[2]) + 1}`;
}
// Only D4 upward repeats: B3–C♯4 are foot-joint notes whose octave
// partners (B4, C5, C♯5) are already spelled out above.
const repeatsAnOctaveUp = new Set(["C4", "C♯4", "B3"]);
const secondOctave: NoteFingerings[] = firstOctave
  .filter(note => !repeatsAnOctaveUp.has(note.pitch))
  .map(note => ({ ...note, pitch: upOneOctave(note.pitch) }));

/**
 * D6–C7. These are genuinely different from the lower registers — they are
 * harmonic fingerings, vented so the tube speaks a partial rather than its
 * fundamental, which is why several of them drop the thumb, why F♯ and B
 * take the B♭ thumb, and why the top two use the trill keys. The register
 * is also why the old table was wrong: four of its entries were copies of
 * first-octave fingerings, which simply do not sound up here.
 */
const thirdOctave: NoteFingerings[] = [
  { pitch: "D6", names: ["D"], fingerings: [std(["T", "L2", "L3", "REb"])] },
  { pitch: "E♭6", names: ["E♭", "D♯"], fingerings: [std(["T", "L1", "L2", "L3", "LGs", "R1", "R2", "R3", "REb"])] },
  {
    pitch: "E6", names: ["E"],
    fingerings: [
      std(["T", "L1", "L2", "R1", "R2", "REb"]),
      { keys: ["T", "L1", "L2", "R1", "R2"], label: "Without E♭", zhLabel: "不按 E♭ 键", kind: "alternate", use: "Lifting the pinky flattens the note — useful when this E sits sharp.", zhUse: "松开小指会使音高降低，当这个 E 偏高时很有用。" },
    ],
  },
  { pitch: "F6", names: ["F"], fingerings: [std(["T", "L1", "L3", "R1", "REb"])] },
  {
    pitch: "F♯6", names: ["F♯", "G♭"],
    fingerings: [
      std(["TBb", "L1", "L3", "R3", "REb"]),
      { keys: ["TBb", "L1", "L3", "R2", "REb"], label: "Middle finger", zhLabel: "中指", kind: "alternate", use: "Right middle finger instead of the ring finger.", zhUse: "用右手中指代替无名指。" },
    ],
  },
  { pitch: "G6", names: ["G"], fingerings: [std(["L1", "L2", "L3", "REb"])] },
  {
    pitch: "G♯6", names: ["G♯", "A♭"],
    fingerings: [
      std(["L2", "L3", "LGs", "REb"]),
      { keys: ["L2", "L3", "LGs", "R2", "R3", "REb"], label: "With right 2–3", zhLabel: "加右手二三指", kind: "alternate", use: "Adding the right middle and ring fingers.", zhUse: "再加上右手中指与无名指。" },
    ],
  },
  { pitch: "A6", names: ["A"], fingerings: [std(["T", "L2", "R1", "REb"])] },
  { pitch: "B♭6", names: ["B♭", "A♯"], fingerings: [std(["T", "R1", "Tr1"])] },
  { pitch: "B6", names: ["B"], fingerings: [std(["TBb", "L1", "L3", "Tr2"])] },
  {
    pitch: "C7", names: ["C"],
    fingerings: [
      { keys: ["L1", "L2", "L3", "LGs", "R1", "Gizmo"], label: "With gizmo", zhLabel: "使用 Gizmo 键", kind: "standard", use: "On a B-foot flute the gizmo closes the low B alone, which is what lets this note speak.", zhUse: "在 B 尾管长笛上，Gizmo 键单独关闭低音 B，这个音才能发出来。", requires: "b-foot" },
      { keys: ["L1", "L2", "L3", "LGs", "R1", "RC"], label: "C foot", zhLabel: "C 尾管", kind: "standard", use: "With no gizmo to close the low B on its own, the pinky closes the foot instead.", zhUse: "没有 Gizmo 键单独关闭低音 B，改由小指按下尾管键。" },
    ],
  },
];

/**
 * Above C7. The altissimo is where published charts stop agreeing with each
 * other: the same note is given a dozen competing fingerings, attributed to
 * individual players and qualified as sharp, flat, airy or "very
 * difficult", and some of them need an open-hole instrument to part-vent a
 * hole. Only the notes with one clear primary fingering are listed here —
 * going further means choosing between players' preferences, which is a
 * judgement for the flutist, not for this file.
 */
const altissimo: NoteFingerings[] = [
  {
    pitch: "C♯7", names: ["C♯", "D♭"],
    fingerings: [
      std(["L2", "LGs", "R1"]),
      { keys: ["L2", "LGs", "R1", "RC"], label: "With C key", zhLabel: "加 C 键", kind: "alternate", use: "Closing the foot steadies the note.", zhUse: "按下尾管键可以让这个音更稳定。" },
    ],
  },
  { pitch: "D7", names: ["D"], fingerings: [std(["T", "L3", "R1", "R2", "RC"])] },
  {
    pitch: "E♭7", names: ["E♭", "D♯"],
    fingerings: [
      std(["TBb", "L3", "LGs", "Tr1", "R2"]),
      { keys: ["TBb", "L3", "LGs", "Tr1", "R2", "RC"], label: "With C key", zhLabel: "加 C 键", kind: "alternate", use: "Closing the foot steadies the note.", zhUse: "按下尾管键可以让这个音更稳定。" },
      { keys: ["TBb", "L3", "Tr1", "R2", "RB"], label: "B foot", zhLabel: "B 尾管", kind: "alternate", use: "Closing the whole foot, without the G♯ lever.", zhUse: "关闭整个尾管，不按 G♯ 键。", requires: "b-foot" },
    ],
  },
];

export const fluteFingerings: readonly NoteFingerings[] = [
  ...firstOctave,
  ...secondOctave,
  ...thirdOctave,
  ...altissimo,
].map(note => ({ ...note, fingerings: note.fingerings.map(f => ({ ...f, keys: withLinkedKeys(f.keys) })) }));

export const fingeringsForPitch = (pitch: string) =>
  fluteFingerings.find(note => note.pitch === pitch) ?? null;

/**
 * Look a note up by sounding pitch rather than by name. The score reader
 * derives its pitches with one fixed spelling (A♭, never G♯), so matching
 * on the string alone would miss half the chromatic scale.
 */
export const fingeringsForMidi = (midi: number) =>
  fluteFingerings.find(note => midiForPitch(note.pitch) === midi) ?? null;

/**
 * Reverse lookup: which notes does this set of keys produce?
 *
 * Keyed on the sorted key list, so the caller can hand over a set in any
 * order. This is what lets the chart run backwards — press keys on the
 * diagram and find out what sounds — which is the thing a printed chart
 * can never do.
 */
const signature = (keys: readonly FluteKeyId[]) => [...keys].sort().join("+");
const byShape = new Map<string, { pitch: string; fingering: Fingering }[]>();
for (const note of fluteFingerings) {
  for (const fingering of note.fingerings) {
    const key = signature(fingering.keys);
    byShape.set(key, [...(byShape.get(key) ?? []), { pitch: note.pitch, fingering }]);
  }
}
export const notesForKeys = (keys: readonly FluteKeyId[]) => byShape.get(signature(keys)) ?? [];

/**
 * MIDI number for a pitch string, for the staff drawing and for playback.
 * Accepts either spelling of an enharmonic ("E♭4" and "D♯4" both give 63).
 */
const SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function midiForPitch(pitch: string) {
  const match = pitch.match(/^([A-G])([♯♭]?)(\d)$/);
  if (!match) return 60;
  const [, letter, accidental, octave] = match;
  return (Number(octave) + 1) * 12 + SEMITONES[letter] + (accidental === "♯" ? 1 : accidental === "♭" ? -1 : 0);
}

/** Pitch-class order for laying the chart out chromatically. */
export const chromaticIndex = (pitch: string) => {
  const match = pitch.match(/^([A-G][♯♭]?)(\d)$/);
  if (!match) return 0;
  return Number(match[2]) * 12 + NAMES.indexOf(match[1]);
};
