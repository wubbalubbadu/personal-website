/**
 * A last pass over slurs, after reshapeSlurs: lifts only the slurs that still cut through a note.
 *
 * reshapeSlurs shapes every slur and clears the notes it considers, but it skips notes far from the line between the
 * slur's ends and notes near its ends, so over a run that climbs into ledger lines (Arnold Fantasy, bars 39, 51, 100,
 * 130, 138) the arc went through the high notes. This pass leaves every slur that clears its notes exactly as drawn
 * and only moves the others, by the least that clears them.
 *
 * Each slur is a filled band: two cubic curves (the edge nearer the notes and the outer edge). A colliding slur gets
 * both edges' control points moved away from the notes; its ends stay on their notes. An end at a line break (a slur
 * carried over from or onto the next line, with no note there) moves with the arc. The lift is capped at four staff
 * spaces so a misread can never throw a slur across the page.
 */
type Cubic = [number, number, number, number, number, number, number, number];
const NUMBER = /-?\d*\.?\d+(?:e-?\d+)?/g;

function point(c: Cubic, t: number) {
  const m = 1 - t;
  return {
    x: m * m * m * c[0] + 3 * m * m * t * c[2] + 3 * m * t * t * c[4] + t * t * t * c[6],
    y: m * m * m * c[1] + 3 * m * m * t * c[3] + 3 * m * t * t * c[5] + t * t * t * c[7],
  };
}
/** The curve's parameter where it reaches x (curves here run left to right). */
function paramAt(c: Cubic, x: number) {
  let lo = 0, hi = 1;
  for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (point(c, mid).x < x) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}

export function liftCollidingSlurs(root: Element): number {
  let lifted = 0;
  root.querySelectorAll<SVGSVGElement>("svg").forEach(svg => {
    const heads = [...svg.querySelectorAll<SVGGraphicsElement>(".vf-notehead")].slice(0, 40).map(head => head.getBBox().height).filter(h => h > 0).sort((a, b) => a - b);
    const space = heads.length ? heads[Math.floor(heads.length / 2)] : 10;
    const gap = .4 * space, cap = 4 * space;
    svg.querySelectorAll<SVGPathElement>("g.vf-curve > path").forEach(path => {
      // Only this line of music: a slur's group sits inside its system's group.
      const system = path.closest(".staffline") ?? svg;
      const box = (e: SVGGraphicsElement) => { const b = e.getBBox(); return { x: b.x + b.width / 2, top: b.y, bottom: b.y + b.height }; };
      const noteheads = [...system.querySelectorAll<SVGGraphicsElement>(".vf-notehead")].map(box);
      const obstacles = [...noteheads, ...[...system.querySelectorAll<SVGGraphicsElement>(".vf-stem")].map(box)];
      const d = path.getAttribute("d") ?? "";
      const n = (d.match(NUMBER) ?? []).map(Number);
      if (n.length !== 16) return;
      const near = n.slice(0, 8) as Cubic;
      const far = [n[14], n[15], n[12], n[13], n[10], n[11], n[8], n[9]] as Cubic;
      const [x0, y0, , , , , x3, y3] = near;
      if (!(x3 - x0 > 1)) return;
      // Ends far apart vertically: not an arc over one line (OSMD sometimes draws a slur across a line break as one
      // diagonal piece, Elysian Fields bars 45 to 47). Left exactly as drawn.
      if (Math.abs(y3 - y0) > 5 * space) return;
      // Only a plain arc: both control points on the same side of the line between the ends. A slur that bends both ways
      // (an S, as OSMD draws some slurs that cross a line break) is left exactly as drawn; shifting it bent it further
      // into a stray diagonal (Elysian Fields, bar 47).
      const chord = (x: number) => y0 + (y3 - y0) * (x - x0) / (x3 - x0);
      const side1 = near[3] - chord(near[2]), side2 = near[5] - chord(near[4]);
      if (Math.sign(side1) !== Math.sign(side2) || Math.abs(side1) < .5 || Math.abs(side2) < .5) return;
      const up = side1 < 0;
      // The edge facing the notes.
      const inner = up === (point(near, .5).y > point(far, .5).y) ? near : far;
      const staves = [...system.querySelectorAll<SVGGraphicsElement>(".vf-measure")].map(m => m.getBBox());
      const left = Math.min(...staves.map(b => b.x)), right = Math.max(...staves.map(b => b.x + b.width));
      const freeStart = x0 < left + 30 && !noteheads.some(h => Math.abs(h.x - x0) < 25);
      const freeEnd = x3 > right - 30 && !noteheads.some(h => Math.abs(h.x - x3) < 25);
      // How far a point at t moves when the control points (and any free end) move by 1.
      const reach = (t: number) => { const m = 1 - t; return 3 * t * m * m + 3 * t * t * m + (freeStart ? m * m * m : 0) + (freeEnd ? t * t * t : 0); };
      let need = 0;
      for (const note of obstacles) {
        // The notes the slur starts and ends on are what it attaches to, not obstacles.
        if (note.x < x0 + 14 || note.x > x3 - 14) continue;
        const t = paramAt(inner, note.x), edge = point(inner, t).y;
        const overlap = up ? edge - (note.top - gap) : (note.bottom + gap) - edge;
        const r = reach(t);
        if (overlap > .5 && r > .05) need = Math.max(need, overlap / r);
      }
      if (!need) return;
      const shift = Math.min(need, cap) * (up ? -1 : 1);
      // y of: control points of both edges, plus the start (1, 15) or end (7, 9) when it is free.
      const moved = [3, 5, 11, 13, ...(freeStart ? [1, 15] : []), ...(freeEnd ? [7, 9] : [])];
      moved.forEach(i => { n[i] += shift; });
      let i = 0;
      path.setAttribute("d", d.replace(NUMBER, () => String(n[i++])));
      path.dataset.lifted = String(Math.round(shift * 10) / 10);
      lifted++;
    });
  });
  return lifted;
}
