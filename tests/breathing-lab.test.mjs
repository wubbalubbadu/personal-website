import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=fs.readFileSync(new URL('../app/flute-studio/breathing/timing.ts',import.meta.url),'utf8');
const {breathAt,counts}=await import('data:text/javascript;base64,'+Buffer.from(ts.transpile(source,{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022})).toString('base64'));
const base={pattern:'even',inhale:8,exhale:8,hold:0};
test('phase boundaries and half-way progress follow beats',()=>{assert.equal(breathAt(4,base).progress,.5);assert.equal(breathAt(8,base).phase,'Exhale');assert.equal(breathAt(16,base).phase,'Inhale');assert.equal(breathAt(16,base).round,1)});
test('hold and fractional phases remain explicit',()=>{const s={...base,inhale:.5,hold:1,exhale:7.5};assert.equal(breathAt(.5,s).phase,'Hold');assert.equal(breathAt(1.5,s).phase,'Exhale');assert.equal(breathAt(9,s).round,1)});
test('ratio preserves total and expanding patterns advance every round',()=>{for(let n=0;n<8;n++){const c=counts({...base,pattern:'ratio'},n);assert.equal(c.inhale+c.exhale,16);assert.ok(c.inhale>=.5)}assert.equal(counts({...base,pattern:'expand'},1).inhale,9);assert.equal(counts({...base,pattern:'expand'},8).inhale,8)});

test("sequence advances once and loops",()=>{const s={...base,pattern:"refill"};assert.equal(breathAt(16,s).inhale,7);const duration=Array.from({length:8},(_,i)=>{const c=counts(s,i);return c.inhale+c.exhale}).reduce((a,b)=>a+b,0);assert.equal(breathAt(duration,s).inhale,8)});
