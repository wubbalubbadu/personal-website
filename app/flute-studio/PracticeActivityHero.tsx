"use client";

import {useEffect,useMemo,useState} from "react";
import {readSessions,type PracticeSession} from "./practice-data";
import {useLanguage} from "./i18n/LanguageContext";
import type {translations} from "./i18n/translations";
import "./practice-activity-hero.css";

const dayMs=86400000;
function dateKey(date:Date){return `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`}
function streaks(active:Set<string>){let current=0,cursor=new Date();while(active.has(dateKey(cursor))){current++;cursor=new Date(cursor.getTime()-dayMs)}let longest=0,run=0;for(let i=364;i>=0;i--){const day=new Date(Date.now()-i*dayMs);if(active.has(dateKey(day))){run++;longest=Math.max(longest,run)}else run=0}return {current,longest}}
function durationLabel(seconds:number,t:typeof translations["en"]){
  const minutes=Math.floor(seconds/60),remainder=seconds%60;
  if(minutes===0)return t.activity.durationSec(remainder);
  if(remainder===0)return t.activity.durationMin(minutes);
  return t.activity.durationMinSec(minutes,remainder);
}
function itemTypeLabel(type:PracticeSession["itemType"],t:typeof translations["en"]){
  const labels:Record<PracticeSession["itemType"],string>={repertoire:t.library.repertoire,exercise:t.library.exercise,etude:t.library.etude,method:t.library.method,"warm-up":t.library.warmup,focus:t.pomodoro.focus};
  return labels[type];
}

