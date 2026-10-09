import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=fs.readFileSync(new URL('../app/flute-studio/practice-data.ts',import.meta.url),'utf8');
const {migrateRoutine,routineForDay,practiceDay}=await import('data:text/javascript,'+encodeURIComponent(ts.transpile(source,{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022})));
const today='2026-10-08';
test('legacy completion migrates once and false or missing stays incomplete',()=>{
  const items=migrateRoutine([{id:'a',text:'A',done:true},{id:'b',text:'B',done:false},{id:'c',text:'C'}],today);
  assert.equal(items[0].doneOn,today);assert.equal(items[1].doneOn,undefined);assert.equal(items[2].doneOn,undefined);
  assert.ok(items.every(item=>!('done' in item)));
  assert.equal(migrateRoutine(items,'2026-10-09')[0].doneOn,today);
});
test('yesterday is incomplete today; matching saved sessions tick only their linked item',()=>{
  const items=[{id:'a',text:'A',ref:'scale-set:a',doneOn:'2026-10-07'},{id:'b',text:'B',ref:'b'}];
  assert.notEqual(routineForDay(items,[],today)[0].doneOn,today);
  const session={itemId:'scale-set:a',endedAt:new Date(2026,9,8,12).toISOString()};
  const result=routineForDay(items,[session],today);
  assert.equal(result[0].doneOn,today);assert.equal(result[1].doneOn,undefined);
  assert.notEqual(routineForDay(items,[{...session,endedAt:new Date(2026,9,7,23).toISOString()}],today)[0].doneOn,today);
});
test('practice date uses the local calendar',()=>{assert.equal(practiceDay(new Date(2026,9,8,0,1).getTime()),today)});
test('one session ticks one step, even when two steps share a name and a link',()=>{
  const items=[{id:'a',text:'Long tones',ref:'long-tones'},{id:'b',text:'Long tones',ref:'long-tones'}];
  const session={itemId:'long-tones',endedAt:new Date(2026,9,8,12).toISOString()};
  const once=routineForDay(items,[session],today);
  assert.equal(once[0].doneOn,today);assert.equal(once[1].doneOn,undefined);
  const twice=routineForDay(items,[session,{...session}],today);
  assert.ok(twice.every(item=>item.doneOn===today));
});
