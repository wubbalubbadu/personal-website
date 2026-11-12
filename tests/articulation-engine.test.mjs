import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeTake, noteName} from '../app/lab/articulation/engine.ts';

// Synthetic flute-ish tones: a few harmonics, a little breath noise, and an amplitude shape per note.
const SR = 44100;
const hz = midi => 440 * 2 ** ((midi - 69) / 12);
let seed = 7;
const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;

/** notes: [{midi, ms, gain?, attackMs?, releaseMs?, gapMs?, endGain?}] played one after another. */
function take(notes, {tailMs = 300} = {}) {
  const total = notes.reduce((t, n) => t + n.ms + (n.gapMs ?? 0), 0) + tailMs + 200;
  const out = new Float32Array(Math.ceil((total / 1000) * SR));
  let at = Math.round(0.2 * SR), phase = 0;
  for (const n of notes) {
    const length = Math.round((n.ms / 1000) * SR);
    const attack = Math.max(1, Math.round(((n.attackMs ?? 8) / 1000) * SR));
    const release = Math.max(1, Math.round(((n.releaseMs ?? 6) / 1000) * SR));
    const f = hz(n.midi), gain = n.gain ?? 0.3, endGain = n.endGain ?? gain;
    for (let i = 0; i < length; i++) {
      const level = gain + (endGain - gain) * (i / length);
      const shape = Math.min(1, i / attack, (length - i) / release);
      phase += (2 * Math.PI * f) / SR;
      const tone = Math.sin(phase) + 0.45 * Math.sin(2 * phase) + 0.2 * Math.sin(3 * phase) + 0.08 * Math.sin(4 * phase);
      out[at + i] = (tone / 1.7) * level * shape + 0.01 * noise() * shape;
    }
    at += length + Math.round(((n.gapMs ?? 0) / 1000) * SR);
  }
  // Room noise everywhere, well below the tone.
  for (let i = 0; i < out.length; i++) out[i] += 0.0006 * noise();
  return out;
}

test('a held A4 is one note at A4 and in tune', () => {
  const result = analyzeTake(take([{midi: 69, ms: 800}]), SR);
  assert.equal(result.notes.length, 1);
  const [note] = result.notes;
  assert.equal(note.midi, 69);
  assert.equal(noteName(note.midi), 'A4');
  assert.ok(Math.abs(note.cents) <= 3, `cents ${note.cents}`);
  assert.equal(note.startKind, 'afterSilence');
  assert.equal(note.endKind, 'intoSilence');
});

test('staccato and staccatissimo are told apart by how much of the beat they fill', () => {
  const beat = 400;
  const staccato = take(Array.from({length: 4}, () => ({midi: 72, ms: 180, gapMs: beat - 180})));
  const staccatissimo = take(Array.from({length: 4}, () => ({midi: 72, ms: 70, gapMs: beat - 70})));
  const a = analyzeTake(staccato, SR), b = analyzeTake(staccatissimo, SR);
  assert.equal(a.notes.length, 4);
  assert.equal(b.notes.length, 4);
  assert.equal(a.phrases.length, 1, 'short gaps between staccato notes are not breaths');
  for (const note of a.notes.slice(0, 3)) {
    assert.ok(Math.abs(note.gapToNextMs - beat) <= 6, `gap ${note.gapToNextMs}`);
    assert.ok(note.fill > 0.38 && note.fill < 0.62, `staccato fill ${note.fill}`);
    assert.equal(note.length, 'staccato');
  }
  for (const note of b.notes.slice(0, 3)) {
    assert.ok(note.fill < 0.38, `staccatissimo fill ${note.fill}`);
    assert.equal(note.length, 'staccatissimo');
  }
});

test('a slurred line is split at each pitch change and marked joined', () => {
  const result = analyzeTake(take([{midi: 72, ms: 300, releaseMs: 300}, {midi: 74, ms: 300, attackMs: 1, releaseMs: 1}, {midi: 76, ms: 300, attackMs: 1}].map((n, i, all) => ({...n, attackMs: i ? 0.01 : 8, releaseMs: i < all.length - 1 ? 0.01 : 6}))), SR);
  assert.deepEqual(result.notes.map(n => n.midi), [72, 74, 76]);
  assert.deepEqual(result.notes.map(n => n.startKind), ['afterSilence', 'slurred', 'slurred']);
  assert.equal(result.notes[0].length, 'slurred');
  assert.equal(result.notes[0].release, 'joined');
  assert.equal(result.notes[2].endKind, 'intoSilence');
});

