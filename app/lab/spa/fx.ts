// Everything that moves but isn't a person: water, steam, droplets, the sky,
// stars, fireflies and the little words that float up ("ahh", "brr").
import * as THREE from "three";

// ---------------------------------------------------------------- textures

export function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat = true) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

let dot: THREE.Texture | null = null;
/** A soft round blob, used for steam, glows and fireflies. */
export function softDot() {
  dot ??= canvasTexture(
    128,
    128,
    (g) => {
      const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, "rgba(255,255,255,1)");
      grad.addColorStop(0.35, "rgba(255,255,255,0.55)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, 128, 128);
    },
    false,
  );
  return dot;
}

// ---------------------------------------------------------------- water

const MAX_RIPPLES = 8;

export type Water = {
  mesh: THREE.Mesh;
  uniforms: Record<string, THREE.IUniform>;
  ripple(x: number, z: number, strength?: number): void;
};

export function makeWater(geo: THREE.BufferGeometry, deep: string, shallow: string, alpha: number): Water {
  const uniforms = {
    uTime: { value: 0 },
    uDeep: { value: new THREE.Color(deep) },
    uShallow: { value: new THREE.Color(shallow) },
    uSky: { value: new THREE.Color("#8a7fb0") },
    uLight: { value: new THREE.Vector3(0.4, 0.5, 0.3).normalize() },
    uLightColor: { value: new THREE.Color("#ffe2b8") },
    uAlpha: { value: alpha },
    uRip: { value: Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector4(0, 0, -100, 0)) },
    uFogColor: { value: new THREE.Color("#2a2540") },
    uFogDensity: { value: 0.006 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uAlpha, uFogDensity;
      uniform vec3 uDeep, uShallow, uSky, uLight, uLightColor, uFogColor;
      uniform vec4 uRip[${MAX_RIPPLES}];
      varying vec3 vW;
      float waves(vec2 p) {
        float t = uTime;
        return sin(p.x * 2.1 + t * 0.9) * 0.25 + sin(p.y * 2.7 - t * 1.1) * 0.25
             + sin((p.x + p.y) * 4.3 + t * 1.7) * 0.12 + sin((p.x - p.y) * 6.1 - t * 2.3) * 0.07;
      }
      float rings(vec2 p) {
        float sum = 0.0;
        for (int i = 0; i < ${MAX_RIPPLES}; i++) {
          vec4 r = uRip[i];
          float age = uTime - r.z;
          if (age < 0.0 || age > 4.0) continue;
          float d = distance(p, r.xy) - age * 0.9;
          sum += exp(-d * d * 9.0) * sin(d * 16.0) * r.w * (1.0 - age / 4.0);
        }
        return sum;
      }
      float height(vec2 p) { return waves(p) + rings(p) * 2.2; }
      void main() {
        vec2 p = vW.xz;
        float e = 0.04;
        float h0 = height(p);
        vec2 g = vec2(height(p + vec2(e, 0.0)) - h0, height(p + vec2(0.0, e)) - h0) / e * 0.07;
        vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
        vec3 V = normalize(cameraPosition - vW);
        float fres = pow(1.0 - max(dot(n, V), 0.0), 3.0);
        vec3 col = mix(uDeep, uShallow, clamp(0.5 + h0 * 0.7, 0.0, 1.0));
        col = mix(col, uSky, fres * 0.75);
        vec3 H = normalize(uLight + V);
        col += uLightColor * pow(max(dot(n, H), 0.0), 90.0) * 0.9;
        col += vec3(1.0) * max(rings(p), 0.0) * 0.35;
        float a = mix(uAlpha, 1.0, fres);
        float dist = distance(cameraPosition, vW);
        float fog = 1.0 - exp(-dist * dist * uFogDensity * uFogDensity);
        col = mix(col, uFogColor, fog);
        gl_FragColor = vec4(col, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 2;
  let next = 0;
  return {
    mesh,
    uniforms,
    ripple(x, z, strength = 1) {
      (uniforms.uRip.value as THREE.Vector4[])[next].set(x, z, uniforms.uTime.value, strength);
      next = (next + 1) % MAX_RIPPLES;
    },
  };
}

// ---------------------------------------------------------------- steam

/** A pool of soft blobs that drift, grow and fade. Used for all steam and mist. */
export class Puffs {
  readonly points: THREE.Points;
  private n: number;
  private pos: Float32Array;
  private vel: Float32Array;
  private alpha: Float32Array;
  private size: Float32Array;
  private life: Float32Array; // seconds left
  private span: Float32Array; // total seconds
  private peak: Float32Array;
  private grow: Float32Array;
  private cursor = 0;
  private mat: THREE.ShaderMaterial;

  constructor(n = 500, color = "#f4efe9") {
    this.n = n;
    this.pos = new Float32Array(n * 3);
    this.vel = new Float32Array(n * 3);
    this.alpha = new Float32Array(n);
    this.size = new Float32Array(n);
    this.life = new Float32Array(n);
    this.span = new Float32Array(n);
    this.peak = new Float32Array(n);
    this.grow = new Float32Array(n);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute("aAlpha", new THREE.BufferAttribute(this.alpha, 1));
    geo.setAttribute("aSize", new THREE.BufferAttribute(this.size, 1));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: softDot() }, uColor: { value: new THREE.Color(color) }, uScale: { value: 600 } },
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        attribute float aAlpha, aSize;
        uniform float uScale;
        varying float vA;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          // steam thins out right at your face instead of becoming one big blob
          vA = min(aAlpha, 0.3) * smoothstep(0.15, 1.0, -mv.z);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = min(aSize * uScale / max(-mv.z, 0.05), 700.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        uniform vec3 uColor;
        varying float vA;
        void main() {
          float a = texture2D(uMap, gl_PointCoord).a * vA;
          if (a < 0.003) discard;
          gl_FragColor = vec4(uColor, a);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
  }

  /** Points are sized in metres; this is the screen height in pixels over 2 tan(fov / 2). */
  setScale(s: number) {
    this.mat.uniforms.uScale.value = s;
  }
  setColor(c: THREE.ColorRepresentation) {
    (this.mat.uniforms.uColor.value as THREE.Color).set(c);
  }

  spawn(x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, size: number, alpha: number, grow = 0.6) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.n;
    this.pos[i * 3] = x;
    this.pos[i * 3 + 1] = y;
    this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx;
    this.vel[i * 3 + 1] = vy;
    this.vel[i * 3 + 2] = vz;
    this.life[i] = this.span[i] = life;
    this.size[i] = size;
    this.peak[i] = alpha;
    this.grow[i] = grow;
  }

  /** A cloud of them at once. */
  burst(x: number, y: number, z: number, count: number, spread: number, up: number, life: number, size: number, alpha: number) {
    for (let k = 0; k < count; k++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * spread;
      this.spawn(
        x + Math.cos(a) * r * 0.3,
        y + Math.random() * 0.2,
        z + Math.sin(a) * r * 0.3,
        Math.cos(a) * r * 0.5,
        up * (0.5 + Math.random()),
        Math.sin(a) * r * 0.5,
        life * (0.6 + Math.random() * 0.8),
        size * (0.6 + Math.random() * 0.8),
        alpha,
      );
    }
  }

  update(dt: number) {
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) {
        this.alpha[i] = 0;
        continue;
      }
      this.life[i] -= dt;
      const k = 1 - this.life[i] / this.span[i]; // 0 to 1
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      // steam slows as it spreads
      const drag = Math.exp(-dt * 0.6);
      this.vel[i * 3] *= drag;
      this.vel[i * 3 + 2] *= drag;
      this.size[i] += this.grow[i] * dt;
      this.alpha[i] = this.peak[i] * Math.min(1, k * 6) * (1 - k) ** 1.4;
    }
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.aAlpha.needsUpdate = true;
    g.attributes.aSize.needsUpdate = true;
  }
}

