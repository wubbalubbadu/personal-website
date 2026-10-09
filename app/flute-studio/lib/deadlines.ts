"use client";

import {useSyncExternalStore} from "react";
import {setStatus,type MusicStatus} from "./musicStatus";

/**
 * Deadlines: an audition, a lesson, a concert. A name, a day, and the pieces you
 * need for it. A piece can be on several deadlines at once; it is still one piece.
 * Putting a piece on a deadline also puts it in Working on (over Learned, since
 * preparing it means it is active again). Taking it out of Working on later does
 * not take it off the deadline.
 *
 * Stored as a list of records so the transfer merge (lib/transfer.ts) can match
 * them by id. `at` is the last edit and must stay the first time field: transfer
 * reads `at` before `date`, and `date` here is the deadline day, not an edit.
 * A deleted deadline stays as a tombstone so an older transfer code cannot bring it back.
 */
export type Deadline={id:string;at:number;name:string;
  /** The day, as a local "YYYY-MM-DD". */date:string;
  /** Library ids, in your order. */pieces:string[];deleted?:boolean};

export const DEADLINES_KEY="cookie:practice-deadlines:v1";
const CHANGED="cookie:practice-deadlines";

function read():Deadline[]{
  try{const value=JSON.parse(localStorage.getItem(DEADLINES_KEY)||"[]");return Array.isArray(value)?value.filter(item=>item&&typeof item.id==="string"):[]}catch{return []}
}
function write(all:Deadline[]){
  try{localStorage.setItem(DEADLINES_KEY,JSON.stringify(all))}catch{/* storage may be disabled */}
  window.dispatchEvent(new Event(CHANGED));
}

/** Today as a local "YYYY-MM-DD" (not UTC: a deadline is a day where you live). */
export function localDay(time=Date.now()){
  const day=new Date(time);
  return `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,"0")}-${String(day.getDate()).padStart(2,"0")}`;
}
/** Whole days from today to the deadline: 0 is today, negative is past. */
export function daysUntil(date:string,now=Date.now()){
  const [y,m,d]=date.split("-").map(Number),today=new Date(now);
  return Math.round((new Date(y,m-1,d).getTime()-new Date(today.getFullYear(),today.getMonth(),today.getDate()).getTime())/86400000);
}

/** Create or update. Pieces new to this deadline go into Working on. */
export function saveDeadline(next:Omit<Deadline,"at">,statuses:Record<string,MusicStatus>){
  const all=read(),before=all.find(item=>item.id===next.id);
  // Strictly newer than the copy it replaces, even within one millisecond, so the transfer merge keeps it.
  const record:Deadline={...next,at:Math.max(Date.now(),(before?.at??0)+1)};
  write(before?all.map(item=>item.id===next.id?record:item):[...all,record]);
  for(const id of next.pieces)if(!before?.pieces.includes(id)&&statuses[id]!=="working")setStatus(id,"working");
}
export function deleteDeadline(id:string){
  write(read().map(item=>item.id===id?{id,at:Math.max(Date.now(),item.at+1),name:item.name,date:item.date,pieces:[],deleted:true}:item));
}

const subscribe=(onChange:()=>void)=>{
  window.addEventListener(CHANGED,onChange);window.addEventListener("storage",onChange);
  return()=>{window.removeEventListener(CHANGED,onChange);window.removeEventListener("storage",onChange)};
};
const snapshot=()=>{try{return localStorage.getItem(DEADLINES_KEY)??""}catch{return ""}};

/** Live deadlines, soonest first. Empty on the server and the first render. */
export function useDeadlines():Deadline[]{
  const raw=useSyncExternalStore(subscribe,snapshot,()=>"");
  if(!raw)return [];
  return read().filter(item=>!item.deleted).sort((a,b)=>a.date.localeCompare(b.date));
}
