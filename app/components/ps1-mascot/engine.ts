// The three.js side of the mascot: the cookie rig, three small sets, the
// animation, and a frame-capped render loop. Kept free of React so the
// component can load it lazily (three is ~600 kB) and so it is easy to
// drive from anywhere.
import * as THREE from "three";
import {
  createGlobals,
  ditherBackdropMaterial,
  ps1Material,
  type PS1Globals,
} from "./ps1Material";
import {
  PALETTE,
  bowlTexture,
  cookieTexture,
  drawFace,
  faceCanvas,
  fluteTexture,
  glyphTexture,
  pixelTexture,
  roundRugTexture,
  rugTexture,
  sheetTexture,
  wallTexture,
  wallpaperTexture,
  windowTexture,
  woodTexture,
  type FaceExpression,
} from "./textures";

export type MascotCharacter = "cookie" | "cat";
export type MascotMood = "idle" | "eat" | "flute" | "sleep";
export type MascotScene = "none" | "desk" | "float" | "room";
export type MascotEffects = {
  /** Vertex snap step in internal pixels; 0 turns the wobble off. */
  snap: number;
  /** Affine (non perspective-correct) texture mapping. */
  affine: boolean;
  /** Ordered 4x4 dithering before colour reduction. */
  dither: boolean;
  /** Bits per colour channel; 5 is the PS1's 15-bit colour, 8 is off. */
  colorBits: number;
};

export const DEFAULT_EFFECTS: MascotEffects = { snap: 2, affine: true, dither: true, colorBits: 5 };

type Particle = {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  vel: THREE.Vector3;
  life: number;
  age: number;
  spin: number;
};

type SceneSetup = {
  group: THREE.Group;
  camPos: [number, number, number];
  camTarget: [number, number, number];
  fov: number;
  rootPos: [number, number, number];
  rootRotY: number;
  clear: string | null;
  shadow: boolean;
  floating: boolean;
  backdrop?: THREE.ShaderMaterial;
};

type Glyph = "note" | "z" | "sparkle" | "crumb";

const ARM_LEN = 0.34;
const COOKIE_EXTENT = 1.12;

type Arm = { pivot: THREE.Group; stretch: THREE.Group; shoulder: THREE.Vector3; hand: THREE.Vector3 };
type CharRig = {
  kind: MascotCharacter;
  group: THREE.Group;
  feet: THREE.Group;
  face: THREE.Mesh;
  faceCanvas: HTMLCanvasElement;
  faceTex: THREE.CanvasTexture;
  /** Where the face decal rests; it slides toward the pointer from here. */
  faceRest: THREE.Vector3 | null;
  head: THREE.Group | null;
  tail: THREE.Group | null;
  arms: Arm[];
  held: THREE.Mesh;
  flute: THREE.Group;
  mouth: THREE.Vector3;
  bowlReach: THREE.Vector3;
};
const UP = new THREE.Vector3(0, -1, 0);

export class MascotEngine {
  readonly canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
  private globals: PS1Globals = createGlobals();
  private textures: THREE.Texture[] = [];
  private setGroup: THREE.Group | null = null;
  private setup!: SceneSetup;

  // rig
  private root = new THREE.Group();
  private hop = new THREE.Group();
  private body = new THREE.Group();
  private char!: CharRig;
  private cookieTex!: THREE.Texture;
  private fluteTex!: THREE.Texture;
  private faceExpr: FaceExpression | null = null;
  private bowl!: THREE.Group;
  private shadow!: THREE.Mesh<THREE.CircleGeometry, THREE.ShaderMaterial>;
  private particles: Particle[] = [];
  private glyphs: Record<Glyph, THREE.Texture>;

