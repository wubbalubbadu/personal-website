// A bather: a small round person built from spheres and capsules, with a
// 찜질방 uniform on dry land and a towel wrap in the water. One seed number
// decides the whole look, so other browsers can rebuild the same person.
import * as THREE from "three";
import { canvasTexture, softDot } from "./fx";

export type Pose = "stand" | "sit" | "lie" | "soak" | "float" | "plunge";
export type VerbId = "wave" | "sigh" | "pour" | "fan" | "dunk" | "bucket" | "egg" | "milk";

export const VERB_SECONDS: Record<VerbId, number> = { wave: 1.8, sigh: 2.2, pour: 2.4, fan: 3.2, dunk: 2.2, bucket: 3.0, egg: 2.6, milk: 3.2 };

/** Moments inside a verb that the game answers with sound, steam or water. */
export type Beat = "sigh" | "pour" | "fan" | "dunkIn" | "dunkOut" | "bucket" | "egg" | "gulp" | "pha";
const BEATS: Record<VerbId, [number, Beat][]> = {
  wave: [],
  sigh: [[0.12, "sigh"]],
  pour: [[0.5, "pour"]],
  fan: [[0.15, "fan"], [0.4, "fan"], [0.65, "fan"], [0.88, "fan"]],
  dunk: [[0.2, "dunkIn"], [0.7, "dunkOut"]],
  bucket: [[0.45, "bucket"]],
  egg: [[0.4, "egg"]],
  milk: [[0.3, "gulp"], [0.45, "gulp"], [0.6, "gulp"], [0.82, "pha"]],
};

// ---------------------------------------------------------------- looks

export type Look = {
  seed: number;
  skin: string;
  hair: string;
  hairStyle: number;
  outfit: string;
  hat: "none" | "sheep";
  /** Voice pitch multiplier. */
  pitch: number;
  name: { en: string; zh: string };
};

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SKINS = ["#f6d7bd", "#f0c9a4", "#e2b08a", "#c98f66", "#a8714d", "#7d5238", "#f9e0cd"];
const HAIRS = ["#2a2022", "#3b2a22", "#5a3a26", "#7a5536", "#b9884e", "#8a8a92", "#d9d4cc", "#3a2f4a"];
const OUTFITS = ["#e58f98", "#93b9e6", "#f1cf5e", "#93cba6", "#bea6de", "#84cbcb"];
const NAME_A: [string, string][] = [
  ["Sleepy", "困困的"], ["Warm", "暖暖的"], ["Soft", "软软的"], ["Toasty", "热乎乎的"], ["Quiet", "安静的"], ["Drowsy", "迷糊的"],
  ["Steamy", "冒热气的"], ["Mellow", "慢悠悠的"], ["Rosy", "红扑扑的"], ["Cozy", "舒服的"], ["Lazy", "懒洋洋的"], ["Gentle", "温柔的"],
];
const NAME_B: [string, string][] = [
  ["Dumpling", "饺子"], ["Pebble", "小石头"], ["Yuzu", "柚子"], ["Towel", "毛巾"], ["Kettle", "水壶"], ["Egg", "鸡蛋"],
  ["Slipper", "拖鞋"], ["Radish", "萝卜"], ["Mochi", "麻薯"], ["Bucket", "水桶"], ["Bun", "包子"], ["Tangerine", "橘子"],
];

export function lookFromSeed(seed: number): Look {
  const r = rng(seed);
  const pick = <T,>(a: T[]) => a[(r() * a.length) | 0];
  const a = pick(NAME_A);
  const b = pick(NAME_B);
  return {
    seed,
    skin: pick(SKINS),
    hair: pick(HAIRS),
    hairStyle: (r() * 8) | 0,
    outfit: pick(OUTFITS),
    hat: r() < 0.45 ? "sheep" : "none",
    pitch: 0.8 + r() * 0.6,
    name: { en: `${a[0]} ${b[0]}`, zh: `${a[1]}${b[1]}` },
  };
}

// ---------------------------------------------------------------- face styles
// How cartoonish the head and face are. "round" is the first, more literal
// version; the others squash the head and simplify the features.

export type FaceStyle = "dots" | "sleepy" | "goofy" | "round";

type FaceSpec = {
  /** Head stretch: wide, tall, deep. */
  head: [number, number, number];
  /** Pupil size: wide, tall. */
  eye: [number, number];
  apart: number;
  eyeY: number;
  glint: boolean;
  /** Big white eyeballs behind the pupils. */
  whites: boolean;
  cheek: number;
  smile: number;
  /** Eyes are always happy closed arcs. */
  shut: boolean;
};

