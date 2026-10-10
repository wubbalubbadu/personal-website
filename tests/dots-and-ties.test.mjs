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
const {compileRhythm,DOTTED_EIGHTH,DRILLS,DOTTED_QUARTER,DOTTED_HALF,HALF_TIED,HALF_QUARTERS,TIED_QUARTER,QUARTER_EIGHTHS,ACROSS,ACROSS_APART,continuations,gradeTaps}=await import(url(compile(read('dots-and-ties/rhythmSequence.ts'))));
const rhythmURL=url(compile(read('rhythm/rhythmModel.ts')));
const {sustainedEvents}=await import(rhythmURL);
// Tuplet support stays in the shared compiler and engraver for a later lesson; build the patterns here.
const dividedBeat=count=>({id:`divide-${count}`,items:[...Array.from({length:count},()=>({written:count===5?.25:.5,ratio:count===3?[3,2]:[5,4]})),{written:1},{written:1},{written:1}],beams:[Array.from({length:count},(_,i)=>i)],tuplets:[{from:0,to:count-1,count}]});
const SYNCOPATED={id:'syncopated',items:[{written:.5},{written:.5,tieNext:true},{written:.5},{written:.5},{written:1},{written:1}],beams:[[0,1],[2,3]]};

test('three drills fill their meters, get harder, and tie continuations are not new onsets',()=>{
 assert.equal(DRILLS.length,3);
 assert.deepEqual(DRILLS.map(p=>compileRhythm(p).total),DRILLS.map(p=>p.top??4));
 assert.ok(DRILLS.some(p=>(p.top??4)!==4));
 assert.deepEqual(DRILLS.map(p=>compileRhythm(p).onsets),[[0,1.5,2],[0,.5,2],[0,.5,2,3.5]]);
 assert.deepEqual(DRILLS.map(continuations),[[],[],[3]]);
});
test('the dotted eighth and sixteenth fill one beat',()=>{
 const d=compileRhythm(DOTTED_EIGHTH);
 assert.equal(d.total,4);assert.deepEqual(d.onsets,[0,.75,1,2]);assert.equal(d.notes[0].written,.75);
});
test('a half tied to a quarter and a dotted half are the same sound',()=>{
 const sound=d=>sustainedEvents(d.timeline.map(e=>({start:e.at,duration:e.length,midi:e.midi})),d.ties);
 const tied=compileRhythm(HALF_TIED);
 assert.deepEqual(sound(tied).slice(0,1),sound(compileRhythm(DOTTED_HALF)).slice(0,1));
 assert.deepEqual(sound(tied)[0],{start:0,duration:3,midi:67});
 assert.deepEqual(compileRhythm(HALF_QUARTERS).onsets,[0,2,3]);
});
test('a dotted quarter and a quarter tied to an eighth are the same sound',()=>{
 const dot=compileRhythm(DOTTED_QUARTER),tie=compileRhythm(TIED_QUARTER);
 const sound=d=>sustainedEvents(d.timeline.map(e=>({start:e.at,duration:e.length,midi:e.midi})),d.ties);
 assert.deepEqual(sound(dot),sound(tie));
 assert.deepEqual(dot.onsets,tie.onsets);
 assert.equal(dot.notes[0].written,1.5);assert.deepEqual(tie.notes.slice(0,2).map(n=>n.written),[1,.5]);
});
test('the tie across the bar line joins beat 4 to the next beat 1 as one 2-beat sound',()=>{
 const d=compileRhythm(ACROSS),apart=compileRhythm(ACROSS_APART);
 assert.equal(d.total,8);assert.equal(d.timeline[ACROSS.bars[0]].at,4);
 const voices=sustainedEvents(d.timeline.map(e=>({start:e.at,duration:e.length,midi:e.midi})),d.ties);
 assert.deepEqual(voices[2],{start:3,duration:2,midi:67});
 assert.deepEqual(continuations(ACROSS),[4]);
 assert.deepEqual(apart.ties,[]);assert.ok(apart.onsets.includes(4));
 assert.deepEqual(compileRhythm(QUARTER_EIGHTHS).onsets,[0,1,1.5,2]);
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
test('tap grading never calls a wrong tap on time',()=>{
 const spq=.75,ms=x=>x/1000/spq; // seconds to quarter notes
 const onsets=[0,1.5,2];
 assert.equal(gradeTaps([ms(20),1.5-ms(40),2+ms(60)],onsets,spq).perfect,true);
 const late=gradeTaps([0,1.5+ms(150),2],onsets,spq);
 assert.deepEqual(late.marks.map(m=>m.timing),['on','late','on']);assert.equal(late.perfect,false);
 const early=gradeTaps([0,1.5-ms(130),2],onsets,spq);
 assert.equal(early.marks[1].timing,'early');
 // A tap on beat 2 (the dotted quarter is still sounding) is not the eighth note.
 const onBeat=gradeTaps([0,1,2],onsets,spq);
 assert.equal(onBeat.marks[1].timing,'extra');assert.deepEqual(onBeat.missing,[1]);
 const missing=gradeTaps([0,2],onsets,spq);
 assert.deepEqual(missing.missing,[1]);assert.equal(missing.perfect,false);
 const doubled=gradeTaps([0,.02,1.5,2],onsets,spq);
 assert.equal(doubled.marks.filter(m=>m.timing==='extra').length,1);assert.equal(doubled.perfect,false);
 // Closest pairs win, whatever order the taps came in.
 const order=gradeTaps([1.62,1.5],onsets,spq);
 assert.equal(order.marks[1].timing,'on');
 // The on-time window is 0.1 s either side of 25 ms early, where people naturally tap.
 for(const err of [-200,-130,76,101,150,250])assert.notEqual(gradeTaps([ms(err)],[0,1],spq).marks[0].timing,'on');
 for(const err of [-120,-60,-25,0,70])assert.equal(gradeTaps([ms(err)],[0,1],spq).marks[0].timing,'on');
});
const bundle=buildSync({entryPoints:['app/flute-studio/theory/EngravedRow.tsx'],bundle:true,platform:'node',format:'cjs',jsx:'automatic',loader:{'.css':'empty'},external:['react','react/jsx-runtime'],write:false}).outputFiles[0].text;
const mod={exports:{}};new Function('require','module','exports',bundle)(require,mod,mod.exports);
const {layoutRow,RowGraphics}=mod.exports;
const render=(notes,props={})=>renderToStaticMarkup(React.createElement('svg',null,React.createElement(RowGraphics,{notes,layout:layoutRow(notes,{clef:false,right:820}),clef:false,...props})));
test('proportional rows put every note on its beat; ordinary rows are unchanged',()=>{
 const notes=[{v:3},{v:1}];
 const p=layoutRow(notes,{clef:false,right:820,meter:{top:4,bottom:4},proportional:true});
 const unit=(p.beatX(4)-p.beatX(0))/4;
 assert.ok(Math.abs(p.xs[1]-p.xs[0]-3*unit)<1e-6);
 for(const b of [1,2,3])assert.ok(Math.abs(p.beatX(b)-(p.xs[0]+b*unit))<1e-6);
 const two=layoutRow([{v:2},{v:1},{v:1},{v:1},{v:1},{v:2}],{clef:false,right:820,bars:[3],proportional:true});
 const u=(two.xs[2]-two.xs[1]);assert.ok(Math.abs(two.xs[1]-two.xs[0]-2*u)<1e-6);assert.ok(Math.abs(two.xs[5]-two.xs[4]-u)<1e-6);
 // Without the flag, the layout is exactly what it was (engraver spacing, not proportional).
 const plain=layoutRow(notes,{clef:false,right:820,meter:{top:4,bottom:4}});
 assert.ok(Math.abs((plain.xs[1]-plain.xs[0])-3*unit)>10);
 const json=o=>JSON.parse(JSON.stringify(o));
 assert.deepEqual(json(layoutRow(notes,{clef:false,right:820,proportional:false})),json(layoutRow(notes,{clef:false,right:820})));
});
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

test('targets have no hover box, practice has one Cookie, and copy has no dashes',()=>{
 const css=read('dots-and-ties/dots-and-ties.css');
 assert.doesNotMatch(css,/(dt-hit|dt-tap-spot):hover/);
 assert.doesNotMatch(read('dots-and-ties/RhythmPractice.tsx'),/CookieButton/);
 for(const f of ['dots-and-ties/DotsTiesLesson.tsx','dots-and-ties/RhythmPractice.tsx'])assert.doesNotMatch(read(f),/[–—]/);
});
