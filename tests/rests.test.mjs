import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {buildSync} from 'esbuild';
import {createRequire} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url);
const compile=source=>ts.transpile(source,{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022});
const url=code=>`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
const read=p=>fs.readFileSync(new URL(`../app/flute-studio/theory/${p}`,import.meta.url),'utf8');
const rhythmURL=url(compile(read('rhythm/rhythmModel.ts')));
const {playbackEvents}=await import(rhythmURL);
const {assessRestTaps,GAPS,restPitches}=await import(url(compile(read('rests/restsModel.ts'))));
const bundled=buildSync({entryPoints:['app/flute-studio/theory/EngravedRow.tsx'],bundle:true,platform:'node',format:'cjs',jsx:'automatic',loader:{'.css':'empty'},external:['react','react/jsx-runtime'],write:false}).outputFiles[0].text;
const mod={exports:{}};new Function('require','module','exports',bundled)(require,mod,mod.exports);
const {layoutRow,RowGraphics}=mod.exports;
const render=(notes,props={})=>renderToStaticMarkup(React.createElement('svg',null,React.createElement(RowGraphics,{notes,layout:layoutRow(notes,{clef:false,right:660,...props}),clef:false,...props})));

test('rest advances time without a pitch; existing omitted pitches still default to G4',()=>{
 const events=playbackEvents([1,1,2],[67,null,69]);
 assert.deepEqual(events.map(e=>e.start),[0,.65,1.3]);
 assert.equal(events[1].midi,null);assert.equal(events[1].duration,.65);
 assert.equal(events[2].start+events[2].duration,2.6);
 assert.deepEqual(playbackEvents([1,2]).map(e=>e.midi),[67,67]);
});
test('the authored gaps retain four beats and a silent event',()=>{
 for(const r of GAPS){assert.equal(r.notes.reduce((a,n)=>a+n.v,0),4);assert.equal(r.notes[r.gap].v,r.answer);assert.equal(restPitches(r.notes)[r.gap],null)}
});
test('tap check accepts small timing variation but rejects silence taps, missing and extra taps',()=>{
 assert.equal(assessRestTaps([.1,1.9,3.1]),'correct');
 assert.equal(assessRestTaps([0,1,2,3]),'rest');
 assert.equal(assessRestTaps([0,2]),'missing');
 assert.equal(assessRestTaps([0,2,3,3.8]),'timing');
 assert.equal(assessRestTaps([.4,2.4,3.4]),'timing');
});
test('whole-measure rest is centered while its timeline retains the measure start',()=>{
 const notes=[{v:3,rest:true,measureRest:true},{v:1},{v:2}];
 const l=layoutRow(notes,{bars:[1],clef:false,meter:{top:3,bottom:4},right:660});
 assert.equal(l.xs[0],(l.startX+l.barXs[0])/2);assert.deepEqual(l.starts,[0,3,4]);
 assert.ok(l.beatX(0)<l.xs[0]);
 const second=layoutRow([{v:3},{v:3,rest:true,measureRest:true}],{bars:[1],clef:false,right:660});
 assert.equal(second.xs[1],(second.barXs[0]+second.endX)/2);
});
test('whole-measure rest in 3/4 is not rendered as a dotted half note',()=>{
 const s=render([{v:3,rest:true,measureRest:true}]);
 assert.match(s,/engraved-row__rest/);assert.doesNotMatch(s,/<circle|engraved-row__note/);
 assert.match(s,/128px/); // line 4: 200 - 6*12
});
test('rest cannot acquire ledger lines, accidentals, red sounding state or a stem',()=>{
 const s=render([{v:2,rest:true,p:12,acc:'sharp'}],{active:0});
 assert.doesNotMatch(s,/is-active|engraved-row__ledger|engraved-row__acc|engraved-row__stem/);
 assert.match(s,/152px/); // half rest sits on middle line
});
test('a supplied beam group is split at a rest',()=>{
 const notes=[{v:.5},{v:.5,rest:true},{v:.5},{v:.5}];
 const s=render(notes,{beams:[[0,1,2,3]]});
 assert.equal((s.match(/class="engraved-row__stem"/g)||[]).length,2);
 assert.equal((s.match(/class="engraved-row__rest/g)||[]).length,1);
});

// Exercise the actual scheduler with a Web Audio double, not only the timing helper.
const tones=[],starts=[];
const reactStub=url(`export const useRef=x=>({current:x});export const useState=x=>[x,()=>{}];export const useCallback=x=>x;export const useEffect=()=>{};`);
const toneStub=url(`export function toneSamples(f,d,s){globalThis.__restTestTones.push({f,d});return new Float32Array(4)}`);
const sampleStub=url(`export const metronomeSamples=()=>new Float32Array(2);export const clapSamples=()=>new Float32Array(3);`);
const audioSource=compile(read('rhythm/useRhythmAudio.ts')).replace("'react'",`'${reactStub}'`).replace("'../toneSamples'",`'${toneStub}'`).replace("'./rhythmModel'",`'${rhythmURL}'`).replace("'./metronomeSamples'",`'${sampleStub}'`);
const {useRhythmAudio}=await import(url(audioSource));
test('play and counted schedule silence without voices, while preserving later note times',async()=>{
 const previous={AudioContext:globalThis.AudioContext,AudioBuffer:globalThis.AudioBuffer,requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame};
 class Buffer{copyToChannel(){}}
 class Context{
  currentTime=0;sampleRate=44100;state='running';destination={};resume(){return Promise.resolve()}
  createBuffer(){return new Buffer()}
  createBufferSource(){return {connect(){return this},disconnect(){},start(at){starts.push(at)},stop(){}}}
  createGain(){return {gain:{value:1,cancelScheduledValues(){},setValueAtTime(){},linearRampToValueAtTime(){}},connect(){return this},disconnect(){}}}
 }
 Object.assign(globalThis,{AudioContext:Context,AudioBuffer:Buffer,requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{},__restTestTones:tones});
 try{
  const audio=useRhythmAudio();await audio.play([1,1,2],[67,null,69],0,false);
  assert.equal(tones.length,2);assert.deepEqual(starts,[.025,1.325]);
  tones.length=0;starts.length=0;
  await audio.counted({values:[1,1,2],pitches:[67,null,69],speak:false,click:false});
  assert.equal(tones.length,2);assert.deepEqual(starts,[.06,1.36]);
  tones.length=0;starts.length=0;
  await audio.play([3],[null],0,false);assert.equal(tones.length,0);assert.equal(starts.length,0);
 }finally{Object.assign(globalThis,previous);delete globalThis.__restTestTones}
});
