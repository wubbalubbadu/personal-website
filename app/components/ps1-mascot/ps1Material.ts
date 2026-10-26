// One shader for everything in the scene, recreating the PlayStation's
// look: per-vertex (Gouraud) lighting, vertices snapped to a coarse screen
// grid (the famous wobble), texture coordinates interpolated without
// perspective correction (affine warping), and 15-bit colour with an
// ordered 4x4 dither. The effect uniforms are shared objects, so flipping
// a toggle updates every material at once.
import * as THREE from "three";

export type PS1Globals = {
  uRes: { value: THREE.Vector2 };
  uSnap: { value: number };
  uAffine: { value: number };
  uDither: { value: number };
  uLevels: { value: number };
  uLightDir: { value: THREE.Vector3 };
  uAmbient: { value: number };
};

export function createGlobals(): PS1Globals {
  return {
    uRes: { value: new THREE.Vector2(240, 180) },
    uSnap: { value: 2 },
    uAffine: { value: 1 },
    uDither: { value: 1 },
    uLevels: { value: 31 },
    uLightDir: { value: new THREE.Vector3(-0.45, 0.65, 0.62).normalize() },
    uAmbient: { value: 0.58 },
  };
}

// Bayer 4x4 from two recursive 2x2 steps; returns 0..1.
export const BAYER_GLSL = /* glsl */ `
float bayer2(vec2 a){ a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float bayer4(vec2 a){ return bayer2(0.5 * a) * 0.25 + bayer2(a); }
`;

const vertex = /* glsl */ `
uniform vec2 uRes;
uniform float uSnap;
uniform vec3 uLightDir;
uniform float uAmbient;
uniform float uLit;
uniform vec2 uUvScale;
varying vec2 vUv;
varying vec3 vAff;
varying float vShade;
void main() {
  vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  if (uSnap > 0.0) {
    vec2 grid = uRes * 0.5 / uSnap;
    clip.xy = floor(clip.xy / clip.w * grid + 0.5) / grid * clip.w;
  }
  gl_Position = clip;
  vUv = uv * uUvScale;
  // Interpolating uv*w and w perspective-correctly, then dividing, gives a
  // plain screen-space (affine) interpolation: the PS1's warped textures.
  vAff = vec3(vUv * clip.w, clip.w);
  vec3 n = normalize(normalMatrix * normal);
  float d = max(dot(n, uLightDir), 0.0);
  vShade = mix(1.0, uAmbient + (1.0 - uAmbient) * d * 1.05, uLit);
}`;

const fragment = /* glsl */ `
uniform sampler2D map;
uniform vec3 uColor;
uniform float uAffine;
uniform float uDither;
uniform float uLevels;
uniform float uOpacity;
varying vec2 vUv;
varying vec3 vAff;
varying float vShade;
${BAYER_GLSL}
void main() {
  vec2 uv = mix(vUv, vAff.xy / vAff.z, uAffine);
  vec4 tex = texture2D(map, uv);
  if (tex.a < 0.5) discard;
  float b = bayer4(gl_FragCoord.xy);
  // Screen-door transparency, the way PS1 games faked fading sprites.
  if (uOpacity < 1.0 && uOpacity <= b) discard;
  vec3 c = tex.rgb * uColor * vShade;
  float t = mix(0.5, b, uDither);
  c = floor(c * uLevels + t) / uLevels;
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

const white = (() => {
  const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  t.needsUpdate = true;
  return t;
})();

export type PS1MaterialOptions = {
  map?: THREE.Texture;
  color?: string;
  lit?: boolean;
  side?: THREE.Side;
  repeat?: [number, number];
};

export function hexToVec3(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

export function ps1Material(globals: PS1Globals, opts: PS1MaterialOptions = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...globals,
      map: { value: opts.map ?? white },
      uColor: { value: hexToVec3(opts.color ?? "#ffffff") },
      uLit: { value: opts.lit === false ? 0 : 1 },
      uOpacity: { value: 1 },
      uUvScale: { value: new THREE.Vector2(...(opts.repeat ?? [1, 1])) },
    },
    vertexShader: vertex,
    fragmentShader: fragment,
    side: opts.side ?? THREE.FrontSide,
  });
}

/** Full-screen 1-bit dithered backdrop, the halftone look from old zines. */
export function ditherBackdropMaterial(globals: PS1Globals, dark: string, light: string) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uRes: globals.uRes,
      uTime: { value: 0 },
      uDark: { value: hexToVec3(dark) },
      uLight: { value: hexToVec3(light) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vP;
      void main(){ vP = position.xy; gl_Position = vec4(position.xy, 0.999, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec2 uRes; uniform float uTime; uniform vec3 uDark; uniform vec3 uLight;
      varying vec2 vP;
      ${BAYER_GLSL}
      void main(){
        vec2 p = vP * vec2(uRes.x / uRes.y, 1.0);
        float r = length(p - vec2(0.0, 0.05));
        float v = smoothstep(1.35, 0.15, r);
        v += 0.12 * sin(p.x * 3.0 + uTime * 0.6) * sin(p.y * 4.0 - uTime * 0.4);
        v += 0.1 * sin(r * 9.0 - uTime * 1.2);
        // Two pixels per dither cell, so the pattern reads at small sizes too.
        float b = bayer4(floor(gl_FragCoord.xy / 2.0));
        gl_FragColor = vec4(v > b ? uLight : uDark, 1.0);
      }`,
    depthWrite: false,
    depthTest: false,
  });
}
