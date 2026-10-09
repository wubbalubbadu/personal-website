import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const compile=source=>ts.transpile(source,{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022});
const load=name=>import('data:text/javascript,'+encodeURIComponent(compile(fs.readFileSync(new URL(`../app/flute-studio/lib/${name}.ts`,import.meta.url),'utf8').replace('import {useEffect,useSyncExternalStore} from "react";','const useSyncExternalStore=()=>"",useEffect=()=>{};').replace('import {bumpTally} from "./tallyLog";','const bumpTally=(c,d)=>Math.max(0,Math.floor(c)+d);'))));

test('tally groups cross every fifth stick', async()=>{
  const {tallyGroups,bumpTally}=await import('data:text/javascript,'+encodeURIComponent(compile(fs.readFileSync(new URL('../app/flute-studio/lib/tallyLog.ts',import.meta.url),'utf8'))));
  assert.deepEqual(tallyGroups(0),[]);
  assert.deepEqual(tallyGroups(3),[{sticks:3,crossed:false}]);
  assert.deepEqual(tallyGroups(5),[{sticks:5,crossed:true}]);
  assert.deepEqual(tallyGroups(12),[{sticks:5,crossed:true},{sticks:5,crossed:true},{sticks:2,crossed:false}]);
  assert.equal(bumpTally(0,-1),0);assert.equal(bumpTally(4,1),5);assert.equal(bumpTally(NaN,1),1);
});

const makeStore=()=>{const map=new Map();return {getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>{map.set(k,String(v))},removeItem:k=>{map.delete(k)}}};

test('tricky bits: add, tempos, goal, move, remove', async()=>{
  globalThis.localStorage=makeStore();globalThis.window={dispatchEvent(){}};globalThis.Event=class{};
  const bits=await load('trickyBits');
  const a=bits.addBit({pieceId:'arnold',from:40,to:46,label:'40–46',tempo:80});
  assert.equal(a.id,'arnold:40-46');assert.deepEqual(a.tempos,[80]);
  // Saving the same range again keeps the first save.
  bits.addTempo(a.id,88);
  assert.equal(bits.addBit({pieceId:'arnold',from:40,to:46,label:'40–46',tempo:60}).tempos.length,2);
  bits.addTempo(a.id,88);assert.deepEqual(bits.readBits()[0].tempos,[80,88]);
  bits.setGoal(a.id,120);assert.equal(bits.readBits()[0].goal,120);
  bits.bumpBitTally(a.id,1);bits.bumpBitTally(a.id,1);bits.bumpBitTally(a.id,-5);assert.equal(bits.readTallies()[a.id],0);
  bits.bumpBitTally(a.id,1);
  bits.moveBit(a.id,{from:41,to:46,label:'41–46'});
  const moved=bits.readBits();assert.equal(moved.length,1);assert.equal(moved[0].id,'arnold:41-46');assert.deepEqual(moved[0].tempos,[80,88]);
  assert.equal(bits.readTallies()['arnold:41-46'],1);assert.equal(bits.readTallies()[a.id],undefined);
  bits.removeTempo('arnold:41-46',80);assert.deepEqual(bits.readBits()[0].tempos,[88]);
  bits.removeBit('arnold:41-46');assert.equal(bits.readBits().length,0);assert.deepEqual(bits.readTallies(),{});
});
test('reps belong to a tempo; old totals move onto the fastest tempo once',async()=>{
  const {addBit,bumpRep,readReps,totalReps,migrateTallies,BITS_KEY,TALLIES_KEY,REPS_KEY}=await load('trickyBits');
  globalThis.localStorage=makeStore();globalThis.window??={dispatchEvent(){},addEventListener(){},removeEventListener(){}};
  addBit({pieceId:'p',from:1,to:2,label:'1–2',tempo:60});
  localStorage.setItem(TALLIES_KEY,JSON.stringify({'p:1-2':7}));
  const bits=JSON.parse(localStorage.getItem(BITS_KEY));bits[0].tempos=[60,66];localStorage.setItem(BITS_KEY,JSON.stringify(bits));
  migrateTallies();
  assert.deepEqual(readReps()['p:1-2'],{'66':7});
  migrateTallies();
  assert.equal(totalReps(readReps()['p:1-2']),7);
  bumpRep('p:1-2',60,1);bumpRep('p:1-2',60,1);bumpRep('p:1-2',66,-1);
  assert.deepEqual(readReps()['p:1-2'],{'66':6,'60':2});
  assert.ok(localStorage.getItem(REPS_KEY));
});
