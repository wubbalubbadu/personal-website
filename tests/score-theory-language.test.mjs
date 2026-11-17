import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const terms=fs.readFileSync(new URL('../content/music-terms.json',import.meta.url),'utf8');
import {tsModule} from './helpers/ts-module.mjs';
const theory=await import(tsModule('app/flute-studio/components/scoreTheory.ts'));
test('every glossary entry has Chinese and retains its English meaning',()=>{
  for(const [word,entry] of Object.entries(JSON.parse(terms))){assert.ok(entry.meaning,word);assert.match(entry.zh,/\p{Script=Han}/u,word);assert.match(theory.performanceTermText(word,undefined,true)?.text??entry.zh,/\p{Script=Han}/u)}
});
test('Chinese key explanations include the raised seventh only where written',()=>{
  const upcoming=[{pitches:['A1']}];
  const shown=theory.keySignatureFromFifths(2,'minor',null,upcoming,true);
  assert.equal(shown.title,'调号：B 小调');assert.match(shown.text,/A♯/);
  assert.doesNotMatch(theory.keySignatureFromFifths(2,'minor',null,[],true).text,/第七级/);
  assert.match(theory.keySignatureFromFifths(0,null,'C',[],true).text,/多半是 C 大调/);
  assert.match(theory.keySignatureFromNotes(['F♯'],true),/G 大调/);
  assert.match(theory.keySignatureFromNotes([],true),/C 大调/);
  assert.match(theory.keySignatureFromNotes(['G♯'],true),/G♯/);
  assert.equal(theory.keySignatureFromFifths(0,'major',null).title,'Key signature: C major');
});
test('Chinese simple, compound and cut meter plus metronome units',()=>{
  const meter={beats:6,beatType:8,symbol:null};
  assert.match(theory.timeSignatureText(meter,true).text,/2 拍.*附点四分音符/);
  assert.match(theory.timeSignatureText({beats:2,beatType:2,symbol:'cut'},true).text,/二分音符/);
  assert.match(theory.timeSignatureText({beats:4,beatType:4,symbol:'common'},true).text,/四分音符/);
  assert.match(theory.timeSignatureText({beats:3,beatType:4,symbol:null},true).text,/3 拍/);
  assert.match(theory.metronomeText({unit:'eighth',dotted:false,perMinute:180,parentheses:true},meter,'',true).text,/60 拍.*建议的速度/);
  assert.match(theory.metronomeText(undefined,undefined,'= 80',true).text,/80/);
  assert.match(theory.performanceTermText('Allegro assai',{unit:'quarter',dotted:true,perMinute:144},true).text,/附点四分音符/);
  assert.match(theory.performanceTermText('cresc.',undefined,true).text,/渐强/);
  assert.match(theory.performanceTermText('dim.',undefined,true).text,/渐弱/);
  assert.match(theory.performanceTermText('staccato',undefined,true).text,/断奏/);
});
