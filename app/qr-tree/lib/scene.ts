/**
 * Isometric scene for the QR tree.
 *
 * The floor is the code (one flat tile per dark module). A free-form cherry
 * tree stands at its centre and a ring of grass surrounds the platform. A
 * single parameter `t` blends the point of view:
 *   t = 0  →  camera straight down, tree retracted: the exact, scannable QR.
 *   t = 1  →  2:1 isometric: the tree standing on the code, grass up.
 */

import {
  buildFloor,
  buildTree,
  buildGrass,
  type Hue,
  type FlatHue,
  type Voxel,
  type Tile,
  type Blade,
} from "./shape";

export type { Hue, FlatHue, Voxel, Tile, Blade };

const ISO_W = 1.0;
const ISO_H = 0.55;
const ISO_RISE = 0.82;

export type Camera = {
  t: number; // 0 = flat top-down code, 1 = full isometric tree
  azimuth: number; // camera spin, radians; scaled by t
  tile: number; // module size, CSS px
  cx: number;
  cz: number;
};

export type Vec2 = { x: number; y: number };
export type Scene = { n: number; floor: Tile[]; tree: Voxel[]; grass: Blade[] };

function easeInOut(x: number): number {
  const c = Math.min(1, Math.max(0, x));
  return c < 0.5 ? 2 * c * c : 1 - Math.pow(-2 * c + 2, 2) / 2;
}

/** Project a grid point to screen space, blending top-down (t=0) and iso (t=1). */
export function project(gx: number, gy: number, gz: number, cam: Camera): Vec2 & { depth: number } {
  const e = easeInOut(cam.t);
  const T = cam.tile;

  const fx = (gx - cam.cx) * T;
  const fy = (gz - cam.cz) * T;

  const a = cam.azimuth * e;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const rx = (gx - cam.cx) * cos - (gz - cam.cz) * sin;
  const rz = (gx - cam.cx) * sin + (gz - cam.cz) * cos;
  const ix = (rx - rz) * (T * 0.5 * ISO_W);
  const iy = (rx + rz) * (T * 0.5 * ISO_H) - gy * e * (T * ISO_RISE);

  return {
    x: fx + (ix - fx) * e,
    y: fy + (iy - fy) * e,
    depth: rx + rz + gy * 0.9,
  };
}

export type Face = { pts: [Vec2, Vec2, Vec2, Vec2]; kind: "top" | "left" | "right" };

export function boxFaces(v: Voxel, cam: Camera): Face[] {
  const { gx, gy, gz, w, h, d } = v;
  const p = (x: number, y: number, z: number) => project(x, y, z, cam);
  const tNW = p(gx, gy + h, gz);
  const tNE = p(gx + w, gy + h, gz);
  const tSE = p(gx + w, gy + h, gz + d);
  const tSW = p(gx, gy + h, gz + d);
  const bSW = p(gx, gy, gz + d);
  const bSE = p(gx + w, gy, gz + d);
  const bNE = p(gx + w, gy, gz);
  return [
    { kind: "top", pts: [tNW, tNE, tSE, tSW] },
    { kind: "left", pts: [tSW, tSE, bSE, bSW] },
    { kind: "right", pts: [tSE, tNE, bNE, bSE] },
  ];
}

export function polyArea(pts: Vec2[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    a += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return Math.abs(a) / 2;
}

/** Flat 3-tone-per-surface palette (light from the upper-left). */
export const PALETTE: Record<Hue, { top: string; left: string; right: string }> = {
  blossom: { top: "#F4B6D0", left: "#E48EB6", right: "#D06F9E" },
  petal: { top: "#FCE0EC", left: "#F6C4DA", right: "#EEA6C4" },
  rose: { top: "#E48CB4", left: "#CE6E9A", right: "#B4547E" },
  trunk: { top: "#A5764F", left: "#87593B", right: "#69422A" },
  bark: { top: "#8C5E3D", left: "#6E482E", right: "#543722" },
  grass: { top: "#9BC46B", left: "#79AB4C", right: "#5E8E39" },
  leaf: { top: "#8FBE63", left: "#6F9E45", right: "#577F34" },
  stem: { top: "#7FB05A", left: "#639144", right: "#4C7234" },
  ground: { top: "#EEE3CB", left: "#DDCBA6", right: "#CBB689" },
  groundAlt: { top: "#E4D6B4", left: "#D1BC90", right: "#BDA678" },
};

/** Deeper, high-contrast fills for the FLAT code so it still scans. */
export const FLAT_PALETTE: Record<FlatHue, string> = {
  blossom: "#B24A7E",
  grass: "#4C8A39",
};

export const BACKDROP = "#F6EEE3";
export const CARD = "#FFFFFF";

export function buildScene(matrix: boolean[][]): Scene {
  return {
    n: matrix.length,
    floor: buildFloor(matrix),
    tree: buildTree(matrix.length),
    grass: buildGrass(matrix.length),
  };
}
