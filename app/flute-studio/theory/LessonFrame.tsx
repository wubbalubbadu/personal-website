'use client';
import Link from 'next/link';
import {useEffect,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import CookieButton from './CookieButton';
import ProgressDots from './ProgressDots';
import './lesson-shell.css';

// The one "go on" control. It lives in Cookie's bubble: a quiet Skip until the step is done,
// then a filled button. `href` turns it into a link (e.g. back to the lesson list).
export type LessonNext={label:string;ready:boolean;onClick?:()=>void;onSkip?:()=>void;href?:string};
/**
 * Cookie leaves its spot by the bubble and goes to `slot` (an element in the scene, e.g. the place to tap a rhythm), with a
 * short hop there and back (none with reduced motion). Its spot by the bubble keeps its width, so nothing moves. Cookie is
 * only a picture there: the slot's owner handles the taps. Each change of `pulse` gives a little squish.
 */
export type CookieAway={slot:HTMLElement|null;pulse:number};
const centreOf=(el:HTMLElement|null,away:boolean)=>{const box=el?.parentElement?.getBoundingClientRect();return box&&box.width?{x:box.left+box.width/2,y:box.top+box.height/2,away}:null};

type Props={
  title:string;zh:boolean;className?:string;
  steps:string[];current:number;onJump:(index:number)=>void;
  heading:string;
  narration?:ReactNode;message:ReactNode;tone?:'correct'|'wrong'|null;
  next?:LessonNext|null;extra?:ReactNode;status?:string;
  /** Dots that fill as an exercise goes on, in their own row between the music and Cookie. */
  progress?:{done:number;total:number};
  /** The narration changes with each stage of a step: the new sentence fades in. */
  fadeNarration?:boolean;
  cookieAway?:CookieAway|null;
  children:ReactNode;
};

// Every lesson shares this frame: step dots, a line of narration that explains the idea, the scene,
// and Cookie's bubble (what to try, then how it went). `heading` names the scene for screen readers.
export default function LessonFrame({title,zh,className='',steps,current,onJump,heading,narration,message,tone=null,next,extra,status,progress,fadeNarration=false,cookieAway,children}:Props){
  const [cookieHappy,setCookieHappy]=useState(false);
  const away=cookieAway?.slot??null,pulse=cookieAway?.pulse??0;
  const move=useRef<HTMLSpanElement>(null),squish=useRef<HTMLSpanElement>(null),last=useRef<{x:number;y:number;away:boolean}|null>(null);
  // Hop from where Cookie sat last to where it sits now (first effect), then remember where that is (second). Positions
  // come from Cookie's container, which never moves with the hop, so a hop in progress cannot spoil the next one.
  useLayoutEffect(()=>{
    const el=move.current,from=last.current,to=centreOf(el,!!away);
    if(!el||!from||!to||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const dx=from.x-to.x,dy=from.y-to.y,k=(from.away?1.15:1)/(to.away?1.15:1);
    if(Math.abs(dx)+Math.abs(dy)<2)return;
    el.animate([{transform:`translate(${dx}px,${dy}px) scale(${k})`},{transform:`translate(${dx*.35}px,${dy*.35-40}px) scale(${(k+1)/2}) rotate(-8deg)`,offset:.55},{transform:'none'}],{duration:620,easing:'cubic-bezier(.3,.8,.4,1)'});
  },[away]);
  useLayoutEffect(()=>{last.current=centreOf(move.current,!!away)});
  useEffect(()=>{if(pulse>0&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches)squish.current?.animate([{transform:'scale(.84)'},{transform:'scale(1.04)',offset:.6},{transform:'none'}],{duration:200,easing:'ease-out'})},[pulse]);
  const cookie=<span ref={move} className={`lesson-cookie-move${away?' is-away':''}`}><span className="lesson-cookie-size"><span ref={squish} className="lesson-cookie-squish">
    {/* Away, Cookie reacts to the result the same way it does by the bubble: happy when right, and a small "hmm" when not. */}
    {away?<CookieButton className={`lesson-cookie${tone==='wrong'?' is-unsure':''}`} pressed={tone==='correct'} tabIndex={-1} aria-hidden="true"/>
      :<CookieButton className="lesson-cookie" pressed={tone==='correct'||cookieHappy} aria-label={zh?'和 Cookie 打招呼':'Say hello to Cookie'} onClick={()=>setCookieHappy(x=>!x)}/>}
  </span></span></span>;
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
    {narration&&<p key={fadeNarration?String(narration):undefined} className={`lesson-narration${fadeNarration?' fade-in':''}`} aria-live="polite">{narration}</p>}
    <section className="lesson-scene" aria-label={heading}>{children}</section>
    {/* Progress has its own row, always there, so the layout does not move when an exercise starts. */}
    <div className="lesson-progress">{progress&&<ProgressDots {...progress} zh={zh}/>}</div>
    <div className="lesson-talk">
      <div id="lesson-companion">{away?<span className="lesson-cookie-placeholder" aria-hidden="true"/>:cookie}</div>
      <div className={`lesson-bubble ${tone?`is-${tone}`:''}`}>
        <p role="status" aria-live="polite">{message}</p>
        {(action||extra)&&<div className="lesson-actions">{extra}{action}</div>}
      </div>
    </div>
    {status&&<p className="lesson-status" role="alert">{status}</p>}
    {away&&createPortal(cookie,away)}
  </main>;
}
