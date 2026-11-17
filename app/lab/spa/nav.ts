// The floor plan as data: where you can walk, where you can sit, lie or soak,
// and how to get from one place to another. No three.js in here, so the bots
// and the network code can use it without touching the scene.
// Units are metres. x runs west to east, z runs north to south, y is up.

export type Zone = "lounge" | "sauna" | "spring" | "plunge" | "path";
export type SpotKind = "mat" | "bench" | "soak" | "plunge";

export type Rect = { zone: Zone; x0: number; x1: number; z0: number; z1: number };
export type P2 = { x: number; z: number };

export type Spot = {
  id: string;
  kind: SpotKind;
  zone: Zone;
  x: number;
  y: number;
  z: number;
  /** Which way the body faces once settled (0 looks toward +z). */
  face: number;
  /** Where you stand on dry floor before stepping onto or into the spot. */
  ax: number;
  az: number;
  /** id of whoever is using it. */
  taken: string | null;
};

// ---- pools (not walkable, you wade to a spot) ----
export const HOT = { cx: 10.6, cz: -1.4, rx: 3.9, rz: 2.6, water: -0.12, depth: 0.9 };
export const COLD = { x0: -12.4, x1: -9.2, z0: 5.0, z1: 6.8, water: -0.1, depth: 0.95 };

export const inHot = (x: number, z: number) => ((x - HOT.cx) / HOT.rx) ** 2 + ((z - HOT.cz) / HOT.rz) ** 2 < 1;
export const inCold = (x: number, z: number) => x > COLD.x0 && x < COLD.x1 && z > COLD.z0 && z < COLD.z1;

// ---- where feet can go ----
export const RECTS: Rect[] = [
  { zone: "sauna", x0: -11.7, x1: -8.5, z0: -1.1, z1: 2.2 },
  { zone: "path", x0: -8.5, x1: -5.7, z0: -0.45, z1: 0.45 }, // covered link
  { zone: "lounge", x0: -5.7, x1: 3.2, z0: -2.2, z1: 3.2 }, // stops short of the east wall: the tea table sits there
  { zone: "lounge", x0: 3.2, x1: 3.9, z0: 1.9, z1: 2.9 }, // the bit of floor in front of the garden door
  { zone: "path", x0: -1.5, x1: -0.5, z0: 3.2, z1: 3.9 }, // front door
  { zone: "path", x0: -2.4, x1: 0.4, z0: 3.9, z1: 6.4 }, // porch
  { zone: "path", x0: -8, x1: -2.4, z0: 3.9, z1: 5.6 }, // front path
  { zone: "plunge", x0: -12.8, x1: -8, z0: 3.5, z1: 4.6 }, // plunge deck
  { zone: "path", x0: -10.55, x1: -9.65, z0: 2.2, z1: 3.5 }, // sauna back door
  { zone: "path", x0: 3.9, x1: 4.8, z0: 1.9, z1: 2.9 }, // garden door
  { zone: "spring", x0: 4.8, x1: 14.8, z0: 1.6, z1: 6.2 }, // garden
  { zone: "path", x0: 0.4, x1: 4.8, z0: 4.2, z1: 6.2 }, // path in front of the lounge
  { zone: "path", x0: -1.6, x1: -0.4, z0: 6.4, z1: 10.8 }, // through the gate and out along the dock
];

/** Everyone arrives by boat, at the end of the dock. */
export const SPAWN: P2 = { x: -1, z: 10.3 };
/** Where the walk in from the dock ends. */
export const PORCH: P2 = { x: -1, z: 5.3 };

/** A doorway between two rectangles: its middle, and how far you can stray along it (wx or wz, one is 0). */
type Portal = { a: number; b: number; x: number; z: number; wx: number; wz: number };
const PORTALS: Portal[] = [];
for (let a = 0; a < RECTS.length; a++) {
  for (let b = a + 1; b < RECTS.length; b++) {
    const A = RECTS[a];
    const B = RECTS[b];
    const x0 = Math.max(A.x0, B.x0);
    const x1 = Math.min(A.x1, B.x1);
    const z0 = Math.max(A.z0, B.z0);
    const z1 = Math.min(A.z1, B.z1);
    // touching or overlapping, with a doorway wide enough to walk through
    if (x1 - x0 < -0.01 || z1 - z0 < -0.01) continue;
    if (x1 - x0 < 0.5 && z1 - z0 < 0.5) continue;
    // room to either side of the middle, keeping a shoulder's width off the door frame
    const wx = Math.max(0, (x1 - x0) / 2 - 0.22);
    const wz = Math.max(0, (z1 - z0) / 2 - 0.22);
    PORTALS.push({ a, b, x: (x0 + x1) / 2, z: (z0 + z1) / 2, wx: wx > wz ? Math.min(wx, 0.45) : 0, wz: wz >= wx ? Math.min(wz, 0.45) : 0 });
  }
}

const inside = (r: Rect, x: number, z: number, pad = 0) => x >= r.x0 - pad && x <= r.x1 + pad && z >= r.z0 - pad && z <= r.z1 + pad;

