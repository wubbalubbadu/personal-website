"use client";

import {PointerEvent,useEffect,useRef,useState} from "react";
import {usePomodoro,formatClock} from "./usePomodoro";
import "./cookie-pet.css";

type Point={x:number;y:number};

export default function CookiePet(){
  const {t,mode,focusMinutes,remaining,running,rounds,message,canEditDuration,minFocusMinutes,maxFocusMinutes,start,pause,reset,adjustFocusMinutes}=usePomodoro();
  const [point,setPoint]=useState<Point|null>(null);
  const [open,setOpen]=useState(false);
  const drag=useRef<{dx:number;dy:number;moved:boolean;startX:number;startY:number}|null>(null);

  useEffect(()=>{
    const saved=localStorage.getItem("cookie:pet-position");
    if(saved){try{const value=JSON.parse(saved) as Point;setPoint(value)}catch{}}
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
    if(point)localStorage.setItem("cookie:pet-position",JSON.stringify(point));
    if(!wasMoved)setOpen(current=>!current);
  }

  return <div className="cookie-pet-wrap" style={point?{left:point.x,top:point.y,right:"auto",bottom:"auto"}:undefined}>
    {message&&!open&&<div className="cookie-pet-bubble">{message}</div>}
    {open&&<section className="cookie-pomodoro" role="dialog" aria-label={t.pomodoro.title}>
      <header>
        <strong>{t.pomodoro.title}</strong>
        <button type="button" aria-label={t.pomodoro.close} onClick={()=>setOpen(false)}>×</button>
      </header>
      <div className={`cookie-pomodoro-mode ${mode}`}>{mode==="focus"?t.pomodoro.focus:t.pomodoro.breakLabel}</div>
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
    <div className="cookie-pet" role="button" tabIndex={0} aria-label="Cookie practice companion. Drag to move or click for a focus timer." onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={()=>{drag.current=null}}>
      <span className="chip c1"/><span className="chip c2"/><span className="chip c3"/><span className="chip c4"/><span className="chip c5"/>
      <i className="eye left"/><i className="eye right"/><b className="smile"/>
    </div>
  </div>;
}
