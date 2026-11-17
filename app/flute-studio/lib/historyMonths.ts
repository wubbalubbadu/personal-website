import {sessionsKey,type PracticeSession} from "../practice-data";
import {REP_LOG_KEY} from "./repLog";
import {TEMPO_HISTORY_KEY} from "./tempoHistory";
import {PITCH_HISTORY_KEY,PITCH_UPDATED,type PitchRecord} from "./pitchHistory";

/**
 * Practice history by month, for the Sync devices page: how much each month holds, and clearing one month from this
 * device. Two kinds of history can be cleared this way, each covering every store of that kind that carries a date:
 *
 * - "practice": logged sessions (cookie:practice-sessions:v1), counted repetitions by day (cookie:practice-reps:v1)
 *   and the tempo reached each day (cookie:tempo-history:v1).
 * - "pitch": measured long-tone notes (cookie:pitch-history) and the saved pitch lines (cookie:pitch-traces:v1).
 *
 * Nothing else is touched: saved sets, music lists, deadlines, mock runs, routines, tricky bits and their running
 * totals, saved pitch tests, the running clock, markup and every setting stay as they are. Entries without a readable
 * date stay too.
 *
 * Months are local time: a session belongs to the month it started in on this device's clock; rep and tempo days are
 * already local "YYYY-MM-DD" pages.
 *
 * The top half of this file is pure (group, filter, word the summary) and is what tests/history-months.test.mjs
 * checks. The bottom half reads and writes localStorage with it.
 *
 * Those stores have no deletion marks of their own, and a transfer combines lists, so a code made on another device
 * would bring a cleared month straight back. Clearing therefore also writes a note, {id, kind, month, at}, to
 * CLEARED_KEY. The note travels with transfer codes (a list of records, merged by id like everything else), and after
 * every import `pruneCleared` takes out anything from a cleared month that already existed when it was cleared.
 * Practice logged in that month later (on any device) is kept.
 */
export type HistoryKind="practice"|"pitch";
export type HistoryMonth={/** "YYYY-MM", local time. */month:string;sessions:number;minutes:number;repDays:number;reps:number;tempoDays:number;notes:number;traces:number};
type RepLog=Record<string,Record<string,{reps?:Record<string,number>}>>;
type TempoHistory=Record<string,{days?:Record<string,number>}>;
type Trace={at?:number};
/** Whatever of the dated stores is at hand, already parsed. A missing store is simply not looked at. */
export type HistoryStores={sessions?:PracticeSession[];reps?:RepLog;tempos?:TempoHistory;pitch?:PitchRecord[];traces?:Record<string,Trace[]>};
type Cleared={id:string;kind:HistoryKind;month:string;at:number};

const pad=(value:number)=>String(value).padStart(2,"0");
/** The local month a moment falls in, "YYYY-MM". */
export function monthOf(time:number){const day=new Date(time);return `${day.getFullYear()}-${pad(day.getMonth()+1)}`}
const dayOf=(time:number)=>{const day=new Date(time);return `${monthOf(time)}-${pad(day.getDate())}`};
const isObject=(value:unknown):value is Record<string,unknown>=>typeof value==="object"&&value!==null&&!Array.isArray(value);
/** Rep and tempo pages are local days, "YYYY-MM-DD"; any other key has no date and is left alone. */
const dayMonth=(day:string)=>/^\d{4}-\d{2}-\d{2}$/.test(day)?day.slice(0,7):null;
const repCount=(page:unknown)=>isObject(page)?Object.values(page).reduce<number>((sum,entry)=>sum+(isObject(entry)&&isObject(entry.reps)?Object.values(entry.reps).reduce<number>((a,b)=>a+(Number(b)||0),0):0),0):0;
const sessionStart=(session:PracticeSession)=>Date.parse(session?.startedAt);

