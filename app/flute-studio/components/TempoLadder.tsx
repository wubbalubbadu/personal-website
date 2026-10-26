"use client";
import {useRef,useState} from "react";
import {Stepper} from "./Stepper";
import {RepPill} from "./RepPill";
import {PracticeIcon} from "./PracticeIcon";
import {CloseButton} from "./CloseButton";
import {TEMPO_MIN,TEMPO_MAX} from "../lib/scoreTempo";
import type {RepItem} from "../lib/repLog";
import "./tempo-ladder.css";

/**
 * A tempo ladder (COMPONENTS.md): the way from one tempo to a target, in steps, for a passage. Not a timed run: you
 * play, count reps, pause and think, and move up (or back) yourself, like Scale Studio's tally with the target
 * marked. ScoreViewer owns the tempo; these are the setup panel and the card.
 */
export type LadderOptions={start:number;target:number;step:number};
export const LADDER_STEPS=[1,2,5,10] as const;

/** Every stop on the way: start, start + step, …, and the target itself even when the steps do not land on it. */
export function ladderStops({start,target,step}:LadderOptions){
  const stops:number[]=[];
  for(let tempo=start;tempo<target;tempo+=step)stops.push(tempo);
  stops.push(target);
  return stops;
}

/** Setup: two numbers and a step, nothing to play here (the card is where you practise). */
export function TempoLadderSetup({initial,zh,onStart}:{initial:{start:number;target:number};zh:boolean;onStart:(options:LadderOptions)=>void}){
  const [start,setStart]=useState(initial.start),[target,setTarget]=useState(Math.max(initial.target,initial.start+1));
  const [step,setStep]=useState<number>(2);
  const number=(value:number,set:(value:number)=>void,name:string)=><Stepper size="small" editable value={value} min={TEMPO_MIN} max={TEMPO_MAX} onChange={set}
    label={name} decreaseLabel={zh?`${name}减 1`:`${name} down 1`} increaseLabel={zh?`${name}加 1`:`${name} up 1`}/>;
  return <div className="tempo-ladder-setup">
    <div className="tempo-ladder-setup__row"><span>{zh?"从":"From"}</span>{number(start,setStart,zh?"起始速度":"From tempo")}</div>
    <div className="tempo-ladder-setup__row"><span>{zh?"目标":"Target"}</span>{number(target,setTarget,zh?"目标速度":"Target tempo")}</div>
    <div className="tempo-ladder-setup__row"><span>{zh?"每步":"Step"}</span>
      <div className="tempo-ladder-setup__steps" role="group" aria-label={zh?"每步":"Step"}>{LADDER_STEPS.map(value=><button key={value} type="button" aria-pressed={step===value} onClick={()=>setStep(value)}>+{value}</button>)}</div></div>
    <div className="tempo-ladder-setup__actions">
      {target<=start&&<span className="tempo-ladder-setup__note">{zh?"目标要比起始快":"Target needs to be faster"}</span>}
      <button type="button" className="tempo-ladder__start" disabled={target<=start} onClick={()=>onStart({start,target,step})}>{zh?"开始":"Start"}</button>
    </div>
  </div>;
}

/** Cookie (the studio's mascot, as on the lessons' cookie button), small: where you are on the way. */
function CookieMarker(){
  return <svg className="tempo-ladder__cookie" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
    <path d="M12 1.6c5.9 0 10.4 4.3 10.4 10.2S18 22.4 12 22.4 1.6 17.7 1.6 11.8 6.1 1.6 12 1.6Z" fill="#d9a24d" stroke="#ba8135" strokeWidth="1.6"/>
    <circle cx="6.8" cy="7.2" r="1.3" fill="#6c4429"/><circle cx="17.3" cy="8.4" r="1.3" fill="#6c4429"/><circle cx="5.9" cy="15.6" r="1.2" fill="#6c4429"/><circle cx="17.6" cy="17" r="1.2" fill="#6c4429"/>
    <ellipse cx="9.6" cy="11.6" rx=".9" ry="1.1" fill="#292a33"/><ellipse cx="14.4" cy="11.6" rx=".9" ry="1.1" fill="#292a33"/>
    <path d="M10.4 14.4q1.6 1.4 3.2 0" fill="none" stroke="#292a33" strokeWidth="1.1" strokeLinecap="round"/>
  </svg>;
}

