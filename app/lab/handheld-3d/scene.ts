// The handheld as a real object: geometry, materials, light, and buttons that
// move. Loaded lazily by Handheld3D (three is big). Units are millimetres.
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { MascotEngine, type Outfit } from "../../components/ps1-mascot/engine";
import { TUNE, type ItemId } from "../_kit/studio";
import { Dialogue, type BootStyle, type HoloLook, HOLO_H, HOLO_W, mountBoot, mountHolo } from "./dialogue";
import { playFlute } from "../_kit/fluteTone";
import { aoTexture, crossShape, glareTexture, grainTexture, makeClicker, printTexture, roundedRect, triangleShape, type ClickKind } from "../_kit/console-parts";

export type { ClickKind };


type Key = "up" | "down" | "left" | "right" | "tri" | "cir" | "crs" | "sqr" | "l" | "r";

const KEYS: Record<string, Key> = {
  w: "up", arrowup: "up",
  s: "down", arrowdown: "down",
  a: "left", arrowleft: "left",
  d: "right", arrowright: "right",
  " ": "tri", enter: "crs", backspace: "cir", f: "sqr",
  q: "l", e: "r",
};

const PINK = "#f2bdd0";

// ---------------------------------------------------------------- mount

type Spring = { p: number; v: number; target: number };
const spring = (): Spring => ({ p: 0, v: 0, target: 0 });