export default function PracticeActivityHero(){
  const {t,lang}=useLanguage();
  const initialPlan=t.activity.initialPlan;
  const [sessions,setSessions]=useState<PracticeSession[]>([]);
  const [monthOffset,setMonthOffset]=useState(0);
  const [hoveredDay,setHoveredDay]=useState<string|null>(null);
  const [focusedDay,setFocusedDay]=useState<string|null>(null);
  const [selectedDay,setSelectedDay]=useState<string|null>(null);
  const [done,setDone]=useState<boolean[]>(initialPlan.map(()=>false));
  const [planNote,setPlanNote]=useState("");
  const [customPlan,setCustomPlan]=useState<string[]>([]);
  useEffect(()=>{
    const update=()=>setSessions(readSessions());
    update();
    try{
      const saved=localStorage.getItem("cookie:practice-plan");
      if(saved){
        const parsed=JSON.parse(saved);
        if(Array.isArray(parsed))setDone(parsed.map(Boolean));
      }
    }catch{/* Keep the default plan when stored data is invalid. */}
    setPlanNote("");
    try{const custom=JSON.parse(localStorage.getItem("cookie:practice-plan-custom")??"[]");if(Array.isArray(custom))setCustomPlan(custom.filter(item=>typeof item==="string"))}catch{/* Ignore invalid custom plan data. */}
    window.addEventListener("cookie:practice-updated",update);
    return()=>window.removeEventListener("cookie:practice-updated",update);
  },[]);
  const data=useMemo(()=>{
    const today=new Date(),todayStart=new Date(today.getFullYear(),today.getMonth(),today.getDate()).getTime(),weekStart=todayStart-6*dayMs,minutes=(list:PracticeSession[])=>Math.round(list.reduce((n,s)=>n+s.durationSeconds,0)/60),byDay=new Map<string,number>(),sessionsByDay=new Map<string,PracticeSession[]>();
    sessions.forEach(session=>{
      const key=dateKey(new Date(session.startedAt));
      byDay.set(key,(byDay.get(key)??0)+session.durationSeconds/60);
      sessionsByDay.set(key,[...(sessionsByDay.get(key)??[]),session]);
    });
    sessionsByDay.forEach(daySessions=>daySessions.sort((a,b)=>new Date(a.startedAt).getTime()-new Date(b.startedAt).getTime()));
    const active=new Set([...byDay].filter(([,value])=>value>0).map(([key])=>key));
    return {todayMinutes:minutes(sessions.filter(s=>new Date(s.startedAt).getTime()>=todayStart)),weekMinutes:minutes(sessions.filter(s=>new Date(s.startedAt).getTime()>=weekStart)),byDay,sessionsByDay,streak:streaks(active)};
  },[sessions]);
  const shown=new Date(new Date().getFullYear(),new Date().getMonth()+monthOffset,1),daysInMonth=new Date(shown.getFullYear(),shown.getMonth()+1,0).getDate(),leading=shown.getDay(),cells=Array.from({length:42},(_,i)=>{const day=i-leading+1;return day>0&&day<=daysInMonth?new Date(shown.getFullYear(),shown.getMonth(),day):null}),level=(value:number)=>value===0?0:value<10?1:value<25?2:value<45?3:4;
  const visibleDay=hoveredDay??focusedDay??selectedDay;
  const moveMonth=(delta:number)=>{
    setMonthOffset(current=>Math.min(0,current+delta));
    setHoveredDay(null);
    setFocusedDay(null);
    setSelectedDay(null);
  };
  function check(index:number){
    setDone(current=>{
      const next=current.map((value,itemIndex)=>itemIndex===index?!value:value);
      localStorage.setItem("cookie:practice-plan",JSON.stringify(next));
      return next;
    });
  }
  function addFocus(){const value=planNote.trim();if(!value)return;setCustomPlan(current=>{const next=[...current,value];localStorage.setItem("cookie:practice-plan-custom",JSON.stringify(next));return next});setDone(current=>{const next=[...current,false];localStorage.setItem("cookie:practice-plan",JSON.stringify(next));return next});setPlanNote("")}
  return <div className="practice-activity-hero" id="practice">
    <section className="dashboard-card activity-summary" aria-labelledby="activity-title">
      <header className="dashboard-card-heading">
        <span className="dashboard-card-icon activity-icon" aria-hidden="true">↗</span>
        <h2 id="activity-title">{t.activity.practiceActivity}</h2>
      </header>
      <div className="activity-stats">
        <article><b>{data.todayMinutes}</b><span>{t.activity.minutesToday}</span></article>
        <article><b>{data.weekMinutes}</b><span>{t.activity.minutesThisWeek}</span></article>
        <article><b>{data.streak.current}</b><span>{t.activity.currentStreak}</span></article>
        <article><b>{data.streak.longest}</b><span>{t.activity.bestStreak}</span></article>
      </div>
    </section>

    <section className="dashboard-card month-calendar" aria-labelledby="calendar-title">
      <header className="dashboard-card-heading calendar-card-heading">
        <div><span className="dashboard-card-icon calendar-icon" aria-hidden="true">▦</span><h2 id="calendar-title">{t.activity.calendar}</h2></div>
        <nav aria-label={t.activity.calendarMonthAria}>
          <button type="button" onClick={()=>moveMonth(-1)} aria-label={t.activity.previousMonth}>‹</button>
          <button type="button" onClick={()=>moveMonth(1)} disabled={monthOffset===0} aria-label={t.activity.nextMonth}>›</button>
        </nav>
      </header>
      <div className="calendar-month" aria-live="polite">{shown.toLocaleDateString(lang==="zh"?"zh-CN":undefined,{month:"long",year:"numeric"})}</div>
      <div className="weekday-row" aria-hidden="true">{["S","M","T","W","T","F","S"].map((day,index)=><span key={`${day}${index}`}>{day}</span>)}</div>
      <div className="month-grid">
        {cells.map((date,index)=>{
          if(!date)return <div className="calendar-cell empty" key={`empty-${index}`} aria-hidden="true"/>;
          const key=dateKey(date),dayMinutes=Math.round(data.byDay.get(key)??0),isSelected=key===selectedDay,isVisible=key===visibleDay,daySessions=data.sessionsByDay.get(key)??[],dayTotal=daySessions.reduce((total,session)=>total+session.durationSeconds,0),tooltipId=`practice-day-${key}`;
          return <div className="calendar-cell" key={key} onMouseEnter={()=>setHoveredDay(key)} onMouseLeave={()=>setHoveredDay(current=>current===key?null:current)}>
            <button type="button" className={`day-cell level-${level(dayMinutes)}${isSelected?" selected":""}`} onClick={()=>setSelectedDay(current=>current===key?null:key)} onFocus={()=>setFocusedDay(key)} onBlur={()=>setFocusedDay(current=>current===key?null:current)} onKeyDown={event=>{if(event.key==="Escape"){setSelectedDay(null);setHoveredDay(null);event.currentTarget.blur()}}} aria-pressed={isSelected} aria-describedby={isVisible?tooltipId:undefined} aria-label={`${date.toLocaleDateString(lang==="zh"?"zh-CN":undefined,{weekday:"long",month:"long",day:"numeric"})}: ${t.activity.minutesPracticedLabel(dayMinutes)}`}><span>{date.getDate()}</span><i aria-hidden="true"/></button>
            {isVisible?<div className="day-popover" id={tooltipId} role="tooltip">
              <div className="day-popover-heading"><strong>{date.toLocaleDateString(lang==="zh"?"zh-CN":undefined,{weekday:"short",month:"short",day:"numeric"})}</strong><span>{daySessions.length?durationLabel(dayTotal,t):t.activity.noPractice}</span></div>
              {daySessions.length?<ul>{daySessions.map(session=><li key={session.id}><div><strong>{session.title}</strong><span>{itemTypeLabel(session.itemType,t)} · {durationLabel(session.durationSeconds,t)}</span></div>{session.reflection?.trim()?<p>{session.reflection.trim()}</p>:null}</li>)}</ul>:<p className="day-popover-empty">{t.activity.nothingLogged}</p>}
            </div>:null}
          </div>;
        })}
      </div>
      <footer><span>{t.activity.minutesFooterLabel}</span><div><span>{t.activity.none}</span><i className="level-0"/><i className="level-1"/><i className="level-2"/><i className="level-3"/><i className="level-4"/><span>{t.activity.more}</span></div></footer>
    </section>

    <section className="dashboard-card practice-plan-card" aria-labelledby="plan-title">
      <header className="dashboard-card-heading">
        <span className="dashboard-card-icon plan-icon" aria-hidden="true">✓</span>
        <h2 id="plan-title">{t.activity.practicePlan}</h2>
        <b className="plan-count">{t.activity.planCount(done.filter(Boolean).length,initialPlan.length+customPlan.length)}</b>
      </header>
      <div className="plan-list">{[...initialPlan,...customPlan].map((item,index)=><label key={`${item}-${index}`} className={done[index]?"done":""}><input type="checkbox" checked={Boolean(done[index])} onChange={()=>check(index)}/><span aria-hidden="true">✓</span><b>{item}</b></label>)}</div>
      <label className="plan-note-line"><span aria-hidden="true">＋</span><input value={planNote} onChange={event=>setPlanNote(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"){event.preventDefault();addFocus()}}} placeholder={t.activity.addFocusPlaceholder} aria-label={t.activity.addFocusAria}/></label>
    </section>
  </div>;
}
