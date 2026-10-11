"use client";
import CountInPulse from './CountInPulse';
import {useEffect,useMemo,useRef,useState,type ReactNode} from "react";
import {bookClick,usePracticeAudio} from "../PracticeAudio";

/** A passage's beat clicks, in quarter notes from its first downbeat (irregular meters in their groups), and the
 *  count-in: one measure, every written unit in x/8 and x/16 meters so you can count the small notes. */
export type Click={at:number;accent:boolean;group?:boolean};
export type PassageRhythm={clicks:Click[];countIn:Click[];length:number};
type Clicks="all"|"first"|"none";
type Timing="on"|"early"|"late"|"extra";
type TapMark={at:number;onset:number;timing:Timing};
const CLICKS_KEY="cookie:rhythm-tap-clicks";

/**
 * Each note judged by its own neighbours: real passages mix long notes with 32nds, and one strictness for the whole
 * passage (set by its fastest notes) made every note a 30 ms target. A tap pairs with the closest free note start
 * within 0.3 s and under half the gap to that note's neighbours; it is on time within 0.1 s, or within a third of
 * the gap for very fast notes (never under 25 ms). Seconds.
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

/** Every written note of the close-up's own XML with its time in quarters, numbered the way the engraving's
 *  data-event is (non-chord notes in order). onset: a new sound you tap (not a rest, grace note or tied-on note). */
function notesOf(xml:string){
  const doc=new DOMParser().parseFromString(xml,"application/xml"),notes:{id:number;at:number;onset:boolean}[]=[],bars:number[]=[];
  let divisions=1,at=0,id=0;
  for(const measure of doc.querySelectorAll("part:first-of-type > measure")){
    let longest=0,inBar=0;
    for(const node of measure.children){
      if(node.tagName==="attributes"){const d=Number(node.querySelector("divisions")?.textContent);if(d>0)divisions=d}
      else if(node.tagName==="backup"){inBar-=Number(node.querySelector("duration")?.textContent??0)/divisions}
      else if(node.tagName==="forward"){inBar+=Number(node.querySelector("duration")?.textContent??0)/divisions}
      else if(node.tagName==="note"&&!node.querySelector(":scope > chord")){
        const grace=!!node.querySelector(":scope > grace"),length=grace?0:Number(node.querySelector(":scope > duration")?.textContent??0)/divisions;
        notes.push({id:id++,at:at+inBar,onset:!!node.querySelector(":scope > pitch")&&!grace&&!node.querySelector(':scope > tie[type="stop"]')});
        inBar+=length;longest=Math.max(longest,inBar);
      }
    }
    at+=longest;bars.push(at);
  }
  return {notes,bars};
}

/**
 * The close-up's Rhythm mode: tap the passage's rhythm yourself against the metronome. Count-in dots (the reader's)
 * for one measure, then the clicks carry on (every beat, each bar's first beat, or none) while you tap each new note
 * start with any key or any finger on the pad. Results sit under the notes, like the theory lessons: numbered beat
 * ticks, a grey dot under every start (hidden while you tap), green when you hit it on time, an orange ring when
 * missed, and an orange dot where an early, late or extra tap actually landed. Slow it down with the reader's tempo.
 */
