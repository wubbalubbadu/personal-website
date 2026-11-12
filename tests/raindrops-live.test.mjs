import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {analyzeTake} from '../app/lab/articulation/engine.ts';
import {demoTake, DEMO_RATE} from '../app/lab/raindrops/demo.ts';

// live.ts imports the engine without a file extension (as the browser build expects); point it at the file here.
const engineUrl = new URL('../app/lab/articulation/engine.ts', import.meta.url).href;
const source = fs.readFileSync(new URL('../app/lab/raindrops/live.ts', import.meta.url), 'utf8')
  .replace('"../articulation/engine"', JSON.stringify(engineUrl));
const compiled = ts.transpile(source, {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022});
const {LiveListener} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

/** Feeds samples in uneven chunks, the way a microphone delivers them, then finishes. */
function listen(samples, rate, seed = 5) {
  const live = new LiveListener(rate);
  let at = 0;
  while (at < samples.length) {
    seed = (seed * 16807) % 2147483647;
    const size = 128 + (seed % 2000);
    live.push(samples.subarray(at, Math.min(samples.length, at + size)));
    at += size;
  }
  live.finish();
  return live;
}

test('listening live finds the same notes as analysing the recording', () => {
  const samples = demoTake();
  const recorded = analyzeTake(samples, DEMO_RATE);
  const live = listen(samples, DEMO_RATE);
  assert.equal(live.openIndex, null);
  assert.equal(live.notes.length, recorded.notes.length, JSON.stringify(live.notes.map(n => [Math.round(n.startMs), n.startKind, n.midi])));
  live.notes.forEach((note, i) => {
    const other = recorded.notes[i];
    assert.ok(Math.abs(note.startMs - other.startMs) <= 15, `note ${i} starts at ${note.startMs} live, ${other.startMs} recorded`);
    assert.equal(note.startKind, other.startKind, `note ${i} start kind`);
    assert.equal(note.midi, other.midi, `note ${i} pitch`);
    assert.equal(note.release, other.release, `note ${i} release`);
  });
  assert.equal(live.phrases.length, recorded.phrases.length);
  assert.deepEqual(live.phrases.map(p => p.shape), recorded.phrases.map(p => p.shape));
});

test('a note is open while it sounds and final once it ends', () => {
  const samples = demoTake();
  const live = new LiveListener(DEMO_RATE);
  // Feed the first 1.2 s: the slurred descent has started and is still sounding.
  live.push(samples.subarray(0, Math.round(1.2 * DEMO_RATE)));
  assert.notEqual(live.openIndex, null);
  const open = live.notes[live.openIndex];
  assert.ok(open.startMs < 1200);
  live.push(samples.subarray(Math.round(1.2 * DEMO_RATE)));
  live.finish();
  assert.equal(live.openIndex, null);
});

test('it keeps the whole take for replay afterwards', () => {
  const samples = demoTake();
  const live = listen(samples, DEMO_RATE);
  assert.equal(live.samples.length, samples.length);
  assert.ok(Math.abs(live.heardMs - samples.length / DEMO_RATE * 1000) < 1);
});
