"use client";

import {useEffect,useMemo,useState} from "react";
import {readSessions,type PracticeSession} from "./practice-data";
import "./practice-activity-hero.css";

const dayMs=86400000;
function dateKey(date:Date){return `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`}
function streaks(active:Set<string>){let current=0,cursor=new Date();while(active.has(dateKey(cursor))){current++;cursor=new Date(cursor.getTime()-dayMs)}let longest=0,run=0;for(let i=364;i>=0;i--){const day=new Date(Date.now()-i*dayMs);if(active.has(dateKey(day))){run++;longest=Math.max(longest,run)}else run=0}return {current,longest}}
function durationLabel(seconds:number){
  const minutes=Math.floor(seconds/60),remainder=seconds%60;
  if(minutes===0)return `${remainder} sec`;
  if(remainder===0)return `${minutes} min`;
  return `${minutes} min ${remainder} sec`;
}
function itemTypeLabel(type:PracticeSession["itemType"]){return type.replace("-"," ").replace(/^./,letter=>letter.toUpperCase())}

export default function PracticeActivityHero(){
  const todayKey=dateKey(new Date());
  const [sessions,setSessions]=useState<PracticeSession[]>([]),[monthOffset,setMonthOffset]=useState(0),[selectedDay,setSelectedDay]=useState<string|null>(todayKey);
  useEffect(()=>{const update=()=>setSessions(readSessions());update();window.addEventListener("cookie:practice-updated",update);return()=>window.removeEventListener("cookie:practice-updated",update)},[]);
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
  const selectedDate=selectedDay?cells.find((date):date is Date=>Boolean(date&&dateKey(date)===selectedDay))??null:null;
  const selectedSessions=selectedDay?data.sessionsByDay.get(selectedDay)??[]:[];
  const selectedTotal=selectedSessions.reduce((total,session)=>total+session.durationSeconds,0);
  const moveMonth=(delta:number)=>{
    const next=Math.min(0,monthOffset+delta);
    setMonthOffset(next);
    setSelectedDay(next===0?todayKey:null);
  };
  return (
    <div className="practice-activity-hero">
      <div className="activity-summary">
        <span>YOUR PRACTICE ACTIVITY</span>
        <h2>{data.streak.current?`${data.streak.current} days in a row.`:"Start with one focused session."}</h2>
        <div className="activity-stats">
          <article><b>{data.todayMinutes}</b><span>min today</span></article>
          <article><b>{data.weekMinutes}</b><span>min this week</span></article>
          <article><b>{data.streak.current}</b><span>current streak</span></article>
          <article><b>{data.streak.longest}</b><span>best streak</span></article>
        </div>
      </div>
      <section className="month-calendar" aria-label="Monthly practice calendar">
        <header>
          <button type="button" onClick={()=>moveMonth(-1)} aria-label="Previous month">‹</button>
          <strong>{shown.toLocaleDateString(undefined,{month:"long",year:"numeric"})}</strong>
          <button type="button" onClick={()=>moveMonth(1)} disabled={monthOffset===0} aria-label="Next month">›</button>
        </header>
        <div className="weekday-row" aria-hidden="true">{["S","M","T","W","T","F","S"].map((day,index)=><span key={`${day}${index}`}>{day}</span>)}</div>
        <div className="month-grid">
          {cells.map((date,index)=>{
            if(!date)return <span className="day-cell empty" key={`empty-${index}`} aria-hidden="true"/>;
            const key=dateKey(date),dayMinutes=Math.round(data.byDay.get(key)??0),isSelected=key===selectedDay;
            return <button type="button" key={key} className={`day-cell level-${level(dayMinutes)}${isSelected?" selected":""}`} onClick={()=>setSelectedDay(key)} aria-pressed={isSelected} aria-label={`${date.toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"})}: ${dayMinutes} minutes practiced`}><span>{date.getDate()}</span><i aria-hidden="true"/></button>;
          })}
        </div>
        <footer><span>Minutes practiced</span><div>None <i className="level-0"/><i className="level-1"/><i className="level-2"/><i className="level-3"/><i className="level-4"/> More</div></footer>
        <div className="selected-day-detail" aria-live="polite">
          {selectedDate?<>
            <div className="selected-day-heading"><strong>{selectedDate.toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"})}</strong><span>{selectedSessions.length?durationLabel(selectedTotal):"No practice"}</span></div>
            {selectedSessions.length?<ul>{selectedSessions.map(session=><li key={session.id}><div><strong>{session.title}</strong><span>{itemTypeLabel(session.itemType)} · {durationLabel(session.durationSeconds)}</span></div>{session.reflection?.trim()?<p>{session.reflection.trim()}</p>:null}</li>)}</ul>:<p className="selected-day-empty">Nothing was logged on this day.</p>}
          </>:<p className="selected-day-empty select-prompt">Select a day to see that day’s practice.</p>}
        </div>
      </section>
    </div>
  )
}
