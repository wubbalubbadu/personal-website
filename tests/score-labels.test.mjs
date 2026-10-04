import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const compile=source=>ts.transpile(source,{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022});
const source=fs.readFileSync(new URL('../app/flute-studio/components/scoreLabels.ts',import.meta.url),'utf8');
const {solfege}=await import(`data:text/javascript;base64,${Buffer.from(compile(source)).toString('base64')}`);

test('fixed Do with plain syllables and the written accidental',()=>{
  assert.equal(solfege('A♭'),'La♭');
  assert.equal(solfege('F♯'),'Fa♯');
  assert.equal(solfege('B♭'),'Ti♭');
  assert.equal(solfege('C'),'Do');
  assert.equal(solfege('G'),'Sol');
});

test('the written letter is kept, never the sounding enharmonic',()=>{
  assert.equal(solfege('E♯'),'Mi♯');
  assert.equal(solfege('C♭'),'Do♭');
  assert.equal(solfege('B♯'),'Ti♯');
});

test('double accidentals show, a natural shows nothing, and an octave number is ignored',()=>{
  assert.equal(solfege('F𝄪'),'Fa𝄪');
  assert.equal(solfege('B𝄫'),'Ti𝄫');
  assert.equal(solfege('A♮'),'La');
  assert.equal(solfege('A♭4'),'La♭');
  assert.equal(solfege('F♯5'),'Fa♯');
});

test('Arnold bar 1 reads La Ti♭ Re La Fa♯ La',()=>{
  assert.deepEqual(['A','B♭','D','A','F♯','A'].map(solfege),['La','Ti♭','Re','La','Fa♯','La']);
});
