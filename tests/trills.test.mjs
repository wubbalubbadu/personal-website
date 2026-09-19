import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
async function source(path) {
  const text = fs.readFileSync(new URL(path, import.meta.url), 'utf8');
  return import('data:text/javascript;base64,' + Buffer.from(ts.transpile(text, {module:ts.ModuleKind.ESNext, target:ts.ScriptTarget.ES2022})).toString('base64'));
}
const {trills, trillPitches, movingKeys} = await source('../content/fingerings/trills.ts');
const {fluteKeys} = await source('../content/fingerings/keys.ts');
const midi = pitch => {
  const [,letter,acc,octave] = pitch.match(/^([A-G])([♯♭]?)(\d)$/);
  return (Number(octave)+1)*12 + {C:0,D:2,E:4,F:5,G:7,A:9,B:11}[letter] + (acc === '♯' ? 1 : acc === '♭' ? -1 : 0);
};
const pair = (base, interval) => trills.find(t => t.base === base && t.interval === interval);
test('each base has exactly a half-step and whole-step with correctly spelled pitches', () => {
  for (const base of trillPitches) {
    assert.deepEqual(trills.filter(t => t.base === base).map(t => t.interval), [1,2]);
    for (const t of trills.filter(t => t.base === base)) assert.equal(midi(t.upper)-midi(t.base), t.interval, `${base}-${t.upper}`);
  }
});
test('all animated states have valid keys, no duplicates, and a real change', () => {
  const valid = new Set(fluteKeys.map(k => k.id));
  for (const t of trills.filter(t => !t.unavailable)) {
    assert.ok(movingKeys(t).length);
    for (const state of [t.lowerKeys,t.upperKeys]) {
      assert.equal(new Set(state).size,state.length);
      assert.ok(state.every(k => valid.has(k)));
      if (state.includes('RC')) assert.ok(state.includes('RCs'));
    }
  }
});
test('pressing and releasing upper-note gestures are not inverted', () => {
  const up = pair('D4',1), lift = pair('G4',2);
  assert.deepEqual(movingKeys(up), ['REb']);
  assert.ok(!up.lowerKeys.includes('REb') && up.upperKeys.includes('REb'));
  assert.deepEqual(movingKeys(lift), ['L3']);
  assert.ok(lift.lowerKeys.includes('L3') && !lift.upperKeys.includes('L3'));
});
test('trill-specific held keys and simultaneous changes are retained', () => {
  const f = pair('F4',1);
  assert.ok(f.lowerKeys.includes('R3') && f.upperKeys.includes('R3'));
  assert.deepEqual(movingKeys(pair('E♭4',2)), ['R2','R3']);
  assert.deepEqual(movingKeys(pair('B4',2)), ['T','L1']);
  assert.deepEqual(movingKeys(pair('C5',2)), ['Tr1']);
  assert.deepEqual(movingKeys(pair('C♯5',2)), ['Tr2']);
});
test('unsupported low-note techniques cannot accidentally animate invented states', () => {
  assert.ok(trills.filter(t => t.unavailable).length >= 4);
  for (const t of trills.filter(t => t.unavailable)) {
    assert.deepEqual(t.lowerKeys,[]); assert.deepEqual(t.upperKeys,[]); assert.ok(t.zhUnavailable);
  }
});

test('upper registers retain their distinct vents and equipment variants', () => {
  assert.deepEqual(movingKeys(pair('C6',2)), ['Tr2']);
  assert.deepEqual(movingKeys(pair('C♯6',2)), ['Tr1','Tr2']);
  assert.ok(!pair('D5',1).lowerKeys.includes('L1'));
  assert.ok(pair('D6',2).alternatives[0].harmonic);
  assert.equal(pair('C7',1).requires,'b-foot');
  assert.equal(pair('C7',1).alternatives[0].requires,'c-foot');
  assert.ok(pair('C♯7',1).unavailable);
  assert.ok(pair('F7',2).unavailable);
});
test('alternative states are valid and actually move keys', () => {
  const valid = new Set(fluteKeys.map(k => k.id));
  for (const t of trills) for (const v of t.alternatives ?? []) {
    assert.ok(movingKeys(v).length);
    for (const state of [v.lowerKeys,v.upperKeys]) {
      assert.ok(state.every(k => valid.has(k)));
      assert.equal(new Set(state).size,state.length);
      if (state.includes('Gizmo')) assert.equal(v.requires,'b-foot');
    }
  }
});
