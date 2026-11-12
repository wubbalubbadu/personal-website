// Cat host's handheld as a real 3D object (wide screens). Only the device is
// drawn here: shell, bezel, D-pad, face buttons, and the hologram lens on the
// bottom edge. The screen itself stays HTML (the cat's canvas, name tags, item
// cards, the laptop desktop), and every frame it is bent onto the 3D screen's
// corners, so Cat host's logic, text and sizes don't change. Units are mm.
// Modelled after the lab study in ../handheld-3d (her approved console).
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { aoTexture, crossShape, grainTexture, makeClicker, roundedRect, triangleShape } from "../_kit/console-parts";
import { toMatrix3d } from "../handheld-3d/dialogue";
import { unlockAudio } from "../../components/ps1-mascot";

export type Key3D = "up" | "down" | "left" | "right" | "tri" | "cir" | "crs" | "sqr";

/** The shell and screen, in mm. The stage's CSS aspect ratio matches VIEW_W / VIEW_H. */
export const SHELL_W = 222;
export const SHELL_H = 90;
export const SCREEN_W = 140;
export const SCREEN_H = SCREEN_W * (9 / 16);
/** How much of the scene the camera frames: the shell plus a little room for the lean. */
export const VIEW_W = 230;
export const VIEW_TOP = 52;
export const VIEW_BOTTOM = -52;

const PINK = "#f2bdd0";

/** The two consoles: the wide PSP-like one (desktops, landscape iPads), and a
 *  tall one for phones and portrait iPads (screen on top, controls under it,
 *  like the phone layout). Everything else (materials, buttons, pressing, the
 *  screen warp) is shared. */
export type Shape3D = "wide" | "tall";
type Layout = {
  shellW: number; shellH: number; radius: number;
  screenW: number; screenH: number; screenY: number;
  /** The screen's corner radius (the bezel adds 1.8 round it). */
  screenR: number;
  /** Size of the D-pad and face buttons (1 on the wide console). */
  ctl: number;
  /** D-pad and face-button centres. */
  dpad: [number, number]; face: [number, number];
  viewW: number; viewTop: number; viewBottom: number;
  shoulders: boolean; lens: boolean;
};
const LAYOUTS: Record<Shape3D, Layout> = {
  wide: {
    shellW: SHELL_W, shellH: SHELL_H, radius: (SHELL_H - 4) / 2,
    screenW: SCREEN_W, screenH: SCREEN_H, screenY: 0, screenR: 1.6, ctl: 1,
    dpad: [-93, 2], face: [93, 2],
    viewW: VIEW_W, viewTop: VIEW_TOP, viewBottom: VIEW_BOTTOM,
    shoulders: true, lens: true,
  },
  tall: {
    // as much screen as possible: the shell's outside is 8mm bigger than
    // shellW/H (bevel), so the screen sits 8mm in all round, its corner
    // following the shell's; the controls sit right under it (her calls)
    shellW: 108, shellH: 112, radius: 10,
    screenW: 100, screenH: 75, screenY: 14.5, screenR: 8, ctl: 0.9,
    dpad: [-27, -40], face: [27, -40],
    viewW: 120, viewTop: 63, viewBottom: -63,
    shoulders: false, lens: false,
  },
};
/** Where the HTML screen sits in the tall console's view, as CSS percentages. */
export const TALL_SCREEN = (() => {
  const L = LAYOUTS.tall;
  const vh = L.viewTop - L.viewBottom;
  return {
    left: ((L.viewW - L.screenW) / 2 / L.viewW) * 100,
    top: ((L.viewTop - (L.screenY + L.screenH / 2)) / vh) * 100,
    width: (L.screenW / L.viewW) * 100,
    aspect: L.viewW / vh,
  };
})();

type Spring = { p: number; v: number; target: number };
const spring = (): Spring => ({ p: 0, v: 0, target: 0 });

