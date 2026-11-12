// Pieces of the 3D handheld shared by the lab study (handheld-3d) and Cat host's
// 3D console: textures drawn in code, outline shapes, and the button clicks.
import * as THREE from "three";
import { unlockAudio } from "../../components/ps1-mascot";

// ---------------------------------------------------------------- textures

/** Fine plastic grain, used as both bump and roughness variation. */
export function grainTexture(size = 256) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const img = g.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 118 + Math.random() * 20;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 3);
  return t;
}

/** A soft dark spot: the ambient occlusion under a button, in its well. */
export function aoTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(64, 64, 30, 64, 64, 64);
  r.addColorStop(0, "rgba(60,15,35,0.55)");
  r.addColorStop(0.7, "rgba(60,15,35,0.18)");
  r.addColorStop(1, "rgba(60,15,35,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

/** Small print on the plastic (button names, the wordmark). */
export function printTexture(text: string, color: string, w = 256, h = 64, px = 34) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = color;
  g.font = `600 ${px}px "Space Grotesk", system-ui, sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.letterSpacing = "4px";
  g.fillText(text, w / 2, h / 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** The glass glare: one soft diagonal band. */
export function glareTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const l = g.createLinearGradient(0, 0, 256, 256);
  l.addColorStop(0, "rgba(255,255,255,0.20)");
  l.addColorStop(0.32, "rgba(255,255,255,0.06)");
  l.addColorStop(0.33, "rgba(255,255,255,0)");
  l.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = l;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

// ---------------------------------------------------------------- shapes

export function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, (3 * Math.PI) / 2, false);
  return s;
}

export function crossShape(arm: number, half: number, r: number) {
  // A plus sign whose four ends are rounded.
  const s = new THREE.Shape();
  s.moveTo(-arm, half - r);
  s.quadraticCurveTo(-arm, half, -arm + r, half);
  s.lineTo(arm - r, half);
  s.quadraticCurveTo(arm, half, arm, half - r);
  s.lineTo(arm, arm);
  s.lineTo(half - r, arm);
  s.quadraticCurveTo(half, arm, half, arm - r);
  s.lineTo(half, -arm + r);
  s.quadraticCurveTo(half, -arm, half - r, -arm);
  s.lineTo(arm, -arm);
  s.lineTo(arm, -half + r);
  s.quadraticCurveTo(arm, -half, arm - r, -half);
  s.lineTo(-arm + r, -half);
  s.quadraticCurveTo(-arm, -half, -arm, -half + r);
  s.lineTo(-arm, -arm);
  s.lineTo(-half + r, -arm);
  s.quadraticCurveTo(-half, -arm, -half, -arm + r);
  s.lineTo(-half, arm - r);
  s.quadraticCurveTo(-half, arm, -half + r, arm);
  s.lineTo(-arm, arm);
  s.lineTo(-arm, half - r);
  return s;
}

export function triangleShape(r: number) {
  const s = new THREE.Shape();
  for (let i = 0; i < 3; i++) {
    const a = Math.PI / 2 + (i * 2 * Math.PI) / 3;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  s.closePath();
  return s;
}

// ---------------------------------------------------------------- sound

export type ClickKind = "pop" | "tick" | "wood";
// one note per button, so pressing around plays a little pentatonic tune
const WOOD_NOTES = [523.25, 587.33, 659.25, 783.99, 880];

export function makeClicker() {
  let ctx: AudioContext | null = null;
  let noise: AudioBuffer | null = null;
  let kind: ClickKind = "pop";
  let waiting = false;
  const play = (down: boolean, pitch = 1, note = 2) => {
    // The cat's audio, not one of its own: iPhone Safari only starts sound when
    // a finger lifts, and the press comes on touch down, so a fresh context here
    // stayed silent for the first press. The shared one is unlocked by every
    // tap; a press that lands before that sounds as soon as it's running.
    ctx ??= unlockAudio();
    if (!ctx) return;
    if (ctx.state !== "running") {
      if (down && !waiting) {
        waiting = true;
        void ctx.resume().then(() => {
          waiting = false;
          play(true, pitch, note);
        });
      }
      return;
    }
    if (!noise) {
      noise = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const c = ctx;
    const t = c.currentTime;
    const env = (peak: number, attack: number, decay: number) => {
      const g = c.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0008, t + attack + decay);
      g.connect(c.destination);
      return g;
    };
    if (kind === "pop") {
      // a soft bubble: a sine that drops in pitch, nothing on release
      if (!down) return;
      const o = c.createOscillator();
      o.frequency.setValueAtTime(760 * pitch, t);
      o.frequency.exponentialRampToValueAtTime(380 * pitch, t + 0.06);
      o.connect(env(0.13, 0.004, 0.08));
      o.start(t);
      o.stop(t + 0.1);
    } else if (kind === "tick") {
      // a tiny dry tick, like a phone keyboard, quieter on release
      const src = c.createBufferSource();
      src.buffer = noise;
      const hp = c.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 2800;
      src.connect(hp).connect(env(down ? 0.09 : 0.035, 0.001, 0.012));
      src.start(t);
      src.stop(t + 0.03);
    } else {
      // a little marimba bar: fundamental plus a fast-fading fourth partial
      if (!down) return;
      const f = WOOD_NOTES[note % WOOD_NOTES.length] * (pitch < 0.7 ? 0.5 : 1);
      for (const [mul, peak, decay] of [[1, 0.12, 0.28], [4, 0.04, 0.05]] as const) {
        const o = c.createOscillator();
        o.frequency.value = f * mul;
        o.connect(env(peak, 0.003, decay));
        o.start(t);
        o.stop(t + decay + 0.05);
      }
    }
  };
  return Object.assign(play, { setKind: (k: ClickKind) => (kind = k) });
}
