import test from 'node:test';
import assert from 'node:assert/strict';
import {dynamicTimeline,dynamicLevel,noteEnvelope} from '../app/flute-studio/components/dynamicEnvelope.ts';
test('a held note swells then holds its closing dynamic',()=>{
 const points=dynamicTimeline([{at:0,level:.5},{at:.25,wedge:{until:.75,rising:true,to:2}},{at:.75,level:2}],.1,4);
 assert.equal(dynamicLevel(points,.1),.5);assert.equal(dynamicLevel(points,.5),1.25);assert.equal(dynamicLevel(points,1),2);
 assert.deepEqual(noteEnvelope(points,0,1,16).map(p=>p.at),[0,4,12,12,12,16]);
});
test('a hairpin across ties has matching levels at the written boundary',()=>{
 const points=dynamicTimeline([{at:0,wedge:{until:2,rising:false,to:.25}}],.1,4);
 const first=noteEnvelope(points,0,1,16),second=noteEnvelope(points,1,2,16);
 assert.equal(first.at(-1).level,second[0].level);assert.equal(second.at(-1).level,.25);
});
test('a plain dynamic change does not become an unprinted crescendo',()=>{
 const points=dynamicTimeline([{at:0,level:.5},{at:2,level:2}],.1,4);
 assert.equal(dynamicLevel(points,1.99),.5);assert.equal(dynamicLevel(points,2),2);
});
test('a crescendo progresses inside each of several different pitches',()=>{
 const points=dynamicTimeline([{at:0,level:.25},{at:0,wedge:{until:1,rising:true,to:2}}],.1,4);
 const notes=Array.from({length:4},(_,i)=>noteEnvelope(points,i/4,(i+1)/4,16));
 for(let i=0;i<4;i++){
  assert.ok(notes[i].at(-1).level>notes[i][0].level);
  if(i<3)assert.equal(notes[i].at(-1).level,notes[i+1][0].level);
 }
});
