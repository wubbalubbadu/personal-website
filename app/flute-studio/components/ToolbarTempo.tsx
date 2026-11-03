"use client";
import type {InputHTMLAttributes} from "react";
import {TEMPO_MIN,TEMPO_MAX} from "../lib/scoreTempo";

/** The grey reader tempo box. Callers own playback, draft commits and localization. */
export function ToolbarTempo({value,onStep,slower,faster,tip,input}:{
 value:number;onStep:(direction:1|-1)=>void;slower:string;faster:string;tip?:string;
 input:InputHTMLAttributes<HTMLInputElement>;
}){
 return <div className="tempo">
  <button type="button" className="tempo-step" aria-label={slower} disabled={value<=TEMPO_MIN} onClick={()=>onStep(-1)}>−</button>
  <label className={`tempo-field${tip!==undefined?" has-tip":""}`} data-tip={tip}><input type="number" min={TEMPO_MIN} max={TEMPO_MAX} {...input}/></label>
  <button type="button" className="tempo-step" aria-label={faster} disabled={value>=TEMPO_MAX} onClick={()=>onStep(1)}>+</button>
 </div>;
}
