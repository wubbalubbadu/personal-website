/**
 * Markup that knows where it is.
 *
 * Ink is currently a picture of the page: a PNG scaled to the paper. That
 * is why it slides out of place the moment a view setting re-lays the
 * music — the notes move and the photograph does not.
 *
 * A stroke here is the points you actually drew, kept relative to the note
 * you drew them next to. Nothing is recognised, straightened or fitted to a
 * shape; replaying the points reproduces the stroke exactly. The only thing
 * gained is that the app knows which note a mark belongs to, so it can put
 * it back in the right place after a reflow.
 *
 * Pure functions, no canvas and no DOM beyond reading positions, so the
 * anchoring can be checked without drawing anything.
 */

/** A point in paper coordinates — the same space ScoreViewer's point() uses. */
export type InkPoint = { x: number; y: number; p?: number };

/**
 * What a stroke is pinned to.
 *
 * `event` is a note's data-event index. `system` is a staff line, used when
 * a mark is nowhere near a note — a comment in the margin still has to move
 * down when the lines above it grow, even though it belongs to no note.
 */
export type InkAnchor =
  | { kind: "note"; event: number; dx: number; dy: number }
  | { kind: "system"; system: number; dx: number; dy: number }
  | { kind: "paper"; dx: number; dy: number };

export type InkStroke = {
  color: string;
  width: number;
  erase?: boolean;
  /** Where the stroke starts. */
  anchor: InkAnchor;
  /**
   * Where it ends, when the stroke spans notes — a slur or a long line has
   * to stretch when spacing changes, so it needs both ends pinned. A circle
   * or a breath mark has one anchor and never scales.
   */
  endAnchor?: InkAnchor;
  /** Points relative to the anchor, in paper units. */
  points: InkPoint[];
};

/** A note's position on the paper, for anchoring against. */
export type NoteSpot = { event: number; x: number; y: number };

/** How far from a notehead a mark is still "about" that note. */
export const ANCHOR_RADIUS = 46;

/**
 * Note positions in paper coordinates.
 *
 * Measured the same way ScoreViewer's point() converts a pointer event, so
 * the two agree about where anything is.
 */
export function noteSpots(root: Element, paper: DOMRect, size: { w: number; h: number }): NoteSpot[] {
  const spots: NoteSpot[] = [];
  root.querySelectorAll<SVGGElement>(".vf-stavenote[data-event]").forEach(note => {
    const head = note.querySelector(".vf-notehead") ?? note;
    const box = head.getBoundingClientRect();
    if (!box.width) return;
    spots.push({
      event: Number(note.dataset.event),
      x: (box.left + box.width / 2 - paper.left) * size.w / paper.width,
      y: (box.top + box.height / 2 - paper.top) * size.h / paper.height,
    });
  });
  return spots;
}

/** Staff-line tops in paper coordinates, for marks that belong to no note. */
export function systemSpots(root: Element, paper: DOMRect, size: { w: number; h: number }): number[] {
  const tops = new Set<number>();
  root.querySelectorAll<SVGGElement>(".vf-measure").forEach(measure => {
    const line = measure.querySelector(":scope > path");
    if (!line) return;
    const box = line.getBoundingClientRect();
    tops.add(Math.round((box.top - paper.top) * size.h / paper.height));
  });
  return [...tops].sort((a, b) => a - b);
}

/** The nearest note within reach, or null. */
export function nearestSpot(spots: NoteSpot[], at: InkPoint) {
  let best: NoteSpot | null = null;
  let bestDistance = Infinity;
  for (const spot of spots) {
    const distance = Math.hypot(spot.x - at.x, spot.y - at.y);
    if (distance < bestDistance) { bestDistance = distance; best = spot; }
  }
  return best && bestDistance <= ANCHOR_RADIUS ? best : null;
}

/**
 * Pin a point to whatever is nearest: a note, else the staff line it sits
 * against, else the paper itself.
 */
export function anchorFor(at: InkPoint, spots: NoteSpot[], systems: number[]): InkAnchor {
  const note = nearestSpot(spots, at);
  if (note) return { kind: "note", event: note.event, dx: at.x - note.x, dy: at.y - note.y };
  if (systems.length) {
    let index = 0;
    for (let i = 1; i < systems.length; i += 1) {
      if (Math.abs(systems[i] - at.y) < Math.abs(systems[index] - at.y)) index = i;
    }
    return { kind: "system", system: index, dx: at.x, dy: at.y - systems[index] };
  }
  return { kind: "paper", dx: at.x, dy: at.y };
}

/** Where an anchor sits now. Null when what it was pinned to is gone. */
export function resolveAnchor(anchor: InkAnchor, spots: NoteSpot[], systems: number[]): InkPoint | null {
  if (anchor.kind === "note") {
    const spot = spots.find(s => s.event === anchor.event);
    return spot ? { x: spot.x + anchor.dx, y: spot.y + anchor.dy } : null;
  }
  if (anchor.kind === "system") {
    const top = systems[anchor.system];
    return top === undefined ? null : { x: anchor.dx, y: top + anchor.dy };
  }
  return { x: anchor.dx, y: anchor.dy };
}

/**
 * The stroke's points where they belong now.
 *
 * With one anchor the stroke moves rigidly — a circle stays a circle. With
 * two it also stretches along x between them, so a slur still spans the
 * notes it was drawn over after the spacing changes.
 */
export function placeStroke(stroke: InkStroke, spots: NoteSpot[], systems: number[]): InkPoint[] | null {
  const start = resolveAnchor(stroke.anchor, spots, systems);
  if (!start) return null;
  const end = stroke.endAnchor ? resolveAnchor(stroke.endAnchor, spots, systems) : null;
  if (!end || !stroke.points.length) return stroke.points.map(p => ({ x: start.x + p.x, y: start.y + p.y }));
  const drawnSpan = stroke.points[stroke.points.length - 1].x;
  const nowSpan = end.x - start.x;
  // A stroke drawn with no horizontal reach has nothing to stretch.
  const scale = Math.abs(drawnSpan) < 1 ? 1 : nowSpan / drawnSpan;
  return stroke.points.map(p => ({ x: start.x + p.x * scale, y: start.y + p.y }));
}
