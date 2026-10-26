import test from 'node:test';
import assert from 'node:assert/strict';
import {detectPitch, hzFromMidi, midiFromHz, centsFromMidi, median} from '../app/flute-studio/lib/pitch.ts';
import {traceDuration, traceY} from '../app/flute-studio/lib/toneTrace.ts';

const near = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} vs ${expected}`);

test('A440 and octave relationships round-trip across the flute range', () => {
  assert.equal(hzFromMidi(69), 440);
  assert.equal(hzFromMidi(81), 880);
  for (let midi = 59; midi <= 98; midi++) {
    assert.equal(midiFromHz(hzFromMidi(midi)), midi);
    near(centsFromMidi(hzFromMidi(midi), midi), 0);
  }
});

test('cent offsets retain their sign and reference the written pitch', () => {
  for (const cents of [-100, -49, -12, 12, 49, 100]) {
    near(centsFromMidi(440 * 2 ** (cents / 1200), 69), cents);
  }
  assert.equal(midiFromHz(440 * 2 ** (-49 / 1200)), 69);
  assert.equal(midiFromHz(440 * 2 ** (49 / 1200)), 69);
});

test('median rejects an octave outlier without sorting the caller array', () => {
  const values = [441, 880, 439, 440, 440];
  const original = [...values];
  assert.equal(median(values), 440);
  assert.deepEqual(values, original);
  assert.equal(median([7, 1, 5, 3]), 4);
  assert.equal(median([23]), 23);
  assert.equal(median([]), 0);
});

test('the detector rejects silence, DC, short buffers and sub-gate tones', () => {
  assert.equal(detectPitch(new Float32Array(4096), 48000), null);
  assert.equal(detectPitch(new Float32Array(4096).fill(.1), 48000), null);
  assert.equal(detectPitch(new Float32Array(8).fill(.1), 48000), null);
  assert.equal(detectPitch(new Float32Array(), 48000), null);
  const quiet = Float32Array.from({length:4096}, (_, i) => .005 * Math.sin(2 * Math.PI * 440 * i / 48000));
  assert.equal(detectPitch(quiet, 48000), null);
});

test('the sustain threshold can retain a quiet periodic tone', () => {
  const quiet = Float32Array.from({length:4096}, (_, i) => .005 * Math.sin(2 * Math.PI * 440 * i / 48000));
  const frame = detectPitch(quiet, 48000, .002);
  assert.ok(frame);
  near(frame.hz, 440, 1);
  assert.ok(frame.clarity > .95);
});

test('trace duration grows in four-second steps and never shrinks below eight seconds', () => {
  for (const [elapsed, expected] of [[0,8000],[7999,8000],[8000,8000],[8001,12000],[12000,12000],[12001,16000]]) {
    assert.equal(traceDuration(elapsed), expected);
  }
});

test('trace height keeps in-tune centered and clips outliers without changing scale', () => {
  for (const [cents, expected] of [[0,100],[17.5,50],[-17.5,150],[35,0],[-35,200],[1200,0],[-1200,200]]) {
    assert.equal(traceY(cents), expected);
  }
});