test('tongued legato on one pitch is found from the dips', () => {
  // Three notes on one pitch, each tapering into a short dip and re-attacked: no silence, no pitch change.
  const notes = Array.from({length: 3}, () => ({midi: 74, ms: 300, attackMs: 10, releaseMs: 25, gapMs: 0}));
  const result = analyzeTake(take(notes), SR);
  assert.equal(result.notes.length, 3, JSON.stringify(result.notes.map(n => [n.startMs, n.startKind])));
  assert.deepEqual(result.notes.map(n => n.startKind), ['afterSilence', 'tongued', 'tongued']);
  assert.equal(result.notes[0].length, 'full');
});

test('attack time separates a crisp start from a swelled one', () => {
  const crisp = analyzeTake(take([{midi: 69, ms: 600, attackMs: 6}]), SR).notes[0];
  const swelled = analyzeTake(take([{midi: 69, ms: 600, attackMs: 200}]), SR).notes[0];
  assert.ok(crisp.attackMs < 18, `crisp ${crisp.attackMs}`);
  assert.equal(crisp.attack, 'crisp');
  assert.ok(swelled.attackMs > 110, `swelled ${swelled.attackMs}`);
  assert.equal(swelled.attack, 'swelled');
});

test('release time separates a stopped note from a tapered one', () => {
  const stopped = analyzeTake(take([{midi: 69, ms: 600, releaseMs: 5}]), SR).notes[0];
  const tapered = analyzeTake(take([{midi: 69, ms: 600, releaseMs: 250}]), SR).notes[0];
  assert.equal(stopped.release, 'stopped', `stopped ${stopped.releaseMs}`);
  assert.equal(tapered.release, 'tapered', `tapered ${tapered.releaseMs}`);
});

test('a breath splits phrases, and a crescendo phrase reads as growing', () => {
  const grow = Array.from({length: 6}, (_, i) => ({midi: 72 + i, ms: 220, gain: 0.04 + i * 0.06, gapMs: 30}));
  const fade = Array.from({length: 6}, (_, i) => ({midi: 77 - i, ms: 220, gain: 0.34 - i * 0.06, gapMs: 30}));
  fade[0].gapMs = 30;
  grow[grow.length - 1].gapMs = 700;
  const result = analyzeTake(take([...grow, ...fade]), SR);
  assert.equal(result.phrases.length, 2);
  assert.equal(result.phrases[0].shape, 'grows');
  assert.equal(result.phrases[1].shape, 'fades');
  assert.equal(result.phrases[0].highMidi, 77);
  assert.ok(result.phrases[0].peakAt > 0.7);
});

test('breathiness rises when breath noise is mixed in', () => {
  const clean = take([{midi: 72, ms: 600}]);
  const airy = take([{midi: 72, ms: 600}]);
  // Breath noise sits mostly low (under a few kHz), so low-pass it like real breath.
  let breath = 0;
  for (let i = 0; i < airy.length; i++) { breath += 0.15 * (noise() - breath); if (Math.abs(clean[i]) > 0.002) airy[i] += 0.25 * breath; }
  const a = analyzeTake(clean, SR).notes[0], b = analyzeTake(airy, SR).notes[0];
  assert.ok(b.breathiness >= a.breathiness + 0.03, `${a.breathiness} vs ${b.breathiness}`);
});

test('short notes at an even loudness make a level phrase, not a fading one', () => {
  const notes = [
    ...Array.from({length: 4}, () => ({midi: 74, ms: 170, gapMs: 230})),
    ...Array.from({length: 4}, () => ({midi: 74, ms: 70, gapMs: 330})),
  ];
  const result = analyzeTake(take(notes), SR);
  assert.equal(result.phrases.length, 1);
  assert.equal(result.phrases[0].shape, 'level');
  assert.ok(result.phrases[0].rangeDb < 3, `range ${result.phrases[0].rangeDb}`);
});

