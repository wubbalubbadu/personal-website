import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=ts.transpileModule(readFileSync(new URL('../app/flute-studio/components/clickSounds.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText.replace(/import .* from "\.\.\/lib\/toolSounds";/,'const getToolSounds=()=>({click:"voice",accent:"higher",clickVolume:.8,accentVolume:.8});');
const {prepareClickSounds,bookSound}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
test('all twelve spoken counts load once and fast counts fit between beats',async()=>{
 const original=globalThis.fetch,urls=[];
 globalThis.fetch=async url=>{urls.push(url);const bytes=readFileSync(new URL(`../public${url}`,import.meta.url));assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.ok(bytes.length>1000);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(4)}};
 const audio={sampleRate:22050,destination:{},decodeAudioData:async()=>({duration:.4,sampleRate:22050,getChannelData:()=>new Float32Array(8820).fill(.25)}),createBuffer:(_,n,rate)=>({duration:n/rate,getChannelData:()=>new Float32Array(n)}),createBufferSource:()=>({playbackRate:{value:1},connect(){return this},disconnect(){},start(at){this.at=at}}),createGain:()=>({gain:{value:0},connect(){return this},disconnect(){}})};
 try{
 assert.equal(await prepareClickSounds(audio),true);assert.equal(urls.length,12);
 assert.equal(await prepareClickSounds(audio),false);assert.equal(urls.length,12);
 const source=bookSound(audio,1,'normal',12,.2);assert.ok(source.playbackRate.value>2);assert.equal(source.at,1);
 }finally{globalThis.fetch=original}
});
