"use client";

import {createPortal} from "react-dom";
import {usePathname} from "next/navigation";
import {PointerEvent,useEffect,useRef,useState} from "react";
import {usePomodoro,formatClock} from "./usePomodoro";
import "./cookie-pet.css";

type Point={x:number;y:number};

export default function CookiePet(){
  const lessonPage=usePathname().startsWith("/flute-studio/theory");
  const {t,focusMinutes,remaining,running,rounds,message,canEditDuration,minFocusMinutes,maxFocusMinutes,start,pause,reset,adjustFocusMinutes}=usePomodoro();
  const [savedPoint,setSavedPoint]=useState<Point|null>(null);
  const [lessonPoint,setLessonPoint]=useState<Point|null>(null);
  const [lessonHost,setLessonHost]=useState<Element|null>(null);
  const point=lessonPage?lessonPoint:savedPoint;
  const setPoint=lessonPage?setLessonPoint:setSavedPoint;
  const docked=lessonPage&&lessonHost&&!lessonPoint;
  const [open,setOpen]=useState(false);
  const [lessonText,setLessonText]=useState("");
  const drag=useRef<{dx:number;dy:number;moved:boolean;startX:number;startY:number}|null>(null);

  useEffect(()=>{
    const clamp=(p:Point)=>({x:Math.max(10,Math.min(window.innerWidth-70,p.x)),y:Math.max(76,Math.min(window.innerHeight-76,p.y))});
    const hydration=requestAnimationFrame(()=>{try{const value=JSON.parse(localStorage.getItem("cookie:pet-position")??'null');if(value&&Number.isFinite(value.x)&&Number.isFinite(value.y))setSavedPoint(clamp(value))}catch{/* Storage may be unavailable. */}});
    const lesson=(event:Event)=>{const text=(event as CustomEvent<string>).detail;setLessonText(text);setLessonHost(document.getElementById("lesson-companion"));};
    const resize=()=>{setSavedPoint(p=>p?clamp(p):p);setLessonPoint(p=>p?clamp(p):p)};
    window.addEventListener('cookie:lesson',lesson);window.addEventListener('resize',resize);
    return()=>{cancelAnimationFrame(hydration);window.removeEventListener('cookie:lesson',lesson);window.removeEventListener('resize',resize)};
  },[]);

  function down(event:PointerEvent<HTMLDivElement>){
    const rect=event.currentTarget.getBoundingClientRect();
    drag.current={dx:event.clientX-rect.left,dy:event.clientY-rect.top,moved:false,startX:event.clientX,startY:event.clientY};
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event:PointerEvent<HTMLDivElement>){
    if(!drag.current)return;
    const dragged=Math.hypot(event.clientX-drag.current.startX,event.clientY-drag.current.startY)>4;
    if(!dragged)return;
    drag.current.moved=true;
    const x=Math.max(10,Math.min(window.innerWidth-70,event.clientX-drag.current.dx));
    const y=Math.max(76,Math.min(window.innerHeight-76,event.clientY-drag.current.dy));
    setPoint({x,y});
  }
  function up(event:PointerEvent<HTMLDivElement>){
    if(!drag.current)return;
    const wasMoved=drag.current.moved;
    drag.current=null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    try{if(point&&!lessonPage)localStorage.setItem("cookie:pet-position",JSON.stringify(point))}catch{/* Dragging works without storage. */}
    if(!wasMoved&&!lessonPage)setOpen(current=>!current);
  }

  const content=<div className={`cookie-pet-wrap ${lessonText?"is-lesson-companion":""} ${docked?"is-docked":""}`} style={point?{left:point.x,top:point.y,right:"auto",bottom:"auto"}:undefined}>
    {(lessonText||(!lessonPage&&message))&&(!open||lessonPage)&&<div className="cookie-pet-bubble" role="status" style={point?{left:point.x<280?0:undefined,right:point.x<280?'auto':undefined,top:point.y<170?72:undefined,bottom:point.y<170?'auto':undefined}:undefined}>{lessonText||message}</div>}
    {open&&!lessonPage&&<section className="cookie-pomodoro" role="dialog" aria-label={t.pomodoro.title}>
      <header>
        <strong>{t.pomodoro.title}</strong>
        <button type="button" aria-label={t.pomodoro.close} onClick={()=>setOpen(false)}>×</button>
      </header>
      <div className="cookie-pomodoro-clock">{formatClock(remaining)}</div>
      {canEditDuration&&<div className="cookie-pomodoro-duration">
        <button type="button" aria-label={t.pomodoro.decreaseFocus} onClick={()=>adjustFocusMinutes(-5)} disabled={focusMinutes<=minFocusMinutes}>−</button>
        <span>{focusMinutes} min</span>
        <button type="button" aria-label={t.pomodoro.increaseFocus} onClick={()=>adjustFocusMinutes(5)} disabled={focusMinutes>=maxFocusMinutes}>+</button>
      </div>}
      <div className="cookie-pomodoro-actions">
        <button type="button" className="cookie-pomodoro-reset has-tip" data-tip={t.pomodoro.reset} aria-label={t.pomodoro.reset} onClick={reset}>
          <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M15.5 6.5A6 6 0 1 0 16.9 12"/><path d="M15.5 2.5v4.5H11"/></svg>
        </button>
        <button type="button" className="cookie-pomodoro-primary has-tip" data-tip={running?t.pomodoro.pause:t.pomodoro.start} aria-label={running?t.pomodoro.pause:t.pomodoro.start} onClick={running?pause:start}>
          {running?
            <svg viewBox="0 0 20 20" width="17" height="17" fill="currentColor"><rect x="5" y="4" width="3.5" height="12" rx="1"/><rect x="11.5" y="4" width="3.5" height="12" rx="1"/></svg>:
            <svg viewBox="0 0 20 20" width="17" height="17" fill="currentColor"><path d="M6 4.2c0-.9 1-1.5 1.8-1L15 7.3c.8.5.8 1.7 0 2.2L7.8 13.6c-.8.5-1.8-.1-1.8-1V4.2z"/></svg>}
        </button>
      </div>
      <small>{t.pomodoro.roundsDone(rounds)}</small>
    </section>}
    <div className="cookie-pet" role="button" tabIndex={0} aria-label={lessonPage?"Cookie lesson companion. Drag to move, or use arrow keys.":"Cookie practice companion. Drag to move or click for a focus timer."} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();if(!lessonPage)setOpen(v=>!v)}else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();const rect=event.currentTarget.getBoundingClientRect();setPoint({x:Math.max(10,Math.min(window.innerWidth-70,rect.left+(event.key==='ArrowRight'?15:event.key==='ArrowLeft'?-15:0))),y:Math.max(76,Math.min(window.innerHeight-76,rect.top+(event.key==='ArrowDown'?15:event.key==='ArrowUp'?-15:0)))})}}} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={()=>{drag.current=null}}>
      <span className="chip c1"/><span className="chip c2"/><span className="chip c3"/><span className="chip c4"/><span className="chip c5"/>
      <i className="eye left"/><i className="eye right"/><b className="smile"/>
    </div>
  </div>;
  return lessonPage&&lessonHost?createPortal(content,lessonHost):content;
}
