import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const compile=source=>ts.transpile(source,{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022});
const patterns=fs.readFileSync(new URL('../app/flute-studio/components/notePatterns.ts',import.meta.url),'utf8');
const patternsUrl=`data:text/javascript;base64,${Buffer.from(compile(patterns)).toString('base64')}`;
const scales=fs.readFileSync(new URL('../app/flute-studio/exercises/scales/scale-score.ts',import.meta.url),'utf8');
const scalesUrl=`data:text/javascript;base64,${Buffer.from(compile(scales).replace('../../components/notePatterns',patternsUrl)).toString('base64')}`;
const source=fs.readFileSync(new URL('../app/flute-studio/components/passageAnalysis.ts',import.meta.url),'utf8');
const {analyzePassage,suggestScale}=await import(`data:text/javascript;base64,${Buffer.from(compile(source).replace('../exercises/scales/scale-score',scalesUrl)).toString('base64')}`);

test('a distinctive melodic minor fragment gets a scale suggestion, a single chromatic note does not',()=>{
  assert.deepEqual(suggestScale(['G4','B♭4','C5','D5','E5','F♯5'])?.label,'G melodic minor');
  assert.equal(suggestScale(['C♯5','D5','C♯5']),null);
});

test('six-note subdivision and ties remain separate from pitch attacks',()=>{
  const events=['F4','A♭4','C5','E5','F5','E5','C5','A♭4','F4'].map(p=>({p,d:2}));
  events.push({p:'F4',d:2,tied:true});
  const result=analyzePassage(events,12);
  assert.equal(result.subdivision,6);
  assert.equal(result.notes,9);
  assert.equal(result.ties,1);
  assert.equal(result.scale,null);
  assert.equal(result.motion,'leaps');
});

test('ordinary sixteenth notes do not become tuplets on a score-wide tuplet grid',()=>{
  const result=analyzePassage(Array.from({length:8},(_,index)=>({p:index%2?'B♭5':'A5',d:3})),12);
  assert.equal(result.tuplets,0);
  assert.equal(result.subdivision,null);
  assert.equal(result.evenRun,8);
});

const passageUrl=`data:text/javascript;base64,${Buffer.from(compile(source).replace('../exercises/scales/scale-score',scalesUrl)).toString('base64')}`;
const practiceSource=fs.readFileSync(new URL('../app/flute-studio/components/practiceExcerpt.ts',import.meta.url),'utf8');
const {relatedScale}=await import(`data:text/javascript;base64,${Buffer.from(compile(practiceSource).replace('../exercises/scales/scale-score',scalesUrl).replace('./passageAnalysis',passageUrl)).toString('base64')}`);

test('preparation scale may support a run containing a chromatic exception',()=>{
  const result=relatedScale(['C4','D4','E4','F4','G4','A4','B4','C5','C♯5'].map(p=>({p,d:1})));
  assert.equal(result?.label,'C major');
  assert.ok(result.evidence.includes('B'));
  assert.ok(!result.evidence.includes('C♯'));
  assert.match(result.xml,/<score-partwise/);
});

test('related scale is withheld for repeated notes or unrelated wide leaps',()=>{
  assert.equal(relatedScale(Array.from({length:12},()=>({p:'C♯5',d:1}))),null);
  assert.equal(relatedScale(['C4','E5','G4','B5','D4'].map(p=>({p,d:1}))),null);
});
