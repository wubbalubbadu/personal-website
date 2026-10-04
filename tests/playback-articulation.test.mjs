import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreArticulation,connectsSlur} from '../app/flute-studio/components/playbackArticulation.ts';

test('printed staccato stays short inside a slur, including its final note',()=>{
  assert.equal(scoreArticulation(true,true,false),'staccato');
  assert.equal(scoreArticulation(true,true,true),'staccato');
  assert.equal(scoreArticulation(true,false,false),'slur');
});
test('a staccato inside a phrase breaks the legato connection on both sides',()=>{
  assert.equal(connectsSlur('slur','staccato',true),false);
  assert.equal(connectsSlur('staccato','slur',true),false);
  assert.equal(connectsSlur('slur','slur',true),true);
  assert.equal(connectsSlur('slur','slur',false),false);
});
test('existing tenuto and continuing staccato rules are preserved',()=>{
  assert.equal(scoreArticulation(false,false,true),'tenuto');
  assert.equal(scoreArticulation(false,false,false,true),'staccato');
  assert.equal(scoreArticulation(false,false,false),'tongue');
});
