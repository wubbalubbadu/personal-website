/**
 * shape.ts — the QR floor, the cherry tree that stands on it, and the grass.
 *
 * The FLOOR is the code: one flat tile per dark module, never moved, so from
 * straight above it is the exact scannable QR (pink data, green finders).
 *
 * The TREE is free-form geometry at the centre of the floor — a tapered trunk,
 * a handful of branches, and a rounded cluster of blossom cubes at each branch
 * tip. It is NOT built from module cells. It grows up out of the floor as the
 * view tilts to isometric, and retracts flush into the floor for the top-down
 * view, so the code always reads.
 *
 * Tune with the TREE / GRASS knobs. HMR reloads on save.
 */

export type Hue =
  | "blossom"
  | "petal"
  | "rose"
  | "trunk"
  | "bark"
  | "grass"
  | "leaf"
  | "stem"
  | "ground"
  | "groundAlt";

export type FlatHue = "blossom" | "grass";

export type Tile = { col: number; row: number; hue: FlatHue };

export type Voxel = {
  gx: number;
  gy: number;
  gz: number;
  w: number;
  h: number;
  d: number;
  hue: Hue;
  kind: "trunk" | "branch" | "blossom";
};

export type Blade = { gx: number; gz: number; h: number; lean: number; kind: "grass" | "flower" };

const TAU = Math.PI * 2;

/* ------------------------------------------------------------------- knobs -- */

export const TREE = {
  trunkH: 10.5, // overall trunk height (grid units) — a tall clear trunk
  trunkBase: 3.9, // trunk width at the ground
  trunkTop: 1.6, // trunk width where the branches start
  rootFlare: 0.5, // extra width at the very base
  branches: 10, // number of branches
  branchRise: 3, // how far up the branches reach from the trunk top
  branchReach: 8, // how far out — canopy spreads over the platform
  clusterR: 2.9, // blossom cluster radius
  clusterJitter: 1.1, // raggedness of the cluster surface
  innerClusters: 3, // extra clumps low & near the trunk, to fill the crown
  petalMix: 0.16, // pale highlight cubes
  roseMix: 0.14, // deeper accent cubes
};

export const GRASS = {
  ringInset: 2.4, // how far outside the code the blades sit
  ringDepth: 1.0, // perpendicular spread of the grass band
  perStep: 2,
  minH: 1.1,
  maxH: 2.4,
  flowerChance: 0.22,
  flowerH: 3.4,
};

/* -------------------------------------------------------------- the floor -- */

export function isFinderModule(col: number, row: number, n: number): boolean {
  return (
    (col < 7 && row < 7) ||
    (col >= n - 7 && row < 7) ||
    (col < 7 && row >= n - 7)
  );
}

export function buildFloor(matrix: boolean[][]): Tile[] {
  const n = matrix.length;
  const tiles: Tile[] = [];
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (!matrix[row][col]) continue;
      const finder = isFinderModule(col, row, n);
      // A few data modules near the border also go green, like grass creeping in.
      const edgeGreen =
        !finder && Math.min(col, row, n - 1 - col, n - 1 - row) <= 1 && jitter(col, row) > 0.45;
      tiles.push({ col, row, hue: finder || edgeGreen ? "grass" : "blossom" });
    }
  }
  return tiles;
}

/* --------------------------------------------------------------- the tree -- */