/** Every month that holds this kind of history, newest first, with what it holds. */
export function summarizeMonths(kind:HistoryKind,stores:HistoryStores):HistoryMonth[]{
  const months=new Map<string,HistoryMonth>();
  const at=(month:string)=>months.get(month)??months.set(month,{month,sessions:0,minutes:0,repDays:0,reps:0,tempoDays:0,notes:0,traces:0}).get(month)!;
  if(kind==="practice"){
    for(const session of stores.sessions??[]){const time=sessionStart(session);if(Number.isNaN(time))continue;const row=at(monthOf(time));row.sessions+=1;row.minutes+=(Number(session.durationSeconds)||0)/60}
    for(const [day,page] of Object.entries(stores.reps??{})){const month=dayMonth(day),count=repCount(page);if(!month||!count)continue;const row=at(month);row.repDays+=1;row.reps+=count}
    // A day counts once however many things had a tempo on it.
    const tempoDays=new Set<string>();
    for(const line of Object.values(stores.tempos??{}))for(const day of Object.keys(isObject(line)&&isObject(line.days)?line.days:{}))if(dayMonth(day))tempoDays.add(day);
    for(const day of tempoDays)at(dayMonth(day)!).tempoDays+=1;
  }else{
    for(const record of stores.pitch??[])if(typeof record?.at==="number")at(monthOf(record.at)).notes+=1;
    for(const list of Object.values(stores.traces??{}))if(Array.isArray(list))for(const trace of list)if(typeof trace?.at==="number")at(monthOf(trace.at)).traces+=1;
  }
  return [...months.values()].sort((a,b)=>b.month.localeCompare(a.month));
}

/**
 * The same stores with one month of this kind taken out, and only things that existed `before` (a time in ms; leave it
 * out to take everything in the month). Sessions count from when they ended, pitch notes and lines from when they were
 * measured; a rep or tempo day has no time, so a day in the month goes when it is not after the day of `before`.
 * A store nothing was taken from comes back as the very same object, so a caller can tell what changed.
 */
export function withoutMonth(kind:HistoryKind,stores:HistoryStores,month:string,before=Infinity):HistoryStores{
  const out:HistoryStores={...stores};
  const cutoff=Number.isFinite(before)?dayOf(before):"9999-99-99";
  const dayGoes=(day:string)=>dayMonth(day)===month&&day<=cutoff;
  if(kind==="practice"){
    if(stores.sessions){
      const kept=stores.sessions.filter(session=>{const start=sessionStart(session),end=Date.parse(session.endedAt)||start;return Number.isNaN(start)||monthOf(start)!==month||end>before});
      if(kept.length!==stores.sessions.length)out.sessions=kept;
    }
    if(stores.reps&&Object.keys(stores.reps).some(dayGoes))out.reps=Object.fromEntries(Object.entries(stores.reps).filter(([day])=>!dayGoes(day)));
    if(stores.tempos){
      let changed=false;const lines:TempoHistory={};
      for(const [key,line] of Object.entries(stores.tempos)){
        const days=isObject(line)&&isObject(line.days)?Object.keys(line.days):[];
        if(!days.some(dayGoes)){lines[key]=line;continue}
        changed=true;
        const left=Object.fromEntries(Object.entries(line.days!).filter(([day])=>!dayGoes(day)));
        // A line with no days left has nothing to draw: it goes with its last day.
        if(Object.keys(left).length)lines[key]={...line,days:left};
      }
      if(changed)out.tempos=lines;
    }
  }else{
    const goes=(item:{at?:number}|null|undefined)=>typeof item?.at==="number"&&monthOf(item.at)===month&&item.at<=before;
    if(stores.pitch){const kept=stores.pitch.filter(record=>!goes(record));if(kept.length!==stores.pitch.length)out.pitch=kept}
    if(stores.traces){
      let changed=false;const notes:Record<string,Trace[]>={};
      for(const [midi,list] of Object.entries(stores.traces)){
        if(!Array.isArray(list)||!list.some(goes)){notes[midi]=list;continue}
        changed=true;
        const left=list.filter(trace=>!goes(trace));
        if(left.length)notes[midi]=left;
      }
      if(changed)out.traces=notes;
    }
  }
  return out;
}

