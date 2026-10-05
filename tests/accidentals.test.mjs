import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const compile=source=>ts.transpile(source,{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022});
const url=code=>`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
const model=fs.readFileSync(new URL('../app/flute-studio/theory/model.ts',import.meta.url),'utf8');
const pitchSource=fs.readFileSync(new URL('../app/flute-studio/theory/accidentals/pitch.ts',import.meta.url),'utf8');
const pitchModule=url(compile(pitchSource).replace("'../model'",`'${url(compile(model))}'`));
const {midiOf,letterMidi,soundingAcc,soundingMidi}=await import(pitchModule);
const pairsSource=fs.readFileSync(new URL('../app/flute-studio/theory/accidentals/pairs.ts',import.meta.url),'utf8');
const {makeRound,pairMidi,SHOWN,POOL,WHITE}=await import(url(compile(pairsSource).replace("'./pitch'",`'${pitchModule}'`)));

const n=(p,acc)=>acc?{v:1,p,acc}:{v:1,p};

test('a sign changes one note by a half step',()=>{
  assert.equal(letterMidi(1),65);
  assert.equal(midiOf(1,'sharp'),66);
  assert.equal(midiOf(4,'flat'),70);
  assert.equal(midiOf(1,'natural'),65);
  assert.equal(midiOf(1),65);
});

test('a sharp carries to the same note until the bar line',()=>{
  // F# G F | F
  assert.deepEqual(soundingMidi([n(1,'sharp'),n(2),n(1),n(1)],[3]),[66,67,66,65]);
});

test('a natural cancels a flat for the rest of the measure',()=>{
  // Bb B B-natural B
  assert.deepEqual(soundingMidi([n(4,'flat'),n(4),n(4,'natural'),n(4)],[]),[70,70,71,71]);
  assert.deepEqual(soundingAcc([n(4,'flat'),n(4),n(4,'natural'),n(4)],[]),['flat','flat',undefined,undefined]);
});

test('a sign belongs to its own staff position: the F an octave up stays plain',()=>{
  assert.deepEqual(soundingMidi([n(1,'sharp'),n(8)],[]),[66,77]);
});

test('every pair in the matching exercise is one key written two ways',()=>{
  for(const pair of [SHOWN,...POOL,WHITE]){const [a,b]=pairMidi(pair);assert.equal(a,b)}
  // The shown pair is A sharp and B flat, the white-key pair is E sharp and F.
  assert.deepEqual(pairMidi(SHOWN),[70,70]);
  assert.deepEqual(pairMidi(WHITE),[65,65]);
});

test('a matching round shows one pair, asks three, always includes E sharp and F, and every note has one partner',()=>{
  let seed=7;const rand=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
  for(let k=0;k<50;k++){
    const round=makeRound(rand);
    assert.equal(round.left.length,4);assert.equal(round.right.length,4);
    assert.deepEqual(round.left[0],SHOWN[0]);
    assert.ok(round.left.some(note=>note.p===WHITE[0].p&&note.acc===WHITE[0].acc));
    assert.deepEqual([...round.partner].sort(),[0,1,2,3]);
    round.left.forEach((note,i)=>{
      const partner=round.right[round.partner[i]];
      assert.equal(midiOf(note.p,note.acc),midiOf(partner.p,partner.acc));
      // No line is level: every one has to be drawn across.
      assert.notEqual(round.partner[i],i);
    });
    // The three drawn pairs are different from each other.
    assert.equal(new Set(round.left.map(note=>midiOf(note.p,note.acc))).size,4);
  }
});
