'use client';
import {useEffect,useSyncExternalStore} from 'react';
import type {MusicItem} from '../../../content/music-library';
const KEY='cookie:private-music-code';
type Snapshot={items:MusicItem[];unlocked:boolean;loading:boolean;error:string};
const empty:Snapshot={items:[],unlocked:false,loading:false,error:''};
let state=empty,generation=0;
const listeners=new Set<()=>void>(),urls:string[]=[];
function publish(next:Snapshot){state=next;listeners.forEach(fn=>fn())}
function subscribe(fn:()=>void){listeners.add(fn);return ()=>{listeners.delete(fn)}}
const bytes=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
export async function unlockPrivateMusic(code:string){
 const token=++generation;publish({...state,loading:true,error:''});
 try{
  if(!code.trim())throw new Error('code');
  const response=await fetch('/private-music/library.enc.json',{cache:'no-store'});if(!response.ok)throw new Error('missing');
  const envelope=await response.json();
  if(envelope.version!==1||envelope.iterations!==210000)throw new Error('format');
  const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(code.trim()),'PBKDF2',false,['deriveKey']);
  const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:bytes(envelope.salt),iterations:210000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['decrypt']);
  const data=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(envelope.iv)},key,bytes(envelope.data));
  const entries:{item:MusicItem;files:Record<string,{data:string;type:string}>}[]=JSON.parse(new TextDecoder().decode(data));
  if(token!==generation)return false;
  urls.splice(0).forEach(url=>URL.revokeObjectURL(url));
  const items=entries.map(({item,files})=>{
   const paths:Record<string,string>={};
   for(const [path,file] of Object.entries(files)){const url=URL.createObjectURL(new Blob([bytes(file.data)],{type:file.type}));urls.push(url);paths[path]=url}
   return {...item,scorePath:item.scorePath?paths[item.scorePath]??null:null,fullScorePath:item.fullScorePath?paths[item.fullScorePath]:undefined,pdfPath:item.pdfPath?paths[item.pdfPath]:undefined};
  });
  try{localStorage.setItem(KEY,code.trim());sessionStorage.removeItem(KEY)}catch{/* Unlock still works for this visit. */}
  publish({items,unlocked:true,loading:false,error:''});return true;
 }catch{
  if(token===generation)publish({...state,loading:false,error:'unlock'});return false;
 }
}
export function lockPrivateMusic(){generation++;try{localStorage.removeItem(KEY);sessionStorage.removeItem(KEY)}catch{/* Optional storage. */}urls.splice(0).forEach(url=>URL.revokeObjectURL(url));publish(empty)}
export function usePrivateMusic(){
 const snapshot=useSyncExternalStore(subscribe,()=>state,()=>empty);
 useEffect(()=>{if(state.unlocked||state.loading)return;try{const code=localStorage.getItem(KEY)??sessionStorage.getItem(KEY);if(code)void unlockPrivateMusic(code)}catch{/* No automatic restore. */}},[]);
 return snapshot;
}
