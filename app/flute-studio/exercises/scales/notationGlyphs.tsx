/**
 * Engraving primitives for the pattern icons in Customize scales.
 *
 * The icons used to be freehand SVG — upright ellipses with a line straight
 * through the middle for a stem and a couple of horizontal rules floating
 * above them for beams. At 24px that reads as "a drawing of some notes"
 * rather than as notation, which is the wrong signal in a panel whose whole
 * job is to describe what will appear on the page.
 *
 * So everything here is expressed in STAFF SPACES (S) at the proportions a
 * real engraving uses (Behind Bars / SMuFL defaults), not in pixels picked
 * by eye:
 *
 *   notehead   1.26 S wide, ~0.92 S tall, tilted 21° — an oval, not a circle
 *   stem       0.12 S thick, rising from the notehead's RIGHT edge (the
 *              single biggest tell: a stem through the middle of the head
 *              is not something any engraver has ever drawn)
 *   beam       0.5 S thick, 0.25 S of air between beams, ending flush with
 *              the outer edge of the outer stems
 *   staccato   a 0.34 S dot one full space off the notehead
 *   tenuto     1.1 S long, 0.16 S thick, same distance off
 *   slur       a filled lens that tapers to points at both ends, never a
 *              constant-width stroke
 *
 * Deliberately no staff lines: five lines behind a 33px glyph turns into
 * grey mush, and every icon here is about rhythm and articulation, which
 * carry no pitch information to place on a staff anyway.
 *
 * Stems are up throughout, so beams sit above and articulation marks below
 * — which is also why the viewBox reserves headroom above the beams and a
 * band below the noteheads: those two zones never collide.
 */

/** One staff space. Every other measurement below is a multiple of it. */
const S = 8;
/** Baseline the noteheads sit on. */
const HEAD_Y = 40;
/** Top edge of the outermost beam — also where the stems end. */
const BEAM_TOP = 12;
const BEAM_THICKNESS = 0.5 * S;
const BEAM_GAP = 0.25 * S;
const HEAD_RX = 0.63 * S;
const HEAD_RY = 0.43 * S;
const STEM_WIDTH = 0.12 * S;
/** Horizontal offset from a notehead's centre to its stem's left edge. */
const STEM_DX = 0.51 * S;
/** How far marks below the note sit from the notehead's centre. */
const MARK_Y = HEAD_Y + 1.05 * S;

export const ICON_VIEWBOX = "0 0 100 56";
export const ICON_WIDTH = 76;
export const ICON_HEIGHT = 43;
/** Distance between adjacent noteheads. Fixed, not stretched to fill the
 *  box, so a 3-note icon and a 6-note icon read as the same handwriting. */
export const NOTE_SPACING = 16;

/** Where n evenly spaced noteheads start so the group sits centred. */
export function centeredStart(n: number, spacing = NOTE_SPACING) {
  return (100 - ((n - 1) * spacing + HEAD_RX * 2)) / 2 + HEAD_RX;
}

export function Notehead({ x, y = HEAD_Y }: { x: number; y?: number }) {
  return <ellipse cx={x} cy={y} rx={HEAD_RX} ry={HEAD_RY} fill="currentColor" transform={`rotate(-21 ${x} ${y})`} />;
}

export function Stem({ x, top = BEAM_TOP }: { x: number; top?: number }) {
  return <rect x={x + STEM_DX} y={top} width={STEM_WIDTH} height={HEAD_Y - top} fill="currentColor" />;
}

/**
 * A full beam across a run of notes. `level` 0 is the outer (top) beam,
 * 1 the next one down — 1 beam for eighths, 2 for sixteenths.
 */
export function Beam({ from, to, level = 0 }: { from: number; to: number; level?: number }) {
  const y = BEAM_TOP + level * (BEAM_THICKNESS + BEAM_GAP);
  return <rect x={from + STEM_DX} y={y} width={to - from + STEM_DX + STEM_WIDTH} height={BEAM_THICKNESS} fill="currentColor" />;
}

/**
 * A partial beam — the stub hanging off one side of a lone short note.
 * `side` says which way it points, towards the note it belongs with.
 */
export function BeamHook({ x, side, level = 1 }: { x: number; side: "left" | "right"; level?: number }) {
  const y = BEAM_TOP + level * (BEAM_THICKNESS + BEAM_GAP);
  const length = 1.15 * S;
  const left = side === "left" ? x + STEM_DX + STEM_WIDTH - length : x + STEM_DX;
  return <rect x={left} y={y} width={length} height={BEAM_THICKNESS} fill="currentColor" />;
}

export function Staccato({ x }: { x: number }) {
  return <circle cx={x} cy={MARK_Y} r={0.17 * S} fill="currentColor" />;
}

export function Tenuto({ x }: { x: number }) {
  return <rect x={x - 0.55 * S} y={MARK_Y - 0.08 * S} width={1.1 * S} height={0.16 * S} fill="currentColor" />;
}

/** The dot that lengthens a note by half — sits after the head, not under it. */
export function AugmentationDot({ x }: { x: number }) {
  return <circle cx={x + 1.15 * S} cy={HEAD_Y} r={0.18 * S} fill="currentColor" />;
}

/**
 * A slur, drawn the way one is engraved: a lens that is thickest at the
 * apex and comes to a point at each end. Two cubics — out along the lower
 * edge, back along the upper one — rather than a stroked arc of constant
 * width, which is what made the old glyph look like a smile.
 */
export function Slur({ from, to }: { from: number; to: number }) {
  const start = from - 0.35 * S;
  const end = to + 0.35 * S;
  const y = HEAD_Y + 0.7 * S;
  const reach = Math.min(1.05 * S, 0.3 * (end - start) + 0.45 * S);
  const control = (end - start) * 0.3;
  const thickness = 0.2 * S;
  return (
    <path
      d={`M ${start} ${y} C ${start + control} ${y + reach} ${end - control} ${y + reach} ${end} ${y} C ${end - control} ${y + reach - thickness} ${start + control} ${y + reach - thickness} ${start} ${y} Z`}
      fill="currentColor"
    />
  );
}

/** The tuplet numeral, on the beam side as engraving convention puts it. */
export function TupletNumber({ x, value = 3 }: { x: number; value?: number }) {
  return (
    <text x={x} y={BEAM_TOP - 0.42 * S} textAnchor="middle" fontSize={1.6 * S} fontFamily="Georgia, 'Times New Roman', serif" fontStyle="italic" fill="currentColor">
      {value}
    </text>
  );
}

/** Tonguing syllables (T / K), set below the notes like any lyric line. */
export function SyllableText({ x, text }: { x: number; text: string }) {
  return (
    <text x={x} y={HEAD_Y + 1.85 * S} textAnchor="middle" fontSize={1.4 * S} fontWeight={600} fill="currentColor">
      {text}
    </text>
  );
}

export function GlyphSvg({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox={ICON_VIEWBOX} width={ICON_WIDTH} height={ICON_HEIGHT} className={className} aria-hidden="true">
      {children}
    </svg>
  );
}
