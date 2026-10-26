"use client";

import {useEffect,useRef,useState} from "react";
import Sequence from "./breathing/Sequence";
import {breathAt,type Settings} from "./breathing/timing";
import "./breathing/breathing-lab.css";

/**
 * The Breathing Lab card acts out the real guide with the lab's own pieces: the ring (blue inhale arc, pink exhale
 * arc, the purple marker going round, phase and beat in the middle) beside the eight-round strip (Sequence.tsx), where
 * the current round is lit. It breathes two rounds each of three changing patterns (whole counts, so every cell is one
 * short number), so the ring's proportions and the strip's counts visibly change; the caption names the pattern playing. Plays only while on screen; with reduced
 * motion it holds one frame partway through a round.
 */
// Faster than a real beat: the card has to show a pattern changing within a few seconds.
const BEAT_MS=360;
const ROUNDS_SHOWN=2;
const DEMO:{settings:Settings;en:string;zh:string}[]=[
  {settings:{pattern:"refill",inhale:8,exhale:6,hold:0},en:"shorter inhale",zh:"缩短吸气"},
  {settings:{pattern:"sustain",inhale:4,exhale:4,hold:0},en:"longer exhale",zh:"延长呼气"},
  {settings:{pattern:"ratio",inhale:8,exhale:8,hold:0},en:"changing ratio",zh:"改变比例"},
];
// Beats of the rounds each pattern plays before the next one starts.
const span=(s:Settings)=>{let total=0;for(let r=0;r<ROUNDS_SHOWN;r++){const c=breathAt(total,s);total+=c.inhale+c.hold+c.exhale}return total};
const SPANS=DEMO.map(d=>span(d.settings));
const TOTAL=SPANS.reduce((a,b)=>a+b,0)*BEAT_MS;
// The still frame: the second round of the first pattern, partway through its exhale.
const STILL=(14+7+2.5)*BEAT_MS;

export default function BreathingPreview({zh}:{zh:boolean}){
  const root=useRef<HTMLDivElement>(null);
  const [ms,setMs]=useState(STILL),[playing,setPlaying]=useState(false);
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

  // Which pattern, and how many beats into it.
  let index=0,beats=ms/BEAT_MS;
  while(beats>=SPANS[index]){beats-=SPANS[index];index++}
  const d=DEMO[index],s=breathAt(beats,d.settings),total=s.inhale+s.hold+s.exhale;
  const inhale=s.phase==="Inhale",of=inhale?s.inhale:s.exhale;
  const angle=s.cycle*Math.PI*2;

  return <div className="breath-demo" ref={root} aria-hidden="true">
    <div className="breath-demo__main">
      <svg viewBox="0 0 240 240" className="breath-demo__ring" role="presentation">
        <circle cx="120" cy="120" r="94" fill="none" stroke="#ca9295" strokeWidth="10"/>
        <circle cx="120" cy="120" r="94" fill="none" stroke="#87b4c8" strokeWidth="10" pathLength="100" strokeDasharray={`${s.inhale/total*100} 100`} transform="rotate(-90 120 120)" className="breath-demo__arc"/>
        <circle cx={120+94*Math.sin(angle)} cy={120-94*Math.cos(angle)} r="12" fill="#79588e" stroke="white" strokeWidth="4"/>
        <text x="120" y="106" textAnchor="middle" className="breath-demo__phase">{zh?(inhale?"吸气":"呼气"):s.phase}</text>
        <text x="120" y="156" textAnchor="middle" className="breath-demo__count">{s.beat}<tspan className="breath-demo__total"> / {of}</tspan></text>
      </svg>
      <div className="breath-demo__rounds"><Sequence settings={d.settings} beats={beats} playing/></div>
    </div>
    <p className="scale-preview__caption breath-demo__caption">{DEMO.map((p,i)=><span key={p.en}>{i>0&&<i>·</i>}<span className={i===index?"is-changed":""}>{zh?p.zh:p.en}</span></span>)}</p>
  </div>;
}
