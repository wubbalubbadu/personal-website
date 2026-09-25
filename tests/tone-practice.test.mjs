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
const {ToneSession,toneSummary,tonePitchLabel,TONE_MIN_RMS}=await import(moduleUrl('../app/flute-studio/lib/toneSession.ts',{"'./pitch'":JSON.stringify(pitchUrl)}));
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
  // Playing a note again replaces its earlier take; the other notes keep theirs.
  assert.deepEqual(snap.attempts.map(a=>a.target.id),[1,2,0]);assert.ok(snap.attempts[2].startedAt>=7000);void firstFrames;
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
  play(session,60,3000,4400);session.pause();assert.equal(session.snapshot().attempts.length,1,'the second hold replaces the first');
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

const {traceY,traceDuration,TRACE_LIMIT_CENTS}=await import(moduleUrl('../app/flute-studio/lib/toneTrace.ts'));
test('fixed trace scale keeps ±30 cents at 70 percent even with extreme tail readings',()=>{
  assert.equal(traceY(-30)-traceY(30),140);
  assert.equal(traceY(1950),0);
  assert.equal(traceY(-1950),200);
  assert.ok(TRACE_LIMIT_CENTS>42&&TRACE_LIMIT_CENTS<43);
  const session=new ToneSession(targets);play(session,60,0,2000,18);
  const before=session.snapshot().live.frames.map(f=>({...f}));
  play(session,60,2040,2040,-1900);session.pause();
  assert.deepEqual(session.snapshot().attempts[0].frames.slice(0,before.length),before);
  assert.ok(Math.abs(toneSummary(session.snapshot().attempts[0]).center-18)<.001);
});
test('midpoint intonation oscillation confirms a new note after a breath',()=>{
  const session=new ToneSession(targets);play(session,60,0,1200,-18);session.push(null,1800);
  for(let at=2000;at<=3200;at+=40)play(session,60,at,at,at%80===0?-49:-51);
  assert.ok(session.snapshot().live);
  assert.equal(session.snapshot().cursor,0);
  assert.ok(toneSummary(session.snapshot().live).center < -48);
});
test('long silence leaves the last take visible; playing the note again replaces it',()=>{
  const session=new ToneSession(targets);play(session,60,0,1200,15);session.push(null,1800);
  const old=session.snapshot().attempts;
  session.push(null,15000);
  assert.deepEqual(session.snapshot().attempts,old);
  play(session,60,16000,17200,-12);session.pause();
  const all=session.snapshot().attempts;
  assert.equal(all.length,1);assert.ok(Math.abs(toneSummary(all[0]).center+12)<3);
});
test('quiet off-center tone reacquires after silence and explicit mic pause at both sample rates',()=>{
  for(const sr of [44100,48000]){
    const session=new ToneSession(targets);
    const hz=hzFromMidi(60)*2**(-18/1200);
    const buffer=Float32Array.from({length:4096},(_,i)=>.008*Math.sin(2*Math.PI*hz*i/sr));
    const detected=detectPitch(buffer,sr,TONE_MIN_RMS);assert.ok(detected);
    const feed=(from,to)=>{for(let at=from;at<=to;at+=40)session.push({...detected,at},at)};
    // Each segment is picked up again (after a breath, after a mic pause) and
    // replaces the one before it: one attempt, measured fresh each time.
    for(const [from,to] of [[0,1200],[2000,3200],[10000,11200]]){
      feed(from,to);session.pause();
      const attempts=session.snapshot().attempts;
      assert.equal(attempts.length,1);assert.equal(attempts[0].startedAt,from);
      assert.ok(Math.abs(toneSummary(attempts[0]).center+18)<3);
      assert.equal(toneSummary(attempts[0]).reliable,true);
    }
  }
});

test('timeline begins at eight seconds and grows only after that window is filled',()=>{
  for(const elapsed of [0,1000,4000,7000,8000])assert.equal(traceDuration(elapsed),8000);
  assert.equal(traceDuration(8040),12000);
  assert.equal(traceDuration(12000),12000);
});

