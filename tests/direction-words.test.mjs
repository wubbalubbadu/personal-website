import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const compile=source=>ts.transpile(source,{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022});
const terms=fs.readFileSync(new URL('../content/music-terms.json',import.meta.url),'utf8');
const termsUrl=`data:text/javascript;base64,${Buffer.from(`export default ${terms}`).toString('base64')}`;
const source=fs.readFileSync(new URL('../app/flute-studio/components/scoreTheory.ts',import.meta.url),'utf8');
const {directionStyle,directionRuns}=await import(`data:text/javascript;base64,${Buffer.from(compile(source).replace('../../../content/music-terms.json',termsUrl)).toString('base64')}`);

test('"Piu vivo." is one bold tempo marking whether or not the score writes the accent',()=>{
  for(const text of ['Piu vivo.','Più vivo.']){
    assert.equal(directionStyle(text),'tempo');
    assert.equal(directionRuns(text),null,`${text} must not be split into two fonts`);
  }
});

test('other unaccented modifiers stay with their tempo word',()=>{
  assert.equal(directionRuns('Tres modere'),null);
  assert.equal(directionStyle('Allegro.'),'tempo');
  assert.equal(directionStyle('a tempo.'),'tempo');
});

test('a marking that really mixes kinds is still styled part by part',()=>{
  const runs=directionRuns('un poco rit. a tempo.');
  assert.ok(runs&&runs.some(run=>run.style==='tempo')&&runs.some(run=>run.style==='expression'));
});