export function mountConsole3D(
  host: HTMLElement,
  screenEl: HTMLElement,
  onPress: (k: Key3D) => void,
  /** The desk layout (the default; ?flat turns it off): the console stands on a desk, the camera looks down a
   *  little, and the dialogue (holo, laid out in stage) is a hologram standing
   *  on the desk in front of it, warped into place like the screen is. */
  desk?: { holo: HTMLElement; stage: HTMLElement },
  shape: Shape3D = "wide",
  /** Extra mm of width for the tall console, so it fills a wider screen
   *  instead of staying square (the screen widens with it; Handheld works it out). */
  stretch = 0,
  /** Extra mm of height for the tall console on a narrow, tall phone: the
   *  screen gets taller and the controls move down with the shell's bottom. */
  grow = 0,
) {
  const base = LAYOUTS[shape];
  const L: Layout =
    shape === "tall" && (stretch > 0 || grow > 0)
      ? {
          ...base,
          shellW: base.shellW + stretch,
          screenW: base.screenW + stretch,
          viewW: base.viewW + stretch,
          // (the screen's top stays 4mm under the shell's top and its centre
          // doesn't move: it grows down as the shell grows down)
          shellH: base.shellH + grow,
          screenH: base.screenH + grow,
          viewTop: base.viewTop + grow / 2,
          viewBottom: base.viewBottom - grow / 2,
          // the controls spread out a little with it, staying under the screen
          dpad: [base.dpad[0] - stretch * 0.3, base.dpad[1] - grow / 2],
          face: [base.face[0] + stretch * 0.3, base.face[1] - grow / 2],
        }
      : base;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  host.append(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  const camera = new THREE.PerspectiveCamera(26, 1, 10, 2000);

  const key = new THREE.DirectionalLight("#fff4e6", 2.2);
  key.position.set(-90, 120, 300);
  key.castShadow = true;
  // (a smaller, quicker shadow on the phone's console: it compiles and draws
  // faster there)
  key.shadow.mapSize.setScalar(shape === "tall" ? 1024 : 2048);
  key.shadow.camera.left = key.shadow.camera.bottom = -140;
  key.shadow.camera.right = key.shadow.camera.top = 140;
  key.shadow.camera.far = 800;
  key.shadow.bias = -0.0004;
  key.shadow.radius = 14;
  key.shadow.blurSamples = shape === "tall" ? 10 : 20;
  key.shadow.normalBias = 0.4;
  scene.add(key);
  scene.add(new THREE.HemisphereLight("#fff6ee", "#d9b8a8", 0.35));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.ShadowMaterial({ opacity: 0.2 }));
  floor.position.z = -17;
  floor.receiveShadow = true;
  scene.add(floor);

  // ---- desk mode: a wooden desk that fades into the page, and a projector pad
  // the console leans back on the desk (a kickstand), the camera looks down to
  // match, and the hologram lies tilted on the desk in front, growing toward you
  // the tall one stands up straighter (top toward you), so it takes less of
  // the desk and the hologram lies clear of it (her call)
  const LEAN_BACK = THREE.MathUtils.degToRad(shape === "tall" ? 13 : 20);
  const DESK_Y = -(L.shellH / 2) * Math.cos(LEAN_BACK) - 5;
  const PITCH = THREE.MathUtils.degToRad(25); // close to the lean, so the screen faces you
  const HOLO_TILT = THREE.MathUtils.degToRad(58); // from upright: leaning back over the desk
  // where its far edge (nearest the console) sits; the tall one tucks in
  // closer so the phone needs less scrolling
  const HOLO_Z = shape === "tall" ? 38 : 50;
  const deskBits: THREE.Object3D[] = [];
  const deskDisposables: { dispose(): void }[] = [];
  if (desk) {
    floor.visible = false;
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 512;
    const g = c.getContext("2d")!;
    g.fillStyle = "#c99a6e";
    g.fillRect(0, 0, 1024, 512);
    // long soft grain lines
    for (let i = 0; i < 140; i++) {
      const y = Math.random() * 512;
      g.strokeStyle = `rgba(${Math.random() < 0.5 ? "120,78,48" : "235,200,160"},${0.05 + Math.random() * 0.08})`;
      g.lineWidth = 1 + Math.random() * 3;
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x <= 1024; x += 64) g.lineTo(x, y + Math.sin(x * 0.004 + i) * 6);
      g.stroke();
    }
    const wood = new THREE.CanvasTexture(c);
    wood.colorSpace = THREE.SRGBColorSpace;
    wood.wrapS = wood.wrapT = THREE.RepeatWrapping;
    wood.repeat.set(5, 0.8);
    // fade the edges so the desk melts into the cream page instead of ending
    const a = document.createElement("canvas");
    a.width = a.height = 256;
    const ga = a.getContext("2d")!;
    // fades behind the console and toward you, as before; left and right it
    // runs off the page (her call)
    const rg = ga.createLinearGradient(0, 0, 0, 256);
    rg.addColorStop(0, "#000");
    rg.addColorStop(0.3, "#fff");
    rg.addColorStop(0.5, "#fff");
    rg.addColorStop(1, "#000");
    ga.fillStyle = rg;
    ga.fillRect(0, 0, 256, 256);
    const fade = new THREE.CanvasTexture(a);
    const deskMat = new THREE.MeshStandardMaterial({ map: wood, alphaMap: fade, transparent: true, roughness: 0.62, metalness: 0, envMapIntensity: 0.5 });
    const deskMesh = new THREE.Mesh(new THREE.PlaneGeometry(3200, 460), deskMat);
    deskMesh.rotation.x = -Math.PI / 2;
    deskMesh.position.set(0, DESK_Y, 110);
    deskMesh.receiveShadow = true;
    scene.add(deskMesh);
    deskBits.push(deskMesh);
    deskDisposables.push(deskMesh.geometry, deskMat, wood, fade);
  }

  const device = new THREE.Group();
  scene.add(device);

  const grain = grainTexture();
  const disposables: { dispose(): void }[] = [grain, pmrem, renderer, floor.geometry, floor.material as THREE.Material, ...deskDisposables];
  const track = <T extends { dispose(): void }>(x: T) => (disposables.push(x), x);
  const plastic = (color: string, rough: number, coat = 0.3) =>
    track(
      new THREE.MeshPhysicalMaterial({
        color,
        roughness: rough,
        roughnessMap: grain,
        bumpMap: grain,
        bumpScale: 0.35,
        clearcoat: coat,
        clearcoatRoughness: 0.35,
        sheen: 0.25,
        sheenColor: new THREE.Color("#ffffff"),
        sheenRoughness: 0.6,
      }),
    );
  const padMat = track(
    new THREE.MeshPhysicalMaterial({
      color: "#1f1a22",
      roughness: 0.45,
      bumpMap: grain,
      bumpScale: 0.15,
      // a soft sheen, not a mirror (her call: too much reflection)
      clearcoat: 0.45,
      clearcoatRoughness: 0.32,
      envMapIntensity: 0.45,
    }),
  );
  const mesh = (g: THREE.BufferGeometry, m: THREE.Material, cast = true) => {
    const x = new THREE.Mesh(track(g), m);
    x.castShadow = cast;
    x.receiveShadow = true;
    return x;
  };

  // ---- the shell: a pill (or, tall, a rounded slab), bevelled all round
  const W = L.shellW;
  const H = L.shellH;
  // a thick, well rounded edge so the shell reads as a solid object from the side
  const shellGeo = new THREE.ExtrudeGeometry(roundedRect(W - 4, H - 4, L.radius), {
    depth: 10,
    bevelEnabled: true,
    bevelThickness: 8,
    bevelSize: 6,
    bevelSegments: 20,
    curveSegments: 72,
  });
  shellGeo.translate(0, 0, -18);
  device.add(mesh(shellGeo, plastic(PINK, 0.55, 0.6)));

  const shoulderMat = plastic("#d998b2", 0.55);
  for (const x of L.shoulders ? [-58, 58] : []) {
    const s = mesh(new RoundedBoxGeometry(38, 6, 9, 4, 2.4), shoulderMat);
    s.position.set(x, H / 2 - 0.5, -8);
    device.add(s);
  }

  // ---- the screen: a thin glossy black bezel; the HTML screen sits on `screen`
  const bezelGeo = new THREE.ExtrudeGeometry(roundedRect(L.screenW + 3.6, L.screenH + 3.6, L.screenR + 1.8), {
    depth: 0.4,
    bevelEnabled: true,
    bevelThickness: 0.6,
    bevelSize: 0.8,
    bevelSegments: 4,
    curveSegments: 24,
  });
  bezelGeo.translate(0, L.screenY, 0.1);
  device.add(
    mesh(
      bezelGeo,
      track(new THREE.MeshPhysicalMaterial({ color: "#0c0a0e", roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.2, envMapIntensity: 0.15 })),
      false,
    ),
  );
  // rounded like the HTML screen on it, so no dark corner peeks out
  const screen = new THREE.Mesh(track(new THREE.ShapeGeometry(roundedRect(L.screenW, L.screenH, L.screenR), 12)), track(new THREE.MeshBasicMaterial({ color: "#0d0b10" })));
  screen.position.set(0, L.screenY, 1.16);
  device.add(screen);
  // (the glass glare is drawn in CSS over the HTML screen, since WebGL can't draw on top of it)

  // ---- the hologram lens on the bottom edge; the beam and bubble are HTML below
  const lens = new THREE.Mesh(
    track(new THREE.SphereGeometry(2.6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2)),
    track(new THREE.MeshPhysicalMaterial({ color: "#1b2a33", emissive: "#5fe3ff", emissiveIntensity: 0.9, roughness: 0.1, clearcoat: 1 })),
  );
  lens.rotation.x = Math.PI; // the dome faces down
  lens.position.set(0, -H / 2 - 3.2, -6);
  if (L.lens) device.add(lens);
  const lensMat = lens.material as THREE.MeshPhysicalMaterial;
  // dark until the screen has booted, then it lights and the hologram comes on
  let lensGoal = 0;
  let lensLevel = 0;

  // ---- wells and AO under every control
  const aoMat = track(new THREE.MeshBasicMaterial({ map: track(aoTexture()), transparent: true, opacity: 0.55, depthWrite: false }));
  const well = (x: number, y: number, r: number) => {
    const shade = new THREE.Mesh(track(new THREE.PlaneGeometry(r * 2.1, r * 2.1)), aoMat);
    shade.position.set(x, y, 0.05);
    device.add(shade);
  };

  // ---- D-pad: one piece that rocks on a pivot
  const [DX, DY] = L.dpad;
  well(DX, DY, 14.2 * L.ctl);
  const dpadPivot = new THREE.Group();
  dpadPivot.position.set(DX, DY, 0);
  dpadPivot.scale.setScalar(L.ctl);
  device.add(dpadPivot);
  // the same finish as the face buttons, so the two sides match
  const dpadMat = padMat;
  const dpad = mesh(
    new THREE.ExtrudeGeometry(crossShape(4.2, 11.6, 1.4), { depth: 3.4, bevelEnabled: true, bevelThickness: 1.3, bevelSize: 1, bevelSegments: 8, curveSegments: 12 }),
    dpadMat,
  );
  dpad.position.z = 0.6;
  dpadPivot.add(dpad);
  const dimple = new THREE.Mesh(track(new THREE.CircleGeometry(3.2, 32)), track(new THREE.MeshStandardMaterial({ color: "#151116", roughness: 0.7 })));
  dimple.position.z = 0.6 + 3.4 + 1.31;
  dpadPivot.add(dimple);
  const arrowMat = track(new THREE.MeshStandardMaterial({ color: "#5c5262", roughness: 0.5 }));
  const arrowGeo = track(new THREE.ExtrudeGeometry(triangleShape(1.6), { depth: 0.25, bevelEnabled: false }));
  for (const [ang, x, y] of [
    [0, 0, 8.2],
    [Math.PI, 0, -8.2],
    [Math.PI / 2, -8.2, 0],
    [-Math.PI / 2, 8.2, 0],
  ] as const) {
    const a = new THREE.Mesh(arrowGeo, arrowMat);
    a.position.set(x, y, 0.6 + 3.4 + 1.25);
    a.rotation.z = ang;
    dpadPivot.add(a);
  }

  // ---- face buttons: domed caps on their own springs (Cat host's PET / BACK / INSPECT / HOME)
  const [FX, FY] = L.face;
  const capGeo = track(
    new THREE.LatheGeometry(
      [[0, 5.2], [1.4, 5.16], [2.6, 5.02], [3.5, 4.78], [4.1, 4.42], [4.45, 4.0], [4.6, 3.5], [4.6, -0.6]]
        // bottom to top, or the lathe's faces point inward and the cap vanishes
        .reverse()
        .map(([x, y]) => new THREE.Vector2(x, y)),
      64,
    ),
  );
  const faceDefs: { key: Key3D; x: number; y: number; color: string; symbol: () => THREE.BufferGeometry }[] = [
    { key: "tri", x: 0, y: 9.4, color: "#59d39f", symbol: () => {
      const s = triangleShape(2.4);
      s.holes.push(triangleShape(1.5) as unknown as THREE.Path);
      return new THREE.ShapeGeometry(s, 4);
    } },
    { key: "cir", x: 9.4, y: 0, color: "#ff7d7d", symbol: () => new THREE.RingGeometry(1.45, 2.2, 40) },
    { key: "crs", x: 0, y: -9.4, color: "#80b3ff", symbol: () => {
      const a = new THREE.PlaneGeometry(4.8, 0.75);
      a.rotateZ(Math.PI / 4);
      const b = new THREE.PlaneGeometry(4.8, 0.75);
      b.rotateZ(-Math.PI / 4);
      const g = new THREE.BufferGeometry();
      const pa = a.attributes.position.array as Float32Array;
      const pb = b.attributes.position.array as Float32Array;
      const pos = new Float32Array(pa.length + pb.length);
      pos.set(pa);
      pos.set(pb, pa.length);
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.setIndex([...Array.from(a.index!.array), ...Array.from(b.index!.array).map((i) => i + pa.length / 3)]);
      g.computeVertexNormals();
      a.dispose();
      b.dispose();
      return g;
    } },
    { key: "sqr", x: -9.4, y: 0, color: "#ffa3d6", symbol: () => {
      const s = roundedRect(4.2, 4.2, 0.4);
      s.holes.push(roundedRect(2.8, 2.8, 0.2) as unknown as THREE.Path);
      return new THREE.ShapeGeometry(s, 4);
    } },
  ];
  const faceButtons: Partial<Record<Key3D, THREE.Group>> = {};
  for (const f of faceDefs) {
    well(FX + f.x * L.ctl, FY + f.y * L.ctl, 5.3 * L.ctl);
    const g = new THREE.Group();
    g.position.set(FX + f.x * L.ctl, FY + f.y * L.ctl, 0);
    g.scale.setScalar(L.ctl);
    const cap = new THREE.Mesh(capGeo, padMat);
    cap.rotation.x = Math.PI / 2;
    cap.castShadow = true;
    cap.receiveShadow = true;
    g.add(cap);
    const sym = new THREE.Mesh(
      track(f.symbol()),
      track(new THREE.MeshStandardMaterial({ color: f.color, emissive: f.color, emissiveIntensity: 0.7, roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -2 })),
    );
    sym.position.z = 5.22;
    g.add(sym);
    device.add(g);
    faceButtons[f.key] = g;
  }
  // (no printed button names: her call, the symbols say enough)

  // ---------------------------------------------------------------- pressing
  const springs: Record<Key3D, Spring> = {
    up: spring(), down: spring(), left: spring(), right: spring(),
    tri: spring(), cir: spring(), crs: spring(), sqr: spring(),
  };
  const click = makeClicker();
  const NOTE: Record<Key3D, number> = { left: 0, down: 1, up: 2, right: 3, sqr: 0, crs: 1, tri: 3, cir: 4 };
  const isPad = (k: Key3D) => k === "up" || k === "down" || k === "left" || k === "right";
  /** Sink a button and click; `act` also tells Cat host (a pointer press does, a key press already has). */
  const down = (k: Key3D, act: boolean) => {
    springs[k].target = 1;
    click(true, isPad(k) ? 0.9 : 1.05, NOTE[k]);
    if (act) onPress(k);
  };
  const up = (k: Key3D) => {
    if (springs[k].target === 0) return;
    springs[k].target = 0;
    click(false);
  };

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const lean = new THREE.Vector2();
  const leanGoal = new THREE.Vector2();
  const hitTargets: THREE.Object3D[] = [dpad, ...Object.values(faceButtons).map((g) => g!)];
  const canvas = renderer.domElement;
  let pointerKey: Key3D | null = null;
  let hovered: Key3D | null = null;
  const lift: Partial<Record<Key3D, number>> = {};
  const toNdc = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  };
  const keyAt = (): Key3D | null => {
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(hitTargets, true)[0];
    if (!hit) return null;
    if (hit.object === dpad) {
      const p = dpadPivot.worldToLocal(hit.point.clone());
      return Math.abs(p.x) > Math.abs(p.y) ? (p.x > 0 ? "right" : "left") : p.y > 0 ? "up" : "down";
    }
    for (let o: THREE.Object3D | null = hit.object; o; o = o.parent)
      for (const [k, g] of Object.entries(faceButtons)) if (g === o) return k as Key3D;
    return null;
  };
  const onDown = (e: PointerEvent) => {
    toNdc(e);
    const k = keyAt();
    if (!k) return;
    pointerKey = k;
    canvas.setPointerCapture(e.pointerId);
    down(k, true);
  };
  const onUp = () => {
    // lifting the finger is when iPhone lets sound start
    unlockAudio();
    if (pointerKey) up(pointerKey);
    pointerKey = null;
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    if (e.target === canvas) {
      toNdc(e);
      hovered = keyAt();
    } else hovered = null;
    // hold still while you aim at or press a button, so it doesn't slide away
    if (hovered || pointerKey) return;
    const r = host.getBoundingClientRect();
    // lean toward the pointer only while it is near the console
    const x = ((e.clientX - r.left) / r.width) * 2 - 1;
    const y = ((e.clientY - r.top) / r.height) * 2 - 1;
    leanGoal.set(Math.max(-1.4, Math.min(1.4, x)), Math.max(-1.4, Math.min(1.4, y)));
  };
  const onLeave = () => leanGoal.set(0, 0);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  window.addEventListener("pointermove", onMove);
  document.addEventListener("pointerleave", onLeave);

  // ---------------------------------------------------------------- frame
  let sized = { w: 0, h: 0 };

  // desk mode: the hologram's size in mm, so its words show at their CSS size
  // its CSS width (760px on wide screens, the phone's width on a phone)
  // the tall console's hologram is laid out wider as the console widens, so
  // its words keep the same size when it lands on the desk
  const holoPxW = () => desk?.holo.offsetWidth || 760;
  // as wide as the screen above it on wide screens (her call: bigger); on the
  // tall console as wide as the whole console, so the words take fewer lines
  /** On-screen px per laid-out px for the tall console's hologram (the size
   *  her phone's text came out right at). */
  const HOLO_TEXT_SCALE = 0.93;
  const HOLO_MM_W = shape === "tall" ? L.shellW : L.screenW;
  let holoMm = { w: 150, h: 70 };
  let holoPx = { w: holoPxW(), h: 300 };
  const camDir = new THREE.Vector3(0, Math.sin(PITCH), Math.cos(PITCH));
  const holoCorners = (wMm: number, hMm: number) => {
    // the top edge stays put just in front of the console; more text grows
    // down toward you (and may run past the stage, below the console)
    const up = new THREE.Vector3(0, Math.cos(HOLO_TILT), -Math.sin(HOLO_TILT)).multiplyScalar(hMm);
    const tl = new THREE.Vector3(-wMm / 2, DESK_Y + 10, HOLO_Z);
    const tr = new THREE.Vector3(wMm / 2, DESK_Y + 10, HOLO_Z);
    return [tl, tr, tr.clone().sub(up), tl.clone().sub(up)]; // TL TR BR BL
  };
  const fitDeskCamera = () => {
    scene.updateMatrixWorld();
    // everything that has to stay in frame: the console (with room to lean), the pad, the tallest hologram
    // (the shell's outside is 4mm past shellW/2; the wide one keeps room to
    // lean, the tall one runs nearly to the page's edges, her call)
    const edge = L.shellW / 2 + (shape === "wide" ? 7 : 4.5);
    const pts = [
      ...[-edge, edge].flatMap((x) => [
        new THREE.Vector3(x, (L.shellH / 2 + 4) * Math.cos(LEAN_BACK), -(L.shellH / 2) * Math.sin(LEAN_BACK)),
        // wide: a bit of desk in front too; tall: just the console, as big as it goes
        shape === "wide" ? new THREE.Vector3(x, DESK_Y, 20) : new THREE.Vector3(x, -(L.shellH / 2 + 4) * Math.cos(LEAN_BACK), (L.shellH / 2) * Math.sin(LEAN_BACK)),
      ]),
    ];
    // the canvas runs on below the console's stage (under the hologram), but
    // the console is framed in the stage part only, at its full size
    // the canvas runs past the console's box (under the hologram, out to the
    // page edges); the console is framed inside that box, at its full size
    const hr = host.getBoundingClientRect();
    const fr = (host.parentElement ?? host).getBoundingClientRect();
    const m = shape === "wide" ? 0.015 : 0.004;
    const xL = ((fr.left - hr.left) / hr.width) * 2 - 1 + m;
    const xR = ((fr.right - hr.left) / hr.width) * 2 - 1 - m;
    const yT = 1 - ((fr.top - hr.top) / hr.height) * 2 - m;
    const yB = 1 - ((fr.bottom - hr.top) / hr.height) * 2 + m;
    const wantMid = (yT + yB) / 2;
    // aim at the console itself when it's the small tall one: aiming in front of
    // it threw the perspective off and the camera backed away too far
    const target = shape === "wide" ? new THREE.Vector3(0, -20, 50) : new THREE.Vector3(0, 0, 0);
    const fits = (d: number) => {
      camera.position.copy(target).addScaledVector(camDir, d);
      camera.lookAt(target);
      camera.updateMatrixWorld();
      camera.updateProjectionMatrix();
      let lo = 1, hi = -1, ok = true;
      for (const p of pts) {
        const v = p.clone().project(camera);
        if (v.x < xL || v.x > xR) ok = false;
        lo = Math.min(lo, v.y);
        hi = Math.max(hi, v.y);
      }
      return { ok: ok && lo > yB && hi < yT, mid: (lo + hi) / 2, span: hi - lo };
    };
    // centre it top to bottom, then back off until it all fits
    // (centring moves where it needs to be, so repeat until it settles: the
    // tall console needed more than the 3 passes the wide one gets by with)
    for (let pass = 0; pass < 10; pass++) {
      let lo = 60;
      let hi = 3000;
      for (let i = 0; i < 30; i++) {
        const mid = (lo + hi) / 2;
        if (fits(mid).ok) hi = mid;
        else lo = mid;
      }
      const d = hi;
      const { mid } = fits(d);
      const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * d;
      const camUp = new THREE.Vector3(0, Math.cos(PITCH), -Math.sin(PITCH));
      target.addScaledVector(camUp, (mid - wantMid) * halfH);
      fits(d);
    }
    // HTML screen laid out at its size on the page
    const q = quad();
    const sw = Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]);
    sized = { w: Math.round(sw), h: Math.round((sw * L.screenH) / L.screenW) };
    screenEl.style.width = `${sized.w}px`;
    screenEl.style.height = `${sized.h}px`;
    screenEl.style.left = "0";
    screenEl.style.top = "0";
    // the bubbles are never smaller than their own CSS size (readable), and on
    // a big console they grow to the screen's width with it
    const c = holoCorners(100, 10).map((p) => p.clone().project(camera));
    const pxPer100 = (Math.abs(c[1].x - c[0].x) / 2) * host.clientWidth;
    // the tall console's hologram is laid out at a width that lands its words
    // at one size on screen, however big the console comes out (it grew with
    // the console before, and was huge on a big portrait window)
    if (desk && shape === "tall") desk.holo.style.width = `${Math.round((HOLO_MM_W * pxPer100) / 100 / HOLO_TEXT_SCALE)}px`;
    holoPx = { w: holoPxW(), h: holoPx.h };
    // (the tall one is laid out wider than it lands, so its words come out smaller)
    const wMm = shape === "tall" ? HOLO_MM_W : Math.max(HOLO_MM_W, (holoPx.w * 100) / pxPer100);
    holoMm = { w: wMm, h: (wMm * holoPx.h) / holoPx.w };
  };
  const resize = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    if (desk) {
      fitDeskCamera();
      return;
    }
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dist = Math.max(L.viewW / (2 * t * camera.aspect), (L.viewTop - L.viewBottom) / (2 * t));
    const cy = (L.viewTop + L.viewBottom) / 2;
    camera.position.set(0, cy, dist);
    camera.lookAt(0, cy, 0);
    camera.updateProjectionMatrix();
    // the HTML screen is laid out at the 3D screen's size on the page, so its
    // text and cards keep their sizes and the warp stays close to a plain move
    const sw = (L.screenW / L.viewW) * w;
    sized = { w: Math.round(sw), h: Math.round((sw * L.screenH) / L.screenW) };
    screenEl.style.width = `${sized.w}px`;
    screenEl.style.height = `${sized.h}px`;
    // the warp places it, from the stage's top left corner
    screenEl.style.left = "0";
    screenEl.style.top = "0";
  };

  const corner = new THREE.Vector3();
  const quad = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    // in desk mode the canvas runs past the screen's own box: shift by the difference
    let ox = 0;
    let oy = 0;
    if (desk && screenEl.offsetParent) {
      const hr = host.getBoundingClientRect();
      const pr = screenEl.offsetParent.getBoundingClientRect();
      ox = hr.left - pr.left;
      oy = hr.top - pr.top;
    }
    const sw = L.screenW / 2;
    const sh = L.screenH / 2;
    return [[-sw, sh], [sw, sh], [sw, -sh], [-sw, -sh]].map(([x, y]) => {
      const v = screen.localToWorld(corner.set(x, y, 0)).project(camera);
      return [ox + ((v.x + 1) / 2) * w, oy + ((1 - v.y) / 2) * h];
    });
  };

  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  let raf = 0;
  let last = performance.now();
  let lastTransform = "";
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    // In small steps: this spring is stiff, and one big step on a slow frame
    // (a hitch, a phone catching up) made it blow up and fling a button off
    // the console. Under 1/120 s a step it stays put whatever the frame rate.
    const steps = Math.ceil(dt * 120);
    const h = dt / steps;
    for (const s of Object.values(springs)) {
      for (let i = 0; i < steps; i++) {
        s.v += (1100 * (s.target - s.p) - 30 * s.v) * h;
        s.p += s.v * h;
      }
      // a button never travels past its well or above its rim
      s.p = Math.max(-0.3, Math.min(1.3, s.p));
    }
    const tilt = 0.13;
    dpadPivot.rotation.x = -(springs.up.p - springs.down.p) * tilt;
    dpadPivot.rotation.y = (springs.right.p - springs.left.p) * tilt;
    dpadPivot.position.z = -0.35 * Math.max(springs.up.p, springs.down.p, springs.left.p, springs.right.p);
    for (const [k, g] of Object.entries(faceButtons) as [Key3D, THREE.Group][]) {
      lift[k] = THREE.MathUtils.damp(lift[k] ?? 0, hovered === k ? 1 : 0, 18, dt);
      g.position.z = -1.6 * springs[k].p + 0.6 * lift[k]!;
    }
    // a small lean toward the pointer, a slow breath when left alone (her rule:
    // small tilt only, and very little up and down)
    lean.lerp(leanGoal, reduced ? 1 : 1 - Math.pow(0.02, dt));
    const t = now / 1000;
    device.rotation.y = lean.x * 0.03 + (reduced ? 0 : Math.sin(t * 0.6) * 0.006);
    device.rotation.x = (desk ? -LEAN_BACK : 0) + lean.y * 0.01 + (reduced ? 0 : Math.sin(t * 0.8) * 0.004);
    lensLevel = THREE.MathUtils.damp(lensLevel, lensGoal, 10, dt);
    lensMat.emissiveIntensity = lensLevel * (0.8 + 0.25 * Math.sin(t * 9) * Math.sin(t * 2.3));

    scene.updateMatrixWorld();
    if (sized.w) {
      const m = `matrix3d(${toMatrix3d(quad(), sized.w, sized.h).join(",")})`;
      if (m !== lastTransform) {
        screenEl.style.transform = m;
        lastTransform = m;
      }
    }
    if (desk) {
      const hh = desk.holo.offsetHeight;
      if (hh && hh !== holoPx.h) {
        holoMm.h = (holoMm.h / holoPx.h) * hh;
        holoPx = { w: holoPx.w, h: hh };
      }
      const cw = host.clientWidth;
      const ch = host.clientHeight;
      const hr = host.getBoundingClientRect();
      const sr = desk.stage.getBoundingClientRect();
      const ox = hr.left - sr.left;
      const oy = hr.top - sr.top;
      const hq = holoCorners(holoMm.w, holoMm.h).map((p) => {
        const v = p.project(camera);
        return [ox + ((v.x + 1) / 2) * cw, oy + ((1 - v.y) / 2) * ch];
      });
      const hm = `matrix3d(${toMatrix3d(hq, holoPx.w, holoPx.h).join(",")})`;
      if (hm !== lastHolo) {
        desk.holo.style.transform = hm;
        lastHolo = hm;
      }
      // under the tall console a long answer can reach past the room left for
      // it: grow the stage so the page scrolls to it instead of cutting it off
      if (shape === "tall") {
        const need = Math.ceil(Math.max(...hq.map((q) => q[1])) + 28);
        if (Math.abs(need - lastNeed) > 4) {
          lastNeed = need;
          desk.stage.style.minHeight = `max(100svh, ${need}px)`;
        }
      }
    }
    renderer.render(scene, camera);
  };
  let lastHolo = "";
  let lastNeed = 0;
  raf = requestAnimationFrame(tick);

  return {
    /** A key press Cat host already handled: just move the button. */
    /** Light the hologram lens (after the boot). */
    setLens(on: boolean) {
      lensGoal = on ? 1 : 0;
    },
    press(k: Key3D) {
      down(k, false);
      window.setTimeout(() => up(k), 140);
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      for (const d of disposables) d.dispose();
      canvas.remove();
      screenEl.style.transform = "";
      if (desk) {
        desk.holo.style.width = "";
        desk.stage.style.minHeight = "";
      }
      screenEl.style.width = "";
      screenEl.style.height = "";
      screenEl.style.left = "";
      screenEl.style.top = "";
      if (desk) desk.holo.style.transform = "";
    },
  };
}
