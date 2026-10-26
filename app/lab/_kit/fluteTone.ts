/** A soft, breathy flute-ish note: a sine with a little second and third
 * harmonic, delayed vibrato, and a puff of filtered noise at the start.
 * The AudioContext is made on first use, which must follow a user gesture. */
let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

export function playFlute(freq: number, seconds = 0.9) {
  if (typeof window === "undefined") return;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  const t = ctx.currentTime;

  const out = ctx.createGain();
  out.gain.setValueAtTime(0, t);
  out.gain.linearRampToValueAtTime(0.14, t + 0.07);
  out.gain.setTargetAtTime(0.1, t + 0.1, 0.2);
  out.gain.setTargetAtTime(0, t + seconds, 0.16);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = Math.min(freq * 5, 9000);
  out.connect(lp).connect(ctx.destination);

  const vib = ctx.createOscillator();
  const vibDepth = ctx.createGain();
  vib.frequency.value = 5.2;
  vibDepth.gain.setValueAtTime(0, t);
  vibDepth.gain.linearRampToValueAtTime(freq * 0.006, t + 0.35);
  vib.connect(vibDepth);

  const end = t + seconds + 0.8;
  for (const [mult, level] of [
    [1, 1],
    [2, 0.14],
    [3, 0.04],
  ] as const) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = freq * mult;
    vibDepth.connect(o.frequency);
    g.gain.value = level;
    o.connect(g).connect(out);
    o.start(t);
    o.stop(end);
  }
  vib.start(t);
  vib.stop(end);

  if (!noise) {
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const n = ctx.createBufferSource();
  n.buffer = noise;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = freq * 2;
  bp.Q.value = 1.2;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.05, t);
  ng.gain.exponentialRampToValueAtTime(0.004, t + 0.35);
  n.connect(bp).connect(ng).connect(out);
  n.start(t);
  n.stop(t + 0.4);
}
