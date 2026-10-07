"use client";
import {usePrivateMusic} from "../lib/privateMusic";

import Link from "next/link";
import {useEffect,useState} from "react";
import {useLanguage} from "../i18n/LanguageContext";
import {useTrickyBits} from "../lib/trickyBits";
import {readSessions,type PracticeSession} from "../practice-data";
import {useRecents} from "../lib/storage";
import {useStatusEntries,STATUS_LABELS,STATUS_TONES} from "../lib/musicStatus";
import "../components/status-button.css";
import {musicLibrary as publicMusic,libraryShelf as publicShelf} from "../../../content/music-library";
import {exerciseCatalog} from "../../../content/exercise-catalog";
import {PracticeCalendar} from "../PracticeCalendar";
import {PitchTendencies} from "./PitchTendencies";
import {type SuggestItem} from "./SuggestField";
import {PracticeCard,type RoutineItem} from "./PracticeCard";
import {PracticeIcon} from "../components/PracticeIcon";
import {deleteSession,restoreSession} from "../lib/practiceClock";
import "../home-preview-cards.css";
import "./practice-page.css";

const routineKey="cookie:practice-routine";
const dayMs=86400000;
const dateKey=(value:Date)=>value.toDateString();

/** Consecutive days up to today, and the longest run in the past year. */
function streaks(active:Set<string>,now:number){
  let current=0,cursor=new Date(now);
  while(active.has(dateKey(cursor))){current+=1;cursor=new Date(cursor.getTime()-dayMs)}
  let longest=0,run=0;
  for(let i=364;i>=0;i-=1){
    if(active.has(dateKey(new Date(now-i*dayMs)))){run+=1;longest=Math.max(longest,run)}
    else run=0;
  }
  return {current,longest};
}
/** `ref` is a library id when the step was picked rather than typed, so a
 *  routine step can link back to the thing it is asking you to play. */
type StudioListItem={id:string;title:string;composer:string;viewerPath:string|null};

function readRoutine():RoutineItem[]{try{const saved=JSON.parse(localStorage.getItem(routineKey)??"[]");return Array.isArray(saved)?saved:[]}catch{return []}}


