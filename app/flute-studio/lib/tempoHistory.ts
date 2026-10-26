"use client";

import {useSyncExternalStore} from "react";
import {repDay,type RepItem} from "./repLog";

/**
 * How fast you play each thing, day by day, so a few weeks of practice show up as a line going up. Nothing to fill in:
 * a day is written when real practice happens at a tempo (a counted rep in a RepPill, or playback or the click track
 * running on a piece for PLAYED_ENOUGH seconds), and only its highest tempo is kept, so one entry per thing per day.
 *
 * {"excerpt:beethoven-leonore-3:m328": {title, kind, days: {"2026-10-08": 92, "2026-10-15": 100}}}
 *
 * Keys are the RepPill keys (scale:…, excerpt:…, tricky:…, passage:…) plus piece:<id> for the reader, so a tally and
 * playback on the same thing land on one line. Transfer (lib/transfer.ts) merges it day by day, keeping the higher tempo.
 */
export const TEMPO_HISTORY_KEY="cookie:tempo-history:v1";
const CHANGED="cookie:tempo-history";
/** Playback shorter than this is a listen-through or a tap on a bar, not practice. */
export const PLAYED_ENOUGH=30;
export type TempoLine={title:string;kind?:RepItem["kind"];days:Record<string,number>};
type History=Record<string,TempoLine>;

function read():History{try{const value=JSON.parse(localStorage.getItem(TEMPO_HISTORY_KEY)||"{}");return value&&typeof value==="object"&&!Array.isArray(value)?value:{}}catch{return {}}}

/** Today's tempo for this thing, if it beats what today already has. */
export function recordTempo(item:RepItem,tempo:number,day=repDay()){
  const bpm=Math.round(tempo);if(!item.key||!Number.isFinite(bpm)||bpm<=0)return;
  const history=read(),line=history[item.key]??{title:item.title,kind:item.kind,days:{}};
  if((line.days[day]??0)>=bpm&&line.title===item.title)return;
  history[item.key]={title:item.title||line.title,kind:item.kind??line.kind,days:{...line.days,[day]:Math.max(line.days[day]??0,bpm)}};
  try{localStorage.setItem(TEMPO_HISTORY_KEY,JSON.stringify(history))}catch{/* storage may be disabled */}
  window.dispatchEvent(new Event(CHANGED));
}

const subscribe=(onChange:()=>void)=>{
  window.addEventListener(CHANGED,onChange);window.addEventListener("storage",onChange);
  return()=>{window.removeEventListener(CHANGED,onChange);window.removeEventListener("storage",onChange)};
};
const snapshot=()=>{try{return localStorage.getItem(TEMPO_HISTORY_KEY)??""}catch{return ""}};
/** The whole history, live. Empty on the server and the first paint. */
export function useTempoHistory():History{
  const raw=useSyncExternalStore(subscribe,snapshot,()=>"");
  try{const value=raw?JSON.parse(raw):{};return value&&typeof value==="object"?value:{}}catch{return {}}
}

export type TempoPoint={day:string;bpm:number};
/** A line's days in order. */
export function tempoPoints(line:TempoLine|undefined):TempoPoint[]{
  return Object.entries(line?.days??{}).filter(([,bpm])=>Number(bpm)>0).map(([day,bpm])=>({day,bpm:Number(bpm)})).sort((a,b)=>a.day.localeCompare(b.day));
}
/** Worth a line: two days or more. */
export const hasTrend=(points:TempoPoint[])=>points.length>=2;

/**
 * What has got faster: lines spanning at least a week whose latest tempo is above the first, biggest gain (by share) first.
 * A slower latest day is left out rather than shown as a drop: tempos go down on purpose (slow practice), and this row
 * is there to notice progress, not to mark you down.
 */
export function gettingFaster(history:History){
  return Object.entries(history).map(([key,line])=>{
    const points=tempoPoints(line),first=points[0],last=points.at(-1);
    return {key,title:line.title,kind:line.kind,points,from:first?.bpm??0,to:last?.bpm??0,since:first?.day??""};
  }).filter(row=>row.points.length>=2&&daysBetween(row.since,row.points.at(-1)!.day)>=7&&row.to>row.from)
    .sort((a,b)=>b.to/b.from-a.to/a.from);
}

export function daysBetween(from:string,to:string){
  const at=(day:string)=>{const [y,m,d]=day.split("-").map(Number);return new Date(y,m-1,d).getTime()};
  return Math.round((at(to)-at(from))/86400000);
}
