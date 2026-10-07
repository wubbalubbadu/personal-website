"use client";

import {useEffect,useSyncExternalStore} from "react";

/**
 * Where a piece stands for you, Goodreads style: want to learn, working on,
 * learned. This is how the studio keeps things: there is no separate star.
 * One status per piece, book or exercise, set from the list button
 * (components/StatusButton) in the reader, a book page or a Library row.
 *
 * Stored as {id: {status, at}}; the time lets a list sort by most recent.
 */
export type MusicStatus="want"|"working"|"learned";
export const STATUSES:MusicStatus[]=["want","working","learned"];
export const STATUS_LABELS:Record<MusicStatus,{en:string;zh:string}>={
  want:{en:"Want to learn",zh:"想学"},
  working:{en:"Working on",zh:"正在练"},
  learned:{en:"Learned",zh:"已学会"},
};
/** Tints from components/tag-pill.css. */
export const STATUS_TONES:Record<MusicStatus,string>={want:"blue",working:"sand",learned:"sage"};

type Entry={status:MusicStatus|null;at:number};
const KEY="cookie:music-status:v1",UPDATED="cookie:music-status";

function read():Record<string,Entry>{
  try{const value=JSON.parse(localStorage.getItem(KEY)||"{}");return value&&typeof value==="object"?value:{}}catch{return {}}
}

export function setStatus(id:string,status:MusicStatus|null){
  const all=read();
  // Keep removal timestamps so older transfer codes cannot resurrect a status.
  all[id]={status,at:Date.now()};
  try{localStorage.setItem(KEY,JSON.stringify(all))}catch{/* storage may be disabled */}
  window.dispatchEvent(new Event(UPDATED));
}

const subscribe=(onChange:()=>void)=>{
  window.addEventListener(UPDATED,onChange);window.addEventListener("storage",onChange);
  return()=>{window.removeEventListener(UPDATED,onChange);window.removeEventListener("storage",onChange)};
};
const snapshot=()=>{try{return localStorage.getItem(KEY)??""}catch{return ""}};

export type StatusEntry={id:string;status:MusicStatus;at:number};

/**
 * The star used to keep "saved" pieces in cookie:music-favorites. Those
 * become Want to learn, once, so nothing saved before disappears. The old
 * key is left alone (a transfer code from an older device still carries it).
 */
const MIGRATED="cookie:music-status:from-favorites";
function migrateFavorites(){
  try{
    if(localStorage.getItem(MIGRATED))return;
    const favorites=JSON.parse(localStorage.getItem("cookie:music-favorites")||"[]");
    const all=read(),now=Date.now();
    if(Array.isArray(favorites))favorites.forEach((id,i)=>{if(typeof id==="string"&&!all[id])all[id]={status:"want",at:now-i}});
    localStorage.setItem(KEY,JSON.stringify(all));
    localStorage.setItem(MIGRATED,"1");
    window.dispatchEvent(new Event(UPDATED));
  }catch{/* storage may be disabled */}
}

/** Every entry, most recently changed first. Empty on the server and the first render. */
export function useStatusEntries():StatusEntry[]{
  useEffect(migrateFavorites,[]);
  const raw=useSyncExternalStore(subscribe,snapshot,()=>"");
  if(!raw)return [];
  try{
    const parsed=JSON.parse(raw) as Record<string,Entry>;
    return Object.entries(parsed)
      .filter(([,entry])=>entry?.status!==null&&STATUSES.includes(entry?.status))
      .map(([id,entry])=>({id,status:entry.status as MusicStatus,at:Number(entry.at)||0}))
      .sort((a,b)=>b.at-a.at);
  }catch{return []}
}

/** Every status, as {id: status}. */
export function useStatuses():Record<string,MusicStatus>{
  const entries=useStatusEntries();
  return Object.fromEntries(entries.map(entry=>[entry.id,entry.status]));
}
