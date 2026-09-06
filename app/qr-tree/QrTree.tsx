"use client";

import "./qr-tree.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { encodeQr } from "./lib/qr";
import {
  boxFaces,
  buildScene,
  polyArea,
  project,
  PALETTE,
  FLAT_PALETTE,
  BACKDROP,
  CARD,
  type Camera,
  type Scene,
  type Voxel,
  type Blade,
  type FlatHue,
} from "./lib/scene";

/**
 * What the QR code encodes. `https://hayliewu.com` keeps the code short (v3,
 * 29×29) so the modules stay big and chunky, and the homepage already links out
 * to GitHub / LinkedIn / email.
 *
 * For an all-in-one "add to contacts" scan, swap in the vCard below (~57×57, a
 * finer mosaic):
 *
 *   const QR_PAYLOAD = [
 *     "BEGIN:VCARD", "VERSION:3.0", "N:Wu;Haylie", "FN:Haylie Wu",
 *     "EMAIL:hayliewu0709@gmail.com",
 *     "URL:https://hayliewu.com",
 *     "URL:https://linkedin.com/in/haylie-wu",
 *     "URL:https://github.com/wubbalubbadu",
 *     "END:VCARD",
 *   ].join("\n");
 */
export const QR_PAYLOAD = "https://hayliewu.com";

const REVEAL_DELAY = 2400; // hold the flat code this long on load, then grow once
const TRANS_MS = 1600; // wall-clock length of the flat <-> tree transition
const AZ_TAU = 150; // ms time-constant for the camera settling after a drag
const SETTLE_AZ = -0.5; // the 3/4 angle the tree rests at (radians)
const DRAG_CLAMP = 1.05; // how far you can turn it by dragging
const IDLE_SWAY = 0.05; // canopy breathing, grid units — set 0 for dead still
const MARGIN = 8.5; // quiet-zone / headroom around the code, in modules
const FLAT_CUTOFF = 0.06; // below this `t`, draw the crisp aligned code

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOut = (t: number) => {
  const c = clamp01(t);
  return c < 0.5 ? 2 * c * c : 1 - Math.pow(-2 * c + 2, 2) / 2;
};

function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round(lerp((pa >> 16) & 255, (pb >> 16) & 255, t));
  const g = Math.round(lerp((pa >> 8) & 255, (pb >> 8) & 255, t));
  const bl = Math.round(lerp(pa & 255, pb & 255, t));
  return `rgb(${r},${g},${bl})`;
}

type Tri = { top: string; left: string; right: string };
function mixPalette(deep: string, pal: Tri, t: number): Tri {
  return {
    top: mixHex(deep, pal.top, t),
    left: mixHex(deep, pal.left, t),
    right: mixHex(deep, pal.right, t),
  };
}

