import test from 'node:test';
import assert from 'node:assert/strict';
import {voiceEnvelope} from '../app/flute-studio/components/voiceEnvelope.ts';
const amplitude=(points,time)=>{let a=points[0];for(const b of points.slice(1)){if(time<=b.at)return b.ramp==='set'?a.level:a.level+(b.level-a.level)*(time-a.at)/(b.at-a.at);a=b}return a.level};
test('connected pitches have no level dip or unintended 40 percent gain reduction',()=>{
 const outgoing=voiceEnvelope(.1,.3,true,true),incoming=voiceEnvelope(.1,.3,true,false);
 for(let ms=0;ms<=12;ms++){
  const sum=amplitude(outgoing.points,.1+ms/1000)+amplitude(incoming.points,ms/1000);
  assert.ok(Math.abs(sum-.2551)<1e-6);
 }
 assert.equal(outgoing.points[1].level,incoming.points[1].level);
});
test('slur endings and tongued notes keep releases while connected notes hold to next onset',()=>{
 const connected=voiceEnvelope(.5,.3,false,true),end=voiceEnvelope(.5,.3,true,false);
 assert.equal(connected.points.at(-2).at,.5);
 assert.ok(end.points.at(-2).at<.5);
 assert.equal(connected.points[1].ramp,'exponential');
 assert.equal(end.points[1].ramp,'linear');
});
