"use client";
import {useEffect,useState} from "react";

/**
 * How the reader's Drone button works, set once for the whole studio in Settings (Nov 17): tap a note to hold it,
 * or let the drone follow the music bar by bar. It used to be remembered per piece from the Drone ▾ menu; the ▾
 * still changes it on wider screens, and both write this one setting. A piece that never had it set keeps its own
 * default (pieces with drone notes written in start on Follows the music).
 */
export type DroneMode="tap"|"auto";
export const DRONE_MODE_KEY="cookie:drone-mode",DRONE_MODE_EVENT="cookie:drone-mode";

export function readDroneMode():DroneMode|null{
  try{const value=localStorage.getItem(DRONE_MODE_KEY);return value==="tap"||value==="auto"?value:null}catch{return null}
}
export function saveDroneMode(mode:DroneMode){
  try{localStorage.setItem(DRONE_MODE_KEY,mode)}catch{/* this visit only */}
  window.dispatchEvent(new CustomEvent<DroneMode>(DRONE_MODE_EVENT,{detail:mode}));
}
/** Calls back whenever the setting changes, here or in another tab. */
export function onDroneMode(listener:(mode:DroneMode)=>void){
  const local=(event:Event)=>listener((event as CustomEvent<DroneMode>).detail);
  const other=(event:StorageEvent)=>{if(event.key===DRONE_MODE_KEY&&(event.newValue==="tap"||event.newValue==="auto"))listener(event.newValue)};
  window.addEventListener(DRONE_MODE_EVENT,local);window.addEventListener("storage",other);
  return()=>{window.removeEventListener(DRONE_MODE_EVENT,local);window.removeEventListener("storage",other)};
}
/** For Settings: the saved mode, "tap" until one is chosen. */
export function useDroneMode():[DroneMode,(mode:DroneMode)=>void]{
  const [mode,setMode]=useState<DroneMode>("tap");
  // Read after hydration: the setting lives in this browser.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>{setMode(readDroneMode()??"tap");return onDroneMode(setMode)},[]);
  return [mode,saveDroneMode];
}