export default function QrTree() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [reduced, setReduced] = useState(false);
  const [label, setLabel] = useState<"flat" | "tree">("flat");

  const scene = useMemo<Scene>(() => buildScene(encodeQr(QR_PAYLOAD, "H")), []);

  const anim = useRef({
    t: 0,
    target: 0,
    transFrom: 0,
    transStart: -Infinity,
    startAt: 0,
    revealed: false,
    azimuth: SETTLE_AZ,
    azFrom: SETTLE_AZ,
    azTo: SETTLE_AZ,
    azTarget: SETTLE_AZ,
    inTransition: false,
    dragging: false,
    dragX: 0,
    dragAz: SETTLE_AZ,
  });

  const setTarget = (v: 0 | 1) => {
    const a = anim.current;
    if (a.target === v && a.revealed) return;
    a.transFrom = a.t;
    a.transStart = performance.now();
    a.target = v;
    a.revealed = true;
    // Move the camera angle in lockstep with the fold, so nothing lurches.
    a.azFrom = a.azimuth;
    a.azTo = SETTLE_AZ;
    a.azTarget = SETTLE_AZ;
    a.inTransition = true;
  };

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cssW = 0;
    let cssH = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cssW = rect.width;
      cssH = rect.height;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const n = scene.n;
    const a = anim.current;
    a.startAt = performance.now();
    let last = a.startAt;
    let shown: "flat" | "tree" = "flat";

    const step = (now: number) => {
      const dt = Math.min(120, Math.max(0, now - last));
      last = now;

      if (!a.revealed && !reduced && now - a.startAt > REVEAL_DELAY) setTarget(1);

      const p = Math.min(1, (now - a.transStart) / TRANS_MS);
      if (reduced) {
        a.t = a.target;
      } else {
        a.t = a.transFrom + (a.target - a.transFrom) * easeInOut(p);
      }
      if (p >= 1) a.inTransition = false;

      if (a.dragging) {
        // azimuth set directly by the drag handler
      } else if (a.inTransition && !reduced) {
        a.azimuth = a.azFrom + (a.azTo - a.azFrom) * easeInOut(p);
      } else {
        a.azimuth += (a.azTarget - a.azimuth) * (1 - Math.exp(-dt / AZ_TAU));
      }

      const next: "flat" | "tree" = a.t > 0.5 ? "tree" : "flat";
      if (next !== shown) {
        shown = next;
        setLabel(next);
      }

      // Constant scale — the code is the same size flat or folded up. Only the
      // vertical framing eases, to keep the taller tree centred.
      const tile = Math.floor(Math.min(cssW, cssH) / (n + MARGIN * 2));
      const e = easeInOut(a.t);
      const yShift = lerp(0, cssH * 0.11, e); // pan down as the tree rises up
      const cam: Camera = { t: a.t, azimuth: a.azimuth, tile, cx: (n - 1) / 2, cz: (n - 1) / 2 };

      ctx.clearRect(0, 0, cssW, cssH);
      ctx.fillStyle = mixHex(CARD, BACKDROP, e);
      ctx.fillRect(0, 0, cssW, cssH);

      ctx.save();
      ctx.translate(cssW / 2, cssH / 2 + yShift);
      drawScene(ctx, scene, cam, now);
      ctx.restore();

      raf = requestAnimationFrame(step);
    };

    let raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [scene, reduced]);

  const onPointerDown = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const a = anim.current;
    ev.currentTarget.setPointerCapture(ev.pointerId);
    a.dragging = true;
    a.dragX = ev.clientX;
    a.dragAz = a.azimuth;
    setTarget(1); // turning it implies "show me the tree"
  };
  const onPointerMove = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const a = anim.current;
    if (!a.dragging) return;
    a.azimuth = clamp(a.dragAz + (ev.clientX - a.dragX) * 0.011, -DRAG_CLAMP, DRAG_CLAMP);
  };
  const endDrag = () => {
    const a = anim.current;
    if (!a.dragging) return;
    a.dragging = false;
    a.inTransition = false;
    a.azTarget = a.azimuth; // rest wherever you left it
  };

  const toggle = () => setTarget(anim.current.target > 0.5 ? 0 : 1);

  return (
    <div className="qrt">
      <canvas
        ref={canvasRef}
        className="qrt-canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        aria-label="A colour QR code whose blocks stand up into a cherry tree from a 3/4 view, and lie flat into the exact code from straight above."
        role="img"
      />
      <button type="button" className="qrt-toggle" onClick={toggle} aria-label={label === "tree" ? "Show the flat 2D code" : "Stand it up into 3D"}>
        {label === "tree" ? "2D" : "3D"}
      </button>
    </div>
  );
}

/* --------------------------------------------------------------- rendering -- */

