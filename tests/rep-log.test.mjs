import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const compile=source=>ts.transpile(source,{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022});
const source=fs.readFileSync(new URL('../app/flute-studio/lib/repLog.ts',import.meta.url),'utf8')
  .replace('import {useSyncExternalStore} from "react";','const useSyncExternalStore=()=>"";')
  .replace('import {bumpTally} from "./tallyLog";','const bumpTally=(c,d)=>Math.max(0,Math.floor(c)+d);');
const makeStore=()=>{const map=new Map();return {getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>{map.set(k,String(v))},removeItem:k=>{map.delete(k)}}};

test('reps are counted per day and per tempo, and add up across days',async()=>{
  globalThis.localStorage=makeStore();globalThis.window={dispatchEvent(){}};globalThis.Event=class{};
  const {logRep,repsOnDay,repTotals,REP_LOG_KEY}=await import('data:text/javascript,'+encodeURIComponent(compile(source)));
  const scale={key:'scale:c-thirds',title:'C Major Thirds',kind:'scale'},bit={key:'tricky:a',title:'Arnold 43–46',kind:'tricky-bit'};
  logRep(scale,72,1,'2026-10-07');logRep(scale,72,1,'2026-10-07');
  logRep(scale,76,1,'2026-10-08');logRep(bit,69,1,'2026-10-08');logRep(bit,69,1,'2026-10-08');logRep(bit,69,1,'2026-10-08');
  logRep(scale,76,-1,'2026-10-08');logRep(scale,76,-1,'2026-10-08');
  const log=JSON.parse(localStorage.getItem(REP_LOG_KEY));
  assert.deepEqual(repsOnDay(log,'2026-10-07').map(r=>[r.title,r.total]),[['C Major Thirds',2]]);
  assert.deepEqual(repsOnDay(log,'2026-10-08').map(r=>[r.title,r.total]),[['Arnold 43–46',3]],'a count taken back to zero drops out, never negative');
  assert.deepEqual(repTotals(log).map(r=>[r.key,r.total]),[['tricky:a',3],['scale:c-thirds',2]]);
});
