"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import {useLanguage} from "../i18n/LanguageContext";
import {usePomodoro,formatClock} from "../usePomodoro";
import {readSessions,type PracticeSession} from "../practice-data";
import {useRecents,useSavedItems} from "../lib/storage";
import {musicLibrary} from "../../../content/music-library";
import {exerciseCatalog} from "../../../content/exercise-catalog";
import {PracticeCalendar} from "../PracticeCalendar";
import {PitchTendencies} from "./PitchTendencies";
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
type RoutineItem={id:string;text:string;done?:boolean;ref?:string};
type StudioListItem={id:string;title:string;composer:string;category:string;viewerPath:string|null};

function readRoutine():RoutineItem[]{try{const saved=JSON.parse(localStorage.getItem(routineKey)??"[]");return Array.isArray(saved)?saved:[]}catch{return []}}

function groupByDay(sessions:PracticeSession[]){
  const groups=new Map<string,PracticeSession[]>();
  sessions.forEach(session=>{
    const key=new Date(session.startedAt).toDateString();
    groups.set(key,[...(groups.get(key)??[]),session]);
  });
  return [...groups.entries()].sort((a,b)=>new Date(b[0]).getTime()-new Date(a[0]).getTime());
}

export default function PracticePage(){
  const {t,lang}=useLanguage(),zh=lang==="zh";
  const pomodoro=usePomodoro();
  const [routine,setRoutine]=useState<RoutineItem[]>([]);
  const [routineInput,setRoutineInput]=useState("");
  const [sessions,setSessions]=useState<PracticeSession[]>([]);
  // Captured once on mount rather than read during render: "today" is a
  // clock read, and rendering has to be pure for the same input.
  const [now,setNow]=useState(0);
  // Both already exist and are already written to — the score viewer records
  // every piece it opens, and the star control writes favourites. Nothing
  // was reading them back anywhere you could actually browse.
  const {ids:recentIds}=useRecents("music",8);
  const {items:savedIds}=useSavedItems("music");

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
  function addRoutineStep(){const text=routineInput.trim();if(!text)return;saveRoutine([...routine,{id:crypto.randomUUID(),text,done:false}]);setRoutineInput("")}
  /** Adds a real exercise or piece, keeping its id so the step can link. */
  function addRoutineItem(libraryId:string){
    const item=byId.get(libraryId);
    if(!item)return;
    saveRoutine([...routine,{id:crypto.randomUUID(),text:item.title,ref:item.id,done:false}]);
  }
  function removeRoutineStep(id:string){saveRoutine(routine.filter(item=>item.id!==id))}
  function toggleRoutineStep(id:string){saveRoutine(routine.map(item=>item.id===id?{...item,done:!item.done}:item))}

  const itemTypeLabels:Record<PracticeSession["itemType"],string>={repertoire:t.library.repertoire,exercise:t.library.exercise,etude:t.library.etude,method:t.library.method,"warm-up":t.library.warmup,focus:t.pomodoro.focus};
  const dayGroups=groupByDay(sessions);
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
  const exerciseItems:StudioListItem[]=exerciseCatalog.map(item=>({id:item.id,title:zh?item.zhTitle:item.title,composer:zh?"练习":"Exercise",category:"exercise",viewerPath:item.href}));
  const byId=new Map<string,StudioListItem>([...musicLibrary,...exerciseItems].map(item=>[item.id,item]));
  const recentItems=recentIds.map(id=>byId.get(id)).filter((item):item is StudioListItem=>!!item);
  const savedItems=savedIds.map(id=>byId.get(id)).filter((item):item is StudioListItem=>!!item);

  return <main className="practice-page">
    <div className="practice-page__content">
      <header className="practice-page__header">
        <p>{t.practicePage.eyebrow}</p>
        <h1>{t.practicePage.title}</h1>
        <p className="practice-page__intro">{t.practicePage.intro}</p>
      </header>

      <section className="practice-card stats-card" aria-label={zh?"练习统计":"Practice at a glance"}>
        <ul className="stats-row">
          {stats.map(stat=><li key={stat.label}>
            <b>{stat.value}<span>{stat.unit}</span></b>
            <small>{stat.label}</small>
          </li>)}
        </ul>
      </section>

      <PitchTendencies zh={zh}/>

      <div className="practice-page__grid">
        <div className="practice-page__column">
        <section className="practice-card focus-card" aria-labelledby="focus-timer-title">
          <h2 id="focus-timer-title">{t.practicePage.focusTimer}</h2>
          {/* Only worth saying when it is NOT the focus clock. */}
          {pomodoro.mode!=="focus"&&<div className="focus-card__mode break">{t.pomodoro.breakLabel}</div>}
          <div className="focus-card__clock">{formatClock(pomodoro.remaining)}</div>
          {pomodoro.canEditDuration&&<div className="focus-card__duration">
            <button type="button" aria-label={t.pomodoro.decreaseFocus} onClick={()=>pomodoro.adjustFocusMinutes(-5)} disabled={pomodoro.focusMinutes<=pomodoro.minFocusMinutes}>−</button>
            <span>{pomodoro.focusMinutes} min</span>
            <button type="button" aria-label={t.pomodoro.increaseFocus} onClick={()=>pomodoro.adjustFocusMinutes(5)} disabled={pomodoro.focusMinutes>=pomodoro.maxFocusMinutes}>+</button>
          </div>}
          <div className="focus-card__actions">
            <button type="button" className="focus-card__reset has-tip" data-tip={t.pomodoro.reset} aria-label={t.pomodoro.reset} onClick={pomodoro.reset}>
              <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M15.5 6.5A6 6 0 1 0 16.9 12"/><path d="M15.5 2.5v4.5H11"/></svg>
            </button>
            <button type="button" className="focus-card__primary" onClick={pomodoro.running?pomodoro.pause:pomodoro.start}>
              {pomodoro.running?t.pomodoro.pause:t.pomodoro.start}
            </button>
          </div>
          <small>{t.pomodoro.roundsDone(pomodoro.rounds)}</small>
        </section>

        {/* The calendar answers "did I show up"; the history below answers
            "what did I play". It sits in this column because a month of
            30px days is 234px wide — spanning the page left it stranded in
            empty card. */}
        <PracticeCalendar sessions={sessions}/>
        </div>

        <div className="practice-page__column">
        <section className="practice-card" aria-labelledby="routine-title">
          <div className="practice-card__heading">
            <h2 id="routine-title">{t.practicePage.routineTitle}</h2>
            {routine.length>0&&<b className="routine-count">{t.activity.planCount(routine.filter(item=>item.done).length,routine.length)}</b>}
          </div>
          {routine.length?
            <ol className="routine-list">{routine.map(item=><li key={item.id} className={item.done?"done":""}>
              <label className="routine-list__check">
                <input type="checkbox" checked={Boolean(item.done)} onChange={()=>toggleRoutineStep(item.id)} aria-label={t.practicePage.markStepDone(item.text)}/>
                <span aria-hidden="true">✓</span>
              </label>
              {item.ref&&byId.get(item.ref)?.viewerPath
                ?<Link className="routine-list__text routine-list__text--link" href={byId.get(item.ref)!.viewerPath!}>{item.text}</Link>
                :<span className="routine-list__text">{item.text}</span>}
              <button type="button" aria-label={t.practicePage.removeStep(item.text)} onClick={()=>removeRoutineStep(item.id)}>×</button>
            </li>)}</ol>:
            <p className="practice-card__empty">{zh?"还没有步骤。":"No steps yet."}</p>}
          <label className="routine-add">
            <span aria-hidden="true">＋</span>
            <input value={routineInput} onChange={e=>setRoutineInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addRoutineStep()}}} placeholder={t.practicePage.routineAddPlaceholder} aria-label={t.practicePage.routineAddAria}/>
          </label>
          {/* A routine is mostly real exercises and pieces, so they can be
              picked rather than retyped — and a picked step links to the
              thing it names. Free text still works for everything else. */}
          <label className="routine-pick">
            <span>{zh?"或选择":"or pick"}</span>
            <select value="" onChange={e=>{addRoutineItem(e.target.value);e.currentTarget.value=""}} aria-label={zh?"添加练习或曲目":"Add an exercise or piece"}>
              <option value="">{zh?"练习或曲目…":"Exercise or piece\u2026"}</option>
              <optgroup label={zh?"练习":"Exercises"}>
                {exerciseItems.filter(item=>item.viewerPath).map(item=><option key={item.id} value={item.id}>{item.title}</option>)}
              </optgroup>
              <optgroup label={zh?"曲目":"Music"}>
                {musicLibrary.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}
              </optgroup>
            </select>
          </label>
        </section>
        <section className="practice-card" aria-labelledby="recent-title">
          <h2 id="recent-title">{zh?"最近打开":"Recently opened"}</h2>
          {recentItems.length
            ?<ul className="studio-mini-list">{recentItems.map(item=><li key={item.id}>
              {item.viewerPath?<Link href={item.viewerPath}>
                <strong>{item.title}</strong><small>{item.composer}</small>
              </Link>:<span className="is-disabled"><strong>{item.title}</strong><small>{item.composer}</small></span>}
            </li>)}</ul>
            :<p className="practice-card__empty">{zh?"还没有打开过谱子。":"Nothing opened yet."}</p>}
        </section>

        <section className="practice-card" aria-labelledby="saved-title">
          <h2 id="saved-title">{zh?"已收藏":"Saved"}</h2>
          {savedItems.length
            ?<ul className="studio-mini-list">{savedItems.map(item=><li key={item.id}>
              {item.viewerPath?<Link href={item.viewerPath}>
                <strong>{item.title}</strong><small>{item.composer}</small>
              </Link>:<span className="is-disabled"><strong>{item.title}</strong><small>{item.composer}</small></span>}
            </li>)}</ul>
            :<p className="practice-card__empty">{zh?"还没有收藏。":"Nothing saved yet \u2014 tap the star on a piece or exercise."}</p>}
        </section>
        </div>
      </div>

      <section className="practice-card history-card" aria-labelledby="history-title">
        <h2 id="history-title">{t.practicePage.historyTitle}</h2>
        {dayGroups.length?
          <div className="history-list">{dayGroups.map(([day,daySessions])=>{
            const totalMinutes=Math.round(daySessions.reduce((sum,s)=>sum+s.durationSeconds,0)/60);
            return <article className="history-day" key={day}>
              <header>
                <strong>{new Date(day).toLocaleDateString(lang==="zh"?"zh-CN":undefined,{weekday:"long",month:"long",day:"numeric"})}</strong>
                <span>{t.practicePage.sessionsOn(daySessions.length)} · {t.practicePage.minutesTotal(totalMinutes)}</span>
              </header>
              <ul>{daySessions.map(session=><li key={session.id}>
                <div className="history-day__row">
                  <span className="history-day__title">{session.title}</span>
                  <span className="history-day__meta">{itemTypeLabels[session.itemType]} · {Math.max(1,Math.round(session.durationSeconds/60))} min</span>
                </div>
                {session.reflection?.trim()&&<p className="history-day__note"><span>{t.practicePage.notesLabel}:</span> {session.reflection.trim()}</p>}
              </li>)}</ul>
            </article>;
          })}</div>:
          <p className="practice-card__empty">{t.practicePage.historyEmpty}</p>}
      </section>
    </div>
  </main>;
}
