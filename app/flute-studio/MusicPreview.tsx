"use client";

import {useEffect,useRef,useState} from "react";
import TrebleClef from "./theory/TrebleClef";
import {noteY} from "./theory/model";
import {notationPitch} from "./theory/sequence";
import RhythmNote from "./theory/rhythm/RhythmNote";
import type {NoteValue} from "./theory/rhythm/rhythmModel";
import {FluteDiagramMini} from "./components/FluteDiagram";
import {fingeringsForMidi} from "../../content/fingerings/flute";

/**
 * The Browse music card acts out what the score reader adds on top of the
 * notation, one overlay at a time, in the reader's own colours: beat sticks and
 * counts, note names, tapping a note to hear it and see its fingering (the
 * real FluteDiagramMini), and a drone. The caption names the one on show.
 * Framed exactly like the Scale Studio card (same viewBox and padding).
 */
const PHRASE:{p:number;v:NoteValue}[]=[{p:2,v:1},{p:4,v:1},{p:6,v:1},{p:5,v:1},{p:4,v:1},{p:3,v:1},{p:2,v:2}];
const X=(i:number)=>232+i*56+(i>=4?26:0);
const BAR_X=X(3)+42,END_X=666,VIEW_X=40,VIEW_W=640;
const TAPPED=2;
const PHASE_MS=2600;
type Phase="rhythm"|"names"|"fingering"|"drone";
const PHASES:Phase[]=["rhythm","names","fingering","drone"];
// Beat positions: one per quarter, the half note's second beat halfway to the barline.
const BEATS=[X(0),X(1),X(2),X(3),X(4),X(5),X(6),X(6)+(END_X-X(6))/2];

export default function MusicPreview({zh}:{zh:boolean}){
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
    const tick=(now:number)=>{setMs(m=>(m+now-last)%(PHASE_MS*PHASES.length));last=now;frame=requestAnimationFrame(tick)};
    frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
  },[playing]);

  const phase=PHASES[Math.floor(ms/PHASE_MS)];
  const labels:Record<Phase,string>={rhythm:zh?"节奏":"rhythm",names:zh?"音名":"note names",fingering:zh?"点音听指法":"tap for fingering",drone:zh?"持续音":"drone"};
  const tapped=notationPitch(PHRASE[TAPPED].p),keys=fingeringsForMidi(tapped.midi)?.fingerings[0]?.keys??[];
  const pct=(x:number)=>`${(x-VIEW_X)/VIEW_W*100}%`;

  return <div className="music-demo" ref={root} aria-hidden="true">
    {phase==="drone"&&<span className="music-demo__drone"><i/>{zh?"持续音 · G":"Drone · G"}</span>}
    {phase==="fingering"&&<div className="music-demo__tip" style={{left:pct(X(TAPPED))}}><b>{tapped.name}{tapped.octave}</b><FluteDiagramMini pressed={keys}/></div>}
    <svg viewBox={`${VIEW_X} 36 ${VIEW_W} 232`} role="presentation">
      {phase==="rhythm"&&BEATS.map((x,i)=><line key={i} x1={x} x2={x} y1={noteY(8)-20} y2={noteY(8)+34} className="music-demo__stick" style={{animationDelay:`${i*60}ms`}}/>)}
      {[0,2,4,6,8].map(p=><line key={p} x1="55" x2={END_X} y1={noteY(p)} y2={noteY(p)} className="music-demo__staff"/>)}
      <line x1={BAR_X} x2={BAR_X} y1={noteY(8)} y2={noteY(0)} className="music-demo__bar"/>
      <line x1={END_X} x2={END_X} y1={noteY(8)} y2={noteY(0)} className="music-demo__bar"/>
      <TrebleClef/>
      {PHRASE.map((n,i)=><g key={i} transform={`translate(${X(i)} ${noteY(n.p)})`} className={`music-demo__note ${phase==="fingering"&&i===TAPPED?"is-played":""}`}>
        <RhythmNote value={n.v} down={n.p>=4}/>
      </g>)}
      {phase==="rhythm"&&BEATS.map((x,i)=><text key={i} x={x} y={noteY(0)+52} className="music-demo__count" style={{animationDelay:`${i*60}ms`}}>{i%4+1}</text>)}
      {phase==="names"&&PHRASE.map((n,i)=><text key={i} x={X(i)} y={noteY(0)+52} className="music-demo__name" style={{animationDelay:`${i*70}ms`}}>{notationPitch(n.p).name}</text>)}
      {phase==="fingering"&&<circle cx={X(TAPPED)} cy={noteY(PHRASE[TAPPED].p)} r="16" className="music-demo__tap"/>}
    </svg>
    <p className="scale-preview__caption music-demo__caption">{PHASES.map((p,i)=><span key={p}>{i>0&&<i>·</i>}<span className={p===phase?"is-changed":""}>{labels[p]}</span></span>)}</p>
  </div>;
}
