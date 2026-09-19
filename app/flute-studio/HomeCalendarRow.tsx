"use client";

import {useEffect,useState} from "react";
import {PracticeCalendar} from "./PracticeCalendar";
import {readSessions,type PracticeSession} from "./practice-data";

/**
 * The month, on the home page.
 *
 * It is the same component My Studio renders — not a second calendar that
 * happens to look similar. There used to be two, in two visual languages,
 * which is what made the page feel like it had been assembled rather than
 * designed.
 */
export default function HomeCalendarRow(){
  const [sessions,setSessions]=useState<PracticeSession[]>([]);
  useEffect(()=>{
    const update=()=>setSessions(readSessions());
    update();
    window.addEventListener("cookie:practice-updated",update);
    return()=>window.removeEventListener("cookie:practice-updated",update);
  },[]);
  return <div className="home-calendar-row"><PracticeCalendar sessions={sessions}/></div>;
}
