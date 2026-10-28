"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "../_kit/hooks";
import { ICONS, PALETTE as ICON_COLORS } from "../_kit/PixelIcon";
import type { ProjectRow } from "../_kit/links";

/**
 * What you see when you inspect something: a pixel-art graphic of the thing
 * doing its thing (the letter opens, the diploma unrolls, the résumé slides
 * up), drawn over the zoomed-in screen.
 *
 * Real pixel art, to match the PS1 render: each frame is drawn on a 160x120
 * canvas, then every pixel is snapped to a small palette with hard alpha,
 * which strips the smooth edges off shapes and text. The canvas is scaled up
 * with nearest-neighbour, like the 3D scene. Short tags only; the full text
 * and the links are in Haylie's bubble.
 */

export type ArtId = "letter" | "diploma" | "resume" | "socials" | "ipad";

const W = 160;
const H = 120;
const MS = 900;
/** Frames of the little animation: choppy on purpose. */
const STEPS = 10;

const INK = "#3a2a20";
const PALETTE = [
  INK, "#fffdf8", "#f3dfc4", "#fff3e0", "#f7e6cf", "#e0457b", "#c2185b", "#fbf3dc", "#c9a96a",
  "#5b4a3a", "#c8314a", "#efe2c4", "#ffffff", "#2b2d3a", "#a9adbb", "#16161c", "#ff3d77",
  "#ff2e4d", "#ffe9f2", "#9a9aa4", "#d9a24d", "#5a3620",
  // laptop and its icons
  "#cfd3dc", "#9aa0ae", "#ffd3e2", "#fff0f5", "#f3c3d4", "#e2a3bb", "#ffb3cc", "#f8e6ee", "#e3c4d3",
  ...Object.values(ICON_COLORS),
];
const RGB = PALETTE.map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));

/** Snap every pixel to the palette, alpha to 0 or 1: this is what makes it pixel art. */
function quantize(ctx: CanvasRenderingContext2D) {
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 120) {
      d[i + 3] = 0;
      continue;
    }
    let best = 0;
    let bestD = Infinity;
    for (let k = 0; k < RGB.length; k++) {
      const [r, g, b] = RGB[k];
      const dd = (d[i] - r) ** 2 + (d[i + 1] - g) ** 2 + (d[i + 2] - b) ** 2;
      if (dd < bestD) {
        bestD = dd;
        best = k;
      }
    }
    d[i] = RGB[best][0];
    d[i + 1] = RGB[best][1];
    d[i + 2] = RGB[best][2];
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

const clamp = (x: number) => Math.max(0, Math.min(1, x));
/** Progress of a part of the animation that runs from `a` to `b` of the whole. */
const span = (t: number, a: number, b: number) => clamp((t - a) / (b - a));

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, line = INK) {
  ctx.fillStyle = line;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  ctx.fillStyle = fill;
  ctx.fillRect(Math.round(x) + 2, Math.round(y) + 2, Math.round(w) - 4, Math.round(h) - 4);
}

/** Pixel-font text, always starting on a whole pixel: a line centred on a half
 * pixel blurs, and the palette snap then turns it grey. */
function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, color: string, align: CanvasTextAlign = "center") {
  ctx.font = "8px Silkscreen, monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = color;
  const w = Math.round(ctx.measureText(s).width);
  const left = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
  ctx.fillText(s, Math.round(left), Math.round(y));
}

/** True when a click on an art canvas lands on a see-through pixel: that counts as outside. */
function clearAt(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const r = canvas.getBoundingClientRect();
  const x = Math.floor(((clientX - r.left) / r.width) * W);
  const y = Math.floor(((clientY - r.top) / r.height) * H);
  if (x < 0 || y < 0 || x >= W || y >= H) return true;
  const a = canvas.getContext("2d")?.getImageData(x, y, 1, 1).data[3] ?? 0;
  return a === 0;
}

function poly(ctx: CanvasRenderingContext2D, pts: [number, number][], fill: string, line = INK) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = line;
  ctx.stroke();
}

