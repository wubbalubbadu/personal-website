"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import TrebleClef from "./theory/TrebleClef";
import {noteY} from "./theory/model";
import {MUSIC_GLYPHS} from "./theory/rhythm/musicGlyphs";
import {STEM_X} from "./theory/rhythm/RhythmNote";
import {ACCIDENTALS} from "./theory/accidentalGlyphs";
import {majorKeys,scaleNotes,keyForType,typeById,type ScaleTypeId} from "./exercises/scales/scale-score";

/**
 * The Scale Studio card acts out its core idea: change a setting and the scale
 * rewrites itself. One engraved row sits on the card; under it a line names the
 * current settings, and the part that just changed is highlighted.
 *
 * Nothing here runs the score engine. Notes come from the real scaleNotes(),
 * drawn with the engine's own glyphs in the theory lessons' staff coordinates,
 * so the card stays light. It plays on its own while on screen.
 *
 * `bar` (Home and Exercises tiles) writes the scale as 4/4 eighths: the octave up
 * fills the first bar, then a barline and the way down, running on past the
 * tile's right edge the way the Browse music engraving does (Nov 12). The tile
 * crops it; the SVG is drawn wide (BAR_VIEW_W) for that.
 */
type Art="slur"|"pairs"|"staccato";
const STATES:{key:string;type:ScaleTypeId;art:Art}[]=[
  {key:"C",type:"major",art:"slur"},
  {key:"D",type:"major",art:"slur"},
  {key:"D",type:"harmonic",art:"slur"},
  {key:"D",type:"harmonic",art:"staccato"},
  {key:"Bb",type:"major",art:"staccato"},
  {key:"Bb",type:"major",art:"pairs"},
];
const STEP_MS=1400,TWEEN_MS=360;
const NOTE_X=(i:number)=>262+i*47+(i>=4?22:0);
// Bar mode: two bars of eighths, a little gap between beamed groups and room for the barline between bars.
// Set a little tighter than the 8-note card (40 rather than 47 per note), so on a phone the second bar starts
// inside the tile and reads as going on.
const BAR_NOTE_X=(i:number)=>250+i*40+Math.floor(i/4)*16+Math.floor(i/8)*28;
const BAR_LINES=[7,15].map(i=>BAR_NOTE_X(i)+42),BAR_VIEW_W=1500;
const HEAD=MUSIC_GLYPHS.filled,G=.064,STEM=78;
const SHARP_ORDER=[8,5,9,6,3,7,4],FLAT_ORDER=[4,7,3,6,2,5,1];
const LETTERS=["C","D","E","F","G","A","B"];
const SIG_SHARPS=["F","C","G","D","A","E","B"],SIG_FLATS=["B","E","A","D","G","C","F"];

function layout(index:number,zh:boolean,bar:boolean){
  const s=STATES[index],key=majorKeys.find(k=>k.id===s.key)!,type=typeById(s.type),spelled=keyForType(key,type);
  const sig=(letter:string)=>spelled.fifths>0&&SIG_SHARPS.slice(0,spelled.fifths).includes(letter)?1:spelled.fifths<0&&SIG_FLATS.slice(0,-spelled.fifths).includes(letter)?-1:0;
  // Bar mode: three bars, up the octave, back down, and up again, so it keeps going past the edge at any tile width.
  const up=scaleNotes(key,"one",s.type).slice(0,8),seq=bar?[...up,...up.slice(0,7).reverse(),...up.slice(1,8),up[6],up[5]]:up;
  const notes=seq.map(n=>({
    p:n.octave*7+LETTERS.indexOf(n.step)-30,
    acc:n.alter===sig(n.step)?null:n.alter>0?"sharp" as const:n.alter<0?"flat" as const:"natural" as const,
  }));
  const artLabel={slur:zh?"全部连音":"all slurred",pairs:zh?"连 2 吐 2":"slur 2, tongue 2",staccato:zh?"全部断音":"all staccato"}[s.art];
  const scale=zh?`${key.label} ${type.zh}`:`${spelled.label} ${type.label.toLowerCase()}`;
  return {...s,notes,fifths:spelled.fifths,scale,artLabel};
}

