"use client";
import {useSyncExternalStore} from "react";

/**
 * One "Show practice tempo" switch for the whole studio (decided October 21, 2026): the tempo pills above excerpts and
 * above Scale Studio's exercises show or hide together. It used to be two switches, one global for excerpts
 * (`cookie:excerpt-tempo-mark`) and one inside Scale Studio's setup (`tempoMarks`), so turning it off in one place
 * left it on in the other.
 *
 * Until you use the new switch, an excerpt choice you made carries over; otherwise it is shown (the excerpt default).
 * Scale Studio's old value is not used: it was saved with every setup whether or not you had chosen it. The old values
 * are left in place.
 */
export const PRACTICE_TEMPO_MARKS_KEY="cookie:practice-tempo-marks";
const LEGACY_EXCERPT_KEY="cookie:excerpt-tempo-mark";
const EVENT="cookie:practice-tempo-marks";

function read():boolean{
  try{
    const saved=localStorage.getItem(PRACTICE_TEMPO_MARKS_KEY);
    if(saved==="1"||saved==="0")return saved==="1";
    const excerpt=localStorage.getItem(LEGACY_EXCERPT_KEY);
    if(excerpt==="1"||excerpt==="0")return excerpt==="1";
    return true;
  }catch{return true}
}
export function setPracticeTempoMarks(on:boolean){
  try{localStorage.setItem(PRACTICE_TEMPO_MARKS_KEY,on?"1":"0")}catch{/* this visit only */}
  window.dispatchEvent(new Event(EVENT));
}
const subscribe=(change:()=>void)=>{
  window.addEventListener(EVENT,change);window.addEventListener("storage",change);
  return()=>{window.removeEventListener(EVENT,change);window.removeEventListener("storage",change)};
};
/** Shown on the server (the old excerpt default); every page that uses it reads the real value right after. */
export function usePracticeTempoMarks():[boolean,(on:boolean)=>void]{
  return [useSyncExternalStore(subscribe,read,()=>true),setPracticeTempoMarks];
}
