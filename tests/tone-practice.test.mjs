import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function moduleUrl(file, replacements={}) {
  let source=fs.readFileSync(new URL(file,import.meta.url),'utf8');
  for(const [from,to] of Object.entries(replacements)) source=source.replace(from,to);
  return `data:text/javascript;base64,${Buffer.from(ts.transpile(source,{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022})).toString('base64')}`;
}
const pitchUrl=moduleUrl('../app/flute-studio/lib/pitch.ts');
const {detectPitch,hzFromMidi}=await import(pitchUrl);
const {ToneSession,toneSummary,tonePitchLabel}=await import(moduleUrl('../app/flute-studio/lib/toneSession.ts',{"'./pitch'":JSON.stringify(pitchUrl)}));
const targets=[60,61,62].map((midi,id)=>({id,midi,group:id,pitch:['C4','C♯4','D4'][id]}));
function play(session,midi,from,to,cents=0){for(let at=from;at<=to;at+=40)session.push({at,hz:hzFromMidi(midi)*2**(cents/1200),clarity:.99,rms:.05},at)}

test('a take retains all curves through note changes, pause, selection and resume',()=>{
  const session=new ToneSession(targets);
  play(session,60,0,2000);play(session,61,2040,4000);play(session,62,4040,6000);
  session.pause();
  let snap=session.snapshot();assert.equal(snap.attempts.length,3);assert.equal(snap.live,null);
  assert.deepEqual(snap.attempts.map(a=>a.target.id),[0,1,2]);
  const firstFrames=snap.attempts[0].frames.length;
  session.select(0);play(session,60,7000,9000);session.pause();snap=session.snapshot();
  assert.equal(snap.attempts.length,4);assert.equal(snap.attempts[0].frames.length,firstFrames);
  session.clear();assert.equal(session.snapshot().attempts.length,0);
});
test('one outlier does not advance the playhead; a stable expected transition does',()=>{
  const session=new ToneSession(targets);play(session,60,0,1000);
  play(session,61,1040,1040);play(session,60,1080,1600);
  assert.equal(session.snapshot().cursor,0);assert.equal(session.snapshot().attempts.length,0);
  play(session,61,1640,2000);assert.equal(session.snapshot().cursor,1);
});
test('breathing closes a hold without inventing extra duration or losing its trace',()=>{
  const session=new ToneSession(targets);play(session,60,0,2000);session.push(null,2600);
  assert.equal(session.snapshot().live,null);assert.equal(toneSummary(session.snapshot().attempts[0]).duration,2000);
  play(session,60,3000,4400);session.pause();assert.equal(session.snapshot().attempts.length,2);
  assert.equal(session.snapshot().cursor,0);
});
test('repeat group allows within-group transitions and returns after a breath',()=>{
  const sequence=[60,62,64].map((midi,id)=>({id,midi,group:id<2?0:1,pitch:String(midi)}));
  const session=new ToneSession(sequence);session.repeat=true;
  play(session,60,0,1000);play(session,62,1040,2000);assert.equal(session.snapshot().cursor,1);
  session.push(null,2600);play(session,60,2800,3800);assert.equal(session.snapshot().cursor,0);
});
test('pitch feedback stays relative to the written note and does not punish centered vibrato as spread',()=>{
  const frames=Array.from({length:101},(_,i)=>({at:i*40,hz:hzFromMidi(60)*2**((20*Math.sin(2*Math.PI*5*i*.04))/1200),rms:.05,clarity:.99}));
  const a={id:1,target:targets[0],startedAt:0,endedAt:4000,frames};
  assert.equal(toneSummary(a).grade,'green');
  const wrong={...a,frames:frames.map(f=>({...f,hz:f.hz*2**(-100/1200)}))};
  assert.ok(toneSummary(wrong).center < -90);assert.equal(toneSummary(wrong).grade,'red');
});
test('short notes are retained but marked uncertain; brief detection gaps remain timestamped',()=>{
  const session=new ToneSession(targets);play(session,60,0,240);session.pause();
  assert.equal(session.snapshot().attempts.length,1);assert.equal(toneSummary(session.snapshot().attempts[0]).grade,'uncertain');
});
test('detector covers low B through high D at common sample rates',()=>{
  for(const sr of [44100,48000])for(const midi of [59,60,72,83,95,96,98]){
    const hz=hzFromMidi(midi),buffer=Float32Array.from({length:4096},(_,i)=>.2*Math.sin(2*Math.PI*hz*i/sr)+.04*Math.sin(4*Math.PI*hz*i/sr));
    const result=detectPitch(buffer,sr);assert.ok(result,`${midi} at ${sr}`);
    assert.ok(Math.abs(1200*Math.log2(result.hz/hz))<7,`${midi}: ${result.hz} vs ${hz}`);
  }
});
test('quiet periodic endings use the sustain gate; silence and noise are rejected',()=>{
  const buffer=Float32Array.from({length:4096},(_,i)=>.008*Math.sin(2*Math.PI*440*i/48000));
  assert.equal(detectPitch(buffer,48000),null);assert.ok(detectPitch(buffer,48000,.004));
  assert.equal(detectPitch(new Float32Array(4096),48000,.004),null);
  let seed=1;const noise=Float32Array.from({length:4096},()=>{seed=(seed*1664525+1013904223)>>>0;return (seed/2**32-.5)*.15});
  assert.equal(detectPitch(noise,48000,.004),null);
});

