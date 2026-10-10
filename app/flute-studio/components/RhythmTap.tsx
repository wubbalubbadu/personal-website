"use client";
import {useEffect,useRef,useState} from "react";
import {bookClick,usePracticeAudio} from "../PracticeAudio";

type TapMark={at:number;onset:number;timing:"on"|"early"|"late"|"extra"};
/**
 * Like lesson 7's gradeTaps, but each note is judged by its own neighbours: real passages mix long notes with
 * 32nds, and one strictness for the whole passage (set by its fastest notes) made every note a 30 ms target.
 * A tap pairs with the closest free note start within 0.3 s and under half the gap to that note's neighbours;
 * it is on time within 0.1 s, or within a third of the gap for very fast notes (never under 25 ms).
 * Times are in seconds here.
 */
export function gradePassage(taps:readonly number[],onsets:readonly number[]){
  const gap=(i:number)=>Math.min(i>0?onsets[i]-onsets[i-1]:Infinity,i<onsets.length-1?onsets[i+1]-onsets[i]:Infinity);
  const pairs=taps.flatMap((t,ti)=>onsets.map((o,oi)=>({ti,oi,d:Math.abs(t-o)}))).filter(p=>p.d<=Math.min(.3,.5*gap(p.oi))).sort((a,b)=>a.d-b.d);
  const tapTo=taps.map(()=>-1),used=new Set<number>();
  for(const p of pairs)if(tapTo[p.ti]<0&&!used.has(p.oi)){tapTo[p.ti]=p.oi;used.add(p.oi)}
  const marks:TapMark[]=taps.map((at,i)=>{const o=tapTo[i];if(o<0)return {at,onset:-1,timing:"extra"};const err=at-onsets[o],window=Math.max(.025,Math.min(.1,gap(o)/3));return {at,onset:o,timing:Math.abs(err)<=window?"on":err<0?"early":"late"}});
  const missing=onsets.map((_,i)=>i).filter(i=>!used.has(i));
  return {marks,missing,perfect:missing.length===0&&marks.every(m=>m.timing==="on")};
}

/** A passage's rhythm, in quarter notes from its first downbeat: where each new sound starts, and the beat clicks. */
export type PassageRhythm={onsets:number[];clicks:{at:number;accent:boolean}[];countIn:{at:number;accent:boolean}[];length:number};
type Clicks="all"|"first"|"none";
const CLICKS_KEY="cookie:rhythm-tap-clicks";

/**
 * The close-up's Rhythm mode: tap the passage's rhythm yourself against the metronome. One measure of count-in,
 * then the clicks carry on (every beat, only each bar's first beat, or none) while you tap each new note start;
 * tied notes and rests take no tap. Any key counts, and so does every finger on the pad, so a fast figure can be
 * drummed with two hands. The answer marks stay hidden while you tap and appear with the grading afterwards
 * (lesson 7's gradeTaps: within 0.1 s is on time). Slow it down with the reader's tempo.
 */
