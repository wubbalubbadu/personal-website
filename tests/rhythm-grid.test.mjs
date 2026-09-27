import test from 'node:test';
import assert from 'node:assert/strict';
import {durationUnits,exactUnitsPerWhole,measureBeatOffsets,meterGrid} from '../app/flute-studio/components/rhythmGrid.ts';

test('duration grid represents binary notes and tuplets exactly',()=>{
  const grid=exactUnitsPerWhole([{Numerator:1,Denominator:16},{Numerator:1,Denominator:12},{Numerator:3,Denominator:32}]);
  assert.equal(grid,96);
  assert.deepEqual([[1,16],[1,12],[3,32]].map(([Numerator,Denominator])=>durationUnits({Numerator,Denominator},grid)),[6,8,9]);
});

test('OSMD mixed fractions retain their whole-note value',()=>{
  const whole={WholeValue:1,Numerator:0,Denominator:1};
  const dottedWhole={WholeValue:1,Numerator:1,Denominator:2};
  assert.equal(durationUnits(whole,48),48);
  assert.equal(durationUnits(dottedWhole,48),72);
});

test('simple, compound, cut and irregular meters use their own pulse',()=>{
  assert.deepEqual(meterGrid({beats:4,beatType:4},24),{beatLength:24,barLength:96});
  assert.deepEqual(meterGrid({beats:6,beatType:8},24),{beatLength:36,barLength:72});
  assert.deepEqual(meterGrid({beats:2,beatType:2},24),{beatLength:48,barLength:96});
  assert.deepEqual(meterGrid({beats:7,beatType:8},24),{beatLength:12,barLength:84});
});

test('each measure resets its grid, including a mixed-meter change',()=>{
  const four=measureBeatOffsets([24,24,24,24],{beats:4,beatType:4},24);
  const seven=measureBeatOffsets(Array(7).fill(12),{beats:7,beatType:8},24);
  assert.deepEqual(four.offsets,[0,24,48,72]);
  assert.deepEqual(seven.offsets,[0,12,24,36,48,60,72]);
});

test('an opening pickup is counted at the end of its implied bar',()=>{
  const pickup=measureBeatOffsets([24],{beats:4,beatType:4},24,true);
  assert.equal(pickup.pickup,72);
  assert.deepEqual(pickup.offsets,[0]);
});
