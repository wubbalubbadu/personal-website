import test from 'node:test';import assert from 'node:assert/strict';
import {cursorAt} from '../app/flute-studio/components/playbackCursor.ts';
test('cursor approaches the current barline without entering the next measure early',()=>{
 const first={},second={},stops=[{x:10,top:0,bottom:40,lineEnd:200,measureEnd:100,measure:first},{x:120,top:0,bottom:40,lineEnd:200,measureEnd:200,measure:second}],beats=[{index:0,at:0,end:1},{index:1,at:1,end:2}];
 assert.ok(cursorAt(.99,beats,stops,{k:0}).x<100);assert.equal(cursorAt(1,beats,stops,{k:0}).x,120);
});
test('cursor glides between notes within the same measure and holds at the starting note during count-in',()=>{
 const measure={},stops=[{x:10,top:0,bottom:40,lineEnd:100,measureEnd:100,measure},{x:50,top:0,bottom:40,lineEnd:100,measureEnd:100,measure}],beats=[{index:0,at:2,end:3},{index:1,at:3,end:4}];
 assert.equal(cursorAt(1,beats,stops,{k:0}).x,10);assert.equal(cursorAt(2.5,beats,stops,{k:0}).x,30);
});