function heart(ctx: CanvasRenderingContext2D, x: number, y: number, c: string) {
  ctx.fillStyle = c;
  [[1, 0, 2], [5, 0, 2], [0, 1, 8], [0, 2, 8], [1, 3, 6], [2, 4, 4], [3, 5, 2]].forEach(([dx, dy, w]) =>
    ctx.fillRect(x + dx, y + dy, w, 1),
  );
}

const DRAW: Record<ArtId, (ctx: CanvasRenderingContext2D, t: number) => void> = {
  letter(ctx, t) {
    const flap = span(t, 0, 0.35);
    const rise = span(t, 0.35, 0.85);
    box(ctx, 34, 54, 92, 52, "#f3dfc4");
    // The flap folds up: it shrinks toward its hinge, then grows upward behind the card.
    const fy = flap < 0.5 ? 54 + 30 * (1 - flap * 2) : 54 - 30 * (flap * 2 - 1);
    if (flap >= 0.5) poly(ctx, [[34, 54], [80, fy], [126, 54]], "#f7e6cf");
    const cy = 60 - rise * 42;
    box(ctx, 44, cy, 72, 52, "#fffdf8");
    text(ctx, "SAY HI!", 80, cy + 7, "#c2185b");
    text(ctx, "HAYLIEWU0709", 80, cy + 20, INK);
    text(ctx, "@GMAIL.COM", 80, cy + 30, INK);
    heart(ctx, 76, cy + 42, "#e0457b");
    poly(ctx, [[34, 70], [80, 94], [126, 70], [126, 106], [34, 106]], "#fff3e0");
    if (flap < 0.5) poly(ctx, [[34, 54], [80, fy], [126, 54]], "#f7e6cf");
  },
  diploma(ctx, t) {
    const open = span(t, 0.1, 0.7);
    const half = 6 + open * 62;
    const x0 = 80 - half;
    box(ctx, x0, 20, half * 2, 82, "#fbf3dc");
    if (open > 0.85) {
      text(ctx, "EDUCATION", 80, 25, "#c2185b");
      text(ctx, "NORTHWESTERN", 80, 38, INK);
      text(ctx, "COMPUTER SCIENCE", 80, 47, "#5b4a3a");
      text(ctx, "FLUTE PERFORMANCE", 80, 56, "#5b4a3a");
      text(ctx, "NEC", 80, 71, INK);
      text(ctx, "MASTER'S, FLUTE", 80, 80, "#5b4a3a");
    }
    box(ctx, x0 - 8, 16, 10, 90, "#efe2c4");
    box(ctx, 80 + half - 2, 16, 10, 90, "#efe2c4");
  },
  resume(ctx, t) {
    const up = span(t, 0, 0.45);
    const y = 18 + (1 - up) * 70;
    box(ctx, 38, y, 84, 96, "#ffffff");
    text(ctx, "HAYLIE WU", 46, y + 8, "#2b2d3a", "left");
    ctx.fillStyle = "#e0457b";
    ctx.fillRect(46, y + 18, 20, 2);
    ["MATHWORKS", "STARTUP", "NETLOGO WEB"].forEach((label, i) => {
      if (span(t, 0.45 + i * 0.15, 0.55 + i * 0.15) < 1) return;
      const ly = y + 26 + i * 22;
      text(ctx, label, 46, ly, "#2b2d3a", "left");
      ctx.fillStyle = "#a9adbb";
      ctx.fillRect(46, ly + 10, 60, 2);
      ctx.fillRect(46, ly + 14, 44, 2);
    });
    ctx.fillStyle = "#e0457b";
    ctx.fillRect(78, y - 3, 5, 5);
  },
  socials(ctx, t) {
    box(ctx, 44, 8, 72, 104, "#2b2d3a");
    ctx.fillStyle = "#ffe9f2";
    ctx.fillRect(50, 16, 60, 86);
    const tiles: [string, string, string][] = [
      ["#16161c", "#ffffff", "TIKTOK"],
      ["#16161c", "#ff3d77", "DOUYIN"],
      ["#ff2e4d", "#ffffff", "REDNOTE"],
    ];
    tiles.forEach(([bg, mark, name], i) => {
      if (span(t, 0.15 + i * 0.2, 0.3 + i * 0.2) < 1) return;
      const y = 22 + i * 26;
      ctx.fillStyle = bg;
      ctx.fillRect(54, y, 18, 18);
      ctx.fillStyle = mark;
      ctx.fillRect(64, y + 4, 2, 9);
      ctx.fillRect(66, y + 4, 3, 2);
      ctx.fillRect(60, y + 11, 4, 3);
      text(ctx, name, 75, y + 5, INK, "left");
    });
  },
  ipad(ctx, t) {
    box(ctx, 26, 10, 108, 100, "#2b2d3a");
    ctx.fillStyle = "#fffdf8";
    ctx.fillRect(32, 16, 96, 88);
    text(ctx, "COOKIE FLUTE", 80, 20, "#c2185b");
    text(ctx, "STUDIO", 80, 29, "#c2185b");
    [0, 1].forEach((row) => {
      ctx.fillStyle = "#9a9aa4";
      for (let l = 0; l < 5; l++) ctx.fillRect(38, 46 + row * 26 + l * 4, 84, 1);
      for (let k = 0; k < 5; k++) {
        if (span(t, 0.2 + row * 0.3 + k * 0.06, 0.26 + row * 0.3 + k * 0.06) < 1) continue;
        ctx.fillStyle = "#16161c";
        ctx.fillRect(46 + k * 15, 45 + row * 26 + ((k * 5 + row * 3) % 12), 5, 4);
      }
    });
    ctx.fillStyle = "#d9a24d";
    ctx.beginPath();
    ctx.arc(118, 96, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5a3620";
    ctx.fillRect(115, 93, 2, 2);
    ctx.fillRect(120, 97, 2, 2);
  },
};

export default function ItemArt({ id, onBack }: { id: ArtId; onBack: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !ctx) return;
    let raf = 0;
    let cancelled = false;
    const frame = (t: number) => {
      ctx.clearRect(0, 0, W, H);
      DRAW[id](ctx, t);
      quantize(ctx);
    };
    // The pixel font has to be loaded before it can be drawn on a canvas.
    document.fonts.load("8px Silkscreen").finally(() => {
      if (cancelled) return;
      if (reduced) {
        frame(1);
        return;
      }
      const start = performance.now();
      let lastStep = -1;
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / MS);
        const step = Math.floor(t * STEPS);
        if (step !== lastStep) {
          lastStep = step;
          frame(step / STEPS);
        }
        if (t < 1) raf = requestAnimationFrame(tick);
        else frame(1);
      };
      raf = requestAnimationFrame(tick);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [id, reduced]);

  // A tap outside the graphic zooms back out (keyboard: B or Esc).
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      className="hh-art"
      onClick={(e) => {
        const c = ref.current;
        if (e.target === e.currentTarget || (c && e.target === c && clearAt(c, e.clientX, e.clientY))) onBack();
      }}
    >
      <canvas ref={ref} width={W} height={H} className="art" aria-hidden="true" />
    </div>
  );
}

