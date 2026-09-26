"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import {traceY} from "./lib/toneTrace";

/**
 * The Long tones card acts out pitch detection: a trace draws itself the way
 * the real pitch graph does while you hold three notes (same in-tune band,
 * 10-cent grid, colour by band and loudness shading). G stays in tune, A
 * starts sharp and settles, B holds and then sags at the end. Each note gets
 * its finding as it finishes, like the note cards under the real graph.
 *
 * The curves are made up, not recorded, and computed once. It plays on its own while on screen.
 */
const W=600,H=200,NOTE_MS=2300,HOLD_MS=2000;
const band=(c:number)=>Math.abs(c)<=10?"in":Math.abs(c)<=20?"near":"off";
const NOTES=[
  {pitch:"G",cents:(t:number)=>2+3*Math.sin(t*11)+1.5*Math.sin(t*29)},
  {pitch:"A",cents:(t:number)=>19*Math.exp(-t*5)+2+2*Math.sin(t*13)},
  {pitch:"B",cents:(t:number)=>1+2*Math.sin(t*12)-24*Math.max(0,(t-.62)/.38)**1.5},
];
const signed=(n:number)=>`${n>0?"+":n<0?"−":""}${Math.abs(Math.round(n))}`;

export default function LongTonePreview({zh}:{zh:boolean}){
  const root=useRef<HTMLDivElement>(null);
  const [ms,setMs]=useState(0),[playing,setPlaying]=useState(false);
  const total=NOTES.length*NOTE_MS;

  // Points for the whole group, computed once: x, cents, loudness.
  const points=useMemo(()=>NOTES.flatMap((n,i)=>Array.from({length:70},(_,k)=>{
    const t=k/69,loud=Math.min(1,t/.08,(1-t)/.05);
    return {x:(i+t)/NOTES.length*W,at:(i+t)*NOTE_MS,cents:n.cents(t),loud:Math.max(0,loud)*(.75+.1*Math.sin(t*7))};
  })),[]);

  useEffect(()=>{
    const el=root.current;if(!el||matchMedia("(prefers-reduced-motion: reduce)").matches){setMs(total+1);return}
    const observer=new IntersectionObserver(([entry])=>setPlaying(entry.isIntersecting),{threshold:.4});
    observer.observe(el);return()=>observer.disconnect();
  },[total]);
  useEffect(()=>{
    if(!playing)return;
    let frame=0,last=performance.now();
    const tick=(now:number)=>{setMs(m=>{const next=m+(now-last);return next>total+HOLD_MS?0:next});last=now;frame=requestAnimationFrame(tick)};
    frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
  },[playing,total]);

  const shown=points.filter(p=>p.at<=ms);
  const pieces:{cls:string;d:string}[]=[];
  let current:{cls:string;pts:string[]}|null=null,lastPt="";
  for(const p of shown){
    const cls=band(p.cents),pt=`${p.x.toFixed(1)},${traceY(p.cents).toFixed(1)}`;
    if(!current||current.cls!==cls){if(current)pieces.push({cls:current.cls,d:"M"+current.pts.join(" L")});current={cls,pts:lastPt?[lastPt]:[]}}
    current.pts.push(pt);lastPt=pt;
  }
  if(current&&current.pts.length>1)pieces.push({cls:current.cls,d:"M"+current.pts.join(" L")});
  const envelope=shown.length>1?"M"+shown.map(p=>`${p.x.toFixed(1)},${(H/2-p.loud*46).toFixed(1)}`).join(" L")+" L"+[...shown].reverse().map(p=>`${p.x.toFixed(1)},${(H/2+p.loud*46).toFixed(1)}`).join(" L")+"Z":"";
  const live=shown.at(-1),playingNote=Math.min(NOTES.length-1,Math.floor(ms/NOTE_MS)),drawing=ms<total;
  const findings=[
    {grade:"green",text:zh?"G 很准":"G in tune"},
    {grade:"amber",text:zh?"A 起音偏高 19 音分":"A starts 19¢ sharp"},
    {grade:"red",text:zh?"B 结尾往下掉":"B sags at the end"},
  ];

  return <div className="tone-preview" ref={root} aria-hidden="true">
    <div className="tone-preview__head">
      <span className="tone-preview__labels">{NOTES.map((n,i)=><b key={n.pitch} className={ms>=i*NOTE_MS?"is-on":""}>{n.pitch}</b>)}</span>
      <span className="tone-preview__live">{drawing&&live?<>{NOTES[playingNote].pitch} <em className={`is-${band(live.cents)}`}>{signed(live.cents)}¢</em></>:zh?"已记录":"Saved"}</span>
    </div>
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="presentation">
      <rect x="0" y={traceY(10)} width={W} height={traceY(-10)-traceY(10)} className="tone-preview__band"/>
      {[30,20,-20,-30].map(c=><line key={c} x1="0" x2={W} y1={traceY(c)} y2={traceY(c)} className="tone-preview__grid"/>)}
      <line x1="0" x2={W} y1={traceY(0)} y2={traceY(0)} className="tone-preview__zero"/>
      {[1,2].map(i=><line key={i} x1={i*W/3} x2={i*W/3} y1="0" y2={H} className="tone-preview__divider"/>)}
      {envelope&&<path d={envelope} className="tone-preview__volume"/>}
      {pieces.map((p,i)=><path key={i} d={p.d} className={`tone-preview__line is-${p.cls}`}/>)}
    </svg>
    <div className="tone-preview__cards">{findings.map((f,i)=><span key={f.text} className={`grade-${f.grade} ${ms>=(i+1)*NOTE_MS?"is-on":""}`}>{f.text}</span>)}</div>
  </div>;
}
