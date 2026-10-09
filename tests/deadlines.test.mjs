import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const compile=source=>ts.transpile(source,{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022});
const load=source=>import('data:text/javascript,'+encodeURIComponent(compile(source)));
const read=name=>fs.readFileSync(new URL(`../app/flute-studio/lib/${name}.ts`,import.meta.url),'utf8');
const statusUrl='data:text/javascript,'+encodeURIComponent(compile(read('musicStatus').replace('import {useEffect,useSyncExternalStore} from "react";','const useEffect=()=>{},useSyncExternalStore=()=>"";')));
const deadlines=await load(read('deadlines').replace('import {useSyncExternalStore} from "react";','const useSyncExternalStore=()=>"";').replace('./musicStatus',statusUrl));
const transfer=await load(read('transfer'));
const makeStore=(initial={})=>{const map=new Map(Object.entries(initial));return {get length(){return map.size},key:i=>[...map.keys()][i]??null,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)}};
const key=deadlines.DEADLINES_KEY;
const records=()=>JSON.parse(localStorage.getItem(key)??'[]');
function setup(t){const oldStore=globalThis.localStorage,oldWindow=globalThis.window;globalThis.localStorage=makeStore();globalThis.window={dispatchEvent(){}};t.after(()=>{globalThis.localStorage=oldStore;globalThis.window=oldWindow})}
const draft={id:'audition',name:'Audition',date:'2099-12-31',pieces:['piece-a']};
test('create and edit a deadline retain identity and update last-edited time',t=>{
  setup(t);t.mock.method(Date,'now',()=>1000);
  deadlines.saveDeadline(draft,{});
  assert.deepEqual(records(),[{...draft,at:1000}]);
  Date.now.mock.mockImplementation(()=>2000);
  deadlines.saveDeadline({...draft,name:'Lesson',date:'2026-11-01',pieces:['piece-a','piece-b']},{'piece-a':'working'});
  assert.equal(records().length,1);assert.equal(records()[0].at,2000);assert.equal(records()[0].name,'Lesson');
  assert.deepEqual(records()[0].pieces,['piece-a','piece-b']);
});
test('delete keeps a newer tombstone and an older transfer cannot resurrect it',t=>{
  setup(t);t.mock.method(Date,'now',()=>1000);deadlines.saveDeadline(draft,{});
  const old=localStorage.getItem(key);
  Date.now.mock.mockImplementation(()=>2000);deadlines.deleteDeadline(draft.id);
  const tombstone=records()[0];assert.equal(tombstone.deleted,true);assert.equal(tombstone.at,2000);assert.deepEqual(tombstone.pieces,[]);
  assert.deepEqual(JSON.parse(transfer.merge(localStorage.getItem(key),old,key)),[tombstone]);
  assert.deepEqual(JSON.parse(transfer.merge(old,localStorage.getItem(key),key)),[tombstone]);
});
test('deadline code round trip merges by at before date and keeps other deadlines',async t=>{
  setup(t);t.mock.method(Date,'now',()=>1000);deadlines.saveDeadline(draft,{});
  const staleCode=await transfer.encode(transfer.collect(false));
  Date.now.mock.mockImplementation(()=>2000);deadlines.saveDeadline({...draft,date:'2026-10-09',name:'Edited'},{});
  const current=records()[0],newCode=await transfer.encode(transfer.collect(false));
  transfer.apply(await transfer.decode(staleCode));assert.deepEqual(records(),[current]);
  globalThis.localStorage=makeStore({[key]:JSON.stringify([{...draft,at:1000},{...draft,id:'concert',at:500}])});
  transfer.apply(await transfer.decode(newCode));
  assert.deepEqual(records().find(record=>record.id===draft.id),current);
  assert.ok(records().some(record=>record.id==='concert'));
  Date.now.mock.mockImplementation(()=>3000);deadlines.deleteDeadline(draft.id);
  const deletedCode=await transfer.encode(transfer.collect(false));
  globalThis.localStorage=makeStore();transfer.apply(await transfer.decode(staleCode));transfer.apply(await transfer.decode(deletedCode));
  transfer.apply(await transfer.decode(newCode));
  assert.equal(records().find(record=>record.id===draft.id).deleted,true);
});
test('deletion in the same millisecond still gets a strictly newer timestamp',t=>{
  setup(t);t.mock.method(Date,'now',()=>1000);deadlines.saveDeadline(draft,{});
  const before=records()[0];deadlines.deleteDeadline(draft.id);
  assert.ok(records()[0].at>before.at,'A deletion must outrank the saved record even within one clock tick');
});
