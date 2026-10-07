"use client";
import {useEffect,useRef,useState} from "react";
import {usePathname} from "next/navigation";
import {useLanguage} from "./i18n/LanguageContext";
import {usePrivateMusic} from "./lib/privateMusic";
import {usePracticeClock,usePendingSessions,clockTimes,formatClock,startClock,pauseClock,resumeClock,stopClock,type ClockTarget} from "./lib/practiceClock";
import {RecordingPanel} from "./components/RecordingPanel";
import {SessionReview} from "./components/SessionReview";
import "./practice-recorder.css";
import {musicLibrary} from "../../content/music-library";
import {exerciseCatalog} from "../../content/exercise-catalog";
import "./practice-clock-button.css";

/**
 * The practice clock in the top bar, beside the tools. On a piece or exercise it times that piece or exercise; anywhere
 * else it times "Practice". While it runs the time is on the button itself (no panel to open): tap it to pause or
 * resume, and the square beside it stops the clock; then it asks whether to save that practice (with a note). It is the same clock as My Studio's Today's
 * practice card, so a session started here shows there, and a routine step that is this piece counts this time.
 */
export default function PracticeClockButton(){
  const {lang}=useLanguage(),zh=lang==="zh",pathname=usePathname();
  const clock=usePracticeClock(),pending=usePendingSessions(),privateMusic=usePrivateMusic();
  const [now,setNow]=useState(0),[shown,setShown]=useState(false);
  const anchor=useRef<HTMLButtonElement|null>(null),idle=clock===null;
  // Whether this copy of the button is the one on screen (checked when something is waiting to be saved).
  useEffect(()=>{
    const check=()=>setShown(!!anchor.current&&anchor.current.getClientRects().length>0);
    const frame=requestAnimationFrame(check);
    return()=>cancelAnimationFrame(frame);
  },[pending.length,pathname,idle]);
  useEffect(()=>{
    const tick=()=>setNow(Date.now());
    tick();
    if(!clock?.running)return;
    const id=window.setInterval(tick,1000);return()=>window.clearInterval(id);
  },[clock?.running]);

  // What this page is: an exercise (by its address) or a piece (by its score page's address).
  const exercise=exerciseCatalog.find(entry=>entry.href&&pathname===entry.href);
  const piece=[...musicLibrary,...privateMusic.items].find(entry=>entry.viewerPath&&pathname===entry.viewerPath);
  const here:ClockTarget|null=exercise?{title:zh?exercise.zhTitle:exercise.title,ref:exercise.id,itemType:"exercise"}:piece?{title:piece.title,ref:piece.id,itemType:"repertoire"}:null;
  const fallback=zh?"练习":"Practice";

  // A finished stretch waits for Save or Discard. My Studio asks inside its practice card; everywhere else the clock asks,
  // in the recorder's floating panel, from whichever clock button is on screen (the reader keeps a hidden copy in the studio bar).
  const panel=pending.length>0&&shown&&pathname!=="/flute-studio/practice"
    ?<RecordingPanel anchor={anchor} role="dialog" label={zh?"保存这次练习？":"Save this practice?"}><SessionReview zh={zh}/></RecordingPanel>:null;

  if(!clock){
    const label=here?(zh?`给“${here.title}”计时`:`Time ${here.title}`):(zh?"开始练习计时":"Start the practice clock");
    return <><button ref={anchor} type="button" className="practice-clock-button has-tip" data-tip={label} aria-label={label} onClick={()=>startClock(here??{title:fallback},fallback)}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.6 1.8"/><path d="M9.5 3h5"/><path d="M12 3v3"/></svg>
    </button>{panel}</>;
  }
  const time=formatClock(clockTimes(clock,now).target),title=clock.target.title||fallback;
  return <div className={`practice-clock-running${clock.running?"":" is-paused"}`}>
    <button ref={anchor} type="button" className="practice-clock-running__time has-tip" data-tip={clock.running?(zh?`暂停 · ${title}`:`Pause · ${title}`):(zh?`继续 · ${title}`:`Resume · ${title}`)}
      aria-label={clock.running?(zh?`暂停计时，${title}，${time}`:`Pause the clock, ${title}, ${time}`):(zh?`继续计时，${title}，${time}`:`Resume the clock, ${title}, ${time}`)}
      onClick={clock.running?pauseClock:resumeClock}>
      <i aria-hidden="true"/>{time}
    </button>
    <button type="button" className="practice-clock-running__stop has-tip" data-tip={zh?"结束":"Stop"} aria-label={zh?`结束 ${title}`:`Stop ${title}`} onClick={()=>stopClock(fallback)}>
      <span aria-hidden="true"/>
    </button>
    {panel}
  </div>;
}
