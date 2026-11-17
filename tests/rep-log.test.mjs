import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const compile=source=>ts.transpile(source,{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022});
const source=fs.readFileSync(new URL('../app/flute-studio/lib/repLog.ts',import.meta.url),'utf8')
  .replace('import {useSyncExternalStore} from "react";','const useSyncExternalStore=()=>"";')
  .replace('import {bumpTally} from "./tallyLog";','const bumpTally=(c,d)=>Math.max(0,Math.floor(c)+d);')
  .replace('import {recordTempo} from "./tempoHistory";','const recordTempo=()=>{};');
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

test('a scale totals as one thing across ranges and groupings, not across keys or forms',async()=>{
  const {repTotal,totalGroup}=await import('data:text/javascript,'+encodeURIComponent(compile(source)));
  assert.equal(totalGroup('scale-book:major:thirds-in3:C:full'),'scale-book:major:thirds:C');
  assert.equal(totalGroup('tricky:a'),'tricky:a');
  const reps=n=>({title:'t',reps:{'60':n}});
  const log={'2026-11-01':{'scale-book:major:scale:C:full':reps(2),'scale-book:major:scale-in3:C:one-octave':reps(3),'scale-book:major:scale:D:full':reps(9),'scale-book:major:thirds:C:full':reps(4)},
    '2026-11-02':{'scale-book:major:scale:C:custom-60-84':reps(1),'tricky:a':reps(7)}};
  assert.equal(repTotal(log,'scale-book:major:scale:C:full'),6,'one octave, full range, custom range and groups of three all count');
  assert.equal(repTotal(log,'scale-book:major:thirds:C:full'),4,'thirds stay their own exercise');
  assert.equal(repTotal(log,'scale-book:major:scale:D:full'),9,'another key stays apart');
  assert.equal(repTotal(log,'tricky:a'),7);
});
