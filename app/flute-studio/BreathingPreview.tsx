"use client";

import {useEffect,useRef,useState} from "react";

/**
 * The Breathing Lab tile (Nov 12): one breath drawn as a quiet curve, up for the inhale, down slower for the exhale,
 * with a dot travelling along it and two small labels. It sits in the same 340 x 172 box and padding as the Scale
 * Studio and Long tones demos, so the three line up. Replaced the ring + round strip (busy, tiny) and a bold
 * Inhale/Exhale read-out (too loud). Plays only while on screen; with reduced motion it holds partway through.
 */
const BEAT_MS=750,INHALE=4,EXHALE=6,BEATS=INHALE+EXHALE,ROUND=BEATS*BEAT_MS;
const W=292,H=120,TOP=16,BOTTOM=88;
const ease=(u:number)=>(1-Math.cos(Math.PI*u))/2;
const yAt=(beats:number)=>beats<INHALE?BOTTOM-(BOTTOM-TOP)*ease(beats/INHALE):TOP+(BOTTOM-TOP)*ease((beats-INHALE)/EXHALE);
const xAt=(beats:number)=>beats/BEATS*W;
const line=(to:number)=>{
  const steps=Math.max(1,Math.round(to/BEATS*80));
  return Array.from({length:steps+1},(_,i)=>{const b=to*i/steps;return `${i?"L":"M"}${xAt(b).toFixed(1)} ${yAt(b).toFixed(1)}`}).join(" ");
};
const FULL=line(BEATS);

export default function BreathingPreview({zh}:{zh:boolean}){
  const root=useRef<HTMLDivElement>(null);
  const [ms,setMs]=useState((INHALE+2.5)*BEAT_MS),[playing,setPlaying]=useState(false);
  useEffect(()=>{
    const el=root.current;if(!el||matchMedia("(prefers-reduced-motion: reduce)").matches)return;
    const observer=new IntersectionObserver(([entry])=>setPlaying(entry.isIntersecting),{threshold:.4});
    observer.observe(el);return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    if(!playing)return;
    let frame=0,last=performance.now();
    const tick=(now:number)=>{setMs(m=>(m+now-last)%ROUND);last=now;frame=requestAnimationFrame(tick)};
    frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
  },[playing]);

  const beats=ms/BEAT_MS,inhale=beats<INHALE;
  return <div className="breath-curve" ref={root} aria-hidden="true">
    <svg viewBox={`-8 0 ${W+16} ${H}`} role="presentation">
      <line x1={xAt(INHALE)} x2={xAt(INHALE)} y1={TOP-6} y2={BOTTOM+6} className="breath-curve__split"/>
      <path d={FULL} className="breath-curve__track"/>
      <path d={line(beats)} className="breath-curve__done"/>
      <circle cx={xAt(beats)} cy={yAt(beats)} r="6" className="breath-curve__dot"/>
      <text x={xAt(INHALE/2)} y={H-4} className={`breath-curve__label ${inhale?"is-on":""}`}>{zh?"吸 4":"in 4"}</text>
      <text x={xAt(INHALE+EXHALE/2)} y={H-4} className={`breath-curve__label ${inhale?"":"is-on"}`}>{zh?"呼 6":"out 6"}</text>
    </svg>
  </div>;
}
