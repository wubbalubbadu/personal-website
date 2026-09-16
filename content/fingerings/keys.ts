/**
 * The keys of a Boehm flute, as physical objects with positions.
 *
 * The studio's previous model was a flat list of eleven ids rendered as a
 * row of dots. It could not express a thumb B♭, a side lever, a trill key
 * or an open-hole vent — which is why it had no alternates — and a row of
 * dots does not look like a flute, so there was nothing to follow along
 * with. This module carries the geometry as well as the names, so one
 * drawing can serve the chart, the score reader and anything later.
 *
 * Coordinates are in the diagram's own 960×260 space, headjoint at the
 * left, foot at the right — the instrument as it sits when you play it.
 * `side` says which face of the tube a key lives on: "top" keys are the
 * ones under your fingers, "under" keys are the thumb touches beneath the
 * body, and levers sit just off the tube on the side named.
 */

export type FluteKeyId =
  // thumb
  | "T" | "TBb"
  // left hand
  | "L1" | "L2" | "L3" | "LGs"
  // right hand
  | "R1" | "R2" | "R3" | "RBb"
  // trill keys
  | "Tr1" | "Tr2"
  // pinky / foot
  | "REb" | "RCs" | "RC" | "RB"
  // gizmo (B-foot only)
  | "Gizmo";

export type FluteKey = {
  id: FluteKeyId;
  /** What a player calls it. */
  label: string;
  zh: string;
  /** The short mark printed beside the key in the diagram. */
  mark: string;
  hand: "left" | "right";
  /**
   * The key's silhouette, not a generic dot. A chart's shapes are part of
   * how it is read: rings are the finger holes, small ovals between the
   * right-hand rings are the trill touches, upright pills are the levers,
   * and flat bars are the foot and thumb touches.
   */
  shape: "ring" | "oval" | "pill" | "bar";
  /** Vertical radius for ovals; bar height. Defaults to `r`. */
  ry?: number;
  /**
   * Drawn only when it is actually pressed. The B♭ side lever is used by
   * exactly one fingering, and sitting there hollow on every other note it
   * was read as a third trill key — noise on forty diagrams to be
   * informative on one.
   */
  onlyWhenPressed?: boolean;
  side: "top" | "under";
  x: number;
  y: number;
  /** Ring radius, or lever half-width. */
  r: number;
  /**
   * Where the key's mark is printed. Rings carry it inside; most levers
   * sit it above or below. The foot cluster stacks in one column, so those
   * take their labels to the right or they would land on each other.
   */
  labelAt?: "right";
  /** Only present on instruments that have it. */
  requires?: "b-foot";
};

/**
 * The drawing's overall box. There is no tube: a printed fingering chart
 * shows the keys alone, in one row with the thumb pair beneath the left
 * hand, and a grey instrument behind them only competes with the
 * filled/open reading that carries the actual information.
 */
export const fluteBody = { width: 580, height: 200 };

/**
 * Positions and sizes measured off a printed chart rather than estimated,
 * which fixed several things eyeballing got wrong: the left index key is
 * appreciably smaller than the other two (20 against 26), the trill
 * touches are vertical ovals sitting well *below* the line of the rings
 * rather than circles level with them, and the foot bars are long and
 * closely stacked. The G♯ crook rises most of the drawing's height.
 */
export const fluteKeys: readonly FluteKey[] = [
  { id: "L1", label: "Left 1", zh: "左手 1", mark: "1", hand: "left", shape: "ring", side: "top", x: 34, y: 88, r: 20 },
  { id: "L2", label: "Left 2", zh: "左手 2", mark: "2", hand: "left", shape: "ring", side: "top", x: 102, y: 88, r: 26 },
  { id: "L3", label: "Left 3", zh: "左手 3", mark: "3", hand: "left", shape: "ring", side: "top", x: 171, y: 88, r: 26 },

  { id: "LGs", label: "G♯ lever", zh: "G♯ 键", mark: "G♯", hand: "left", shape: "pill", side: "top", x: 207, y: 60, r: 11, ry: 21 },

  // The B♭ side lever, worked by the right index. Deliberately smaller
  // than both the trill touches and the G♯ lever so it reads as neither.
  { id: "RBb", label: "B♭ side lever", zh: "B♭ 侧键", mark: "B♭", hand: "right", shape: "pill", side: "top", x: 251, y: 64, r: 7, ry: 13, onlyWhenPressed: true },

  { id: "R1", label: "Right 1", zh: "右手 1", mark: "1", hand: "right", shape: "ring", side: "top", x: 280, y: 88, r: 26 },
  { id: "Tr1", label: "First trill key", zh: "第一颤音键", mark: "tr1", hand: "right", shape: "oval", side: "top", x: 315, y: 117, r: 12, ry: 15 },
  { id: "R2", label: "Right 2", zh: "右手 2", mark: "2", hand: "right", shape: "ring", side: "top", x: 350, y: 88, r: 26 },
  { id: "Tr2", label: "Second trill key", zh: "第二颤音键", mark: "tr2", hand: "right", shape: "oval", side: "top", x: 385, y: 118, r: 12, ry: 15 },
  { id: "R3", label: "Right 3", zh: "右手 3", mark: "3", hand: "right", shape: "ring", side: "top", x: 420, y: 88, r: 26 },

  { id: "REb", label: "E♭ lever", zh: "E♭ 键", mark: "E♭", hand: "right", shape: "pill", side: "top", x: 457, y: 100, r: 11, ry: 21 },

  // The pinky's three foot touches, stacked as they sit under the hand:
  // B at the top, C in the middle, C♯ at the bottom — C♯ being the one
  // nearest you. They are mechanically linked, which is why the low notes
  // stack up: C♯ alone sounds C♯, the C touch closes C and C♯ together,
  // and the B touch closes all three.
  { id: "RB",  label: "B key", zh: "低音 B 键", mark: "B", hand: "right", shape: "bar", side: "top", x: 508, y: 82, r: 30, ry: 12, requires: "b-foot" },
  { id: "RC",  label: "C key", zh: "C 键", mark: "C",  hand: "right", shape: "bar", side: "top", x: 508, y: 100, r: 30, ry: 12 },
  { id: "RCs", label: "C♯ key", zh: "C♯ 键", mark: "C♯", hand: "right", shape: "bar", side: "top", x: 508, y: 118, r: 30, ry: 12 },

  // The thumb pair beneath the left hand: the B♭ touch is the hooked one,
  // the B♮ touch the long bar beside it.
  { id: "TBb", label: "Thumb B♭", zh: "拇指 B♭", mark: "B♭", hand: "left", shape: "pill", side: "under", x: 34, y: 152, r: 11, ry: 19 },
  { id: "T",   label: "Thumb B♮", zh: "拇指 B", mark: "T",  hand: "left", shape: "bar", side: "under", x: 88, y: 155, r: 30, ry: 15 },

  { id: "Gizmo", label: "Gizmo key", zh: "Gizmo 键", mark: "giz", hand: "right", shape: "oval", side: "top", x: 552, y: 100, r: 11, ry: 13, requires: "b-foot" },
];

export const keyById = new Map(fluteKeys.map(key => [key.id, key]));

/** The six holes under the fingers, in playing order — the spine of any diagram. */
export const mainRings: FluteKeyId[] = ["L1", "L2", "L3", "R1", "R2", "R3"];