export function useRhythmTap({xml,rhythm,quarterBpm,zh}:{xml:string;rhythm:PassageRhythm;quarterBpm:number;zh:boolean}){
  const audio=usePracticeAudio();
  const [clicks,setClicksState]=useState<Clicks>("all");
  useEffect(()=>{try{const saved=localStorage.getItem(CLICKS_KEY);if(saved==="first"||saved==="none")setClicksState(saved)}catch{/* every beat */}},[]);// eslint-disable-line react-hooks/set-state-in-effect
  const setClicks=(next:Clicks)=>{setClicksState(next);try{localStorage.setItem(CLICKS_KEY,next)}catch{/* this visit only */}};
  const [phase,setPhase]=useState<"idle"|"count"|"tap"|"done">("idle");
  const [countAt,setCountAt]=useState<number|null>(null);
  const [result,setResult]=useState<{marks:TapMark[];missing:number[];perfect:boolean}|null>(null);
  const [pressed,setPressed]=useState(false);
  const run=useRef<{start:number;taps:number[];nodes:OscillatorNode[];timers:number[]}|null>(null);
  const secondsPerQuarter=60/Math.max(20,quarterBpm);
  const written=useMemo(()=>{try{return notesOf(xml)}catch{return {notes:[],bars:[]}}},[xml]);
  const onsetNotes=written.notes.filter(note=>note.onset);

  const stop=()=>{const current=run.current;if(!current)return;current.nodes.forEach(node=>{try{node.stop()}catch{/* already ended */}});current.timers.forEach(window.clearTimeout);run.current=null;setCountAt(null)};
  useEffect(()=>stop,[]);
  function start(){
    stop();setResult(null);
    const context=audio.getAudio();void context.resume();
    const countLength=rhythm.countIn.length?-rhythm.countIn[0].at:0;
    const begin=context.currentTime+.3+countLength*secondsPerQuarter;
    const nodes:OscillatorNode[]=[],timers:number[]=[];
    const msUntil=(at:number)=>Math.max(0,(begin+at*secondsPerQuarter-context.currentTime)*1000);
    rhythm.countIn.forEach((click,i)=>{nodes.push(bookClick(context,begin+click.at*secondsPerQuarter,click.accent));timers.push(window.setTimeout(()=>setCountAt(i),msUntil(click.at)))});
    for(const click of rhythm.clicks)if(clicks==="all"||(clicks==="first"&&click.accent))nodes.push(bookClick(context,begin+click.at*secondsPerQuarter,click.accent));
    timers.push(window.setTimeout(()=>{setCountAt(null);setPhase("tap")},msUntil(0)));
    // Graded a beat after the passage ends, so a late last tap still counts.
    timers.push(window.setTimeout(finish,msUntil(rhythm.length+1)));
    run.current={start:begin,taps:[],nodes,timers};
    setPhase("count");
  }
  function finish(){
    const current=run.current;if(!current)return;
    const graded=gradePassage(current.taps.map(t=>t*secondsPerQuarter),onsetNotes.map(note=>note.at*secondsPerQuarter));
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
  const running=phase==="count"||phase==="tap";
  const clickChoices:[Clicks,string][]=[["all",zh?"每拍":"Every beat"],["first",zh?"每小节第一拍":"First beat only"],["none",zh?"不要节拍器":"No clicks"]];

  const marks=({root,version}:{root:HTMLDivElement;version:number})=><RhythmMarks root={root} version={version} notes={written.notes} bars={written.bars} clicks={rhythm.clicks} result={result} onsetIds={onsetNotes.map(note=>note.id)}/>;
  const panel:ReactNode=<div className="rhythm-tap">
    <div className="rhythm-tap__controls">
      <div className="passage-guide__chips" role="group" aria-label={zh?"节拍器":"Clicks"}>{clickChoices.map(([value,label])=><button type="button" key={value} aria-pressed={clicks===value} disabled={running} onClick={()=>setClicks(value)}>{label}</button>)}</div>
      <button type="button" className="rhythm-tap__start" onClick={running?()=>{stop();setPhase("idle")}:start}>{running?(zh?"停止":"Stop"):phase==="done"?(zh?"再来一次":"Try again"):(zh?"开始":"Start")}</button>
      {/* The reader's count-in dots, one per click: in x/8 every eighth, with each group's first a little larger. */}
      {phase==="count"&&<div className="score-count-in rhythm-tap__count"><CountInPulse beat={countAt??-1} total={rhythm.countIn.length} groups={rhythm.countIn.map(c=>!!(c.group||c.accent))} zh={zh}/></div>}
    </div>
    <div className={pressed?"rhythm-tap__pad is-pressed":"rhythm-tap__pad"} role="button" tabIndex={-1} aria-label={zh?"敲击区":"Tap pad"} onPointerDown={event=>{event.preventDefault();tap()}}>
      <span>{phase==="tap"?(zh?"每个新音开始时敲一下":"Tap when each new note starts"):(zh?"在这里敲，或按任意键。连音线连着的音和休止符不用敲。":"Tap here or press any key. Tied notes and rests take no tap.")}</span>
    </div>
    {summary&&<p className={result!.perfect?"rhythm-tap__result is-perfect":"rhythm-tap__result"} role="status">{summary}</p>}
  </div>;
  return {marks,panel};
}

/** Under the notes: numbered beat ticks always; after grading, a dot under every note start and where each tap landed. */
function RhythmMarks({root,version,notes,bars,clicks,result,onsetIds}:{root:HTMLDivElement;version:number;notes:{id:number;at:number}[];bars:number[];clicks:Click[];result:{marks:TapMark[];missing:number[]}|null;onsetIds:number[]}){
  const [points,setPoints]=useState<{at:number;x:number;y:number;id:number}[]>([]);
  useEffect(()=>{
    let frame=0;
    const measure=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
      const box=root.getBoundingClientRect(),scale=root.offsetWidth?box.width/root.offsetWidth:1,time=new Map(notes.map(note=>[note.id,note.at]));
      const found:{at:number;x:number;y:number;id:number}[]=[];
      root.querySelectorAll<SVGGElement>(".vf-stavenote[data-event]").forEach(node=>{
        const id=Number(node.dataset.event),at=time.get(id);if(at===undefined)return;
        const head=(node.querySelector(".vf-notehead")??node).getBoundingClientRect(),staff=(node.closest(".vf-measure")??node).getBoundingClientRect();
        found.push({at,id,x:(head.left+head.width/2-box.left)/scale,y:(staff.bottom-box.top)/scale});
      });
      // Each bar's right edge, so the beats after a bar's last note still have somewhere to go.
      root.querySelectorAll<SVGGElement>(".vf-measure").forEach((bar,i)=>{if(bars[i]===undefined)return;const r=bar.getBoundingClientRect();found.push({at:bars[i],id:-1,x:(r.right-box.left)/scale-6,y:(r.bottom-box.top)/scale})});
      setPoints(found.sort((a,b)=>a.at-b.at||a.x-b.x));
    })};
    measure();const observer=new ResizeObserver(measure);observer.observe(root);
    return()=>{cancelAnimationFrame(frame);observer.disconnect()};
  },[root,version,notes,bars]);
  // Where a moment falls on the page: between the written notes around it, on their line (a moment that crosses
  // to the next line belongs to whichever side it is closer to).
  const place=(at:number)=>{
    if(!points.length)return null;
    let after=points.findIndex(p=>p.at>=at-1e-6);if(after<0)after=points.length-1;
    const next=points[after],prev=points[Math.max(0,after-1)];
    if(next.at<=at+1e-6||prev===next)return {x:next.x,y:next.y};
    if(Math.abs(prev.y-next.y)>2)return at-prev.at<next.at-at?{x:prev.x+12,y:prev.y}:{x:next.x,y:next.y};
    return {x:prev.x+(next.x-prev.x)*(at-prev.at)/(next.at-prev.at),y:prev.y};
  };
  const ticks=clicks.map((click,i)=>{const spot=place(click.at);let n=1;for(let k=i;k>0&&!clicks[k].accent;k--)n++;return spot&&{...spot,n,accent:click.accent,key:i}}).filter(Boolean) as {x:number;y:number;n:number;accent:boolean;key:number}[];
  const at=(id:number)=>points.find(p=>p.id===id);
  return <div className="rhythm-marks" aria-hidden="true">
    {ticks.map(t=><span key={`b${t.key}`} className={t.accent?"rhythm-marks__beat is-bar":"rhythm-marks__beat"} style={{left:t.x,top:t.y+8}}>{t.n}</span>)}
    {result&&onsetIds.map((id,i)=>{const p=at(id);if(!p)return null;const hit=result.marks.some(m=>m.onset===i&&m.timing==="on");return <i key={`o${id}`} className={`rhythm-marks__start${hit?" is-on":result.missing.includes(i)?" is-missed":""}`} style={{left:p.x,top:p.y+30}}/>})}
    {result&&result.marks.filter(m=>m.timing!=="on").map((m,i)=>{const spot=place(m.at);return spot&&<i key={`t${i}`} className={`rhythm-marks__tap is-${m.timing}`} style={{left:spot.x,top:spot.y+42}}/>})}
  </div>;
}
