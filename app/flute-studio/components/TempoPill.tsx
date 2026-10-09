"use client";
import {useState,type CSSProperties} from "react";
import {PracticeIcon} from "./PracticeIcon";
import "./tempo-pill.css";

/**
 * The one tempo control (COMPONENTS.md): a metronome tap, −, the number (type to set it), +. Scale Studio pins it
 * above each exercise on the score (ScoreTempoMarks); tricky bits use it inline. One BPM a click: you nudge a tempo
 * you already have rather than dial one in. `className`/`style` are for placement only.
 */
export function TempoPill({tempo,onChange,sounding,onSound,label,size="small",className,style}:{
  tempo:number;onChange:(tempo:number)=>void;sounding:boolean;onSound:()=>void;label:string;
  size?:"small"|"large";className?:string;style?:CSSProperties;
}){
  const [draft,setDraft]=useState<string|null>(null);
  const commit=(value:number)=>onChange(Math.max(40,Math.min(220,Math.round(value))));
  return <span className={["tempo-pill",`tempo-pill--${size}`,sounding?"is-sounding":"",className??""].filter(Boolean).join(" ")} style={style}>
    <button type="button" className="tempo-pill__sound" aria-pressed={sounding} aria-label={sounding?`${label}: stop metronome`:`${label}: metronome at ${tempo}`} onClick={onSound}><PracticeIcon name="metronome"/></button>
    <button type="button" className="tempo-pill__step" aria-label={`${label}: 1 BPM slower`} disabled={tempo<=40} onClick={()=>commit(tempo-1)}>−</button>
    <label className="tempo-pill__value"><input type="number" min={40} max={220} aria-label={`${label}: practice tempo in BPM`}
      value={draft??tempo}
      onChange={e=>setDraft(e.target.value)}
      onBlur={()=>{if(draft===null)return;const next=Number(draft);const valid=Number.isFinite(next)&&draft.trim()!=="";setDraft(null);if(valid)commit(next)}}
      onKeyDown={e=>{if(e.key==="Enter")e.currentTarget.blur()}}/></label>
    <button type="button" className="tempo-pill__step" aria-label={`${label}: 1 BPM faster`} disabled={tempo>=220} onClick={()=>commit(tempo+1)}>+</button>
  </span>;
}