export function mountHandheld(host: HTMLElement) {
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
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(26, 1, 10, 2000);

  // key light from the upper left, like a desk lamp; it casts the real shadows
  const key = new THREE.DirectionalLight("#fff4e6", 2.2);
  key.position.set(-90, 120, 300);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = key.shadow.camera.bottom = -130;
  key.shadow.camera.right = key.shadow.camera.top = 130;
  key.shadow.camera.far = 800;
  key.shadow.bias = -0.0004;
  key.shadow.radius = 14;
  key.shadow.blurSamples = 20;
  key.shadow.normalBias = 0.4;
  scene.add(key);
  scene.add(new THREE.HemisphereLight("#fff6ee", "#d9b8a8", 0.35));

  // the page under the console, which only shows the shadow
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.ShadowMaterial({ opacity: 0.24 }));
  floor.position.z = -17;
  floor.receiveShadow = true;
  scene.add(floor);

  const device = new THREE.Group();
  scene.add(device);

  const grain = grainTexture();
  const disposables: { dispose(): void }[] = [grain, pmrem, renderer];
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

  const shellMat = plastic(PINK, 0.62, 0.45);
  // the controls: dense dark plastic with a crisp highlight, no milky sheen
  const padMat = track(
    new THREE.MeshPhysicalMaterial({
      color: "#1f1a22",
      roughness: 0.38,
      bumpMap: grain,
      bumpScale: 0.15,
      clearcoat: 0.8,
      clearcoatRoughness: 0.12,
      envMapIntensity: 0.9,
    }),
  );

  const mesh = (g: THREE.BufferGeometry, m: THREE.Material, cast = true) => {
    const x = new THREE.Mesh(track(g), m);
    x.castShadow = cast;
    x.receiveShadow = true;
    return x;
  };

  // ---- the shell: a pill, bevelled all round
  const W = 180;
  const H = 78;
  const shellGeo = new THREE.ExtrudeGeometry(roundedRect(W, H, H / 2), {
    depth: 8,
    bevelEnabled: true,
    bevelThickness: 4,
    bevelSize: 4,
    bevelSegments: 12,
    curveSegments: 64,
  });
  shellGeo.translate(0, 0, -12); // the face sits at z = 0
  device.add(mesh(shellGeo, shellMat));

  // ---- shoulder buttons along the top edge
  const shoulders: Record<"l" | "r", THREE.Mesh> = {
    l: mesh(new RoundedBoxGeometry(36, 6, 9, 4, 2.4), plastic("#d998b2", 0.55)),
    r: mesh(new RoundedBoxGeometry(36, 6, 9, 4, 2.4), plastic("#d998b2", 0.55)),
  };
  shoulders.l.position.set(-46, H / 2 - 0.5, -8);
  shoulders.r.position.set(46, H / 2 - 0.5, -8);
  device.add(shoulders.l, shoulders.r);

  // ---- the screen: a glossy black bezel, the cat's studio, glass over it
  const bezelGeo = new THREE.ExtrudeGeometry(roundedRect(111.6, 64.6, 3.4), {
    depth: 0.4,
    bevelEnabled: true,
    bevelThickness: 0.6,
    bevelSize: 0.8,
    bevelSegments: 4,
    curveSegments: 24,
  });
  bezelGeo.translate(0, 0, 0.1);
  const bezel = mesh(
    bezelGeo,
    track(new THREE.MeshPhysicalMaterial({ color: "#0c0a0e", roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.2, envMapIntensity: 0.15 })),
    false,
  );
  device.add(bezel);

  const SW = 108;
  const SH = SW * (9 / 16);
  const screenCanvas = document.createElement("canvas");
  const screenTex = track(new THREE.CanvasTexture(screenCanvas));
  screenTex.colorSpace = THREE.SRGBColorSpace;
  screenTex.magFilter = THREE.NearestFilter;
  screenTex.minFilter = THREE.LinearFilter;
  screenTex.generateMipmaps = false;
  const screen = new THREE.Mesh(
    track(new THREE.PlaneGeometry(SW, SH)),
    track(new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false })),
  );
  screen.position.set(0, 0, 1.16);
  device.add(screen);

  // ---- the hologram: a lens on the top edge, a beam, a panel in the air
  const holoGroup = new THREE.Group();
  device.add(holoGroup);
  const lens = new THREE.Mesh(
    track(new THREE.SphereGeometry(2.6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2)),
    track(new THREE.MeshPhysicalMaterial({ color: "#1b2a33", emissive: "#5fe3ff", emissiveIntensity: 0.9, roughness: 0.1, clearcoat: 1 })),
  );
  lens.position.set(0, H / 2 + 3.2, -6);
  holoGroup.add(lens);
  const PW = 150;
  const PH = PW * (HOLO_H / HOLO_W);
  const holoPanel = new THREE.Object3D(); // only its corners matter; the HTML draws it
  holoPanel.position.set(0, H / 2 + 14 + PH / 2, 2);
  holoPanel.rotation.x = -0.1;
  holoGroup.add(holoPanel);
  // the beam: a pyramid of light from the lens to the panel's lower corners,
  // built at the lens tip so it can grow out of it when the hologram boots
  const tip = lens.position.clone();
  tip.y += 1.5;
  const beamGroup = new THREE.Group();
  beamGroup.position.copy(tip);
  holoGroup.add(beamGroup);
  holoPanel.updateMatrix();
  const corner = (x: number, y: number) => new THREE.Vector3(x, y, 0).applyMatrix4(holoPanel.matrix).sub(tip);
  const pc = [corner(-PW / 2, -PH / 2), corner(PW / 2, -PH / 2), corner(PW / 2, PH / 2), corner(-PW / 2, PH / 2)];
  const beamMat = track(
    new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
  );
  {
    const pos: number[] = [];
    const col: number[] = [];
    const o = new THREE.Vector3();
    const tri = (a: THREE.Vector3, b: THREE.Vector3, al: number, bl: number) => {
      pos.push(o.x, o.y, o.z, a.x, a.y, a.z, b.x, b.y, b.z);
      col.push(0.45, 0.9, 1, 0.42, 0.45, 0.9, 1, al, 0.45, 0.9, 1, bl);
    };
    tri(pc[0], pc[1], 0.05, 0.05); // the floor of the beam, seen most
    tri(pc[1], pc[2], 0.05, 0.0);
    tri(pc[3], pc[0], 0.0, 0.05);
    // a brighter core straight up the middle
    const mid = pc[0].clone().lerp(pc[1], 0.5);
    tri(mid.clone().setX(-PW * 0.12), mid.clone().setX(PW * 0.12), 0.08, 0.08);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 4));
    beamGroup.add(new THREE.Mesh(track(g), beamMat));
  }
  // dust in the light, drifting up from the lens to the panel
  const DUST = 36;
  const dustT = Float32Array.from({ length: DUST }, () => Math.random());
  const dustEnd = Array.from({ length: DUST }, () => pc[0].clone().lerp(pc[1], Math.random()).lerp(pc[3], Math.random() * 0.15));
  const dustPos = new Float32Array(DUST * 3);
  const dustGeo = track(new THREE.BufferGeometry());
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dotTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 32;
    const g = c.getContext("2d")!;
    const rg = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    rg.addColorStop(0, "rgba(255,255,255,1)");
    rg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = rg;
    g.fillRect(0, 0, 32, 32);
    return track(new THREE.CanvasTexture(c));
  })();
  const dust = new THREE.Points(
    dustGeo,
    track(new THREE.PointsMaterial({ map: dotTex, color: "#9ff0ff", size: 1.6, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })),
  );
  beamGroup.add(dust);
  const lensMat = lens.material as THREE.MeshPhysicalMaterial;

  // the dialogue, shown as the hologram
  const dlg = new Dialogue();
  const holo = mountHolo(host, dlg);
  const boot = mountBoot(host);
  dlg.onAction = (a) => {
    if (/^https?:/.test(a.href)) window.open(a.href, "_blank", "noopener");
    else window.location.assign(a.href);
  };

  const glare = new THREE.Mesh(
    track(new THREE.PlaneGeometry(SW + 3, SH + 3)),
    track(new THREE.MeshBasicMaterial({ map: track(glareTexture()), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })),
  );
  glare.position.set(0, 0, 1.3);
  device.add(glare);

  const decal = (tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(
      track(new THREE.PlaneGeometry(w, h)),
      track(new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.6, depthWrite: false })),
    );
    m.position.set(x, y, z);
    device.add(m);
    return m;
  };
  // (the bezel is too thin now for a wordmark or an LED)

  // the cat's studio, rendered by the existing mascot engine onto the screen
  let engine: MascotEngine | null = null;
  let fresh = false;
  try {
    engine = new MascotEngine(screenCanvas);
    engine.setCharacter("cat");
    engine.setScene("studio");
    // a closer look at the desk than the page version: this screen is wide and
    // everything on it read too small (her call, Nov 5)
    const eng = engine as unknown as { setup: { fov: number; fitWidth?: number; fitHeight?: number } };
    const z = 0.8;
    eng.setup = {
      ...eng.setup,
      fov: eng.setup.fov * z,
      fitWidth: eng.setup.fitWidth && eng.setup.fitWidth * z,
      fitHeight: eng.setup.fitHeight && eng.setup.fitHeight * z,
    };
    engine.setResolution(356, 200);
    // with the words in the air, the screen is all room
    engine.setReserve(0);
    const r = (engine as unknown as { renderer: THREE.WebGLRenderer }).renderer;
    const draw = r.render.bind(r);
    r.render = (s, c) => {
      draw(s, c);
      fresh = true;
    };
    engine.start();
  } catch {
    const g = screenCanvas.getContext("2d");
    screenCanvas.width = 356;
    screenCanvas.height = 200;
    if (g) {
      g.fillStyle = "#141826";
      g.fillRect(0, 0, 356, 200);
    }
    screenTex.needsUpdate = true;
  }

  // picking things on screen: the dialogue drives, the engine shows it
  let closetWear: Outfit[] = [];
  const dress = (id: ItemId | null) => {
    if (!engine) return;
    const near = (...ids: ItemId[]) => id !== null && ids.includes(id);
    const cap = near("diploma") || closetWear.includes("cap");
    engine.wear("cap", cap);
    engine.wear("glasses", near("laptop") || closetWear.includes("glasses"));
    engine.wear("apron", near("cookies", "jar") || closetWear.includes("apron"));
    // the cap sits where the beret does, so the cap wins while it's on
    engine.wear("bow", closetWear.includes("bow"));
    engine.wear("beret", closetWear.includes("beret") && !cap);
  };
  dlg.stage = {
    focus: (id, close) => {
      engine?.select(id, close);
      dress(id);
    },
    mood: (m) => engine?.setMood(m),
    wear: (o) => {
      closetWear = o;
      dress(null);
    },
    tune: () => TUNE.forEach((f, i) => setTimeout(() => playFlute(f, 0.28), 300 + i * 260)),
  };

  // ---- wells and AO under every control
  const ao = track(aoTexture());
  const aoMat = track(new THREE.MeshBasicMaterial({ map: ao, transparent: true, opacity: 0.55, depthWrite: false }));
  // no rings or dishes around the controls; just the soft contact shade under each
  const well = (x: number, y: number, r: number) => {
    const shade = new THREE.Mesh(track(new THREE.PlaneGeometry(r * 2.1, r * 2.1)), aoMat);
    shade.position.set(x, y, 0.05);
    device.add(shade);
  };

  // ---- D-pad: one piece that rocks on a pivot, like the real thing
  const DX = -72;
  well(DX, 2, 14.2);
  const dpadPivot = new THREE.Group();
  dpadPivot.position.set(DX, 2, 0);
  device.add(dpadPivot);
  const dpadGeo = new THREE.ExtrudeGeometry(crossShape(4.2, 11.6, 1.4), {
    depth: 3.4,
    bevelEnabled: true,
    bevelThickness: 1.3,
    bevelSize: 1,
    bevelSegments: 8,
    curveSegments: 12,
  });
  // satin, not gloss: its big flat top would mirror the room and turn gray
  const dpadMat = padMat.clone();
  dpadMat.clearcoat = 0.25;
  dpadMat.clearcoatRoughness = 0.4;
  dpadMat.roughness = 0.55;
  dpadMat.envMapIntensity = 0.45;
  track(dpadMat);
  const dpad = mesh(dpadGeo, dpadMat);
  dpad.position.z = 0.6;
  dpadPivot.add(dpad);
  // a shallow dimple in the middle, and raised arrows on each arm
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

  // ---- face buttons: domed caps on their own springs
  const FX = 72;
  const capProfile = [
    [0, 5.2], [1.4, 5.16], [2.6, 5.02], [3.5, 4.78], [4.1, 4.42], [4.45, 4.0], [4.6, 3.5], [4.6, -0.6],
  ]
    // bottom to top, or the lathe's faces point inward and the cap vanishes
    .reverse()
    .map(([x, y]) => new THREE.Vector2(x, y));
  const capGeo = track(new THREE.LatheGeometry(capProfile, 64));
  const symbolZ = 5.22;
  const faceDefs: { key: Key; x: number; y: number; color: string; symbol: () => THREE.BufferGeometry }[] = [
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
      const ia = Array.from(a.index!.array);
      g.setIndex([...ia, ...Array.from(b.index!.array).map((i) => i + pa.length / 3)]);
      g.computeVertexNormals();
      return g;
    } },
    { key: "sqr", x: -9.4, y: 0, color: "#ffa3d6", symbol: () => {
      const s = roundedRect(4.2, 4.2, 0.4);
      s.holes.push(roundedRect(2.8, 2.8, 0.2) as unknown as THREE.Path);
      return new THREE.ShapeGeometry(s, 4);
    } },
  ];
  const faceButtons: Partial<Record<Key, THREE.Group>> = {};
  for (const f of faceDefs) {
    well(FX + f.x, 2 + f.y, 5.3);
    const g = new THREE.Group();
    g.position.set(FX + f.x, 2 + f.y, 0);
    const cap = new THREE.Mesh(capGeo, padMat);
    cap.rotation.x = Math.PI / 2;
    cap.castShadow = true;
    cap.receiveShadow = true;
    g.add(cap);
    const sym = new THREE.Mesh(
      track(f.symbol()),
      track(new THREE.MeshStandardMaterial({ color: f.color, emissive: f.color, emissiveIntensity: 0.7, roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -2 })),
    );
    sym.position.z = symbolZ;
    g.add(sym);
    device.add(g);
    faceButtons[f.key] = g;
  }
  // printed names beside the face buttons
  const ink = "#9a5a76";
  decal(track(printTexture("PET", ink)), 8, 2, FX, 2 + 16.8, 0.06);
  decal(track(printTexture("INSPECT", ink)), 11.5, 2, FX, 2 - 16.8, 0.06);
  decal(track(printTexture("BACK", ink)), 9, 2, FX + 19.2, 2, 0.06).rotation.z = -Math.PI / 2;
  decal(track(printTexture("HOME", ink)), 9, 2, FX - 19.2, 2, 0.06).rotation.z = Math.PI / 2;

  // ---------------------------------------------------------------- motion
  const springs: Record<Key, Spring> = {
    up: spring(), down: spring(), left: spring(), right: spring(),
    tri: spring(), cir: spring(), crs: spring(), sqr: spring(), l: spring(), r: spring(),
  };
  const click = makeClicker();
  const KEY_NOTE: Record<Key, number> = { left: 0, down: 1, up: 2, right: 3, sqr: 0, crs: 1, tri: 3, cir: 4, l: 2, r: 4 };
  const held = new Set<Key>();
  const press = (k: Key) => {
    if (held.has(k)) return;
    held.add(k);
    springs[k].target = 1;
    click(true, k === "l" || k === "r" ? 0.8 : ["up", "down", "left", "right"].includes(k) ? 0.9 : 1.05, KEY_NOTE[k]);
    if (k === "tri") engine?.react();
    // left and right pick things on screen; up and down move through the conversation
    if (k === "left" || k === "right") dlg.browse(k === "left" ? -1 : 1);
    if (k === "up" || k === "down") dlg.press(k);
    if (k === "crs") dlg.press("a");
    if (k === "cir") dlg.press("b");
  };
  const release = (k: Key) => {
    if (!held.delete(k)) return;
    springs[k].target = 0;
    click(false);
  };

  // keyboard
  const onKeyDown = (e: KeyboardEvent) => {
    const k = KEYS[e.key.toLowerCase()];
    if (!k) return;
    e.preventDefault();
    press(k);
  };
  const onKeyUp = (e: KeyboardEvent) => {
    const k = KEYS[e.key.toLowerCase()];
    if (k) release(k);
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  // pointer: press what's under it; the device leans toward the mouse
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const lean = new THREE.Vector2();
  const leanGoal = new THREE.Vector2();
  const hitTargets: THREE.Object3D[] = [dpad, shoulders.l, shoulders.r, ...Object.values(faceButtons).map((g) => g!)];
  let pointerKey: Key | null = null;
  let hovered: Key | null = null;
  const lift: Record<string, number> = {};
  const canvas = renderer.domElement;
  const toNdc = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  };
  const keyAt = (): Key | null => {
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(hitTargets, true)[0];
    if (!hit) return null;
    let o: THREE.Object3D | null = hit.object;
    if (o === shoulders.l) return "l";
    if (o === shoulders.r) return "r";
    if (o === dpad) {
      const p = dpadPivot.worldToLocal(hit.point.clone());
      return Math.abs(p.x) > Math.abs(p.y) ? (p.x > 0 ? "right" : "left") : p.y > 0 ? "up" : "down";
    }
    while (o) {
      for (const [k, g] of Object.entries(faceButtons)) if (g === o) return k as Key;
      o = o.parent;
    }
    return null;
  };
  /** Where the pointer is on the screen, 0..1 from its top left, or null. */
  const screenAt = () => {
    ray.setFromCamera(ndc, camera);
    const uv = ray.intersectObject(screen)[0]?.uv;
    return uv ? { x: uv.x, y: 1 - uv.y } : null;
  };
  const onDown = (e: PointerEvent) => {
    toNdc(e);
    const at = screenAt();
    if (at && engine) {
      if (engine.hitCharacter(at.x, at.y)) {
        engine.react();
        return;
      }
      const id = engine.pick(at.x, at.y) as ItemId | null;
      if (id) {
        click(true, 1);
        dlg.tap(id);
        return;
      }
    }
    const k = keyAt();
    if (!k) return;
    pointerKey = k;
    canvas.setPointerCapture(e.pointerId);
    press(k);
  };
  const onUp = () => {
    if (pointerKey) release(pointerKey);
    pointerKey = null;
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    if (e.target === canvas) {
      toNdc(e);
      hovered = keyAt();
      const at = screenAt();
      engine?.hover(at ? engine.pick(at.x, at.y) : null);
    } else {
      hovered = null;
      engine?.hover(null);
    }
    const r = host.getBoundingClientRect();
    leanGoal.set(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
  };
  const onLeave = () => leanGoal.set(0, 0);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  window.addEventListener("pointermove", onMove);
  document.addEventListener("pointerleave", onLeave);

  // ---------------------------------------------------------------- power on
  // The screen tunes to A, the room fades in, then the lens lights, the beam
  // grows out of it and the hologram unfolds. Seconds from power on:
  const BOOTS = {
    chime: { inTune: 1.35, fade: 1.95, room: 2.5, lens: 2.45, beam: 2.7, panel: 3.0 },
    tuner: { inTune: 1.5, fade: 2.0, room: 2.4, lens: 2.5, beam: 2.75, panel: 3.05 },
  };
  let bootStyle: BootStyle = "chime";
  let B = BOOTS[bootStyle];
  let bootAt: number | null = null;
  let bootPhase = -1;
  let bootSound = false;
  const powerOn = (sound = false) => {
    bootAt = performance.now();
    bootPhase = -1;
    bootSound = sound;
    holo.setVisible(false);
  };

  // ---------------------------------------------------------------- frame
  const resize = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const top = 132; // room above the console for the hologram
    const bottom = -46;
    const dist = Math.max(206 / (2 * t * camera.aspect), (top - bottom) / (2 * t));
    const cy = (top + bottom) / 2;
    camera.position.set(0, cy - dist * 0.06, dist);
    camera.lookAt(0, cy, 0);
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  let raf = 0;
  let last = performance.now();
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    // springs: a little overshoot on the way back up, like a rubber dome
    for (const s of Object.values(springs)) {
      const a = 1100 * (s.target - s.p) - 30 * s.v;
      s.v += a * dt;
      s.p += s.v * dt;
    }
    const tilt = 0.13;
    dpadPivot.rotation.x = -(springs.up.p - springs.down.p) * tilt;
    dpadPivot.rotation.y = (springs.right.p - springs.left.p) * tilt;
    dpadPivot.position.z = -0.35 * Math.max(springs.up.p, springs.down.p, springs.left.p, springs.right.p);
    for (const [k, g] of Object.entries(faceButtons)) {
      lift[k] = THREE.MathUtils.damp(lift[k] ?? 0, hovered === k ? 1 : 0, 18, dt);
      g!.position.z = -1.6 * springs[k as Key].p + 0.6 * lift[k];
    }
    shoulders.l.position.y = H / 2 - 0.5 - 1.4 * springs.l.p;
    shoulders.r.position.y = H / 2 - 0.5 - 1.4 * springs.r.p;

    // lean toward the pointer, and breathe a little when left alone
    lean.lerp(leanGoal, reduced ? 1 : 1 - Math.pow(0.02, dt));
    const t = now / 1000;
    device.rotation.y = lean.x * 0.13 + (reduced ? 0 : Math.sin(t * 0.6) * 0.012);
    device.rotation.x = -0.04 + lean.y * 0.035 + (reduced ? 0 : Math.sin(t * 0.8) * 0.008);

    // power on
    const quadOf = (o: THREE.Object3D, qw: number, qh: number) => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      return [[-qw / 2, qh / 2], [qw / 2, qh / 2], [qw / 2, -qh / 2], [-qw / 2, -qh / 2]].map(([x, y]) => {
        const v = o.localToWorld(new THREE.Vector3(x, y, 0)).project(camera);
        return [((v.x + 1) / 2) * w, ((1 - v.y) / 2) * h];
      });
    };
    let lensOn = 1;
    let beamOn = 1;
    if (bootAt !== null) {
      const bt = reduced ? 99 : (now - bootAt) / 1000;
      const phase = bt < B.inTune ? 0 : bt < B.fade ? 1 : bt < B.room ? 2 : 3;
      if (phase !== bootPhase) {
        if (phase === 1 && bootSound) {
          if (bootStyle === "tuner") playFlute(442, 1.1);
          // a rising A major arpeggio, the last note held
          else [440, 554.37, 659.25, 880].forEach((f, i) => setTimeout(() => playFlute(f, i === 3 ? 0.9 : 0.3), i * 110));
        }
        bootPhase = phase;
        boot.setPhase(phase);
      }
      scene.updateMatrixWorld();
      if (phase < 3) boot.update(quadOf(screen, SW, SH));
      lensOn = THREE.MathUtils.clamp((bt - B.lens) / 0.3, 0, 1);
      beamOn = THREE.MathUtils.clamp((bt - B.beam) / 0.35, 0, 1);
      if (bt >= B.panel) {
        bootAt = null;
        holo.setVisible(true);
      }
    }
    const t2 = now / 1000;
    lensMat.emissiveIntensity = lensOn * (0.8 + 0.25 * Math.sin(t2 * 9) * Math.sin(t2 * 2.3));
    const grow = 1 - Math.pow(1 - beamOn, 3);
    beamGroup.scale.setScalar(Math.max(0.0001, grow));
    // a light that is never quite steady
    beamMat.opacity = beamOn * (0.85 + 0.15 * Math.sin(t2 * 17) * Math.sin(t2 * 5.1));
    for (let i = 0; i < DUST; i++) {
      dustT[i] = (dustT[i] + dt * (0.18 + (i % 5) * 0.03)) % 1;
      const e = dustEnd[i];
      const k = dustT[i];
      dustPos[i * 3] = e.x * k + Math.sin(t2 * 1.3 + i) * 0.6;
      dustPos[i * 3 + 1] = e.y * k;
      dustPos[i * 3 + 2] = e.z * k;
    }
    dustGeo.attributes.position.needsUpdate = true;
    (dust.material as THREE.PointsMaterial).opacity = beamOn * 0.9;

    dlg.tick(dt);
    if (fresh) {
      screenTex.needsUpdate = true;
      fresh = false;
    }
    scene.updateMatrixWorld();
    holo.update(quadOf(holoPanel, PW, PH));
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(tick);

  holoGroup.visible = true;
  powerOn();

  const dispose = () => {
    cancelAnimationFrame(raf);
    holo.dispose();
    boot.dispose();
    ro.disconnect();
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerleave", onLeave);
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointerup", onUp);
    canvas.removeEventListener("pointercancel", onUp);
    engine?.dispose();
    for (const d of disposables) d.dispose();
    canvas.remove();
  };
  const setBoot = (b: BootStyle) => {
    bootStyle = b;
    B = BOOTS[b];
    boot.setStyle(b);
    powerOn(true);
  };
  return { dispose, powerOn, setLook: (l: HoloLook) => holo.setLook(l), setBoot, setClick: click.setKind };
}