export default function ScaleStudioPreview({zh,bar=false,still=false,start=0}:{zh:boolean;bar?:boolean;/** Never plays: one engraved frame (lab ink tiles). */still?:boolean;/** Which state to show first. */start?:number}){
  const root=useRef<HTMLDivElement>(null);
  const layouts=useMemo(()=>STATES.map((_,i)=>layout(i,zh,bar)),[zh,bar]);
  const [index,setIndex]=useState(start),[from,setFrom]=useState(start),[t,setT]=useState(1),[run,setRun]=useState(0),[playing,setPlaying]=useState(false);
  const current=useRef(start);

  // Plays by itself, but only while on screen, and never with reduced motion.
  useEffect(()=>{
    const el=root.current;if(still||!el||matchMedia("(prefers-reduced-motion: reduce)").matches)return;
    const observer=new IntersectionObserver(([entry])=>setPlaying(entry.isIntersecting),{threshold:.4});
    observer.observe(el);return()=>observer.disconnect();
  },[still]);
  useEffect(()=>{
    if(!playing)return;
    const timer=setInterval(()=>{const next=(current.current+1)%STATES.length;setFrom(current.current);current.current=next;setIndex(next);setT(0);setRun(r=>r+1)},STEP_MS);
    return()=>clearInterval(timer);
  },[playing]);
  useEffect(()=>{
    if(!run)return;
    let frame=0;const start=performance.now();
    const tick=(now:number)=>{const k=Math.min(1,(now-start)/TWEEN_MS);setT(k);if(k<1)frame=requestAnimationFrame(tick)};
    frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
  },[run]);

  const now=layouts[index],before=layouts[from],ease=1-(1-t)**3;
  const ys=now.notes.map((n,i)=>{const a=noteY(before.notes[i].p),b=noteY(n.p);return a+(b-a)*ease});
  const xs=now.notes.map((_,i)=>bar?BAR_NOTE_X(i):NOTE_X(i));
  const sigCount=Math.abs(now.fifths),sigSharp=now.fifths>0;
  // Which setting just changed, so the caption can point at it.
  const changed=index===from?-1:now.key!==before.key||now.type!==before.type?0:1;

  // One beamed group of four sixteenths. High groups take stems down, as an engraver would.
  // `bar` writes eighths (one beam); otherwise sixteenths (two).
  function group(g:number,ids=[0,1,2,3].map(i=>i+g*4),beams=bar?[0]:[0,18]){
    const down=ids.reduce((sum,i)=>sum+now.notes[i].p,0)/ids.length>=4,last=ids[ids.length-1];
    const sx=(i:number)=>xs[i]+(down?-STEM_X:STEM_X),x0=sx(ids[0]),x3=sx(last);
    const slope=Math.max(-.16,Math.min(.16,(ys[last]-ys[ids[0]])/(x3-x0)))*.6;
    const edge=down?Math.max(...ids.map(i=>ys[i]+STEM-slope*(sx(i)-x0))):Math.min(...ids.map(i=>ys[i]-STEM-slope*(sx(i)-x0)));
    const yAt=(x:number)=>edge+slope*(x-x0),dir=down?-1:1;
    const marks:React.ReactNode[]=[];
    const slur=(a:number,b:number)=>{const ya=ys[a]+dir*16,yb=ys[b]+dir*16,far=(down?Math.min(ya,yb):Math.max(ya,yb))+dir*18;
      marks.push(<path key={`s${a}`} className="scale-preview__fade" d={`M${xs[a]} ${ya}C${xs[a]+18} ${far} ${xs[b]-18} ${far} ${xs[b]} ${yb}C${xs[b]-18} ${far-dir*5} ${xs[a]+18} ${far-dir*5} ${xs[a]} ${ya}Z`}/>)};
    if(now.art==="slur")slur(ids[0],last);
    if(now.art==="pairs")slur(ids[0],ids[1]);
    if(now.art==="staccato")ids.forEach(i=>marks.push(<circle key={`d${i}`} className="scale-preview__fade" cx={xs[i]} cy={ys[i]+dir*22} r="3.6"/>));
    return <g key={g}>
      {ids.map(i=><line key={i} x1={sx(i)} x2={sx(i)} y1={ys[i]-dir*3} y2={yAt(sx(i))} className="scale-preview__stem"/>)}
      {beams.map(off=>{const o=down?-off:off,h=down?-12:12;return <polygon key={off} points={`${x0-1},${yAt(x0)+o} ${x3+1},${yAt(x3)+o} ${x3+1},${yAt(x3)+o+h} ${x0-1},${yAt(x0)+o+h}`}/>})}
      {marks}
    </g>;
  }
  const ledgers=(p:number)=>p<=-2?Array.from({length:Math.floor(-p/2)},(_,k)=>-2-2*k):p>=10?Array.from({length:Math.floor((p-8)/2)},(_,k)=>10+2*k):[];

  return <div className="scale-preview" ref={root} aria-hidden="true">
    <svg viewBox={`40 36 ${bar?BAR_VIEW_W:640} 232`} role="presentation">
      {[0,2,4,6,8].map(p=><line key={p} x1="55" x2={bar?40+BAR_VIEW_W:668} y1={noteY(p)} y2={noteY(p)} className="scale-preview__staff"/>)}
      <TrebleClef/>
      {Array.from({length:sigCount},(_,i)=><path key={`${now.fifths}-${i}`} className="scale-preview__fade" d={sigSharp?ACCIDENTALS.sharp:ACCIDENTALS.flat} transform={`translate(${168+i*19} ${noteY((sigSharp?SHARP_ORDER:FLAT_ORDER)[i])}) scale(${G} ${-G})`}/>)}
      {now.notes.map((n,i)=><g key={i}>
        {ledgers(n.p).map(p=><line key={p} x1={xs[i]-19} x2={xs[i]+19} y1={noteY(p)} y2={noteY(p)} className="scale-preview__staff"/>)}
        {n.acc&&<path key={`${index}-${n.acc}`} className="scale-preview__fade" d={ACCIDENTALS[n.acc]} transform={`translate(${xs[i]-35} ${ys[i]}) scale(${G} ${-G})`}/>}
        <path d={HEAD.path} transform={`translate(${xs[i]-HEAD.width*.032} ${ys[i]}) scale(${G} ${-G})`}/>
      </g>)}
      {group(0)}{group(1)}{bar&&[2,3,4,5].map(g=>group(g))}
      {bar&&BAR_LINES.map(x=><line key={x} x1={x} x2={x} y1={noteY(0)} y2={noteY(8)} className="scale-preview__staff"/>)}
    </svg>
    <p className="scale-preview__caption">
      <span key={`a${index}`} className={changed===0?"is-changed":""}>{now.scale}</span>
      <i aria-hidden="true">·</i>
      <span key={`b${index}`} className={changed===1?"is-changed":""}>{now.artLabel}</span>
    </p>
  </div>;
}
