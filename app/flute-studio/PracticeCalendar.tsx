"use client";

import {useMemo,useState} from "react";
import {useLanguage} from "./i18n/LanguageContext";
import type {PracticeSession} from "./practice-data";
import "./practice-calendar.css";

/**
 * A month of practice, drawn from the sessions already being recorded.
 *
 * No new data and nothing to fill in: the history list below says what you
 * played, and this says whether you showed up. Those are different
 * questions, and the second one is the one you can only answer by seeing a
 * month at once.
 *
 * Intensity rather than a tick, because "practised" is not binary — five
 * minutes and ninety minutes are both days you practised, and a calendar
 * that treats them the same hides the shape of a month.
 *
 * Lives here rather than under practice/ because the home page shows the
 * same calendar. One component, so the two can never drift into looking
 * like different features.
 */
const dayKey = (value: number | string | Date) => new Date(value).toDateString();

export function PracticeCalendar({sessions}:{sessions:PracticeSession[]}){
  const {t,lang}=useLanguage();
  // Offset in months from the current one; 0 is this month.
  const [offset,setOffset]=useState(0);
  const [peek,setPeek]=useState<string|null>(null);

  const {cells,practisedDays,totalMinutes,monthLabel}=useMemo(()=>{
    const now=new Date();
    const month=new Date(now.getFullYear(),now.getMonth()+offset,1);
    const minutesByDay=new Map<string,number>();
    for(const session of sessions){
      const key=dayKey(session.startedAt);
      minutesByDay.set(key,(minutesByDay.get(key)??0)+session.durationSeconds/60);
    }
    const daysInMonth=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
    // Monday-first, which is how a practice week reads.
    const lead=(new Date(month.getFullYear(),month.getMonth(),1).getDay()+6)%7;
    const today=dayKey(now);
    const cells:{key:string;day:number|null;minutes:number;isToday:boolean}[]=[];
    for(let i=0;i<lead;i+=1)cells.push({key:`lead-${i}`,day:null,minutes:0,isToday:false});
    let practisedDays=0,totalMinutes=0;
    for(let day=1;day<=daysInMonth;day+=1){
      const date=new Date(month.getFullYear(),month.getMonth(),day);
      const key=dayKey(date);
      const minutes=Math.round(minutesByDay.get(key)??0);
      if(minutes>0){practisedDays+=1;totalMinutes+=minutes}
      cells.push({key,day,minutes,isToday:key===today});
    }
    return {
      cells,practisedDays,totalMinutes,
      monthLabel:month.toLocaleDateString(lang==="zh"?"zh-CN":undefined,{month:"long",year:"numeric"}),
    };
  },[sessions,offset,lang]);

  // Four bands, not a gradient: the eye reads "more than yesterday" from a
  // step far better than from a slightly darker green.
  const level=(minutes:number)=>minutes===0?0:minutes<15?1:minutes<40?2:3;
  const weekdays=lang==="zh"?["一","二","三","四","五","六","日"]:["M","T","W","T","F","S","S"];

  return <section className="practice-card calendar-card" aria-labelledby="calendar-title">
    {/* The heading IS the month. It used to read "This month" with the
        real month repeated beside it, which stopped being true the moment
        you pressed the back arrow. */}
    <div className="practice-card__heading">
      <h2 id="calendar-title">{monthLabel}</h2>
      <div className="calendar-card__nav">
        <button type="button" aria-label={t.practicePage.calendarPrev} onClick={()=>setOffset(value=>value-1)}>‹</button>
        <button type="button" aria-label={t.practicePage.calendarNext} disabled={offset>=0} onClick={()=>setOffset(value=>value+1)}>›</button>
      </div>
    </div>
    <div className="calendar-grid" role="grid" aria-label={monthLabel}>
      {weekdays.map((label,index)=><span className="calendar-grid__weekday" key={`${label}-${index}`} aria-hidden="true">{label}</span>)}
      {cells.map(cell=>cell.day===null
        ?<span className="calendar-grid__cell is-empty" key={cell.key} aria-hidden="true"/>
        :<span
          key={cell.key}
          className={`calendar-grid__cell${cell.isToday?" is-today":""}`}
          data-level={level(cell.minutes)}
          role="gridcell"
          aria-label={cell.minutes?`${cell.day}: ${t.practicePage.calendarMinutes(cell.minutes)}`:`${cell.day}`}
          {...(cell.minutes?{
            // Only days you actually practised are worth landing on — an
            // empty square has nothing to read out, and making all thirty
            // focusable would bury the rest of the page in tab stops.
            tabIndex:0,
            onMouseEnter:()=>setPeek(`${cell.day} · ${t.practicePage.calendarMinutes(cell.minutes)}`),
            onMouseLeave:()=>setPeek(null),
            onFocus:()=>setPeek(`${cell.day} · ${t.practicePage.calendarMinutes(cell.minutes)}`),
            onBlur:()=>setPeek(null),
          }:{})}
        >{cell.day}</span>)}
    </div>
    {/* Reads out under the grid rather than as a native tooltip — those
        arrive late, sit wherever the OS puts them, and cannot be styled. */}
    <p className="calendar-card__summary">
      {peek??(practisedDays
        ?`${t.practicePage.calendarDaysPractised(practisedDays)} · ${t.practicePage.calendarMinutes(totalMinutes)}`
        :t.practicePage.calendarEmpty)}
    </p>
  </section>;
}
