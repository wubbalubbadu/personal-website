import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=fs.readFileSync(new URL('../app/flute-studio/lib/pitchHistory.ts',import.meta.url),'utf8').replace(/import .* from '.\/toneSession';/,'');
const js=ts.transpile(source,{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022});
const {clearPitchHistory,readPitchHistory,PITCH_UPDATED}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
test('clear only removes pitch readings and not practice sessions or saved tests',()=>{
 const data=new Map([['cookie:pitch-history','[{"midi":60}]'],['cookie:practice-sessions:v1','keep'],['cookie:tendency-tests','keep']]);
 globalThis.localStorage={getItem:k=>data.get(k)??null,removeItem:k=>data.delete(k)};
 globalThis.window=new EventTarget();let updated=0;window.addEventListener(PITCH_UPDATED,()=>updated++);
 assert.equal(clearPitchHistory(),true);assert.deepEqual(readPitchHistory(),[]);assert.equal(updated,1);
 assert.equal(data.get('cookie:practice-sessions:v1'),'keep');assert.equal(data.get('cookie:tendency-tests'),'keep');
 localStorage.removeItem=()=>{throw Error('blocked')};assert.equal(clearPitchHistory(),false);assert.equal(updated,1);
});
