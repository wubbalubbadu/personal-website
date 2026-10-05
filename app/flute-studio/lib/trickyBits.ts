"use client";

import {useSyncExternalStore} from "react";
import {bumpTally} from "./tallyLog";

/**
 * Tricky bits: short passages you saved from a piece to drill. Each is a
 * range of bars (stored as measure POSITIONS, which is how the reader counts,
 * and a label with the PRINTED numbers, which is what you read), the tempos
 * you have practised it at, an optional goal tempo, and how big a step the
 * "+" chip adds. Repetition tallies live under their own key so counting a
 * rep never rewrites the bits.
 */
export type TrickyBit={
  id:string;pieceId:string;from:number;to:number;
  /** Printed bar numbers, e.g. "40–46". */
  label:string;addedAt:number;
  /** Tempos you have worked at, in the order added (no duplicates). */
  tempos:number[];goal?:number;step?:number;
};

export const BITS_KEY="cookie:tricky-bits:v1",TALLIES_KEY="cookie:tricky-bits:tallies:v1",CHANGED="cookie:tricky-bits";
export const DEFAULT_STEP=4;

const readJson=<T,>(key:string,fallback:T):T=>{try{const value=JSON.parse(localStorage.getItem(key)||"null");return value??fallback}catch{return fallback}};
const write=(key:string,value:unknown)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{/* storage may be disabled */}window.dispatchEvent(new Event(CHANGED))};

export const readBits=():TrickyBit[]=>{const list=readJson<unknown>(BITS_KEY,[]);return Array.isArray(list)?(list as TrickyBit[]).filter(bit=>bit&&typeof bit.id==="string"&&typeof bit.pieceId==="string"):[]};
export const readTallies=():Record<string,number>=>{const map=readJson<unknown>(TALLIES_KEY,{});return map&&typeof map==="object"&&!Array.isArray(map)?map as Record<string,number>:{}};

export const bitId=(pieceId:string,from:number,to:number)=>`${pieceId}:${from}-${to}`;
export const findBit=(pieceId:string,from:number,to:number)=>readBits().find(bit=>bit.id===bitId(pieceId,from,to));

/** Saves a range; saving the same range again keeps the original (and its history). The first tempo is the one on the metronome now. */
export function addBit(input:{pieceId:string;from:number;to:number;label:string;tempo?:number}){
  const id=bitId(input.pieceId,input.from,input.to),all=readBits();
  if(all.some(bit=>bit.id===id))return all.find(bit=>bit.id===id)!;
  const bit:TrickyBit={id,pieceId:input.pieceId,from:input.from,to:input.to,label:input.label,addedAt:Date.now(),tempos:input.tempo&&input.tempo>0?[Math.round(input.tempo)]:[]};
  write(BITS_KEY,[...all,bit]);return bit;
}
export function updateBit(id:string,change:(bit:TrickyBit)=>TrickyBit){
  write(BITS_KEY,readBits().map(bit=>bit.id===id?change(bit):bit));
}
export function removeBit(id:string){
  write(BITS_KEY,readBits().filter(bit=>bit.id!==id));
  const tallies=readTallies();if(id in tallies){delete tallies[id];write(TALLIES_KEY,tallies)}
}
/** Moves a bit to new bars: it keeps its tempos, goal and tally under the new id. If that range is already saved, the two merge into it. */
export function moveBit(id:string,range:{from:number;to:number;label:string}){
  const all=readBits(),bit=all.find(entry=>entry.id===id);if(!bit)return;
  const nextId=bitId(bit.pieceId,range.from,range.to);if(nextId===id){updateBit(id,entry=>({...entry,label:range.label}));return}
  const moved:TrickyBit={...bit,id:nextId,from:range.from,to:range.to,label:range.label};
  const target=all.find(entry=>entry.id===nextId);
  const merged=target?{...target,tempos:[...new Set([...target.tempos,...moved.tempos])].sort((a,b)=>a-b),goal:target.goal??moved.goal}:moved;
  write(BITS_KEY,[...all.filter(entry=>entry.id!==id&&entry.id!==nextId),merged]);
  const tallies=readTallies();tallies[nextId]=(tallies[nextId]??0)+(tallies[id]??0);delete tallies[id];write(TALLIES_KEY,tallies);
}

export const addTempo=(id:string,tempo:number)=>updateBit(id,bit=>bit.tempos.includes(tempo)||tempo<20||tempo>300?bit:{...bit,tempos:[...bit.tempos,tempo]});
export const removeTempo=(id:string,tempo:number)=>updateBit(id,bit=>({...bit,tempos:bit.tempos.filter(value=>value!==tempo)}));
export const setGoal=(id:string,goal:number|undefined)=>updateBit(id,bit=>({...bit,goal:goal&&goal>0?Math.round(goal):undefined}));
export const setStep=(id:string,step:number)=>updateBit(id,bit=>({...bit,step:Math.max(1,Math.round(step))}));
export function bumpBitTally(id:string,delta:number){
  const tallies=readTallies();tallies[id]=bumpTally(tallies[id]??0,delta);write(TALLIES_KEY,tallies);
}

const subscribe=(onChange:()=>void)=>{
  window.addEventListener(CHANGED,onChange);window.addEventListener("storage",onChange);
  return()=>{window.removeEventListener(CHANGED,onChange);window.removeEventListener("storage",onChange)};
};
const snapshot=()=>{try{return `${localStorage.getItem(BITS_KEY)??""}|${localStorage.getItem(TALLIES_KEY)??""}`}catch{return ""}};

/** The saved bits and tallies, live. Empty on the server and the first paint. */
export function useTrickyBits(){
  const raw=useSyncExternalStore(subscribe,snapshot,()=>"");
  const [bitsRaw,talliesRaw]=raw.split("|");
  const parse=<T,>(text:string|undefined,fallback:T):T=>{try{return text?JSON.parse(text)??fallback:fallback}catch{return fallback}};
  const list=parse<unknown>(bitsRaw,[]),map=parse<unknown>(talliesRaw,{});
  return {
    bits:Array.isArray(list)?(list as TrickyBit[]).filter(bit=>bit&&typeof bit.id==="string"):[],
    tallies:map&&typeof map==="object"&&!Array.isArray(map)?map as Record<string,number>:{},
  };
}
