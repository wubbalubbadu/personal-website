import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {buildSync} from 'esbuild';
import {createRequire} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url);
const read=p=>fs.readFileSync(new URL(`../app/flute-studio/theory/${p}`,import.meta.url),'utf8');
const compile=s=>ts.transpile(s,{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022});
const url=s=>`data:text/javascript;base64,${Buffer.from(s).toString('base64')}`;
const {compileRhythm,dividedBeat,DRILLS,SYNCOPATED,matchTapPositions}=await import(url(compile(read('dots-and-ties/rhythmSequence.ts'))));
const rhythmURL=url(compile(read('rhythm/rhythmModel.ts')));
const {sustainedEvents}=await import(rhythmURL);

test('all four drills fit 4/4 and tie continuations are not new onsets',()=>{
 assert.deepEqual(DRILLS.map(p=>compileRhythm(p).total),[4,4,4,4]);
 assert.deepEqual(DRILLS.map(p=>compileRhythm(p).onsets),[[0,3],[0,1.5,2],[0,.5,1.5,2,3],[0,1/3,2/3,1,2,3]]);
});
test('triplet and quintuplet written values stay separate from exact performed ratios',()=>{
 for(const count of [3,5]){
  const p=dividedBeat(count),d=compileRhythm(p);
  assert.equal(d.timeline[count].at,1);
  assert.equal(d.notes[0].written,count===3?.5:.25);
  assert.equal(d.notes[0].v,1/count);
  const many={id:'long',items:Array.from({length:120},()=>p.items.slice(0,count)).flat()};
  const result=compileRhythm(many);
  assert.equal(result.total,120);
  for(let beat=0;beat<120;beat++)assert.equal(result.timeline[beat*count].at,beat);
 }
});
test('invalid ratios and ties cannot silently create wrong sound',()=>{
 for(const ratio of [[0,2],[3,0],[1.5,2]])assert.throws(()=>compileRhythm({id:'bad',items:[{written:.5,ratio}]}));
 for(const items of [[{written:1,tieNext:true}],[{written:1,tieNext:true},{written:1,rest:true}],[{written:1,pitch:60,tieNext:true},{written:1,pitch:62}]])assert.throws(()=>compileRhythm({id:'bad',items}));
});
test('ties merge only sound, preserving segments for highlighting',()=>{
 const d=compileRhythm(SYNCOPATED),events=d.timeline.map(e=>({start:e.at,duration:e.length,midi:e.midi}));
 const voices=sustainedEvents(events,d.ties);
 assert.equal(voices.length,5);assert.equal(events.length,6);
 assert.deepEqual(voices[1],{start:.5,duration:1,midi:67});
 assert.equal(events[2].start,1);
 const chain=compileRhythm({id:'chain',items:[{written:1,tieNext:true},{written:2,tieNext:true},{written:1}]});
 assert.deepEqual(sustainedEvents(chain.timeline.map(e=>({start:e.at,duration:e.length,midi:e.midi})),chain.ties),[{start:0,duration:4,midi:67}]);
});
test('timing feedback matches one tap per onset and gives gradual errors, not false perfect results',()=>{
 const good=matchTapPositions([.05,1.48,2.03],[0,1.5,2],.8);
 assert.deepEqual(good.matched,[0,1,2]);assert.deepEqual(good.missing,[]);
 const duplicate=matchTapPositions([0,.01,1.5,2],[0,1.5,2],.8);
 assert.equal(duplicate.matched.filter(i=>i===0).length,1);assert.ok(duplicate.matched.includes(-1));
});
const bundle=buildSync({entryPoints:['app/flute-studio/theory/EngravedRow.tsx'],bundle:true,platform:'node',format:'cjs',jsx:'automatic',loader:{'.css':'empty'},external:['react','react/jsx-runtime'],write:false}).outputFiles[0].text;
const mod={exports:{}};new Function('require','module','exports',bundle)(require,mod,mod.exports);
const {layoutRow,RowGraphics}=mod.exports;
const render=(notes,props={})=>renderToStaticMarkup(React.createElement('svg',null,React.createElement(RowGraphics,{notes,layout:layoutRow(notes,{clef:false,right:820}),clef:false,...props})));
test('real note shapes, dots, ties and tuplet beam levels are engraved independently of duration',()=>{
 const trip=compileRhythm(dividedBeat(3)),five=compileRhythm(dividedBeat(5));
 const threeSVG=render(trip.notes,{beams:[[0,1,2]],tuplets:[{from:0,to:2,count:3}]});
 const fiveSVG=render(five.notes,{beams:[[0,1,2,3,4]],tuplets:[{from:0,to:4,count:5}]});
 assert.equal((threeSVG.match(/<polygon/g)||[]).length,1);
 assert.equal((fiveSVG.match(/<polygon/g)||[]).length,5); // primary plus four connected second beams
 assert.match(threeSVG,/engraved-row__tuplet/);assert.match(fiveSVG,/>5<\/text>/);
 assert.match(render([{v:3},{v:1}]),/<circle cx="24"/);
 assert.match(render([{v:1},{v:1}],{ties:[0]}),/engraved-row__tie/);
 assert.doesNotMatch(render([{v:1},{v:1,rest:true}],{ties:[0]}),/engraved-row__tie/);
});

