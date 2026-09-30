import {randomBytes,webcrypto} from 'node:crypto';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
export const ITERATIONS=210000;
export async function encryptLibrary(value,code){
 const salt=randomBytes(16),iv=randomBytes(12);
 const material=await webcrypto.subtle.importKey('raw',Buffer.from(code),'PBKDF2',false,['deriveKey']);
 const key=await webcrypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:ITERATIONS,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt']);
 const data=await webcrypto.subtle.encrypt({name:'AES-GCM',iv},key,Buffer.from(JSON.stringify(value)));
 return {version:1,iterations:ITERATIONS,salt:salt.toString('base64'),iv:iv.toString('base64'),data:Buffer.from(data).toString('base64')};
}
export function privateStore(root){
 const dir=path.join(root,'.private-music'),local=path.join(dir,'library.json'),codeFile=path.join(dir,'access-code.txt'),output=path.join(root,'public/private-music/library.enc.json');
 async function read(){try{return JSON.parse(await readFile(local,'utf8'))}catch(error){if(error.code==='ENOENT')return [];throw error}}
 async function code(){await mkdir(dir,{recursive:true});try{return (await readFile(codeFile,'utf8')).trim()}catch(error){if(error.code!=='ENOENT')throw error;const value=randomBytes(18).toString('base64url');await writeFile(codeFile,value+'\n',{mode:0o600,flag:'wx'});return value}}
 async function save(entries){
  const encrypted=await encryptLibrary(entries,await code());await mkdir(path.dirname(output),{recursive:true});
  await writeFile(local+'.tmp',JSON.stringify(entries,null,2)+'\n',{mode:0o600});
  await writeFile(output+'.tmp',JSON.stringify(encrypted));
  await rename(local+'.tmp',local);await rename(output+'.tmp',output);
 }
 return {read,code,save,codeFile};
}
