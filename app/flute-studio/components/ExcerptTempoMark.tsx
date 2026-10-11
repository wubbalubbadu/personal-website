"use client";
import {useEffect,useState} from "react";
import {TempoPill} from "./TempoPill";
import {RepPill} from "./RepPill";

/**
 * An excerpt's tempo and tally (COMPONENTS.md): Scale Studio's TempoPill + RepPill pair, one per passage tab, above the
 * music. The PDF and XML views show the same pair under the same tally key, so a rep counts whichever view you read
 * from. Shown or hidden from View settings ("Practice tempo"), remembered for all excerpts.
 */
const SHOW_KEY="cookie:excerpt-tempo-mark";

export function useExcerptTempoMark():[boolean,(on:boolean)=>void]{
  const [on,setOn]=useState(true);
  // Saved choice lives in localStorage, readable only after hydration.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>{try{setOn(localStorage.getItem(SHOW_KEY)!=="0")}catch{/* shown */}},[]);
  return [on,(next:boolean)=>{setOn(next);try{localStorage.setItem(SHOW_KEY,next?"1":"0")}catch{/* this visit only */}}];
}

export function ExcerptTempoMark({itemId,passageId,title,tempo,onChange,sounding,onSound,zh}:{itemId:string;passageId:string;title:string;tempo:number;onChange:(tempo:number)=>void;sounding:boolean;onSound:()=>void;zh:boolean}){
  return <div className="excerpt-tempo-mark">
    <TempoPill label={title} tempo={tempo} onChange={onChange} sounding={sounding} onSound={onSound}/>
    <RepPill item={{key:`excerpt:${itemId}:${passageId}`,title,kind:"piece"}} tempo={tempo} zh={zh}/>
  </div>;
}
