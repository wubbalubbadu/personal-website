// Every sound in the bathhouse is made here from oscillators and noise, so
// there are no audio files to load. Two kinds: a bed of ambience that follows
// which room you're in, and one-shots placed where they happen.
import { HOT, type Zone } from "./nav";

export type Shot =
  | "hiss" | "splash" | "plop" | "step" | "ahh" | "gasp" | "brr" | "pha" | "gulp" | "egg" | "whoosh" | "chime" | "creak" | "soft";

type Layer = { gain: GainNode; level: number };

export class Sound {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private muffle!: BiquadFilterNode;
  private white!: AudioBuffer;
  private brown!: AudioBuffer;
  private layers: Record<"water" | "trickle" | "crickets" | "sauna" | "room" | "radio", Layer> | null = null;
  private radioBus!: GainNode;
  private muted = false;
  private lx = 0;
  private lz = 0;
  private lyaw = 0;
  private nextBloop = 0;
  private nextCrackle = 0;
  private nextNote = 0;
  private noteIndex = 0;

  /** Call from a click or key press; browsers won't start audio otherwise. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.muffle = ctx.createBiquadFilter();
    this.muffle.type = "lowpass";
    this.muffle.frequency.value = 20000;
    this.master.connect(this.muffle).connect(ctx.destination);

    const len = ctx.sampleRate * 2;
    this.white = ctx.createBuffer(1, len, ctx.sampleRate);
    this.brown = ctx.createBuffer(1, len, ctx.sampleRate);
    const w = this.white.getChannelData(0);
    const b = this.brown.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      w[i] = Math.random() * 2 - 1;
      last = (last + 0.02 * w[i]) / 1.02;
      b[i] = last * 3.5;
    }

    const layer = (): Layer => {
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(this.master);
      return { gain, level: 0 };
    };
    const loop = (buf: AudioBuffer, rate = 1) => {
      const s = ctx.createBufferSource();
      s.buffer = buf;
      s.loop = true;
      s.playbackRate.value = rate;
      s.start();
      return s;
    };
    const filter = (type: BiquadFilterType, f: number, q = 1) => {
      const n = ctx.createBiquadFilter();
      n.type = type;
      n.frequency.value = f;
      n.Q.value = q;
      return n;
    };
    const lfo = (rate: number, depth: number, target: AudioParam) => {
      const o = ctx.createOscillator();
      o.frequency.value = rate;
      const g = ctx.createGain();
      g.gain.value = depth;
      o.connect(g).connect(target);
      o.start();
    };

    const L = { water: layer(), trickle: layer(), crickets: layer(), sauna: layer(), room: layer(), radio: layer() };
    this.layers = L;

    // hot spring: a low burble that swells and fades
    const burble = ctx.createGain();
    burble.gain.value = 0.6;
    loop(this.brown).connect(filter("bandpass", 520, 0.7)).connect(burble).connect(L.water.gain);
    lfo(0.23, 0.25, burble.gain);
    lfo(0.71, 0.12, burble.gain);
    // the spout: a thin bright trickle
    loop(this.white, 0.9).connect(filter("bandpass", 3200, 1.4)).connect(L.trickle.gain);
    // crickets: two high tones chopped into chirps
    for (const [f, chop, slow] of [[4300, 27, 0.63], [4850, 31, 0.41]]) {
      const o = ctx.createOscillator();
      o.frequency.value = f;
      const g1 = ctx.createGain();
      g1.gain.value = 0.5;
      const g2 = ctx.createGain();
      g2.gain.value = 0.5;
      o.connect(g1).connect(g2).connect(L.crickets.gain);
      lfo(chop, 0.5, g1.gain);
      lfo(slow, 0.5, g2.gain);
      o.start();
    }
    // sauna: the stove's low breath
    loop(this.brown, 0.7).connect(filter("lowpass", 170)).connect(L.sauna.gain);
    // lounge: a soft room tone, plus the radio's own bus so it sounds like it's across the room
    loop(this.brown, 1.3).connect(filter("bandpass", 240, 0.5)).connect(L.room.gain);
    this.radioBus = ctx.createGain();
    this.radioBus.gain.value = 1;
    this.radioBus.connect(filter("lowpass", 1100, 0.7)).connect(L.radio.gain);
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.08);
  }

  /** Once a frame: where the ears are, which room, and how muffled (0 open, 1 under water or asleep). */
  update(x: number, z: number, yaw: number, zone: Zone, inside: boolean, muffle: number) {
    const ctx = this.ctx;
    if (!ctx || !this.layers) return;
    this.lx = x;
    this.lz = z;
    this.lyaw = yaw;
    const t = ctx.currentTime;
    const L = this.layers;
    const dHot = Math.hypot(x - HOT.cx, z - HOT.cz);
    const nearHot = 1 / (1 + (dHot / 5) ** 2);
    const outdoors = !inside;
    const set = (l: Layer, v: number) => {
      if (Math.abs(l.level - v) < 0.002) return;
      l.level = v;
      l.gain.gain.setTargetAtTime(v, t, 0.35);
    };
    set(L.water, nearHot * (outdoors ? 0.32 : 0.1));
    set(L.trickle, nearHot * (outdoors ? 0.05 : 0.012));
    set(L.crickets, outdoors ? 0.012 : 0.003);
    set(L.sauna, zone === "sauna" ? 0.5 : 0);
    set(L.room, zone === "lounge" ? 0.1 : 0);
    set(L.radio, zone === "lounge" ? 0.16 : inside ? 0 : 0.02);
    this.muffle.frequency.setTargetAtTime(20000 - muffle * 19450, t, 0.12);

    // loose drips in the spring
    if (t > this.nextBloop) {
      this.nextBloop = t + 0.25 + Math.random() * 1.1;
      if (nearHot > 0.2) this.bloop(t, 380 + Math.random() * 600, 0.035 * nearHot);
    }
    // embers ticking in the stove
    if (zone === "sauna" && t > this.nextCrackle) {
      this.nextCrackle = t + 0.12 + Math.random() * 0.9;
      this.click(t, 1800 + Math.random() * 3500, 0.05 + Math.random() * 0.06, this.master);
    }
    // the radio: a slow tune on a five note scale, never quite repeating
    if (L.radio.level > 0.01 && t > this.nextNote) {
      const scale = [0, 2, 4, 7, 9, 12, 14, 16];
      this.noteIndex = Math.max(0, Math.min(scale.length - 1, this.noteIndex + ((Math.random() * 5) | 0) - 2));
      const rest = Math.random() < 0.18;
      const beat = 0.46;
      this.nextNote = Math.max(t, this.nextNote) + beat * (Math.random() < 0.3 ? 2 : 1);
      if (!rest) this.pluck(t + 0.02, 220 * 2 ** ((scale[this.noteIndex] + 3) / 12), 0.5);
    }
  }

