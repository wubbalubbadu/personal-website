"use client";

import {useEffect,useRef,useState,type RefObject} from "react";

/**
 * Demos for the Tools cards, drawn in the look of the dock's own panels: the
 * tuner's cents ruler, the metronome's beat lights, a held drone. Like the
 * other preview cards they play only while on screen and hold still with
 * reduced motion.
 */
function useOnScreen(ref:RefObject<HTMLElement|null>){
  const [on,setOn]=useState(false);
  useEffect(()=>{
    const el=ref.current;if(!el||matchMedia("(prefers-reduced-motion: reduce)").matches)return;
    const observer=new IntersectionObserver(([entry])=>setOn(entry.isIntersecting),{threshold:.4});
    observer.observe(el);return()=>observer.disconnect();
  },[ref]);
  return on;
}
function useStep(count:number,ms:number,on:boolean){
  const [index,setIndex]=useState(0);
  useEffect(()=>{if(!on)return;const timer=setInterval(()=>setIndex(i=>(i+1)%count),ms);return()=>clearInterval(timer)},[count,ms,on]);
  return index;
}

/** Tuner: a held A settling toward the centre of the cents ruler. */
const TUNER_CENTS=[-18,-11,-6,-2,1,3,0,-1];
export function TunerPreview(){
  const root=useRef<HTMLDivElement>(null),on=useOnScreen(root),i=useStep(TUNER_CENTS.length,650,on);
  const cents=TUNER_CENTS[i],band=Math.abs(cents)<=5?"in":Math.abs(cents)<=12?"near":"off";
  return <div className="tool-demo tuner-demo" ref={root} aria-hidden="true">
    <div className="tuner-demo__read"><b>A<sup>4</sup></b><em className={`is-${band}`}>{cents>0?"+":""}{cents}¢</em></div>
    <div className="tuner-demo__ruler">
      {Array.from({length:21},(_,tick)=><i key={tick} className={tick%5===0?"is-major":""}/>)}
      <span className={`tuner-demo__needle is-${band}`} style={{left:`${50+cents}%`}}/>
    </div>
    <div className="tuner-demo__scale"><span>-50</span><span>0</span><span>+50</span></div>
  </div>;
}

/** Metronome: four beat lights, the first accented, at the tempo shown. */
export function MetronomePreview(){
  const root=useRef<HTMLDivElement>(null),on=useOnScreen(root),beat=useStep(4,60000/72,on);
  return <div className="tool-demo metronome-demo" ref={root} aria-hidden="true">
    <div className="metronome-demo__beats">{[0,1,2,3].map(b=><i key={b} className={`${b===0?"is-accent ":""}${on&&b===beat?"is-on":""}`}/>)}</div>
    <p>♩ = 72</p>
  </div>;
}

/** Drone: a held reference pitch, drawn as a steady wave. */
export function DronePreview(){
  const root=useRef<HTMLDivElement>(null),on=useOnScreen(root);
  return <div className={`tool-demo drone-demo ${on?"is-on":""}`} ref={root} aria-hidden="true">
    <b>D</b>
    <svg viewBox="0 0 200 40" preserveAspectRatio="none"><path className="drone-demo__wave" d="M0 20 Q12.5 4 25 20 T50 20 T75 20 T100 20 T125 20 T150 20 T175 20 T200 20 T225 20 T250 20"/></svg>
  </div>;
}

/** Pitch tendency test: a row of notes fills in, each one sharp, flat or in tune. */
const TENDENCY=[4,-6,1,14,-2,3,-11,0,18,-4,2,-9];
export function TendencyPreview(){
  const root=useRef<HTMLDivElement>(null),on=useOnScreen(root),step=useStep(TENDENCY.length+4,380,on);
  const shown=on?step:TENDENCY.length;
  return <div className="tool-demo tendency-demo" ref={root} aria-hidden="true">
    <div className="tendency-demo__cells">{TENDENCY.map((cents,i)=>{
      const side=Math.abs(cents)<8?"tune":cents<0?"flat":"sharp";
      return <i key={i} className={i<shown?`is-${side}`:""} style={{"--lean":Math.min(1,Math.abs(cents)/20)} as React.CSSProperties}/>;
    })}</div>
    <div className="tendency-demo__names"><span>C</span><span>F♯</span><span>B</span></div>
  </div>;
}
