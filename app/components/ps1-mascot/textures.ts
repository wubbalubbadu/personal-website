// Tiny procedural textures, painted pixel by pixel on a canvas the way a
// PS1 artist would have drawn them in 64x64 VRAM tiles. Everything is
// sampled with NearestFilter and no mipmaps, so the texels stay chunky.
import * as THREE from "three";

export const PALETTE = {
  dough: "#d9a24d",
  doughLight: "#e6b765",
  doughDark: "#c78e3c",
  bake: "#ba8135",
  bakeDeep: "#9c6a2a",
  chip: "#5a3620",
  chipLight: "#7a4d2f",
  ink: "#292a33",
  blush: "#f39aa8",
  cream: "#fff6e7",
};

// Deterministic so the cookie looks the same on every load.
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function paint(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  draw(g);
  return canvas;
}

export function pixelTexture(canvas: HTMLCanvasElement, repeat = false) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function px(g: CanvasRenderingContext2D, color: string, x: number, y: number, w = 1, h = 1) {
  g.fillStyle = color;
  g.fillRect(x, y, w, h);
}

// A blob of pixels inside radius r around (cx, cy).
function blob(g: CanvasRenderingContext2D, color: string, cx: number, cy: number, r: number) {
  for (let y = Math.floor(cy - r); y <= cy + r; y++)
    for (let x = Math.floor(cx - r); x <= cx + r; x++)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) px(g, color, x, y);
}

/**
 * The cookie body. It is projected flat onto the front and back of the
 * cookie (uv = x, y), so the outer ring of this texture becomes the baked
 * rim on the sides. `extent` is the model radius that maps to the texture edge.
 */
export function cookieTexture(extent: number, seed = 7) {
  const S = 64;
  const rand = rng(seed);
  return pixelTexture(
    paint(S, S, (g) => {
      const c = S / 2;
      const toPx = (r: number) => (r / extent) * c;
      for (let y = 0; y < S; y++)
        for (let x = 0; x < S; x++) {
          const r = Math.hypot(x + 0.5 - c, y + 0.5 - c);
          let col = PALETTE.dough;
          if (r > toPx(0.93)) col = PALETTE.bakeDeep;
          else if (r > toPx(0.8)) col = PALETTE.bake;
          else if (r > toPx(0.66)) col = PALETTE.doughDark;
          const n = rand();
          if (n < 0.08) col = r > toPx(0.8) ? PALETTE.bake : PALETTE.doughLight;
          else if (n > 0.93) col = r > toPx(0.8) ? PALETTE.bakeDeep : PALETTE.doughDark;
          px(g, col, x, y);
        }
      // Chips sit around the face, never on it. Positions are in model units.
      const chips: [number, number, number][] = [
        [-0.52, 0.55, 2.4], [0.18, 0.72, 2], [0.66, 0.36, 2.6], [-0.74, -0.04, 2.2],
        [0.72, -0.22, 2], [-0.3, -0.62, 2.4], [0.3, -0.66, 2.2], [-0.05, 0.86, 1.6],
        [-0.82, 0.32, 1.6],
      ];
      for (const [mx, my, r] of chips) {
        const x = c + toPx(mx), y = c - toPx(my);
        blob(g, PALETTE.chip, x, y, r);
        px(g, PALETTE.chipLight, Math.round(x - r / 2), Math.round(y - r / 2));
      }
    }),
  );
}

export type FaceExpression = "open" | "blink" | "happy" | "chomp" | "content" | "sleep" | "surprised";

