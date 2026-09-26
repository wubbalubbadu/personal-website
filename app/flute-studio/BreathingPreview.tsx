"use client";

import {useEffect,useRef,useState} from "react";
import {cueBank,patterns} from "./breathing/timing";

/**
 * The Breathing Lab card acts out the real guide: the same ring (blue inhale
 * arc, pink exhale arc, a marker going round), the phase and beat count in the
 * middle, and one of the lab's own cues beside it. It breathes through three of
 * the lab's patterns so the ring's proportions visibly change; the caption names
 * the one playing. It plays on its own while on screen.
 */
const BEAT_MS=520;
const DEMO=[
  {id:"even",inhale:4,exhale:4},
  {id:"refill",inhale:2,exhale:4},
  {id:"sustain",inhale:3,exhale:7},
] as const;
const cycleMs=(d:typeof DEMO[number])=>(d.inhale+d.exhale)*BEAT_MS;
const TOTAL=DEMO.reduce((sum,d)=>sum+cycleMs(d),0);

export default function BreathingPreview({zh}:{zh:boolean}){
  const root=useRef<HTMLDivElement>(null);
  const [ms,setMs]=useState(0),[playing,setPlaying]=useState(false);
  useEffect(()=>{
    const el=root.current;if(!el||matchMedia("(prefers-reduced-motion: reduce)").matches)return;
    const observer=new IntersectionObserver(([entry])=>setPlaying(entry.isIntersecting),{threshold:.4});
    observer.observe(el);return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    if(!playing)return;
    let frame=0,last=performance.now();
    const tick=(now:number)=>{setMs(m=>(m+now-last)%TOTAL);last=now;frame=requestAnimationFrame(tick)};
    frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
  },[playing]);

  // Which pattern, and where in its one breath we are.
  let index=0,local=ms;
  while(local>=cycleMs(DEMO[index])){local-=cycleMs(DEMO[index]);index++}
  const d=DEMO[index],beats=local/BEAT_MS,inhale=beats<d.inhale;
  const beat=Math.floor(inhale?beats:beats-d.inhale)+1,of=inhale?d.inhale:d.exhale;
  const angle=beats/(d.inhale+d.exhale)*Math.PI*2;
  const phase=inhale?"Inhale":"Exhale";
  const cue=cueBank[phase][index%cueBank[phase].length];
  const names:Record<string,string>={even:zh?"均匀呼吸":"even",refill:zh?"吸气更短":"shorter inhale",sustain:zh?"呼气更长":"longer exhale"};

  return <div className="breath-demo" ref={root} aria-hidden="true">
    <div className="breath-demo__main">
      <svg viewBox="0 0 240 240" className="breath-demo__ring" role="presentation">
        <circle cx="120" cy="120" r="94" fill="none" stroke="#ca9295" strokeWidth="11"/>
        <circle cx="120" cy="120" r="94" fill="none" stroke="#87b4c8" strokeWidth="11" pathLength="100" strokeDasharray={`${d.inhale/(d.inhale+d.exhale)*100} 100`} transform="rotate(-90 120 120)" className="breath-demo__arc"/>
        <circle cx={120+94*Math.sin(angle)} cy={120-94*Math.cos(angle)} r="10" fill="#40553d" stroke="white" strokeWidth="3.5"/>
        <text x="120" y="106" textAnchor="middle" className="breath-demo__phase">{zh?(inhale?"吸气":"呼气"):phase}</text>
        <text x="120" y="152" textAnchor="middle" className="breath-demo__count">{beat}<tspan className="breath-demo__total"> / {of}</tspan></text>
      </svg>
      <div className="breath-demo__side">
        <b key={d.id}>{zh?names[d.id]:patterns.find(p=>p.id===d.id)!.name}</b>
        <p key={`${index}-${phase}`}>{cue}</p>
      </div>
    </div>
    <p className="scale-preview__caption breath-demo__caption">{DEMO.map((p,i)=><span key={p.id}>{i>0&&<i>·</i>}<span className={i===index?"is-changed":""}>{names[p.id]}</span></span>)}</p>
  </div>;
}
