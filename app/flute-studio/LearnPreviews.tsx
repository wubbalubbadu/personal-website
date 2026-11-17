"use client";

import {useEffect,useRef,useState,type RefObject} from "react";
import {FluteDiagram} from "./components/FluteDiagram";
import {fingeringsForMidi} from "../../content/fingerings/flute";
import {trills,movingKeys} from "../../content/fingerings/trills";
import {MIN_NOTE,MAX_NOTE} from "./embouchure/poses";

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

// Natural notes only, so a MIDI number is just letter + octave.
const LETTERS="CDEFGAB",PC=[0,2,4,5,7,9,11];
const midiOf=(name:string)=>(Number(name[1])+1)*12+PC[LETTERS.indexOf(name[0])];

/**
 * Theory lessons: a few expression words set as they are printed in a part (italic serif, dynamics in bold italic).
 * Still, in ink (Nov 12): the tile reads as a page of music, not a diagram.
 */
export function TheoryPreview(){
  return <div className="learn-demo theory-words" aria-hidden="true">
    <span><i>dolce</i><b>mf</b></span>
    <span><i>cresc.</i><i>rit.</i></span>
    <span><b>pp</b><i>a tempo</i></span>
  </div>;
}

/** Body & embouchure: a note climbs the range while the page's own register cue changes with it. */
const EMB_NOTES=["C4","G4","E5","C6","G6"];
export function EmbouchurePreview(){
  const root=useRef<HTMLDivElement>(null),on=useOnScreen(root),i=useStep(EMB_NOTES.length,2400,on);
  const midi=midiOf(EMB_NOTES[i]),pct=(midi-MIN_NOTE)/(MAX_NOTE-MIN_NOTE)*100;
  return <div className="learn-demo emb-demo" ref={root} aria-hidden="true">
    <div className="emb-demo__side">
      <div className="emb-demo__track"><i style={{left:`${pct}%`}}/></div>
      <p className="emb-demo__ends"><span>low</span><span>high</span></p>
    </div>
  </div>;
}

/** Fingering chart: the note moves up and the real diagram changes with it. */
const FINGER_NOTES=["C4","G4","D5","A5","E6"];
export function FingeringPreview(){
  const root=useRef<HTMLDivElement>(null),on=useOnScreen(root),i=useStep(FINGER_NOTES.length,2400,on);
  const name=FINGER_NOTES[i],keys=fingeringsForMidi(midiOf(name))?.fingerings[0]?.keys??[];
  return <div className="learn-demo finger-demo" ref={root} aria-hidden="true">
    <div className="finger-demo__side"><FluteDiagram pressed={keys}/></div>
  </div>;
}

/** Trill chart: a note marked with the standard tr ornament; the fingering flickers between its two states, moving keys highlighted. */
const TRILL=trills.find(t=>!t.unavailable&&t.base==="C5"&&t.interval===2)??trills.find(t=>!t.unavailable)!;
export function TrillPreview(){
  const root=useRef<HTMLDivElement>(null),on=useOnScreen(root),flick=useStep(2,600,on);
  return <div className="learn-demo finger-demo" ref={root} aria-hidden="true">
    <div className="finger-demo__side"><FluteDiagram pressed={on&&flick?TRILL.upperKeys:TRILL.lowerKeys} moving={movingKeys(TRILL)}/></div>
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