/**
 * The ladder card: a line from start (left) to target (right) cut into steps, Cookie at the current tempo; under it
 * step back, today's tally at this tempo, step up. Tapping a stop goes straight to it. Drag it by any empty part (the
 * grip on top shows that) when it covers the music; it stays moved until the ladder is closed.
 */
export function TempoLadderCard({options,tempo,rep,zh,onTempo,onClose,style}:{options:LadderOptions;tempo:number;rep:RepItem;zh:boolean;
  onTempo:(tempo:number)=>void;onClose:()=>void;style?:React.CSSProperties}){
  const stops=ladderStops(options),{start,target}=options;
  const at=(value:number)=>Math.min(1,Math.max(0,(value-start)/(target-start)))*100;
  const below=[...stops].reverse().find(stop=>stop<tempo),above=stops.find(stop=>stop>tempo);
  const [nudge,setNudge]=useState({x:0,y:0}),[dragging,setDragging]=useState(false);
  const dragged=useRef(false);
  function drag(e:React.PointerEvent<HTMLDivElement>){
    if(e.button!==0||(e.target as Element).closest("button,input,[role=spinbutton],label"))return;
    e.stopPropagation();
    const id=e.pointerId,startX=e.clientX,startY=e.clientY,origin={...nudge};let moving=false;
    dragged.current=false;
    const move=(ev:PointerEvent)=>{
      if(ev.pointerId!==id)return;
      const dx=ev.clientX-startX,dy=ev.clientY-startY;
      if(!moving&&Math.hypot(dx,dy)<4)return;
      if(!moving){moving=true;dragged.current=true;setDragging(true)}
      ev.preventDefault();setNudge({x:origin.x+dx,y:origin.y+dy});
    };
    const end=(ev:PointerEvent)=>{
      if(ev.pointerId!==id)return;
      window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",end);window.removeEventListener("pointercancel",end);
      setDragging(false);
    };
    window.addEventListener("pointermove",move,{passive:false});window.addEventListener("pointerup",end);window.addEventListener("pointercancel",end);
  }
  return <div className={dragging?"tempo-ladder is-dragging":"tempo-ladder"} role="toolbar" aria-label={zh?`速度阶梯，${start} 到 ${target}`:`Tempo ladder, ${start} to ${target}`}
    style={{...style,translate:`${nudge.x}px ${nudge.y}px`}} onPointerDown={drag}
    // A drag's release must not reach the score, which reads it as a tap on empty space.
    onClickCapture={e=>{if(dragged.current){dragged.current=false;e.preventDefault();e.stopPropagation()}}} onClick={e=>e.stopPropagation()}
    onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")e.stopPropagation()}}>
    <span className="tempo-ladder__grip" aria-hidden="true"/>
    <CloseButton className="tempo-ladder__close" label={zh?"关闭速度阶梯":"Close tempo ladder"} onClick={onClose}/>
    <div className="tempo-ladder__line">
      <span className="tempo-ladder__track"/>
      <span className="tempo-ladder__done" style={{width:`${at(tempo)}%`}}/>
      {stops.map(stop=><button key={stop} type="button" className={stop<=tempo?"tempo-ladder__stop is-passed":"tempo-ladder__stop"} style={{left:`${at(stop)}%`}}
        aria-label={zh?`到 ${stop}`:`Go to ${stop}`} aria-pressed={stop===tempo} onClick={()=>onTempo(stop)}/>)}
      <span className="tempo-ladder__here" style={{left:`${at(tempo)}%`}}><b>{tempo}</b><CookieMarker/></span>
    </div>
    <div className="tempo-ladder__ends"><span>{start}</span><span className={tempo>=target?"tempo-ladder__target is-reached":"tempo-ladder__target"}>{zh?"目标":"Target"} {target}</span></div>
    <div className="tempo-ladder__controls">
      <button type="button" className="tempo-ladder__icon has-tip" data-tip={zh?"退一步":"Step back"} aria-label={zh?`退到 ${below??start}`:`Step back to ${below??start}`} disabled={below===undefined} onClick={()=>below!==undefined&&onTempo(below)}><PracticeIcon name="previous"/></button>
      <RepPill item={rep} tempo={tempo} zh={zh}/>
      <button type="button" className="tempo-ladder__icon has-tip" data-tip={zh?"进一步":"Step up"} aria-label={zh?`进到 ${above??target}`:`Step up to ${above??target}`} disabled={above===undefined} onClick={()=>above!==undefined&&onTempo(above)}><PracticeIcon name="next"/></button>
    </div>
  </div>;
}
