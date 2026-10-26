"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {useLanguage} from "./i18n/LanguageContext";
import {usePrivateMusic} from "./lib/privateMusic";
import {useStatusEntries} from "./lib/musicStatus";
import {activeBits,useTrickyBits} from "./lib/trickyBits";
import {useRecents} from "./lib/storage";
import {useDeadlines} from "./lib/deadlines";
import {repDay,useRepLog} from "./lib/repLog";
import {practiceDay,readSessions,routineForDay,type PracticeSession,type RoutineItem} from "./practice-data";
import {musicLibrary as publicMusic,libraryShelf as publicShelf,pieceTitle} from "../../content/music-library";
import TrickyPreview from "./tricky-bits/TrickyPreview";
import {HomeTodayCard} from "./HomeTodayCard";
import "./components/status-button.css";
import "./components/tag-pill.css";
import "./home-studio-cards.css";

const DAY_MS=86400000;

/**
 * Your studio at a glance on Home: four cards in the home preview card's shape (a picture on top, words below),
 * each one tap into its section of My Studio (or the bit). A card only appears when it has something real in it,
 * and with nothing yet the whole section (heading too) stays hidden. My Studio keeps the full, open detail; these are only the summary.
 */
export default function HomeStudioCards(){
  const {lang,t}=useLanguage(),zh=lang==="zh";
  const privateMusic=usePrivateMusic();
  // Passages marked done are finished with: Home only offers the ones you are still working on.
  const entries=useStatusEntries(),{bits:allBits}=useTrickyBits(),bits=activeBits(allBits),deadlines=useDeadlines(),repLog=useRepLog();
  const {ids:recentIds}=useRecents("music",8);
  const [sessions,setSessions]=useState<PracticeSession[]|null>(null),[routine,setRoutine]=useState<RoutineItem[]>([]),[now,setNow]=useState(0);
  useEffect(()=>{
    const load=()=>{
      setSessions(readSessions());setNow(Date.now());
      try{const saved=JSON.parse(localStorage.getItem("cookie:practice-routine")??"[]");setRoutine(Array.isArray(saved)?saved:[])}catch{setRoutine([])}
    };
    load();
    window.addEventListener("cookie:practice-updated",load);window.addEventListener("storage",load);
    return()=>{window.removeEventListener("cookie:practice-updated",load);window.removeEventListener("storage",load)};
  },[]);
  if(sessions===null||!now)return null;

  const library=[...publicMusic,...publicShelf,...privateMusic.items];

  // Today (HomeTodayCard): where you left off, working on, the nearest deadline, a warm-up set, the routine.
  const today=practiceDay(now),steps=routineForDay(routine,sessions,today),done=steps.filter(step=>step.doneOn===today).length;
  const todayCard=<HomeTodayCard key="today" zh={zh} now={now} library={library} recentIds={recentIds} statuses={entries} deadlines={deadlines} routine={{steps,done,today}} passages={bits}/>;

  // Tricky bits: the one you saved last, drawn.
  const latest=[...bits].sort((a,b)=>b.addedAt-a.addedAt)[0];
  const latestPiece=latest&&library.find(entry=>entry.id===latest.pieceId);

  // This week: minutes per day for the last seven days (today last), and reps counted.
  const week=Array.from({length:7},(_,i)=>{
    const start=new Date(new Date(now).toDateString()).getTime()-(6-i)*DAY_MS;
    const minutes=sessions.filter(s=>{const at=new Date(s.startedAt).getTime();return at>=start&&at<start+DAY_MS}).reduce((sum,s)=>sum+s.durationSeconds,0)/60;
    return {label:new Date(start).toLocaleDateString(zh?"zh-CN":undefined,{weekday:"narrow"}),minutes,reps:Object.values(repLog[repDay(start)]??{}).reduce((sum,entry)=>sum+Object.values(entry.reps).reduce((a,b)=>a+b,0),0)};
  });
  const weekMinutes=Math.round(week.reduce((sum,day)=>sum+day.minutes,0)),weekDays=week.filter(day=>day.minutes>0).length,weekReps=week.reduce((sum,day)=>sum+day.reps,0);
  const most=Math.max(1,...week.map(day=>day.minutes));

  const cards=[
    latest&&<Link key="tricky" className="preview-card studio-card" href={`/flute-studio/tricky-bits?open=${encodeURIComponent(latest.id)}`}>
      <div className="preview-card__stage studio-card__stage studio-card__stage--music">
        {latestPiece?.scorePath?<TrickyPreview scorePath={latestPiece.scorePath} from={latest.from} to={latest.to} label={`${latestPiece.title} ${latest.label}`}/>:null}
      </div>
      <div className="preview-card__copy"><b>{t.trickyBits.title}</b><small>{latestPiece?`${pieceTitle(latestPiece,zh)}, ${t.trickyBits.bars} ${latest.label}`:`${t.trickyBits.bars} ${latest.label}`}{bits.length>1?(zh?` · 共 ${bits.length} 段`:` · ${bits.length} in all`):""}</small></div>
    </Link>,
    weekDays>0&&<Link key="week" className="preview-card studio-card" href="/flute-studio/practice#insights">
      <div className="preview-card__stage studio-card__stage">
        <div className="studio-card__week" role="img" aria-label={zh?"本周每天的练习时间":"Minutes practised each day this week"}>
          {week.map((day,i)=><span key={i}><i style={{height:`${day.minutes?Math.max(8,Math.round(day.minutes/most*100)):0}%`}} data-empty={day.minutes?undefined:""}/><small>{day.label}</small></span>)}
        </div>
      </div>
      <div className="preview-card__copy"><b>{zh?"本周":"This week"}</b><small>{[zh?`${weekMinutes} 分钟`:`${weekMinutes} min`,zh?`${weekDays} 天`:`${weekDays} ${weekDays===1?"day":"days"}`,weekReps?(zh?`${weekReps} 次重复`:`${weekReps} reps`):null].filter(Boolean).join(" · ")}</small></div>
    </Link>,
  ].filter(Boolean);

  // A new visitor has nothing here yet: show nothing (not an empty state); the rest of Home is the welcome. The Today
  // card decides for itself whether it has anything; :has() hides the heading when the whole band is empty.
  return <section className="studio-band" aria-label={zh?"我的练习":"Your studio"}>
    <h2 className="home-preview__group">{zh?"我的练习":"Your studio"}</h2>
    <div className="preview-grid studio-cards">{todayCard}{cards}</div>
  </section>;
}