  // state
  private mood: MascotMood = "idle";
  private still = false;
  private fps = 30;
  private running = false;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private time = 0;
  private reactAt = -10;
  private nextBlink = 2;
  private blinkUntil = 0;
  private spawnClock = 0;
  private lastChompFrame = -1;
  private stillOverride: FaceExpression | null = null;
  private look = new THREE.Vector2();
  private lookTarget = new THREE.Vector2();
  private pose = { y: 0, rx: 0, ry: 0, rz: 0, sy: 1 };
  private statsMs = 0;
  private statsFrames = 0;
  private statsT = 0;
  onStats?: (ms: number, fps: number) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      powerPreference: "low-power",
      preserveDrawingBuffer: false,
    });
    this.renderer.setPixelRatio(1);
    this.glyphs = {
      note: this.track(glyphTexture("note")),
      z: this.track(glyphTexture("z")),
      sparkle: this.track(glyphTexture("sparkle")),
      crumb: this.track(glyphTexture("crumb")),
    };
    this.fluteTex = this.track(fluteTexture());
    this.buildShared();
    this.setCharacter("cookie");
    this.scene.add(this.root);
    this.setScene("none");
  }

  private track<T extends THREE.Texture>(t: T) {
    this.textures.push(t);
    return t;
  }

  private mat(opts: Parameters<typeof ps1Material>[1] = {}) {
    return ps1Material(this.globals, opts);
  }

  // ---------------------------------------------------------------- rig
  private buildShared() {
    this.cookieTex = this.track(cookieTexture(COOKIE_EXTENT));

    // Bowl of mini cookies for the eating mood.
    this.bowl = this.buildBowl(this.cookieTex);
    this.bowl.position.set(0.66, 0, 0.78);
    this.bowl.visible = false;
    this.root.add(this.bowl);

    // PS1 games used a flat blob for a shadow; this one is screen-door dithered.
    const shadowMat = this.mat({ color: "#3a2a22", lit: false });
    shadowMat.uniforms.uOpacity.value = 0.45;
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.85, 10), shadowMat);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.01;
    this.shadow.scale.set(1, 0.7, 1);
    this.root.add(this.shadow);

    this.hop.add(this.body);
    this.body.position.y = 1.12;
    this.root.add(this.hop);

    // Particle pool: notes, z's, sparkles, crumbs.
    const quad = new THREE.PlaneGeometry(0.2, 0.2);
    for (let i = 0; i < 14; i++) {
      const m = this.mat({ map: this.glyphs.note, lit: false });
      const mesh = new THREE.Mesh(quad, m);
      mesh.visible = false;
      this.scene.add(mesh);
      this.particles.push({ mesh, vel: new THREE.Vector3(), life: 0, age: 0, spin: 0 });
    }
  }

  setCharacter(kind: MascotCharacter) {
    if (this.char?.kind === kind) return;
    if (this.char) {
      this.body.remove(this.char.group);
      this.root.remove(this.char.feet);
      this.disposeObject(this.char.group);
      this.disposeObject(this.char.feet);
      this.char.faceTex.dispose();
    }
    this.char = kind === "cat" ? this.buildCat() : this.buildCookie();
    this.body.add(this.char.group);
    this.root.add(this.char.feet);
    this.faceExpr = null;
    this.setFace("open");
    this.requestRender();
  }

  private buildCookie(): CharRig {
    const group = new THREE.Group();
    const E = COOKIE_EXTENT;
    // A lathe with a puffy rounded profile, 12 sides, nudged into a
    // slightly lumpy outline so it reads as a hand-made cookie.
    const profile = [
      [0.001, -0.29], [0.6, -0.29], [0.88, -0.23], [1.0, -0.09],
      [1.0, 0.1], [0.9, 0.24], [0.62, 0.31], [0.001, 0.33],
    ].map(([r, h]) => new THREE.Vector2(r, h));
    const lathe = new THREE.LatheGeometry(profile, 12);
    const pos = lathe.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const a = Math.atan2(z, x);
      const k = 1 + 0.045 * Math.sin(3 * a + 1) + 0.03 * Math.sin(5 * a + 2.2);
      pos.setX(i, x * k);
      pos.setZ(i, z * k);
    }
    lathe.rotateX(Math.PI / 2);
    const uv = lathe.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / (2 * E) + 0.5, pos.getY(i) / (2 * E) + 0.5);
    lathe.computeVertexNormals();
    group.add(new THREE.Mesh(lathe, this.mat({ map: this.cookieTex })));

    // A few chunky chips poking out of the rim.
    const chipGeo = new THREE.OctahedronGeometry(0.085, 0);
    const chipMat = this.mat({ color: PALETTE.chip });
    [0.4, 1.5, 2.5, 3.6, 4.4, 5.5].forEach((a, i) => {
      const chip = new THREE.Mesh(chipGeo, chipMat);
      chip.position.set(Math.cos(a) * 1.0, Math.sin(a) * 1.0, i % 2 ? -0.1 : 0.12);
      chip.rotation.set(a, a * 2, 0);
      group.add(chip);
    });

    // Face decal: a 32x32 canvas redrawn whenever the expression changes.
    const canvas = faceCanvas();
    const faceTex = pixelTexture(canvas);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), this.mat({ map: faceTex }));
    const faceRest = new THREE.Vector3(0, 0.12, 0.345);
    face.position.copy(faceRest);
    group.add(face);

    const mouth = new THREE.Vector3(0.08, -0.12, 0.56);
    const arms = this.buildArms(group, [new THREE.Vector3(-0.66, -0.3, 0.2), new THREE.Vector3(0.66, -0.3, 0.2)], PALETTE.doughLight);
    const { held, flute } = this.buildProps(group, mouth);
    const feet = this.buildFeet(PALETTE.bake, 0.34);
    return { kind: "cookie", group, feet, faceCanvas: canvas, faceTex, face, faceRest, head: null, tail: null, arms, held, flute, mouth, bowlReach: new THREE.Vector3(0.58, -0.8, 0.7) };
  }

  /** Our own white cat: round low-poly head, pink ears, whisker lines, and a cookie charm. */
  private buildCat(): CharRig {
    const group = new THREE.Group();
    const white = this.mat({ color: "#f7f5f2" });
    const pink = "#f2a7b8";

    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6), white);
    torso.scale.set(1, 1, 0.9);
    torso.position.set(0, -0.62, 0);
    group.add(torso);

    const head = new THREE.Group();
    head.position.set(0, 0.25, 0.02);
    const S = new THREE.Vector3(0.82, 0.7, 0.7);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), white);
    skull.scale.copy(S);
    head.add(skull);

    // The face is a shell just outside the front of the head, planar-mapped
    // so the 32x32 face wraps the curve. It is cut finer than the head so
    // affine warping stays gentle on the eyes, the same trick PS1 artists
    // used: more, smaller triangles where the texture matters.
    const shellGeo = new THREE.SphereGeometry(1.03, 12, 8, 0.1 * Math.PI, 0.8 * Math.PI, Math.PI / 4, Math.PI / 2);
    const sp = shellGeo.attributes.position as THREE.BufferAttribute;
    const suv = shellGeo.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < sp.count; i++) suv.setXY(i, 0.5 + sp.getX(i) * 0.55, 0.5 + sp.getY(i) * 0.55);
    const canvas = faceCanvas();
    const faceTex = pixelTexture(canvas);
    const face = new THREE.Mesh(shellGeo, this.mat({ map: faceTex }));
    face.scale.copy(S);
    head.add(face);

    for (const s of [-1, 1]) {
      const ear = new THREE.Group();
      ear.position.set(s * 0.42, 0.5, -0.02);
      ear.rotation.z = -s * 0.36;
      const outer = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.42, 4), white);
      outer.rotation.y = Math.PI / 4;
      outer.position.y = 0.17;
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.27, 4), this.mat({ color: pink }));
      inner.rotation.y = Math.PI / 4;
      inner.scale.set(1, 1, 0.55);
      inner.position.set(0, 0.13, 0.085);
      ear.add(outer, inner);
      head.add(ear);
    }

    // Whiskers as real 1px lines: at the low internal resolution they
    // come out as chunky pixel strokes, just like the old games.
    const pts: number[] = [];
    for (const s of [-1, 1])
      for (const dy of [0.05, -0.05]) pts.push(s * 0.5, -0.14 + dy, 0.56, s * 1.0, -0.12 + dy * 2.4, 0.42);
    const wg = new THREE.BufferGeometry();
    wg.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    wg.setAttribute("normal", new THREE.Float32BufferAttribute(pts.map((_, i) => (i % 3 === 2 ? 1 : 0)), 3));
    wg.setAttribute("uv", new THREE.Float32BufferAttribute(new Array((pts.length / 3) * 2).fill(0), 2));
    head.add(new THREE.LineSegments(wg, this.mat({ color: "#8f8a99", lit: false })));
    group.add(head);

    // Collar with a tiny cookie charm, so she belongs to the cookie world.
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.05, 4, 10), this.mat({ color: "#e7708f" }));
    collar.rotation.x = Math.PI / 2;
    collar.position.y = -0.47;
    group.add(collar);
    const charm = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.04, 8), this.mat({ map: this.cookieTex }));
    charm.rotation.x = Math.PI / 2;
    charm.position.set(0, -0.56, 0.37);
    group.add(charm);

    const tail = new THREE.Group();
    tail.position.set(0.28, -0.88, -0.25);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.28, 0.12, -0.12),
      new THREE.Vector3(0.38, 0.45, -0.18), new THREE.Vector3(0.26, 0.72, -0.12),
    ]);
    tail.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 6, 0.065, 4), white));
    group.add(tail);

    const mouth = new THREE.Vector3(0.06, 0.06, 0.72);
    const arms = this.buildArms(group, [new THREE.Vector3(-0.3, -0.5, 0.3), new THREE.Vector3(0.3, -0.5, 0.3)], "#f7f5f2");
    const { held, flute } = this.buildProps(group, mouth);
    const feet = this.buildFeet("#efece8", 0.26);
    return { kind: "cat", group, feet, faceCanvas: canvas, faceTex, face, faceRest: null, head, tail, arms, held, flute, mouth, bowlReach: new THREE.Vector3(0.58, -0.8, 0.7) };
  }

  // Stubby arms. Each pose names a hand target and a simple one-bone IK
  // aims (and gently stretches) the arm at it.
  private buildArms(group: THREE.Group, shoulders: THREE.Vector3[], color: string): Arm[] {
    const armGeo = new THREE.SphereGeometry(0.12, 6, 4);
    const armMat = this.mat({ color });
    return shoulders.map((shoulder) => {
      const pivot = new THREE.Group();
      pivot.position.copy(shoulder);
      const stretch = new THREE.Group();
      const arm = new THREE.Mesh(armGeo, armMat);
      arm.scale.set(1, 1.58, 1);
      arm.position.y = -ARM_LEN / 2;
      stretch.add(arm);
      pivot.add(stretch);
      group.add(pivot);
      return { pivot, stretch, shoulder, hand: shoulder.clone().add(new THREE.Vector3(0, -0.3, 0.1)) };
    });
  }

  private buildProps(group: THREE.Group, mouth: THREE.Vector3) {
    // The bite-sized cookie the eating animation lifts to the mouth.
    const mini = new THREE.CylinderGeometry(0.15, 0.15, 0.06, 8);
    mini.rotateX(Math.PI / 2);
    const held = new THREE.Mesh(mini, this.mat({ map: this.cookieTex }));
    held.visible = false;
    group.add(held);

    // Tiny silver flute.
    const flute = new THREE.Group();
    const tube = new THREE.CylinderGeometry(0.035, 0.035, 1.5, 6);
    tube.rotateZ(Math.PI / 2);
    const fluteMesh = new THREE.Mesh(tube, this.mat({ map: this.fluteTex }));
    fluteMesh.position.x = 0.62;
    const lip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.08), this.mat({ color: "#eef1f5" }));
    lip.position.set(0, 0.035, 0);
    flute.add(fluteMesh, lip);
    flute.position.copy(mouth).add(new THREE.Vector3(-0.08, -0.02, 0));
    flute.rotation.set(0, -0.35, -0.32);
    flute.visible = false;
    group.add(flute);
    return { held, flute };
  }

  // Feet stay on the ground while the body bobs.
  private buildFeet(color: string, spread: number) {
    const feet = new THREE.Group();
    const footGeo = new THREE.SphereGeometry(0.16, 6, 4);
    const footMat = this.mat({ color });
    for (const x of [-spread, spread]) {
      const foot = new THREE.Mesh(footGeo, footMat);
      foot.scale.set(1.2, 0.6, 1.5);
      foot.position.set(x, 0.07, 0.1);
      feet.add(foot);
    }
    return feet;
  }

  private buildBowl(cookieTex: THREE.Texture) {
    const g = new THREE.Group();
    const profile = [
      [0.001, 0.0], [0.22, 0.0], [0.24, 0.04], [0.4, 0.14], [0.46, 0.32],
      [0.43, 0.33], [0.37, 0.18], [0.2, 0.06], [0.001, 0.06],
    ].map(([r, h]) => new THREE.Vector2(r, h));
    const bowl = new THREE.Mesh(new THREE.LatheGeometry(profile, 10), this.mat({ map: this.track(bowlTexture()) }));
    g.add(bowl);
    const milk = new THREE.Mesh(new THREE.CircleGeometry(0.4, 10), this.mat({ color: "#fff7ea" }));
    milk.rotation.x = -Math.PI / 2;
    milk.position.y = 0.26;
    g.add(milk);
    const mini = new THREE.CylinderGeometry(0.11, 0.11, 0.05, 8);
    const miniMat = this.mat({ map: cookieTex });
    [[-0.12, 0.05, 0.4], [0.13, -0.08, -0.3], [0.02, 0.16, 0.2], [0.14, 0.15, -0.5]].forEach(([x, z, tilt]) => {
      const m = new THREE.Mesh(mini, miniMat);
      m.position.set(x, 0.29, z);
      m.rotation.set(tilt, 0, tilt * 0.6);
      g.add(m);
    });
    return g;
  }

  private setFace(expr: FaceExpression) {
    if (expr === this.faceExpr) return;
    this.faceExpr = expr;
    drawFace(this.char.faceCanvas, expr, this.char.kind);
    this.char.faceTex.needsUpdate = true;
  }

  // ---------------------------------------------------------------- sets
  setScene(name: MascotScene) {
    if (this.setGroup) {
      this.scene.remove(this.setGroup);
      this.disposeObject(this.setGroup);
    }
    this.setup = this.buildSet(name);
    this.setGroup = this.setup.group;
    this.scene.add(this.setGroup);
    const { camPos, camTarget, fov, rootPos, rootRotY, clear, shadow } = this.setup;
    this.camera.position.set(...camPos);
    this.camera.fov = fov;
    this.camera.lookAt(...camTarget);
    this.camera.updateProjectionMatrix();
    this.root.position.set(...rootPos);
    this.root.rotation.y = rootRotY;
    this.shadow.visible = shadow;
    if (clear) this.renderer.setClearColor(clear, 1);
    else this.renderer.setClearColor(0x000000, 0);
    this.requestRender();
  }

  private buildSet(name: MascotScene): SceneSetup {
    const group = new THREE.Group();
    const base: SceneSetup = {
      group,
      camPos: [0, 1.5, 4.5],
      camTarget: [0, 1.0, 0],
      fov: 34,
      rootPos: [0, 0, 0],
      rootRotY: 0,
      clear: null,
      shadow: true,
      floating: false,
    };
    const tex = <T extends THREE.Texture>(t: T) => {
      group.userData.textures = [...(group.userData.textures ?? []), t];
      return t;
    };

    if (name === "float") {
      const backdrop = ditherBackdropMaterial(this.globals, "#3b2230", "#f6e7d3");
      const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), backdrop);
      quad.frustumCulled = false;
      quad.renderOrder = -10;
      group.add(quad);
      return { ...base, camPos: [0, 1.2, 5.9], camTarget: [0, 1.1, 0], rootPos: [0, 0, 0], clear: "#3b2230", shadow: false, floating: true, backdrop };
    }

    if (name === "desk") {
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(12, 7), this.mat({ map: tex(wallTexture("#cfe7f6", "#a7cde6")), lit: false }));
      wall.position.set(0, 2.2, -2.2);
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.5), this.mat({ map: tex(windowTexture()), lit: false }));
      win.position.set(-1.9, 2.5, -2.18);
      const desk = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 3.6), this.mat({ map: tex(woodTexture()), repeat: [3, 1.5] }));
      desk.position.set(0, -0.15, 0.2);
      // A huge (to the cookie) mug of milk.
      const mug = new THREE.Group();
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.46, 1.1, 10, 1, true), this.mat({ color: "#f08aa6", side: THREE.DoubleSide }));
      cup.position.y = 0.55;
      const milk = new THREE.Mesh(new THREE.CircleGeometry(0.47, 10), this.mat({ color: "#fffaf0" }));
      milk.rotation.x = -Math.PI / 2;
      milk.position.y = 0.95;
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.06, 4, 8), this.mat({ color: "#f08aa6" }));
      handle.position.set(-0.5, 0.55, 0);
      mug.add(cup, milk, handle);
      mug.position.set(-1.75, 0, -0.55);
      // Sheet music lying on the desk.
      const sheet = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.4), this.mat({ map: tex(sheetTexture()) }));
      sheet.rotation.set(-Math.PI / 2, 0, 0.35);
      sheet.position.set(1.85, 0.01, -0.2);
      const pencil = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 6), this.mat({ color: "#f5c242" }));
      pencil.rotation.set(Math.PI / 2, 0, 1.1);
      pencil.position.set(1.3, 0.05, 0.9);
      group.add(wall, win, desk, mug, sheet, pencil);
      return { ...base, camPos: [0.25, 2.3, 5.3], camTarget: [0.1, 0.85, 0], fov: 36, clear: "#a7cde6" };
    }

    if (name === "room") {
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), this.mat({ map: tex(woodTexture(9, "#c48a55", "#a8703f", "#d49b66")), repeat: [3, 3] }));
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(0, 0, 0);
      const paper = tex(wallpaperTexture());
      const back = new THREE.Mesh(new THREE.PlaneGeometry(7, 4.2), this.mat({ map: paper, repeat: [7, 4] }));
      back.position.set(0, 2.1, -3.5);
      const left = new THREE.Mesh(new THREE.PlaneGeometry(7, 4.2), this.mat({ map: paper, repeat: [7, 4] }));
      left.rotation.y = Math.PI / 2;
      left.position.set(-3.5, 2.1, 0);
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.4), this.mat({ map: tex(windowTexture()), lit: false }));
      win.position.set(0.6, 2.3, -3.48);
      const rug = new THREE.Mesh(new THREE.CircleGeometry(1.7, 12), this.mat({ map: tex(roundRugTexture()) }));
      rug.rotation.x = -Math.PI / 2;
      rug.position.y = 0.005;
      // Music stand.
      const stand = new THREE.Group();
      const metal = this.mat({ color: "#45464f" });
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 5), metal);
      pole.position.y = 0.75;
      const foot = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.25, 3), metal);
      foot.position.y = 0.12;
      const desk = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.62, 0.03), metal);
      desk.position.set(0, 1.55, 0);
      desk.rotation.x = -0.35;
      const music = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.55), this.mat({ map: tex(sheetTexture()) }));
      music.position.set(0, 1.56, 0.025);
      music.rotation.x = -0.35;
      stand.add(pole, foot, desk, music);
      stand.position.set(-1.25, 0, 1.0);
      stand.rotation.y = Math.atan2(1.25, -1.0);
      // Potted plant.
      const plant = new THREE.Group();
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.28, 0.55, 8), this.mat({ color: "#c96a45" }));
      pot.position.y = 0.27;
      const leafMat = this.mat({ color: "#5e9e4f" });
      [[0, 0.85, 0, 0.42], [-0.22, 1.15, 0.1, 0.3], [0.2, 1.25, -0.05, 0.28]].forEach(([x, y, z, r]) => {
        const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), leafMat);
        leaf.position.set(x, y, z);
        plant.add(leaf);
      });
      plant.add(pot);
      plant.position.set(-2.7, 0, -0.4);
      // A little cookie jar on the floor.
      const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.55, 8), this.mat({ map: tex(rugTexture("#8fc7e6", "#7ab6d9")) }));
      jar.position.set(1.9, 0.28, -2.6);
      group.add(floor, back, left, win, rug, stand, plant, jar);
      return { ...base, camPos: [2.9, 3.3, 6.0], camTarget: [-0.2, 0.95, -0.4], fov: 40, rootPos: [0, 0, 0], rootRotY: 0.3, clear: "#f3d9cf" };
    }

    return base;
  }

  // ---------------------------------------------------------------- API
  setMood(mood: MascotMood) {
    this.mood = mood;
    this.requestRender();
  }

  setEffects(e: MascotEffects) {
    this.globals.uSnap.value = e.snap;
    this.globals.uAffine.value = e.affine ? 1 : 0;
    this.globals.uDither.value = e.dither ? 1 : 0;
    this.globals.uLevels.value = Math.pow(2, Math.max(1, Math.min(8, e.colorBits))) - 1;
    this.requestRender();
  }

  setResolution(w: number, h: number) {
    this.renderer.setSize(w, h, false);
    this.globals.uRes.value.set(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.requestRender();
  }

  setFps(fps: number) {
    this.fps = Math.max(5, Math.min(60, fps));
  }

  /** Pointer position in canvas-relative units, -1..1 (null when it leaves). */
  setPointer(x: number | null, y = 0) {
    if (x === null) this.lookTarget.set(0, 0);
    else this.lookTarget.set(Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y)));
    if (this.still) {
      this.look.copy(this.lookTarget);
      this.requestRender();
    }
  }

  /** The click reaction: a hop and a wave (or, with reduced motion, a smile). */
  react() {
    if (this.still) {
      this.stillOverride = this.mood === "sleep" ? "surprised" : "happy";
      this.requestRender();
      window.setTimeout(() => {
        this.stillOverride = null;
        this.requestRender();
      }, 1400);
      return;
    }
    this.reactAt = this.time;
    const above = this.body.localToWorld(new THREE.Vector3(0, 1.05, 0.2));
    for (let i = 0; i < 4; i++) this.spawn("sparkle", 0.9, above);
  }

  setStill(still: boolean) {
    this.still = still;
    if (still) this.stop();
    this.requestRender();
  }

  start() {
    if (this.running || this.still) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      this.acc += dt;
      const step = 1 / this.fps;
      if (this.acc < step - 0.002) return;
      const frameDt = Math.min(this.acc, 0.1);
      this.acc = 0;
      const t0 = performance.now();
      this.update(frameDt);
      this.renderer.render(this.scene, this.camera);
      this.measure(performance.now() - t0, frameDt);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private measure(ms: number, dt: number) {
    this.statsMs += ms;
    this.statsFrames++;
    this.statsT += dt;
    if (this.statsT >= 1) {
      this.onStats?.(this.statsMs / this.statsFrames, this.statsFrames / this.statsT);
      this.statsMs = this.statsFrames = this.statsT = 0;
    }
  }

  /** Draws one frame now; used when paused or in still mode. */
  requestRender() {
    if (this.running || !this.setup) return;
    if (this.still) {
      this.update(0, true);
    }
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.stop();
    if (this.setGroup) this.disposeObject(this.setGroup);
    this.disposeObject(this.scene);
    this.textures.forEach((t) => t.dispose());
    this.renderer.dispose();
  }

  private disposeObject(obj: THREE.Object3D) {
    obj.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x.dispose());
    });
    (obj.userData.textures as THREE.Texture[] | undefined)?.forEach((t) => t.dispose());
  }

  // ---------------------------------------------------------------- animation
  private spawn(kind: Glyph, life: number, from?: THREE.Vector3) {
    const p = this.particles.find((q) => !q.mesh.visible);
    if (!p) return;
    p.mesh.material.uniforms.map.value = this.glyphs[kind];
    p.mesh.material.uniforms.uOpacity.value = 1;
    p.mesh.visible = true;
    p.life = life;
    p.age = 0;
    const origin = from ?? this.body.localToWorld(new THREE.Vector3(0, 0.3, 0.4));
    p.mesh.position.copy(origin);
    const r = Math.random;
    if (kind === "sparkle") p.vel.set((r() - 0.5) * 2.4, r() * 1.4 + 0.3, 0.2);
    else if (kind === "crumb") p.vel.set((r() - 0.5) * 0.8, 0.3, 0.4);
    else p.vel.set(0.25 + r() * 0.2, 0.55 + r() * 0.2, 0);
    p.spin = kind === "crumb" ? (r() - 0.5) * 6 : 0;
    p.mesh.scale.setScalar(kind === "crumb" ? 0.45 : kind === "z" ? 0.8 + r() * 0.4 : 1);
  }

  private updateParticles(dt: number) {
    for (const p of this.particles) {
      if (!p.mesh.visible) continue;
      p.age += dt;
      if (p.age >= p.life) {
        p.mesh.visible = false;
        continue;
      }
      const isCrumb = p.spin !== 0;
      if (isCrumb) p.vel.y -= 3.2 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.position.x += Math.sin(p.age * 5 + p.life * 9) * dt * (isCrumb ? 0 : 0.25);
      p.mesh.quaternion.copy(this.camera.quaternion);
      if (isCrumb) p.mesh.rotateZ(p.age * p.spin);
      p.mesh.material.uniforms.uOpacity.value = Math.min(1, (p.life - p.age) / (p.life * 0.45));
    }
  }

  private aimArm(i: number, target: THREE.Vector3, k: number) {
    const arm = this.char.arms[i];
    arm.hand.lerp(target, k);
    const d = arm.hand.clone().sub(arm.shoulder);
    const len = Math.max(0.05, d.length());
    arm.pivot.quaternion.setFromUnitVectors(UP, d.normalize());
    arm.stretch.scale.y = Math.max(0.75, Math.min(1.9, len / ARM_LEN));
  }

  private update(dt: number, still = false) {
    this.time += dt;
    const t = this.time;
    const k = still ? 1 : 1 - Math.exp(-dt * 10);
    const kl = still ? 1 : 1 - Math.exp(-dt * 5);
    this.look.lerp(this.lookTarget, kl);
    const lookAmt = this.mood === "idle" ? 1 : this.mood === "sleep" ? 0 : 0.35;
    const lx = this.look.x * lookAmt, ly = this.look.y * lookAmt;

    const react = still ? 1 : (t - this.reactAt) / 1.1;
    const reacting = react >= 0 && react < 1;

    let y = Math.sin(t * 2.4) * 0.035;
    let rx = -ly * 0.32;
    let ry = lx * 0.55;
    let rz = -lx * 0.14 + Math.sin(t * 1.15) * 0.035;
    let sy = 1 + Math.sin(t * 2.4 + 0.6) * 0.018;
    let face: FaceExpression = "open";
    const sway = Math.sin(t * 2.4) * 0.03;
    const [sL, sR] = this.char.arms.map((a) => a.shoulder);
    let handL = sL.clone().add(new THREE.Vector3(-0.2 - sway, -0.26, 0.14));
    let handR = sR.clone().add(new THREE.Vector3(0.2 + sway, -0.26, 0.14));
    let held = false;
    let heldScale = 1;
    let crumbs = false;
    let hopLift = 0;

    if (this.mood === "eat") {
      const P = 3.4;
      const p = ((t % P) + P) % P / P;
      const rest = sR.clone().add(new THREE.Vector3(0.05, -0.35, 0.35));
      handL = sL.clone().add(new THREE.Vector3(0.1, -0.4, 0.35));
      const { bowlReach, mouth } = this.char;
      if (p < 0.2) handR = rest.clone().lerp(bowlReach, smooth(p / 0.2));
      else if (p < 0.42) handR = bowlReach.clone().lerp(mouth, smooth((p - 0.2) / 0.22));
      else if (p < 0.8) handR = mouth.clone();
      else handR = mouth.clone().lerp(rest, smooth((p - 0.8) / 0.2));
      held = p > 0.17 && p < 0.8;
      rx = 0.1 * Math.sin(Math.min(1, p / 0.2) * Math.PI) + rx;
      if (p >= 0.42 && p < 0.8) {
        const bite = Math.floor((p - 0.42) / 0.095);
        face = bite % 2 === 0 ? "chomp" : "happy";
        heldScale = 1 - bite * 0.2;
        if (bite !== this.lastChompFrame && bite % 2 === 0) crumbs = true;
        this.lastChompFrame = bite;
        y += Math.abs(Math.sin(t * 16)) * 0.02;
      } else {
        this.lastChompFrame = -1;
        face = p >= 0.8 ? "happy" : "open";
      }
    } else if (this.mood === "flute") {
      // Real flutists hold the flute to their right; both hands on the tube.
      const dir = new THREE.Vector3(Math.cos(-0.32), Math.sin(-0.32), 0);
      const along = (d: number) => this.char.flute.position.clone().addScaledVector(dir, d).add(new THREE.Vector3(0, -0.05, 0));
      handL = along(0.32);
      handR = along(0.78);
      rz = Math.sin(t * 1.7) * 0.09 + rz;
      ry += Math.sin(t * 0.85) * 0.12;
      y = Math.sin(t * 3.4) * 0.025;
      face = "content";
      this.spawnClock += dt;
      if (this.spawnClock > 0.75) {
        this.spawnClock = 0;
        this.spawn("note", 1.8, this.body.localToWorld(new THREE.Vector3(1.3, -0.35, 0.3)));
      }
    } else if (this.mood === "sleep") {
      y = -0.06 + Math.sin(t * 1.1) * 0.02;
      sy = 1 + Math.sin(t * 1.1) * 0.035;
      rz = 0.14;
      rx = 0.08;
      face = "sleep";
      handL = sL.clone().add(new THREE.Vector3(0.14, -0.34, 0.26));
      handR = sR.clone().add(new THREE.Vector3(-0.14, -0.34, 0.26));
      this.spawnClock += dt;
      if (this.spawnClock > 1.3) {
        this.spawnClock = 0;
        this.spawn("z", 2.4, this.body.localToWorld(new THREE.Vector3(0.6, 0.7, 0.2)));
      }
    } else {
      this.spawnClock += dt;
      if (this.setup.floating && this.spawnClock > 1.1) {
        this.spawnClock = 0;
        const a = Math.random() * Math.PI * 2;
        this.spawn("sparkle", 1.4, this.body.localToWorld(new THREE.Vector3(Math.cos(a) * 1.5, Math.sin(a) * 1.2, -0.2)));
      }
    }

    // Floating moves the whole character (feet too), not just the body.
    const floatY = this.setup.floating ? (still ? 0 : Math.sin(t * 1.3) * 0.14) : 0;
    this.root.position.y = this.setup.rootPos[1] + floatY;
    if (this.setup.floating) ry += Math.sin(t * 0.6) * 0.5;

    // Click: hop with squash on landing, wave the right arm, big smile.
    if (reacting && !still) {
      const hop = react < 0.5 ? Math.sin((react / 0.5) * Math.PI) : 0;
      y += hop * 0.42;
      hopLift = hop * 0.42;
      if (react < 0.08) sy *= 1 - (0.08 - react) * 1.6;
      else if (react > 0.5 && react < 0.62) sy *= 1 - Math.sin(((react - 0.5) / 0.12) * Math.PI) * 0.12;
      if (this.mood !== "eat") handR = sR.clone().add(new THREE.Vector3(0.3 + Math.sin(t * 15) * 0.12, 0.42, 0.15));
      face = this.mood === "sleep" ? "surprised" : "happy";
      rz += Math.sin(react * Math.PI) * 0.1;
    }

    // Blink every few seconds, but not when the eyes are already closed.
    if (!still && t > this.nextBlink) {
      this.blinkUntil = t + 0.12;
      this.nextBlink = t + 2.2 + Math.random() * 3.2;
      if (Math.random() < 0.2) this.nextBlink = t + 0.3; // double blink
    }
    if (face === "open" && t < this.blinkUntil) face = "blink";
    if (still && this.stillOverride) face = this.stillOverride;
    if (still) {
      // A tidy, readable rest pose for reduced motion.
      y = 0;
      sy = 1;
      rz = this.mood === "sleep" ? 0.14 : -lx * 0.14;
    }
    this.setFace(face);

    const P = this.pose;
    P.y += (y - P.y) * (still ? 1 : 0.6);
    P.rx += (rx - P.rx) * k;
    P.ry += (ry - P.ry) * k;
    P.rz += (rz - P.rz) * k;
    P.sy += (sy - P.sy) * (still ? 1 : 0.6);
    this.hop.position.y = P.y;
    this.char.feet.position.y = hopLift;
    this.body.rotation.set(P.rx, P.ry, P.rz);
    this.body.scale.set(1 + (1 - P.sy) * 0.6, P.sy, 1);
    const { faceRest, head, tail } = this.char;
    if (faceRest) this.char.face.position.set(faceRest.x + lx * 0.05, faceRest.y + ly * 0.04, faceRest.z);
    if (head) head.rotation.set(-ly * 0.22, lx * 0.3, -lx * 0.08 + (this.mood === "sleep" ? 0.12 : 0));
    if (tail) tail.rotation.z = Math.sin(t * (this.mood === "sleep" ? 0.8 : 2.1)) * 0.28;

    this.aimArm(0, handL, k);
    this.aimArm(1, handR, k);
    this.char.held.visible = held;
    if (held) {
      this.char.held.position.copy(this.char.arms[1].hand).add(new THREE.Vector3(-0.06, 0.06, 0.08));
      this.char.held.scale.setScalar(Math.max(0.2, heldScale));
    }
    if (crumbs) for (let i = 0; i < 3; i++) this.spawn("crumb", 0.7, this.body.localToWorld(this.char.mouth.clone().add(new THREE.Vector3(0, -0.1, 0.1))));
    this.char.flute.visible = this.mood === "flute";
    this.bowl.visible = this.mood === "eat";

    const lift = Math.max(0, P.y);
    this.shadow.scale.set(1 - lift * 0.5, 0.7 - lift * 0.35, 1);

    if (this.setup.backdrop) this.setup.backdrop.uniforms.uTime.value = t;
    if (!still) this.updateParticles(dt);
    else this.particles.forEach((p) => (p.mesh.visible = false));
  }
}

function smooth(x: number) {
  const c = Math.max(0, Math.min(1, x));
  return c * c * (3 - 2 * c);
}
