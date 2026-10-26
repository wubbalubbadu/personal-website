import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {hzFromMidi} from '../app/flute-studio/lib/pitch.ts';

// Resolve the production module's extensionless import without changing browser imports.
const source = fs.readFileSync(new URL('../app/flute-studio/lib/noteSegmenter.ts', import.meta.url), 'utf8')
  .replace('"./pitch"', JSON.stringify(new URL('../app/flute-studio/lib/pitch.ts', import.meta.url).href));
const compiled = ts.transpile(source, {module:ts.ModuleKind.ESNext, target:ts.ScriptTarget.ES2022});
const {NoteSegmenter, summarise, LOST_TONE_MS} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const frame = (at, midi = 72, cents = 0) => ({at, hz:hzFromMidi(midi) * 2 ** (cents / 1200), rms:.05, clarity:.99});
const push = (segmenter, at, midi = 72, cents = 0) => segmenter.push(frame(at, midi, cents), at);
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} vs ${expected}`);

test('silence before a note does not invent a note', () => {
  const segmenter = new NoteSegmenter();
  segmenter.push(null, 5000);
  assert.deepEqual(segmenter.result(), []);
});

test('a brief gap and centered vibrato preserve one open note', () => {
  const segmenter = new NoteSegmenter();
  push(segmenter, 0, 72, -3);
  push(segmenter, 42, 72, 3);
  segmenter.push(null, 500);
  push(segmenter, 700, 72, -2);
  const notes = segmenter.result();
  assert.equal(notes.length, 1);
  assert.equal(notes[0].endedAt, null);
  assert.deepEqual(notes[0].frames.map(f => f.at), [0, 42, 700]);
});

test('silence closes only after the grace period and ends at the last heard frame', () => {
  const segmenter = new NoteSegmenter();
  push(segmenter, 100); push(segmenter, 142);
  segmenter.push(null, 142 + LOST_TONE_MS);
  assert.equal(segmenter.result()[0].endedAt, null);
  segmenter.push(null, 143 + LOST_TONE_MS);
  assert.equal(segmenter.result()[0].endedAt, 142);
  push(segmenter, 2000);
  assert.deepEqual(segmenter.result().map(n => [n.startedAt,n.endedAt]), [[100,142],[2000,null]]);
});

test('a pitch change closes the old note at the new attack and assigns frames once', () => {
  const segmenter = new NoteSegmenter();
  push(segmenter, 0); push(segmenter, 100); push(segmenter, 200, 73); push(segmenter, 300, 73);
  const notes = segmenter.result();
  assert.deepEqual(notes.map(n => [n.midi,n.startedAt,n.endedAt]), [[72,0,200],[73,200,null]]);
  assert.deepEqual(notes.map(n => n.frames.map(f => f.at)), [[0,100],[200,300]]);
});

test('reset discards closed and open notes and allows a fresh take', () => {
  const segmenter = new NoteSegmenter();
  push(segmenter, 0); push(segmenter, 100, 73);
  segmenter.result().pop();
  assert.equal(segmenter.result().length, 2, 'the returned array cannot remove internal notes');
  segmenter.reset();
  assert.deepEqual(segmenter.result(), []);
  push(segmenter, 0, 69);
  assert.equal(segmenter.result()[0].midi, 69);
  assert.equal(segmenter.result()[0].frames.length, 1);
});

test('summary uses closed duration and reports pitch drift after the attack settles', () => {
  const cents = [30, 20, 10, 5, -5, -15];
  const note = {midi:72, startedAt:100, endedAt:500, frames:cents.map((c, i) => frame(100 + i * 40, 72, c))};
  const before = structuredClone(note);
  const summary = summarise(note);
  assert.equal(summary.durationMs, 400);
  near(summary.meanCents, 7.5); near(summary.minCents, -15); near(summary.maxCents, 30);
  near(summary.driftCents, -20);
  assert.deepEqual(note, before);
});

test('open, single-frame and empty summaries remain finite without inventing held time', () => {
  const base = {midi:69, startedAt:100, endedAt:null};
  const open = summarise({...base, frames:[frame(100,69),frame(180,69)]});
  assert.equal(open.durationMs, 80); near(open.driftCents, 0);
  const single = summarise({...base, frames:[frame(100,69,12)]});
  assert.equal(single.durationMs, 0); near(single.meanCents, 12); assert.equal(single.driftCents, 0);
  assert.deepEqual(summarise({...base, frames:[]}), {midi:69, startedAt:100, durationMs:0, meanCents:0, driftCents:0, minCents:0, maxCents:0});
});

// Repeated-note onset detection is explicitly reserved as the user's exercise in startsNewNote.
// These tests do not endorse its pitch-change-only placeholder as the intended final behavior.
