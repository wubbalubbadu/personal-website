// The bathhouse running: you (first person), everyone else, what the verbs
// do, the bots, and other tabs. Loaded lazily by Spa.tsx because three is big.
import * as THREE from "three";
import { Avatar, lookFromSeed, setBodyStyle, setFaceStyle, type Beat, type BodyStyle, type FaceStyle, type Pose, type VerbId } from "./avatar";
import { Brain } from "./brain";
import { Drops, Prints, Puffs, Words } from "./fx";
import { COLD, HOT, PORCH, SPAWN, SPOTS, clampToFloor, findPath, inCold, inHot, nearestFreeSpot, spotById, walkable, zoneAt, type P2, type Spot, type Zone } from "./nav";
import { tabTransport, type Flags, type Msg, type Transport } from "./net";
import { Sound } from "./sound";
import { buildWorld, type TimeOfDay } from "./world";

export type { BodyStyle, FaceStyle, TimeOfDay };
/** Where the camera sits: behind your own person, or in their eyes. */
export type ViewMode = "third" | "first";
export type ActionId = VerbId | "cucumbers" | "nap" | "float" | "getup";

export type Hud = {
  ready: boolean;
  zone: Zone;
  name: string;
  people: number;
  actions: ActionId[];
  /** Toggles that are currently on. */
  on: ActionId[];
  busy: boolean;
  cucumbers: boolean;
  napping: boolean;
  under: boolean;
  /** Looking through your own eyes (the cucumber and nap overlays only make sense then). */
  first: boolean;
  /** You walked back out to the end of the dock: time for the goodbye card. */
  left: boolean;
  /** -1 cold to 1 hot, rounded, for the edge tint. */
  heat: number;
  /** How thick the sauna steam is around you, 0 to 1. */
  steam: number;
};

export type SpaOptions = {
  lang: "en" | "zh";
  bots: number;
  time: TimeOfDay;
  face?: FaceStyle;
  body?: BodyStyle;
  view?: ViewMode;
  onHud(h: Hud): void;
  /** Keep to yourself: no other tabs see you (used for testing with ?solo in the address). */
  solo?: boolean;
};

export type SpaApi = {
  act(id: ActionId): void;
  /** The front door card was dismissed: walk in from the dock. */
  arrive(): void;
  setMuted(m: boolean): void;
  setTime(t: TimeOfDay): void;
  setBots(n: number): void;
  setLang(l: "en" | "zh"): void;
  setView(v: ViewMode): void;
  /** Switch everyone's silhouette. */
  setBody(b: BodyStyle): void;
  /** Switch how cartoonish everyone's head and face are. */
  setFace(f: FaceStyle): void;
  /** Re-roll your own person. */
  newLook(): void;
  dispose(): void;
};

type Step = P2 & { raw?: boolean };

type Person = {
  id: string;
  seed: number;
  av: Avatar;
  x: number;
  y: number;
  z: number;
  yaw: number;
  yawGoal: number;
  path: Step[];
  goalSpot: Spot | null;
  spot: Spot | null;
  zone: Zone;
  wet: boolean;
  heat: number;
  self: boolean;
  bot: boolean;
  /** Lives in another tab; we only replay what it tells us. */
  remote: boolean;
  born: number;
  lastSeen: number;
  brain: Brain | null;
  clocks: { step: number; steam: number; ripple: number; zzz: number; blocked: number; drip: number; foot: number };
};

const WORDS = {
  en: { ahh: "ahh", brr: "brr!", zzz: "z z", pha: "pha!", tok: "tok!", hot: "phew" },
  zh: { ahh: "啊~", brr: "好冷!", zzz: "呼~", pha: "哈!", tok: "咚!", hot: "好热" },
};

const POSE_FOR: Record<Spot["kind"], Pose> = { mat: "lie", bench: "sit", soak: "soak", plunge: "plunge" };

const angleTo = (from: number, to: number) => {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};

