'use client';
import Link from 'next/link';
import {useEffect,type ReactNode} from 'react';
import './lesson-shell.css';

// The one "go on" control. It lives in Cookie's bubble: a quiet Skip until the step is done,
// then a filled button. `href` turns it into a link (e.g. back to the lesson list).
export type LessonNext={label:string;ready:boolean;onClick?:()=>void;onSkip?:()=>void;href?:string};

type Props={
  title:string;zh:boolean;className?:string;
  steps:string[];current:number;onJump:(index:number)=>void;
  heading:string;
  narration?:ReactNode;message:ReactNode;tone?:'correct'|'wrong'|null;
  next?:LessonNext|null;extra?:ReactNode;status?:string;
  children:ReactNode;
};

// Every lesson shares this frame: step dots, a line of narration that explains the idea, the scene,
// and Cookie's bubble (what to try, then how it went). `heading` names the scene for screen readers.
export default function LessonFrame({title,zh,className='',steps,current,onJump,heading,narration,message,tone=null,next,extra,status,children}:Props){
  // An empty lesson message docks the site's Cookie pet into #lesson-companion without its own bubble.
  useEffect(()=>{const frame=requestAnimationFrame(()=>window.dispatchEvent(new CustomEvent('cookie:lesson',{detail:''})));return()=>cancelAnimationFrame(frame)},[]);
  let action:ReactNode=null;
  if(next?.href)action=<Link className="lesson-next" href={next.href}>{next.label}</Link>;
  else if(next?.ready)action=<button className="lesson-next" onClick={next.onClick}>{next.label}</button>;
  else if(next)action=<button className="lesson-skip" onClick={next.onSkip??next.onClick}>{zh?'跳过':'Skip'}</button>;
  return <main className={`theory-shell lesson-shell ${className}`}>
    <header className="lesson-top">
      <h1>{title}</h1>
    </header>
    <nav className="theory-timeline" aria-label={zh?'课程步骤':'Lesson steps'}>
      {steps.map((name,i)=><button key={name} aria-current={i===current?'step':undefined} onClick={()=>onJump(i)}>{name}</button>)}
    </nav>
    {narration&&<p className="lesson-narration" aria-live="polite">{narration}</p>}
    <section className="lesson-scene" aria-label={heading}>{children}</section>
    <div className="lesson-talk">
      <div id="lesson-companion"/>
      <div className={`lesson-bubble ${tone?`is-${tone}`:''}`}>
        <p role="status" aria-live="polite">{message}</p>
        {(action||extra)&&<div className="lesson-actions">{extra}{action}</div>}
      </div>
    </div>
    {status&&<p className="lesson-status" role="alert">{status}</p>}
  </main>;
}
