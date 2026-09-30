import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {encryptLibrary} from '../tools/private-music.mjs';
import {installGhostNoteFix} from '../app/flute-studio/lib/ghostNoteFix.js';
async function decrypt(envelope,code){
 const raw=await webcrypto.subtle.importKey('raw',Buffer.from(code),'PBKDF2',false,['deriveKey']);
 const key=await webcrypto.subtle.deriveKey({name:'PBKDF2',salt:Buffer.from(envelope.salt,'base64'),iterations:envelope.iterations,hash:'SHA-256'},raw,{name:'AES-GCM',length:256},false,['decrypt']);
 return JSON.parse(Buffer.from(await webcrypto.subtle.decrypt({name:'AES-GCM',iv:Buffer.from(envelope.iv,'base64')},key,Buffer.from(envelope.data,'base64'))).toString());
}
test('private scores and titles require the correct code; tampering fails',async()=>{
 const source=[{item:{title:'Personal score'},files:{score:{data:'secret XML'}}}];
 const a=await encryptLibrary(source,'test-only-long-code'),b=await encryptLibrary(source,'test-only-long-code');
 assert.ok(!JSON.stringify(a).includes('Personal score'));assert.notEqual(a.data,b.data);
 assert.deepEqual(await decrypt(a,'test-only-long-code'),source);
 await assert.rejects(decrypt(a,'wrong-code'));
 const data=Buffer.from(a.data,'base64');data[0]^=1;await assert.rejects(decrypt({...a,data:data.toString('base64')},'test-only-long-code'));
});
test('tiny ghost spacers get a shape while keeping their exact duration; real notes unchanged',()=>{
 const converter={durations:f=>f.RealValue>.0001?['q']:[],GhostNotes(f){const shape=this.durations(f)[0];if(!shape)throw Error('Invalid note');return [{shape,ticks:f.RealValue}]}};
 const original=converter.durations;installGhostNoteFix(converter);installGhostNoteFix(converter);
 assert.deepEqual(converter.GhostNotes({RealValue:1/13440}),[{shape:'128',ticks:1/13440}]);
 assert.deepEqual(converter.GhostNotes({RealValue:.25}),[{shape:'q',ticks:.25}]);
 assert.equal(converter.durations,original);assert.deepEqual(converter.durations({RealValue:1/13440}),[]);
});
