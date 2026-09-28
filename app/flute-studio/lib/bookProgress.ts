"use client";

import {useSyncExternalStore} from "react";

/**
 * Where you are in each book: the numbers you have opened, the ones you
 * marked done, and the last one you opened (what "Continue" goes back to).
 *
 * Kept per book rather than in the shared recents list, which holds only a
 * handful of ids across the whole studio and would forget a 15-etude book
 * long before you finished it. Opening a piece is recorded by the reader;
 * "done" is only ever set by you, on the book page.
 */
export type BookProgress={last?:number;opened:number[];done:number[]};

const KEY="cookie:book-progress:v1";
const EVENT="cookie:book-progress";

function readAll():Record<string,Partial<BookProgress>>{
  try{const value=JSON.parse(localStorage.getItem(KEY)||"{}");return value&&typeof value==="object"?value:{}}catch{return {}}
}
function writeAll(value:Record<string,Partial<BookProgress>>){
  try{localStorage.setItem(KEY,JSON.stringify(value))}catch{/* storage may be disabled */}
  window.dispatchEvent(new Event(EVENT));
}
function update(bookId:string,change:(current:BookProgress)=>BookProgress){
  const all=readAll();
  const current=all[bookId]??{};
  all[bookId]=change({last:current.last,opened:current.opened??[],done:current.done??[]});
  writeAll(all);
}

export function recordOpened(bookId:string,number:number){
  update(bookId,current=>({...current,last:number,opened:current.opened.includes(number)?current.opened:[...current.opened,number]}));
}
export function toggleDone(bookId:string,number:number){
  update(bookId,current=>({...current,done:current.done.includes(number)?current.done.filter(n=>n!==number):[...current.done,number]}));
}

const subscribe=(onChange:()=>void)=>{
  window.addEventListener(EVENT,onChange);window.addEventListener("storage",onChange);
  return()=>{window.removeEventListener(EVENT,onChange);window.removeEventListener("storage",onChange)};
};
const EMPTY:BookProgress={opened:[],done:[]};

/** One book's progress. Read as the raw stored string so the snapshot is stable between renders. */
export function useBookProgress(bookId:string):BookProgress{
  const raw=useSyncExternalStore(subscribe,()=>{try{return localStorage.getItem(KEY)}catch{return null}},()=>null);
  if(!raw)return EMPTY;
  try{const entry=JSON.parse(raw)?.[bookId];return entry?{opened:[],done:[],...entry}:EMPTY}catch{return EMPTY}
}