  /** A one-shot at a place in the world. */
  play(shot: Shot, x: number, z: number, opts: { pitch?: number; gain?: number } = {}) {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const d = Math.hypot(x - this.lx, z - this.lz);
    const fall = 1 / (1 + (d / 4.5) ** 2);
    if (fall < 0.02) return;
    const out = ctx.createGain();
    out.gain.value = fall * (opts.gain ?? 1);
    const pan = ctx.createStereoPanner();
    // which side of your head it's on
    const dx = x - this.lx;
    const dz = z - this.lz;
    const rightward = dx * -Math.cos(this.lyaw) + dz * Math.sin(this.lyaw);
    pan.pan.value = d < 0.3 ? 0 : Math.max(-0.8, Math.min(0.8, (rightward / d) * Math.min(1, d / 2)));
    out.connect(pan).connect(this.master);
    const t = ctx.currentTime;
    const p = opts.pitch ?? 1;
    switch (shot) {
      case "hiss": {
        const s = this.noise(this.white);
        const f = ctx.createBiquadFilter();
        f.type = "bandpass";
        f.Q.value = 0.6;
        f.frequency.setValueAtTime(7500, t);
        f.frequency.exponentialRampToValueAtTime(2200, t + 2.6);
        const g = this.env(t, 0.06, 0.5, 2.8);
        s.connect(f).connect(g).connect(out);
        s.stop(t + 3.2);
        break;
      }
      case "splash":
      case "plop": {
        const big = shot === "splash";
        const s = this.noise(this.white);
        const f = ctx.createBiquadFilter();
        f.type = "lowpass";
        f.frequency.setValueAtTime(big ? 2600 : 1500, t);
        f.frequency.exponentialRampToValueAtTime(big ? 380 : 300, t + (big ? 0.7 : 0.35));
        const g = this.env(t, 0.01, big ? 0.5 : 0.2, big ? 0.8 : 0.4);
        s.connect(f).connect(g).connect(out);
        s.stop(t + 1.2);
        for (let i = 0; i < (big ? 5 : 2); i++) this.bloop(t + 0.08 + Math.random() * 0.5, 300 + Math.random() * 500, 0.08, out);
        break;
      }
      case "step": {
        const s = this.noise(this.brown);
        const f = ctx.createBiquadFilter();
        f.type = "lowpass";
        f.frequency.value = 700 * p;
        const g = this.env(t, 0.004, 0.22, 0.07);
        s.connect(f).connect(g).connect(out);
        s.stop(t + 0.2);
        break;
      }
      case "soft": {
        const s = this.noise(this.white);
        const f = ctx.createBiquadFilter();
        f.type = "lowpass";
        f.frequency.value = 900;
        const g = this.env(t, 0.03, 0.12, 0.25);
        s.connect(f).connect(g).connect(out);
        s.stop(t + 0.5);
        break;
      }
      case "creak": {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.setValueAtTime(95, t);
        o.frequency.linearRampToValueAtTime(70, t + 0.25);
        const f = ctx.createBiquadFilter();
        f.type = "bandpass";
        f.frequency.value = 600;
        f.Q.value = 6;
        const g = this.env(t, 0.03, 0.12, 0.25);
        o.connect(f).connect(g).connect(out);
        o.start(t);
        o.stop(t + 0.4);
        break;
      }
      case "ahh":
        this.voice(t, out, 200 * p, 170 * p, [760, 1180], 0.16, 1.1, 0.35, 0.25);
        break;
      case "pha":
        this.voice(t, out, 260 * p, 190 * p, [880, 1350], 0.03, 0.42, 0.4, 0.45);
        break;
      case "brr": {
        const g = ctx.createGain();
        g.gain.value = 1;
        const trem = ctx.createOscillator();
        trem.frequency.value = 19;
        const depth = ctx.createGain();
        depth.gain.value = 0.9;
        trem.connect(depth).connect(g.gain);
        trem.start(t);
        trem.stop(t + 1);
        g.connect(out);
        this.voice(t, g, 150 * p, 135 * p, [420, 980], 0.04, 0.6, 0.35, 0.2);
        break;
      }
      case "gasp": {
        // a sharp breath in, then a small voiced squeak
        const s = this.noise(this.white);
        const f = ctx.createBiquadFilter();
        f.type = "bandpass";
        f.Q.value = 2.2;
        f.frequency.setValueAtTime(1500, t);
        f.frequency.exponentialRampToValueAtTime(3000, t + 0.22);
        const g = this.env(t, 0.03, 0.4, 0.26);
        s.connect(f).connect(g).connect(out);
        s.stop(t + 0.5);
        this.voice(t + 0.02, out, 330 * p, 420 * p, [900, 1500], 0.02, 0.16, 0.22, 0.1);
        break;
      }
      case "gulp": {
        const o = ctx.createOscillator();
        o.frequency.setValueAtTime(300 * p, t);
        o.frequency.exponentialRampToValueAtTime(170 * p, t + 0.09);
        const g = this.env(t, 0.008, 0.3, 0.1);
        o.connect(g).connect(out);
        o.start(t);
        o.stop(t + 0.2);
        break;
      }
      case "egg": {
        this.click(t, 3400, 0.35, out);
        const o = ctx.createOscillator();
        o.frequency.setValueAtTime(200, t);
        o.frequency.exponentialRampToValueAtTime(115, t + 0.09);
        const g = this.env(t, 0.004, 0.5, 0.11);
        o.connect(g).connect(out);
        o.start(t);
        o.stop(t + 0.2);
        break;
      }
      case "whoosh": {
        const s = this.noise(this.white);
        const f = ctx.createBiquadFilter();
        f.type = "bandpass";
        f.Q.value = 1.2;
        f.frequency.setValueAtTime(500, t);
        f.frequency.exponentialRampToValueAtTime(1300, t + 0.16);
        f.frequency.exponentialRampToValueAtTime(450, t + 0.36);
        const g = this.env(t, 0.1, 0.16, 0.26);
        s.connect(f).connect(g).connect(out);
        s.stop(t + 0.6);
        break;
      }
      case "chime":
        for (const [f, a] of [[1318, 0.07], [1976, 0.04], [2637, 0.02]]) {
          const o = ctx.createOscillator();
          o.frequency.value = f * p;
          const g = this.env(t, 0.005, a, 1.4);
          o.connect(g).connect(out);
          o.start(t);
          o.stop(t + 2);
        }
        break;
    }
  }