/** Practice time in words: "45 min", "2 h", "3 h 20 min"; "" under half a minute. */
export function formatMinutes(minutes:number,zh=false){
  const total=Math.round(Number.isFinite(minutes)?minutes:0);
  if(total<1)return "";
  const hours=Math.floor(total/60),rest=total%60;
  if(zh)return [hours?`${hours} 小时`:"",rest?`${rest} 分钟`:""].filter(Boolean).join(" ");
  return [hours?`${hours} h`:"",rest?`${rest} min`:""].filter(Boolean).join(" ");
}

/** What a month holds, in words: "12 sessions, 3 h 20 min, 5 days of repetitions". The row's grey line and the confirmation. */
export function monthSummary(row:HistoryMonth,zh=false){
  const plural=(count:number,one:string,many:string)=>`${count} ${count===1?one:many}`;
  return [
    row.sessions?(zh?`${row.sessions} 次练习`:plural(row.sessions,"session","sessions")):"",
    row.sessions?formatMinutes(row.minutes,zh):"",
    row.repDays?(zh?`${row.repDays} 天的重复次数`:`${plural(row.repDays,"day","days")} of repetitions`):"",
    row.tempoDays?(zh?`${row.tempoDays} 天的速度记录`:`${plural(row.tempoDays,"day","days")} of tempos`):"",
    row.notes?(zh?`${row.notes} 个测过的音`:plural(row.notes,"measured note","measured notes")):"",
    row.traces?(zh?`${row.traces} 条音准曲线`:plural(row.traces,"pitch line","pitch lines")):"",
  ].filter(Boolean).join(zh?"、":", ");
}

/** "October 2026" / "2026年10月" for a "YYYY-MM". */
export function monthLabel(month:string,zh=false){
  const [year,index]=month.split("-").map(Number);
  return new Date(year,index-1,1).toLocaleDateString(zh?"zh-CN":"en-US",{year:"numeric",month:"long"});
}

/* ---- This device's storage ---- */

export const CLEARED_KEY="cookie:practice-cleared-months:v1";
const PITCH_TRACES_KEY="cookie:pitch-traces:v1";
/** Store, where it lives, and the event the pages showing it listen for (My Studio, Home, the trend lines). */
const PLACES:Record<HistoryKind,{store:keyof HistoryStores;key:string;event:string;list:boolean}[]>={
  practice:[
    {store:"sessions",key:sessionsKey,event:"cookie:practice-updated",list:true},
    {store:"reps",key:REP_LOG_KEY,event:"cookie:practice-reps",list:false},
    {store:"tempos",key:TEMPO_HISTORY_KEY,event:"cookie:tempo-history",list:false},
  ],
  pitch:[
    {store:"pitch",key:PITCH_HISTORY_KEY,event:PITCH_UPDATED,list:true},
    {store:"traces",key:PITCH_TRACES_KEY,event:PITCH_UPDATED,list:false},
  ],
};

function readJSON<T>(key:string,fallback:T):T{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw) as T:fallback}catch{return fallback}}
function writeJSON(key:string,value:unknown){try{localStorage.setItem(key,JSON.stringify(value))}catch{/* storage may be disabled */}}
function readStores(kind:HistoryKind):HistoryStores{
  const stores:Record<string,unknown>={};
  for(const place of PLACES[kind]){
    const value=readJSON<unknown>(place.key,null);
    // A store that is missing or not the shape expected is left out, so it is never rewritten.
    if(place.list?Array.isArray(value):isObject(value))stores[place.store]=value;
  }
  return stores as HistoryStores;
}

/** Every month on this device that holds this kind of history, newest first. */
export function historyMonths(kind:HistoryKind):HistoryMonth[]{return summarizeMonths(kind,readStores(kind))}

function prune(kind:HistoryKind,month:string,before:number){
  const stores=readStores(kind),next=withoutMonth(kind,stores,month,before),events=new Set<string>();
  for(const place of PLACES[kind])if(next[place.store]!==stores[place.store]){writeJSON(place.key,next[place.store]);events.add(place.event)}
  for(const event of events)window.dispatchEvent(new Event(event));
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