const FACES: Record<FaceStyle, FaceSpec> = {
  round: { head: [1, 1, 1], eye: [1, 1.25], apart: 0.1, eyeY: -0.015, glint: true, whites: false, cheek: 1, smile: 1, shut: false },
  dots: { head: [1.22, 0.84, 1.04], eye: [0.5, 0.5], apart: 0.135, eyeY: -0.06, glint: false, whites: false, cheek: 1.4, smile: 0.55, shut: false },
  sleepy: { head: [1.12, 0.94, 1.02], eye: [1, 1], apart: 0.12, eyeY: -0.05, glint: false, whites: false, cheek: 1.25, smile: 0.5, shut: true },
  goofy: { head: [1.3, 0.8, 1.06], eye: [0.42, 0.52], apart: 0.115, eyeY: 0.0, glint: false, whites: true, cheek: 0, smile: 1.7, shut: false },
};

// ---------------------------------------------------------------- body shapes
// Three silhouettes to choose between. All are one smooth piece; none has
// separate hands or shoulders.

export type BodyStyle = "gumdrop" | "bean" | "dumpling";

type BodySpec = {
  /** Profiles spun round the spine, as [radius, height] from the floor up. */
  robe: [number, number][];
  yoke: [number, number][];
  headY: number;
  headScale: number;
  armX: number;
  armY: number;
  /** Arms tuck away completely unless they're doing something. */
  hideArms: boolean;
};

const BODIES: Record<BodyStyle, BodySpec> = {
  gumdrop: {
    robe: [[0.001, 0.03], [0.17, 0.035], [0.225, 0.09], [0.245, 0.2], [0.235, 0.36], [0.205, 0.5], [0.17, 0.585]],
    yoke: [[0.17, 0.585], [0.14, 0.66], [0.1, 0.72], [0.001, 0.75]],
    headY: 0.9, headScale: 1, armX: 0.205, armY: 0.57, hideArms: false,
  },
  // a tall smooth pill, arms out of sight until needed
  bean: {
    robe: [[0.001, 0.03], [0.14, 0.035], [0.19, 0.1], [0.205, 0.26], [0.2, 0.44], [0.175, 0.585]],
    yoke: [[0.175, 0.585], [0.15, 0.67], [0.1, 0.735], [0.001, 0.76]],
    headY: 0.92, headScale: 0.96, armX: 0.19, armY: 0.58, hideArms: true,
  },
  // short and round under a bigger head
  dumpling: {
    robe: [[0.001, 0.03], [0.2, 0.035], [0.275, 0.1], [0.295, 0.21], [0.27, 0.36], [0.21, 0.48], [0.16, 0.55]],
    yoke: [[0.16, 0.55], [0.125, 0.61], [0.08, 0.655], [0.001, 0.675]],
    headY: 0.83, headScale: 1.1, armX: 0.235, armY: 0.5, hideArms: false,
  },
};

let BODY: BodyStyle = "gumdrop";
export function setBodyStyle(b: BodyStyle) {
  BODY = b;
}
const bodyGeos = new Map<BodyStyle, { robe: THREE.LatheGeometry; yoke: THREE.LatheGeometry }>();
function bodyGeo(b: BodyStyle) {
  let g = bodyGeos.get(b);
  if (!g) {
    const spin = (pts: [number, number][]) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 28);
    g = { robe: spin(BODIES[b].robe), yoke: spin(BODIES[b].yoke) };
    bodyGeos.set(b, g);
  }
  return g;
}

let FACE: FaceStyle = "dots";
/** Applies to people built from now on; the game rebuilds everyone after calling it. */
export function setFaceStyle(f: FaceStyle) {
  FACE = f;
}

// ---------------------------------------------------------------- shared shapes