/* ---- the laptop: a pixel desktop of projects ---- */

/** Extra 12x12 icons for projects without one of the place icons. */
const APP_ICONS: Record<string, string[]> = {
  "music-playground": [
    "............", ".....kkkkk..", ".....kpppk..", ".....k...k..", ".....k...k..", ".....k...k..",
    "..kkkk..kkk.", ".kppppk.kppk", ".kppppk.kppk", "..kkkk...kk.", "............", "............",
  ],
  market: [
    "............", "....kkkk....", "...k....k...", "...k....k...", ".kkkkkkkkkk.", ".kyyyyyyyyk.",
    ".kyyyyyyyyk.", ".kyyyppyyyk.", ".kyyyppyyyk.", ".kyyyyyyyyk.", ".kkkkkkkkkk.", "............",
  ],
  skuy: [
    "...kkkkkk...", "...kddddk...", "...kdwwdk...", "...kddddk...", "...kdwwdk...", "...kddddk...",
    "...kdwwdk...", "...kddddk...", "...kddddk...", "...kkwwkk...", "...kkkkkk...", "............",
  ],
};
const iconFor = (slug: string) =>
  slug === "cookie-flute-studio" ? ICONS.studio : slug === "learning-log" ? ICONS.log : APP_ICONS[slug] ?? ICONS.projects;
