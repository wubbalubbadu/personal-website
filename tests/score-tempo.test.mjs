import test from 'node:test';
import assert from 'node:assert/strict';
import {readTempoRatios,clampTempo,scheduledTempoAt} from '../app/flute-studio/lib/scoreTempo.ts';
test('saved speed preserves proportion through opening and dotted-quarter section',()=>{
 const saved=readTempoRatios(JSON.stringify({arnold:46/69}));
 assert.equal(clampTempo(69*saved.arnold),46);
 assert.equal(clampTempo(120*saved.arnold),80);
 // A user slows section B to 60: reopening the piece starts at half its opening mark.
 const adjusted=readTempoRatios(JSON.stringify({arnold:60/120}));
 assert.equal(clampTempo(69*adjusted.arnold),35);
});
test('unavailable or malformed preference data does not break playback',()=>{
 for(const raw of [null,'{','null','[]','4'])assert.deepEqual(readTempoRatios(raw),{});
 assert.deepEqual(readTempoRatios('{"a":0,"b":-1,"c":"2","d":0.5}'),{d:.5});
 assert.equal(clampTempo(10),30);assert.equal(clampTempo(300),220);
});
test('live tempo follows audio time, includes silence, and survives a replacement schedule',()=>{
 const points=[{at:10,bpm:69},{at:11,bpm:75.4},{at:12,bpm:81.6}];
 assert.equal(scheduledTempoAt(points,9),null);
 assert.equal(scheduledTempoAt(points,10.9),69);
 assert.equal(scheduledTempoAt(points,11),75);
 assert.equal(scheduledTempoAt(points,12.5),82);
 assert.equal(scheduledTempoAt([{at:12.5,bpm:60}],12.5),60);
 assert.equal(scheduledTempoAt([],13),null);
});