const reactStub=url(`export const useRef=x=>({current:x});export const useState=x=>[x,()=>{}];export const useCallback=x=>x;export const useEffect=()=>{};`);
const toneStub=url(`export function toneSamples(f,d){globalThis.__dotTones.push({f,d});return new Float32Array(4)}`);
const sampleStub=url(`export const metronomeSamples=()=>new Float32Array(2);export const clapSamples=()=>new Float32Array(3);`);
const source=compile(read('rhythm/useRhythmAudio.ts')).replace("'react'",`'${reactStub}'`).replace("'../toneSamples'",`'${toneStub}'`).replace("'./rhythmModel'",`'${rhythmURL}'`).replace("'./metronomeSamples'",`'${sampleStub}'`);
const {useRhythmAudio}=await import(url(source));
test('actual audio scheduler makes one tied voice, keeps fractional excerpts alive and cancels stale completion',async()=>{
 const previous=Object.fromEntries(['AudioContext','AudioBuffer','requestAnimationFrame','cancelAnimationFrame'].map(k=>[k,globalThis[k]]));
 const starts=[],stops=[],tones=[];let frame,context;
 class Buffer{copyToChannel(){}}
 class Context{
  constructor(){context=this}currentTime=0;sampleRate=44100;state='running';destination={};resume(){return Promise.resolve()}
  createBuffer(){return new Buffer()}
  createBufferSource(){return {connect(){return this},disconnect(){},start(at){starts.push(at)},stop(at){stops.push(at)}}}
  createGain(){return {gain:{value:1,cancelScheduledValues(){},setValueAtTime(){},linearRampToValueAtTime(){}},connect(){return this},disconnect(){}}}
 }
 Object.assign(globalThis,{AudioContext:Context,AudioBuffer:Buffer,requestAnimationFrame:fn=>{frame=fn;return 1},cancelAnimationFrame:()=>{},__dotTones:tones});
 try{
  const audio=useRhythmAudio(),data=compileRhythm(SYNCOPATED);let ended=false;
  await audio.counted({values:data.notes.map(n=>n.v),timeline:data.timeline,ties:data.ties,speak:false,click:false,secondsPerQuarter:1,onEnd:()=>ended=true});
  assert.equal(tones.length,5);assert.equal(tones[1].d,1);assert.deepEqual(starts,[.06,.56,1.56,2.06,3.06]);
  audio.stop();context.currentTime=5;frame();assert.equal(ended,false);assert.ok(stops.length>0);
  await audio.counted({values:[1/3],timeline:[{at:0,length:1/3,midi:67}],speak:false,click:false,secondsPerQuarter:1,onEnd:()=>ended=true});
  context.currentTime=5.2;frame();assert.equal(ended,false);
  context.currentTime=5.5;frame();assert.equal(ended,true);
 }finally{Object.assign(globalThis,previous);delete globalThis.__dotTones}
});
