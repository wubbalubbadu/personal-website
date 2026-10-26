import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {DEFAULT_SETUP} from '../app/flute-studio/lib/metronomeSetup.ts';
const path=new URL('../app/flute-studio/lib/toolMetronomeScheduler.ts',import.meta.url);
const source=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText.replace('"./metronomeSetup"',JSON.stringify(new URL('../app/flute-studio/lib/metronomeSetup.ts',import.meta.url).href));
const {createToolMetronomeScheduler}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
function fixture(extra={}){
 const audio={currentTime:0},config={setup:structuredClone(DEFAULT_SETUP),beats:4,accent:true,bpm:60,...extra},sounds=[];
 const scheduler=createToolMetronomeScheduler(audio,()=>config,(event,time)=>{
  const node={event,time,stopped:false,stop(){this.stopped=true},addEventListener(){}};sounds.push(node);return node;
 });scheduler.start();return {audio,config,sounds,scheduler};
}
test('subdivision changes replace future clicks within the current bar',()=>{
 const f=fixture();f.audio.currentTime=.3;const old=f.sounds.find(n=>n.time>1);
 f.config.setup={...f.config.setup,sub:2};f.scheduler.reconfigure();
 assert.equal(old.stopped,true);
 assert.ok(f.sounds.some(n=>!n.stopped&&n.event.kind==='tick'&&Math.abs(n.time-.56)<.001));
 assert.equal(f.scheduler.bars[0].start,.06);
});
test('meter changes start the new meter immediately, not after the old loop',()=>{
 const f=fixture();f.audio.currentTime=.4;f.config.setup={...f.config.setup,meter:'2/2',note:'half'};f.scheduler.reconfigure();
 assert.ok(Math.abs(f.scheduler.bars[0].start-.44)<.001);
 assert.equal(f.scheduler.bars[0].bar.clickAt.length,2);
 assert.ok(f.sounds.filter(n=>n.time>1&&n.time<1.1).every(n=>n.stopped));
});
test('tempo changes move the next beat without restarting the audible beat',()=>{
 const f=fixture();f.audio.currentTime=.3;f.config.bpm=120;f.scheduler.retime();
 assert.ok(f.sounds.some(n=>!n.stopped&&Math.abs(n.time-.56)<.001));
 assert.equal(f.sounds.filter(n=>!n.stopped&&n.time<.3).length,1);
});
test('fast short bars retain the audible bar for live edits',()=>{
 const f=fixture({beats:2,bpm:250,setup:{...structuredClone(DEFAULT_SETUP),note:'half'}});
 assert.equal(f.scheduler.bars[0].start,.06);
 f.audio.currentTime=.1;f.config.accent=false;f.scheduler.reconfigure();
 assert.equal(f.scheduler.bars[0].start,.06);
 f.scheduler.dispose();assert.ok(f.sounds.every(n=>n.stopped));assert.equal(f.scheduler.bars.length,0);
});
test('retiming a silent training bar preserves its place in the routine',()=>{
 const setup={...structuredClone(DEFAULT_SETUP),pulse:{mode:'ghost',play:1,rest:1,grow:false,gaps:1}};
 const f=fixture({beats:2,bpm:120,setup});f.audio.currentTime=1.2;f.scheduler.schedule();f.config.bpm=60;f.scheduler.retime();
 assert.equal(f.scheduler.bars[0].bar.pulse.index,1);
 assert.equal(f.scheduler.bars[0].bar.events.length,0);
});
