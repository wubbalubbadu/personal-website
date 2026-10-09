"use client";
import {useState} from "react";
import {logRep,repDay,useRepLog,type RepItem} from "../lib/repLog";
import "./rep-pill.css";

/**
 * Today's repetitions of one thing at one tempo, beside its TempoPill and built the same way (COMPONENTS.md): a
 * tally mark, −, the number (type to set it), +. Pink, so the pair reads as tempo and count. Always the same size,
 * whatever the count. Skills start from zero each day; the day report and My Studio's "most practised" add them up
 * (lib/repLog.ts). `className` is for placement only.
 */
export function RepPill({item,tempo,zh,className}:{item:RepItem;tempo:number;zh:boolean;className?:string}){
  const log=useRepLog(),count=log[repDay()]?.[item.key]?.reps?.[String(Math.round(tempo))]??0;
  const [draft,setDraft]=useState<string|null>(null);
  const text=zh?{add:`${item.title}：在 ${tempo} 记一次`,undo:`${item.title}：撤销一次`,label:`${item.title}，今天在 ${tempo} 练了 ${count} 次`,field:`${item.title}：今天的次数`}
    :{add:`${item.title}: one more at ${tempo}`,undo:`${item.title}: take one off`,label:`${item.title}: ${count} today at ${tempo}`,field:`${item.title}: reps today`};
  // Typing a number sets today's count to it (the log records the difference).
  const commit=()=>{if(draft===null)return;const next=Math.max(0,Math.min(999,Math.round(Number(draft))));setDraft(null);if(Number.isFinite(next)&&draft.trim()!==""&&next!==count)logRep(item,tempo,next-count)};
  return <span className={className?`rep-pill ${className}`:"rep-pill"} role="group" aria-label={text.label}>
    <svg className="rep-pill__mark" viewBox="0 0 16 14" width="14" height="12" aria-hidden="true"><path d="M2 1v12M5.5 1v12M9 1v12M12.5 1v12M0.5 11 15 3"/></svg>
    <button type="button" className="rep-pill__step" aria-label={text.undo} disabled={count<=0} onClick={()=>logRep(item,tempo,-1)}>−</button>
    <label className="rep-pill__value"><input type="number" min={0} max={999} aria-label={text.field} value={draft??count}
      onChange={e=>setDraft(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==="Enter")e.currentTarget.blur()}}/></label>
    <button type="button" className="rep-pill__step" aria-label={text.add} onClick={()=>logRep(item,tempo,1)}>+</button>
  </span>;
}
