"use client";
import {useEffect,useRef,useState,type KeyboardEvent,type PointerEvent,type ReactNode} from "react";
import "./stepper.css";

/**
 * The one number stepper (COMPONENTS.md): −, the value, +, on the studio's plain grey. Hold a button to keep stepping
 * (it speeds up after a few steps); with the keyboard the value is one tab stop and the arrow keys step it (Home/End
 * jump to the ends). Buttons stay small to look at but get a 44px target on touch screens.
 *
 * Give it `onChange` for a plain number kept between `min` and `max`, or `onStep` when a step means something other
 * than adding `step` (the next meter in a list); `min`/`max` then only disable the ends. `wrap` steps past an end to
 * the other one. `display` is what shows (a note name, "Octave 4"); `valueText` is what a screen reader hears.
 * `tone="text"` draws a worded value small and grey. `className` is for placement and width only.
 */
export function Stepper({value,min=-Infinity,max=Infinity,step=1,wrap=false,onChange,onStep,label,decreaseLabel,increaseLabel,display,valueText,size="medium",tone="number",className,editable=false,liveValue,inputDelay=500}:{
  value:number;min?:number;max?:number;step?:number;wrap?:boolean;
  onChange?:(value:number)=>void;onStep?:(direction:1|-1)=>void;
  label:string;decreaseLabel:string;increaseLabel:string;
  display?:ReactNode;valueText?:string;size?:"small"|"medium";tone?:"number"|"text";className?:string;
  /** Opt-in typing, with the same draft/blur behavior as TempoPill. Other steppers remain unchanged. */
  editable?:boolean;liveValue?:(draft:string)=>number|null;inputDelay?:number;
}){
  const [draft,setDraft]=useState<string|null>(null);
  const canDown=wrap||value>min,canUp=wrap||value<max;
  // Long presses step through several renders, so they read the latest props through a ref.
  const latest=useRef({value,min,max,step,wrap,onChange,onStep,canDown,canUp});
  useEffect(()=>{latest.current={value,min,max,step,wrap,onChange,onStep,canDown,canUp}});
  useEffect(()=>{
    if(!editable||draft===null)return;
    const n=liveValue?liveValue(draft):draft.trim()!==""&&Number.isFinite(Number(draft))?Number(draft):null;
    if(n===null||n<min||n>max||n===value)return;
    const id=window.setTimeout(()=>latest.current.onChange?.(n),inputDelay);
    return()=>window.clearTimeout(id);
  },[draft,editable,liveValue,min,max,value,inputDelay]);
  const commit=()=>{
    if(draft===null)return;
    const n=Number(draft);setDraft(null);
    if(draft.trim()!==""&&Number.isFinite(n))onChange?.(Math.max(min,Math.min(max,n)));
  };
  const go=(direction:1|-1)=>{
    const p=latest.current;
    if(!(direction>0?p.canUp:p.canDown))return false;
    if(p.onStep){p.onStep(direction);return true}
    let next=p.value+direction*p.step;
    if(p.wrap&&next>p.max)next=p.min;else if(p.wrap&&next<p.min)next=p.max;
    p.onChange?.(Math.max(p.min,Math.min(p.max,next)));return true;
  };
  const timer=useRef<number|null>(null),fromPointer=useRef(false);
  const stop=()=>{if(timer.current!==null){window.clearTimeout(timer.current);timer.current=null}};
  useEffect(()=>stop,[]);
  const press=(direction:1|-1)=>(e:PointerEvent<HTMLButtonElement>)=>{
    if(e.button!==0)return;
    fromPointer.current=true;stop();
    if(!go(direction))return;
    // Wait before repeating so a tap is one step, then repeat, faster after eight steps.
    let count=0;
    const again=()=>{if(!go(direction)){stop();return}count++;timer.current=window.setTimeout(again,count>8?40:90)};
    timer.current=window.setTimeout(again,420);
  };
  // A pointer press has already stepped; a click without one (Enter or Space on the button) steps here.
  const click=(direction:1|-1)=>()=>{if(fromPointer.current){fromPointer.current=false;return}go(direction)};
  const keys=(e:KeyboardEvent<HTMLSpanElement>)=>{
    const p=latest.current;let handled=true;
    if(e.key==="ArrowUp"||e.key==="ArrowRight")go(1);
    else if(e.key==="ArrowDown"||e.key==="ArrowLeft")go(-1);
    else if(e.key==="Home"&&!p.onStep&&Number.isFinite(p.min))p.onChange?.(p.min);
    else if(e.key==="End"&&!p.onStep&&Number.isFinite(p.max))p.onChange?.(p.max);
    else handled=false;
    if(handled)e.preventDefault();
  };
  const button=(direction:1|-1)=><button type="button" tabIndex={-1} className="stepper__button"
    aria-label={direction>0?increaseLabel:decreaseLabel} disabled={direction>0?!canUp:!canDown}
    onPointerDown={press(direction)} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
    onClick={click(direction)} onContextMenu={e=>e.preventDefault()}>{direction>0?"+":"−"}</button>;
  return <span className={["stepper",`stepper--${size}`,`stepper--${tone}`,className??""].filter(Boolean).join(" ")}>
    {button(-1)}
    {editable?<input className="stepper__value stepper__input" type="number" inputMode="numeric" aria-label={label}
      min={Number.isFinite(min)?min:undefined} max={Number.isFinite(max)?max:undefined} step={step} value={draft??value}
      onChange={e=>setDraft(e.target.value)} onBlur={commit}
      onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();e.stopPropagation();e.currentTarget.blur()}}}/>:<span className="stepper__value" role="spinbutton" tabIndex={0} aria-label={label} aria-valuenow={value}
      aria-valuemin={Number.isFinite(min)&&!wrap?min:undefined} aria-valuemax={Number.isFinite(max)&&!wrap?max:undefined}
      aria-valuetext={valueText} onKeyDown={keys}>{display??value}</span>}
    {button(1)}
  </span>;
}
