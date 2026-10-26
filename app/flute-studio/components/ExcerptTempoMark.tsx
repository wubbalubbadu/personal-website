"use client";
import {usePracticeTempoMarks} from "../lib/practiceTempoMarks";
import {TempoPill} from "./TempoPill";
import {RepPill} from "./RepPill";

/**
 * An excerpt's tempo and tally (COMPONENTS.md): Scale Studio's TempoPill + RepPill pair, one per passage tab, above the
 * music. The PDF and XML views show the same pair under the same tally key, so a rep counts whichever view you read
 * from. Shown or hidden from View settings ("Practice tempo"), one switch with Scale Studio's.
 */
/** Shown or hidden everywhere at once, Scale Studio included (lib/practiceTempoMarks). */
export const useExcerptTempoMark=usePracticeTempoMarks;

export function ExcerptTempoMark({itemId,passageId,title,tempo,onChange,sounding,onSound,zh}:{itemId:string;passageId:string;title:string;tempo:number;onChange:(tempo:number)=>void;sounding:boolean;onSound:()=>void;zh:boolean}){
  return <div className="excerpt-tempo-mark">
    <TempoPill label={title} tempo={tempo} onChange={onChange} sounding={sounding} onSound={onSound} history={`excerpt:${itemId}:${passageId}`}/>
    <RepPill item={{key:`excerpt:${itemId}:${passageId}`,title,kind:"piece"}} tempo={tempo} zh={zh}/>
  </div>;
}