export function mountSpa(host: HTMLElement, opts: SpaOptions): SpaApi {
  let lang = opts.lang;
  let view: ViewMode = opts.view ?? "third";
  setFaceStyle(opts.face ?? "dots");
  setBodyStyle(opts.body ?? "gumdrop");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(1.75, window.devicePixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  host.append(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(68, 1, 0.04, 900);
  camera.rotation.order = "YXZ";

  const puffs = new Puffs(700);
  const drops = new Drops(200);
  const words = new Words();
  const prints = new Prints();
  const world = buildWorld(scene, puffs, drops);
  world.setTime(opts.time, true);
  world.calm = reduced;
  world.onChime = (x, z) => sound.play("chime", x, z, { gain: 0.7, pitch: 0.9 + Math.random() * 0.3 });
  scene.add(puffs.points, drops.mesh, words.group, prints.group);
  const sound = new Sound();

  // where you'd go if you clicked: a soft ring on the floor
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.16, 0.22, 32),
    new THREE.MeshBasicMaterial({ color: "#fff6e0", transparent: true, opacity: 0, depthWrite: false, fog: false }),
  );
  marker.rotation.x = -Math.PI / 2;
  marker.renderOrder = 6;
  scene.add(marker);
  let markerGoal = 0;

  // ------------------------------------------------------------ people

  const people = new Map<string, Person>();
  const myId = Math.random().toString(36).slice(2, 10);
  const myBorn = Date.now() + Math.random();
  let botTarget = opts.bots;
  let botSerial = 0;
  /** Sauna steam hanging in the air after someone pours, 0 to about 1.5. */
  let steamy = 0;
  let under = false;

  function addPerson(id: string, seed: number, x: number, z: number, kind: { self?: boolean; bot?: boolean; remote?: boolean; born?: number } = {}): Person {
    const av = new Avatar(lookFromSeed(seed), lang);
    scene.add(av.group);
    const p: Person = {
      id, seed, av, x, y: 0, z, yaw: Math.PI, yawGoal: Math.PI,
      path: [], goalSpot: null, spot: null, zone: zoneAt(x, z), wet: false, heat: 0,
      self: !!kind.self, bot: !!kind.bot, remote: !!kind.remote, born: kind.born ?? 0, lastSeen: performance.now(),
      brain: kind.bot && !kind.remote ? new Brain() : null,
      clocks: { step: 0, steam: Math.random(), ripple: Math.random() * 2, zzz: 1, blocked: 0, drip: 0, foot: 1 },
    };
    if (p.self) {
      av.setHeadVisible(view === "third");
      av.firstPerson = view === "first";
      av.calm = reduced;
    }
    people.set(id, p);
    return p;
  }

  /** Same person, new body: rebuild them from a different seed and keep what they were doing. */
  function reskin(p: Person, seed: number) {
    const old = p.av;
    const av = new Avatar(lookFromSeed(seed), lang);
    av.pose = old.pose;
    av.cucumbers = old.cucumbers;
    av.napping = old.napping;
    av.heat = old.heat;
    av.setWet(p.wet);
    if (p.self) {
      av.setHeadVisible(view === "third");
      av.firstPerson = view === "first";
      av.calm = reduced;
    }
    av.group.position.copy(old.group.position);
    av.group.rotation.copy(old.group.rotation);
    scene.remove(old.group);
    old.dispose();
    scene.add(av.group);
    p.av = av;
    p.seed = seed;
  }

  function removePerson(p: Person) {
    release(p);
    scene.remove(p.av.group);
    p.av.dispose();
    people.delete(p.id);
  }

  /** Give back whatever spot they hold or were heading to. */
  function release(p: Person) {
    for (const s of [p.spot, p.goalSpot]) if (s && s.taken === p.id) s.taken = null;
  }

  const self = addPerson(myId, (Math.random() * 2 ** 31) | 0, SPAWN.x + (Math.random() - 0.5) * 0.6, SPAWN.z + (Math.random() - 0.5) * 0.6, { self: true, born: myBorn });

  // ------------------------------------------------------------ commands
  // Everything anyone does goes through these four, whether it came from a
  // click, a bot or another tab.

  function leaveSpot(p: Person): Step[] {
    const s = p.spot;
    release(p);
    p.goalSpot = null;
    if (!s) return [];
    p.spot = null;
    p.av.pose = "stand";
    p.av.cucumbers = false;
    p.av.napping = false;
    if (p.self) under = false;
    if (s.kind === "soak" || s.kind === "plunge") {
      sound.play("plop", p.x, p.z, { gain: 0.6 });
      p.clocks.drip = 9; // wet feet for a little while
    }
    // step back to where you got on
    return [{ x: s.ax, z: s.az, raw: true }];
  }

  function goTo(p: Person, x: number, z: number) {
    const lead = leaveSpot(p);
    const from = lead.length ? lead[0] : { x: p.x, z: p.z };
    p.path = [...lead, ...findPath(from, { x, z }, p.bot ? 1 : 0)];
  }

  function goSpot(p: Person, wanted: Spot) {
    if (p.spot === wanted) return;
    let s = wanted;
    if (s.taken && s.taken !== p.id) {
      const other = nearestFreeSpot(s.x, s.z, (q) => q.kind === s.kind, p.id);
      if (!other) return;
      s = other;
    }
    const lead = leaveSpot(p);
    const from = lead.length ? lead[0] : { x: p.x, z: p.z };
    s.taken = p.id;
    p.goalSpot = s;
    p.path = [...lead, ...findPath(from, { x: s.ax, z: s.az }, p.bot ? 1 : 0), { x: s.x, z: s.z, raw: true }];
  }

  function settle(p: Person, s: Spot, quiet = false) {
    p.spot = s;
    p.goalSpot = null;
    s.taken = p.id;
    p.x = s.x;
    p.z = s.z;
    p.path = [];
    p.av.pose = POSE_FOR[s.kind];
    p.yawGoal = s.face;
    if (quiet) {
      p.yaw = s.face;
      p.y = s.y;
      return;
    }
    const w = WORDS[lang];
    if (s.kind === "soak") {
      sound.play("plop", s.x, s.z);
      world.hot.ripple(s.x, s.z, 0.9);
      setTimeout(() => {
        if (p.spot !== s) return;
        sound.play("ahh", s.x, s.z, { pitch: p.av.look.pitch, gain: 0.8 });
        say(p, w.ahh);
      }, 700);
    } else if (s.kind === "plunge") {
      sound.play("splash", s.x, s.z);
      world.cold.ripple(s.x, s.z, 1.4);
      drops.splash(s.x, COLD.water, s.z, 26, 1.5);
      setTimeout(() => {
        if (p.spot !== s) return;
        sound.play("gasp", s.x, s.z, { pitch: p.av.look.pitch });
        say(p, w.brr);
      }, 250);
    } else if (s.kind === "bench") sound.play("creak", s.x, s.z);
    else sound.play("soft", s.x, s.z);
    // whoever is already sitting nearby looks over for a moment
    for (const q of people.values()) {
      if (q === p || !q.spot || Math.hypot(q.x - s.x, q.z - s.z) > 2.2) continue;
      q.av.glance(Math.atan2(s.x - q.x, s.z - q.z) - q.yaw, 1.6 + Math.random());
    }
    if (p.self) {
      // eyes: settle the gaze; behind-you camera: come round to see yourself settle in
      lookGoal =
        view === "first"
          ? { yaw: s.face, pitch: s.kind === "mat" ? 1.2 : 0, t: 1.2 }
          : s.kind === "mat"
            ? { yaw: lookYaw, pitch: -0.95, t: 1.6 }
            : { yaw: s.face + Math.PI, pitch: -0.22, t: 1.6 };
    }
  }

  function doVerb(p: Person, v: VerbId) {
    if (p.av.verb) return;
    if (p.av.napping) p.av.napping = false;
    p.av.startVerb(v);
    // a wave gets waves back from bots close enough to notice (and awake enough to care)
    if (v === "wave" && !p.bot) {
      for (const q of people.values()) {
        if (!q.brain || q.av.napping || q.av.cucumbers || q.av.pose === "float" || Math.hypot(q.x - p.x, q.z - p.z) > 3.6) continue;
        setTimeout(() => {
          if (!people.has(q.id) || q.av.verb) return;
          q.av.glance(Math.atan2(p.x - q.x, p.z - q.z) - q.yaw, 2);
          cmd.verb(q, "wave");
        }, 450 + Math.random() * 900);
      }
    }
  }

  function setFlags(p: Person, f: Flags) {
    const kind = p.spot?.kind;
    if (f.cucumbers !== undefined && kind === "mat") p.av.cucumbers = f.cucumbers;
    if (f.nap !== undefined && kind === "mat") p.av.napping = f.nap;
    if (f.float !== undefined && kind === "soak") {
      p.av.pose = f.float ? "float" : "soak";
      world.hot.ripple(p.x, p.z, 0.7);
      sound.play("plop", p.x, p.z, { gain: 0.5 });
      if (p.self) lookGoal = view === "first" ? { yaw: lookYaw, pitch: f.float ? 1.25 : 0, t: 1.4 } : { yaw: lookYaw, pitch: f.float ? -0.85 : -0.22, t: 1.6 };
    }
  }

  const flagsOf = (p: Person): Flags => ({ cucumbers: p.av.cucumbers, nap: p.av.napping, float: p.av.pose === "float" });

  // ---- the same commands, announced to other tabs when they're ours
  const mine = (p: Person) => !p.remote;
  const cmd = {
    go(p: Person, x: number, z: number) {
      goTo(p, x, z);
      if (mine(p)) net?.send({ t: "go", id: p.id, x, z });
    },
    spot(p: Person, s: Spot) {
      goSpot(p, s);
      if (mine(p) && p.goalSpot) net?.send({ t: "spot", id: p.id, spot: p.goalSpot.id });
    },
    verb(p: Person, v: VerbId) {
      if (p.av.verb) return;
      doVerb(p, v);
      if (mine(p)) net?.send({ t: "verb", id: p.id, verb: v });
    },
    flag(p: Person, f: Flags) {
      setFlags(p, f);
      if (mine(p)) net?.send({ t: "flag", id: p.id, flags: f });
    },
  };

  // ------------------------------------------------------------ what verbs do

  const v3 = new THREE.Vector3();
  function say(p: Person, text: string) {
    if (p.self && view === "first") return; // you can't see a word floating over your own head
    p.av.headWorld(v3);
    words.say(text, v3.x, v3.y + 0.42, v3.z);
  }

  function onBeat(p: Person, beat: Beat) {
    const w = WORDS[lang];
    const pitch = p.av.look.pitch;
    switch (beat) {
      case "sigh":
        sound.play("ahh", p.x, p.z, { pitch });
        say(p, w.ahh);
        p.av.headWorld(v3);
        puffs.burst(v3.x, v3.y - 0.05, v3.z, 3, 0.2, 0.2, 2, 0.25, 0.12);
        break;
      case "pour": {
        const s = world.stove;
        sound.play("plop", s.x, s.z, { gain: 0.5 });
        sound.play("hiss", s.x, s.z);
        puffs.burst(s.x, s.y, s.z, 90, 2.4, 0.9, 7, 1.3, 0.2);
        steamy = Math.min(1.6, steamy + 0.7);
        for (const q of people.values()) {
          if (q.zone !== "sauna") continue;
          q.heat = Math.min(1, q.heat + 0.2);
          if (q !== p) {
            q.brain?.onSteam();
            // everyone looks over at the hiss
            q.av.glance(Math.atan2(s.x - q.x, s.z - q.z) - q.yaw, 2.6);
          }
        }
        break;
      }
      case "fan": {
        sound.play("whoosh", p.x, p.z);
        p.av.headWorld(v3);
        const fx = Math.sin(p.yaw);
        const fz = Math.cos(p.yaw);
        for (let i = 0; i < 4; i++) puffs.spawn(v3.x + fx * 0.4, v3.y + 0.3 * Math.random(), v3.z + fz * 0.4, fx * (0.8 + Math.random()), 0.1, fz * (0.8 + Math.random()), 2.5, 0.5, 0.1);
        break;
      }
      case "dunkIn":
        sound.play("plop", p.x, p.z);
        world.cold.ripple(p.x, p.z, 1);
        if (p.self) under = true;
        break;
      case "dunkOut":
        sound.play("splash", p.x, p.z, { gain: 0.7 });
        drops.splash(p.x, COLD.water, p.z, 18, 1.2);
        world.cold.ripple(p.x, p.z, 1.2);
        sound.play("gasp", p.x, p.z, { pitch });
        say(p, w.brr);
        p.heat = -1;
        if (p.self) under = false;
        break;
      case "bucket":
        p.av.headWorld(v3);
        drops.pour(v3.x, v3.y + 0.35, v3.z, 46);
        sound.play("splash", p.x, p.z, { gain: 0.8 });
        setTimeout(() => {
          sound.play("gasp", p.x, p.z, { pitch });
          say(p, w.brr);
        }, 180);
        p.heat = -0.95;
        break;
      case "egg":
        sound.play("egg", p.x, p.z);
        say(p, w.tok);
        break;
      case "gulp":
        sound.play("gulp", p.x, p.z, { pitch });
        break;
      case "pha":
        sound.play("pha", p.x, p.z, { pitch });
        say(p, w.pha);
        break;
    }
  }

  // ------------------------------------------------------------ one person, one frame

  function stepPerson(p: Person, dt: number, t: number) {
    const av = p.av;
    const hotHere = inHot(p.x, p.z);
    const coldHere = inCold(p.x, p.z);
    let moving = false;

    if (p.path.length) {
      const goal = p.path[0];
      const dx = goal.x - p.x;
      const dz = goal.z - p.z;
      const d = Math.hypot(dx, dz);
      const reach = (hotHere || coldHere ? 0.8 : 1.5) * dt;
      if (d <= reach) {
        p.x = goal.x;
        p.z = goal.z;
        p.path.shift();
        if (!p.path.length && p.goalSpot) settle(p, p.goalSpot);
      } else {
        p.x += (dx / d) * reach;
        p.z += (dz / d) * reach;
        p.yawGoal = Math.atan2(dx, dz);
      }
      moving = p.path.length > 0;
    }
    if (p.self && keyMove) moving = true;
    av.moving = moving;

    // bots step around whoever is standing in their way, and give up politely if they can't
    if (p.bot && moving && !hotHere && !coldHere && p.path.length) {
      let crowded = false;
      // after a couple of seconds of being blocked, stop dodging and just squeeze past for a while
      const squeeze = p.clocks.blocked >= 2.5;
      {
        const gx = p.path[0].x - p.x;
        const gz = p.path[0].z - p.z;
        const gl = Math.hypot(gx, gz) || 1;
        for (const q of people.values()) {
          // people standing about, and people lying on mats (who take up more floor)
          if (q === p || (q.spot && q.spot.kind !== "mat")) continue;
          const room = q.spot ? 0.85 : 0.62;
          const dx = p.x - q.x;
          const dz = p.z - q.z;
          const d = Math.hypot(dx, dz);
          if (d > room || d < 0.001) continue;
          crowded = true;
          if (squeeze) continue;
          // mostly sideways (to slip past), a little straight back
          const side = dx * (-gz / gl) + dz * (gx / gl) >= 0 ? 1 : -1;
          const push = (room - d) * 5 * dt;
          const nx = p.x + ((-gz / gl) * side * 0.8 + (dx / d) * 0.5) * push;
          const nz = p.z + ((gx / gl) * side * 0.8 + (dz / d) * 0.5) * push;
          if (walkable(nx, nz)) {
            p.x = nx;
            p.z = nz;
          }
        }
      }
      p.clocks.blocked = crowded ? p.clocks.blocked + dt : Math.max(0, p.clocks.blocked - dt * 2);
      if (p.clocks.blocked > 4.5) p.clocks.blocked = 0;
    }

    // height: floor, seat, or chest deep in a pool
    let yGoal = 0;
    if (p.spot) yGoal = av.pose === "float" ? HOT.water - 0.07 : p.spot.y;
    else if (hotHere) yGoal = -0.5;
    else if (coldHere) yGoal = -0.62;
    p.y += (yGoal - p.y) * (1 - Math.exp(-dt * 7));
    p.yaw += angleTo(p.yaw, p.yawGoal) * (1 - Math.exp(-dt * 9));

    // which room, and whether that means towel or uniform
    const zone = p.spot?.zone ?? zoneAt(p.x, p.z);
    p.zone = zone;
    const wet = zone === "lounge" ? false : zone === "path" ? p.wet : true;
    if (wet !== p.wet) {
      p.wet = wet;
      av.setWet(wet);
    }

    // warmth drifts toward what the room does to you
    let target = 0;
    let rate = p.heat < 0 ? 0.09 : 0.035;
    if (coldHere) {
      target = -1;
      rate = 1.4;
    } else if (zone === "sauna") {
      target = 1;
      rate = (p.spot && p.spot.y > 0.5 ? 0.07 : 0.045) * (1 + steamy);
    } else if (hotHere) {
      target = 0.85;
      rate = 0.07;
    }
    p.heat += Math.max(-rate * dt, Math.min(rate * dt, target - p.heat));
    av.heat = p.heat;

    // small signs of life
    const c = p.clocks;
    if (!hotHere && !coldHere && !p.spot) c.drip -= dt;
    if (moving && !hotHere && !coldHere) {
      c.step -= dt;
      if (c.step <= 0) {
        c.step = 0.33;
        // wood floors knock, stone and gravel thud
        const wood = zone === "lounge" || zone === "sauna" || zone === "plunge" || (p.z > 6.4 && Math.abs(p.x + 1) < 1);
        sound.play("step", p.x, p.z, { gain: p.self ? 0.55 : 0.4, pitch: wood ? 1.35 : 0.8 });
        if (c.drip > 0) {
          c.foot = -c.foot;
          prints.step(p.x, p.z, p.yaw, c.foot);
        }
      }
    }
    c.ripple -= dt;
    if (c.ripple <= 0 && (hotHere || coldHere)) {
      c.ripple = moving ? 0.32 : 2 + Math.random() * 2;
      (hotHere ? world.hot : world.cold).ripple(p.x, p.z, moving ? 0.55 : 0.22);
      if (moving && p.self) sound.play("plop", p.x, p.z, { gain: 0.22 });
    }
    c.steam -= dt;
    if (c.steam <= 0) {
      c.steam = 0.28;
      // a wisp where a head breaks the hot water
      if (p.spot?.kind === "soak" && Math.random() < 0.35) {
        puffs.spawn(p.x + (Math.random() - 0.5) * 0.4, HOT.water + 0.06, p.z + (Math.random() - 0.5) * 0.4, 0, 0.16, 0, 2.6, 0.28, 0.12, 0.3);
      }
      // still steaming after you get out of the heat
      // beads of sweat in the sauna
      if (p.heat > 0.55 && zone === "sauna" && !p.self && Math.random() < p.heat * 0.5) {
        av.headWorld(v3);
        const side = Math.random() < 0.5 ? 1 : -1;
        // from the temple, beside the eye rather than under it
        drops.bead(v3.x + Math.cos(p.yaw) * 0.26 * side + Math.sin(p.yaw) * 0.09, v3.y + 0.08, v3.z - Math.sin(p.yaw) * 0.26 * side + Math.cos(p.yaw) * 0.09, 0.4);
      }
      if (p.heat > 0.3 && zone !== "sauna" && !hotHere && !p.self) {
        av.headWorld(v3);
        puffs.spawn(v3.x + (Math.random() - 0.5) * 0.2, v3.y + 0.2, v3.z + (Math.random() - 0.5) * 0.2, 0, 0.22, 0, 2.2, 0.22, 0.16 * p.heat, 0.25);
      }
    }
    // breath shows in the air when you're chilled and outdoors
    if (p.heat < -0.3 && zone !== "lounge" && zone !== "sauna" && !p.self) {
      c.zzz -= dt;
      if (c.zzz <= 0) {
        c.zzz = 1.7;
        av.headWorld(v3);
        puffs.spawn(v3.x + Math.sin(p.yaw) * 0.3, v3.y - 0.08, v3.z + Math.cos(p.yaw) * 0.3, Math.sin(p.yaw) * 0.25, 0.05, Math.cos(p.yaw) * 0.25, 1.4, 0.12, 0.2, 0.25);
      }
    }
    if (av.napping) {
      c.zzz -= dt;
      if (c.zzz <= 0) {
        c.zzz = 2.4;
        say(p, WORDS[lang].zzz);
      }
    }

    if (Math.abs(p.x + 1) < 0.7 && p.z > 3.1 && p.z < 4.1) world.doorBusy = true;
    if (p.self) {
      // going home: once you've been inside, walking back out to the boat ends the visit
      if (p.z < 6) beenIn = true;
      // (only after standing at the end of the dock for a couple of seconds, so passing by doesn't count)
      dockDwell = beenIn && !left && p.z > 10 && !p.path.length && !keyMove ? dockDwell + dt : 0;
      if (dockDwell > 2.2) {
        dockDwell = 0;
        left = true;
        arrived = false;
      }
    }
    av.group.position.set(p.x, p.y, p.z);
    av.group.rotation.y = p.yaw;
    av.update(dt, t);
    if (av.beats.length) {
      for (const b of av.beats) onBeat(p, b);
      av.beats.length = 0;
    }
  }

  // ------------------------------------------------------------ bots

  function spawnBot() {
    const id = `${myId}-b${botSerial++}`;
    // the first crowd is already scattered about when you arrive; anyone later comes in by boat like you did
    const late = performance.now() > botsFrom + 8000;
    const free = SPOTS.filter((s) => !s.taken);
    const spot = !late && Math.random() < 0.65 ? free[(Math.random() * free.length) | 0] : undefined;
    const at = late ? { x: SPAWN.x + (Math.random() - 0.5) * 0.6, z: SPAWN.z } : (spot ?? clampToFloor(-6 + Math.random() * 20, 2 + Math.random() * 4));
    const p = addPerson(id, (Math.random() * 2 ** 31) | 0, at.x, at.z, { bot: true });
    if (spot) {
      settle(p, spot, true);
      p.heat = spot.kind === "bench" || spot.kind === "soak" ? 0.5 + Math.random() * 0.4 : spot.kind === "plunge" ? -1 : 0;
    }
    announce(p);
    // walk in and stop a step to one side of the door, not on the spot where you arrive
    if (late) cmd.go(p, PORCH.x + (Math.random() < 0.5 ? -1 : 1) * (0.7 + Math.random() * 0.5), PORCH.z - 0.5 + Math.random() * 0.9);
    return p;
  }

  let holdUntil = 0;
  const myBots = () => [...people.values()].filter((p) => p.bot && !p.remote);

  function tendBots(now: number) {
    if (now < botsFrom) return;
    // the tab that has been open longest runs the crowd for everyone
    let host = true;
    let foreignBots = false;
    for (const p of people.values()) {
      if (!p.remote) continue;
      if (p.bot) foreignBots = true;
      else if (p.born < myBorn) host = false;
    }
    const bots = myBots();
    if (!host) {
      for (const b of bots) {
        net?.send({ t: "bye", id: b.id });
        removePerson(b);
      }
      return;
    }
    if (foreignBots) return; // the old host's crowd is still fading out
    if (bots.length < botTarget && now > holdUntil) spawnBot();
    else if (bots.length > botTarget) {
      const b = bots[bots.length - 1];
      net?.send({ t: "bye", id: b.id });
      removePerson(b);
    }
  }

  function thinkBots(dt: number) {
    for (const p of people.values()) {
      if (!p.brain) continue;
      p.brain.tick(
        dt,
        {
          x: p.x, z: p.z, zone: p.zone, spot: p.spot, moving: p.path.length > 0, verbing: !!p.av.verb,
          floating: p.av.pose === "float", cucumbers: p.av.cucumbers, napping: p.av.napping,
          nearSelf: Math.hypot(p.x - self.x, p.z - self.z),
        },
        {
          goSpot: (s) => cmd.spot(p, s),
          goTo: (x, z) => cmd.go(p, x, z),
          verb: (v) => {
            if (v === "wave") p.av.glance(Math.atan2(self.x - p.x, self.z - p.z) - p.yaw, 2.2);
            cmd.verb(p, v);
          },
          flag: (f) => cmd.flag(p, f),
          leave: () => {
            net?.send({ t: "bye", id: p.id });
            removePerson(p);
            holdUntil = performance.now() + 15000 + Math.random() * 40000; // the next boat takes a while
          },
        },
      );
    }
  }

  // ------------------------------------------------------------ other tabs

  function announce(p: Person) {
    net?.send({ t: "hi", id: p.id, seed: p.seed, x: p.x, z: p.z, born: p.born, spot: (p.spot ?? p.goalSpot)?.id ?? null, flags: flagsOf(p), bot: p.bot || undefined });
  }

  function onMessage(m: Msg) {
    const known = people.get(m.id);
    if (known && !known.remote) return; // an echo of ourselves
    if (m.t === "hi") {
      let p = known;
      if (!p) {
        p = addPerson(m.id, m.seed, m.x, m.z, { remote: true, bot: m.bot, born: m.born });
        const s = spotById(m.spot);
        if (s && !s.taken) settle(p, s, true);
        setFlags(p, m.flags);
        if (!m.bot) {
          sound.play("chime", self.x, self.z, { gain: 0.6 });
          announce(self);
          for (const b of myBots()) announce(b);
        }
      } else {
        if (m.seed !== p.seed) reskin(p, m.seed); // they picked a new look
        // a heartbeat: nudge them back if our copy has drifted
        const s = spotById(m.spot);
        if (s && p.spot !== s && p.goalSpot !== s && (!s.taken || s.taken === p.id)) {
          release(p);
          settle(p, s, true);
        } else if (!s && !p.path.length && Math.hypot(p.x - m.x, p.z - m.z) > 1.2) {
          leaveSpot(p);
          p.x = m.x;
          p.z = m.z;
        }
      }
      // the heartbeat also carries cucumbers, nap and float, in case that message arrived before they had settled
      if (known && p.spot) {
        const f = m.flags;
        if (!!f.cucumbers !== p.av.cucumbers || !!f.nap !== p.av.napping || !!f.float !== (p.av.pose === "float")) setFlags(p, { cucumbers: !!f.cucumbers, nap: !!f.nap, float: !!f.float });
      }
      p.lastSeen = performance.now();
      return;
    }
    if (!known) return;
    known.lastSeen = performance.now();
    if (m.t === "go") goTo(known, m.x, m.z);
    else if (m.t === "spot") {
      const s = spotById(m.spot);
      if (s) goSpot(known, s);
    } else if (m.t === "verb") doVerb(known, m.verb);
    else if (m.t === "flag") setFlags(known, m.flags);
    else if (m.t === "bye") removePerson(known);
  }

  const net: Transport | null = opts.solo ? null : tabTransport("main", onMessage);
  const botsFrom = performance.now() + 1400; // listen for an existing host first
  announce(self);
  const heartbeat = window.setInterval(() => {
    for (const p of people.values()) if (!p.remote) announce(p);
    const now = performance.now();
    for (const p of [...people.values()]) if (p.remote && now - p.lastSeen > 7000) removePerson(p);
  }, 2000);
  const botTimer = window.setInterval(() => tendBots(performance.now()), 350);
  const sayBye = () => {
    for (const p of people.values()) if (!p.remote) net?.send({ t: "bye", id: p.id });
  };
  window.addEventListener("pagehide", sayBye);

  // ------------------------------------------------------------ looking and walking

  let lookYaw = Math.PI; // 0 looks toward +z; you start facing the front door
  let lookPitch = view === "third" ? -0.2 : 0;
  let camWant = 2.7; // how far behind yourself the camera tries to sit
  let camDist = 2.7;
  let camScale = 1;
  let intro = 1; // 1 while the front door card is up, easing to 0 after you step in
  let arrived = false;
  let lastInput = performance.now() / 1000;
  let beenIn = false;
  let dockDwell = 0;
  let left = false;
  let lookGoal: { yaw: number; pitch: number; t: number } | null = null;
  let lastDrag = -10;
  let keyMove = false;
  const keys = new Set<string>();
  const pointer = { down: false, id: -1, x: 0, y: 0, moved: 0, at: 0, over: false, nx: 0, ny: 0 };
  const ray = new THREE.Raycaster();
  ray.camera = camera; // sprites in the scene need this to be ray tested
  ray.far = 60;
  const ndc = new THREE.Vector2();

  type Pick = { spot?: Spot; point?: P2 };
  function pickAt(clientX: number, clientY: number): Pick | null {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    for (const hit of ray.intersectObject(world.root, true)) {
      const o = hit.object as THREE.Mesh;
      if (!o.isMesh) continue;
      if (o === world.mirror) return null;
      const u = o.userData;
      if (u.spot) {
        const s = spotById(u.spot as string);
        if (!s) return null;
        if (!s.taken || s.taken === self.id) return { spot: s };
        const other = nearestFreeSpot(s.x, s.z, (q) => q.kind === s.kind, self.id);
        return other ? { spot: other } : null;
      }
      if (u.pool) {
        const kind = u.pool === "hot" ? "soak" : "plunge";
        const s = nearestFreeSpot(hit.point.x, hit.point.z, (q) => q.kind === kind, self.id);
        return s ? { spot: s } : null;
      }
      if (u.floor) return { point: clampToFloor(hit.point.x, hit.point.z) };
      // a bench front, a rock, a counter: walk up to it if it's low and close to the floor plan
      if (hit.point.y < 1) {
        const c = clampToFloor(hit.point.x, hit.point.z);
        if (Math.hypot(c.x - hit.point.x, c.z - hit.point.z) < 1.2) return { point: c };
      }
      return null;
    }
    return null;
  }

  const el = renderer.domElement;
  el.style.touchAction = "none";
  const onDown = (e: PointerEvent) => {
    sound.unlock();
    lastInput = performance.now() / 1000;
    if (pointer.down) return;
    pointer.down = true;
    pointer.id = e.pointerId;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.moved = 0;
    pointer.at = performance.now();
    el.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    pointer.over = true;
    pointer.nx = e.clientX;
    pointer.ny = e.clientY;
    if (!pointer.down || e.pointerId !== pointer.id || fingers.size > 1) return;
    const dx = e.clientX - pointer.x;
    const dy = e.clientY - pointer.y;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.moved += Math.abs(dx) + Math.abs(dy);
    if (pointer.moved < 5) return;
    // drag the world like a photo sphere: pull right to turn left
    const k = 0.0042 * (e.pointerType === "touch" ? 1.25 : 1);
    lookYaw += dx * k;
    lookPitch = view === "first" ? Math.max(-1.35, Math.min(1.45, lookPitch + dy * k)) : Math.max(-1.3, Math.min(0.55, lookPitch + dy * k));
    lookGoal = null;
    lastDrag = performance.now() / 1000;
  };
  const onUp = (e: PointerEvent) => {
    if (e.pointerId !== pointer.id) return;
    pointer.down = false;
    if (pointer.moved >= 7 || performance.now() - pointer.at > 600) return;
    const pick = pickAt(e.clientX, e.clientY);
    if (!pick) return;
    if (pick.spot) {
      cmd.spot(self, pick.spot);
      marker.position.set(pick.spot.x, Math.max(0.03, pick.spot.y + 0.05), pick.spot.z);
    } else if (pick.point) {
      cmd.go(self, pick.point.x, pick.point.z);
      marker.position.set(pick.point.x, 0.035, pick.point.z);
    }
    marker.scale.setScalar(pick.spot ? 1.9 : 1);
    markerGoal = 1;
  };
  const onLeave = () => (pointer.over = false);
  const onKey = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    lastInput = performance.now() / 1000;
    // 1 to 4 press the verb buttons in order; Escape gets you up
    if (e.type === "keydown" && !e.repeat && !e.metaKey && !e.ctrlKey && !e.altKey) {
      if (k === "escape" && self.spot) return act("getup");
      if (k >= "1" && k <= "9") {
        const id = actionsNow()[Number(k) - 1];
        if (id) act(id);
        return;
      }
    }
    if (!["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.type === "keydown") {
      sound.unlock();
      keys.add(k);
    } else keys.delete(k);
    e.preventDefault();
  };
  const onBlur = () => keys.clear();
  // scroll or pinch to bring the camera closer or further
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    lastInput = performance.now() / 1000;
    camWant = Math.max(1.1, Math.min(6.5, camWant * Math.exp(e.deltaY * 0.0012)));
  };
  const fingers = new Map<number, { x: number; y: number }>();
  let pinch = 0;
  const onPinch = (e: PointerEvent) => {
    if (e.pointerType !== "touch") return;
    if (e.type === "pointerup" || e.type === "pointercancel") {
      fingers.delete(e.pointerId);
      pinch = 0;
      return;
    }
    fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (fingers.size !== 2) return;
    const [a, b] = [...fingers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinch > 0) camWant = Math.max(1.1, Math.min(6.5, camWant * (pinch / d)));
    pinch = d;
    pointer.moved = 99; // a pinch is never a tap
  };
  el.addEventListener("wheel", onWheel, { passive: false });
  for (const type of ["pointerdown", "pointermove", "pointerup", "pointercancel"] as const) el.addEventListener(type, onPinch);
  el.addEventListener("pointerdown", onDown);
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerup", onUp);
  el.addEventListener("pointercancel", onUp);
  el.addEventListener("pointerleave", onLeave);
  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", onKey);
  window.addEventListener("blur", onBlur);
  const onHide = () => sound.setAsleep(document.hidden);
  document.addEventListener("visibilitychange", onHide);

  let keyTell = 0;
  function walkByKeys(dt: number) {
    const turn = (keys.has("arrowleft") ? 1 : 0) - (keys.has("arrowright") ? 1 : 0);
    if (turn) {
      lookYaw += turn * dt * 1.9;
      lookGoal = null;
      lastDrag = performance.now() / 1000;
    }
    const fwd = (keys.has("w") || keys.has("arrowup") ? 1 : 0) - (keys.has("s") || keys.has("arrowdown") ? 1 : 0);
    const side = (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0);
    keyMove = false;
    if (!fwd && !side) return;
    if (self.spot || self.goalSpot) {
      // first get up; walking starts once you're back on the floor
      if (self.spot) cmd.go(self, self.spot.ax, self.spot.az);
      return;
    }
    if (self.path.length && (inHot(self.x, self.z) || inCold(self.x, self.z))) return; // still wading out
    self.path = [];
    const sin = Math.sin(lookYaw);
    const cos = Math.cos(lookYaw);
    // forward is where you look; your right is (-cos, sin)
    let dx = sin * fwd - cos * side;
    let dz = cos * fwd + sin * side;
    const len = Math.hypot(dx, dz);
    dx = (dx / len) * 1.5 * dt;
    dz = (dz / len) * 1.5 * dt;
    if (walkable(self.x + dx, self.z + dz)) {
      self.x += dx;
      self.z += dz;
    } else if (walkable(self.x + dx, self.z)) self.x += dx;
    else if (walkable(self.x, self.z + dz)) self.z += dz;
    else return;
    self.yawGoal = Math.atan2(dx, dz);
    keyMove = true;
    keyTell -= dt;
    if (keyTell <= 0) {
      keyTell = 0.25;
      net?.send({ t: "go", id: self.id, x: self.x, z: self.z });
    }
  }

  const eye = new THREE.Vector3();
  function aimCamera(dt: number, now: number) {
    const moving = self.path.length > 0 || keyMove;
    // turn to face where you're walking, unless you've just been looking around
    if (self.path.length && now - lastDrag > 1.4 && !lookGoal) {
      lookYaw += angleTo(lookYaw, self.yawGoal) * (1 - Math.exp(-dt * (view === "first" ? 2.6 : 1.3)));
      if (view === "first") lookPitch += (0 - lookPitch) * (1 - Math.exp(-dt * 1.5));
    }
    if (lookGoal) {
      const k = 1 - Math.exp(-dt * 3.2);
      lookYaw += angleTo(lookYaw, lookGoal.yaw) * k;
      lookPitch += (lookGoal.pitch - lookPitch) * k;
      lookGoal.t -= dt;
      if (lookGoal.t <= 0) lookGoal = null;
    }
    // when you're standing still, your body follows your eyes (so the mirror shows your face)
    if (view === "first") {
      if (!moving && !self.spot) self.yawGoal = lookYaw;
      self.av.eyeWorld(eye);
      camera.position.copy(eye);
      camera.rotation.set(lookPitch - self.av.kick, lookYaw + Math.PI, 0);
      return;
    }
    // behind you: orbit a point at your head, and slide in if a wall or the ceiling is in the way
    self.av.group.updateMatrixWorld(true);
    self.av.headWorld(eye);
    eye.y += 0.1;
    const cp = Math.cos(lookPitch);
    back.set(-Math.sin(lookYaw) * cp, -Math.sin(lookPitch), -Math.cos(lookYaw) * cp);
    ray.set(eye, back);
    // wide while you arrive, then it settles in behind you; a touch further back on an upright phone
    if (arrived) intro = Math.max(0, intro - dt / 3.5);
    else intro = Math.min(1, intro + dt / 2.5); // pulling back out as you leave
    const want = camWant * camScale + 3.2 * intro * intro * (3 - 2 * intro);
    ray.far = want + 0.25;
    let free = want;
    for (const hit of ray.intersectObject(world.root, true)) {
      const o = hit.object as THREE.Mesh;
      const m = o.material as THREE.Material;
      if (!o.isMesh || o.userData.spot || o.userData.pool || Array.isArray(m) || !m.visible || m.transparent) continue;
      free = Math.max(0.45, hit.distance - 0.2);
      break;
    }
    ray.far = 60;
    camDist += (free - camDist) * (free < camDist ? 1 : 1 - Math.exp(-dt * 3.5));
    // left alone for a while, the view drifts slowly round you, like something to leave open
    if (!reduced && now - lastInput > 25 && !self.path.length && !keyMove) lookYaw += dt * 0.045;
    camera.position.copy(eye).addScaledVector(back, camDist);
    // never under the floor or under a water surface (water is see-through, so the wall test skips it)
    const cx = camera.position.x;
    const cz = camera.position.z;
    const minY = inHot(cx, cz) ? HOT.water + 0.14 : inCold(cx, cz) ? COLD.water + 0.14 : cz > 8.7 ? -0.25 : 0.14;
    if (camera.position.y < minY) camera.position.y = minY;
    camera.rotation.set(lookPitch, lookYaw + Math.PI, 0);
  }
  const back = new THREE.Vector3();

  // the mirror shows all of you, head included
  const mirrorRender = world.mirror.onBeforeRender;
  world.mirror.onBeforeRender = function (...args) {
    self.av.setHeadVisible(true);
    mirrorRender.apply(this, args);
    self.av.setHeadVisible(view === "third");
  };

  // ------------------------------------------------------------ HUD

  let lastHud = "";
  function actionsNow(): ActionId[] {
    const a: ActionId[] = [];
    const kind = self.spot?.kind;
    if (kind === "mat") a.push("cucumbers", "nap");
    else if (kind === "bench") a.push("pour", "fan");
    else if (kind === "soak") a.push("sigh", "float");
    else if (kind === "plunge") a.push("dunk");
    else if (!self.goalSpot) {
      if (self.zone === "lounge") a.push("egg", "milk");
      else if (self.zone === "sauna") a.push("pour", "fan");
      else if (self.zone === "plunge") a.push("bucket");
    }
    a.push("wave");
    if (self.spot) a.push("getup");
    return a;
  }
  function pushHud() {
    const on: ActionId[] = [];
    if (self.av.cucumbers) on.push("cucumbers");
    if (self.av.napping) on.push("nap");
    if (self.av.pose === "float") on.push("float");
    const h: Hud = {
      ready: true,
      zone: self.zone,
      name: self.av.look.name[lang],
      people: people.size,
      actions: actionsNow(),
      on,
      busy: !!self.av.verb,
      cucumbers: self.av.cucumbers,
      napping: self.av.napping,
      under,
      first: view === "first",
      left,
      heat: Math.round(self.heat * 10) / 10,
      steam: self.zone === "sauna" ? Math.round(Math.min(1, steamy) * 10) / 10 : 0,
    };
    const key = JSON.stringify(h);
    if (key === lastHud) return;
    lastHud = key;
    opts.onHud(h);
  }

  // ------------------------------------------------------------ frame loop

  function resize() {
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // wider on a tall phone so rooms don't feel like corridors
    camera.fov = w < h ? 82 : 68;
    camScale = w < h ? 1.2 : 1;
    camera.updateProjectionMatrix();
    puffs.setScale((h * renderer.getPixelRatio()) / (2 * Math.tan((camera.fov * Math.PI) / 360)));
  }
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  let last = performance.now();
  let t = 0;
  let raf = 0;
  let hoverTick = 0;
  let disposed = false;
  let slow = 0;
  let downshifts = 0;
  function frame() {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    const nowMs = performance.now();
    const raw = (nowMs - last) / 1000;
    const dt = Math.min(0.05, raw);
    last = nowMs;
    // a struggling phone: if frames stay slow for about three seconds, draw fewer pixels (twice at most)
    if (raw < 0.25) {
      slow = raw > 0.034 ? slow + 1 : Math.max(0, slow - 2);
      if (slow > 90 && downshifts < 2) {
        slow = 0;
        downshifts++;
        renderer.setPixelRatio(Math.max(1, renderer.getPixelRatio() - 0.4));
        if (downshifts === 2) renderer.shadowMap.enabled = false;
        resize();
      }
    }
    tick(dt);
  }
  function tick(dt: number) {
    t += dt;

    walkByKeys(dt);
    thinkBots(dt);
    for (const p of people.values()) stepPerson(p, dt, t);
    aimCamera(dt, performance.now() / 1000);

    // name tags fade in as you get close
    for (const p of people.values()) {
      if (p.self) {
        p.av.setLabelOpacity(view === "third" && camDist > 1.2 ? 0.85 : 0);
        continue;
      }
      const d = Math.hypot(p.x - self.x, p.z - self.z);
      p.av.setLabelOpacity(Math.max(0, Math.min(1, (6 - d) / 2.5, (d - 0.8) / 0.6)));
    }

    // steam hangs in the sauna after a pour
    steamy = Math.max(0, steamy - dt * 0.035);
    if (steamy > 0.05 && Math.random() < steamy * 0.5) {
      puffs.spawn(-12.6 + Math.random() * 4.2, 0.4 + Math.random() * 1.6, -2.2 + Math.random() * 4.4, (Math.random() - 0.5) * 0.1, 0.05, (Math.random() - 0.5) * 0.1, 4, 0.9, 0.07 * Math.min(1, steamy), 0.3);
    }

    // show where a click would take you (mouse only; a finger has no hover)
    if (markerGoal > 0 && !self.path.length) markerGoal = 0;
    if (pointer.over && !pointer.down && !self.path.length && ++hoverTick % 3 === 0) {
      const pick = pickAt(pointer.nx, pointer.ny);
      if (pick) {
        const at = pick.spot ?? pick.point!;
        marker.position.set(at.x, pick.spot ? Math.max(0.03, pick.spot.y + 0.05) : 0.035, at.z);
        marker.scale.setScalar(pick.spot ? 1.9 : 1);
        markerGoal = 0.55;
      } else markerGoal = 0;
    }
    const mm = marker.material as THREE.MeshBasicMaterial;
    mm.opacity += (markerGoal - mm.opacity) * (1 - Math.exp(-dt * 10));
    marker.visible = mm.opacity > 0.01;

    world.update(t, dt, camera.position);
    puffs.update(dt);
    drops.update(dt);
    words.update(dt);
    prints.update(dt);
    const inside = self.zone === "lounge" || self.zone === "sauna";
    sound.update(self.x, self.z, lookYaw, self.zone, inside, under ? 1 : self.av.napping ? 0.9 : self.av.cucumbers ? 0.25 : 0);
    pushHud();
    renderer.render(scene, camera);
  }
  frame();

  // handy when poking at it from the console
  (window as unknown as { __spa?: unknown }).__spa = { people, self, cmd, spots: SPOTS, camera, info: renderer.info, look: (yaw: number, pitch: number) => ((lookYaw = yaw), (lookPitch = pitch)),
    /** Run the world forward by hand, for when the tab is in the background (testing only). */
    run(seconds: number) {
      for (let i = 0; i < seconds * 30; i++) tick(1 / 30);
    },
    /** Stand one person of every hair and hat combination in the garden (testing only). */
    gallery(wet = false, only: "none" | "sheep" | "" = "") {
      for (let st = 0; st < 8; st++) {
        for (const [row, hat] of [[0, "none"], [1, "sheep"]] as const) {
          if (only && only !== hat) continue;
          const look = { ...lookFromSeed(1000 + st * 7 + row), hairStyle: st, hat };
          const av = new Avatar(look, lang);
          av.setWet(wet);
          av.group.position.set(6.6 + st * 0.95, 0, 3 + row * 1.2);
          av.update(0.016, 0);
          av.setLabelOpacity(0);
          scene.add(av.group);
        }
      }
    },
    /** Swing the camera round to look at your own face (testing only). */
    front(pitch = -0.15, dist = 2.2) {
      lookYaw = self.yaw + Math.PI;
      lookPitch = pitch;
      camWant = dist;
      lookGoal = null;
      lastDrag = performance.now() / 1000 + 1e6;
    },
    /** Jump somewhere and look a given way (testing only). */
    tp(x: number, z: number, yaw: number, pitch = 0) {
      leaveSpot(self);
      self.path = [];
      self.x = x;
      self.z = z;
      lookYaw = yaw;
      lookPitch = pitch;
      lookGoal = null;
    },
  };

  function act(id: ActionId) {
    sound.unlock();
    lastInput = performance.now() / 1000;
    if (id === "getup") {
      if (self.spot) cmd.go(self, self.spot.ax, self.spot.az);
      lookGoal = { yaw: lookYaw, pitch: view === "first" ? 0 : -0.2, t: 1 };
    } else if (id === "cucumbers") cmd.flag(self, { cucumbers: !self.av.cucumbers });
    else if (id === "nap") cmd.flag(self, { nap: !self.av.napping });
    else if (id === "float") cmd.flag(self, { float: self.av.pose !== "float" });
    else cmd.verb(self, id);
  }

  return {
    act,
    arrive() {
      arrived = true;
      beenIn = false;
      left = false;
      sound.unlock();
      // step off the boat and stroll up to the porch, unless you've already wandered off
      if (Math.hypot(self.x - SPAWN.x, self.z - SPAWN.z) < 1 && !self.path.length) {
        sound.play("creak", self.x + 1.5, self.z, { gain: 1.2 });
        sound.play("plop", self.x + 1.5, self.z, { gain: 0.5 });
        cmd.go(self, PORCH.x, PORCH.z);
      }
    },
    setMuted: (m) => sound.setMuted(m),
    setTime: (t) => world.setTime(t),
    setBots: (n) => (botTarget = n),
    setView(v) {
      view = v;
      self.av.setHeadVisible(v === "third");
      self.av.firstPerson = v === "first";
      lookPitch = v === "third" ? -0.2 : 0;
      under = false;
    },
    setBody(b) {
      setBodyStyle(b);
      for (const p of people.values()) reskin(p, p.seed);
    },
    setFace(f) {
      setFaceStyle(f);
      for (const p of people.values()) reskin(p, p.seed);
    },
    newLook() {
      reskin(self, (Math.random() * 2 ** 31) | 0);
      announce(self);
      sound.play("soft", self.x, self.z);
    },
    setLang(l) {
      lang = l;
      for (const p of people.values()) p.av.setName(l);
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      sayBye();
      net?.close();
      clearInterval(heartbeat);
      clearInterval(botTimer);
      ro.disconnect();
      window.removeEventListener("pagehide", sayBye);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onHide);
      for (const p of [...people.values()]) removePerson(p);
      world.dispose();
      sound.dispose();
      renderer.dispose();
      el.remove();
    },
  };
}