export function rectAt(x: number, z: number): number {
  for (let i = 0; i < RECTS.length; i++) if (inside(RECTS[i], x, z, 0.001)) return i;
  return -1;
}

/** The nearest point you can actually stand on. */
export function clampToFloor(x: number, z: number): P2 {
  let best: P2 = { x, z };
  let bestD = Infinity;
  for (const r of RECTS) {
    const px = Math.min(r.x1, Math.max(r.x0, x));
    const pz = Math.min(r.z1, Math.max(r.z0, z));
    const d = (px - x) ** 2 + (pz - z) ** 2;
    if (d < bestD) {
      bestD = d;
      best = { x: px, z: pz };
    }
  }
  return best;
}

export const walkable = (x: number, z: number) => rectAt(x, z) >= 0;

export function zoneAt(x: number, z: number): Zone {
  if (inHot(x, z)) return "spring";
  if (inCold(x, z)) return "plunge";
  const i = rectAt(x, z);
  return i < 0 ? "path" : RECTS[i].zone;
}

/** Corner points to walk through, ending at the goal. Both ends get clamped to the floor. */
/**
 * `loose` (0 to 1) lets the route wander across the width of each doorway instead of threading its exact
 * middle. Bots use it so two of them don't aim for the same point.
 */
export function findPath(from: P2, to: P2, loose = 0): P2[] {
  const start = clampToFloor(from.x, from.z);
  const goal = clampToFloor(to.x, to.z);
  const ra = rectAt(start.x, start.z);
  const rb = rectAt(goal.x, goal.z);
  if (ra < 0 || rb < 0 || ra === rb) return [goal];
  // breadth first over the rooms; the plan is tiny
  const prev = new Map<number, { from: number; via: Portal }>();
  const queue = [ra];
  const seen = new Set([ra]);
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === rb) break;
    for (const p of PORTALS) {
      const next = p.a === cur ? p.b : p.b === cur ? p.a : -1;
      if (next < 0 || seen.has(next)) continue;
      seen.add(next);
      prev.set(next, { from: cur, via: p });
      queue.push(next);
    }
  }
  if (!prev.has(rb)) return [goal];
  const out: P2[] = [goal];
  let cur = rb;
  while (cur !== ra) {
    const step = prev.get(cur)!;
    const off = (Math.random() * 2 - 1) * loose;
    out.unshift({ x: step.via.x + step.via.wx * off, z: step.via.z + step.via.wz * off });
    cur = step.from;
  }
  return out;
}

// ---- places to settle ----
function makeSpots(): Spot[] {
  const s: Spot[] = [];
  // towel mats on the heated floor: two rows, heads toward the walls
  [-4.7, -3.1, -1.5].forEach((x, i) => {
    s.push({ id: `m${i}`, kind: "mat", zone: "lounge", x, y: 0, z: -1.3, face: 0, ax: x, az: -1.3, taken: null });
    s.push({ id: `m${i + 3}`, kind: "mat", zone: "lounge", x, y: 0, z: 1.55, face: Math.PI, ax: x, az: 1.55, taken: null });
  });
  // sauna benches: a low tier and a hotter high tier
  [-11.3, -10.5, -9.7, -8.9].forEach((x, i) => {
    s.push({ id: `b${i}`, kind: "bench", zone: "sauna", x, y: 0.28, z: -1.45, face: 0, ax: x, az: -1.0, taken: null });
    s.push({ id: `b${i + 4}`, kind: "bench", zone: "sauna", x, y: 0.62, z: -2.1, face: 0, ax: x, az: -1.0, taken: null });
  });
  // hot spring: a ring of seats facing the middle
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.3;
    const x = HOT.cx + Math.cos(a) * HOT.rx * 0.7;
    const z = HOT.cz + Math.sin(a) * HOT.rz * 0.7;
    s.push({
      id: `s${i}`, kind: "soak", zone: "spring", x, y: -0.74, z,
      face: Math.atan2(HOT.cx - x, HOT.cz - z),
      ax: Math.min(11.8, Math.max(9.4, x)), az: 1.62, taken: null,
    });
  }
  // cold plunge: three across, looking out over the valley
  [-11.8, -10.8, -9.8].forEach((x, i) => {
    s.push({ id: `p${i}`, kind: "plunge", zone: "plunge", x, y: -0.78, z: 5.9, face: 0, ax: x, az: 4.55, taken: null });
  });
  return s;
}

export const SPOTS: Spot[] = makeSpots();
export const spotById = (id: string | null | undefined) => (id ? SPOTS.find((s) => s.id === id) : undefined);

/** The closest free spot of a kind to a point (or the closest of any kind in a zone). */
export function nearestFreeSpot(x: number, z: number, pick: (s: Spot) => boolean, forId?: string): Spot | undefined {
  let best: Spot | undefined;
  let bestD = Infinity;
  for (const s of SPOTS) {
    if (!pick(s) || (s.taken && s.taken !== forId)) continue;
    const d = (s.x - x) ** 2 + (s.z - z) ** 2;
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}