/** Redraws the 32x32 face decal in place; cheap enough to do on every blink. */
export function drawFace(canvas: HTMLCanvasElement, expr: FaceExpression, kind: "cookie" | "cat" = "cookie") {
  const g = canvas.getContext("2d")!;
  g.clearRect(0, 0, 32, 32);
  const ink = PALETTE.ink;
  const cat = kind === "cat";
  // cheeks
  if (cat) {
    px(g, "#f7c1cb", 3, 18, 4, 1);
    px(g, "#f7c1cb", 25, 18, 4, 1);
  } else {
    px(g, PALETTE.blush, 4, 18, 4, 2);
    px(g, PALETTE.blush, 24, 18, 4, 2);
  }
  const eye = (x: number) => {
    if (expr === "open" || expr === "chomp") {
      px(g, ink, x, 12, 3, 5);
      px(g, ink, x - 1, 13, 5, 3);
      px(g, "#ffffff", x, 13);
    } else if (expr === "surprised") {
      px(g, ink, x - 1, 11, 4, 6);
      px(g, "#ffffff", x, 12);
    } else if (expr === "happy") {
      // ^ shape
      px(g, ink, x - 1, 15);
      px(g, ink, x, 14);
      px(g, ink, x + 1, 13);
      px(g, ink, x + 2, 14);
      px(g, ink, x + 3, 15);
    } else if (expr === "content") {
      // soft upside-down arc, eyes closed while playing
      px(g, ink, x - 1, 14);
      px(g, ink, x, 15, 3, 1);
      px(g, ink, x + 3, 14);
    } else {
      // blink and sleep: a flat line
      px(g, ink, x - 1, expr === "sleep" ? 15 : 14, 5, 1);
    }
  };
  eye(cat ? 8 : 9);
  eye(cat ? 22 : 21);
  if (cat) {
    // pink nose, then a mouth one row lower than the cookie's
    px(g, "#e98a9c", 15, 17, 2, 1);
    g.translate(0, 1);
  }
  if (cat && expr !== "chomp" && expr !== "surprised" && expr !== "content" && expr !== "happy") {
    // tiny cat smile
    px(g, ink, 14, 18);
    px(g, ink, 15, 19, 2, 1);
    px(g, ink, 17, 18);
  } else if (expr === "chomp" || expr === "surprised") {
    px(g, ink, 14, 18, 4, 4);
    px(g, ink, 13, 19, 6, 2);
    px(g, "#c9566a", 14, 20, 4, 1);
  } else if (expr === "content") {
    // little "o" for blowing into the flute
    px(g, ink, 15, 19, 2, 1);
    px(g, ink, 14, 20);
    px(g, ink, 17, 20);
    px(g, ink, 15, 21, 2, 1);
  } else if (expr === "happy") {
    px(g, ink, 13, 18, 6, 1);
    px(g, ink, 13, 19, 6, 1);
    px(g, ink, 14, 20, 4, 1);
    px(g, "#c9566a", 15, 20, 2, 1);
  } else {
    // small smile
    px(g, ink, 13, 18);
    px(g, ink, 14, 19, 4, 1);
    px(g, ink, 18, 18);
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
}

export function faceCanvas() {
  return paint(32, 32, () => {});
}

export function woodTexture(seed = 3, base = "#a8693a", dark = "#8a5330", light = "#bd7d48") {
  const rand = rng(seed);
  return pixelTexture(
    paint(32, 32, (g) => {
      for (let y = 0; y < 32; y++)
        for (let x = 0; x < 32; x++) {
          const grain = Math.sin(y * 0.9 + Math.sin(x * 0.25) * 1.6);
          let col = grain > 0.6 ? dark : grain < -0.7 ? light : base;
          if (rand() < 0.05) col = dark;
          px(g, col, x, y);
        }
      for (const y of [0, 8, 16, 24]) px(g, "#6e4126", 0, y, 32, 1);
    }),
    true,
  );
}

export function wallTexture(top: string, bottom: string) {
  return pixelTexture(
    paint(8, 32, (g) => {
      const a = new THREE.Color(top), b = new THREE.Color(bottom);
      for (let y = 0; y < 32; y++) px(g, "#" + a.clone().lerp(b, y / 31).getHexString(), 0, y, 8, 1);
    }),
  );
}

export function wallpaperTexture() {
  return pixelTexture(
    paint(16, 16, (g) => {
      px(g, "#fbe9df", 0, 0, 16, 16);
      px(g, "#f6d6cc", 0, 0, 4, 16);
      px(g, "#f6d6cc", 8, 0, 4, 16);
      px(g, "#e98aa3", 13, 3);
      px(g, "#e98aa3", 5, 11);
    }),
    true,
  );
}

export function windowTexture() {
  return pixelTexture(
    paint(32, 32, (g) => {
      px(g, "#f7f2ea", 0, 0, 32, 32);
      for (let y = 2; y < 30; y++) {
        const t = y / 30;
        px(g, t < 0.5 ? "#8fd0f2" : "#b9e3f5", 2, y, 28, 1);
      }
      px(g, "#ffffff", 6, 8, 6, 2);
      px(g, "#ffffff", 4, 9, 10, 2);
      px(g, "#ffffff", 19, 18, 5, 2);
      px(g, "#ffffff", 17, 19, 9, 2);
      px(g, "#f7f2ea", 15, 2, 2, 28);
      px(g, "#f7f2ea", 2, 15, 28, 2);
    }),
  );
}

export function rugTexture(a = "#3f5fb8", b = "#33509e") {
  return pixelTexture(
    paint(16, 16, (g) => {
      px(g, a, 0, 0, 16, 16);
      for (let y = 0; y < 16; y += 4) px(g, b, 0, y, 16, 2);
    }),
    true,
  );
}

export function roundRugTexture() {
  return pixelTexture(
    paint(32, 32, (g) => {
      for (let y = 0; y < 32; y++)
        for (let x = 0; x < 32; x++) {
          const r = Math.hypot(x - 15.5, y - 15.5);
          const ring = Math.floor(r / 3) % 2;
          px(g, ring ? "#f2b6c4" : "#fbe0e6", x, y);
        }
    }),
  );
}

/** Bowl texture along the lathe profile: v=0 at the outer foot, v=1 inside. */
export function bowlTexture() {
  return pixelTexture(
    paint(16, 32, (g) => {
      px(g, "#7fb2e0", 0, 0, 16, 14);
      for (let x = 0; x < 16; x += 4) px(g, "#ffffff", x, 5, 2, 2);
      px(g, "#5a8fc4", 0, 0, 16, 2);
      px(g, "#ffffff", 0, 14, 16, 5);
      px(g, "#fff3e2", 0, 19, 16, 13);
    }),
  );
}

export function flatTexture(color: string) {
  return pixelTexture(paint(2, 2, (g) => px(g, color, 0, 0, 2, 2)));
}

export function fluteTexture() {
  return pixelTexture(
    paint(32, 4, (g) => {
      px(g, "#d9dde4", 0, 0, 32, 4);
      px(g, "#f6f8fb", 0, 1, 32, 1);
      for (let x = 6; x < 30; x += 4) px(g, "#8c93a0", x, 2, 2, 2);
    }),
  );
}

export function sheetTexture() {
  return pixelTexture(
    paint(16, 16, (g) => {
      px(g, "#ffffff", 0, 0, 16, 16);
      for (const y of [3, 8, 13]) {
        px(g, "#9a9aa4", 1, y, 14, 1);
        px(g, "#292a33", 3 + (y % 5), y - 1, 2, 2);
        px(g, "#292a33", 9 + (y % 3), y, 2, 2);
      }
    }),
  );
}

/** Small sprite glyphs: music note, Z, sparkle, crumb. Transparent background. */
export function glyphTexture(kind: "note" | "z" | "sparkle" | "crumb" | "heart") {
  return pixelTexture(
    paint(8, 8, (g) => {
      if (kind === "note") {
        px(g, "#e0457b", 4, 0, 1, 6);
        px(g, "#e0457b", 5, 1, 2, 1);
        px(g, "#e0457b", 6, 2, 1, 1);
        px(g, "#e0457b", 2, 5, 3, 2);
        px(g, "#e0457b", 1, 6, 3, 1);
      } else if (kind === "z") {
        px(g, "#5b6bbf", 1, 1, 6, 1);
        px(g, "#5b6bbf", 5, 2);
        px(g, "#5b6bbf", 4, 3);
        px(g, "#5b6bbf", 3, 4);
        px(g, "#5b6bbf", 2, 5);
        px(g, "#5b6bbf", 1, 6, 6, 1);
      } else if (kind === "heart") {
        px(g, "#ff6fa3", 1, 1, 2, 1);
        px(g, "#ff6fa3", 5, 1, 2, 1);
        px(g, "#ff6fa3", 0, 2, 8, 2);
        px(g, "#ff6fa3", 1, 4, 6, 1);
        px(g, "#ff6fa3", 2, 5, 4, 1);
        px(g, "#ff6fa3", 3, 6, 2, 1);
        px(g, "#ffffff", 1, 2);
      } else if (kind === "sparkle") {
        px(g, "#ffe27a", 3, 0, 2, 8);
        px(g, "#ffe27a", 0, 3, 8, 2);
        px(g, "#ffffff", 3, 3, 2, 2);
      } else {
        px(g, PALETTE.bake, 2, 2, 4, 4);
        px(g, PALETTE.chip, 3, 3, 2, 2);
      }
    }),
  );
}

// ---------------------------------------------------------------- studio props
// The desk-and-wall set on the lab's Cat host page. Same 16-ish texel tiles.

/** A diploma: cream paper, a heading line, text lines and a red seal. */
export function diplomaTexture() {
  return pixelTexture(
    paint(24, 18, (g) => {
      px(g, "#fbf3dc", 0, 0, 24, 18);
      px(g, "#e9dcb8", 0, 0, 24, 1);
      px(g, "#e9dcb8", 0, 17, 24, 1);
      px(g, "#5b4a3a", 6, 3, 12, 2);
      for (const y of [7, 9, 11]) px(g, "#b6a688", 4, y, 16, 1);
      blob(g, "#c8314a", 18, 14, 2.2);
      px(g, "#f2c94c", 18, 14);
    }),
  );
}

/** A résumé page: a name bar and short lines. */
export function resumeTexture() {
  return pixelTexture(
    paint(16, 22, (g) => {
      px(g, "#ffffff", 0, 0, 16, 22);
      px(g, "#2b2d3a", 2, 2, 9, 2);
      px(g, "#e0457b", 2, 5, 5, 1);
      for (let y = 8; y < 20; y += 2) px(g, "#a9adbb", 2, y, y % 4 === 0 ? 12 : 9, 1);
    }),
  );
}

/** A little social icon tile: a coloured square and a simple white mark. */
export function socialTexture(kind: "tiktok" | "douyin" | "rednote" | "youtube") {
  return pixelTexture(
    paint(12, 12, (g) => {
      const bg = kind === "youtube" ? "#e33b3b" : kind === "rednote" ? "#ff2e4d" : "#16161c";
      px(g, bg, 0, 0, 12, 12);
      if (kind === "youtube") {
        px(g, "#ffffff", 4, 3, 1, 6);
        px(g, "#ffffff", 5, 4, 1, 4);
        px(g, "#ffffff", 6, 5, 1, 2);
      } else if (kind === "rednote") {
        px(g, "#ffffff", 3, 3, 6, 1);
        px(g, "#ffffff", 3, 5, 6, 1);
        px(g, "#ffffff", 3, 7, 4, 1);
      } else {
        // a note-like hook, with a cyan/pink offset for Douyin
        if (kind === "douyin") {
          px(g, "#2fe6e0", 5, 2, 1, 7);
          px(g, "#2fe6e0", 3, 7, 2, 2);
        }
        px(g, kind === "douyin" ? "#ff3d77" : "#ffffff", 6, 2, 1, 7);
        px(g, kind === "douyin" ? "#ff3d77" : "#ffffff", 7, 2, 2, 1);
        px(g, kind === "douyin" ? "#ff3d77" : "#ffffff", 4, 7, 2, 2);
      }
    }),
  );
}

/** The laptop's screen: a pastel desktop with a few app icons. */
export function laptopScreenTexture() {
  return pixelTexture(
    paint(20, 13, (g) => {
      px(g, "#ffd3e2", 0, 0, 20, 13);
      px(g, "#ffe9f0", 0, 0, 20, 2);
      const icons = ["#e0457b", "#f2a33a", "#5b8def", "#57b77a"];
      icons.forEach((c, i) => px(g, c, 2 + i * 4, 4, 3, 3));
      px(g, "#9b6bd6", 2, 8, 3, 3);
    }),
  );
}

/** A closed book: coloured cover with a lighter spine band. */
export function bookTexture() {
  return pixelTexture(
    paint(8, 8, (g) => {
      px(g, "#3f7fb8", 0, 0, 8, 8);
      px(g, "#5f9bd0", 0, 0, 2, 8);
      px(g, "#fff3d6", 3, 2, 4, 1);
    }),
  );
}

/** An envelope with a heart seal. */
export function envelopeTexture() {
  return pixelTexture(
    paint(16, 11, (g) => {
      px(g, "#fffaf0", 0, 0, 16, 11);
      for (let i = 0; i < 6; i++) {
        px(g, "#e3d8c4", i + 1, i, 1, 1);
        px(g, "#e3d8c4", 14 - i, i, 1, 1);
      }
      px(g, "#e0457b", 7, 5, 1, 1);
      px(g, "#e0457b", 9, 5, 1, 1);
      px(g, "#e0457b", 7, 6, 3, 1);
      px(g, "#e0457b", 8, 7, 1, 1);
    }),
  );
}
