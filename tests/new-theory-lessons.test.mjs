import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const moduleAt=async path=>import('data:text/javascript;base64,'+Buffer.from(ts.transpile(fs.readFileSync(path,'utf8'),{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022})).toString('base64'));
const {compileRhythm}=await moduleAt('app/flute-studio/theory/dots-and-ties/rhythmSequence.ts');
const {splitBeat,TRIPLET_PRACTICE,MIXED_PRACTICE}=await moduleAt('app/flute-studio/theory/rhythm-practice/patterns.ts');
const {articulationSamples}=await moduleAt('app/flute-studio/theory/articulation/articulationAudio.ts');
test('two, three and five subdivisions end on the same beat using exact ticks',()=>{
 for(const n of [2,3,5]){
  const data=compileRhythm(splitBeat(n));
  assert.equal(data.timeline[n].at,1);
  assert.equal(data.total,2);
  assert.equal(data.notes[n-1].written,n===5?.25:.5);
 }
});
test('every drill fills its meter; ties and rests never add tap targets',()=>{
 for(const p of [TRIPLET_PRACTICE,...MIXED_PRACTICE]){
  const d=compileRhythm(p);assert.equal(d.total,p.top);
  for(const i of d.ties)assert.ok(!d.onsets.includes(d.timeline[i+1].at));
  for(const e of d.timeline.filter(e=>e.midi===null))assert.ok(!d.onsets.includes(e.at));
 }
});
const energy=(s,a,b)=>s.slice(a,b).reduce((v,x)=>v+x*x,0)/(b-a);
test('slur sustains through a pitch change; separate notes release first',()=>{
 const notes=[{midi:69,beats:1},{midi:71,beats:1}];
 const separate=articulationSamples(notes,.65,12000);
 const slur=articulationSamples([{...notes[0],slurNext:true},notes[1]],.65,12000);
 assert.equal(slur.length,separate.length);
 assert.ok(energy(slur,7500,7700)>.0001);
 assert.equal(energy(separate,7500,7700),0);
 assert.ok([...slur].every(Number.isFinite));
});
test('staccato leaves silence without shifting the next note, accent changes attack only',()=>{
 const normal=articulationSamples([{midi:69,beats:1},{midi:71,beats:1}],1,12000);
 const detached=articulationSamples([{midi:69,beats:1,mark:'staccato'},{midi:71,beats:1}],1,12000);
 const accent=articulationSamples([{midi:69,beats:1,mark:'accent'},{midi:71,beats:1}],1,12000);
 assert.equal(detached.length,normal.length);
 assert.equal(energy(detached,6500,7000),0);
 assert.ok(energy(detached,12500,13000)>0);
 assert.ok(energy(accent,500,1000)>energy(normal,500,1000));
});
test('an accent is clearly louder by ear, not just a little at its very start',()=>{
 const rate=12000,rms=(s,a,b)=>Math.sqrt(s.slice(a,b).reduce((n,x)=>n+x*x,0)/(b-a));
 // The same pitch twice, so only the accent differs.
 const s=articulationSamples([{midi:69,beats:1,mark:'accent'},{midi:69,beats:1}],.65,rate),n=.65*rate,w=Math.round(.15*rate);
 const db=20*Math.log10(rms(s,0,w)/rms(s,n,n+w));
 assert.ok(db>=4,`accent only ${db.toFixed(1)} dB louder over its first 150 ms`);
});
test('tenuto fills its value, a plain note leaves a short gap',()=>{
 const plain=articulationSamples([{midi:69,beats:1},{midi:71,beats:1}],.65,12000);
 const held=articulationSamples([{midi:69,beats:1,mark:'tenuto'},{midi:71,beats:1}],.65,12000);
 const gap=[7100,7700];
 assert.ok(energy(held,...gap)>0);
 assert.equal(energy(plain,...gap),0);
});