const SHORT: Record<string, string> = {
  "cookie-flute-studio": "STUDIO",
  "learning-log": "LOG",
  "music-playground": "MUSIC",
  market: "MARKET",
  skuy: "SKUY",
};

/* Layout on the 160x120 grid: a big lid (cat ears on top), the screen inside it,
 * three by two icon cells, and a soft base. */
const LID = { x: 10, y: 8, w: 140, h: 86 };
const SCREEN = { x: 17, y: 15, w: 126, h: 72 };
const BAR = 10;
const CELL = { x: 21, y: 28, w: 38, h: 28, gap: 2 };
const cellAt = (i: number) => ({
  x: CELL.x + (i % 3) * (CELL.w + CELL.gap),
  y: CELL.y + Math.floor(i / 3) * (CELL.h + CELL.gap),
});
/** Screenshots for the projects that live on this site (the others bring their own from projects.ts). */
const PREVIEW: Record<string, string> = {
  "cookie-flute-studio": "/lab/previews/flute-studio.jpg",
  "learning-log": "/lab/previews/learning-log.jpg",
};

/** A rectangle with its corners clipped by a pixel, the cheap pixel-art rounding. */
function soft(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, line = INK) {
  ctx.fillStyle = line;
  ctx.fillRect(x + 2, y, w - 4, h);
  ctx.fillRect(x, y + 2, w, h - 4);
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = fill;
  ctx.fillRect(x + 3, y + 2, w - 6, h - 4);
  ctx.fillRect(x + 2, y + 3, w - 4, h - 6);
}

/** Music Playground has no screenshot: a little piano roll instead. */
function drawPlayground(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = "#fff0f5";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#e3c4d3";
  for (let r = 0; r < 6; r++) ctx.fillRect(x, y + 6 + r * 9, w, 1);
  const notes: [number, number, number][] = [[6, 3, 14], [24, 2, 10], [38, 4, 18], [60, 1, 12], [76, 3, 20], [100, 2, 14]];
  notes.forEach(([nx, row, len], i) => {
    ctx.fillStyle = i % 2 ? "#e0457b" : "#c2185b";
    ctx.fillRect(x + nx, y + 4 + row * 9, len, 5);
  });
  heart(ctx, x + w - 14, y + h - 10, "#e0457b");
}

function drawIcon(ctx: CanvasRenderingContext2D, rows: string[], x: number, y: number, scale: number) {
  rows.forEach((row, ry) =>
    [...row].forEach((ch, rx) => {
      if (ch === ".") return;
      ctx.fillStyle = ICON_COLORS[ch] ?? INK;
      ctx.fillRect(x + rx * scale, y + ry * scale, scale, scale);
    }),
  );
}