export default function PracticePage(){
  const privateMusic=usePrivateMusic();
  const libraryShelf=[...publicShelf,...privateMusic.items];
  const musicLibrary=[...publicMusic,...privateMusic.items];
  const {t,lang}=useLanguage(),zh=lang==="zh",{bits:trickyBits}=useTrickyBits();
  const [routine,setRoutine]=useState<RoutineItem[]>([]);
  // The calendar day whose sessions show.
  const [day,setDay]=useState<string|null>(null),[removed,setRemoved]=useState<PracticeSession|null>(null);
  const [sessions,setSessions]=useState<PracticeSession[]>([]);
  // Captured once on mount rather than read during render: "today" is a
  // clock read, and rendering has to be pure for the same input.
  const [now,setNow]=useState(0);
  // Both already exist and are already written to — the score viewer records
  // every piece it opens, and the star control writes favourites. Nothing
  // was reading them back anywhere you could actually browse.
  const {ids:recentIds}=useRecents("music",8);
  const listEntries=useStatusEntries();

  useEffect(()=>{
    // Routine and sessions both live in localStorage, which is not readable
    // during SSR — so they are read once after hydration rather than as
    // initial state, which is what this rule is warning about.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRoutine(readRoutine());
    const update=()=>setSessions(readSessions());
    update();
    window.addEventListener("cookie:practice-updated",update);
    return()=>window.removeEventListener("cookie:practice-updated",update);
  },[]);

  function saveRoutine(next:RoutineItem[]){setRoutine(next);localStorage.setItem(routineKey,JSON.stringify(next))}


  const itemTypeLabels:Record<PracticeSession["itemType"],string>={repertoire:t.library.repertoire,exercise:t.library.exercise,etude:t.library.etude,method:t.library.method,"warm-up":t.library.warmup,focus:t.pomodoro.focus};
  // The same numbers the landing page used to show. They belong here —
  // this is the page about your practice — and they are rendered as a
  // quiet row rather than four oversized figures.
  const minutesOn=(match:(key:string)=>boolean)=>Math.round(
    sessions.filter(session=>match(dateKey(new Date(session.startedAt))))
      .reduce((total,session)=>total+session.durationSeconds,0)/60);
  const today=dateKey(new Date(now));
  const weekKeys=new Set(Array.from({length:7},(_,i)=>dateKey(new Date(now-i*dayMs))));
  const run=streaks(new Set(sessions.map(session=>dateKey(new Date(session.startedAt)))),now);
  const stats=[
    {label:zh?"今天":"Today",value:minutesOn(key=>key===today),unit:zh?"分钟":"min"},
    {label:zh?"本周":"This week",value:minutesOn(key=>weekKeys.has(key)),unit:zh?"分钟":"min"},
    {label:zh?"连续":"Streak",value:run.current,unit:zh?"天":run.current===1?"day":"days"},
    {label:zh?"最长":"Best",value:run.longest,unit:zh?"天":run.longest===1?"day":"days"},
  ];
  // Ids are all the stores keep, so titles come from the library — which
  // already contains the exercises as well as the pieces.
  const exerciseItems:StudioListItem[]=exerciseCatalog.map(item=>({id:item.id,title:zh?item.zhTitle:item.title,composer:zh?"练习":"Exercise",viewerPath:item.href}));
  const byId=new Map<string,StudioListItem>([...musicLibrary,...libraryShelf.filter(item=>item.bookCount),...exerciseItems].map(item=>[item.id,item]));
  const recentItems=recentIds.map(id=>byId.get(id)).filter((item):item is StudioListItem=>!!item);
  // Your lists in the order you would pick up from: working on, want to learn, learned.
  const listItems=(["working","want","learned"] as const)
    .flatMap(status=>listEntries.filter(entry=>entry.status===status).map(entry=>({entry,item:byId.get(entry.id)})))
    .filter((row):row is {entry:typeof listEntries[number];item:StudioListItem}=>!!row.item);

  const findable:SuggestItem[]=[...exerciseItems,...musicLibrary];
  // Private pieces on a list resolve once the access code has unlocked them; until then say so rather than look empty.
  const restoring=privateMusic.loading&&listEntries.some(entry=>!byId.has(entry.id));
  const shelfLink=(item:StudioListItem)=>item.viewerPath
    ?<Link href={item.viewerPath}><b>{item.title}</b><small>{item.composer}</small></Link>
    :<span className="is-disabled"><b>{item.title}</b><small>{item.composer}</small></span>;
  /** One status list on the shelf (Working On, Want to Learn, Learned). */
  const statusColumn=(status:"working"|"want"|"learned")=>{
    const rows=listItems.filter(row=>row.entry.status===status);
    const label=zh?STATUS_LABELS[status].zh:({working:"Working On",want:"Want to Learn",learned:"Learned"})[status];
    return <section className="continue-section home-shelf__column" key={status} aria-label={label}>
      <p><i className="status-dot" data-tone={STATUS_TONES[status]} aria-hidden="true"/><Link href={`/flute-studio/music?list=${status}`}>{label}</Link></p>
      {rows.length?<ul>{rows.map(({item})=><li key={item.id}>{shelfLink(item)}</li>)}</ul>
        :<><small>{restoring?(zh?"正在恢复曲目…":"Restoring your music…"):(zh?"还没有曲目。":"No pieces yet.")}</small><Link className="home-shelf__browse" href={`/flute-studio/music?list=${status}`}>{zh?"浏览曲库":"Browse Library"}</Link></>}
    </section>;
  };
  // The day picked on the calendar (today until you pick another) and what was practised then.
  const shownDay=day??(now?today:null);
  const daySessions=shownDay?sessions.filter(session=>dateKey(new Date(session.startedAt))===shownDay):[];
  const dayMinutes=Math.round(daySessions.reduce((sum,session)=>sum+session.durationSeconds,0)/60);

  return <main className="practice-page">
    <div className="practice-page__content">
      <header className="practice-page__header" data-tab-title>
        <h1>{t.practicePage.title}</h1>
      </header>

      {/* Two labelled bands: getting a practice going (timer, routine, your music), then what the practice shows. */}
      <h2 className="home-preview__group">{zh?"开始练习":"Start practicing"}</h2>
      <PracticeCard routine={routine} zh={zh} findable={findable} onRoutine={saveRoutine}
        lookup={id=>{const item=byId.get(id);return item?{viewerPath:item.viewerPath,isExercise:exerciseItems.some(entry=>entry.id===id)}:undefined}}
        labels={{title:zh?"今天的练习":"Today’s practice",start:t.pomodoro.start,pause:t.pomodoro.pause,resume:t.pomodoro.resume,markDone:t.practicePage.markStepDone,remove:t.practicePage.removeStep,addAria:t.practicePage.routineAddAria}}/>
      {/* Your music, in what you are playing now: Working On, Want to Learn, and the passages you saved to drill;
          then what you have learned beside what you opened lately. */}
      <section className="continue-panel home-shelf studio-shelf" aria-label={zh?"我的曲目":"Your shelf"}>
        {(["working","want"] as const).map(status=>statusColumn(status))}
        <section className="continue-section home-shelf__column" aria-labelledby="tricky-title">
          <p id="tricky-title"><Link href="/flute-studio/tricky-bits">{t.trickyBits.title}</Link></p>
          {trickyBits.length
            ?<ul>{[...trickyBits].sort((a,b)=>b.addedAt-a.addedAt).slice(0,5).map(bit=><li key={bit.id}>
              <Link href={`/flute-studio/tricky-bits?open=${encodeURIComponent(bit.id)}`}>
                <b>{musicLibrary.find(entry=>entry.id===bit.pieceId)?.title??(privateMusic.unlocked||privateMusic.loading?bit.pieceId:(zh?"私人乐谱（未解锁）":"Private piece (locked)"))}</b><small>{t.trickyBits.bars} {bit.label}{bit.tempos.length?` · ${Math.max(...bit.tempos)}`:""}{bit.goal?` → ${bit.goal}`:""}</small>
              </Link>
            </li>)}</ul>
            :<small>{t.trickyBits.empty}</small>}
        </section>
      </section>
      <section className="continue-panel home-shelf studio-shelf studio-shelf--two" aria-label={zh?"已学会与最近":"Learned and recent"}>
        {statusColumn("learned")}
        <section className="continue-section home-shelf__column" aria-labelledby="recent-title">
          <p id="recent-title">{zh?"最近打开":"Recently opened"}</p>
          {recentItems.length
            ?<ul>{recentItems.slice(0,5).map(item=><li key={item.id}>{shelfLink(item)}</li>)}</ul>
            :<small>{zh?"还没有打开过谱子。":"Nothing opened yet."}</small>}
        </section>
      </section>

      <h2 className="home-preview__group">{zh?"练习洞察":"Practice insights"}</h2>
      {/* The month, coloured by minutes practised; pick a day to see what you played. This replaces the long history list. */}
      <section className="studio-month" aria-label={zh?"练习日历":"Practice calendar"}>
        <PracticeCalendar sessions={sessions} selected={shownDay} onSelect={setDay} legend>
          {/* The running totals belong with the month they summarise. */}
          <ul className="stats-row">
            {stats.map(stat=><li key={stat.label}>
              <b>{stat.value}<span>{stat.unit}</span></b>
              <small>{stat.label}</small>
            </li>)}
          </ul>
        </PracticeCalendar>
        <section className="practice-card studio-day" aria-labelledby="day-title">
          <div className="practice-card__heading">
            <h2 id="day-title">{shownDay?new Date(shownDay).toLocaleDateString(zh?"zh-CN":undefined,{weekday:"long",month:"long",day:"numeric"}):""}</h2>
            {daySessions.length>0&&<span className="studio-day__total">{t.practicePage.minutesTotal(dayMinutes)}</span>}
          </div>
          {removed&&<p className="studio-day__undo">{zh?`已删除“${removed.title}”。`:`Deleted “${removed.title}”.`} <button type="button" onClick={()=>{restoreSession(removed);setRemoved(null)}}>{zh?"撤销":"Undo"}</button></p>}
          {daySessions.length
            ?<ul className="studio-day__list">{daySessions.map(session=><li key={session.id}>
              <span className="history-day__title">{session.title}</span>
              <span className="history-day__meta">{itemTypeLabels[session.itemType]} · {Math.max(1,Math.round(session.durationSeconds/60))} {zh?"分钟":"min"}</span>
              {/* Logged by mistake? Take it out; Undo brings it back. */}
              <button type="button" className="studio-day__delete has-tip" data-tip={zh?"删除":"Delete"} aria-label={zh?`删除 ${session.title}`:`Delete ${session.title}`}
                onClick={()=>{setRemoved(session);deleteSession(session.id)}}><PracticeIcon name="delete"/></button>
              {session.reflection?.trim()&&<p className="history-day__note">{session.reflection.trim()}</p>}
            </li>)}</ul>
            :<p className="practice-card__empty">{zh?"这天没有练习记录。":"No practice logged this day."}</p>}
        </section>
      </section>
      <PitchTendencies zh={zh}/>
    </div>
  </main>;
}