  /** Stop making sound while the page is in the background, and pick up again when it's back. */
  setAsleep(asleep: boolean) {
    if (!this.ctx) return;
    if (asleep) void this.ctx.suspend();
    else void this.ctx.resume();
  }

  dispose() {
    void this.ctx?.close();
    this.ctx = null;
    this.layers = null;
  }

  // ---- building blocks

  private noise(buf: AudioBuffer) {
    const s = this.ctx!.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    s.start(0, Math.random() * 1.5);
    return s;
  }
  /** A gain that rises to a peak and dies away. */
  private env(t: number, attack: number, peak: number, release: number) {
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.setTargetAtTime(0.0001, t + attack, release / 3.5);
    return g;
  }
  private bloop(t: number, f: number, gain: number, out: AudioNode = this.master) {
    const o = this.ctx!.createOscillator();
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 1.7, t + 0.07);
    const g = this.env(t, 0.006, gain, 0.09);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.2);
  }
  private click(t: number, f: number, gain: number, out: AudioNode) {
    const s = this.noise(this.white);
    const bp = this.ctx!.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = f;
    bp.Q.value = 3;
    const g = this.env(t, 0.001, gain, 0.025);
    s.connect(bp).connect(g).connect(out);
    s.stop(t + 0.1);
  }
  private pluck(t: number, f: number, gain: number) {
    const o = this.ctx!.createOscillator();
    o.type = "triangle";
    o.frequency.value = f;
    const o2 = this.ctx!.createOscillator();
    o2.frequency.value = f * 2.01;
    const g = this.env(t, 0.004, gain, 0.9);
    const g2 = this.env(t, 0.004, gain * 0.25, 0.3);
    o.connect(g).connect(this.radioBus);
    o2.connect(g2).connect(this.radioBus);
    o.start(t);
    o2.start(t);
    o.stop(t + 1.6);
    o2.stop(t + 0.8);
  }
  /** A breathy vowel: a buzz and some air through two mouth shaped filters. */
  private voice(t: number, out: AudioNode, f0: number, f1: number, formants: number[], attack: number, hold: number, gain: number, air: number) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.setTargetAtTime(0.0001, t + attack + hold * 0.4, hold * 0.3);
    g.connect(out);
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(f0, t);
    o.frequency.linearRampToValueAtTime(f1, t + attack + hold);
    const n = this.noise(this.white);
    const ng = ctx.createGain();
    ng.gain.value = air;
    n.connect(ng);
    for (const f of formants) {
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = f;
      bp.Q.value = 5;
      o.connect(bp);
      ng.connect(bp);
      bp.connect(g);
    }
    const end = t + attack + hold * 2.2;
    o.start(t);
    o.stop(end);
    n.stop(end);
  }
}