test('a shared pitch at a group boundary waits for a breath before advancing',()=>{
  const sequence=[60,62,62,64].map((midi,id)=>({id,midi,group:id<2?0:1,pitch:String(midi)}));
  const session=new ToneSession(sequence);
  play(session,60,0,1000);play(session,62,1040,5000);
  assert.equal(session.snapshot().cursor,1);
  assert.equal(session.snapshot().attempts.length,1);
  session.push(null,5600);play(session,62,5800,7000);
  assert.equal(session.snapshot().cursor,2);
  assert.equal(session.snapshot().attempts.length,2);
});

test('cursor waits after a finished note and resets before an explicitly selected note',()=>{
  const session=new ToneSession(targets);
  assert.equal(session.snapshot().cursorAfter,false);
  play(session,60,0,2000);
  assert.equal(session.snapshot().cursorAfter,false);
  session.push(null,2600);
  assert.equal(session.snapshot().cursorAfter,true);
  assert.equal(session.snapshot().cursor,0);
  session.select(1);assert.equal(session.snapshot().cursorAfter,false);
  play(session,61,3000,5000);session.pause();assert.equal(session.snapshot().cursorAfter,true);
  session.clear();assert.equal(session.snapshot().cursorAfter,false);
});
test('feedback labels give direction and rounded cents relative to the written note',()=>{
  for(const [cents,label] of [[12,'↑ 12¢'],[-8,'↓ 8¢'],[0,'0¢']]){
    const session=new ToneSession(targets);play(session,60,0,2000,cents);session.pause();
    assert.equal(tonePitchLabel(session.snapshot().attempts[0]).short,label);
  }
  const short=new ToneSession(targets);play(short,60,0,160);short.pause();
  assert.equal(tonePitchLabel(short.snapshot().attempts[0]).short,'?');
});

 test('Moyse B to B-flat continues after a short breath into B-flat to A',()=>{
  const sequence=[83,82,82,81].map((midi,id)=>({id,midi,group:Math.floor(id/2),pitch:String(midi)}));
  const session=new ToneSession(sequence);
  play(session,83,0,1000);play(session,82,1040,3000);
  session.push(null,3080);session.push(null,3200);
  play(session,82,3240,4500);
  assert.equal(session.snapshot().cursor,2);
  play(session,81,4540,6000);
  assert.equal(session.snapshot().cursor,3);
 });
 test('Moyse recovers at A if the repeated B-flat onset was not detected',()=>{
  const sequence=[83,82,82,81].map((midi,id)=>({id,midi,group:Math.floor(id/2),pitch:String(midi)}));
  const session=new ToneSession(sequence);
  play(session,83,0,1000);play(session,82,1040,5000);
  session.push(null,5080);play(session,82,5120,6000);
  assert.equal(session.snapshot().cursor,1);
  play(session,81,6040,6040);play(session,82,6080,6400);
  assert.equal(session.snapshot().cursor,1);
  play(session,81,6440,8000);
  assert.equal(session.snapshot().cursor,3);
  assert.deepEqual(session.snapshot().attempts.map(a=>a.target.id),[0,1]);
 });