export function RhythmTap({rhythm,quarterBpm,zh}:{rhythm:PassageRhythm;quarterBpm:number;zh:boolean}){
  const audio=usePracticeAudio();
  const [clicks,setClicksState]=useState<Clicks>("all");
  useEffect(()=>{try{const saved=localStorage.getItem(CLICKS_KEY);if(saved==="first"||saved==="none")setClicksState(saved)}catch{/* every beat */}},[]);// eslint-disable-line react-hooks/set-state-in-effect
  const setClicks=(next:Clicks)=>{setClicksState(next);try{localStorage.setItem(CLICKS_KEY,next)}catch{/* this visit only */}};
  const [phase,setPhase]=useState<"idle"|"count"|"tap"|"done">("idle");
  const [result,setResult]=useState<{marks:TapMark[];missing:number[];perfect:boolean}|null>(null);
  const [pressed,setPressed]=useState(false);
  const run=useRef<{start:number;taps:number[];nodes:OscillatorNode[];timers:number[]}|null>(null);
  const secondsPerQuarter=60/Math.max(20,quarterBpm);

  const stop=()=>{const current=run.current;if(!current)return;current.nodes.forEach(node=>{try{node.stop()}catch{/* already ended */}});current.timers.forEach(window.clearTimeout);run.current=null};
  useEffect(()=>stop,[]);
  function start(){
    stop();setResult(null);
    const context=audio.getAudio();void context.resume();
    const countLength=rhythm.countIn.length?-rhythm.countIn[0].at:0;
    const begin=context.currentTime+.3+countLength*secondsPerQuarter;
    const nodes:OscillatorNode[]=[],timers:number[]=[];
    for(const click of rhythm.countIn)nodes.push(bookClick(context,begin+click.at*secondsPerQuarter,click.accent));
    for(const click of rhythm.clicks)if(clicks==="all"||(clicks==="first"&&click.accent))nodes.push(bookClick(context,begin+click.at*secondsPerQuarter,click.accent));
    const msUntil=(at:number)=>Math.max(0,(begin+at*secondsPerQuarter-context.currentTime)*1000);
    timers.push(window.setTimeout(()=>setPhase("tap"),msUntil(-.5)));
    // Graded a beat after the passage ends, so a late last tap still counts.
    timers.push(window.setTimeout(finish,msUntil(rhythm.length+1)));
    run.current={start:begin,taps:[],nodes,timers};
    setPhase("count");
  }
  function finish(){
    const current=run.current;if(!current)return;
    const graded=gradePassage(current.taps.map(t=>t*secondsPerQuarter),rhythm.onsets.map(o=>o*secondsPerQuarter));
    setResult({...graded,marks:graded.marks.map(mark=>({...mark,at:mark.at/secondsPerQuarter}))});setPhase("done");run.current=null;
  }
  function tap(){
    const current=run.current;if(!current)return;
    const context=audio.getAudio();
    // The clicks reach your ears outputLatency after they are scheduled, and you tap to what you hear.
    const latency=(context as AudioContext&{outputLatency?:number}).outputLatency||context.baseLatency||0;
    current.taps.push((context.currentTime-latency-current.start)/secondsPerQuarter);
    setPressed(true);window.setTimeout(()=>setPressed(false),90);
  }
  const tapRef=useRef(tap);useEffect(()=>{tapRef.current=tap});
  // Any key is a tap while a run is going (not while typing, and not modifier keys or Escape).
  useEffect(()=>{
    if(phase!=="count"&&phase!=="tap")return;
    const key=(event:KeyboardEvent)=>{
      if(event.repeat||["Shift","Control","Alt","Meta","Escape","Tab"].includes(event.key))return;
      if((event.target as HTMLElement)?.closest?.("input,textarea,[contenteditable=true]"))return;
      event.preventDefault();tapRef.current();
    };
    window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);
  },[phase]);

  const counts=result&&{on:result.marks.filter(m=>m.timing==="on").length,early:result.marks.filter(m=>m.timing==="early").length,late:result.marks.filter(m=>m.timing==="late").length,extra:result.marks.filter(m=>m.timing==="extra").length,missed:result.missing.length};
  const summary=counts&&(result!.perfect?(zh?"全部准时！":"Every start on time!"):[
    counts.on&&(zh?`${counts.on} 次准时`:`${counts.on} on time`),
    counts.early&&(zh?`${counts.early} 次太早`:`${counts.early} early`),
    counts.late&&(zh?`${counts.late} 次太晚`:`${counts.late} late`),
    counts.missed&&(zh?`漏了 ${counts.missed} 个音`:`${counts.missed} missed`),
    counts.extra&&(zh?`多敲了 ${counts.extra} 次`:`${counts.extra} extra`),
  ].filter(Boolean).join(zh?"，":", "));
  const span=Math.max(rhythm.length,.001),x=(at:number)=>`${Math.min(100,Math.max(0,at/span*100))}%`;
  const clickChoices:[Clicks,string][]=[["all",zh?"每拍":"Every beat"],["first",zh?"每小节第一拍":"First beat only"],["none",zh?"不要节拍器":"No clicks"]];
  return <div className="rhythm-tap">
    <div className="rhythm-tap__controls">
      <div className="reader-choice" role="group" aria-label={zh?"节拍器":"Clicks"}>{clickChoices.map(([value,label])=><button type="button" key={value} aria-pressed={clicks===value} disabled={phase==="count"||phase==="tap"} onClick={()=>setClicks(value)}>{label}</button>)}</div>
      <button type="button" className="rhythm-tap__start" onClick={phase==="count"||phase==="tap"?()=>{stop();setPhase("idle")}:start}>{phase==="count"||phase==="tap"?(zh?"停止":"Stop"):phase==="done"?(zh?"再来一次":"Try again"):(zh?"开始":"Start")}</button>
    </div>
    <p className="rhythm-tap__hint">{phase==="count"?(zh?"预备一小节，然后开始敲。":"One measure of clicks, then start tapping."):phase==="tap"?(zh?"每个新音开始时敲一下。":"Tap when each new note starts."):(zh?"按任意键，或用手指敲下面的方块。连音线连着的音和休止符不用敲。用乐谱的速度可以放慢。":"Press any key, or tap the pad below with any finger. Tied notes and rests take no tap. Slow it down with the tempo.")}</p>
    <div className={pressed?"rhythm-tap__pad is-pressed":"rhythm-tap__pad"} role="button" tabIndex={-1} aria-label={zh?"敲击区":"Tap pad"} onPointerDown={event=>{event.preventDefault();tap()}}>
      {/* The answer marks appear only with the grading, so you tap from the music, not from the marks. */}
      {result&&<div className="rhythm-tap__line" aria-hidden="true">
        {rhythm.clicks.filter(click=>click.accent).map((click,i)=><i key={`b${i}`} className="rhythm-tap__bar" style={{left:x(click.at)}}/>)}
        {rhythm.onsets.map((at,i)=><i key={`o${i}`} className={result.missing.includes(i)?"rhythm-tap__onset is-missed":"rhythm-tap__onset"} style={{left:x(at)}}/>)}
        {result.marks.map((mark,i)=><i key={`t${i}`} className={`rhythm-tap__tap is-${mark.timing}`} style={{left:x(mark.at)}}/>)}
      </div>}
      {!result&&<span className="rhythm-tap__pad-label">{zh?"敲这里":"Tap here"}</span>}
    </div>
    {summary&&<p className={result!.perfect?"rhythm-tap__result is-perfect":"rhythm-tap__result"} role="status">{summary}</p>}
  </div>;
}
