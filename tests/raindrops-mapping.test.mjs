import test from 'node:test';
import assert from 'node:assert/strict';
import {place, dropFor, presence, lastsUntil} from '../app/lab/raindrops/rain.ts';

// A note as the articulation engine returns it, with sensible defaults to override.
const note = (over = {}) => ({
  index: 0, phrase: 0, startMs: 1000, endMs: 1400, startKind: 'afterSilence', endKind: 'intoSilence', midi: 74, cents: 0,
  peakDb: -6, peakAfterMs: 20, attackMs: 12, marks: {attackFrom: 1000, attackTo: 1012, releaseFrom: 1150, releaseTo: 1170, soundedTo: 1170},
  sustainLevel: 0.95, soundedMs: 170, gapToNextMs: 400, fill: 0.42, releaseMs: 14, sustainSlopeDbPerS: 0, settleMs: 5,
  wobbleCents: 3, brightness: 1.3, breathiness: 0.02, attackNoise: 0.03, length: 'staccato', attack: 'crisp', release: 'stopped',
  ...over,
});

test('a whole-tone scale lands on a hexagon', () => {
  // C D E F♯ G♯ A♯ in one octave: the angles step by 60 degrees.
  const angles = [72, 74, 76, 78, 80, 82].map(m => { const {x, y} = place(m); return Math.atan2(y, x); });
  for (let k = 1; k < angles.length; k++) {
    let step = (angles[k] - angles[k - 1]) * 180 / Math.PI;
    if (step < 0) step += 360;
    assert.ok(Math.abs(step - 60) < 1e-6, `step ${step}`);
  }
});

test('the same pitch class an octave up lands further out on the same line', () => {
  const low = place(62), high = place(74);
  assert.ok(Math.hypot(high.x, high.y) > Math.hypot(low.x, low.y));
  assert.ok(Math.abs(Math.atan2(low.y, low.x) - Math.atan2(high.y, high.x)) < 1e-9);
});

test('a crisp staccato note is a sharp drop that is cut off; a tapered one dissolves slowly', () => {
  const crisp = dropFor(note(), 'level', 'D5');
  const tapered = dropFor(note({attackMs: 120, attack: 'swelled', release: 'tapered', releaseMs: 300, soundedMs: 900}), 'level', 'D5');
  assert.ok(crisp.sharpness > 0.9);
  assert.ok(tapered.sharpness < 0.4);
  assert.equal(crisp.end, 'cut');
  assert.equal(tapered.end, 'dissolve');
  assert.ok(tapered.fadeMs > crisp.fadeMs * 5);
  assert.ok(lastsUntil(tapered) > lastsUntil(crisp));
});

test('a slurred note threads to the next one and has no splash', () => {
  const drop = dropFor(note({index: 3, attack: 'none', attackMs: 0, release: 'joined', length: 'slurred'}), 'arch', 'D5');
  assert.equal(drop.sharpness, 0);
  assert.equal(drop.end, 'thread');
  assert.equal(drop.threadTo, 4);
});

test('a drop is present while sounding and fades to nothing after', () => {
  const drop = dropFor(note(), 'level', 'D5');
  assert.equal(presence(drop, drop.at - 1), 0);
  assert.equal(presence(drop, drop.at + 50), 1);
  const mid = presence(drop, drop.at + drop.soundMs + drop.fadeMs / 2);
  assert.ok(mid > 0 && mid < 1);
  assert.equal(presence(drop, lastsUntil(drop) + 1), 0);
});

test('louder notes make bigger drops', () => {
  assert.ok(dropFor(note({peakDb: 0}), 'level', null).size > dropFor(note({peakDb: -20}), 'level', null).size);
});

test('the blind-test shuffle keeps every drop on time and only moves the looks between notes', async () => {
  const {shuffleLooks} = await import('../app/lab/raindrops/rain.ts');
  const drops = [70, 72, 74, 76, 78, 80, 82, 84].map((midi, i) => dropFor(note({index: i, startMs: i * 300, midi, peakDb: -i * 3}), 'level', String(midi)));
  const shuffled = shuffleLooks(drops, 7);
  assert.deepEqual(shuffled.map(d => d.at), drops.map(d => d.at));
  assert.deepEqual(shuffled.map(d => d.size).sort(), drops.map(d => d.size).sort());
  assert.ok(shuffled.some((d, i) => d.label !== drops[i].label), 'something moved');
  assert.deepEqual(shuffleLooks(drops, 7).map(d => d.label), shuffled.map(d => d.label), 'same seed, same shuffle');
  assert.ok(shuffled.every(d => d.threadTo === null));
});