export function buildTree(n: number): Voxel[] {
  const cx = (n - 1) / 2;
  const cz = (n - 1) / 2;
  const out: Voxel[] = [];

  // Trunk — a few stacked boxes, tapering base -> top, with a slight root flare.
  const rings = 6;
  for (let i = 0; i < rings; i++) {
    const f = i / rings;
    const w = TREE.trunkBase + (TREE.trunkTop - TREE.trunkBase) * f + (i === 0 ? TREE.rootFlare : 0);
    const y0 = (TREE.trunkH / rings) * i - (i === 0 ? 0.3 : 0);
    const y1 = (TREE.trunkH / rings) * (i + 1);
    out.push(box(cx - w / 2, y0, cz - w / 2, w, y1 - y0, w, i < 2 ? "bark" : "trunk", "trunk"));
  }

  // Branches, each rising a different amount, with a blossom cluster at the tip.
  const tips: Array<[number, number, number]> = [];
  for (let b = 0; b < TREE.branches; b++) {
    const ang = (b / TREE.branches) * TAU + 0.35 + jitter(b, 2) * 0.4;
    const lean = 0.6 + jitter(b, 7) * 0.5;
    const rise = TREE.branchRise * (0.55 + jitter(b, 3) * 0.9);
    const dirX = Math.cos(ang);
    const dirZ = Math.sin(ang);
    const steps = 3;
    for (let s = 1; s <= steps; s++) {
      const f = s / steps;
      const bx = cx + dirX * TREE.branchReach * f * lean;
      const bz = cz + dirZ * TREE.branchReach * f * lean;
      const by = TREE.trunkH - 1 + rise * f;
      const t = 1.6 - f * 0.9; // taper
      out.push(box(bx - t / 2, by - t / 2, bz - t / 2, t, t, t, "bark", "branch"));
      if (s === steps) tips.push([bx, by + 0.6, bz]);
    }
  }
  // A crown cap plus a few inner clumps so the canopy fills without one big dome.
  tips.push([cx, TREE.trunkH + TREE.branchRise + 0.5, cz]);
  for (let i = 0; i < TREE.innerClusters; i++) {
    const ang = (i / TREE.innerClusters) * TAU + 1.1;
    tips.push([cx + Math.cos(ang) * 2.4, TREE.trunkH + 0.5 + jitter(i, 5) * 2, cz + Math.sin(ang) * 2.4]);
  }

  // Blossom clusters — rounded clumps of unit cubes at each tip.
  const seen = new Set<string>();
  for (const [tx, ty, tz] of tips) {
    const R = TREE.clusterR + jitter(tx, tz) * 0.7;
    for (let gx = Math.floor(tx - R); gx <= Math.ceil(tx + R); gx++) {
      for (let gy = Math.floor(ty - R); gy <= Math.ceil(ty + R); gy++) {
        for (let gz = Math.floor(tz - R); gz <= Math.ceil(tz + R); gz++) {
          const dx = gx - tx;
          const dy = (gy - ty) * 1.05;
          const dz = gz - tz;
          const wobble = jitter(gx * 3 + gz, gy * 5) * TREE.clusterJitter;
          if (Math.sqrt(dx * dx + dy * dy + dz * dz) > R - wobble) continue;
          const key = `${gx},${gy},${gz}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const r = jitter(gx * 5 + gy, gz * 7);
          const hue: Hue = r < TREE.petalMix ? "petal" : r < TREE.petalMix + TREE.roseMix ? "rose" : "blossom";
          out.push(box(gx, gy, gz, 1, 1, 1, hue, "blossom"));
        }
      }
    }
  }

  return out;
}

function box(gx: number, gy: number, gz: number, w: number, h: number, d: number, hue: Hue, kind: Voxel["kind"]): Voxel {
  return { gx, gy, gz, w, h, d, hue, kind };
}

/* -------------------------------------------------------------- the grass -- */

export function buildGrass(n: number): Blade[] {
  const blades: Blade[] = [];
  const lo = -GRASS.ringInset;
  const hi = n + GRASS.ringInset;

  const add = (gx: number, gz: number, salt: number) => {
    const flower = jitter(gx * 5 + salt, gz * 5) > 1 - GRASS.flowerChance;
    blades.push({
      gx: gx + (jitter(gx * 7 + salt, gz) - 0.5),
      gz: gz + (jitter(gx, gz * 7 + salt) - 0.5),
      h: flower ? GRASS.flowerH : GRASS.minH + jitter(gx + salt, gz + salt) * (GRASS.maxH - GRASS.minH),
      lean: (jitter(gx * 2 + salt, gz * 3) - 0.5) * 0.5,
      kind: flower ? "flower" : "grass",
    });
  };

  const D = GRASS.ringDepth;
  for (let g = -3; g <= n + 2; g++) {
    for (let k = 0; k < GRASS.perStep; k++) {
      add(g + k / GRASS.perStep, lo + jitter(g, k) * D, k + 1);
      add(g + k / GRASS.perStep, hi - jitter(g, k + 9) * D, k + 11);
      add(lo + jitter(g, k + 3) * D, g + k / GRASS.perStep, k + 21);
      add(hi - jitter(g, k + 6) * D, g + k / GRASS.perStep, k + 31);
    }
  }
  return blades;
}

/* ------------------------------------------------------------------ utils -- */

export function jitter(a: number, b: number): number {
  const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return h - Math.floor(h);
}
