// The bathhouse itself: a lounge with a heated floor, a sauna cabin, a hot
// spring in the garden and a cold plunge looking over the valley. Everything is
// built from shapes in code, no model files. Floor plan numbers live in nav.ts.
import * as THREE from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { COLD, HOT, SPOTS } from "./nav";
import { canvasTexture, Fireflies, makeSky, makeStars, makeWater, softDot, type Drops, type Puffs, type Water } from "./fx";

export type TimeOfDay = "dusk" | "night" | "morning";

type Look = {
  top: string; horizon: string; glow: string; fog: string; fogDensity: number;
  hemiSky: string; hemiGround: string; hemi: number;
  sun: string; sunI: number; sunPos: [number, number, number];
  stars: number; lamps: number; flies: number; exposure: number; waterSky: string;
};

const LOOKS: Record<TimeOfDay, Look> = {
  dusk: {
    top: "#2c2c63", horizon: "#f0a27c", glow: "#ffb46e", fog: "#6b5a7a", fogDensity: 0.0075,
    hemiSky: "#a99ad8", hemiGround: "#6a5848", hemi: 1.0,
    sun: "#ffb27a", sunI: 1.5, sunPos: [-28, 14, 22],
    stars: 0.55, lamps: 1, flies: 0.9, exposure: 1.0, waterSky: "#b79ab8",
  },
  night: {
    top: "#0b1030", horizon: "#27305e", glow: "#39407a", fog: "#161a36", fogDensity: 0.009,
    hemiSky: "#6e7fd0", hemiGround: "#3a3850", hemi: 0.9,
    sun: "#b9ccff", sunI: 1.25, sunPos: [18, 24, -16],
    stars: 1, lamps: 1.25, flies: 1, exposure: 1.0, waterSky: "#4a5590",
  },
  morning: {
    top: "#7fb3e6", horizon: "#f7e3c8", glow: "#fff0c0", fog: "#d9e2e6", fogDensity: 0.006,
    hemiSky: "#e6f0ff", hemiGround: "#8a8068", hemi: 1.15,
    sun: "#fff1d6", sunI: 2.3, sunPos: [26, 22, 14],
    stars: 0, lamps: 0.25, flies: 0, exposure: 1.0, waterSky: "#cfe2f0",
  },
};

export const WALL_H = 2.5;
/** Where the land ends and the lake begins (z). */
const SHORE = 8.7;

export type World = {
  root: THREE.Group;
  hot: Water;
  cold: Water;
  mirror: Reflector;
  /** Sauna stove: where steam comes from when someone pours water. */
  stove: THREE.Vector3;
  setTime(t: TimeOfDay, instant?: boolean): void;
  /** Reduced motion: thinner steam, slower leaves. */
  calm: boolean;
  /** Set each frame while anyone is in the front doorway. */
  doorBusy: boolean;
  /** Called when the porch wind chime rings. */
  onChime: ((x: number, z: number) => void) | null;
  update(t: number, dt: number, eye?: THREE.Vector3): void;
  dispose(): void;
};

// ---------------------------------------------------------------- textures

function speckle(g: CanvasRenderingContext2D, w: number, h: number, n: number, colors: string[], min = 1, max = 3) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = colors[(Math.random() * colors.length) | 0];
    const s = min + Math.random() * (max - min);
    g.fillRect(Math.random() * w, Math.random() * h, s, s);
  }
}

function planks(base: string, line: string, grain: string[], rows = 4) {
  return canvasTexture(256, 256, (g) => {
    g.fillStyle = base;
    g.fillRect(0, 0, 256, 256);
    const rh = 256 / rows;
    for (let r = 0; r < rows; r++) {
      // each board a slightly different shade
      g.fillStyle = `rgba(${r % 2 ? "255,255,255" : "0,0,0"},${0.03 + Math.random() * 0.05})`;
      g.fillRect(0, r * rh, 256, rh);
      for (let i = 0; i < 26; i++) {
        g.strokeStyle = grain[(Math.random() * grain.length) | 0];
        g.lineWidth = 0.6 + Math.random();
        const y = r * rh + Math.random() * rh;
        g.beginPath();
        g.moveTo(0, y);
        g.bezierCurveTo(80, y + (Math.random() - 0.5) * 5, 170, y + (Math.random() - 0.5) * 5, 256, y);
        g.stroke();
      }
      g.fillStyle = line;
      g.fillRect(0, r * rh, 256, 2);
      const joint = Math.random() * 256;
      g.fillRect(joint, r * rh, 2, rh);
    }
  });
}

function makeTextures() {
  const woodLight = planks("#dcbd8e", "rgba(120,84,48,0.55)", ["rgba(150,105,60,0.22)", "rgba(255,240,210,0.2)"]);
  const woodDark = planks("#5e4130", "rgba(20,12,8,0.6)", ["rgba(30,18,12,0.3)", "rgba(140,100,70,0.2)"]);
  const woodDeck = planks("#9a7350", "rgba(40,26,16,0.6)", ["rgba(60,40,24,0.28)", "rgba(210,170,120,0.18)"], 5);
  const ondol = canvasTexture(256, 256, (g) => {
    g.fillStyle = "#e6c77f";
    g.fillRect(0, 0, 256, 256);
    speckle(g, 256, 256, 900, ["rgba(170,120,50,0.10)", "rgba(255,245,200,0.14)"], 1, 4);
    g.strokeStyle = "rgba(140,96,40,0.5)";
    g.lineWidth = 2;
    g.strokeRect(1, 1, 254, 254);
  });
  const plaster = canvasTexture(256, 256, (g) => {
    g.fillStyle = "#efe5d3";
    g.fillRect(0, 0, 256, 256);
    speckle(g, 256, 256, 1600, ["rgba(120,100,80,0.05)", "rgba(255,255,255,0.12)"], 1, 5);
  });
  const paving = canvasTexture(256, 256, (g) => {
    g.fillStyle = "#6d675f";
    g.fillRect(0, 0, 256, 256);
    // irregular slabs
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const v = 150 + ((Math.random() * 40) | 0);
        g.fillStyle = `rgb(${v},${v - 6},${v - 16})`;
        const o = y % 2 ? 32 : 0;
        g.beginPath();
        g.roundRect(x * 64 + 3 - o, y * 64 + 3, 58, 58, 9);
        g.fill();
        if (o && x === 3) {
          g.beginPath();
          g.roundRect(256 + 3 - o, y * 64 + 3, 58, 58, 9);
          g.fill();
        }
      }
    }
    speckle(g, 256, 256, 1400, ["rgba(0,0,0,0.07)", "rgba(255,255,255,0.08)"]);
  });
  const moss = canvasTexture(256, 256, (g) => {
    g.fillStyle = "#3f4c3a";
    g.fillRect(0, 0, 256, 256);
    speckle(g, 256, 256, 5000, ["rgba(30,40,26,0.5)", "rgba(96,116,70,0.4)", "rgba(70,80,52,0.5)", "rgba(120,110,80,0.2)"], 1, 4);
  });
  const gravel = canvasTexture(256, 256, (g) => {
    g.fillStyle = "#cdc4b3";
    g.fillRect(0, 0, 256, 256);
    speckle(g, 256, 256, 3200, ["rgba(120,112,98,0.16)", "rgba(240,234,220,0.24)", "rgba(165,155,138,0.2)"], 1, 3);
    // raked lines: a soft shadow and a soft highlight side by side, wavering a little
    for (let y = 8; y < 256; y += 32) {
      for (const [dy, c] of [[0, "rgba(96,88,74,0.22)"], [3, "rgba(255,250,238,0.3)"]] as const) {
        g.strokeStyle = c;
        g.lineWidth = 2.5;
        g.beginPath();
        g.moveTo(0, y + dy);
        g.bezierCurveTo(64, y + dy - 5, 192, y + dy + 5, 256, y + dy);
        g.stroke();
      }
    }
  });
  const roof = canvasTexture(128, 128, (g) => {
    g.fillStyle = "#2f3242";
    g.fillRect(0, 0, 128, 128);
    for (let x = 0; x < 128; x += 16) {
      const grad = g.createLinearGradient(x, 0, x + 16, 0);
      grad.addColorStop(0, "rgba(0,0,0,0.35)");
      grad.addColorStop(0.5, "rgba(120,126,160,0.25)");
      grad.addColorStop(1, "rgba(0,0,0,0.35)");
      g.fillStyle = grad;
      g.fillRect(x, 0, 16, 128);
    }
    g.fillStyle = "rgba(0,0,0,0.3)";
    for (let y = 0; y < 128; y += 32) g.fillRect(0, y, 128, 2);
  });
  const bamboo = canvasTexture(256, 256, (g) => {
    g.fillStyle = "#3a3320";
    g.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 16) {
      const hue = 44 + Math.random() * 20;
      const grad = g.createLinearGradient(x, 0, x + 15, 0);
      grad.addColorStop(0, `hsl(${hue},32%,26%)`);
      grad.addColorStop(0.45, `hsl(${hue},40%,52%)`);
      grad.addColorStop(1, `hsl(${hue},32%,24%)`);
      g.fillStyle = grad;
      g.fillRect(x, 0, 15, 256);
      g.fillStyle = "rgba(40,30,10,0.55)";
      for (let k = 0; k < 3; k++) g.fillRect(x, ((Math.random() * 256) | 0), 15, 2);
    }
    // the cords that tie the poles
    g.fillStyle = "rgba(20,16,10,0.8)";
    g.fillRect(0, 56, 256, 5);
    g.fillRect(0, 190, 256, 5);
  });
  const towel = canvasTexture(128, 256, (g) => {
    g.fillStyle = "#faf6ee";
    g.fillRect(0, 0, 128, 256);
    speckle(g, 128, 256, 1500, ["rgba(180,170,150,0.12)"], 1, 2);
    g.fillStyle = "#e9a4a0";
    g.fillRect(0, 18, 128, 7);
    g.fillRect(0, 231, 128, 7);
    g.fillStyle = "#f2cdbf";
    g.fillRect(0, 30, 128, 3);
    g.fillRect(0, 223, 128, 3);
  }, false);
  const noren = (glyph: string) =>
    canvasTexture(128, 192, (g) => {
      g.fillStyle = "#27365f";
      g.fillRect(0, 0, 128, 192);
      speckle(g, 128, 192, 800, ["rgba(255,255,255,0.04)", "rgba(0,0,0,0.08)"], 1, 3);
      if (glyph) {
        g.fillStyle = "#f6efe0";
        g.font = "600 92px 'Hiragino Mincho ProN', 'Songti SC', 'Noto Serif CJK SC', serif";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(glyph, 64, 100);
      }
    }, false);
  const lockers = canvasTexture(512, 256, (g) => {
    g.fillStyle = "#c9a878";
    g.fillRect(0, 0, 512, 256);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 6; col++) {
        const x = col * 85.3 + 4;
        const y = row * 85.3 + 4;
        g.fillStyle = (row + col) % 2 ? "#d7b98a" : "#cfae7c";
        g.beginPath();
        g.roundRect(x, y, 77, 77, 6);
        g.fill();
        g.strokeStyle = "rgba(90,60,30,0.5)";
        g.lineWidth = 2;
        g.stroke();
        // number plate and a key on a coloured band
        g.fillStyle = "#f6efe0";
        g.fillRect(x + 24, y + 12, 30, 16);
        g.fillStyle = "#5e4130";
        g.font = "600 12px system-ui, sans-serif";
        g.textAlign = "center";
        g.fillText(String(row * 6 + col + 1).padStart(2, "0"), x + 39, y + 24);
        g.fillStyle = ["#e58f98", "#93b9e6", "#f1cf5e", "#93cba6"][(row * 6 + col) % 4];
        g.beginPath();
        g.arc(x + 62, y + 46, 5, 0, Math.PI * 2);
        g.fill();
      }
    }
  }, false);
  const fridge = canvasTexture(256, 384, (g) => {
    g.fillStyle = "#eef6f8";
    g.fillRect(0, 0, 256, 384);
    for (let row = 0; row < 3; row++) {
      const y = 40 + row * 116;
      g.fillStyle = "#c9d6da";
      g.fillRect(8, y + 78, 240, 6);
      for (let i = 0; i < 6; i++) {
        const x = 22 + i * 38;
        const flavour = ["#ffffff", "#f8d9e0", "#f4e3b0", "#d9c2a2"][(i + row) % 4];
        g.fillStyle = flavour;
        g.beginPath();
        g.roundRect(x, y + 22, 26, 56, 6);
        g.fill();
        g.fillRect(x + 7, y + 8, 12, 16);
        g.fillStyle = ["#5b8bd9", "#e06a8a", "#e0a53a", "#8a5a3a"][(i + row) % 4];
        g.fillRect(x + 6, y + 4, 14, 6);
        g.fillRect(x, y + 40, 26, 14);
      }
    }
  }, false);
  return { woodLight, woodDark, woodDeck, ondol, plaster, paving, moss, gravel, roof, bamboo, towel, noren, fridge, lockers };
}

