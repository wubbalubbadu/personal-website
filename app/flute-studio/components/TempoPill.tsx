"use client";
import {useEffect,useRef,useState,type CSSProperties} from "react";
import {PracticeIcon} from "./PracticeIcon";
import {TEMPO_MIN,TEMPO_MAX,clampTempo,liveTempo,LIVE_TEMPO_DELAY} from "../lib/scoreTempo";
import {TempoHistoryButton} from "./TempoTrend";
import {useLanguage} from "../i18n/LanguageContext";
import "./tempo-pill.css";

/**
 * The one tempo control (COMPONENTS.md): a metronome tap, −, the number (type to set it), +. Scale Studio pins it
 * above each exercise on the score (ScoreTempoMarks); tricky bits use it inline. One BPM a click: you nudge a tempo
 * you already have rather than dial one in. `className`/`style` are for placement only. `history` is the thing's
 * tempo-history key (its RepPill key): once two days are recorded a small trend button opens your tempo over the weeks.
 */
export function TempoPill({tempo,onChange,sounding,onSound,label,size="small",className,style,history}:{
  tempo:number;onChange:(tempo:number)=>void;sounding:boolean;onSound:()=>void;label:string;
  size?:"small"|"large";className?:string;style?:CSSProperties;history?:string;
}){
  const {lang}=useLanguage();
  const [draft,setDraft]=useState<string|null>(null);
  const commit=(value:number)=>onChange(clampTempo(value));
  // Apply a typed tempo once typing pauses, keeping the draft on screen until the field closes.
  // Through a ref: callers pass a fresh onChange on every render, and playback re-renders often enough to keep restarting the timer.
  const changeRef=useRef(onChange);useEffect(()=>{changeRef.current=onChange});
  useEffect(()=>{if(draft===null)return;const value=liveTempo(draft);if(value===null||value===tempo)return;const timer=window.setTimeout(()=>changeRef.current(value),LIVE_TEMPO_DELAY);return()=>window.clearTimeout(timer)},[draft,tempo]);
  return <span className={["tempo-pill",`tempo-pill--${size}`,sounding?"is-sounding":"",className??""].filter(Boolean).join(" ")} style={style}>
    <button type="button" className="tempo-pill__sound" aria-pressed={sounding} aria-label={sounding?`${label}: stop metronome`:`${label}: metronome at ${tempo}`} onClick={onSound}><PracticeIcon name="metronome"/></button>
    <button type="button" className="tempo-pill__step" aria-label={`${label}: 1 BPM slower`} disabled={tempo<=TEMPO_MIN} onClick={()=>commit(tempo-1)}>−</button>
    <label className="tempo-pill__value"><input type="number" min={TEMPO_MIN} max={TEMPO_MAX} aria-label={`${label}: practice tempo in BPM`}
      value={draft??tempo}
      onChange={e=>setDraft(e.target.value)}
      onBlur={()=>{if(draft===null)return;const next=Number(draft);const valid=Number.isFinite(next)&&draft.trim()!=="";setDraft(null);if(valid)commit(next)}}
      onKeyDown={e=>{if(e.key==="Enter")e.currentTarget.blur()}}/></label>
    <button type="button" className="tempo-pill__step" aria-label={`${label}: 1 BPM faster`} disabled={tempo>=TEMPO_MAX} onClick={()=>commit(tempo+1)}>+</button>
    {history&&<TempoHistoryButton historyKey={history} title={label} zh={lang==="zh"}/>}
  </span>;
}
