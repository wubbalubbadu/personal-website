"use client";

import {useSyncExternalStore} from "react";
import type {MusicItem} from "../../../content/music-library";

/**
 * Mock auditions: the studio picks a few excerpts from a deadline at random and you play them back to back, the way
 * a panel would ask for them. A run keeps only what happened: which excerpts, in what order, how long each took,
 * and a line you may write to yourself afterwards. No scores or ratings.
 *
 * Stored as a list of records so the transfer merge (lib/transfer.ts) matches them by id and keeps the newer copy.
 * `at` is the last edit and stays the first time field (transfer reads `at` before `startedAt`). A deleted run stays
 * as a tombstone so an older transfer code cannot bring it back.
 */
export type MockExcerpt={/** Library id. */piece:string;/** Excerpt passage id, when the piece has several. */passage?:string;
  /** Seconds it was on the stand, once you moved on. */seconds?:number;/** One line to yourself, written at the end. */note?:string};
export type MockRun={id:string;at:number;deadlineId:string;deadlineName:string;startedAt:number;endedAt?:number;
  /** Seconds of breathing room between excerpts (0: straight on). */pause:number;items:MockExcerpt[];deleted?:boolean};

export const MOCK_RUNS_KEY="cookie:practice-mock-runs:v1";
const CHANGED="cookie:practice-mock-runs";

function read():MockRun[]{
  try{const value=JSON.parse(localStorage.getItem(MOCK_RUNS_KEY)||"[]");return Array.isArray(value)?value.filter(item=>item&&typeof item.id==="string"&&Array.isArray(item.items)):[]}catch{return []}
}
function write(all:MockRun[]){
  try{localStorage.setItem(MOCK_RUNS_KEY,JSON.stringify(all))}catch{/* storage may be disabled */}
  window.dispatchEvent(new Event(CHANGED));
}

/** Create or replace a run. Always strictly newer than the copy it replaces, so the transfer merge keeps it. */
export function saveMockRun(next:Omit<MockRun,"at">){
  const all=read(),before=all.find(item=>item.id===next.id);
  const record:MockRun={...next,at:Math.max(Date.now(),(before?.at??0)+1)};
  write(before?all.map(item=>item.id===next.id?record:item):[...all,record]);
  return record;
}
export function deleteMockRun(id:string){
  write(read().map(item=>item.id===id?{...item,at:Math.max(Date.now(),item.at+1),items:[],deleted:true}:item));
}

const subscribe=(onChange:()=>void)=>{
  window.addEventListener(CHANGED,onChange);window.addEventListener("storage",onChange);
  return()=>{window.removeEventListener(CHANGED,onChange);window.removeEventListener("storage",onChange)};
};
const snapshot=()=>{try{return localStorage.getItem(MOCK_RUNS_KEY)??""}catch{return ""}};

/** Live runs, newest first. Empty on the server and the first render. */
export function useMockRuns():MockRun[]{
  const raw=useSyncExternalStore(subscribe,snapshot,()=>"");
  if(!raw)return [];
  return read().filter(item=>!item.deleted).sort((a,b)=>b.startedAt-a.startedAt);
}

/**
 * What a deadline can ask for: each passage of an excerpt counts on its own (a panel asks for "Daphnis, Daybreak",
 * not "Daphnis"); any other piece with a score counts once. Pieces with nothing to read are left out.
 */
export function mockPool(pieces:string[],library:MusicItem[]):MockExcerpt[]{
  return pieces.flatMap(id=>{
    const item=library.find(entry=>entry.id===id);
    if(!item)return [];
    if(item.excerpt)return item.excerpt.passages?.length?item.excerpt.passages.map(passage=>({piece:id,passage:passage.id})):[{piece:id}];
    return item.scorePath?[{piece:id}]:[];
  });
}

/** `count` of the pool in a fresh random order, none twice (Fisher-Yates, then the first few). */
export function drawExcerpts(pool:MockExcerpt[],count:number,random=Math.random):MockExcerpt[]{
  const order=[...pool];
  for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]]}
  return order.slice(0,Math.max(1,Math.min(count,order.length))).map(({piece,passage})=>passage?{piece,passage}:{piece});
}

/** "1:05", or "12 s" under a minute. */
export function runClock(seconds:number,zh:boolean){
  const whole=Math.max(0,Math.round(seconds));
  if(whole<60)return zh?`${whole} 秒`:`${whole} s`;
  return `${Math.floor(whole/60)}:${String(whole%60).padStart(2,"0")}`;
}
