"use client";

import {useEffect,useRef,useState,type RefObject} from "react";
import TrebleClef from "./theory/TrebleClef";
import QuarterNote from "./theory/QuarterNote";
import {noteY,ledgerLines} from "./theory/model";
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

/**
 * Theory lessons: the treble clef with the G line it names, as the Tools cards do it: one big label, one graphic.
 * Still on purpose (Nov 12): the old clef-drawing loop was one more moving thing in a busy grid.
 */
export function TheoryPreview({zh}:{zh:boolean}){
  return <div className="learn-demo theory-demo" aria-hidden="true">
    <b>{zh?"G 线":"G"}</b>
    <svg viewBox="40 36 300 232" role="presentation">
      {[0,2,4,6,8].map(l=><line key={l} x1="55" x2="330" y1={noteY(l)} y2={noteY(l)} className={`learn-staff__line ${l===2?"theory-demo__g":""}`}/>)}
      <TrebleClef/>
      <g transform={`translate(260 ${noteY(2)})`}><QuarterNote/></g>
    </svg>
  </div>;
}

/** Body & embouchure: a note climbs the range while the page's own register cue changes with it. */
const EMB_NOTES=["C4","G4","E5","C6","G6"];
export function EmbouchurePreview(){
  const root=useRef<HTMLDivElement>(null),on=useOnScreen(root),i=useStep(EMB_NOTES.length,2400,on);
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
  const root=useRef<HTMLDivElement>(null),on=useOnScreen(root),i=useStep(FINGER_NOTES.length,2400,on);
  const name=FINGER_NOTES[i],keys=fingeringsForMidi(midiOf(name))?.fingerings[0]?.keys??[];
  return <div className="learn-demo finger-demo" ref={root} aria-hidden="true">
    <NoteStaff p={pos(name)}/>
    <div className="finger-demo__side"><b>{name}</b><FluteDiagram pressed={keys}/></div>
  </div>;
}

/** Trill chart: a note marked with the standard tr ornament; the fingering flickers between its two states, moving keys highlighted. */
const TRILL=trills.find(t=>!t.unavailable&&t.base==="C5"&&t.interval===2)??trills.find(t=>!t.unavailable)!;
export function TrillPreview(){
  const root=useRef<HTMLDivElement>(null),on=useOnScreen(root),flick=useStep(2,600,on);
  const base=TRILL.base.replace(/[♯♭]/,""),p=pos(base);
  return <div className="learn-demo finger-demo" ref={root} aria-hidden="true">
    {/* The engraved "tr" ornament above the note (or above the staff, whichever is higher). */}
    <NoteStaff p={p} x={236} extra={<path className="trill-demo__mark" d={TRILL_GLYPH} transform={`translate(236 ${Math.min(noteY(p)-18,noteY(8)-16)}) scale(.064 -.064)`}/>}/>
    <div className="finger-demo__side"><b>{TRILL.base} <span>↔</span> {TRILL.upper}</b><FluteDiagram pressed={on&&flick?TRILL.upperKeys:TRILL.lowerKeys} moving={movingKeys(TRILL)}/></div>
  </div>;
}

/**
 * Technique roadmap: six region dots along a path tick off one by one, then
 * reset. Only the region being ticked is named, so the card has one short
 * label rather than a list of six.
 */
export function RoadmapPreview({regions}:{regions:readonly {id:string;tone:string;title:string}[]}){
  const root=useRef<HTMLDivElement>(null),on=useOnScreen(root),step=useStep(regions.length+3,1000,on);
  const done=(index:number)=>on?step>index:index<2;
  const named=regions[Math.min(Math.max(on?step-1:1,0),regions.length-1)];
  return <div className="roadmap-preview" ref={root} aria-hidden="true">
    <ol>{regions.map((region,index)=><li key={region.id} className={`${region.tone}${done(index)?" is-done":""}`}><svg viewBox="0 0 12 12"><path d="M2.5 6.3 4.8 8.6 9.5 3.6"/></svg></li>)}</ol>
    <span className={named.tone}>{named.title}</span>
  </div>;
}