test('after finishing a group, its first note starts it again; the next group\'s note moves on',()=>{
  // De la sonorité's shape: B5→B♭5, then B♭5→A5.
  const sequence=[[83,0],[82,0],[82,1],[81,1]].map(([midi,group],id)=>({id,midi,group,pitch:String(midi)}));
  const again=new ToneSession(sequence);
  play(again,83,0,1500);play(again,82,1540,3500);again.push(null,4100);
  play(again,83,4300,5800);
  assert.equal(again.snapshot().cursor,0);
  assert.equal(again.snapshot().live.target.id,0,'the repeated B5 is measured as B5, not as a sharp B♭5');
  assert.ok(Math.abs(toneSummary(again.snapshot().live).center)<5);
  const onward=new ToneSession(sequence);
  play(onward,83,0,1500);play(onward,82,1540,3500);onward.push(null,4100);
  play(onward,82,4300,5800);
  assert.equal(onward.snapshot().cursor,2);
});

const history=await import(moduleUrl('../app/flute-studio/lib/pitchHistory.ts',{"'./toneSession'":JSON.stringify(moduleUrl('../app/flute-studio/lib/toneSession.ts',{"'./pitch'":JSON.stringify(pitchUrl)}))}));
test('pitch history: still-off notes are to-dos, self-corrected notes are not, and old readings age out',()=>{
  const r=(midi,center,drift=0,first)=>({at:1,pitch:String(midi),midi,ms:4000,center,drift,exercise:'x',...(first===undefined?{}:{first})});
  const records=[
    r(78,-15),r(78,-20),r(78,-12),r(78,4),            // stays flat: work on it
    r(70,-20),r(70,20),r(70,-18),r(70,17),             // scattered: not a lean
    r(66,2,0,-18),r(66,-3,0,-15),r(66,1,0,-20),        // starts flat, always fixed
    r(72,-2,-25),r(72,-3,-20),r(72,1,-2)];
  const t=history.noteTendencies(records);
  assert.deepEqual(history.focusNotes(t).map(x=>x.midi),[78]);
  assert.deepEqual(history.correctedNotes(t).map(x=>x.midi),[66]);
  assert.equal(t.get(78).finalFlat,.75);
  assert.equal(history.sessionReport(records.filter(x=>x.midi===72)).endingDrops,2);
  // Nine flat readings, then eight in tune: only the recent eight count.
  const improved=[...Array(9)].map(()=>r(80,-20)).concat([...Array(8)].map(()=>r(80,1)));
  assert.equal(history.focusNotes(history.noteTendencies(improved)).length,0);
});

test('after silence, a pitch that matches another group jumps there instead of reading 600 cents flat',()=>{
  // Four one-by-two groups: B→B♭, A♭→G, E♭→D, D♭→C.
  const sequence=[[83,0],[82,0],[80,1],[79,1],[75,2],[74,2],[73,3],[72,3]].map(([midi,group],id)=>({id,midi,group,pitch:String(midi)}));
  const session=new ToneSession(sequence);session.select(2);
  play(session,80,0,1500);play(session,79,1540,3000);session.push(null,3700);
  play(session,73,3900,5400);
  assert.equal(session.snapshot().cursor,6);
  assert.ok(Math.abs(toneSummary(session.snapshot().live).center)<5);
  // Starting fresh anywhere works the same way: no tap needed.
  const cold=new ToneSession(sequence);play(cold,75,0,1500);
  assert.equal(cold.snapshot().cursor,4);
  // Redoing a group keeps only the latest take.
  play(session,72,5440,7000);session.push(null,7700);play(session,73,7900,9400);play(session,72,9440,11000);session.pause();
  assert.deepEqual(session.snapshot().attempts.filter(a=>a.target.group===3).map(a=>a.startedAt),[7900,9440]);
});
