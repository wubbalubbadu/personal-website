/**
 * A synthetic flute take, so the pond can be seen before you record anything. Not a real flute: a few harmonics,
 * a little breath, vibrato on longer notes. Three phrases that show the mapping:
 * 1. a slurred whole-tone descent (watch it draw part of a hexagon, threaded),
 * 2. four staccato then four staccatissimo notes on one pitch (sharp crowns, rings cut short),
 * 3. a chromatic turn tongued legato, ending on a long tone that tapers away (it dissolves).
 */
export const DEMO_RATE = 44100;

type DemoNote = {midi: number; ms: number; gain: number; attack: number; release: number; gap: number; endGain?: number};

function phrases(): DemoNote[] {
  const notes: DemoNote[] = [];
  // 1. Whole-tone descent, slurred, swelling then fading: B♭5 A♭5 G♭5 E5 D5 C5.
  const line = [82, 80, 78, 76, 74, 72], gains = [0.14, 0.2, 0.27, 0.3, 0.24, 0.16];
  line.forEach((midi, i) => notes.push({midi, ms: i === line.length - 1 ? 900 : 330, gain: gains[i], attack: i ? 0.5 : 70, release: i < line.length - 1 ? 0.5 : 260, gap: 0}));
  notes[notes.length - 1].gap = 800;
  // 2. Staccato then staccatissimo on A5.
  for (let i = 0; i < 4; i++) notes.push({midi: 81, ms: 170, gain: 0.26, attack: 7, release: 10, gap: 230});
  for (let i = 0; i < 4; i++) notes.push({midi: 81, ms: 65, gain: 0.26, attack: 5, release: 6, gap: 335});
  notes[notes.length - 1].gap = 800;
  // 3. A chromatic turn, tongued legato, then a long tapering tone.
  for (const midi of [77, 78, 79, 78]) notes.push({midi, ms: 260, gain: 0.22, attack: 14, release: 22, gap: 0});
  notes.push({midi: 77, ms: 1800, gain: 0.25, endGain: 0.05, attack: 25, release: 600, gap: 0});
  return notes;
}

export function demoTake(): Float32Array {
  const notes = phrases();
  const totalMs = notes.reduce((t, n) => t + n.ms + n.gap, 0) + 1200;
  const out = new Float32Array(Math.ceil((totalMs / 1000) * DEMO_RATE));
  let seed = 11;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  let at = Math.round(0.4 * DEMO_RATE), phase = 0, breath = 0;
  for (const n of notes) {
    const length = Math.round((n.ms / 1000) * DEMO_RATE);
    const attack = Math.max(1, Math.round((n.attack / 1000) * DEMO_RATE)), release = Math.max(1, Math.round((n.release / 1000) * DEMO_RATE));
    const hz = 440 * 2 ** ((n.midi - 69) / 12), endGain = n.endGain ?? n.gain;
    for (let i = 0; i < length; i++) {
      const t = i / DEMO_RATE;
      const vibrato = n.ms > 300 ? Math.sin(2 * Math.PI * 5.3 * t) * Math.min(1, t / 0.35) : 0;
      phase += (2 * Math.PI * hz * 2 ** ((12 * vibrato) / 1200)) / DEMO_RATE;
      const shape = Math.min(1, i / attack, (length - i) / release);
      const level = (n.gain + ((endGain - n.gain) * i) / length) * (1 + 0.05 * vibrato);
      breath += 0.2 * (random() - breath);
      const tone = (Math.sin(phase) + 0.5 * Math.sin(2 * phase) + 0.2 * Math.sin(3 * phase) + 0.07 * Math.sin(4 * phase)) / 1.77;
      const chiff = i < attack * 2 ? 0.05 * Math.exp(-i / (attack + 1)) * random() : 0;
      out[at + i] += (tone * level + 0.1 * breath * level + chiff) * shape;
    }
    at += length + Math.round((n.gap / 1000) * DEMO_RATE);
  }
  for (let i = 0; i < out.length; i++) out[i] += 0.0007 * random();
  return out;
}
