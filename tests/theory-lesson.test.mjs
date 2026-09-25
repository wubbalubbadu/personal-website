import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pitchAt,noteY,positionAt,ledgerLines,readSaved,pitchLabel,STEPS,matchesMelody} from '../app/flute-studio/theory/model.ts';

test('treble staff anchors and solfege agree with sounding MIDI pitches',()=>{
  assert.deepEqual(pitchAt(0),{name:'E',octave:4,midi:64});
  assert.deepEqual(pitchAt(2),{name:'G',octave:4,midi:67});
  assert.deepEqual(pitchAt(4),{name:'B',octave:4,midi:71});
  assert.deepEqual(pitchAt(-2),{name:'C',octave:4,midi:60});
  assert.deepEqual(pitchAt(5),{name:'C',octave:5,midi:72});
  assert.equal(pitchLabel(2),'G · sol');
  assert.equal(pitchLabel(4),'B · si');
});
test('pointer positions snap to lines and spaces, including both ledger lines',()=>{
  for(let p=-2;p<=10;p++)assert.equal(positionAt(noteY(p)),p);
  assert.equal(positionAt(-200),10);assert.equal(positionAt(1000),-2);
  assert.equal(positionAt(175),2);assert.equal(positionAt(165),3);
  assert.deepEqual(ledgerLines(-2),[-2]);assert.deepEqual(ledgerLines(-1),[]);
  assert.deepEqual(ledgerLines(9),[]);assert.deepEqual(ledgerLines(10),[10]);
});
test('saved phrases preserve empty slots and pitches while rejecting invalid stored values',()=>{
  const phrase=[-2,2,null,10];
  assert.deepEqual(readSaved(JSON.stringify({version:1,step:7,phrase,completed:true})),{version:1,step:7,phrase,completed:true});
  for(const raw of [null,'{','null','[]','{"version":2,"phrase":[0,0,0,0]}'])assert.deepEqual(readSaved(raw).phrase,[null,null,null,null]);
  const corrupt=readSaved(JSON.stringify({version:1,step:99,phrase:[11,'2',3.5,4],completed:'yes'}));
  assert.equal(corrupt.step,STEPS.length-1);assert.deepEqual(corrupt.phrase,[null,null,null,4]);assert.equal(corrupt.completed,false);
});

test('melody checking accepts a whole octave shift but rejects a changed interval or missing note',()=>{
  const target=[-2,-2,2,2,3,3,2];
  assert.equal(matchesMelody(target,target),true);
  assert.equal(matchesMelody([5,5,9,9,10,10,9],target),true);
  assert.equal(matchesMelody([5,-2,9,9,10,10,9],target),false);
  assert.equal(matchesMelody([-1,-1,3,3,4,4,3],target),false);
  assert.equal(matchesMelody([-2,-2,2,2,3,3,null],target),false);
});
test('ledger explorer supplies every required ledger line above the staff',()=>{
  assert.deepEqual(ledgerLines(15),[10,12,14]);
  assert.deepEqual(ledgerLines(12),[10,12]);
});

test('lesson tones begin and end at silence with a soft attack and bounded peak',async()=>{
  const {toneSamples}=await import('../app/flute-studio/theory/toneSamples.ts');
  for(const rate of [44100,48000])for(const frequency of [261.626,440,1396.913]){
    const samples=toneSamples(frequency,.45,rate);
    assert.equal(samples[0],0);assert.ok(Math.abs(samples.at(-1))<1e-9);
    let peak=0,earlyPeak=0;
    samples.forEach((v,i)=>{peak=Math.max(peak,Math.abs(v));if(i<rate*.005)earlyPeak=Math.max(earlyPeak,Math.abs(v))});
    assert.ok(peak<.068);assert.ok(earlyPeak<.001);
  }
});

test('clef tracing accepts a roughly 60 percent match but rejects sparse marks and scribbles',async()=>{
  const {traceSegment,traceComplete}=await import('../app/flute-studio/theory/traceProgress.ts');
  const samples=Array.from({length:101},(_,i)=>({x:i*3,y:0}));
  const good=traceSegment(samples,{x:0,y:5},{x:190,y:5});
  assert.equal(traceComplete(good.covered.length,101,good.matchedLength,good.length),true);
  const short=traceSegment(samples,{x:0,y:0},{x:20,y:0});
  assert.equal(traceComplete(short.covered.length,101,short.matchedLength,short.length),false);
  const far=traceSegment(samples,{x:0,y:100},{x:300,y:100});
  assert.equal(traceComplete(far.covered.length,101,far.matchedLength,far.length),false);
  assert.equal(traceComplete(90,101,100,500),false);
  assert.equal(traceComplete(61,101,61,100),true);
  assert.equal(traceComplete(59,101,100,100),false);
});
