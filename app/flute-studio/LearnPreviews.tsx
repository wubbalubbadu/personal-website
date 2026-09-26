"use client";

import {useEffect,useRef,useState,type RefObject} from "react";
import TrebleClef from "./theory/TrebleClef";
import QuarterNote from "./theory/QuarterNote";
import {noteY,ledgerLines} from "./theory/model";
import {CLEF_GUIDE} from "./theory/ClefTracing";
import {FluteDiagram} from "./components/FluteDiagram";
import {fingeringsForMidi} from "../../content/fingerings/flute";
import {trills,movingKeys} from "../../content/fingerings/trills";
import {guidance,MIN_NOTE,MAX_NOTE} from "./embouchure/poses";
import {TRILL_GLYPH} from "./theory/accidentalGlyphs";

/**
 * Demos for the Learn cards, built from the real pieces: the theory lesson's
 * clef guide, the embouchure page's register cues, the fingering chart's
 * diagram and fingering data, and the trill chart's trill data (with the
 * diagram's own moving-key highlight). They play on their own while on screen,
 * since iPad has no hover, and hold still with reduced motion.
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

// Natural notes only, so a staff position is just letter + octave.
const LETTERS="CDEFGAB",PC=[0,2,4,5,7,9,11];
const pos=(name:string)=>Number(name[1])*7+LETTERS.indexOf(name[0])-30;
const midiOf=(name:string)=>(Number(name[1])+1)*12+PC[LETTERS.indexOf(name[0])];

/** One note on a small treble staff; it slides between positions and grows ledger lines as it climbs. */
function NoteStaff({p,x=250,extra}:{p:number;x?:number;extra?:React.ReactNode}){
  return <svg className="learn-staff" viewBox="40 -50 280 300" role="presentation">
    {[0,2,4,6,8].map(l=><line key={l} x1="55" x2="320" y1={noteY(l)} y2={noteY(l)} className="learn-staff__line"/>)}
    <TrebleClef/>
    <g className="learn-staff__note" style={{transform:`translate(${x}px,${noteY(p)}px)`}}>
      {ledgerLines(p).map(l=><line key={l} x1="-24" x2="24" y1={noteY(l)-noteY(p)} y2={noteY(l)-noteY(p)} className="learn-staff__line"/>)}
      <QuarterNote down={p>=4}/>
    </g>
    {extra}
  </svg>;
}

/** Theory lessons: the treble clef draws itself, then a note drops onto the G line it names. */
export function TheoryPreview({zh}:{zh:boolean}){
  const root=useRef<HTMLDivElement>(null),on=useOnScreen(root);
  return <div className={`learn-demo theory-demo ${on?"is-on":""}`} ref={root} aria-hidden="true">
    <svg viewBox="40 36 680 232" role="presentation">
      {[0,2,4,6,8].map(l=><line key={l} x1="55" x2="705" y1={noteY(l)} y2={noteY(l)} className={`learn-staff__line ${l===2?"theory-demo__g":""}`}/>)}
      <path d={CLEF_GUIDE} pathLength={1} className="theory-demo__clef"/>
      <g className="theory-demo__drop"><g transform={`translate(540 ${noteY(2)})`}><QuarterNote/></g></g>
      <text x="580" y={noteY(2)+48} className="theory-demo__label">{zh?"G · sol":"G · sol"}</text>
    </svg>
  </div>;
}

/** Body & embouchure: a note climbs the range while the page's own register cue changes with it. */
const EMB_NOTES=["C4","G4","E5","C6","G6"];
export function EmbouchurePreview(){
  const root=useRef<HTMLDivElement>(null),on=useOnScreen(root),i=useStep(EMB_NOTES.length,1700,on);
  const name=EMB_NOTES[i],midi=midiOf(name),pct=(midi-MIN_NOTE)/(MAX_NOTE-MIN_NOTE)*100;
  const [where,cue]=guidance(midi).split(": ");
  return <div className="learn-demo emb-demo" ref={root} aria-hidden="true">
    <NoteStaff p={pos(name)}/>
    <div className="emb-demo__side">
      <b>{name}</b>
      <p key={cue}><em>{cue}</em>{where}</p>
      <div className="emb-demo__track"><i style={{left:`${pct}%`}}/></div>
    </div>
  </div>;
}

/** Fingering chart: the note moves up and the real diagram changes with it. */
const FINGER_NOTES=["C4","G4","D5","A5","E6"];
export function FingeringPreview(){
  const root=useRef<HTMLDivElement>(null),on=useOnScreen(root),i=useStep(FINGER_NOTES.length,1500,on);
  const name=FINGER_NOTES[i],keys=fingeringsForMidi(midiOf(name))?.fingerings[0]?.keys??[];
  return <div className="learn-demo finger-demo" ref={root} aria-hidden="true">
    <NoteStaff p={pos(name)}/>
    <div className="finger-demo__side"><b>{name}</b><FluteDiagram pressed={keys}/></div>
  </div>;
}

/** Trill chart: a note marked with the standard tr ornament; the fingering flickers between its two states, moving keys highlighted. */
const TRILL=trills.find(t=>!t.unavailable&&t.base==="C5"&&t.interval===2)??trills.find(t=>!t.unavailable)!;
export function TrillPreview(){
  const root=useRef<HTMLDivElement>(null),on=useOnScreen(root),flick=useStep(2,140,on);
  const base=TRILL.base.replace(/[♯♭]/,""),p=pos(base);
  return <div className="learn-demo finger-demo" ref={root} aria-hidden="true">
    {/* The engraved "tr" ornament above the note (or above the staff, whichever is higher). */}
    <NoteStaff p={p} x={236} extra={<path className="trill-demo__mark" d={TRILL_GLYPH} transform={`translate(236 ${Math.min(noteY(p)-18,noteY(8)-16)}) scale(.064 -.064)`}/>}/>
    <div className="finger-demo__side"><b>{TRILL.base} <span>↔</span> {TRILL.upper}</b><FluteDiagram pressed={on&&flick?TRILL.upperKeys:TRILL.lowerKeys} moving={movingKeys(TRILL)}/></div>
  </div>;
}

/** Technique roadmap: the region checklist ticks itself off, then resets. */
export function RoadmapPreview({regions}:{regions:readonly {id:string;tone:string;title:string}[]}){
  const root=useRef<HTMLDivElement>(null),on=useOnScreen(root),step=useStep(regions.length+3,650,on);
  return <ul className="roadmap-preview" ref={root as RefObject<HTMLUListElement|null>} aria-hidden="true">
    {regions.map((region,index)=><li key={region.id} className={(on?step>index:index<2)?"is-done":""}><i className={region.tone}><svg viewBox="0 0 12 12"><path d="M2.5 6.3 4.8 8.6 9.5 3.6"/></svg></i><span>{region.title}</span></li>)}
  </ul>;
}