for (const [rate, depth] of [[5.5, 0.35], [7, 0.6]]) test(`vibrato at ${rate} Hz that swells the loudness ${depth < 0.5 ? 'gently' : 'deeply'} is not mistaken for tonguing`, () => {
  // A held note with vibrato in both pitch (±15 cents) and loudness, the way a flute's does. The deep case swings
  // about 12 dB, more than most players, to check the tongue test needs more than a loudness dip.
  const seconds = 2.5, out = new Float32Array(Math.ceil((seconds + 0.6) * SR));
  let phase = 0;
  const start = Math.round(0.3 * SR), length = Math.round(seconds * SR);
  for (let i = 0; i < length; i++) {
    const t = i / SR, wobble = Math.sin(2 * Math.PI * rate * t);
    phase += (2 * Math.PI * hz(74) * 2 ** ((15 * wobble) / 1200)) / SR;
    const level = 0.25 * (1 + depth * wobble) * Math.min(1, i / 400, (length - i) / 400);
    out[start + i] = level * (Math.sin(phase) + 0.45 * Math.sin(2 * phase)) / 1.45 + 0.0006 * noise();
  }
  const result = analyzeTake(out, SR);
  assert.equal(result.notes.length, 1, JSON.stringify(result.notes.map(n => [n.startMs, n.startKind])));
  assert.ok(result.notes[0].wobbleCents >= 6, `wobble ${result.notes[0].wobbleCents}`);
});

test('a note played far out of tune with vibrato stays one note', () => {
  // 45 cents sharp with ±15 cents of vibrato keeps crossing the line to the next semitone; that is not a slur.
  const out = new Float32Array(Math.ceil(2.6 * SR));
  let phase = 0;
  const start = Math.round(0.3 * SR), length = Math.round(2 * SR);
  for (let i = 0; i < length; i++) {
    const wobble = Math.sin((2 * Math.PI * 5.5 * i) / SR);
    phase += (2 * Math.PI * hz(74) * 2 ** ((45 + 15 * wobble) / 1200)) / SR;
    out[start + i] = 0.25 * Math.min(1, i / 400, (length - i) / 400) * (Math.sin(phase) + 0.45 * Math.sin(2 * phase)) / 1.45;
  }
  const result = analyzeTake(out, SR);
  assert.equal(result.notes.length, 1, JSON.stringify(result.notes.map(n => [n.startMs, n.startKind, n.midi])));
});

test('the spectrogram puts the overtones of a tone in the right rows', async () => {
  const {spectrogram} = await import('../app/lab/articulation/engine.ts');
  const samples = take([{midi: 69, ms: 600}]);
  const view = spectrogram(samples, SR, 300, 600, 3000);
  const column = Math.floor(view.columns / 2);
  const level = row => view.data[column * view.rows + row];
  const row440 = Math.round(440 / view.binHz), row880 = Math.round(880 / view.binHz), between = Math.round(660 / view.binHz);
  assert.ok(level(row440) > -3, `fundamental ${level(row440)}`);
  assert.ok(level(row880) > level(between) + 20, 'second harmonic stands above the gap');
});

test('a quiet note slurred into a louder one keeps its own attack and peak', () => {
  const notes = [{midi: 82, ms: 500, gain: 0.12, attackMs: 60, releaseMs: 0.01}, {midi: 81, ms: 400, gain: 0.3, attackMs: 0.01}];
  const [first] = analyzeTake(take(notes), SR).notes;
  assert.ok(first.attackMs < 80, `attack ${first.attackMs}`);
  assert.ok(first.peakAfterMs < 400, `peak at ${first.peakAfterMs}`);
});

test('slurring down into a softer note reports no new attack', () => {
  const notes = [{midi: 76, ms: 400, gain: 0.3, releaseMs: 0.01}, {midi: 73, ms: 700, gain: 0.14, attackMs: 0.01, releaseMs: 200}];
  const [, second] = analyzeTake(take(notes), SR).notes;
  assert.equal(second.startKind, 'slurred');
  assert.equal(second.attack, 'none');
  assert.equal(second.attackMs, 0);
});

test('comparing two takes: shorter staccato shows as a smaller fill and the same attack', async () => {
  const {summarize} = await import('../app/lab/articulation/compare.ts');
  const before = analyzeTake(take(Array.from({length: 5}, () => ({midi: 72, ms: 200, gapMs: 200, attackMs: 8}))), SR);
  const after = analyzeTake(take(Array.from({length: 5}, () => ({midi: 72, ms: 90, gapMs: 310, attackMs: 8}))), SR);
  const a = summarize(before.notes), b = summarize(after.notes);
  assert.equal(a.notes, 5);
  assert.ok(a.fill > 0.4 && b.fill < 0.3, `${a.fill} then ${b.fill}`);
  assert.ok(Math.abs(a.attackMs - b.attackMs) <= 3, `${a.attackMs} vs ${b.attackMs}`);
});