export function LaptopArt({
  apps,
  index,
  open,
  onPick,
  onBack,
}: {
  apps: ProjectRow[];
  index: number;
  /** A project is open: show its screenshot (when it has one) on the screen. */
  open: boolean;
  onPick: (i: number) => void;
  onBack: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const app = apps[index];
  const shot = open ? (app.image ?? PREVIEW[app.slug] ?? null) : null;

  useEffect(() => {
    const ctx = ref.current?.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    let cancelled = false;
    const draw = (img: HTMLImageElement | null) => {
      if (cancelled) return;
      ctx.clearRect(0, 0, W, H);
      // cat ears on the lid
      poly(ctx, [[22, 10], [28, 1], [36, 10]], "#f3c3d4");
      poly(ctx, [[124, 10], [132, 1], [138, 10]], "#f3c3d4");
      ctx.fillStyle = "#ffb3cc";
      ctx.fillRect(27, 5, 3, 4);
      ctx.fillRect(131, 5, 3, 4);
      // lid, webcam, screen frame
      soft(ctx, LID.x, LID.y, LID.w, LID.h, "#f3c3d4");
      ctx.fillStyle = INK;
      ctx.fillRect(79, 11, 2, 2);
      // base, keys, a heart sticker
      poly(ctx, [[4, 96], [156, 96], [150, 114], [10, 114]], "#f8e6ee");
      ctx.fillStyle = "#e3c4d3";
      for (let k = 0; k < 10; k++) ctx.fillRect(22 + k * 12, 101, 8, 2);
      ctx.fillRect(64, 107, 32, 3);
      heart(ctx, 136, 104, "#e0457b");
      // screen
      ctx.fillStyle = INK;
      ctx.fillRect(SCREEN.x - 1, SCREEN.y - 1, SCREEN.w + 2, SCREEN.h + 2);
      ctx.fillStyle = "#ffe9f2";
      ctx.fillRect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h);
      ctx.fillStyle = "#ffd3e2";
      ctx.fillRect(SCREEN.x, SCREEN.y, SCREEN.w, BAR);
      ["#ff5c52", "#ffc738", "#2ecc71"].forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.fillRect(SCREEN.x + SCREEN.w - 16 + i * 5, SCREEN.y + 4, 3, 3);
      });
      text(ctx, open ? `‹ ${SHORT[app.slug] ?? "BACK"}` : "PROJECTS", SCREEN.x + 4, SCREEN.y + 1, INK, "left");
      if (!open) {
        apps.forEach((a, i) => {
          const c = cellAt(i);
          if (i === index) {
            ctx.fillStyle = "#c2185b";
            ctx.fillRect(c.x, c.y, CELL.w, CELL.h);
            ctx.fillStyle = "#fff0f5";
            ctx.fillRect(c.x + 2, c.y + 2, CELL.w - 4, CELL.h - 4);
          }
          drawIcon(ctx, iconFor(a.slug), c.x + 10, c.y + 2, 1.5);
          text(ctx, SHORT[a.slug] ?? a.name.toUpperCase().slice(0, 6), c.x + CELL.w / 2, c.y + 20, INK);
        });
      } else if (!img) {
        drawPlayground(ctx, SCREEN.x, SCREEN.y + BAR, SCREEN.w, SCREEN.h - BAR);
      }
      quantize(ctx);
      if (img) {
        // The screenshot, squeezed onto the little screen: the low resolution does the crunching.
        const area = { x: SCREEN.x, y: SCREEN.y + BAR, w: SCREEN.w, h: SCREEN.h - BAR };
        const scale = Math.max(area.w / img.width, area.h / img.height);
        const sw = area.w / scale;
        const sh = area.h / scale;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(img, (img.width - sw) / 2, 0, sw, sh, area.x, area.y, area.w, area.h);
      }
    };
    document.fonts.load("8px Silkscreen").finally(() => {
      if (!shot) {
        draw(null);
        return;
      }
      const img = new Image();
      img.onload = () => draw(img);
      img.onerror = () => draw(null);
      img.src = shot;
    });
    return () => {
      cancelled = true;
    };
  }, [apps, index, shot, open, app.slug]);

  const pct = (v: number, of: number) => `${(v / of) * 100}%`;
  return (
    // A tap outside the laptop steps back (keyboard: B or Esc).
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      className="hh-art"
      onClick={(e) => {
        const c = ref.current;
        if (e.target === e.currentTarget || (c && e.target === c && clearAt(c, e.clientX, e.clientY))) onBack();
      }}
    >
      <div className="art-frame">
        <canvas ref={ref} width={W} height={H} className="art" aria-hidden="true" />
        {open ? (
          <button
            type="button"
            className="art-hit"
            style={{ left: pct(SCREEN.x, W), top: pct(SCREEN.y, H), width: pct(SCREEN.w, W), height: pct(SCREEN.h, H) }}
            onClick={onBack}
            aria-label="Back to the projects"
          />
        ) : (
          apps.map((a, i) => {
            const c = cellAt(i);
            return (
              <button
                type="button"
                key={a.slug}
                className="art-hit"
                aria-pressed={i === index}
                style={{ left: pct(c.x, W), top: pct(c.y, H), width: pct(CELL.w, W), height: pct(CELL.h, H) }}
                onClick={() => onPick(i)}
                aria-label={a.name}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
