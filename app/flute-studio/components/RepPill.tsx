"use client";
import TallySticks from "./TallySticks";
import {logRep,repDay,useRepLog,type RepItem} from "../lib/repLog";
import "./rep-pill.css";

/**
 * Today's repetitions of one thing at one tempo, as a small pill beside its TempoPill (COMPONENTS.md): a few tally
 * sticks, the count, − and +. Skills start from zero each day; the day report and My Studio's "most practised" add
 * them up (lib/repLog.ts). `className`/`style` are for placement only.
 */
export function RepPill({item,tempo,zh,className}:{item:RepItem;tempo:number;zh:boolean;className?:string}){
  const log=useRepLog(),count=log[repDay()]?.[item.key]?.reps?.[String(Math.round(tempo))]??0;
  const text=zh?{add:`${item.title}：在 ${tempo} 记一次`,undo:`${item.title}：撤销一次`,label:`${item.title}，今天在 ${tempo} 练了 ${count} 次`}
    :{add:`${item.title}: one more at ${tempo}`,undo:`${item.title}: take one off`,label:`${item.title}: ${count} today at ${tempo}`};
  return <span className={className?`rep-pill ${className}`:"rep-pill"} role="group" aria-label={text.label}>
    {count>0&&<><TallySticks count={Math.min(count,10)}/><b>{count}</b>
      <button type="button" className="rep-pill__step" aria-label={text.undo} onClick={()=>logRep(item,tempo,-1)}>−</button></>}
    <button type="button" className="rep-pill__step" aria-label={text.add} onClick={()=>logRep(item,tempo,1)}>+</button>
  </span>;
}
