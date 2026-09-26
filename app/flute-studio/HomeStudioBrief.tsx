"use client";

import {useEffect,useState} from "react";
import Link from "next/link";
import {readSessions,type PracticeSession} from "./practice-data";
import {readPitchHistory,noteTendencies,focusNotes,correctedNotes,habits,PITCH_UPDATED,LONG_NOTE_MS,type PitchRecord} from "./lib/pitchHistory";
import {useLanguage} from "./i18n/LanguageContext";

const WEEK_MS=7*24*60*60*1000;

/**
 * A few lines from My Studio on the home page: how much you practised this
 * week, which notes still sit off pitch, and one long-tone habit. It replaces
 * the bare month calendar, which showed dates but said nothing about the playing.
 * Everything comes from what was actually recorded; empty states say how to fill it.
 */
export default function HomeStudioBrief(){
  const {lang}=useLanguage(),zh=lang==="zh";
  const [sessions,setSessions]=useState<PracticeSession[]|null>(null),[pitch,setPitch]=useState<PitchRecord[]>([]),[now,setNow]=useState(0);
  useEffect(()=>{
    const load=()=>{setSessions(readSessions());setPitch(readPitchHistory());setNow(Date.now())};
    load();
    window.addEventListener("cookie:practice-updated",load);window.addEventListener(PITCH_UPDATED,load);window.addEventListener("storage",load);
    return()=>{window.removeEventListener("cookie:practice-updated",load);window.removeEventListener(PITCH_UPDATED,load);window.removeEventListener("storage",load)};
  },[]);
  if(sessions===null)return null;

  const week=sessions.filter(s=>now-new Date(s.startedAt).getTime()<WEEK_MS);
  const minutes=Math.round(week.reduce((sum,s)=>sum+s.durationSeconds,0)/60);
  const days=new Set(week.map(s=>new Date(s.startedAt).toDateString())).size;
  const latest=sessions.slice().sort((a,b)=>new Date(b.startedAt).getTime()-new Date(a.startedAt).getTime())[0];

  const tendencies=noteTendencies(pitch),focus=focusNotes(tendencies).slice(0,3),fixed=correctedNotes(tendencies).slice(0,2);
  const habit=habits(pitch);

  return <section className="studio-brief" aria-label={zh?"我的练习":"From My Studio"}>
    <div className="continue-panel">
      <Link className="continue-section" href="/flute-studio/practice">
        <p><i className="continue-dot tone-green"/>{zh?"本周":"This week"}</p>
        {week.length
          ?<><b>{zh?`${minutes} 分钟，${days} 天`:`${minutes} min over ${days} ${days===1?"day":"days"}`}</b><small>{zh?`最近：${latest.title}`:`Last: ${latest.title}`}</small></>
          :<><b>{zh?"这周还没有练习":"No practice logged this week"}</b><small>{zh?"在任何曲谱或练习里开始计时。":"Start the timer in any piece or exercise."}</small></>}
      </Link>
      <Link className="continue-section" href="/flute-studio/practice#pitch">
        <p><i className="continue-dot tone-pink"/>{zh?"要练的音":"Notes to work on"}</p>
        {focus.length
          ?<><div className="studio-brief__pitch">{focus.map(t=><span key={t.midi} className={t.final<0?"is-flat":"is-sharp"}>{t.pitch}<small>{zh?(t.final<0?"偏低":"偏高"):(t.final<0?"flat":"sharp")}</small></span>)}</div><small>{zh?"多次练习后仍然不准的音。":"Still off after you retry them."}</small></>
          :fixed.length
          ?<><b>{zh?`${fixed.map(t=>t.pitch).join("、")} 你会自己调准`:`You fix ${fixed.map(t=>t.pitch).join(" and ")} yourself`}</b><small>{zh?"第一次常偏，之后你会调回来。":"Your first try leans, then you bring it in."}</small></>
          :pitch.length
          ?<><b>{zh?"目前没有总是不准的音":"No note is consistently off"}</b><small>{zh?`已记录 ${pitch.length} 个音。`:`From ${pitch.length} notes so far.`}</small></>
          :<><b>{zh?"还没有音准记录":"No pitch data yet"}</b><small>{zh?"在长音练习里打开“音准”。":"Turn on Pitch in Long tones."}</small></>}
      </Link>
      <Link className="continue-section" href="/flute-studio/practice#pitch">
        <p><i className="continue-dot tone-sage"/>{zh?"长音习惯":"Long-tone habit"}</p>
        {habit.longNotes>=5
          ?<><b>{zh?`${Math.round(habit.endingDropShare*100)}% 的长音结尾会往下掉`:`Endings drop in ${Math.round(habit.endingDropShare*100)}% of long notes`}</b><small>{zh?`一般保持 ${(habit.medianHoldMs/1000).toFixed(1)} 秒`:`You usually hold ${(habit.medianHoldMs/1000).toFixed(1)} s`}</small></>
          :<><b>{zh?"还需要多几个长音":"A few more long tones needed"}</b><small>{zh?`超过 ${LONG_NOTE_MS/1000} 秒的音，才会计入这里。`:`Notes held over ${LONG_NOTE_MS/1000} s count here.`}</small></>}
      </Link>
    </div>
  </section>;
}
