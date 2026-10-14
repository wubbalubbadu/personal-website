import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

test('microphone lifecycle restores playback only after the final stream closes',async()=>{
  const original=Object.getOwnPropertyDescriptor(globalThis,'navigator');
  const originalWindow=globalThis.window;
  const session={type:'auto'};
  let resolve;
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{audioSession:session,mediaDevices:{getUserMedia:()=>new Promise(r=>{resolve=r})}}});
  globalThis.window=new EventTarget();
  try{
    const source=fs.readFileSync('app/flute-studio/lib/audioSession.ts','utf8');
    const code=ts.transpile(source,{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022});
    const api=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
    let resets=0;
    window.addEventListener(api.MIC_CLOSED,()=>resets++);
    const make=()=>{
      const track=new EventTarget();
      track.readyState='live';
      track.stop=()=>{track.readyState='ended'};
      return {getTracks:()=>[track],getAudioTracks:()=>[track]};
    };
    const a=make(),b=make();
    const first=api.openMic();
    api.preferPlayback();
    assert.equal(session.type,'play-and-record','pending permission must preserve recording mode');
    resolve(a);await first;
    const second=api.openMic();resolve(b);await second;
    api.closeMic(a);
    assert.equal(session.type,'play-and-record');
    api.closeMic(b);
    assert.equal(session.type,'playback');
    assert.equal(resets,1);
    api.closeMic(b);
    assert.equal(resets,1,'repeat cleanup must not reset the audio engine again');
    const ended=make();
    const third=api.openMic();resolve(ended);await third;
    ended.getTracks()[0].stop();
    ended.getTracks()[0].dispatchEvent(new Event('ended'));
    assert.equal(session.type,'playback');
    assert.equal(resets,2);
    navigator.mediaDevices.getUserMedia=async()=>{throw new Error('denied')};
    await assert.rejects(api.openMic());
    assert.equal(session.type,'playback');
  }finally{
    if(original)Object.defineProperty(globalThis,'navigator',original);else delete globalThis.navigator;
    if(originalWindow===undefined)delete globalThis.window;else globalThis.window=originalWindow;
  }
});