// ---------------------------------------------------------------- build

export function buildWorld(scene: THREE.Scene, puffs: Puffs, drops: Drops): World {
  const root = new THREE.Group();
  scene.add(root);
  const T = makeTextures();
  const disposables: { dispose(): void }[] = Object.values(T).filter((t): t is THREE.CanvasTexture => t instanceof THREE.Texture);

  const std = (color: string, roughness = 0.85, map?: THREE.Texture, extra: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...(map ? { map } : {}), ...extra });

  const M = {
    woodLight: std("#ffffff", 0.75, T.woodLight),
    woodDark: std("#ffffff", 0.8, T.woodDark),
    deck: std("#ffffff", 0.85, T.woodDeck),
    ondol: std("#ffffff", 0.45, T.ondol),
    plaster: std("#ffffff", 0.95, T.plaster),
    paving: std("#ffffff", 0.95, T.paving),
    moss: std("#ffffff", 1, T.moss),
    gravel: std("#ffffff", 1, T.gravel),
    roof: std("#ffffff", 0.7, T.roof),
    bamboo: std("#ffffff", 0.8, T.bamboo),
    rock: std("#948d85", 0.95, undefined, { flatShading: true }),
    rockDark: std("#6f6963", 0.95, undefined, { flatShading: true }),
    stoneSmooth: std("#8f8a82", 0.9),
    basin: std("#3e4a4c", 0.9, undefined, { side: THREE.BackSide }),
    coldStone: std("#7f8c93", 0.8),
    iron: std("#26242a", 0.5, undefined, { metalness: 0.6 }),
    paper: std("#fff0cf", 0.9, undefined, { emissive: "#ffcf87", emissiveIntensity: 1 }),
    white: std("#f8f4ec", 0.9),
    leafRed: std("#c6452c", 0.9, undefined, { flatShading: true }),
    leafOrange: std("#e0812e", 0.9, undefined, { flatShading: true }),
    pine: std("#2f5a3d", 0.95, undefined, { flatShading: true }),
    bambooGreen: std("#6f9a4a", 0.7),
    bark: std("#4a3628", 1),
    yuzu: std("#f7c62f", 0.6, undefined, { emissive: "#8a6200", emissiveIntensity: 0.5 }),
    ice: std("#ffffff", 0.15, undefined, { transparent: true, opacity: 0.82, emissive: "#a9dcff", emissiveIntensity: 0.3 }),
  };
  const pad = new THREE.MeshBasicMaterial({ visible: false });

  /** A box whose texture repeats every `tile` metres instead of stretching. */
  function box(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, tile = 0, parent: THREE.Object3D = root) {
    const geo = new THREE.BoxGeometry(w, h, d);
    if (tile > 0) {
      const uv = geo.attributes.uv;
      const dims: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
      for (let f = 0; f < 6; f++) {
        for (let v = 0; v < 4; v++) {
          const i = f * 4 + v;
          uv.setXY(i, (uv.getX(i) * dims[f][0]) / tile, (uv.getY(i) * dims[f][1]) / tile);
        }
      }
    }
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  /** Floor slab between two corners, top at y. Marked so clicks on it mean "walk here". */
  function floor(x0: number, x1: number, z0: number, z1: number, mat: THREE.Material, tile: number, y = 0.012) {
    const m = box(x1 - x0, 0.06, z1 - z0, mat, (x0 + x1) / 2, y - 0.03, (z0 + z1) / 2, tile);
    m.castShadow = false;
    m.userData.floor = true;
    return m;
  }

  type Opening = { a: number; b: number; y0: number; y1: number };
  const door = (a: number, b: number): Opening => ({ a, b, y0: 0, y1: 1.75 });
  const windowAt = (a: number, b: number, y0 = 0.75, y1 = 1.85): Opening => ({ a, b, y0, y1 });
  /** A wall along x (at fixed z) or along z (at fixed x), with doors and windows cut out. */
  function wall(along: "x" | "z", fixed: number, from: number, to: number, mat: THREE.Material, openings: Opening[] = [], h = WALL_H, thick = 0.2) {
    const piece = (a: number, b: number, y0: number, y1: number, m: THREE.Material = mat, t = thick) => {
      if (b - a < 0.01 || y1 - y0 < 0.01) return;
      if (along === "x") box(b - a, y1 - y0, t, m, (a + b) / 2, (y0 + y1) / 2, fixed, 1.2);
      else box(t, y1 - y0, b - a, m, fixed, (y0 + y1) / 2, (a + b) / 2, 1.2);
    };
    let cur = from;
    for (const o of [...openings].sort((p, q) => p.a - q.a)) {
      piece(cur, o.a, 0, h);
      piece(o.a, o.b, 0, o.y0);
      piece(o.a, o.b, o.y1, h);
      // dark timber around the opening
      piece(o.a - 0.07, o.a + 0.05, 0, o.y1 + 0.1, M.woodDark, thick + 0.06);
      piece(o.b - 0.05, o.b + 0.07, 0, o.y1 + 0.1, M.woodDark, thick + 0.06);
      piece(o.a - 0.07, o.b + 0.07, o.y1, o.y1 + 0.1, M.woodDark, thick + 0.06);
      if (o.y0 > 0) piece(o.a - 0.07, o.b + 0.07, o.y0 - 0.06, o.y0, M.woodDark, thick + 0.1);
      cur = o.b;
    }
    piece(cur, to, 0, h);
  }

  /** Ceiling slab and a gable roof with the ridge running along x. */
  function roofOver(x0: number, x1: number, z0: number, z1: number, rise: number, over = 0.5, ceil: THREE.Material = M.woodDark) {
    const cz = (z0 + z1) / 2;
    const c = box(x1 - x0, 0.1, z1 - z0, ceil, (x0 + x1) / 2, WALL_H + 0.05, cz, 1.2);
    c.castShadow = true;
    const half = (z1 - z0) / 2 + over;
    const len = Math.hypot(half, rise);
    const ang = Math.atan2(rise, half);
    for (const side of [1, -1]) {
      const slab = box(x1 - x0 + over * 2, 0.14, len, M.roof, (x0 + x1) / 2, WALL_H + 0.1 + rise / 2, cz + (side * half) / 2, 0.8);
      slab.rotation.x = side * ang;
    }
    // close the two triangular ends
    for (const x of [x0, x1]) {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute([x, WALL_H + 0.1, z0, x, WALL_H + 0.1, z1, x, WALL_H + 0.1 + rise * ((z1 - z0) / 2 / half), cz], 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
      g.computeVertexNormals();
      const tri = new THREE.Mesh(g, std("#e9dfcc", 0.95, undefined, { side: THREE.DoubleSide }));
      root.add(tri);
    }
    box(x1 - x0 + over * 2 + 0.1, 0.16, 0.22, M.woodDark, (x0 + x1) / 2, WALL_H + 0.14 + rise, cz); // ridge beam
  }

  // ------------------------------------------------------------ ground

  {
    const shape = new THREE.Shape();
    // the land stops just past the garden wall; beyond it is the lake (shape y is minus z)
    shape.moveTo(-300, -SHORE);
    shape.lineTo(300, -SHORE);
    shape.lineTo(300, 300);
    shape.lineTo(-300, 300);
    shape.closePath();
    const hot = new THREE.Path();
    hot.absellipse(HOT.cx, -HOT.cz, HOT.rx, HOT.rz, 0, Math.PI * 2, false, 0);
    shape.holes.push(hot);
    const cold = new THREE.Path();
    cold.moveTo(COLD.x0, -COLD.z0);
    cold.lineTo(COLD.x1, -COLD.z0);
    cold.lineTo(COLD.x1, -COLD.z1);
    cold.lineTo(COLD.x0, -COLD.z1);
    cold.closePath();
    shape.holes.push(cold);
    const geo = new THREE.ShapeGeometry(shape, 48);
    geo.rotateX(-Math.PI / 2);
    // one texture tile every 2 m
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2, uv.getY(i) / 2);
    const ground = new THREE.Mesh(geo, M.moss);
    ground.receiveShadow = true;
    ground.userData.floor = true;
    root.add(ground);
  }

  // paths and decks (only a little above the ground, so nothing to trip on)
  floor(-8.1, -2.4, 3.8, 5.7, M.paving, 1.4);
  floor(0.5, 4.8, 4.1, 6.3, M.paving, 1.4);
  floor(-10.7, -9.5, 2.6, 3.4, M.paving, 1.4);
  floor(4.0, 4.8, 1.8, 3.0, M.paving, 1.4);
  floor(4.7, 15, 1.45, 6.35, M.gravel, 1.6);
  floor(-13.1, -8, 3.3, 4.75, M.deck, 1.1); // plunge deck
  floor(-2.6, 0.6, 3.6, 6.5, M.deck, 1.1); // porch
  floor(-8.2, -6, -0.75, 0.75, M.deck, 1.1); // covered link

  // ------------------------------------------------------------ lounge

  floor(-6, 4, -3.5, 3.5, M.ondol, 1.0);
  wall("x", -3.5, -6.1, 4.1, M.plaster);
  wall("x", 3.5, -6.1, 4.1, M.plaster, [windowAt(-5.2, -2.4), door(-1.6, -0.4), windowAt(0.6, 3.2)]);
  wall("z", -6, -3.5, 3.5, M.plaster, [door(-0.6, 0.6)]);
  wall("z", 4, -3.5, 3.5, M.plaster, [windowAt(-2.9, 1.1, 0.7, 1.95), door(1.8, 3.0)]);
  roofOver(-6.1, 4.1, -3.6, 3.6, 1.35);
  // wainscot: a band of light wood round the room at shoulder height for a small person
  for (const [ax, f, a, b] of [["x", -3.39, -5.9, 3.9], ["z", -5.89, -3.4, -0.7], ["z", -5.89, 0.7, 3.4]] as const) {
    if (ax === "x") box(b - a, 0.5, 0.03, M.woodLight, (a + b) / 2, 0.25, f, 1);
    else box(0.03, 0.5, b - a, M.woodLight, f, 0.25, (a + b) / 2, 1);
  }
  // ceiling beams
  for (const x of [-4, -1, 2]) box(0.16, 0.16, 7, M.woodDark, x, WALL_H - 0.08, 0);

  // paper screens glowing in the front windows
  const screen = std("#fff3d9", 0.9, undefined, { emissive: "#ffd592", emissiveIntensity: 0.55, transparent: true, opacity: 0.82, side: THREE.DoubleSide });
  for (const [a, b] of [[-5.2, -2.4], [0.6, 3.2]]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(b - a, 1.1), screen);
    p.position.set((a + b) / 2, 1.3, 3.5);
    root.add(p);
    for (let k = 1; k < 4; k++) box(0.03, 1.1, 0.24, M.woodDark, a + ((b - a) * k) / 4, 1.3, 3.5);
    box(b - a, 0.03, 0.24, M.woodDark, (a + b) / 2, 1.3, 3.5);
  }

  // towel mats with a little wooden pillow each
  for (const s of SPOTS.filter((p) => p.kind === "mat")) {
    const g = new THREE.Group();
    g.position.set(s.x, 0, s.z);
    g.rotation.y = s.face;
    root.add(g);
    const mat = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.03, 1.62), std("#ffffff", 0.95, T.towel));
    mat.position.y = 0.03;
    mat.receiveShadow = true;
    g.add(mat);
    const pillow = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.3, 4, 10), M.woodLight);
    pillow.rotation.z = Math.PI / 2;
    pillow.position.set(0, 0.07, -0.7);
    pillow.castShadow = true;
    g.add(pillow);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.2, 1.66), pad);
    hit.position.y = 0.1;
    hit.userData.spot = s.id;
    g.add(hit);
  }

  // snack counter, egg basket and the milk fridge
  box(2.5, 0.6, 0.75, M.woodLight, 1.35, 0.3, -3.0, 1);
  box(2.6, 0.05, 0.85, M.woodDark, 1.35, 0.62, -3.0, 1);
  {
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.17, 0.14, 20, 1, true), std("#a87c4a", 0.95, undefined, { side: THREE.DoubleSide }));
    basket.position.set(0.8, 0.72, -2.95);
    root.add(basket);
    const eggMat = std("#b98a5e", 0.7);
    for (let i = 0; i < 9; i++) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), eggMat);
      e.scale.y = 1.25;
      const a = (i / 9) * Math.PI * 2;
      const r = i < 6 ? 0.13 : 0.05;
      e.position.set(0.8 + Math.cos(a) * r, i < 6 ? 0.74 : 0.8, -2.95 + Math.sin(a) * r);
      root.add(e);
    }
    // a kettle and cups, just for the look
    const kettle = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), M.iron);
    kettle.scale.y = 0.8;
    kettle.position.set(1.7, 0.75, -3.0);
    root.add(kettle);
    for (let i = 0; i < 3; i++) {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.032, 0.07, 12), M.white);
      cup.position.set(2.05 + i * 0.13, 0.68, -2.9 - (i % 2) * 0.1);
      root.add(cup);
    }
    box(0.85, 1.35, 0.6, M.white, 3.15, 0.675, -3.1);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 1.15), new THREE.MeshStandardMaterial({ map: T.fridge, emissive: "#ffffff", emissiveMap: T.fridge, emissiveIntensity: 0.75, roughness: 0.2 }));
    glass.position.set(3.15, 0.7, -2.79);
    root.add(glass);
  }
  // a hanging scroll on the long empty wall: "take it slow"
  {
    const tex = canvasTexture(128, 384, (g) => {
      g.fillStyle = "#f4ecd9";
      g.fillRect(0, 0, 128, 384);
      g.fillStyle = "#8a6a4a";
      g.fillRect(0, 0, 128, 14);
      g.fillRect(0, 370, 128, 14);
      g.fillStyle = "#2d2622";
      g.font = "500 86px 'Kaiti SC', 'STKaiti', 'Hiragino Mincho ProN', 'Songti SC', serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      ["慢", "慢", "来"].forEach((ch, i) => g.fillText(ch, 64, 86 + i * 104));
      g.fillStyle = "#b8392e";
      g.fillRect(92, 336, 20, 20);
    }, false);
    disposables.push(tex);
    const scroll = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 1.26), std("#ffffff", 0.9, tex));
    scroll.position.set(-3.1, 1.45, -3.385);
    root.add(scroll);
    box(0.5, 0.04, 0.04, M.woodDark, -3.1, 2.1, -3.37);
    box(0.5, 0.04, 0.04, M.woodDark, -3.1, 0.8, -3.37);
  }
  // lockers along the west wall, south of the door to the sauna
  {
    box(0.3, 1.25, 2.4, M.woodLight, -5.75, 0.625, 2.1, 1);
    const doors = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), std("#ffffff", 0.8, T.lockers));
    doors.rotation.y = Math.PI / 2;
    doors.position.set(-5.595, 0.63, 2.1);
    root.add(doors);
    // a folded towel left on top
    box(0.22, 0.06, 0.3, M.white, -5.75, 1.28, 1.5);
  }
  // shelf of rolled towels by the front window
  box(1.3, 0.04, 0.3, M.woodDark, -4.9, 0.55, 3.25);
  box(1.3, 0.04, 0.3, M.woodDark, -4.9, 0.9, 3.25);
  for (let i = 0; i < 10; i++) {
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.26, 12), M.white);
    roll.rotation.x = Math.PI / 2;
    roll.position.set(-5.45 + (i % 5) * 0.27, i < 5 ? 0.65 : 1.0, 3.25);
    root.add(roll);
  }
  // a long low table under the garden window, with tea and floor cushions
  {
    box(0.58, 0.05, 2.6, M.woodDark, 3.6, 0.32, -0.75, 1);
    for (const z of [-1.95, 0.45]) for (const x of [3.38, 3.82]) box(0.06, 0.3, 0.06, M.woodDark, x, 0.15, z);
    const clay = std("#7a5a48", 0.6);
    const pot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), clay);
    pot.scale.y = 0.8;
    pot.position.set(3.6, 0.42, -0.9);
    root.add(pot);
    const spoutT = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.1, 8), clay);
    spoutT.rotation.x = -0.9;
    spoutT.position.set(3.6, 0.44, -0.78);
    root.add(spoutT);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), clay);
    lid.position.set(3.6, 0.51, -0.9);
    root.add(lid);
    for (const [x, z] of [[3.5, -0.55], [3.68, -0.5], [3.55, -1.25]]) {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.028, 0.05, 12), M.white);
      cup.position.set(x, 0.37, z);
      root.add(cup);
    }
    // a thin vase with one maple twig
    const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.16, 12), std("#3f5a6a", 0.4));
    vase.position.set(3.66, 0.43, -1.75);
    root.add(vase);
    const twig = box(0.012, 0.34, 0.012, M.bark, 3.66, 0.65, -1.75);
    twig.rotation.z = 0.25;
    for (const [dx, dy, dz] of [[-0.06, 0.16, 0], [-0.02, 0.1, 0.05], [-0.09, 0.08, -0.04]]) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 5), M.leafRed);
      leaf.scale.set(1.2, 0.3, 1);
      leaf.position.set(3.66 + dx, 0.66 + dy, -1.75 + dz);
      root.add(leaf);
    }
    ["#d9a3a0", "#a9c4a4", "#c9b6d9"].forEach((c, i) => {
      const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.07, 20), std(c, 0.95));
      cushion.position.set(2.95, 0.05, -1.6 + i * 0.85);
      cushion.receiveShadow = true;
      cushion.userData.floor = true;
      root.add(cushion);
    });
  }
  // a plant in the corner
  {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.32, 14), std("#b9674a", 0.9));
    pot.position.set(3.45, 0.16, 0.9);
    root.add(pot);
    for (let i = 0; i < 7; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), std("#4f8a52", 0.8));
      leaf.scale.set(0.35, 1.5, 0.9);
      const a = (i / 7) * Math.PI * 2;
      leaf.position.set(3.45 + Math.cos(a) * 0.13, 0.55 + (i % 3) * 0.08, 0.9 + Math.sin(a) * 0.13);
      leaf.rotation.set(Math.sin(a) * 0.5, a, Math.cos(a) * 0.5);
      root.add(leaf);
    }
  }
  // paper lamps hanging from the ceiling
  const lampLights: { light: THREE.PointLight; base: number; flicker: number }[] = [];
  // a soft halo round every lamp, strongest at night
  const glowMat = new THREE.SpriteMaterial({ map: softDot(), color: "#ffc47a", transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const glow = (x: number, y: number, z: number, size: number) => {
    const g = new THREE.Sprite(glowMat);
    g.position.set(x, y, z);
    g.scale.setScalar(size);
    root.add(g);
  };
  // warm light spilling out of windows and doors onto the ground
  const spillMat = new THREE.MeshBasicMaterial({ map: softDot(), color: "#ffb866", transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const spill = (x: number, z: number, w: number, d: number) => {
    const geo = new THREE.PlaneGeometry(w, d);
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, spillMat);
    m.position.set(x, 0.05, z);
    m.renderOrder = 1;
    root.add(m);
  };
  spill(-3.8, 4.6, 3.6, 2.6); // front windows
  spill(1.9, 4.6, 3.6, 2.6);
  spill(-1, 4.5, 1.8, 2.4); // front door
  spill(5.3, -0.9, 3.0, 4.6); // the big garden window
  spill(4.9, 2.4, 1.8, 1.6); // garden door
  spill(-10.1, 3.4, 1.6, 1.8); // sauna back door
  spill(-11.9, 3.3, 2.2, 1.4); // sauna window
  function lamp(x: number, y: number, z: number, intensity: number, color = "#ffc98a", size = 0.2, distance = 9, flicker = 0) {
    const shade = new THREE.Mesh(new THREE.SphereGeometry(size, 16, 12), M.paper);
    shade.scale.y = 1.15;
    shade.position.set(x, y, z);
    root.add(shade);
    // bamboo ribs and wooden caps, so it reads as a paper lantern and not a ball
    for (const h of [-0.62, -0.25, 0.25, 0.62]) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(Math.sqrt(1 - h * h) * size * 1.005, size * 0.022, 6, 28), M.woodDark);
      rib.rotation.x = Math.PI / 2;
      rib.position.set(x, y + h * size * 1.15, z);
      root.add(rib);
    }
    for (const s of [1, -1]) {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.34, size * 0.34, size * 0.14, 16), M.woodDark);
      cap.position.set(x, y + s * size * 1.12, z);
      root.add(cap);
    }
    const light = new THREE.PointLight(color, intensity, distance, 1.6);
    light.position.set(x, y - 0.05, z);
    root.add(light);
    lampLights.push({ light, base: intensity, flicker });
    glow(x, y, z, size * 6.5);
    return shade;
  }
  for (const x of [-3.2, 1.2]) {
    lamp(x, 2.05, 0.3, 7, "#ffd3a0", 0.24, 10);
    box(0.02, 0.3, 0.02, M.woodDark, x, 2.36, 0.3);
  }

  // the mirror, so you can see who you are today
  const mirror = new Reflector(new THREE.PlaneGeometry(1.3, 1.55), { textureWidth: 512, textureHeight: 640, color: 0xb8b4ae, clipBias: 0.003 });
  mirror.position.set(-5.835, 0.98, -2.05);
  mirror.rotation.y = Math.PI / 2;
  root.add(mirror);
  box(0.06, 1.7, 1.45, M.woodDark, -5.88, 0.98, -2.05);

  // wall clock showing the real time
  const clockCanvas = document.createElement("canvas");
  clockCanvas.width = clockCanvas.height = 128;
  const clockTex = new THREE.CanvasTexture(clockCanvas);
  clockTex.colorSpace = THREE.SRGBColorSpace;
  disposables.push(clockTex);
  let clockMinute = -1;
  function drawClock() {
    const now = new Date();
    if (now.getMinutes() === clockMinute) return;
    clockMinute = now.getMinutes();
    const g = clockCanvas.getContext("2d")!;
    g.fillStyle = "#fbf6ea";
    g.beginPath();
    g.arc(64, 64, 62, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#5e4130";
    g.lineWidth = 6;
    g.stroke();
    g.fillStyle = "#5e4130";
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.beginPath();
      g.arc(64 + Math.sin(a) * 50, 64 - Math.cos(a) * 50, i % 3 ? 2 : 4, 0, Math.PI * 2);
      g.fill();
    }
    const hand = (a: number, len: number, w: number) => {
      g.lineWidth = w;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(64, 64);
      g.lineTo(64 + Math.sin(a) * len, 64 - Math.cos(a) * len);
      g.stroke();
    };
    hand(((now.getHours() % 12) + now.getMinutes() / 60) / 12 * Math.PI * 2, 28, 6);
    hand((now.getMinutes() / 60) * Math.PI * 2, 42, 4);
    clockTex.needsUpdate = true;
  }
  drawClock();
  {
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.22, 32), new THREE.MeshStandardMaterial({ map: clockTex, roughness: 0.6 }));
    face.position.set(1.35, 1.75, -3.38);
    root.add(face);
  }

  // noren over the front door
  const norenPanels: THREE.Mesh[] = [];
  ["", "湯", ""].forEach((glyph, i) => {
    const tex = T.noren(glyph);
    disposables.push(tex);
    const geo = new THREE.PlaneGeometry(0.39, 0.6);
    geo.translate(0, -0.3, 0);
    const p = new THREE.Mesh(geo, std("#ffffff", 0.95, tex, { side: THREE.DoubleSide }));
    p.position.set(-1.4 + i * 0.4, 1.76, 3.62);
    root.add(p);
    norenPanels.push(p);
  });

  // ------------------------------------------------------------ covered link

  box(2.3, 0.1, 1.9, M.woodDark, -7.1, WALL_H - 0.1, 0);
  box(2.6, 0.12, 2.3, M.roof, -7.1, WALL_H + 0.02, 0, 0.8);
  for (const z of [-0.85, 0.85]) {
    box(0.1, WALL_H - 0.15, 0.1, M.woodDark, -7.1, (WALL_H - 0.15) / 2, z);
    box(2.2, 0.06, 0.06, M.woodDark, -7.1, 0.55, z); // handrail
  }
  lamp(-7.1, 2.0, 0, 3, "#ffc27a", 0.14, 6);

  // ------------------------------------------------------------ sauna

  floor(-13, -8.2, -2.5, 2.5, M.woodLight, 0.9);
  wall("x", -2.5, -13.1, -8.1, M.woodLight);
  // a low wide window beside the door: from the benches you look out to the plunge and the lake
  wall("x", 2.5, -13.1, -8.1, M.woodLight, [windowAt(-12.75, -11.05, 1.0, 1.7), door(-10.7, -9.5)]);
  wall("z", -13, -2.5, 2.5, M.woodLight);
  wall("z", -8.2, -2.5, 2.5, M.woodLight, [door(-0.6, 0.6)]);
  roofOver(-13.1, -8.1, -2.6, 2.6, 1.0, 0.4, M.woodLight);
  // two tiers of benches along the back wall
  box(4.6, 0.06, 0.72, M.woodLight, -10.6, 0.31, -1.5, 0.8);
  box(4.6, 0.06, 0.62, M.woodLight, -10.6, 0.65, -2.14, 0.8);
  box(4.6, 0.28, 0.05, M.woodDark, -10.6, 0.14, -1.16, 0.8);
  box(4.6, 0.3, 0.05, M.woodDark, -10.6, 0.47, -1.84, 0.8);
  for (let i = 0; i < 5; i++) box(4.6, 0.09, 0.03, M.woodDark, -10.6, 0.95 + i * 0.16, -2.38); // backrest slats
  for (const s of SPOTS.filter((p) => p.kind === "bench")) {
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.5, 0.6), pad);
    hit.position.set(s.x, s.y + 0.26, s.z);
    hit.userData.spot = s.id;
    root.add(hit);
  }
  // the stove: an iron box with a cage of hot stones
  const stove = new THREE.Vector3(-12.3, 0.85, 1.7);
  box(0.75, 0.6, 0.75, M.iron, stove.x, 0.3, stove.z);
  const emberMat = std("#3a2a26", 0.9, undefined, { emissive: "#ff5a1e", emissiveIntensity: 0.9, flatShading: true });
  for (let i = 0; i < 22; i++) {
    const hot = i % 3 === 0;
    const r = new THREE.Mesh(new THREE.IcosahedronGeometry(0.08 + Math.random() * 0.05, 0), hot ? emberMat : M.rockDark);
    r.position.set(stove.x + (Math.random() - 0.5) * 0.55, 0.64 + Math.random() * 0.16, stove.z + (Math.random() - 0.5) * 0.55);
    r.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    root.add(r);
  }
  box(0.12, WALL_H - 0.6, 0.12, M.iron, stove.x - 0.25, 0.6 + (WALL_H - 0.6) / 2, stove.z + 0.25); // flue
  // and the chimney it comes out of, above the roof
  const chimney = new THREE.Vector3(stove.x - 0.25, 3.75, stove.z + 0.25);
  box(0.2, 1.2, 0.2, M.iron, chimney.x, 3.15, chimney.z);
  box(0.3, 0.05, 0.3, M.iron, chimney.x, 3.82, chimney.z);
  for (const [dx, dz, w, d] of [[0.5, 0, 0.05, 1.0], [0, -0.5, 1.0, 0.05]] as const) box(w, 0.05, d, M.woodDark, stove.x + dx, 0.55, stove.z + dz); // guard rail
  for (const [dx, dz] of [[0.5, -0.5], [0.5, 0.5], [-0.45, -0.5]] as const) box(0.05, 0.55, 0.05, M.woodDark, stove.x + dx, 0.275, stove.z + dz);
  const stoveLight = new THREE.PointLight("#ff6a2a", 4, 6, 1.8);
  stoveLight.position.set(stove.x + 0.1, 0.95, stove.z - 0.1);
  root.add(stoveLight);
  // water bucket and ladle
  {
    const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.2, 16, 1, true), std("#b98d5c", 0.8, undefined, { side: THREE.DoubleSide }));
    bucket.position.set(-11.95, 0.1, 0.95);
    root.add(bucket);
    const w = new THREE.Mesh(new THREE.CircleGeometry(0.135, 16), std("#9fc6cf", 0.1));
    w.rotation.x = -Math.PI / 2;
    w.position.set(-11.95, 0.16, 0.95);
    root.add(w);
    const ladle = box(0.03, 0.03, 0.4, M.woodDark, -11.9, 0.24, 0.95);
    ladle.rotation.x = -0.5;
  }
  // sand timer on the wall
  {
    const g = new THREE.Group();
    g.position.set(-8.33, 1.2, -1.6);
    root.add(g);
    box(0.04, 0.34, 0.16, M.woodDark, 0, 0, 0, 0, g);
    for (const s of [1, -1]) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.11, 12), std("#e9d6a8", 0.3, undefined, { transparent: true, opacity: 0.8 }));
      cone.position.set(-0.05, s * 0.055, 0);
      cone.rotation.z = s > 0 ? Math.PI : 0;
      g.add(cone);
    }
  }
  const saunaLamp = new THREE.PointLight("#ffab5c", 4.5, 8, 1.7);
  saunaLamp.position.set(-10.2, 2.1, 0.4);
  root.add(saunaLamp);
  lampLights.push({ light: saunaLamp, base: 4.5, flicker: 0 });
  box(0.3, 0.06, 0.3, M.paper, -10.2, WALL_H - 0.04, 0.4);

  // ------------------------------------------------------------ porch and gate

  for (const x of [-2.5, 0.5]) box(0.12, 2.2, 0.12, M.woodDark, x, 1.1, 6.3);
  const porchRoof = box(3.6, 0.1, 3.2, M.roof, -1, 2.3, 5.0, 0.8);
  porchRoof.rotation.x = 0.12;
  lamp(-1, 1.95, 5.2, 4, "#ffc27a", 0.17, 7);
  // gate posts where the path leaves for the outside world
  for (const x of [-2.1, 0.1]) box(0.16, 2.0, 0.16, M.woodDark, x, 1.0, 7.4);
  box(2.9, 0.14, 0.2, M.woodDark, -1, 2.0, 7.4);
  box(3.3, 0.1, 0.5, M.roof, -1, 2.14, 7.4, 0.8);
  // shoes left on the step
  for (let i = 0; i < 5; i++) {
    const shoe = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.09, 3, 8), std(["#d9a3a0", "#8fb0c9", "#e6d5a8", "#a9c9a4", "#c9b6d9"][i], 0.8));
    shoe.rotation.x = Math.PI / 2;
    shoe.position.set(0.05 + (i % 3) * 0.13, 0.05, 3.8 + Math.floor(i / 3) * 0.26);
    root.add(shoe);
  }

  // ------------------------------------------------------------ hot spring

  {
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.basin);
    bowl.scale.set(HOT.rx, HOT.depth, HOT.rz);
    bowl.position.set(HOT.cx, 0, HOT.cz);
    root.add(bowl);
  }
  const hotGeo = new THREE.CircleGeometry(1, 64);
  hotGeo.rotateX(-Math.PI / 2);
  hotGeo.scale(HOT.rx * 0.995, 1, HOT.rz * 0.995);
  const hot = makeWater(hotGeo, "#3f8f95", "#8fd0c8", 0.8);
  hot.mesh.position.set(HOT.cx, HOT.water, HOT.cz);
  hot.mesh.userData.pool = "hot";
  root.add(hot.mesh);
  for (const s of SPOTS.filter((p) => p.kind === "soak")) {
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 10), pad);
    hit.position.set(s.x, 0, s.z);
    hit.userData.spot = s.id;
    root.add(hit);
  }
  // rocks round the rim, with a gap of flat stones on the garden side to step in
  const rockGeos = [0, 1, 2].map((seed) => {
    const g = new THREE.IcosahedronGeometry(1, 1);
    const p = g.attributes.position;
    // lumps that depend on where the corner is, so faces that share a corner stay joined
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const k = 1 + 0.2 * Math.sin(x * 3.1 + seed * 2.3) * Math.sin(y * 2.7 + seed) + 0.14 * Math.sin(z * 4.3 + seed * 5.1);
      p.setXYZ(i, x * k, y * k, z * k);
    }
    g.computeVertexNormals();
    return g;
  });
  function rock(x: number, y: number, z: number, s: number, squash = 0.6, mat: THREE.Material = M.rock) {
    const r = new THREE.Mesh(rockGeos[(Math.random() * 3) | 0], mat);
    r.position.set(x, y, z);
    r.scale.set(s * (0.8 + Math.random() * 0.5), s * squash, s * (0.8 + Math.random() * 0.5));
    r.rotation.y = Math.random() * 6;
    r.castShadow = r.receiveShadow = true;
    root.add(r);
    return r;
  }
  for (let i = 0; i < 46; i++) {
    const a = (i / 46) * Math.PI * 2;
    const x = HOT.cx + Math.cos(a) * HOT.rx * 1.05;
    const z = HOT.cz + Math.sin(a) * HOT.rz * 1.07;
    const entry = z > 0.6 && x > 9.1 && x < 12.1;
    if (entry) continue;
    const north = Math.sin(a) < -0.2;
    rock(x, north ? 0.16 : 0.08, z, north ? 0.42 + Math.random() * 0.3 : 0.3 + Math.random() * 0.16, north ? 0.9 : 0.55, i % 4 ? M.rock : M.rockDark);
  }
  for (const x of [9.6, 10.6, 11.6]) {
    const step = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 9), M.stoneSmooth);
    step.position.set(x, 0.02, 1.3);
    step.scale.z = 0.62;
    step.receiveShadow = true;
    step.userData.floor = true;
    root.add(step);
  }
  // bamboo spout feeding the pool
  const spout = new THREE.Vector3(HOT.cx - 1.2, 0.55, HOT.cz - HOT.rz * 0.86);
  {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 10), M.bambooGreen);
    post.position.set(spout.x, 0.45, spout.z - 0.55);
    root.add(post);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.8, 10), M.bambooGreen);
    pipe.rotation.x = Math.PI / 2 - 0.25;
    pipe.position.set(spout.x, 0.66, spout.z - 0.2);
    root.add(pipe);
  }
  // yuzu bobbing in the water
  const floaters: { m: THREE.Object3D; x: number; z: number; ph: number; y: number; r: number; still?: boolean }[] = [];
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 10), M.yuzu);
    m.scale.y = 0.88;
    const a = Math.random() * 6.28;
    const r = Math.random() * 0.45;
    const f = { m, x: HOT.cx + Math.cos(a) * HOT.rx * r, z: HOT.cz + Math.sin(a) * HOT.rz * r, ph: Math.random() * 10, y: HOT.water + 0.01, r: 0.25 };
    root.add(m);
    floaters.push(f);
  }

  // ------------------------------------------------------------ cold plunge

  {
    const w = COLD.x1 - COLD.x0;
    const d = COLD.z1 - COLD.z0;
    const cx = (COLD.x0 + COLD.x1) / 2;
    const cz = (COLD.z0 + COLD.z1) / 2;
    box(w + 0.3, 0.1, d + 0.3, M.coldStone, cx, -COLD.depth - 0.05, cz);
    box(w + 0.3, COLD.depth, 0.15, M.coldStone, cx, -COLD.depth / 2, COLD.z0 - 0.075);
    box(w + 0.3, COLD.depth, 0.15, M.coldStone, cx, -COLD.depth / 2, COLD.z1 + 0.075);
    box(0.15, COLD.depth, d, M.coldStone, COLD.x0 - 0.075, -COLD.depth / 2, cz);
    box(0.15, COLD.depth, d, M.coldStone, COLD.x1 + 0.075, -COLD.depth / 2, cz);
    // a low stone curb on three sides, open toward the deck
    box(w + 0.6, 0.03, 0.25, M.stoneSmooth, cx, 0.015, COLD.z1 + 0.2); // the valley side is an open edge
    box(0.25, 0.12, d + 0.2, M.stoneSmooth, COLD.x0 - 0.2, 0.06, cz);
    box(0.25, 0.12, d + 0.2, M.stoneSmooth, COLD.x1 + 0.2, 0.06, cz);
    box(w, 0.04, 0.3, M.stoneSmooth, cx, 0.02, COLD.z0 - 0.2).userData.floor = true;
  }
  const coldGeo = new THREE.PlaneGeometry(COLD.x1 - COLD.x0, COLD.z1 - COLD.z0);
  coldGeo.rotateX(-Math.PI / 2);
  const cold = makeWater(coldGeo, "#1f5f8a", "#6fb6d6", 0.72);
  cold.mesh.position.set((COLD.x0 + COLD.x1) / 2, COLD.water, (COLD.z0 + COLD.z1) / 2);
  cold.mesh.userData.pool = "cold";
  root.add(cold.mesh);
  for (const s of SPOTS.filter((p) => p.kind === "plunge")) {
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 1.5), pad);
    hit.position.set(s.x, 0, s.z);
    hit.userData.spot = s.id;
    root.add(hit);
  }
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.13), M.ice);
    m.rotation.set(Math.random(), Math.random(), Math.random());
    root.add(m);
    floaters.push({ m, x: COLD.x0 + 0.3 + Math.random() * (COLD.x1 - COLD.x0 - 0.6), z: COLD.z0 + 0.3 + Math.random() * (COLD.z1 - COLD.z0 - 0.6), ph: Math.random() * 10, y: COLD.water - 0.02, r: 0.12 });
  }
  {
    // the duck
    const duck = new THREE.Group();
    const yellow = std("#f6cf3a", 0.5);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), yellow);
    body.scale.set(1, 0.75, 1.25);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.065, 14, 10), yellow);
    head.position.set(0, 0.1, 0.08);
    const bill = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), std("#ee8a2c", 0.5));
    bill.scale.set(1.2, 0.5, 1.4);
    bill.position.set(0, 0.09, 0.15);
    duck.add(body, head, bill);
    root.add(duck);
    floaters.push({ m: duck, x: COLD.x1 - 0.6, z: COLD.z0 + 0.5, ph: 3, y: COLD.water + 0.03, r: 0.3 });
  }
  // sandals left where people stepped into the water, and stepping stones across the gravel to the spring
  {
    const sandalMat = [std("#8a5a3a", 0.9), std("#3a3a44", 0.9), std("#b98d5c", 0.9)];
    const pair = (x: number, z: number, turn: number, k: number) => {
      for (const side of [-0.07, 0.07]) {
        const sandal = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.025, 0.2), sandalMat[k % 3]);
        sandal.position.set(x + Math.cos(turn) * side, 0.045, z - Math.sin(turn) * side);
        sandal.rotation.y = turn + side;
        root.add(sandal);
      }
    };
    pair(9.3, 1.75, 0.2, 0);
    pair(10.2, 1.85, -0.3, 1);
    pair(12.2, 1.7, 0.5, 2);
    pair(-9.0, 4.35, 0.1, 1);
    pair(-12.3, 4.4, -0.4, 0);
    for (const [x, z] of [[5.6, 2.5], [6.5, 2.75], [7.4, 2.45], [8.3, 2.3], [9.2, 2.1]]) {
      const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 9), M.stoneSmooth);
      stone.position.set(x, 0.035, z);
      stone.scale.z = 0.75;
      stone.rotation.y = x;
      stone.receiveShadow = true;
      stone.userData.floor = true;
      root.add(stone);
    }
  }
  // wooden buckets on the deck
  for (const x of [-12.6, -8.5]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.22, 16, 1, true), std("#b98d5c", 0.8, undefined, { side: THREE.DoubleSide }));
    b.position.set(x, 0.12, 3.6);
    b.castShadow = true;
    root.add(b);
  }

  // ------------------------------------------------------------ garden

  // fences: bamboo on three sides, a low stone wall on the valley side
  const fence = (along: "x" | "z", fixed: number, a: number, b: number) => {
    if (along === "x") box(b - a, 1.8, 0.08, M.bamboo, (a + b) / 2, 0.9, fixed, 1.6);
    else box(0.08, 1.8, b - a, M.bamboo, fixed, 0.9, (a + b) / 2, 1.6);
  };
  fence("x", -5.4, -14.4, 16.2);
  fence("z", 16.2, -5.4, 7.4);
  fence("z", -14.4, -5.4, 7.4);
  // (no wall in front of the cold plunge: from the water you look straight out over the lake)
  for (const [a, b] of [[-8.2, -2.2], [0.2, 16.2]]) box(b - a, 0.45, 0.4, M.stoneSmooth, (a + b) / 2, 0.225, 7.4, 1);

  // ------------------------------------------------------------ the lake

  const lakeGeo = new THREE.PlaneGeometry(700, 320);
  lakeGeo.rotateX(-Math.PI / 2);
  const lake = makeWater(lakeGeo, "#232a52", "#5a6aa0", 0.96);
  lake.mesh.position.set(0, -0.45, SHORE + 159);
  root.add(lake.mesh);
  box(700, 1, 0.4, M.rockDark, 0, -0.5, SHORE + 0.2); // the bank
  for (let i = 0; i < 60; i++) rock(-28 + i * 0.95 + Math.random() * 0.4, -0.25 + Math.random() * 0.15, SHORE + 0.2 + Math.random() * 0.5, 0.3 + Math.random() * 0.35, 0.7, i % 3 ? M.rock : M.rockDark);
  // a little dock where the path meets the water, and the boat people came in
  floor(-1.9, -0.1, 7.5, 11.2, M.deck, 1.1, 0.02);
  floor(-1.8, -0.2, 6.5, 7.5, M.paving, 1.4);
  for (const [x, z] of [[-1.9, 9], [-0.1, 9], [-1.9, 11.1], [-0.1, 11.1]]) box(0.12, 1.3, 0.12, M.woodDark, x, -0.2, z);
  {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), std("#6b4a34", 0.8, undefined, { side: THREE.DoubleSide }));
    hull.scale.set(0.55, 0.42, 1.5);
    boat.add(hull);
    for (const z of [-0.5, 0.4]) box(0.95, 0.04, 0.22, M.woodLight, 0, -0.08, z, 0, boat);
    boat.position.set(0.95, -0.38, 10.2);
    boat.rotation.y = 0.15;
    root.add(boat);
    floaters.push({ m: boat, x: 0.95, z: 10.2, ph: 1.3, y: -0.38, r: 0.05, still: true });
  }
  lamp(-1, 1.45, 11.0, 4, "#ffc27a", 0.15, 9);
  box(0.06, 1.5, 0.06, M.woodDark, -1.75, 0.75, 11.0);
  box(0.8, 0.05, 0.05, M.woodDark, -1.38, 1.62, 11.0);

  function stoneLantern(x: number, z: number, intensity: number) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    root.add(g);
    box(0.34, 0.1, 0.34, M.stoneSmooth, 0, 0.05, 0, 0, g);
    box(0.14, 0.5, 0.14, M.stoneSmooth, 0, 0.35, 0, 0, g);
    box(0.36, 0.06, 0.36, M.stoneSmooth, 0, 0.63, 0, 0, g);
    box(0.24, 0.22, 0.24, M.paper, 0, 0.77, 0, 0, g).castShadow = false;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.2, 4), M.stoneSmooth);
    cap.position.y = 0.98;
    cap.rotation.y = Math.PI / 4;
    g.add(cap);
    const light = new THREE.PointLight("#ffbf70", intensity, 8, 1.7);
    light.position.set(x, 0.85, z);
    root.add(light);
    lampLights.push({ light, base: intensity, flicker: 0.12 });
    glow(x, 0.8, z, 1.5);
  }
  stoneLantern(5.7, 0.7, 5);
  stoneLantern(15.3, 0.9, 5);
  stoneLantern(-5.4, 6.3, 4);
  stoneLantern(-13.5, 4.0, 3.5);

  function maple(x: number, z: number, s: number) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * s, 0.16 * s, 2.2 * s, 8), M.bark);
    trunk.position.set(x, 1.1 * s, z);
    trunk.rotation.z = 0.12;
    trunk.castShadow = true;
    root.add(trunk);
    for (let i = 0; i < 9; i++) {
      const leaf = new THREE.Mesh(rockGeos[i % 3], i % 3 ? M.leafRed : M.leafOrange);
      const a = Math.random() * 6.28;
      const r = Math.random() * 1.3 * s;
      leaf.position.set(x + Math.cos(a) * r - 0.15, (2.1 + Math.random() * 1.1) * s, z + Math.sin(a) * r);
      leaf.scale.set(0.9 * s, 0.5 * s, 0.9 * s);
      leaf.rotation.y = Math.random() * 6;
      leaf.castShadow = true;
      root.add(leaf);
    }
  }
  maple(15.0, -3.9, 1.1);
  maple(5.5, -3.6, 0.95);
  maple(-4.2, 6.6, 0.8);

  function pine(x: number, z: number, s: number) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * s, 0.18 * s, 3 * s, 8), M.bark);
    trunk.position.set(x, 1.5 * s, z);
    trunk.castShadow = true;
    root.add(trunk);
    for (let i = 0; i < 4; i++) {
      const tier = new THREE.Mesh(new THREE.ConeGeometry((1.5 - i * 0.3) * s, 1.3 * s, 8), M.pine);
      tier.position.set(x, (1.9 + i * 0.75) * s, z);
      tier.castShadow = true;
      root.add(tier);
    }
  }
  pine(-13.5, -3.9, 1.1);
  pine(-7.2, -3.6, 0.9);
  pine(13.5, 7.0, 0.7);

  // bamboo grove behind the back fence
  {
    const stalk = new THREE.CylinderGeometry(0.045, 0.06, 1, 6);
    stalk.translate(0, 0.5, 0);
    const stalks = new THREE.InstancedMesh(stalk, M.bambooGreen, 70);
    const leafGeo = new THREE.IcosahedronGeometry(1, 0);
    const leaves = new THREE.InstancedMesh(leafGeo, std("#7aa35a", 0.9, undefined, { flatShading: true }), 70);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    for (let i = 0; i < 70; i++) {
      const x = -14 + Math.random() * 30;
      const z = -6.2 - Math.random() * 3.5;
      const h = 4.5 + Math.random() * 3;
      e.set((Math.random() - 0.5) * 0.12, 0, (Math.random() - 0.5) * 0.12);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(1, h, 1));
      stalks.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(x + (Math.random() - 0.5) * 0.5, h * (0.72 + Math.random() * 0.22), z + (Math.random() - 0.5) * 0.5), q, new THREE.Vector3(0.55, 0.9 + Math.random() * 0.5, 0.55));
      leaves.setMatrixAt(i, m);
    }
    root.add(stalks, leaves);
  }
  // a stone water basin by the garden door, with a bamboo ladle resting across it
  {
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.36, 14), M.rock);
    basin.position.set(4.45, 0.18, 3.55);
    basin.castShadow = true;
    root.add(basin);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(0.19, 20), std("#7fb0b8", 0.1));
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(4.45, 0.365, 3.55);
    root.add(pool);
    const handle = box(0.02, 0.02, 0.5, M.bambooGreen, 4.45, 0.39, 3.5);
    handle.rotation.y = 0.5;
  }
  // a few loose rocks and shrubs to soften the edges
  for (const [x, z, s] of [[4.9, -0.6, 0.35], [15.6, 3.2, 0.4], [-13.6, 6.9, 0.45], [2.6, 6.8, 0.3], [6.4, 6.8, 0.38], [-6.6, 2.9, 0.3]]) rock(x, 0.08, z, s);
  for (const [x, z] of [[4.6, -2.6], [15.7, 5.6], [-12.9, -4.6], [9.5, 6.9], [-6.8, 6.7]]) {
    const b = new THREE.Mesh(rockGeos[0], std("#4d7446", 0.95, undefined, { flatShading: true }));
    b.position.set(x, 0.28, z);
    b.scale.set(0.6, 0.42, 0.6);
    b.castShadow = true;
    root.add(b);
  }

  // ------------------------------------------------------------ far away

  const mountainMat = [std("#3d3a5c", 1), std("#514a70", 1), std("#6a5d82", 1)];
  const mountains: THREE.Mesh[] = [];
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2 + Math.random() * 0.2;
    const ring = i % 3;
    const r = 130 + ring * 55 + Math.random() * 30;
    const h = 35 + Math.random() * 55 + ring * 22;
    const m = new THREE.Mesh(new THREE.ConeGeometry(55 + Math.random() * 50 + ring * 20, h, 7, 1), mountainMat[ring]);
    m.position.set(Math.cos(a) * r, h / 2 - 4, Math.sin(a) * r);
    m.rotation.y = Math.random() * 6;
    m.updateMatrixWorld(true);
    mountains.push(m);
    root.add(m);
  }
  const sky = makeSky();
  root.add(sky.mesh);
  // two layers of stars that brighten and dim out of step, so the sky shimmers
  const stars = makeStars(520);
  const stars2 = makeStars(420);
  root.add(stars, stars2);
  const moonDir = new THREE.Vector3(0.55, 0.42, -0.72).normalize();
  const moon = new THREE.Mesh(new THREE.CircleGeometry(11, 40), new THREE.MeshBasicMaterial({ color: "#fff4d8", fog: false, transparent: true }));
  moon.position.copy(moonDir).multiplyScalar(395);
  moon.lookAt(0, 0, 0);
  moon.renderOrder = -8;
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: "#ffe9c0", transparent: true, opacity: 0.35, depthWrite: false, fog: false }));
  halo.position.copy(moonDir).multiplyScalar(390);
  halo.scale.setScalar(90);
  halo.renderOrder = -8;
  root.add(moon, halo);
  const flies = new Fireflies(46, { x0: 4.5, x1: 16, z0: -5, z1: 7 });
  root.add(flies.points);

  // long soft clouds low in the sky; they take the colour of the horizon and drift very slowly
  const clouds = new THREE.Group();
  const cloudMat = new THREE.SpriteMaterial({ map: softDot(), transparent: true, opacity: 0.4, depthWrite: false, fog: false });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + Math.random() * 0.5;
    const up = 0.5 + Math.random() * 0.35; // high enough to clear the mountain tops
    const r = 350;
    for (let k = 0; k < 3; k++) {
      const puff = new THREE.Sprite(cloudMat);
      puff.position.set(Math.cos(a + k * 0.09) * r, (up + (k === 1 ? 0.025 : 0)) * r, Math.sin(a + k * 0.09) * r);
      puff.scale.set(110 + Math.random() * 60, 20 + Math.random() * 14, 1);
      puff.renderOrder = -7;
      clouds.add(puff);
    }
  }
  root.add(clouds);

  // a few lit windows on the far shore of the lake, so the dark has somebody in it
  const shore = new THREE.BufferGeometry();
  const shorePts: number[] = [];
  // each one sits on the first slope you'd hit looking south across the water, a little way up the hillside
  {
    const probe = new THREE.Raycaster();
    const south = new THREE.Vector3(0, 0, 1);
    for (let i = 0; i < 40 && shorePts.length < 22 * 3; i++) {
      const from = new THREE.Vector3(-110 + Math.random() * 220, 0.8 + Math.random() ** 2 * 11, 12);
      probe.set(from, south);
      const hit = probe.intersectObjects(mountains, false)[0];
      if (hit) shorePts.push(hit.point.x, hit.point.y, hit.point.z - 0.6);
    }
  }
  shore.setAttribute("position", new THREE.Float32BufferAttribute(shorePts, 3));
  const shoreMat = new THREE.PointsMaterial({ map: softDot(), color: "#ffcf8a", size: 1.6, transparent: true, opacity: 0.8, depthWrite: false, fog: false });
  const shoreLights = new THREE.Points(shore, shoreMat);
  root.add(shoreLights);

  // wind chime on the porch: a small bell with a paper tail that catches the air
  const chime = new THREE.Group();
  chime.position.set(0.2, 2.12, 6.2);
  root.add(chime);
  {
    box(0.01, 0.16, 0.01, M.woodDark, 0, -0.08, 0, 0, chime);
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), std("#9fc9d6", 0.15, undefined, { transparent: true, opacity: 0.75, side: THREE.DoubleSide }));
    bell.position.y = -0.2;
    chime.add(bell);
    const tail = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.2), std("#f6efe0", 0.9, undefined, { side: THREE.DoubleSide }));
    tail.position.y = -0.38;
    chime.add(tail);
  }
  let chimeIn = 6 + Math.random() * 10;
  let chimeSwing = 0;
  let brush = 0;

  // maple leaves letting go, a few at a time
  const LEAVES = 26;
  const leafMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.1, 0.075), std("#d8562c", 0.8, undefined, { side: THREE.DoubleSide }), LEAVES);
  leafMesh.frustumCulled = false;
  root.add(leafMesh);
  const leafTrees: [number, number][] = [[15.0, -3.9], [5.5, -3.6], [-4.2, 6.6]];
  const leaves = Array.from({ length: LEAVES }, (_, i) => {
    const [tx, tz] = leafTrees[i % 3];
    return { x: tx + (Math.random() - 0.5) * 2.6, z: tz + (Math.random() - 0.5) * 2.6, y: Math.random() * 3, ph: Math.random() * 10, tx, tz };
  });
  const leafM = new THREE.Matrix4();
  const leafQ = new THREE.Quaternion();
  const leafE = new THREE.Euler();
  const leafP = new THREE.Vector3();
  const leafS = new THREE.Vector3(1, 1, 1);

  // ------------------------------------------------------------ light

  const hemi = new THREE.HemisphereLight("#9c8fd0", "#5a4a3c", 0.75);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight("#ffb27a", 1.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -22;
  sun.shadow.camera.right = 22;
  sun.shadow.camera.top = 16;
  sun.shadow.camera.bottom = -16;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 90;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  sun.target.position.set(0, 0, 0);
  const fog = new THREE.FogExp2("#6b5a7a", 0.0075);
  scene.fog = fog;

  // ------------------------------------------------------------ time of day

  const goal = { ...LOOKS.dusk };
  const cur = {
    top: new THREE.Color(goal.top), horizon: new THREE.Color(goal.horizon), glow: new THREE.Color(goal.glow), fog: new THREE.Color(goal.fog),
    hemiSky: new THREE.Color(goal.hemiSky), hemiGround: new THREE.Color(goal.hemiGround), sun: new THREE.Color(goal.sun), waterSky: new THREE.Color(goal.waterSky),
    fogDensity: goal.fogDensity, hemi: goal.hemi, sunI: goal.sunI, stars: goal.stars, lamps: goal.lamps, flies: goal.flies,
    sunPos: new THREE.Vector3(...goal.sunPos),
  };
  const tmpC = new THREE.Color();
  const tmpV = new THREE.Vector3();
  function applyLook(k: number) {
    const mixC = (c: THREE.Color, to: string) => c.lerp(tmpC.set(to), k);
    mixC(cur.top, goal.top);
    mixC(cur.horizon, goal.horizon);
    mixC(cur.glow, goal.glow);
    mixC(cur.fog, goal.fog);
    mixC(cur.hemiSky, goal.hemiSky);
    mixC(cur.hemiGround, goal.hemiGround);
    mixC(cur.sun, goal.sun);
    mixC(cur.waterSky, goal.waterSky);
    cur.fogDensity += (goal.fogDensity - cur.fogDensity) * k;
    cur.hemi += (goal.hemi - cur.hemi) * k;
    cur.sunI += (goal.sunI - cur.sunI) * k;
    cur.stars += (goal.stars - cur.stars) * k;
    cur.lamps += (goal.lamps - cur.lamps) * k;
    cur.flies += (goal.flies - cur.flies) * k;
    cur.sunPos.lerp(tmpV.set(...goal.sunPos), k);

    (sky.uniforms.uTop.value as THREE.Color).copy(cur.top);
    (sky.uniforms.uHorizon.value as THREE.Color).copy(cur.horizon);
    (sky.uniforms.uGlow.value as THREE.Color).copy(cur.glow);
    (sky.uniforms.uSun.value as THREE.Vector3).copy(cur.sunPos).normalize();
    fog.color.copy(cur.fog);
    fog.density = cur.fogDensity;
    hemi.color.copy(cur.hemiSky);
    hemi.groundColor.copy(cur.hemiGround);
    hemi.intensity = cur.hemi;
    sun.color.copy(cur.sun);
    sun.intensity = cur.sunI;
    sun.position.copy(cur.sunPos);
    stars.visible = stars2.visible = cur.stars > 0.02;
    glowMat.opacity = 0.06 + Math.max(0, cur.lamps - 0.2) * 0.3;
    spillMat.opacity = Math.max(0, cur.lamps - 0.3) * 0.75;
    moon.material.opacity = 0.08 + cur.stars * 0.92;
    halo.material.opacity = 0.12 + cur.stars * 0.3;
    flies.setOpacity(cur.flies);
    cloudMat.color.copy(cur.horizon).lerp(cur.top, 0.35).lerp(tmpC.set("#ffffff"), 0.2 + (1 - cur.stars) * 0.25);
    cloudMat.opacity = 0.22 + (1 - cur.stars) * 0.26;
    shoreMat.opacity = Math.max(0, cur.lamps - 0.3) * 0.85;
    shoreLights.visible = shoreMat.opacity > 0.03;
    M.paper.emissiveIntensity = 0.25 + cur.lamps * 0.9;
    screen.emissiveIntensity = 0.15 + cur.lamps * 0.45;
    for (const w of [hot, cold, lake]) {
      (w.uniforms.uSky.value as THREE.Color).copy(cur.waterSky);
      (w.uniforms.uFogColor.value as THREE.Color).copy(cur.fog);
      w.uniforms.uFogDensity.value = cur.fogDensity;
      (w.uniforms.uLight.value as THREE.Vector3).copy(cur.sunPos).normalize();
      (w.uniforms.uLightColor.value as THREE.Color).copy(cur.sun).multiplyScalar(Math.min(1, cur.sunI * 0.6));
    }
  }
  applyLook(1);

  let steamClock = 0;
  let spoutClock = 0;

  const api: World = {
    root,
    onChime: null,
    calm: false,
    doorBusy: false,
    hot,
    cold,
    mirror,
    stove,
    setTime(t, instant) {
      Object.assign(goal, LOOKS[t]);
      if (instant) applyLook(1);
    },
    update(t, dt, eye) {
      applyLook(1 - Math.exp(-dt * 1.4));
      hot.uniforms.uTime.value = t;
      cold.uniforms.uTime.value = t;
      lake.uniforms.uTime.value = t * 0.5;
      drawClock();
      // lamps breathe a little; the stove flickers like embers
      (stars.material as THREE.PointsMaterial).opacity = cur.stars * (0.62 + Math.sin(t * 0.9) * 0.22);
      (stars2.material as THREE.PointsMaterial).opacity = cur.stars * (0.62 + Math.sin(t * 0.9 + Math.PI) * 0.22);
      for (const l of lampLights) l.light.intensity = l.base * (0.35 + cur.lamps * 0.65) * (1 + Math.sin(t * 7 + l.base * 9) * l.flicker * 0.5 + Math.sin(t * 13.3) * l.flicker * 0.3);
      stoveLight.intensity = 3.6 + Math.sin(t * 9) * 0.5 + Math.sin(t * 23) * 0.3;
      emberMat.emissiveIntensity = 0.8 + Math.sin(t * 3.1) * 0.25;
      // the curtain lifts when someone brushes through, then settles
      brush += ((api.doorBusy ? 1 : 0) - brush) * (1 - Math.exp(-dt * (api.doorBusy ? 9 : 2.2)));
      api.doorBusy = false;
      norenPanels.forEach((p, i) => (p.rotation.x = Math.sin(t * 1.1 + i * 0.9) * 0.07 + brush * (0.55 + (i % 2) * 0.25) * Math.sin(t * 5 + i) ** 2 + brush * 0.25));
      for (const f of floaters) {
        f.m.position.set(f.x + Math.sin(t * 0.21 + f.ph) * f.r, f.y + Math.sin(t * 1.3 + f.ph) * 0.012, f.z + Math.cos(t * 0.17 + f.ph * 1.7) * f.r);
        // small floating things sink out of sight rather than fill the lens when the camera sits at the water
        if (!f.still && eye && f.m.position.distanceToSquared(eye) < 0.75 * 0.75) f.m.position.y -= 0.6;
        if (!f.still) f.m.rotation.y = t * 0.1 + f.ph;
        else f.m.rotation.z = Math.sin(t * 0.9 + f.ph) * 0.05; // the boat rocks at its mooring
      }
      flies.update(t, eye);
      clouds.rotation.y = t * 0.0025;
      // leaves drift down, slide a little on the breeze, and start again from the branches
      leaves.forEach((l, i) => {
        l.y -= dt * (0.28 + (i % 5) * 0.03) * (api.calm ? 0.45 : 1);
        l.x += Math.sin(t * 0.9 + l.ph) * dt * 0.35 + dt * 0.08;
        l.z += Math.cos(t * 0.7 + l.ph * 1.3) * dt * 0.3;
        if (l.y < 0.02) {
          l.y = 2.4 + Math.random() * 1.2;
          l.x = l.tx + (Math.random() - 0.5) * 2.6;
          l.z = l.tz + (Math.random() - 0.5) * 2.6;
        }
        leafE.set(t * 1.3 + l.ph, t * 0.7 + l.ph * 2, Math.sin(t * 2 + l.ph) * 0.8);
        leafM.compose(leafP.set(l.x, l.y, l.z), leafQ.setFromEuler(leafE), leafS);
        leafMesh.setMatrixAt(i, leafM);
      });
      leafMesh.instanceMatrix.needsUpdate = true;
      // the chime rings now and then, and swings when it does
      chimeIn -= dt;
      if (chimeIn <= 0) {
        chimeIn = 14 + Math.random() * 30;
        chimeSwing = 1;
        api.onChime?.(chime.position.x, chime.position.z);
      }
      chimeSwing = Math.max(0.12, chimeSwing - dt * 0.25);
      chime.rotation.z = Math.sin(t * 2.6) * 0.22 * chimeSwing;
      chime.rotation.x = Math.sin(t * 1.9 + 1) * 0.15 * chimeSwing;
      // steam rising off the hot spring, a wisp from the stove, the spout trickling
      steamClock += dt;
      const every = api.calm ? 0.18 : 0.07;
      while (steamClock > every) {
        steamClock -= every;
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * 0.95;
        puffs.spawn(HOT.cx + Math.cos(a) * HOT.rx * r, HOT.water + 0.05, HOT.cz + Math.sin(a) * HOT.rz * r, 0.06 + Math.random() * 0.08, 0.16 + Math.random() * 0.14, (Math.random() - 0.5) * 0.08, 5 + Math.random() * 3, 0.5 + Math.random() * 0.4, 0.13, 0.35);
        if (Math.random() < 0.25) puffs.spawn(stove.x, 0.8, stove.z, (Math.random() - 0.5) * 0.1, 0.25, (Math.random() - 0.5) * 0.1, 3, 0.3, 0.08, 0.3);
        // smoke from the sauna chimney, leaning with a light breeze
        if (Math.random() < 0.3) puffs.spawn(chimney.x, chimney.y, chimney.z, 0.18 + Math.random() * 0.1, 0.45, 0.05, 6, 0.35, 0.16, 0.45);
      }
      spoutClock += dt;
      if (spoutClock > 0.05) {
        spoutClock = 0;
        drops.pour(spout.x, spout.y, spout.z + 0.18, 1, spout.y - HOT.water);
        if (Math.random() < 0.12) hot.ripple(spout.x, spout.z + 0.2, 0.35);
      }
    },
    dispose() {
      scene.remove(root, hemi, sun, sun.target);
      scene.fog = null;
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose?.();
      });
      mirror.dispose();
      disposables.forEach((d) => d.dispose());
    },
  };
  return api;
}