let G: ReturnType<typeof makeGeos> | null = null;
function makeGeos() {
  return {
    nub: new THREE.CapsuleGeometry(0.052, 0.17, 4, 10),
    shadow: new THREE.CircleGeometry(0.42, 20).rotateX(-Math.PI / 2),
    torso: new THREE.CapsuleGeometry(0.2, 0.2, 6, 18),
    shorts: new THREE.CylinderGeometry(0.212, 0.218, 0.17, 18),
    wrap: new THREE.CylinderGeometry(0.214, 0.222, 0.38, 18),
    arm: new THREE.CapsuleGeometry(0.055, 0.16, 4, 10),
    hand: new THREE.SphereGeometry(0.062, 12, 10),
    sleeve: new THREE.SphereGeometry(0.085, 12, 10),
    leg: new THREE.CapsuleGeometry(0.068, 0.11, 4, 10),
    foot: new THREE.SphereGeometry(0.075, 12, 8),
    skull: new THREE.SphereGeometry(0.27, 28, 20),
    ear: new THREE.SphereGeometry(0.05, 10, 8),
    eye: new THREE.SphereGeometry(0.032, 12, 10),
    glint: new THREE.SphereGeometry(0.01, 6, 6),
    lid: new THREE.TorusGeometry(0.034, 0.008, 6, 12, Math.PI),
    cheek: new THREE.CircleGeometry(0.05, 16),
    mouth: new THREE.SphereGeometry(0.016, 10, 8),
    smile: new THREE.TorusGeometry(0.026, 0.0065, 6, 12, Math.PI),
    hairCap: new THREE.SphereGeometry(0.288, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.5),
    hairBuzz: new THREE.SphereGeometry(0.276, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.46),
    bun: new THREE.SphereGeometry(0.1, 14, 10),
    band: new THREE.TorusGeometry(0.262, 0.045, 10, 28),
    roll: new THREE.SphereGeometry(0.1, 14, 10),
    fold: new THREE.BoxGeometry(0.2, 0.05, 0.14),
    cucumber: new THREE.CylinderGeometry(0.047, 0.047, 0.012, 16),
    egg: new THREE.SphereGeometry(0.042, 12, 10),
    bottle: new THREE.CylinderGeometry(0.034, 0.034, 0.13, 12),
    cap: new THREE.CylinderGeometry(0.02, 0.02, 0.03, 10),
    stick: new THREE.BoxGeometry(0.02, 0.02, 0.3),
    cup: new THREE.SphereGeometry(0.05, 10, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    bucket: new THREE.CylinderGeometry(0.15, 0.12, 0.2, 16, 1, true),
    cloth: new THREE.PlaneGeometry(0.5, 0.26, 4, 1),
  };
}

const M = {
  white: new THREE.MeshStandardMaterial({ color: "#faf6ee", roughness: 0.95 }),
  eye: new THREE.MeshStandardMaterial({ color: "#2a1e22", roughness: 0.3 }),
  glint: new THREE.MeshBasicMaterial({ color: "#ffffff" }),
  mouth: new THREE.MeshStandardMaterial({ color: "#8a3a3a", roughness: 0.6 }),
  cucumber: new THREE.MeshStandardMaterial({ color: "#a9d68a", roughness: 0.6 }),
  egg: new THREE.MeshStandardMaterial({ color: "#b98a5e", roughness: 0.7 }),
  milkCap: new THREE.MeshStandardMaterial({ color: "#5b8bd9", roughness: 0.6 }),
  wood: new THREE.MeshStandardMaterial({ color: "#b98d5c", roughness: 0.8, side: THREE.DoubleSide }),
  cloth: new THREE.MeshStandardMaterial({ color: "#faf6ee", roughness: 0.95, side: THREE.DoubleSide }),
};

const HOT_TINT = new THREE.Color("#ff8a70");
const COLD_TINT = new THREE.Color("#9db6e0");

type Rig = { roll: number; reach: number; apx: number; apz: number; anx: number; anz: number; lp: number; ln: number; bx: number; by: number; bz: number; hx: number; hz: number; eye: number; mouth: number };
const zeroRig = (): Rig => ({ roll: 0, reach: 0, apx: 0, apz: 0.18, anx: 0, anz: -0.18, lp: 0, ln: 0, bx: 0, by: 0, bz: 0, hx: 0, hz: 0, eye: 1, mouth: 0.35 });

const ease = (k: number) => k * k * (3 - 2 * k);
/** 0 outside, rising to 1 between a and b, falling back between c and d. */
const window01 = (u: number, a: number, b: number, c: number, d: number) => (u < a || u > d ? 0 : u < b ? ease((u - a) / (b - a)) : u < c ? 1 : 1 - ease((u - c) / (d - c)));

// ---------------------------------------------------------------- the person

export class Avatar {
  readonly group = new THREE.Group();
  readonly look: Look;
  pose: Pose = "stand";
  moving = false;
  /** -1 freezing, 0 normal, 1 roasting. Tints the skin. */
  heat = 0;
  cucumbers = false;
  napping = false;
  verb: { id: VerbId; t: number; fired: number } | null = null;
  /** Beats reached this frame; the game drains this. */
  beats: Beat[] = [];
  /** True for your own body: arms reach forward during verbs so you can see your hands. */
  firstPerson = false;
  /** Reduced motion: no bob in your own view while walking. */
  calm = false;
  private eyeLift = 0;
  private shape: BodySpec = BODIES.gumdrop;
  /** Materials made just for this person, to free when they leave. */
  private own: THREE.Material[] = [];
  private lastPose: Pose = "stand";
  private bounce = 0;
  private shadow: THREE.Mesh;
  private idleIn = 3 + Math.random() * 12;
  private stretch = 0;
  private headTurn = 0;
  private glanceGoal = 0;
  private glanceLeft = 0;
  /** Head tilt the first person camera should follow (radians, + looks down). */
  kick = 0;

  private body = new THREE.Group();
  private head = new THREE.Group();
  private armP = new THREE.Group(); // +x side (the person's left)
  private armN = new THREE.Group(); // -x side (the person's right)
  private legP = new THREE.Group();
  private legN = new THREE.Group();
  private skin: THREE.MeshStandardMaterial;
  private skinBase: THREE.Color;
  private robe: THREE.Mesh;
  private yoke: THREE.Mesh;
  private nubs: THREE.Mesh[] = [];
  private outfitMat: THREE.MeshStandardMaterial;
  private dry: THREE.Object3D[] = [];
  private wet: THREE.Object3D[] = [];
  private eyes: THREE.Mesh[] = [];
  private lids: THREE.Mesh[] = [];
  private cheeks: THREE.MeshBasicMaterial;
  private mouth: THREE.Mesh;
  private face: FaceSpec = FACES.dots;
  private whites: THREE.Mesh[] = [];
  private smile: THREE.Mesh;
  private cukes: THREE.Mesh[] = [];
  private props: Record<"egg" | "milk" | "ladle" | "bucket" | "cloth", THREE.Object3D>;
  private label: THREE.Sprite | null = null;
  private rig = zeroRig();
  private phase = Math.random() * 10;
  private blink = 1 + Math.random() * 4;
  private isWet = false;
  private shiver = 0;

  constructor(look: Look, lang: "en" | "zh" = "en") {
    this.look = look;
    G ??= makeGeos();
    const g = G;
    this.skinBase = new THREE.Color(look.skin);
    this.skin = new THREE.MeshStandardMaterial({ color: look.skin, roughness: 0.75 });
    this.outfitMat = new THREE.MeshStandardMaterial({ color: look.outfit, roughness: 0.9 });
    const hairMat = new THREE.MeshStandardMaterial({ color: look.hair, roughness: 0.85 });
    this.own.push(hairMat);
    const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0, shadow = false) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = shadow;
      parent.add(m);
      return m;
    };

    this.group.add(this.body);
    // one smooth gumdrop for the body: robe (or towel) below, a small yoke on top
    const shape = BODIES[BODY];
    this.shape = shape;
    const lathe = bodyGeo(BODY);
    this.robe = mesh(lathe.robe, this.outfitMat, this.body, 0, 0, 0, true);
    this.yoke = mesh(lathe.yoke, this.outfitMat, this.body, 0, 0, 0);

    // arms are plain nubs, no hands or shoulders
    for (const [arm, side] of [[this.armP, 1], [this.armN, -1]] as const) {
      arm.position.set(side * shape.armX, shape.armY, 0);
      this.body.add(arm);
      this.nubs.push(mesh(g.nub, this.outfitMat, arm, 0, -0.135, 0));
    }
    // and feet are two small pebbles peeking out underneath
    for (const [leg, side] of [[this.legP, 1], [this.legN, -1]] as const) {
      leg.position.set(side * 0.09, 0.24, 0);
      this.body.add(leg);
      const foot = mesh(g.foot, this.skin, leg, 0, -0.2, 0.03);
      foot.scale.set(1, 0.6, 1.3);
    }

    // head: big, with a small face low on it
    this.head.position.set(0, shape.headY, 0);
    this.body.add(this.head);
    const face = FACES[FACE];
    this.face = face;
    const skull = mesh(g.skull, this.skin, this.head, 0, 0, 0, true);
    skull.scale.set(1.05, 0.96, 1);
    // the whole head (hair, hats and all) takes the style's squash
    this.head.scale.set(face.head[0] * shape.headScale, face.head[1] * shape.headScale, face.head[2] * shape.headScale);
    for (const s of [1, -1]) {
      // goofy eyes: one a bit bigger than the other, pupils drifting inward
      const big = face.whites ? (s === 1 ? 1.18 : 0.88) : 1;
      if (face.whites) {
        const white = mesh(g.eye, M.glint, this.head, s * face.apart, face.eyeY, 0.236);
        white.scale.set(1.9 * big, 1.9 * big, 0.6);
        this.whites.push(white);
      }
      const eye = mesh(g.eye, M.eye, this.head, s * (face.apart - (face.whites ? 0.014 : 0)), face.eyeY, face.whites ? 0.262 : 0.243);
      eye.scale.set(face.eye[0] * big, face.eye[1] * big, 0.5);
      eye.userData.tall = face.eye[1] * big;
      if (face.glint) mesh(g.glint, M.glint, eye, 0.008, 0.012, 0.03);
      this.eyes.push(eye);
      const lid = mesh(g.lid, M.eye, this.head, s * face.apart, face.eyeY - 0.005, 0.252);
      lid.rotation.z = Math.PI; // a little smile shaped arc
      lid.visible = false;
      this.lids.push(lid);
      const cuke = mesh(g.cucumber, M.cucumber, this.head, s * face.apart, face.eyeY, 0.262);
      cuke.rotation.x = Math.PI / 2;
      cuke.rotation.z = s * 0.25;
      cuke.visible = false;
      this.cukes.push(cuke);
    }
    this.cheeks = new THREE.MeshBasicMaterial({ color: "#ff8f8f", transparent: true, opacity: 0.35, depthWrite: false });
    for (const s of [1, -1]) {
      const c = mesh(g.cheek, this.cheeks, this.head, s * 0.165, -0.085, 0.216);
      c.rotation.y = s * 0.6;
      c.scale.setScalar(face.cheek);
      c.visible = face.cheek > 0;
    }
    this.mouth = mesh(g.mouth, M.mouth, this.head, 0, -0.1, 0.256);
    // at rest the mouth is a small smile; it opens into the round one for sighs, gasps and snores
    this.smile = mesh(g.smile, M.mouth, this.head, 0, -0.088, 0.258);
    this.smile.rotation.z = Math.PI;
    this.smile.scale.x = face.smile;

    // hair
    const st = look.hairStyle;
    if (st !== 5) {
      const cap = mesh(st === 4 ? g.hairBuzz : g.hairCap, hairMat, this.head, 0, 0.005, -0.012);
      cap.rotation.x = -0.5;
      cap.scale.set(1.05, 0.98, 1);
      if (st === 1) {
        const back = mesh(g.hairCap, hairMat, this.head, 0, -0.02, -0.03);
        back.rotation.x = -1.15;
        back.scale.set(1.06, 1, 1.02);
      }
      if (st === 2 && look.hat === "none") mesh(g.bun, hairMat, this.head, 0, 0.3, -0.04);
      if (st === 3 && look.hat === "none") for (const s of [1, -1]) mesh(g.bun, hairMat, this.head, s * 0.2, 0.23, -0.05);
      if (st === 6) {
        // a ponytail down the back
        const tail = mesh(g.bun, hairMat, this.head, 0, -0.02, -0.3);
        tail.scale.set(0.7, 1.9, 0.7);
        mesh(g.bun, hairMat, this.head, 0, 0.14, -0.27).scale.setScalar(0.6);
      }
      if (st === 7) {
        // curls: a ring of small puffs round the hairline
        for (let i = 0; i < 9; i++) {
          const a = (i / 8) * Math.PI * 1.5 - Math.PI * 1.25;
          mesh(g.bun, hairMat, this.head, Math.cos(a) * 0.26, 0.12 + (i % 2) * 0.03, Math.sin(a) * 0.26 - 0.02).scale.set(0.7, 0.55, 0.7);
        }
        mesh(g.bun, hairMat, this.head, 0, 0.26, -0.02).scale.set(2.1, 0.5, 2.1);
      }
    }
    // the sheep head towel (양머리): a band and a roll over each ear
    if (look.hat === "sheep") {
      const band = mesh(g.band, M.white, this.head, 0, 0.11, 0);
      band.rotation.x = Math.PI / 2 - 0.12;
      band.scale.set(1.04, 1, 1);
      for (const s of [1, -1]) this.dry.push(mesh(g.roll, M.white, this.head, s * 0.285, 0.13, 0));
      this.dry.push(band);
    }
    // in the water everyone balances a folded towel on their head
    const fold = mesh(g.fold, M.white, this.head, 0, 0.275, 0);
    this.wet.push(fold);

    // things held during verbs
    const egg = mesh(g.egg, M.egg, this.armN, 0, -0.31, 0.02);
    egg.scale.y = 1.25;
    const milk = new THREE.Group();
    milk.position.set(0, -0.32, 0.02);
    mesh(g.bottle, M.white, milk);
    mesh(g.cap, M.milkCap, milk, 0, 0.075, 0);
    milk.rotation.x = Math.PI; // the neck points away from the hand
    this.armN.add(milk);
    const ladle = new THREE.Group();
    ladle.position.set(0, -0.29, 0.12);
    mesh(g.stick, M.wood, ladle);
    mesh(g.cup, M.wood, ladle, 0, 0, 0.17);
    this.armN.add(ladle);
    const bucket = new THREE.Group();
    bucket.position.set(0, 1.34, 0.06);
    mesh(g.bucket, M.wood, bucket);
    this.body.add(bucket);
    const cloth = mesh(g.cloth, M.cloth, this.body, 0, 1.38, 0.05);
    this.props = { egg, milk, ladle, bucket, cloth };
    for (const p of Object.values(this.props)) p.visible = false;

    // a soft dark patch on the floor so people don't look like they hover (indoor lamps cast no shadows)
    this.shadow = new THREE.Mesh(
      G.shadow,
      new THREE.MeshBasicMaterial({ map: softDot(), color: "#1a1210", transparent: true, opacity: 0.38, depthWrite: false }),
    );
    this.shadow.position.y = 0.025;
    this.shadow.renderOrder = 1;
    this.group.add(this.shadow);

    this.setWet(false);
    this.setName(lang);
  }

  setName(lang: "en" | "zh") {
    if (this.label) {
      this.group.remove(this.label);
      this.label.material.map?.dispose();
      this.label.material.dispose();
    }
    const text = this.look.name[lang];
    const tex = canvasTexture(
      384,
      80,
      (c) => {
        c.font = "600 34px 'Space Grotesk', 'PingFang SC', system-ui, sans-serif";
        const w = Math.min(360, c.measureText(text).width + 44);
        c.fillStyle = "rgba(255,250,242,0.9)";
        c.beginPath();
        c.roundRect(192 - w / 2, 14, w, 52, 26);
        c.fill();
        c.fillStyle = "#3a2a30";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText(text, 192, 42, 330);
      },
      false,
    );
    this.label = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0, fog: false, sizeAttenuation: false }));
    this.label.scale.set(0.2, 0.0417, 1); // a fixed size on screen, like a caption
    this.label.position.y = 1.36;
    this.label.renderOrder = 9;
    this.group.add(this.label);
  }

  /** Fade the name tag by how near the viewer is. */
  setLabelOpacity(o: number) {
    if (!this.label) return;
    this.label.material.opacity = o;
    this.label.visible = o > 0.02;
    this.label.position.y = this.pose === "lie" || this.pose === "float" ? 0.7 : this.pose === "stand" || this.pose === "plunge" ? 1.36 : 1.16;
  }

  /** Towel wrap in the water and the sauna, uniform everywhere else. */
  setWet(wet: boolean) {
    this.isWet = wet;
    for (const o of this.dry) o.visible = !wet;
    for (const o of this.wet) o.visible = wet;
    this.robe.material = wet ? M.white : this.outfitMat;
    this.yoke.material = wet ? this.skin : this.outfitMat;
    for (const n of this.nubs) n.material = wet ? this.skin : this.outfitMat;
  }

  /** Hide the head for your own eyes (it would block the view); the mirror turns it back on. */
  setHeadVisible(v: boolean) {
    this.head.visible = v;
  }

  /** Turn the head toward a direction (relative to the body, radians) for a few seconds. */
  glance(relative: number, seconds: number) {
    let a = relative % (Math.PI * 2);
    if (a > Math.PI) a -= Math.PI * 2;
    if (a < -Math.PI) a += Math.PI * 2;
    this.glanceGoal = Math.max(-1.15, Math.min(1.15, a));
    this.glanceLeft = this.pose === "lie" || this.pose === "float" || this.firstPerson ? 0 : seconds;
  }

  startVerb(id: VerbId) {
    this.stretch = 0;
    this.verb = { id, t: 0, fired: 0 };
  }

  /** Where the eyes are, in world space. */
  eyeWorld(out: THREE.Vector3) {
    this.group.updateMatrixWorld(true);
    // lying down, lift the eyes a little so you look over your own belly, not into it
    const flat = this.pose === "lie" || this.pose === "float";
    this.eyeLift += ((flat ? 0.2 : 0) - this.eyeLift) * 0.08;
    return this.head.localToWorld(out.set(0, 0.03, 0.16 + this.eyeLift));
  }
  headWorld(out: THREE.Vector3) {
    return this.head.getWorldPosition(out);
  }
  handWorld(out: THREE.Vector3) {
    this.group.updateMatrixWorld(true);
    return this.armN.localToWorld(out.set(0, -0.3, 0.05));
  }

  update(dt: number, t: number) {
    const g: Rig = zeroRig();
    this.phase += dt * (this.moving ? 9.5 : 1.4);
    const s = Math.sin(this.phase);

    // ---- the resting pose
    switch (this.pose) {
      case "sit":
        g.lp = g.ln = -1.3;
        g.by = 0.02; // the gumdrop sits straight on the seat, feet poking out in front
        g.apx = g.anx = -0.45;
        g.apz = 0.1;
        g.anz = -0.1;
        break;
      case "soak":
        g.lp = g.ln = -1.4;
        g.by = Math.sin(t * 0.9 + this.phase) * 0.008;
        g.apz = 1.05;
        g.anz = -1.05;
        g.apx = g.anx = -0.25;
        g.hx = -0.08;
        break;
      case "lie":
        g.bx = -Math.PI / 2;
        g.by = 0.245;
        g.bz = 0.55;
        g.apz = 0.32;
        g.anz = -0.32;
        break;
      case "float":
        g.bx = -Math.PI / 2 + Math.sin(t * 0.8) * 0.03;
        g.by = 0.13 + Math.sin(t * 1.1 + this.phase) * 0.015;
        g.bz = 0.55;
        g.apz = 1.25;
        g.anz = -1.25;
        g.lp = 0.12;
        g.ln = -0.12;
        break;
      case "plunge":
        g.apx = g.anx = -0.95;
        g.apz = -0.75;
        g.anz = 0.75;
        break;
      default:
        break;
    }
    if (this.moving && (this.pose === "stand" || this.pose === "plunge")) {
      g.lp = s * 0.75;
      g.ln = -s * 0.75;
      g.apx = -s * 0.5;
      g.anx = s * 0.5;
      // a waddle: rock from foot to foot with a little hop on each step
      if (!this.calm) g.by += Math.abs(Math.cos(this.phase)) * 0.045;
      g.roll = s * 0.11;
      g.hz = -s * 0.06;
    } else if (this.pose === "stand") {
      g.by += Math.sin(this.phase) * 0.004; // breathing
    }

    // ---- small things people do when left alone: look around, stretch
    if (!this.firstPerson && !this.verb && !this.moving && !this.napping && !this.cucumbers) {
      this.idleIn -= dt;
      if (this.idleIn <= 0) {
        this.idleIn = 7 + Math.random() * 12;
        const upright = this.pose === "sit" || this.pose === "soak" || this.pose === "stand";
        if (upright && Math.random() < 0.6) this.glance((Math.random() - 0.5) * 1.6, 1.4 + Math.random() * 1.5);
        else if (this.pose === "sit" || this.pose === "soak") this.stretch = 2.4;
      }
    }
    if (this.stretch > 0) {
      this.stretch -= dt;
      const w = window01(1 - this.stretch / 2.4, 0, 0.3, 0.65, 1);
      g.apx = g.apx * (1 - w);
      g.anx = g.anx * (1 - w);
      g.apz = 2.3 * w + g.apz * (1 - w);
      g.anz = -2.3 * w + g.anz * (1 - w);
      g.hx = -0.2 * w;
    }

    // ---- eyes
    this.blink -= dt;
    let eye = this.blink < 0.12 ? 0.1 : 1;
    if (this.blink < 0) this.blink = 2 + Math.random() * 4;
    if (this.napping || this.cucumbers) eye = 0;
    g.mouth = this.napping ? 0.6 + Math.sin(t * 1.2) * 0.25 : 0.35;

    // ---- whatever they're doing
    this.kick = 0;
    for (const p of Object.values(this.props)) p.visible = false;
    if (this.verb) {
      const v = this.verb;
      const span = VERB_SECONDS[v.id];
      v.t += dt;
      const u = Math.min(1, v.t / span);
      const beats = BEATS[v.id];
      while (v.fired < beats.length && u >= beats[v.fired][0]) this.beats.push(beats[v.fired++][1]);
      const inOut = window01(u, 0, 0.18, 0.8, 1);
      switch (v.id) {
        case "wave":
          g.anz = -0.18 + (-1.75 + Math.sin(v.t * 11) * 0.42) * inOut;
          g.hz = -0.1 * inOut;
          if (this.firstPerson) {
            g.anx = -0.9 * inOut;
            g.reach = 1.2 * inOut;
          }
          break;
        case "sigh":
          g.hx = -0.28 * inOut;
          eye = Math.min(eye, 1 - inOut);
          g.mouth = 0.35 + 0.9 * inOut;
          break;
        case "pour": {
          const wind = window01(u, 0, 0.3, 0.3, 0.45);
          const throwK = window01(u, 0.35, 0.5, 0.75, 1);
          g.anx = 0.5 * wind - 1.5 * throwK;
          g.anz = -0.2;
          this.props.ladle.visible = true;
          g.reach = 0.8 * Math.max(wind, throwK);
          break;
        }
        case "fan":
          // arms up and out in a V (straight up would vanish into the big head)
          g.apz = 0.18 + (1.95 + Math.sin(v.t * 7) * 0.35) * inOut;
          g.anz = -0.18 - (1.95 - Math.sin(v.t * 7) * 0.35) * inOut;
          this.props.cloth.visible = inOut > 0.5;
          this.props.cloth.rotation.z = Math.sin(v.t * 7) * 0.5;
          this.props.cloth.rotation.x = Math.cos(v.t * 7) * 0.3;
          break;
        case "dunk":
          g.by -= 0.5 * window01(u, 0.12, 0.25, 0.6, 0.75);
          eye = u > 0.15 && u < 0.8 ? 0 : eye;
          break;
        case "bucket": {
          const up = window01(u, 0, 0.25, 0.75, 0.95);
          const tip = window01(u, 0.38, 0.5, 0.7, 0.85);
          g.apz = 2.25 * up + 0.18 * (1 - up);
          g.anz = -2.25 * up - 0.18 * (1 - up);
          this.props.bucket.visible = up > 0.3;
          this.props.bucket.rotation.x = tip * 2.4;
          this.props.bucket.position.set(0, this.shape.headY + 0.44 - tip * 0.05, 0.06 + tip * 0.1);
          if (u > 0.45) {
            eye = 0;
            this.shiver = 1;
            g.mouth = 1.2;
          }
          break;
        }
        case "egg": {
          const lift = window01(u, 0, 0.36, 0.44, 0.6);
          const munch = window01(u, 0.55, 0.65, 0.9, 1);
          g.anx = -1.95 * lift - 1.7 * munch;
          g.anz = -0.18 + 0.45 * Math.max(lift, munch);
          // the arm is too short to reach, so the forehead comes down to meet the egg
          const bonk = window01(u, 0.38, 0.42, 0.44, 0.56);
          g.hx = 0.25 * lift + 0.3 * bonk;
          this.kick = 0.08 * bonk;
          this.props.egg.visible = u < 0.62;
          g.reach = Math.max(lift, munch);
          g.mouth = 0.35 + munch * (0.6 + Math.sin(v.t * 14) * 0.5);
          if (bonk > 0.2) eye = 0.1;
          break;
        }
        case "milk": {
          const lift = window01(u, 0, 0.22, 0.72, 0.9);
          g.anx = -2.25 * lift;
          g.anz = -0.18 + 0.42 * lift;
          g.apz = 0.18 + 0.75 * lift; // other hand on the hip
          g.apx = 0.25 * lift;
          g.hx = -0.5 * window01(u, 0.2, 0.3, 0.68, 0.8);
          this.kick = g.hx * 0.45;
          this.props.milk.visible = u < 0.92;
          g.reach = lift;
          eye = u > 0.25 && u < 0.75 ? 0 : eye;
          g.mouth = u > 0.78 ? 1.3 * window01(u, 0.78, 0.84, 0.92, 1) + 0.35 : 0.35;
          break;
        }
      }
      if (u >= 1) this.verb = null;
    }
    g.eye = eye;

    // ---- ease toward the target
    const r = this.rig;
    const k = 1 - Math.exp(-dt * 13);
    (Object.keys(g) as (keyof Rig)[]).forEach((key) => (r[key] += (g[key] - r[key]) * k));
    // lying down and getting up should feel slower than an arm swing
    this.shiver = Math.max(this.heat < -0.35 ? 1 : 0, this.shiver - dt * 0.35);
    const sh = this.shiver * Math.sin(t * 46) * 0.008;
    this.body.rotation.x = r.bx;
    this.body.rotation.z = r.roll;
    // a little squash and spring whenever they change what they're doing (sit, lie, stand up)
    if (this.pose !== this.lastPose) {
      this.lastPose = this.pose;
      this.bounce = 1;
    }
    this.bounce = Math.max(0, this.bounce - dt * 2.4);
    const wob = this.calm ? 0 : Math.sin(this.bounce * 9) * this.bounce * 0.11;
    this.body.scale.set(1 + wob, 1 - wob, 1 + wob);
    this.body.position.set(sh, r.by, r.bz);
    this.armP.rotation.set(r.apx, 0, r.apz);
    this.armN.rotation.set(r.anx, 0, r.anz);
    const reach = this.firstPerson ? r.reach : 0;
    this.armN.position.set(-this.shape.armX + reach * 0.03, this.shape.armY + reach * 0.08, reach * 0.3);
    if (this.shape.hideArms) {
      // tucked arms grow out only as far as they're being used
      const grow = (x: number, z: number, rest: number) => Math.max(0.001, Math.min(1, (Math.abs(x) + Math.abs(z - rest)) * 2.4));
      this.nubs[0].scale.setScalar(grow(r.apx, r.apz, 0.18));
      this.nubs[1].scale.setScalar(grow(r.anx, r.anz, -0.18));
    }
    this.props.cloth.position.set(0, this.shape.headY + (this.firstPerson ? 0.32 : 0.48), this.firstPerson ? 0.5 : 0.05);
    this.legP.rotation.x = r.lp;
    this.legN.rotation.x = r.ln;
    // a glance: the head turns toward something for a moment, then comes back
    this.glanceLeft -= dt;
    this.headTurn += ((this.glanceLeft > 0 ? this.glanceGoal : 0) - this.headTurn) * (1 - Math.exp(-dt * 6));
    this.head.rotation.set(r.hx, this.headTurn, r.hz + sh * 4);
    const openEyes = r.eye > 0.3 && !this.cucumbers && !this.face.shut;
    for (const e of this.eyes) {
      e.scale.y = (e.userData.tall as number) * Math.max(0.08, r.eye);
      e.visible = openEyes;
    }
    for (const w of this.whites) w.visible = openEyes;
    for (const l of this.lids) l.visible = !openEyes && !this.cucumbers;
    for (const c of this.cukes) c.visible = this.cucumbers;
    this.mouth.scale.set(1.4, 0.55 + r.mouth, 0.5);
    const open = r.mouth > 0.5;
    this.mouth.visible = open;
    this.smile.visible = !open;
    // the smile flattens when you're cold
    this.smile.scale.y = (this.heat < -0.3 ? 0.25 : 1) * Math.min(1.2, this.face.smile);

    // the floor shadow stretches under a lying body and disappears in water
    const flat = this.pose === "lie";
    this.shadow.scale.set(flat ? 1.1 : 1, 1, flat ? 2.2 : 1);
    this.shadow.visible = this.pose !== "soak" && this.pose !== "float" && this.pose !== "plunge" && this.group.position.y > -0.2;

    // ---- warmth shows on the skin
    const h = this.heat;
    this.skin.color.copy(this.skinBase);
    if (h > 0) this.skin.color.lerp(HOT_TINT, h * 0.3);
    else this.skin.color.lerp(COLD_TINT, -h * 0.38);
    this.cheeks.opacity = 0.3 + Math.max(0, h) * 0.55;
    void this.isWet;
  }

  dispose() {
    for (const m of this.own) m.dispose();
    (this.shadow.material as THREE.Material).dispose();
    this.skin.dispose();
    this.outfitMat.dispose();
    this.cheeks.dispose();
    if (this.label) {
      this.label.material.map?.dispose();
      this.label.material.dispose();
    }
  }
}
