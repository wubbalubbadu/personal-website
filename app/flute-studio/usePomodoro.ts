"use client";

import {useEffect,useRef,useState} from "react";
import {useLanguage} from "./i18n/LanguageContext";
import {sessionsKey,readSessions,type PracticeSession} from "./practice-data";

export type PomodoroMode="focus"|"break";

const BREAK_SECONDS=5*60;
const MIN_FOCUS_MINUTES=5;
const MAX_FOCUS_MINUTES=60;
const roundsKey="cookie:pomodoro-rounds";
const focusMinutesKey="cookie:pomodoro-focus-minutes";

function todayKey(){return new Date().toDateString()}
function readRounds(){try{const saved=JSON.parse(localStorage.getItem(roundsKey)??"null");return saved&&saved.date===todayKey()?saved.count as number:0}catch{return 0}}
function readFocusMinutes(){const saved=Number(localStorage.getItem(focusMinutesKey));return saved>=MIN_FOCUS_MINUTES&&saved<=MAX_FOCUS_MINUTES?saved:25}
export function formatClock(seconds:number){const m=Math.floor(seconds/60),s=seconds%60;return `${m}:${String(s).padStart(2,"0")}`}

export function usePomodoro(){
  const {t}=useLanguage();
  const [mode,setMode]=useState<PomodoroMode>("focus");
  const [focusMinutes,setFocusMinutes]=useState(25);
  const [remaining,setRemaining]=useState(25*60);
  const [running,setRunning]=useState(false);
  const [rounds,setRounds]=useState(0);
  const [message,setMessage]=useState<string|null>(null);
  const bubbleTimer=useRef<number|null>(null);
  const endsAt=useRef<number|null>(null);
  const tickTimer=useRef<number|null>(null);
  const segmentStartedAt=useRef<string|null>(null);

  useEffect(()=>{
    setRounds(readRounds());
    const minutes=readFocusMinutes();
    setFocusMinutes(minutes);
    setRemaining(minutes*60);
    return()=>{if(bubbleTimer.current)window.clearTimeout(bubbleTimer.current);if(tickTimer.current)window.clearInterval(tickTimer.current)};
  },[]);

  function showMessage(text:string){setMessage(text);if(bubbleTimer.current)window.clearTimeout(bubbleTimer.current);bubbleTimer.current=window.setTimeout(()=>setMessage(null),3200)}

  function logFocusSession(durationSeconds:number){
    const session:PracticeSession={
      id:crypto.randomUUID(),
      itemId:"pomodoro-focus",
      itemType:"focus",
      title:t.pomodoro.title,
      startedAt:segmentStartedAt.current??new Date(Date.now()-durationSeconds*1000).toISOString(),
      endedAt:new Date().toISOString(),
      durationSeconds,
      reflection:"",
    };
    const sessions=[session,...readSessions()];
    localStorage.setItem(sessionsKey,JSON.stringify(sessions));
    window.dispatchEvent(new Event("cookie:practice-updated"));
  }

  function finishSegment(){
    if(tickTimer.current)window.clearInterval(tickTimer.current);
    setRunning(false);
    if(mode==="focus"){
      logFocusSession(focusMinutes*60);
      const next=rounds+1;
      setRounds(next);
      localStorage.setItem(roundsKey,JSON.stringify({date:todayKey(),count:next}));
      setMode("break");
      setRemaining(BREAK_SECONDS);
      showMessage(t.pomodoro.focusDone);
    }else{
      setMode("focus");
      setRemaining(focusMinutes*60);
      showMessage(t.pomodoro.breakDone);
    }
  }

  function tick(){
    if(!endsAt.current)return;
    const left=Math.max(0,Math.round((endsAt.current-Date.now())/1000));
    setRemaining(left);
    if(left<=0)finishSegment();
  }

  function start(){
    segmentStartedAt.current=new Date().toISOString();
    endsAt.current=Date.now()+remaining*1000;
    setRunning(true);
    if(tickTimer.current)window.clearInterval(tickTimer.current);
    tickTimer.current=window.setInterval(tick,1000);
  }

  function pause(){
    if(tickTimer.current)window.clearInterval(tickTimer.current);
    setRunning(false);
  }

  function reset(){
    if(tickTimer.current)window.clearInterval(tickTimer.current);
    setRunning(false);
    setMode("focus");
    setRemaining(focusMinutes*60);
  }

  function adjustFocusMinutes(delta:number){
    const next=Math.max(MIN_FOCUS_MINUTES,Math.min(MAX_FOCUS_MINUTES,focusMinutes+delta));
    setFocusMinutes(next);
    localStorage.setItem(focusMinutesKey,String(next));
    if(mode==="focus"&&!running)setRemaining(next*60);
  }

  return {
    t,mode,focusMinutes,remaining,running,rounds,message,
    canEditDuration:mode==="focus"&&!running,
    minFocusMinutes:MIN_FOCUS_MINUTES,maxFocusMinutes:MAX_FOCUS_MINUTES,
    start,pause,reset,adjustFocusMinutes,
  };
}