// ---------------------------------------------------------------- droplets

/** Small beads of water thrown by splashes; they fall and vanish at the surface. */
export class Drops {
  readonly mesh: THREE.InstancedMesh;
  private n: number;
  private p: Float32Array;
  private v: Float32Array;
  private life: Float32Array;
  private floor: Float32Array;
  private cursor = 0;
  private m = new THREE.Matrix4();

  constructor(n = 160) {
    this.n = n;
    this.p = new Float32Array(n * 3);
    this.v = new Float32Array(n * 3);
    this.life = new Float32Array(n);
    this.floor = new Float32Array(n);
    this.mesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.022, 6, 5),
      new THREE.MeshStandardMaterial({ color: "#dff1f5", roughness: 0.15, metalness: 0, transparent: true, opacity: 0.85 }),
      n,
    );
    this.mesh.frustumCulled = false;
    this.m.makeScale(0, 0, 0);
    for (let i = 0; i < n; i++) this.mesh.setMatrixAt(i, this.m);
  }

  splash(x: number, y: number, z: number, count: number, power: number) {
    for (let k = 0; k < count; k++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.n;
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * power;
      this.p[i * 3] = x + Math.cos(a) * 0.1;
      this.p[i * 3 + 1] = y;
      this.p[i * 3 + 2] = z + Math.sin(a) * 0.1;
      this.v[i * 3] = Math.cos(a) * r;
      this.v[i * 3 + 1] = power * (0.9 + Math.random() * 1.2);
      this.v[i * 3 + 2] = Math.sin(a) * r;
      this.life[i] = 1.6;
      this.floor[i] = y - 0.02;
    }
  }

  /** One slow drop that slides off and falls a short way (sweat). */
  bead(x: number, y: number, z: number, fall: number) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.n;
    this.p[i * 3] = x;
    this.p[i * 3 + 1] = y;
    this.p[i * 3 + 2] = z;
    this.v[i * 3] = 0;
    this.v[i * 3 + 1] = 0.6; // cancels most of gravity at first, so it lingers then drops
    this.v[i * 3 + 2] = 0;
    this.life[i] = 1.2;
    this.floor[i] = y - fall;
  }

  /** Water falling straight down, for the bucket. */
  pour(x: number, y: number, z: number, count: number, fall = 1.3) {
    for (let k = 0; k < count; k++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.n;
      this.p[i * 3] = x + (Math.random() - 0.5) * 0.3;
      this.p[i * 3 + 1] = y + Math.random() * 0.2;
      this.p[i * 3 + 2] = z + (Math.random() - 0.5) * 0.3;
      this.v[i * 3] = (Math.random() - 0.5) * 0.6;
      this.v[i * 3 + 1] = -Math.random();
      this.v[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
      this.life[i] = 1.4;
      this.floor[i] = y - fall;
    }
  }

  update(dt: number) {
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      this.v[i * 3 + 1] -= 6.5 * dt;
      this.p[i * 3] += this.v[i * 3] * dt;
      this.p[i * 3 + 1] += this.v[i * 3 + 1] * dt;
      this.p[i * 3 + 2] += this.v[i * 3 + 2] * dt;
      if (this.p[i * 3 + 1] < this.floor[i] && this.v[i * 3 + 1] < 0) this.life[i] = 0;
      if (this.life[i] <= 0) this.m.makeScale(0, 0, 0);
      else this.m.makeTranslation(this.p[i * 3], this.p[i * 3 + 1], this.p[i * 3 + 2]);
      this.mesh.setMatrixAt(i, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ---------------------------------------------------------------- wet footprints

/** Dark damp marks left on dry ground by someone fresh out of the water; they dry in a few seconds. */
export class Prints {
  readonly group = new THREE.Group();
  private marks: { m: THREE.Mesh; mat: THREE.MeshBasicMaterial; life: number }[] = [];
  private cursor = 0;
  constructor(n = 48) {
    const geo = new THREE.CircleGeometry(0.075, 12);
    geo.rotateX(-Math.PI / 2);
    for (let i = 0; i < n; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: "#2b2622", transparent: true, opacity: 0, depthWrite: false });
      const m = new THREE.Mesh(geo, mat);
      m.scale.set(0.75, 1, 1.35);
      m.visible = false;
      m.renderOrder = 1;
      this.group.add(m);
      this.marks.push({ m, mat, life: 0 });
    }
  }
  /** One foot: `side` is 1 or -1, `yaw` the walking direction. */
  step(x: number, z: number, yaw: number, side: number) {
    const k = this.marks[this.cursor];
    this.cursor = (this.cursor + 1) % this.marks.length;
    k.m.position.set(x + Math.cos(yaw) * 0.09 * side, 0.03, z - Math.sin(yaw) * 0.09 * side);
    k.m.rotation.y = yaw;
    k.m.visible = true;
    k.life = 9;
  }
  update(dt: number) {
    for (const k of this.marks) {
      if (k.life <= 0) continue;
      k.life -= dt;
      k.mat.opacity = Math.max(0, Math.min(0.32, k.life * 0.05));
      if (k.life <= 0) k.m.visible = false;
    }
  }
}

// ---------------------------------------------------------------- floating words

const wordCache = new Map<string, THREE.Texture>();
function wordTexture(text: string) {
  let t = wordCache.get(text);
  if (!t) {
    t = canvasTexture(
      256,
      96,
      (g) => {
        g.font = "600 52px 'Space Grotesk', system-ui, sans-serif";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.lineWidth = 8;
        g.strokeStyle = "rgba(40,28,36,0.55)";
        g.strokeText(text, 128, 50);
        g.fillStyle = "#fffaf2";
        g.fillText(text, 128, 50);
      },
      false,
    );
    wordCache.set(text, t);
  }
  return t;
}

/** Little words that rise off a person and fade. */
export class Words {
  readonly group = new THREE.Group();
  private live: { s: THREE.Sprite; t: number; span: number }[] = [];

  say(text: string, x: number, y: number, z: number, span = 1.8) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: wordTexture(text), transparent: true, depthWrite: false, fog: false }));
    s.scale.set(0.5, 0.19, 1);
    s.position.set(x + (Math.random() - 0.5) * 0.15, y, z);
    s.renderOrder = 8;
    this.group.add(s);
    this.live.push({ s, t: 0, span });
  }

  update(dt: number) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const w = this.live[i];
      w.t += dt;
      const k = w.t / w.span;
      w.s.position.y += dt * 0.22;
      w.s.material.opacity = Math.min(1, k * 8) * (1 - k);
      if (k >= 1) {
        this.group.remove(w.s);
        w.s.material.dispose();
        this.live.splice(i, 1);
      }
    }
  }
}

