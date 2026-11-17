"use client";

import {useSyncExternalStore} from "react";
import {bumpTally} from "./tallyLog";
import {recordTempo} from "./tempoHistory";

/**
 * Every repetition you count, by day: {"2026-10-08": {"scale:c-major-thirds": {title, reps: {"72": 3}}}}.
 * Skills (Scale Studio, the metronome) show TODAY's count, so a routine starts from zero each morning; tricky bits
 * keep their own running total (lib/trickyBits.ts) and also log here. The day report and the all-time "most
 * practised" list on My Studio both read this. Kept under cookie:practice- so device transfer carries it.
 */
export const REP_LOG_KEY="cookie:practice-reps:v1";
const CHANGED="cookie:practice-reps";
export type RepItem={key:string;title:string;kind?:"scale"|"tricky-bit"|"exercise"|"piece"};
type DayEntry=Record<string,{title:string;kind?:RepItem["kind"];reps:Record<string,number>}>;
type Log=Record<string,DayEntry>;

/** Today as a local "YYYY-MM-DD". */
export function repDay(time=Date.now()){
  const day=new Date(time);
  return `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,"0")}-${String(day.getDate()).padStart(2,"0")}`;
}
function read():Log{try{const value=JSON.parse(localStorage.getItem(REP_LOG_KEY)||"{}");return value&&typeof value==="object"&&!Array.isArray(value)?value:{}}catch{return {}}}

/** Count one more (or one less) at a tempo, on today's page of the log. */
export function logRep(item:RepItem,tempo:number,delta:number,day=repDay()){
  const log=read(),page={...(log[day]??{})},entry=page[item.key]??{title:item.title,kind:item.kind,reps:{}};
  const at=String(Math.round(tempo)),reps={...entry.reps,[at]:bumpTally(entry.reps[at]??0,delta)};
  page[item.key]={title:item.title,kind:item.kind??entry.kind,reps};log[day]=page;
  try{localStorage.setItem(REP_LOG_KEY,JSON.stringify(log))}catch{/* storage may be disabled */}
  window.dispatchEvent(new Event(CHANGED));
  // A counted rep is practice at that tempo: it goes on the tempo-over-weeks line too.
  if(delta>0)recordTempo(item,tempo,day);
}

const subscribe=(onChange:()=>void)=>{
  window.addEventListener(CHANGED,onChange);window.addEventListener("storage",onChange);
  return()=>{window.removeEventListener(CHANGED,onChange);window.removeEventListener("storage",onChange)};
};
const snapshot=()=>{try{return localStorage.getItem(REP_LOG_KEY)??""}catch{return ""}};
/** The whole log, live. Empty on the server and the first paint. */
export function useRepLog():Log{
  const raw=useSyncExternalStore(subscribe,snapshot,()=>"");
  try{const value=raw?JSON.parse(raw):{};return value&&typeof value==="object"?value:{}}catch{return {}}
}

const sum=(reps:Record<string,number>)=>Object.values(reps).reduce((total,count)=>total+(Number(count)||0),0);
/** One day's reps, most first: what you did and at which tempos. */
export function repsOnDay(log:Log,day:string){
  return Object.entries(log[day]??{}).map(([key,entry])=>({key,title:entry.title,kind:entry.kind,reps:entry.reps,total:sum(entry.reps)}))
    .filter(row=>row.total>0).sort((a,b)=>b.total-a.total);
}
/** Every day added up, most practised first (My Studio's "most practised"). */
export function repTotals(log:Log){
  const totals=new Map<string,{key:string;title:string;kind?:RepItem["kind"];total:number}>();
  for(const page of Object.values(log))for(const [key,entry] of Object.entries(page??{})){
    const row=totals.get(key)??{key,title:entry.title,kind:entry.kind,total:0};
    row.total+=sum(entry.reps??{});row.title=entry.title||row.title;totals.set(key,row);
  }
  return [...totals.values()].filter(row=>row.total>0).sort((a,b)=>b.total-a.total);
}
/**
 * What a total adds up. A scale is one thing however it was played: one octave, full range or a custom range, in
 * groups or not, all count toward the same total ("scale-book:major:thirds-in3:C:full" -> "scale-book:major:thirds:C").
 * Decided Nov 14. Anything else totals by its own key.
 */
export function totalGroup(key:string){
  const parts=key.split(":");
  if(parts[0]!=="scale-book"||parts.length<4)return key;
  return ["scale-book",parts[1],parts[2].replace(/-in\d+$/,""),parts[3]].join(":");
}
/** One thing's reps, every day, tempo, range and grouping added up (the total beside a scale's tally). */
export function repTotal(log:Log,key:string){
  const group=totalGroup(key);let total=0;
  for(const page of Object.values(log))for(const [entryKey,entry] of Object.entries(page??{}))if(totalGroup(entryKey)===group)total+=sum(entry?.reps??{});
  return total;
}
