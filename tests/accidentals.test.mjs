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
const judgeSource=fs.readFileSync(new URL('../app/flute-studio/theory/accidentals/signJudge.ts',import.meta.url),'utf8');
const {judgeSign,guideParts,SIGN_PARTS,TRACE_TOLERANCE}=await import(url(compile(judgeSource)));
const {makeRound,pairMidi,PAIRS}=await import(url(compile(pairsSource).replace("'./pitch'",`'${pitchModule}'`)));

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
  for(const pair of PAIRS){const [a,b]=pairMidi(pair);assert.equal(a,b)}
  // C sharp and D flat (found in step 2) come first; E sharp and F (shown at the end of step 2) is the white-key pair.
  assert.deepEqual(pairMidi(PAIRS[0]),[61,61]);
  assert.deepEqual(pairMidi(PAIRS[3]),[65,65]);
  assert.equal(PAIRS.length,4);
});

test('a matching round keeps the top staff in order, shuffles the bottom so no line is straight down, and every note has one partner',()=>{
  let seed=7;const rand=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
  for(let k=0;k<50;k++){
    const round=makeRound(rand);
    assert.equal(round.left.length,4);assert.equal(round.right.length,4);
    assert.deepEqual(round.left,PAIRS.map(pair=>pair[0]));
    assert.deepEqual([...round.partner].sort(),[0,1,2,3]);
    round.left.forEach((note,i)=>{
      const partner=round.right[round.partner[i]];
      assert.equal(midiOf(note.p,note.acc),midiOf(partner.p,partner.acc));
      assert.notEqual(round.partner[i],i);
    });
  }
});

// Drawing a sign. Ink is dense points with a little hand wobble; the guide is the sign at the origin, in staff units.
const TOL=TRACE_TOLERANCE;
let wobbleSeed=11;const wobble=()=>{wobbleSeed=(wobbleSeed*16807)%2147483647;return (wobbleSeed/2147483647-.5)*1.4};
const ink=glyph=>{
  const pts=glyph.map(([gx,gy])=>({x:gx*.064,y:-gy*.064})),out=[];
  for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],n=Math.max(2,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/1.2));for(let k=0;k<=n;k++)out.push({x:a.x+(b.x-a.x)*k/n+wobble(),y:a.y+(b.y-a.y)*k/n+wobble()})}
  return out;
};
const verdict=(sign,strokes)=>judgeSign(guideParts(sign,{x:0,y:0}),strokes.map(ink),TOL);

test('a natural drawn as two little 7s passes',()=>{
  const N=SIGN_PARTS.natural;
  // A 7: the upper bar, then straight down the right upright. The other is a 7 turned upside down: the lower bar from its right end, then up the left upright.
  const seven=[[40,160],[220,204],[218,225],[218,-440]],upside=[[197,-136],[20,-180],[20,440]];
  assert.ok(N.length===4);
  assert.equal(verdict('natural',[seven,upside]).pass,true);
});

test('a natural drawn as four separate strokes passes, in any order and direction',()=>{
  const parts=SIGN_PARTS.natural.map(part=>[...part].reverse()).reverse();
  assert.equal(verdict('natural',parts).pass,true);
});

test('a natural with one upright only fails',()=>{
  assert.equal(verdict('natural',[SIGN_PARTS.natural[0]]).pass,false);
});

test('a sharp drawn as its two uprights only fails (the long parts are not the whole sign)',()=>{
  const v=verdict('sharp',[SIGN_PARTS.sharp[0],SIGN_PARTS.sharp[1]]);
  assert.equal(v.pass,false);assert.equal(v.reached,false);
});

test('a sharp drawn as all four parts in any order passes',()=>{
  const [a,b,c,d]=SIGN_PARTS.sharp;
  assert.equal(verdict('sharp',[d,b,[...c].reverse(),a]).pass,true);
});

test('a scribble over the whole sign area fails',()=>{
  // Zig-zags of every direction across the box a sharp fills.
  let seed=5;const rand=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
  const strokes=Array.from({length:6},()=>{const pts=[];for(let i=0;i<40;i++)pts.push({x:rand()*20.7,y:(rand()-.5)*68});return pts});
  assert.equal(judgeSign(guideParts('sharp',{x:0,y:0}),strokes,TOL).pass,false);
});

test('a flat with its stem only fails, and the stem with the bowl passes',()=>{
  assert.equal(verdict('flat',[SIGN_PARTS.flat[0]]).pass,false);
  assert.equal(verdict('flat',[SIGN_PARTS.flat[0],SIGN_PARTS.flat[1]]).pass,true);
});

test('a sharp drawn in three strokes fails: one upright down the middle cannot stand for both uprights',()=>{
  const [,,c,d]=SIGN_PARTS.sharp;
  const middle=[[161,-512],[161,514]];
  assert.equal(verdict('sharp',[middle,c,d]).pass,false);
});

test('a sharp missing either bar fails',()=>{
  const [a,b,c,d]=SIGN_PARTS.sharp;
  assert.equal(verdict('sharp',[a,b,c]).pass,false);
  assert.equal(verdict('sharp',[a,b,d]).pass,false);
});

test('each upright of a natural is credited only to itself',()=>{
  const [a,b,c,d]=SIGN_PARTS.natural;
  assert.equal(verdict('natural',[[[119,440],[119,-440]],c,d]).pass,false);
  assert.equal(verdict('natural',[a,b,c,d]).pass,true);
});