function drawScene(ctx: CanvasRenderingContext2D, scene: Scene, cam: Camera, now: number): void {
  const n = scene.n;
  const e = easeInOut(cam.t);

  // White quiet-zone card (front-on) cross-fading to the cream ground platform.
  const cardA = clamp01(1 - e / 0.4);
  if (cardA > 0) {
    const q = 4;
    const a = project(-q, 0, -q, cam);
    const b = project(n + q, 0, n + q, cam);
    ctx.globalAlpha = cardA;
    ctx.fillStyle = CARD;
    roundRect(ctx, a.x, a.y, b.x - a.x, b.y - a.y, 14);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (e > 0) {
    const M = 2.5;
    const ground: Voxel = { gx: -M, gy: -0.55, gz: -M, w: n + M * 2, h: 0.55, d: n + M * 2, hue: "ground", kind: "trunk" };
    drawBox(ctx, ground, cam, e, PALETTE.ground, false);
  }

  // Straight down: the exact code, crisp, aligned to the same projection.
  if (cam.t < FLAT_CUTOFF) {
    for (const tile of scene.floor) {
      const a = project(tile.col, 0, tile.row, cam);
      const b = project(tile.col + 1, 0, tile.row + 1, cam);
      ctx.fillStyle = FLAT_PALETTE[tile.hue];
      ctx.fillRect(Math.round(a.x), Math.round(a.y), Math.ceil(b.x - a.x), Math.ceil(b.y - a.y));
    }
    return;
  }

  const treeAlpha = clamp01((cam.t - 0.05) / 0.2);
  const grassAlpha = clamp01((cam.t - 0.15) / 0.25);
  const floorPal: Record<FlatHue, Tri> = {
    blossom: mixPalette(FLAT_PALETTE.blossom, PALETTE.blossom, e),
    grass: mixPalette(FLAT_PALETTE.grass, PALETTE.grass, e),
  };

  type Item = { depth: number; render: () => void };
  const items: Item[] = [];

  // The code, lying flat on the ground — visible under the tree.
  for (const tile of scene.floor) {
    const v: Voxel = { gx: tile.col, gy: 0, gz: tile.row, w: 1, h: 0.16, d: 1, hue: "blossom", kind: "blossom" };
    const c = project(tile.col + 0.5, 0.08, tile.row + 0.5, cam);
    const pal = floorPal[tile.hue];
    items.push({ depth: c.depth, render: () => drawBox(ctx, v, cam, 1, pal, false) });
  }

  if (treeAlpha > 0) {
    for (const v of scene.tree) {
      const sway = v.kind === "blossom" ? Math.sin(now / 2600 + v.gx * 0.4 + v.gy * 0.2) * IDLE_SWAY * e : 0;
      const vv: Voxel = sway ? { ...v, gx: v.gx + sway, gz: v.gz + sway * 0.6 } : v;
      const c = project(vv.gx + vv.w / 2, vv.gy + vv.h / 2, vv.gz + vv.d / 2, cam);
      items.push({ depth: c.depth, render: () => drawBox(ctx, vv, cam, treeAlpha, PALETTE[vv.hue], vv.kind !== "blossom") });
    }
  }

  if (grassAlpha > 0) {
    for (const b of scene.grass) {
      const c = project(b.gx, b.h * 0.5, b.gz, cam);
      items.push({ depth: c.depth, render: () => drawBlade(ctx, b, cam, grassAlpha) });
    }
  }

  items.sort((p, q) => p.depth - q.depth);
  for (const it of items) it.render();
}

function drawBox(
  ctx: CanvasRenderingContext2D,
  v: Voxel,
  cam: Camera,
  alpha: number,
  pal: Tri,
  stroke: boolean,
): void {
  ctx.globalAlpha = alpha;
  for (const f of boxFaces(v, cam)) {
    if (polyArea(f.pts) < 0.5) continue;
    ctx.fillStyle = pal[f.kind];
    tracePoly(ctx, f.pts);
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = "rgba(28,18,26,0.12)";
      ctx.lineWidth = 0.6;
      ctx.lineJoin = "round";
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

function drawBlade(ctx: CanvasRenderingContext2D, b: Blade, cam: Camera, alpha: number): void {
  const base = project(b.gx, 0, b.gz, cam);
  const tip = project(b.gx + b.lean, b.h, b.gz + b.lean * 0.3, cam);
  const flower = b.kind === "flower";
  const bw = cam.tile * (flower ? 0.07 : 0.2) * (0.35 + 0.65 * easeInOut(cam.t));

  ctx.globalAlpha = alpha;
  ctx.fillStyle = flower ? PALETTE.stem.left : PALETTE.grass.left;
  ctx.beginPath();
  ctx.moveTo(base.x - bw, base.y);
  ctx.lineTo(base.x + bw, base.y);
  ctx.lineTo(tip.x, tip.y);
  ctx.closePath();
  ctx.fill();

  if (flower) {
    ctx.fillStyle = PALETTE.blossom.left;
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, cam.tile * 0.22 * (0.4 + 0.6 * easeInOut(cam.t)), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.petal.top;
    ctx.beginPath();
    ctx.arc(tip.x - cam.tile * 0.06, tip.y - cam.tile * 0.06, cam.tile * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function tracePoly(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[]): void {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
