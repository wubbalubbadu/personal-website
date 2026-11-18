// A cartoon Manhattan on a round toy plate: toon shading, ink outlines,
// clouds, boats, a little train in from Boston, and the two of you as bean
// people who hop to wherever you tap. Pin labels are HTML buttons the scene
// moves each frame, so they stay crisp and tappable. Loaded lazily.
import * as THREE from "three";
import { LIBERTY, PARK_CORNERS, SHORE, SPOT, TUNNEL, toMap } from "./trip";

const INK = 0x2b1d2e;

export type Pin = { id: string; lat: number; lng: number; color: string; small?: boolean };

export type SceneApi = {
  bindLabel(id: string, el: HTMLElement | null): void;
  setPins(pins: Pin[]): void;
  setYou(at: { lat: number; lng: number } | null): void;
  focus(id: string | null): void;
  playArrival(): void;
  setSnow(on: boolean): void;
  dispose(): void;
};

// ---------------------------------------------------------------- helpers

function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function inside(poly: [number, number][], x: number, z: number) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const mapXZ = (lat: number, lng: number) => {
  const p = toMap(lat, lng);
  return new THREE.Vector3(p.x, 0, p.z);
};

// ---------------------------------------------------------------- mount

export function mountScene(canvas: HTMLCanvasElement, opts: { reduced: boolean }): SceneApi {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.5, 220);

  const disposables: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(x: T) => (disposables.push(x), x);

  const ramp = keep(new THREE.DataTexture(new Uint8Array([95, 175, 255]), 3, 1, THREE.RedFormat));
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
  ramp.needsUpdate = true;
  const toon = (color: THREE.ColorRepresentation) => keep(new THREE.MeshToonMaterial({ color, gradientMap: ramp }));
  const flat = (color: THREE.ColorRepresentation) => keep(new THREE.MeshBasicMaterial({ color }));
  const inkMat = keep(new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide }));

  scene.add(new THREE.HemisphereLight(0xfff4f8, 0xb9d6ff, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(6, 12, 5);
  scene.add(sun);

  /** A mesh plus a slightly fatter black copy behind it: the cartoon outline. */
  function inked(geo: THREE.BufferGeometry, mat: THREE.Material, grow = 0.05) {
    keep(geo);
    const g = new THREE.Group();
    const o = new THREE.Mesh(geo, inkMat);
    geo.computeBoundingBox();
    const s = new THREE.Vector3();
    geo.boundingBox!.getSize(s);
    o.scale.set(1 + grow / Math.max(s.x, 0.01), 1 + grow / Math.max(s.y, 0.01), 1 + grow / Math.max(s.z, 0.01));
    g.add(o, new THREE.Mesh(geo, mat));
    return g;
  }

  // ---- geometry of the city, from real coordinates
  const ISLAND = SHORE.map(([lat, lng]) => {
    const p = toMap(lat, lng);
    return [p.x, p.z] as [number, number];
  });
  const sw = toMap(PARK_CORNERS.sw[0], PARK_CORNERS.sw[1]);
  const ne = toMap(PARK_CORNERS.ne[0], PARK_CORNERS.ne[1]);
  const PARK = { x0: sw.x, x1: ne.x, z0: ne.z, z1: sw.z };
  const liberty = mapXZ(LIBERTY[0], LIBERTY[1]);
  const xs = ISLAND.map((p) => p[0]);
  const zs = ISLAND.map((p) => p[1]);
  const box = { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
  const plateC = new THREE.Vector3(0, 0, (box.z0 + liberty.z) / 2);
  const plateR = (liberty.z - box.z0) / 2 + 2.5;
  // grid z of a few streets, for how tall the buildings are
  const Z = { s59: -6, s30: -0.2, s14: 3, chambers: toMap(40.7142, -74.0064).z };

  // ---- plate and water
  {
    const water = toon(0x86cdf5);
    const rim = toon(0xfff1dc);
    const plate = new THREE.Mesh(keep(new THREE.CylinderGeometry(plateR, plateR, 1.4, 96)), [rim, water, rim]);
    plate.position.set(plateC.x, -0.95, plateC.z);
    const plateInk = new THREE.Mesh(keep(new THREE.CylinderGeometry(plateR + 0.14, plateR + 0.14, 1.56, 96)), inkMat);
    plateInk.position.copy(plate.position);
    scene.add(plateInk, plate);

    // little white wave dashes
    const rnd = seeded(7);
    const geo = keep(new THREE.CapsuleGeometry(0.05, 0.45, 2, 6));
    geo.rotateZ(Math.PI / 2);
    const waves = new THREE.InstancedMesh(geo, keep(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })), 70);
    const m = new THREE.Matrix4();
    for (let n = 0; n < 70; ) {
      const a = rnd() * Math.PI * 2;
      const r = 2 + rnd() * (plateR - 3);
      const x = plateC.x + Math.cos(a) * r;
      const z = plateC.z + Math.sin(a) * r;
      if (x > box.x0 - 1 && x < box.x1 + 1 && z > box.z0 - 1 && z < box.z1 + 1) continue;
      waves.setMatrixAt(n++, m.makeTranslation(x, -0.22, z));
    }
    scene.add(waves);
  }

  // ---- island, with an outward offset black copy under it for the outline
  {
    let area = 0;
    for (let i = 0; i < ISLAND.length; i++) {
      const [x1, z1] = ISLAND[i];
      const [x2, z2] = ISLAND[(i + 1) % ISLAND.length];
      area += x1 * z2 - x2 * z1;
    }
    const out = area > 0 ? 1 : -1;
    const offset = ISLAND.map(([x, z], i) => {
      const [px, pz] = ISLAND[(i - 1 + ISLAND.length) % ISLAND.length];
      const [nx, nz] = ISLAND[(i + 1) % ISLAND.length];
      let ox = -(nz - pz);
      let oz = nx - px;
      const len = Math.hypot(ox, oz) || 1;
      ox = (ox / len) * out;
      oz = (oz / len) * out;
      return [x + ox * 0.16, z + oz * 0.16] as [number, number];
    });
    const extrude = (pts: [number, number][]) => {
      const g = keep(new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z))), { depth: 0.55, bevelEnabled: false }));
      g.rotateX(-Math.PI / 2);
      return g;
    };
    const land = new THREE.Mesh(extrude(ISLAND), toon(0xf3e6d6));
    land.position.y = -0.55;
    const landInk = new THREE.Mesh(extrude(offset), flat(INK));
    landInk.position.y = -0.57;
    scene.add(landInk, land);

    const park = inked(new THREE.BoxGeometry(PARK.x1 - PARK.x0, 0.08, PARK.z1 - PARK.z0), toon(0x7fd58f), 0.08);
    park.position.set((PARK.x0 + PARK.x1) / 2, 0.04, (PARK.z0 + PARK.z1) / 2);
    scene.add(park);
    // the reservoir and the lake
    const water = toon(0x86cdf5);
    for (const [x, z, sx, sz] of [[0.15, -11.6, 1.5, 1.1], [-0.2, -8.6, 0.8, 0.45]]) {
      const pond = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 24)), water);
      pond.scale.set(sx, 1, sz);
      pond.position.set(x, 0.06, z);
      scene.add(pond);
    }
    const rnd = seeded(3);
    const crown = keep(new THREE.IcosahedronGeometry(0.26, 0));
    const leaves = [0x58c27a, 0xf2a541, 0xe8664a, 0x9bd36a, 0xf7c548].map(toon);
    for (let i = 0; i < 60; i++) {
      const x = PARK.x0 + 0.2 + rnd() * (PARK.x1 - PARK.x0 - 0.4);
      const z = PARK.z0 + 0.25 + rnd() * (PARK.z1 - PARK.z0 - 0.5);
      if (Math.hypot((x - 0.15) / 0.85, (z + 11.6) / 0.65) < 1) continue;
      const t = new THREE.Mesh(crown, leaves[i % leaves.length]);
      const s = 0.7 + rnd() * 0.6;
      t.scale.setScalar(s);
      t.position.set(x, 0.28 * s + 0.1, z);
      t.rotation.y = rnd() * 3;
      scene.add(t);
    }
  }

  // ---- buildings: one instanced mesh for colour, one for the ink
  const landmarkIds = ["hotel", "penn", "times", "empire"];
  const landmarks = landmarkIds.map((id) => mapXZ(SPOT[id].lat, SPOT[id].lng));
  const lots: { x: number; z: number; w: number; d: number; h: number }[] = [];
  {
    const rnd = seeded(11);
    for (let z = box.z0 + 0.4; z < box.z1; z += 0.72) {
      for (let x = box.x0; x < box.x1; x += 0.62) {
        if (!inside(ISLAND, x, z) || !inside(ISLAND, x + 0.3, z + 0.3) || !inside(ISLAND, x - 0.3, z - 0.3)) continue;
        if (x > PARK.x0 - 0.3 && x < PARK.x1 + 0.3 && z > PARK.z0 - 0.3 && z < PARK.z1 + 0.3) continue;
        if (landmarks.some((l) => Math.hypot(l.x - x, l.z - z) < 0.5)) continue;
        if (rnd() < 0.08) continue;
        let h: number;
        if (z > Z.chambers) h = 1 + rnd() * 2.4; // financial district
        else if (z > Z.s14) h = 0.35 + rnd() * 0.55; // village, soho, chinatown
        else if (z > Z.s30) h = 0.6 + rnd() * 1; // chelsea, flatiron
        else if (z > Z.s59 - 0.6) h = 1.2 + rnd() * 2.6; // midtown
        else h = 0.6 + rnd() * 0.8; // uptown
        lots.push({ x: x + (rnd() - 0.5) * 0.08, z, w: 0.42 + rnd() * 0.12, d: 0.5 + rnd() * 0.1, h });
      }
    }
    const geo = keep(new THREE.BoxGeometry(1, 1, 1));
    geo.translate(0, 0.5, 0);
    const colors = [0xfff3e0, 0xffd6b8, 0xffc2d6, 0xd9c8ff, 0xc4e3ff, 0xc9f2dc, 0xfff0a8, 0xf4b39a];
    const body = new THREE.InstancedMesh(geo, toon(0xffffff), lots.length);
    const ink = new THREE.InstancedMesh(geo, inkMat, lots.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const c = new THREE.Color();
    lots.forEach((l, i) => {
      body.setMatrixAt(i, m.compose(new THREE.Vector3(l.x, 0, l.z), q, new THREE.Vector3(l.w, l.h, l.d)));
      ink.setMatrixAt(i, m.compose(new THREE.Vector3(l.x, -0.03, l.z), q, new THREE.Vector3(l.w + 0.07, l.h + 0.07, l.d + 0.07)));
      body.setColorAt(i, c.set(colors[Math.floor(rnd() * colors.length)]));
    });
    scene.add(ink, body);
  }
  const tallestNear = (x: number, z: number, r: number) => {
    let top = 0;
    for (const l of lots) if (Math.abs(l.x - x) < r && Math.abs(l.z - z) < r) top = Math.max(top, l.h);
    return top;
  };

  // ---- landmarks
  const block = (w: number, h: number, d: number, color: number, at: THREE.Vector3, y = 0, dx = 0, dz = 0) => {
    const g = inked(new THREE.BoxGeometry(w, h, d), toon(color));
    g.position.set(at.x + dx, y + h / 2, at.z + dz);
    scene.add(g);
  };
  const blinkers: THREE.Mesh[] = [];
  {
    const [hotel, penn, times, empire] = landmarks;
    block(0.6, 3.4, 0.6, 0xe6dcff, empire);
    block(0.4, 1, 0.4, 0xd2c2ff, empire, 3.4);
    block(0.22, 0.5, 0.22, 0xb9a3ff, empire, 4.4);
    const spire = new THREE.Mesh(keep(new THREE.ConeGeometry(0.06, 0.8, 6)), toon(0xffffff));
    spire.position.set(empire.x, 5.3, empire.z);
    scene.add(spire);

    block(0.7, 2.6, 0.6, 0xffb3d1, hotel);
    block(0.5, 0.35, 0.45, 0xff8fbf, hotel, 2.6);
    const heart = new THREE.Mesh(keep(new THREE.SphereGeometry(0.1, 12, 8)), flat(0xff3d8b));
    heart.position.set(hotel.x, 2.2, hotel.z + 0.31);
    scene.add(heart);

    block(1, 0.5, 0.7, 0xfdfbf6, penn);
    block(1.06, 0.12, 0.76, 0x6fb6ff, penn, 0.5);

    block(0.45, 2.2, 0.45, 0x3b3350, times, 0, -0.35);
    block(0.45, 2.6, 0.45, 0x3b3350, times, 0, 0.35, 0.1);
    const board = keep(new THREE.PlaneGeometry(0.4, 0.5));
    [0xff4fa3, 0x4fe3ff, 0xffe14f, 0x8cff6a].forEach((col, i) => {
      const b = new THREE.Mesh(board, keep(new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide, transparent: true })));
      const left = i % 2 === 0;
      b.position.set(times.x + (left ? -0.12 : 0.12), 1.1 + Math.floor(i / 2) * 0.7, times.z + (left ? 0 : 0.1));
      b.rotation.y = Math.PI / 2;
      b.userData.blink = i;
      scene.add(b);
      blinkers.push(b);
    });

    // Statue of Liberty, very approximately
    const lib = new THREE.Group();
    const green = toon(0x7fd1b9);
    const isle = inked(new THREE.CylinderGeometry(0.6, 0.7, 0.3, 16), toon(0xf3e6d6));
    isle.position.y = -0.15;
    const ped = inked(new THREE.BoxGeometry(0.34, 0.5, 0.34), toon(0xe8d8bf));
    ped.position.y = 0.25;
    const robe = inked(new THREE.ConeGeometry(0.16, 0.7, 10), green);
    robe.position.y = 0.85;
    const head = new THREE.Mesh(keep(new THREE.SphereGeometry(0.09, 10, 8)), green);
    head.position.y = 1.25;
    const arm = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6)), green);
    arm.position.set(0.1, 1.35, 0);
    arm.rotation.z = -0.3;
    const torch = new THREE.Mesh(keep(new THREE.SphereGeometry(0.06, 8, 6)), flat(0xffc23d));
    torch.position.set(0.16, 1.58, 0);
    lib.add(isle, ped, robe, head, arm, torch);
    lib.position.copy(liberty);
    scene.add(lib);
  }

  // ---- pins (rebuilt by setPins)
  const pinGroup = new THREE.Group();
  scene.add(pinGroup);
  const stalkGeo = keep(new THREE.CylinderGeometry(0.03, 0.03, 1, 6));
  stalkGeo.translate(0, 0.5, 0);
  const stalkMat = flat(INK);
  const ballGeo = keep(new THREE.SphereGeometry(0.15, 14, 10));
  const pinMats = new Map<string, THREE.Material>();
  const pinMat = (c: string) => pinMats.get(c) ?? (pinMats.set(c, toon(c)), pinMats.get(c)!);
  const labelAt = new Map<string, THREE.Vector3>();

  // ---- you are here
  const you = new THREE.Group();
  {
    const ring = new THREE.Mesh(keep(new THREE.RingGeometry(0.22, 0.32, 32)), keep(new THREE.MeshBasicMaterial({ color: 0x3d8bff, transparent: true, opacity: 0.6, side: THREE.DoubleSide })));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.08;
    const dot = inked(new THREE.SphereGeometry(0.14, 14, 10), flat(0x3d8bff), 0.06);
    dot.position.y = 0.2;
    you.add(ring, dot);
    you.visible = false;
    scene.add(you);
  }

  // ---- clouds
  const clouds: THREE.Group[] = [];
  {
    const puff = keep(new THREE.IcosahedronGeometry(1, 1));
    const white = toon(0xffffff);
    const rnd = seeded(5);
    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group();
      for (let k = 0; k < 4; k++) {
        const s = 0.5 + rnd() * 0.5;
        const m = new THREE.Mesh(puff, white);
        m.scale.set(s * 1.3, s * 0.8, s);
        m.position.set(k * 0.8 - 1.2, rnd() * 0.3, (rnd() - 0.5) * 0.6);
        g.add(m);
      }
      g.position.set(-18 + rnd() * 36, 7.5 + rnd() * 2.5, plateC.z - 16 + rnd() * 32);
      g.userData.speed = 0.25 + rnd() * 0.35;
      clouds.push(g);
      scene.add(g);
    }
  }

  // ---- boats circling the island
  const boats: { g: THREE.Group; r: number; a: number; s: number }[] = [];
  {
    const hull = toon(0xffffff);
    const cabin = toon(0xff8a5b);
    for (const [r, a, s] of [[8.5, 0.3, 0.05], [13, 2.2, -0.035], [17, 4.1, 0.03]]) {
      const g = new THREE.Group();
      const h = inked(new THREE.BoxGeometry(0.7, 0.16, 0.3), hull);
      const top = inked(new THREE.BoxGeometry(0.3, 0.16, 0.22), cabin);
      top.position.set(-0.08, 0.16, 0);
      g.add(h, top);
      scene.add(g);
      boats.push({ g, r, a, s });
    }
  }

  // ---- the train from Boston: over the water from the northeast, into the tunnel
  const tunnel = mapXZ(TUNNEL[0], TUNNEL[1]);
  const track = new THREE.CatmullRomCurve3([
    new THREE.Vector3(tunnel.x + 10, -0.12, tunnel.z - 11),
    new THREE.Vector3(tunnel.x + 6, -0.12, tunnel.z - 5),
    new THREE.Vector3(tunnel.x + 2.5, -0.12, tunnel.z - 1),
    new THREE.Vector3(tunnel.x, -0.12, tunnel.z),
  ]);
  {
    const pts = track.getSpacedPoints(40);
    const dash = keep(new THREE.BoxGeometry(0.06, 0.04, 0.28));
    const mat = flat(INK);
    for (let i = 0; i < pts.length - 1; i += 2) {
      const d = new THREE.Mesh(dash, mat);
      d.position.copy(pts[i]);
      d.lookAt(pts[i + 1]);
      scene.add(d);
    }
  }
  const cars: THREE.Group[] = [];
  {
    const silver = toon(0xf4f4f8);
    const stripe = toon(0x5aa9ff);
    for (let i = 0; i < 3; i++) {
      const car = new THREE.Group();
      const b = inked(new THREE.BoxGeometry(0.28, 0.26, 0.62), silver);
      b.position.y = 0.13;
      const s = new THREE.Mesh(keep(new THREE.BoxGeometry(0.29, 0.05, 0.6)), stripe);
      s.position.y = 0.12;
      car.add(b, s);
      car.visible = false;
      cars.push(car);
      scene.add(car);
    }
  }

  // ---- the two of you
  const people: { g: THREE.Group; body: THREE.Group; off: THREE.Vector3; delay: number }[] = [];
  {
    const skin = toon(0xffe0c7);
    const eye = flat(INK);
    const blush = flat(0xff9bb8);
    const eyeGeo = keep(new THREE.SphereGeometry(0.022, 6, 4));
    const cheekGeo = keep(new THREE.SphereGeometry(0.03, 6, 4));
    [
      { coat: 0xff7eb6, scarf: 0xfff06a, hat: 0xffffff },
      { coat: 0x6fb6ff, scarf: 0xff6a6a, hat: 0x3b3350 },
    ].forEach((l, i) => {
      const g = new THREE.Group();
      const body = new THREE.Group();
      const coat = inked(new THREE.CapsuleGeometry(0.17, 0.2, 4, 12), toon(l.coat));
      coat.position.y = 0.27;
      const head = inked(new THREE.SphereGeometry(0.17, 16, 12), skin);
      head.position.y = 0.6;
      const hat = inked(new THREE.SphereGeometry(0.175, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(l.hat), 0.04);
      hat.position.y = 0.63;
      const pom = new THREE.Mesh(keep(new THREE.SphereGeometry(0.05, 8, 6)), toon(l.scarf));
      pom.position.y = 0.82;
      const scarf = new THREE.Mesh(keep(new THREE.TorusGeometry(0.13, 0.045, 6, 16)), toon(l.scarf));
      scarf.rotation.x = Math.PI / 2;
      scarf.position.y = 0.45;
      for (const sx of [-1, 1]) {
        const e = new THREE.Mesh(eyeGeo, eye);
        e.position.set(sx * 0.06, 0.6, 0.155);
        const c = new THREE.Mesh(cheekGeo, blush);
        c.scale.z = 0.4;
        c.position.set(sx * 0.1, 0.55, 0.14);
        body.add(e, c);
      }
      body.add(coat, scarf, head, hat, pom);
      g.add(body);
      scene.add(g);
      people.push({ g, body, off: new THREE.Vector3(i === 0 ? -0.2 : 0.2, 0, 0.25), delay: i * 0.14 });
    });
  }

  // ---- snow
  const snow = (() => {
    const N = 800;
    const pos = new Float32Array(N * 3);
    const rnd = seeded(9);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = plateC.x + (rnd() - 0.5) * 36;
      pos[i * 3 + 1] = rnd() * 12;
      pos[i * 3 + 2] = plateC.z + (rnd() - 0.5) * 40;
    }
    const geo = keep(new THREE.BufferGeometry());
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, keep(new THREE.PointsMaterial({ color: 0xffffff, size: 0.1, transparent: true, opacity: 0.9 })));
    pts.visible = false;
    scene.add(pts);
    return pts;
  })();

  // ---------------------------------------------------------------- camera
  const home = new THREE.Vector3(0, 0, plateC.z - 1);
  const view = { target: home.clone(), goal: home.clone(), az: -0.3, el: 1, dist: 46, goalDist: 46 };
  let wide = 46;

  const pointers = new Map<number, { x: number; y: number }>();
  let pinch = 0;
  const onDown = (e: PointerEvent) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };
  const onMove = (e: PointerEvent) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    if (pointers.size === 1) {
      view.az -= (e.clientX - p.x) * 0.006;
      view.el = THREE.MathUtils.clamp(view.el + (e.clientY - p.y) * 0.004, 0.45, 1.4);
    }
    p.x = e.clientX;
    p.y = e.clientY;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch) view.goalDist = THREE.MathUtils.clamp(view.goalDist * (pinch / d), 6, 60);
      pinch = d;
    }
  };
  const onUp = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    pinch = 0;
  };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    view.goalDist = THREE.MathUtils.clamp(view.goalDist * (1 + e.deltaY * 0.001), 6, 60);
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  // ---------------------------------------------------------------- movement
  const labels = new Map<string, HTMLElement>();
  let hop: { from: THREE.Vector3; to: THREE.Vector3; t: number; dur: number } | null = null;
  const here = mapXZ(SPOT.hotel.lat, SPOT.hotel.lng);
  let arrival: { t: number } | null = null;

  const standAt = (at: THREE.Vector3) => {
    here.copy(at);
    for (const p of people) {
      p.g.visible = true;
      p.g.position.copy(at).add(p.off);
    }
  };
  standAt(here);

  function hopTo(at: THREE.Vector3) {
    if (at.distanceTo(here) < 0.05 || arrival) return;
    hop = { from: here.clone(), to: at.clone(), t: 0, dur: opts.reduced ? 0.01 : THREE.MathUtils.clamp(here.distanceTo(at) * 0.12, 0.7, 2) };
    here.copy(at);
  }

  // ---------------------------------------------------------------- loop
  const tmp = new THREE.Vector3();
  let raf = 0;
  let last = performance.now();
  let clock = 0;
  let w = 1;
  let h = 1;

  const holder = canvas.parentElement!;
  function resize() {
    const r = holder.getBoundingClientRect();
    w = Math.max(r.width, 1);
    h = Math.max(r.height, 1);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // a portrait phone needs to stand further back to fit the long island
    const next = w / h < 0.9 ? 58 : 40;
    if (Math.abs(view.goalDist - wide) < 0.5) view.goalDist = next;
    wide = next;
  }
  const ro = new ResizeObserver(resize);
  ro.observe(holder);
  resize();
  view.dist = view.goalDist;

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    clock += dt;
    const k = 1 - Math.exp(-dt * 4);

    view.target.lerp(view.goal, k);
    view.dist += (view.goalDist - view.dist) * k;
    if (!pointers.size && !opts.reduced) view.az += dt * 0.015;
    const c = Math.cos(view.el);
    camera.position.set(
      view.target.x + Math.sin(view.az) * c * view.dist,
      Math.sin(view.el) * view.dist,
      view.target.z + Math.cos(view.az) * c * view.dist,
    );
    camera.lookAt(view.target);

    for (const cl of clouds) {
      cl.position.x += cl.userData.speed * dt;
      if (cl.position.x > 20) cl.position.x = -20;
    }
    for (const b of boats) {
      b.a += b.s * dt;
      b.g.position.set(plateC.x + Math.cos(b.a) * b.r, -0.15 + Math.sin(clock * 2 + b.r) * 0.03, plateC.z + Math.sin(b.a) * b.r);
      b.g.rotation.y = -b.a + (b.s > 0 ? Math.PI : 0);
    }
    for (const b of blinkers) {
      (b.material as THREE.MeshBasicMaterial).opacity = Math.sin(clock * 3 + b.userData.blink * 1.7) > -0.2 ? 1 : 0.35;
    }
    if (you.visible) you.children[0].scale.setScalar(1 + (clock % 1.5) * 0.6);

    if (arrival) {
      arrival.t += dt / (opts.reduced ? 0.01 : 4.5);
      const t = Math.min(arrival.t, 1);
      cars.forEach((car, i) => {
        const u = THREE.MathUtils.clamp(easeInOut(t) - i * 0.035, 0, 1);
        track.getPointAt(u, car.position);
        track.getTangentAt(u, tmp);
        car.lookAt(tmp.add(car.position));
        car.position.y = -0.12 - Math.max(0, u - 0.88) * 4; // into the tunnel
        car.visible = t < 1 && u < 0.99;
      });
      if (arrival.t >= 1) {
        arrival = null;
        standAt(mapXZ(SPOT.penn.lat, SPOT.penn.lng));
        window.setTimeout(() => hopTo(mapXZ(SPOT.hotel.lat, SPOT.hotel.lng)), opts.reduced ? 0 : 450);
      }
    }

    if (hop) {
      hop.t += dt;
      const span = hop.from.distanceTo(hop.to);
      for (const p of people) {
        const u = THREE.MathUtils.clamp((hop.t - p.delay) / hop.dur, 0, 1);
        p.g.position.lerpVectors(hop.from, hop.to, easeInOut(u)).add(p.off);
        p.g.position.y = Math.sin(u * Math.PI) * Math.min(span * 0.22, 4.5) + Math.abs(Math.sin(u * Math.PI * 4)) * 0.15;
        p.g.rotation.y = Math.atan2(hop.to.x - hop.from.x, hop.to.z - hop.from.z);
        p.body.scale.y = 1 + Math.sin(u * Math.PI * 8) * 0.06;
      }
      if (hop.t >= hop.dur + 0.3) hop = null;
    } else {
      for (const p of people) {
        p.body.position.y = Math.abs(Math.sin(clock * 2.4 + p.delay * 20)) * 0.04;
        const face = Math.atan2(camera.position.x - p.g.position.x, camera.position.z - p.g.position.z);
        let d = face - p.g.rotation.y;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        p.g.rotation.y += d * k * 0.6;
      }
    }

    if (snow.visible) {
      const a = snow.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < a.count; i++) {
        let y = a.getY(i) - dt * 0.9;
        if (y < -0.2) y = 12;
        a.setY(i, y);
        a.setX(i, a.getX(i) + Math.sin(clock + i) * dt * 0.1);
      }
      a.needsUpdate = true;
    }

    renderer.render(scene, camera);

    for (const [id, el] of labels) {
      const p = labelAt.get(id);
      if (!p) continue;
      tmp.copy(p).project(camera);
      const vis = tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1;
      el.style.visibility = vis ? "" : "hidden";
      el.style.transform = `translate3d(${((tmp.x + 1) / 2) * w}px, ${((1 - tmp.y) / 2) * h}px, 0) translate(-50%, -100%)`;
    }
  }
  raf = requestAnimationFrame(frame);

  return {
    bindLabel(id, el) {
      if (el) labels.set(id, el);
      else labels.delete(id);
    },
    setPins(pins) {
      pinGroup.clear();
      labelAt.clear();
      for (const p of pins) {
        const at = mapXZ(p.lat, p.lng);
        const top = p.id === "empire" ? 5.7 : Math.min(tallestNear(at.x, at.z, p.small ? 0.35 : 0.55), p.small ? 1.4 : 4.6);
        const y = top + (p.small ? 0.45 : 0.8);
        const stalk = new THREE.Mesh(stalkGeo, stalkMat);
        stalk.scale.y = y;
        stalk.position.copy(at);
        const ball = new THREE.Mesh(ballGeo, pinMat(p.color));
        ball.scale.setScalar(p.small ? 0.7 : 1);
        ball.position.set(at.x, y, at.z);
        pinGroup.add(stalk, ball);
        labelAt.set(p.id, new THREE.Vector3(at.x, y + 0.2, at.z));
      }
      if (you.visible) labelAt.set("you", you.position.clone().setY(0.6));
    },
    setYou(at) {
      you.visible = !!at;
      if (at) {
        you.position.copy(mapXZ(at.lat, at.lng));
        labelAt.set("you", you.position.clone().setY(0.6));
      } else labelAt.delete("you");
    },
    focus(id) {
      if (!id) {
        view.goal.copy(home);
        view.goalDist = wide;
        return;
      }
      const s = SPOT[id];
      if (!s) return;
      const at = mapXZ(s.lat, s.lng);
      view.goal.copy(at);
      view.goalDist = 20;
      hopTo(at);
    },
    playArrival() {
      people.forEach((p) => (p.g.visible = false));
      hop = null;
      arrival = { t: 0 };
    },
    setSnow(on) {
      snow.visible = on;
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("wheel", onWheel);
      for (const d of disposables) d.dispose();
      renderer.dispose();
    },
  };
}