// ---------------------------------------------------------------- sky

export function makeSky() {
  const uniforms = {
    uTop: { value: new THREE.Color("#2b2a5c") },
    uHorizon: { value: new THREE.Color("#e79a7a") },
    uGlow: { value: new THREE.Color("#ffb070") },
    uSun: { value: new THREE.Vector3(-0.6, 0, 0.8).normalize() },
  };
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(420, 32, 20),
    new THREE.ShaderMaterial({
      uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uTop, uHorizon, uGlow, uSun;
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          float h = clamp(d.y, 0.0, 1.0);
          vec3 col = mix(uHorizon, uTop, pow(h, 0.5));
          vec2 flat2 = normalize(d.xz + vec2(1e-5));
          float toward = max(dot(flat2, normalize(uSun.xz)), 0.0);
          col += uGlow * pow(toward, 3.0) * exp(-h * 5.0) * 0.8;
          col = mix(col, uHorizon * 0.55, smoothstep(0.0, -0.25, d.y));
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }),
  );
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return { mesh, uniforms };
}

export function makeStars(count = 900) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // upper dome only, thinner near the horizon
    const y = 0.08 + Math.random() ** 0.8 * 0.92;
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(1 - y * y);
    pos[i * 3] = Math.cos(a) * r * 400;
    pos[i * 3 + 1] = y * 400;
    pos[i * 3 + 2] = Math.sin(a) * r * 400;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    map: softDot(), color: "#fff6e6", size: 2.4, sizeAttenuation: false, transparent: true, opacity: 0.8, depthWrite: false, fog: false,
  });
  const points = new THREE.Points(geo, mat);
  points.renderOrder = -9;
  points.frustumCulled = false;
  return points;
}

