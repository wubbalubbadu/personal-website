import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

// The hooks need React; the storage logic under test does not, so React is stubbed out.
const source=fs.readFileSync(new URL('../app/flute-studio/lib/savedExercises.ts',import.meta.url),'utf8')
  .replace(/^import \{[^}]*\} from "react";$/m,'const useMemo=f=>f(),useSyncExternalStore=()=>null;');
const compile=text=>ts.transpile(text,{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022});

const makeStore=(initial={})=>{const map=new Map(Object.entries(initial));return {getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>{map.set(k,String(v))},removeItem:k=>{map.delete(k)},has:k=>map.has(k)}};
globalThis.localStorage=makeStore();
globalThis.window={dispatchEvent(){},addEventListener(){},removeEventListener(){}};
const lib=await import(`data:text/javascript;base64,${Buffer.from(compile(source)).toString('base64')}`);
const {readSaved,saveSaved,deleteSaved,foldLegacy,SAVED_EXERCISES_KEY,LEGACY_SCALE_SETS_KEY}=lib;

const set=(id,name,savedAt)=>({id,name,savedAt,config:{keys:['C'],types:['major']}});

test('old scale sets move into saved exercises without loss, then the old key is gone',()=>{
  globalThis.localStorage=makeStore({[LEGACY_SCALE_SETS_KEY]:JSON.stringify([set('a','Monday','2026-09-01T00:00:00Z'),set('b','Thirds','2026-09-02T00:00:00Z')])});
  const all=readSaved();
  assert.deepEqual(all.map(item=>[item.id,item.kind,item.name]),[['a','scales','Monday'],['b','scales','Thirds']]);
  assert.equal(localStorage.has(LEGACY_SCALE_SETS_KEY),false);
  assert.equal(JSON.parse(localStorage.getItem(SAVED_EXERCISES_KEY)).length,2);
});

test('an older transfer code that brings the old key back is folded in again, newer copies winning',()=>{
  globalThis.localStorage=makeStore({
    [SAVED_EXERCISES_KEY]:JSON.stringify([{...set('a','Monday (edited)','2026-10-05T00:00:00Z'),kind:'scales'}]),
    [LEGACY_SCALE_SETS_KEY]:JSON.stringify([set('a','Monday','2026-09-01T00:00:00Z'),set('c','Relatives','2026-09-03T00:00:00Z')]),
  });
  assert.deepEqual(readSaved('scales').map(item=>item.name),['Monday (edited)','Relatives']);
  assert.deepEqual(foldLegacy([],[]),[]);
});

test('saving replaces a same-name entry of the same kind only; deleting removes one',()=>{
  globalThis.localStorage=makeStore();
  const first=saveSaved('scales','Warm-up',{keys:['C']});
  saveSaved('long-tones','Warm-up',{exercise:'held'});
  const again=saveSaved('scales','warm-up',{keys:['G']});
  assert.equal(again.id,first.id);
  assert.equal(readSaved().length,2);
  assert.deepEqual(readSaved('scales')[0].config,{keys:['G']});
  deleteSaved(first.id);
  assert.deepEqual(readSaved().map(item=>item.kind),['long-tones']);
  assert.equal(saveSaved('scales','   ',{}),null);
});
