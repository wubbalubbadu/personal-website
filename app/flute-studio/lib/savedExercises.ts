"use client";
import {useMemo,useSyncExternalStore} from "react";

/**
 * Saved exercises: a named setup of an exercise you want to come back to ("Monday thirds", "Low register long
 * tones"). One list for every kind, so the Exercises hub, Home and My Studio read one place, and a new kind only adds
 * its own `config` shape (and a link and a summary in exercises/saved-kinds.ts).
 *
 * Kinds today: `scales` (Scale Studio sets). `long-tones` is reserved for Long tones setups, which are not saveable
 * yet; the hub ignores a kind it cannot open.
 *
 * Stored as one array of records under `cookie:saved-exercises:v1`. A transfer code combines the array by `id`, the
 * newer `savedAt` winning (lib/transfer.ts), as it did for the old scale sets list.
 *
 * Before October 2026 Scale Studio kept its sets under `cookie:scale-book:sets:v1`. Those are folded in on read and
 * the old key removed, every time it appears, so an older transfer code that still carries it loses nothing.
 */
export type SavedKind="scales"|"long-tones";
export type SavedExercise<C=unknown>={id:string;kind:SavedKind;name:string;savedAt:string;config:C};

export const SAVED_EXERCISES_KEY="cookie:saved-exercises:v1";
export const LEGACY_SCALE_SETS_KEY="cookie:scale-book:sets:v1";
/** Same-tab notification: `storage` only fires in other tabs. */
export const savedExercisesEvent="cookie:saved-exercises-updated";
const KINDS:SavedKind[]=["scales","long-tones"];

const isRecord=(value:unknown):value is Record<string,unknown>=>typeof value==="object"&&value!==null&&!Array.isArray(value);
function parseList(raw:string|null):unknown[]{try{const value=JSON.parse(raw||"[]");return Array.isArray(value)?value:[]}catch{return []}}
/** Only well-formed records; a record without a kind is a scale set (the only kind there was). */
function clean(list:unknown[],fallbackKind:SavedKind):SavedExercise[]{
  return list.flatMap(item=>{
    if(!isRecord(item)||typeof item.id!=="string"||typeof item.name!=="string"||!isRecord(item.config))return [];
    const kind=KINDS.includes(item.kind as SavedKind)?item.kind as SavedKind:fallbackKind;
    return [{id:item.id,kind,name:item.name,savedAt:typeof item.savedAt==="string"?item.savedAt:new Date(0).toISOString(),config:item.config}];
  });
}
/** Old sets join the list in their saved order; a set already there keeps whichever copy was saved later. */
export function foldLegacy(current:SavedExercise[],legacy:SavedExercise[]):SavedExercise[]{
  const out=[...current];
  for(const set of legacy){
    const at=out.findIndex(item=>item.id===set.id);
    if(at<0)out.push(set);else if(set.savedAt>out[at].savedAt)out[at]=set;
  }
  return out;
}

/** Moves the old scale sets list into the saved exercises list. Idempotent; does nothing once the old key is gone. */
function migrate(){
  if(typeof localStorage==="undefined")return;
  try{
    const legacyRaw=localStorage.getItem(LEGACY_SCALE_SETS_KEY);
    if(legacyRaw===null)return;
    const merged=foldLegacy(clean(parseList(localStorage.getItem(SAVED_EXERCISES_KEY)),"scales"),clean(parseList(legacyRaw),"scales"));
    localStorage.setItem(SAVED_EXERCISES_KEY,JSON.stringify(merged));
    // Only after the new list is safely written.
    localStorage.removeItem(LEGACY_SCALE_SETS_KEY);
  }catch{/* storage may be disabled or full: the old key stays, and is read again next time */}
}

export function readSaved(kind?:SavedKind):SavedExercise[]{
  if(typeof localStorage==="undefined")return [];
  migrate();
  let all:SavedExercise[]=[];
  try{
    all=clean(parseList(localStorage.getItem(SAVED_EXERCISES_KEY)),"scales");
    // Migration could not write (storage full): still show the old sets.
    const legacy=localStorage.getItem(LEGACY_SCALE_SETS_KEY);
    if(legacy!==null)all=foldLegacy(all,clean(parseList(legacy),"scales"));
  }catch{return []}
  return kind?all.filter(item=>item.kind===kind):all;
}

function write(all:SavedExercise[]){
  try{localStorage.setItem(SAVED_EXERCISES_KEY,JSON.stringify(all))}catch{/* storage may be disabled */}
  window.dispatchEvent(new Event(savedExercisesEvent));
}

export function findSaved(id:string){return readSaved().find(item=>item.id===id)??null}
export function deleteSaved(id:string){write(readSaved().filter(item=>item.id!==id))}
export function renameSaved(id:string,name:string){
  const trimmed=name.trim();if(!trimmed)return;
  write(readSaved().map(item=>item.id===id?{...item,name:trimmed}:item));
}
/**
 * Saving under a name that already exists for this kind replaces that one (re-saving after a tweak is the common
 * case, and two rows with one name could not be told apart). A new one goes at the end.
 */
export function saveSaved<C>(kind:SavedKind,name:string,config:C):SavedExercise<C>|null{
  const trimmed=name.trim();if(!trimmed)return null;
  const all=readSaved(),existing=all.find(item=>item.kind===kind&&item.name.toLowerCase()===trimmed.toLowerCase());
  const saved:SavedExercise<C>={id:existing?.id??`set-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`,kind,name:trimmed,savedAt:new Date().toISOString(),config};
  write(existing?all.map(item=>item.id===saved.id?saved:item):[...all,saved]);
  return saved;
}

const subscribe=(change:()=>void)=>{
  // Old sets move over as soon as anything is listening; React then sees the new snapshot and re-renders.
  migrate();
  window.addEventListener(savedExercisesEvent,change);window.addEventListener("storage",change);
  return()=>{window.removeEventListener(savedExercisesEvent,change);window.removeEventListener("storage",change)};
};
/** Both keys as one string, so a change to either (an import brings the old one back) re-renders. */
const snapshot=()=>{try{return `${localStorage.getItem(SAVED_EXERCISES_KEY)??""}\u0000${localStorage.getItem(LEGACY_SCALE_SETS_KEY)??""}`}catch{return ""}};

/**
 * The saved exercises, live. `ready` is false on the server and in the hydration render, when storage cannot be
 * read yet: a page holds back what depends on the list until then, so nothing appears late and pushes the page down.
 */
export function useSavedExercises(kind?:SavedKind){
  const raw=useSyncExternalStore(subscribe,snapshot,()=>null);
  // `raw` is what changes; reading through readSaved also runs the migration.
  const items=useMemo(()=>raw===null?[]:readSaved(kind),[raw,kind]);
  return {items,ready:raw!==null};
}
