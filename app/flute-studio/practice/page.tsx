"use client";

import {useEffect,useState} from "react";
import {useLanguage} from "../i18n/LanguageContext";
import {usePomodoro,formatClock} from "../usePomodoro";
import {readSessions,type PracticeSession} from "../practice-data";
import "./practice-page.css";

const routineKey="cookie:practice-routine";
type RoutineItem={id:string;text:string;done?:boolean};

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
  const {t,lang}=useLanguage();
  const pomodoro=usePomodoro();
  const [routine,setRoutine]=useState<RoutineItem[]>([]);
  const [routineInput,setRoutineInput]=useState("");
  const [sessions,setSessions]=useState<PracticeSession[]>([]);

  useEffect(()=>{
    setRoutine(readRoutine());
    const update=()=>setSessions(readSessions());
    update();
    window.addEventListener("cookie:practice-updated",update);
    return()=>window.removeEventListener("cookie:practice-updated",update);
  },[]);

  function saveRoutine(next:RoutineItem[]){setRoutine(next);localStorage.setItem(routineKey,JSON.stringify(next))}
  function addRoutineStep(){const text=routineInput.trim();if(!text)return;saveRoutine([...routine,{id:crypto.randomUUID(),text,done:false}]);setRoutineInput("")}
  function removeRoutineStep(id:string){saveRoutine(routine.filter(item=>item.id!==id))}
  function toggleRoutineStep(id:string){saveRoutine(routine.map(item=>item.id===id?{...item,done:!item.done}:item))}

  const itemTypeLabels:Record<PracticeSession["itemType"],string>={repertoire:t.library.repertoire,exercise:t.library.exercise,etude:t.library.etude,method:t.library.method,"warm-up":t.library.warmup,focus:t.pomodoro.focus};
  const dayGroups=groupByDay(sessions);

  return <main className="practice-page">
    <div className="practice-page__content">
      <header className="practice-page__header">
        <p>{t.practicePage.eyebrow}</p>
        <h1>{t.practicePage.title}</h1>
        <p className="practice-page__intro">{t.practicePage.intro}</p>
      </header>

      <div className="practice-page__grid">
        <section className="practice-card focus-card" aria-labelledby="focus-timer-title">
          <h2 id="focus-timer-title">{t.practicePage.focusTimer}</h2>
          <div className={`focus-card__mode ${pomodoro.mode}`}>{pomodoro.mode==="focus"?t.pomodoro.focus:t.pomodoro.breakLabel}</div>
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

        <section className="practice-card" aria-labelledby="routine-title">
          <div className="practice-card__heading">
            <h2 id="routine-title">{t.practicePage.routineTitle}</h2>
            {routine.length>0&&<b className="routine-count">{t.activity.planCount(routine.filter(item=>item.done).length,routine.length)}</b>}
          </div>
          <p className="practice-card__intro">{t.practicePage.routineIntro}</p>
          {routine.length?
            <ol className="routine-list">{routine.map(item=><li key={item.id} className={item.done?"done":""}>
              <label className="routine-list__check">
                <input type="checkbox" checked={Boolean(item.done)} onChange={()=>toggleRoutineStep(item.id)} aria-label={t.practicePage.markStepDone(item.text)}/>
                <span aria-hidden="true">✓</span>
              </label>
              <span className="routine-list__text">{item.text}</span>
              <button type="button" aria-label={t.practicePage.removeStep(item.text)} onClick={()=>removeRoutineStep(item.id)}>×</button>
            </li>)}</ol>:
            <p className="practice-card__empty">{t.practicePage.routineEmpty}</p>}
          <label className="routine-add">
            <span aria-hidden="true">＋</span>
            <input value={routineInput} onChange={e=>setRoutineInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addRoutineStep()}}} placeholder={t.practicePage.routineAddPlaceholder} aria-label={t.practicePage.routineAddAria}/>
          </label>
        </section>
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
