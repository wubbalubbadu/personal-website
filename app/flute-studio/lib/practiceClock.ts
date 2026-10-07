"use client";
import {useSyncExternalStore} from "react";
import {readSessions,sessionsKey,type PracticeSession} from "../practice-data";
export type {PracticeSession};

/**
 * The one practice clock. The top bar's clock button and My Studio's Today's practice card both drive it, so starting
 * it on a piece and opening My Studio shows the same clock running. It counts up; whatever it is timing (a piece, an
 * exercise, a routine step, or just "Practice") is logged as a practice session when you stop or move on, and those
 * sessions are what the calendar shows. Saved as it runs, so a reload or leaving the page does not lose the time.
 */
export type ClockTarget={title:string;/** A library or exercise id: the session links to it. */ref?:string;itemType?:PracticeSession["itemType"]};
export type Clock={running:boolean;/** When the current stretch began (start, resume, or a switch). */since:number;/** Time banked on the current target. */banked:number;/** The whole sitting, banked. */total:number;target:ClockTarget};

const KEY="cookie:practice-live",EVENT="cookie:practice-clock",MIN_LOG_SECONDS=10;
let cached:string|null|undefined,snapshot:Clock|null=null;
function read():Clock|null{
  let raw:string|null=null;
  try{raw=localStorage.getItem(KEY)}catch{/* No saved clock. */}
  if(raw!==cached){cached=raw;try{const parsed=raw?JSON.parse(raw):null;snapshot=parsed&&typeof parsed.since==="number"&&parsed.target?parsed:null}catch{snapshot=null}}
  return snapshot;
}
function write(next:Clock|null){
  try{if(next)localStorage.setItem(KEY,JSON.stringify(next));else localStorage.removeItem(KEY)}catch{/* The clock still runs for this visit. */}
  window.dispatchEvent(new Event(EVENT));
}
function subscribe(fn:()=>void){window.addEventListener(EVENT,fn);window.addEventListener("storage",fn);return()=>{window.removeEventListener(EVENT,fn);window.removeEventListener("storage",fn)}}
export function usePracticeClock(){return useSyncExternalStore(subscribe,read,()=>null)}

/** Time on the current target, and the whole sitting, at `now`. */
export function clockTimes(clock:Clock|null,now:number){
  if(!clock)return {target:0,total:0};
  const stretch=clock.running?Math.max(0,now-clock.since):0;
  return {target:clock.banked+stretch,total:clock.total+stretch};
}
export const formatClock=(ms:number)=>{const s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor(s/60)%60;return h?`${h}:${String(m).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`:`${m}:${String(s%60).padStart(2,"0")}`};

/**
 * A finished stretch is not saved straight away: it waits here until you say Save (with a note, if you like) or
 * Discard, so a clock started by mistake never lands in your log. Several can wait (each step of a routine is one).
 */
const PENDING_KEY="cookie:practice-pending";
let pendingRaw:string|null|undefined,pendingSnapshot:PracticeSession[]=[];
function readPending():PracticeSession[]{
  let raw:string|null=null;
  try{raw=localStorage.getItem(PENDING_KEY)}catch{/* Nothing waiting. */}
  if(raw!==pendingRaw){pendingRaw=raw;try{const parsed=raw?JSON.parse(raw):[];pendingSnapshot=Array.isArray(parsed)?parsed:[]}catch{pendingSnapshot=[]}}
  return pendingSnapshot;
}
function writePending(next:PracticeSession[]){
  try{if(next.length)localStorage.setItem(PENDING_KEY,JSON.stringify(next));else localStorage.removeItem(PENDING_KEY)}catch{/* Lost on reload only. */}
  window.dispatchEvent(new Event(EVENT));
}
const noPending:PracticeSession[]=[];
/** Finished stretches waiting for Save or Discard, oldest first. */
export function usePendingSessions(){return useSyncExternalStore(subscribe,readPending,()=>noPending)}
/** Save a waiting session to your practice log, with your note. */
export function savePending(id:string,note:string){
  const all=readPending(),session=all.find(item=>item.id===id);if(!session)return;
  try{localStorage.setItem(sessionsKey,JSON.stringify([{...session,reflection:note.trim()},...readSessions()]))}catch{/* Not saved. */}
  writePending(all.filter(item=>item.id!==id));
  window.dispatchEvent(new Event("cookie:practice-updated"));
}
export function discardPending(id:string){writePending(readPending().filter(item=>item.id!==id))}
/** Take a session back out of the log (deleted from the day it was on). */
export function deleteSession(id:string){
  try{localStorage.setItem(sessionsKey,JSON.stringify(readSessions().filter(item=>item.id!==id)))}catch{/* Not changed. */}
  window.dispatchEvent(new Event("cookie:practice-updated"));
}
/** Put a deleted session back (Undo). */
export function restoreSession(session:PracticeSession){
  try{localStorage.setItem(sessionsKey,JSON.stringify([session,...readSessions()].sort((a,b)=>b.startedAt.localeCompare(a.startedAt))))}catch{/* Not changed. */}
  window.dispatchEvent(new Event("cookie:practice-updated"));
}

function log(target:ClockTarget,ms:number,endedAt:number,fallback:string){
  const seconds=Math.round(ms/1000);if(seconds<MIN_LOG_SECONDS)return;
  const session:PracticeSession={id:crypto.randomUUID(),itemId:target.ref??"practice",itemType:target.itemType??"focus",title:target.title.trim()||fallback,
    startedAt:new Date(endedAt-seconds*1000).toISOString(),endedAt:new Date(endedAt).toISOString(),durationSeconds:seconds,reflection:""};
  writePending([...readPending(),session]);
}

/** Start timing `target`. If the clock is already timing something else, that is logged first and the clock carries on. */
export function startClock(target:ClockTarget,fallback:string){
  const now=Date.now(),clock=read();
  if(!clock){write({running:true,since:now,banked:0,total:0,target});return}
  const same=clock.target.ref?clock.target.ref===target.ref:clock.target.title===target.title;
  if(same){if(!clock.running)write({...clock,running:true,since:now});return}
  switchClock(target,fallback,true);
}
export function pauseClock(){
  const now=Date.now(),clock=read();if(!clock||!clock.running)return;
  write({...clock,running:false,banked:clock.banked+(now-clock.since),total:clock.total+(now-clock.since),since:now});
}
export function resumeClock(){const clock=read();if(clock&&!clock.running)write({...clock,running:true,since:Date.now()})}
/** Log what the clock was timing and move on to `next` (the clock keeps its state: running stays running). */
export function switchClock(next:ClockTarget,fallback:string,run?:boolean){
  const now=Date.now(),clock=read();if(!clock)return;
  const {target:spent,total}=clockTimes(clock,now);
  log(clock.target,spent,now,fallback);
  write({running:run??clock.running,since:now,banked:0,total,target:next});
}
/** Stop: log what was being timed and put the clock away. */
export function stopClock(fallback:string){
  const now=Date.now(),clock=read();if(!clock)return;
  log(clock.target,clockTimes(clock,now).target,now,fallback);
  write(null);
}
