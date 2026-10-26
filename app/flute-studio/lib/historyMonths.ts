import {sessionsKey,type PracticeSession} from "../practice-data";
import {REP_LOG_KEY} from "./repLog";
import {PITCH_HISTORY_KEY,PITCH_UPDATED,type PitchRecord} from "./pitchHistory";

/**
 * Practice history by month, for the Sync devices page: how much each month holds, and clearing one month from this
 * device. Two kinds of history can be cleared this way:
 *
 * - "practice": logged sessions (cookie:practice-sessions:v1) and counted repetitions (cookie:practice-reps:v1).
 * - "pitch": measured long-tone notes (cookie:pitch-history).
 *
 * Nothing else is touched: saved sets, music lists, deadlines, mock runs, routines, tricky bits, pitch tests and
 * markup stay as they are.
 *
 * Those stores have no deletion marks of their own, and a transfer combines lists, so a code made on another device
 * would bring a cleared month straight back. Clearing therefore also writes a note, {id, kind, month, at}, to
 * CLEARED_KEY. The note travels with transfer codes (a list of records, merged by id like everything else), and after
 * every import `pruneCleared` takes out anything from a cleared month that already existed when it was cleared.
 * Practice logged in that month later (on any device) is kept.
 */
export type HistoryKind="practice"|"pitch";
export type HistoryMonth={/** "YYYY-MM", local time. */month:string;sessions:number;minutes:number;repDays:number;reps:number;notes:number};
type Cleared={id:string;kind:HistoryKind;month:string;at:number};

export const CLEARED_KEY="cookie:practice-cleared-months:v1";
const PITCH_EVENT=PITCH_UPDATED,PRACTICE_EVENT="cookie:practice-updated",REPS_EVENT="cookie:practice-reps";

const monthOf=(time:number)=>{const day=new Date(time);return `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,"0")}`};
function readJSON<T>(key:string,fallback:T):T{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw) as T:fallback}catch{return fallback}}
function writeJSON(key:string,value:unknown){try{localStorage.setItem(key,JSON.stringify(value))}catch{/* storage may be disabled */}}
const sessions=()=>{const list=readJSON<PracticeSession[]>(sessionsKey,[]);return Array.isArray(list)?list:[]};
const repLog=()=>{const log=readJSON<Record<string,Record<string,{reps?:Record<string,number>}>>>(REP_LOG_KEY,{});return log&&typeof log==="object"&&!Array.isArray(log)?log:{}};
const pitch=()=>{const list=readJSON<PitchRecord[]>(PITCH_HISTORY_KEY,[]);return Array.isArray(list)?list:[]};
/** Rep log pages are local days, "YYYY-MM-DD". */
const repMonth=(day:string)=>day.slice(0,7);
const repCount=(page:Record<string,{reps?:Record<string,number>}>)=>Object.values(page).reduce((sum,entry)=>sum+Object.values(entry?.reps??{}).reduce((a,b)=>a+(Number(b)||0),0),0);

/** Every month that holds this kind of history, newest first. */
export function historyMonths(kind:HistoryKind):HistoryMonth[]{
  const months=new Map<string,HistoryMonth>();
  const at=(month:string)=>months.get(month)??months.set(month,{month,sessions:0,minutes:0,repDays:0,reps:0,notes:0}).get(month)!;
  if(kind==="practice"){
    for(const session of sessions()){const time=Date.parse(session.startedAt);if(Number.isNaN(time))continue;const row=at(monthOf(time));row.sessions+=1;row.minutes+=(session.durationSeconds||0)/60}
    for(const [day,page] of Object.entries(repLog())){const count=repCount(page??{});if(!count)continue;const row=at(repMonth(day));row.repDays+=1;row.reps+=count}
  }else for(const record of pitch())if(typeof record?.at==="number")at(monthOf(record.at)).notes+=1;
  return [...months.values()].sort((a,b)=>b.month.localeCompare(a.month));
}

/**
 * Remove one month of this kind from this device, and only things that existed `before` (a time in ms). Sessions count
 * from when they ended, pitch notes from when they were measured; a rep log day has no time, so a day in the month is
 * removed when it is not after the day of `before`.
 */
function prune(kind:HistoryKind,month:string,before:number){
  if(kind==="practice"){
    const kept=sessions().filter(session=>{const start=Date.parse(session.startedAt),end=Date.parse(session.endedAt)||start;return Number.isNaN(start)||monthOf(start)!==month||end>before});
    if(kept.length!==sessions().length){writeJSON(sessionsKey,kept);window.dispatchEvent(new Event(PRACTICE_EVENT))}
    const log=repLog(),lastDay=new Date(before),cutoff=`${monthOf(before)}-${String(lastDay.getDate()).padStart(2,"0")}`;
    const days=Object.keys(log).filter(day=>repMonth(day)===month&&day<=cutoff);
    if(days.length){for(const day of days)delete log[day];writeJSON(REP_LOG_KEY,log);window.dispatchEvent(new Event(REPS_EVENT))}
  }else{
    const list=pitch(),kept=list.filter(record=>typeof record?.at!=="number"||monthOf(record.at)!==month||record.at>before);
    if(kept.length!==list.length){writeJSON(PITCH_HISTORY_KEY,kept);window.dispatchEvent(new Event(PITCH_EVENT))}
  }
}

/** Clear one month from this device and remember it, so a later transfer does not bring it back. */
export function clearHistoryMonth(kind:HistoryKind,month:string,now=Date.now()){
  const notes=readJSON<Cleared[]>(CLEARED_KEY,[]),id=`${kind}:${month}`;
  writeJSON(CLEARED_KEY,[...(Array.isArray(notes)?notes:[]).filter(note=>note?.id!==id),{id,kind,month,at:now}]);
  prune(kind,month,now);
}

/** After an import: take out again whatever a cleared month held when it was cleared (lib/transfer.ts `apply`). */
export function pruneCleared(){
  const notes=readJSON<Cleared[]>(CLEARED_KEY,[]);
  if(!Array.isArray(notes))return;
  for(const note of notes)if(note&&(note.kind==="practice"||note.kind==="pitch")&&/^\d{4}-\d{2}$/.test(note.month)&&typeof note.at==="number")prune(note.kind,note.month,note.at);
}