/** Slow drifting lights in the garden after dark. */
export class Fireflies {
  readonly points: THREE.Points;
  private base: Float32Array;
  private pos: Float32Array;
  private n: number;
  constructor(n: number, box: { x0: number; x1: number; z0: number; z1: number }) {
    this.n = n;
    this.base = new Float32Array(n * 4);
    this.pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      this.base[i * 4] = box.x0 + Math.random() * (box.x1 - box.x0);
      this.base[i * 4 + 1] = 0.4 + Math.random() * 1.6;
      this.base[i * 4 + 2] = box.z0 + Math.random() * (box.z1 - box.z0);
      this.base[i * 4 + 3] = Math.random() * 100;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    this.points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        map: softDot(), color: "#e9ff9a", size: 0.09, transparent: true, opacity: 0.9, depthWrite: false,
        blending: THREE.AdditiveBlending, fog: false,
      }),
    );
    this.points.frustumCulled = false;
  }
  /** `eye` is the viewer: a firefly right at your face would fill the screen, so those duck out of sight. */
  update(t: number, eye?: THREE.Vector3) {
    for (let i = 0; i < this.n; i++) {
      const ph = this.base[i * 4 + 3];
      const x = this.base[i * 4] + Math.sin(t * 0.31 + ph) * 0.9 + Math.sin(t * 0.83 + ph * 2) * 0.25;
      let y = this.base[i * 4 + 1] + Math.sin(t * 0.47 + ph * 3) * 0.35;
      const z = this.base[i * 4 + 2] + Math.cos(t * 0.27 + ph) * 0.9;
      if (eye && (x - eye.x) ** 2 + (y - eye.y) ** 2 + (z - eye.z) ** 2 < 1.7 * 1.7) y = -30;
      this.pos[i * 3] = x;
      this.pos[i * 3 + 1] = y;
      this.pos[i * 3 + 2] = z;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }
  setOpacity(o: number) {
    (this.points.material as THREE.PointsMaterial).opacity = o;
    this.points.visible = o > 0.02;
  }
}
