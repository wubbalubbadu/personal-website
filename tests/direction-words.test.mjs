import test from 'node:test';
import assert from 'node:assert/strict';

import {tsModule} from './helpers/ts-module.mjs';
const {directionStyle,directionRuns}=await import(tsModule('app/flute-studio/components/scoreTheory.ts'));

test('"Piu vivo." is one bold tempo marking whether or not the score writes the accent',()=>{
  for(const text of ['Piu vivo.','Più vivo.']){
    assert.equal(directionStyle(text),'tempo');
    assert.equal(directionRuns(text),null,`${text} must not be split into two fonts`);
  }
});

test('other unaccented modifiers stay with their tempo word',()=>{
  assert.equal(directionRuns('Tres modere'),null);
  assert.equal(directionStyle('Allegro.'),'tempo');
  assert.equal(directionStyle('a tempo.'),'tempo');
});

test('a marking that really mixes kinds is still styled part by part',()=>{
  const runs=directionRuns('un poco rit. a tempo.');
  assert.ok(runs&&runs.some(run=>run.style==='tempo')&&runs.some(run=>run.style==='expression'));
});
