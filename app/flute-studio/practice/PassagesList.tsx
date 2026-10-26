"use client";
import Link from "next/link";
import {useEffect,useState,type ReactNode} from "react";
import {activeBits,bitHistoryKey,bitHref,removeBit,setBitDone,type TrickyBit} from "../lib/trickyBits";
import {hasTrend,tempoPoints,useTempoHistory} from "../lib/tempoHistory";
import {TempoTrend,shortDay} from "../components/TempoTrend";
import {PracticeIcon} from "../components/PracticeIcon";

/**
 * My Studio's Tricky bits: the hard passages you are working on, as one list across all your pieces (the Routine's
 * checklist rows). Each opens its piece at those bars, selected, with the close-up open. The circle marks a passage
 * done: it moves to the folded Done group and keeps its tempos, so ticking it again brings it back. Trash deletes, after
 * asking once ("Tap again to delete"), since a passage's tempos and reps go with it.
 * Its tempo over the weeks (lib/tempoHistory.ts) shows as a small line once there are two days of it.
 */
export function PassagesList({bits,titleOf,zh,labels,heading,actions,firstRow}:{
  bits:TrickyBit[];titleOf:(bit:TrickyBit)=>string;zh:boolean;
  labels:{bars:string};heading:ReactNode;actions?:ReactNode;
  /** The section's "Show all" cut (the page's first-row rule). */
  firstRow:(rows:TrickyBit[])=>TrickyBit[];
}){
  const history=useTempoHistory();
  // The trash that has been tapped once and is waiting for the second tap; it calms down again after a few seconds.
  const [armed,setArmed]=useState<string|null>(null);
  useEffect(()=>{if(!armed)return;const timer=window.setTimeout(()=>setArmed(null),3000);return()=>window.clearTimeout(timer)},[armed]);
  if(!bits.length)return null;
  // Pieces in the order you first saved a passage from them, bars in order inside each, so one piece's passages sit together.
  const firstSaved=new Map<string,number>();
  for(const bit of bits)firstSaved.set(bit.pieceId,Math.min(firstSaved.get(bit.pieceId)??Infinity,bit.addedAt));
  const ordered=[...bits].sort((a,b)=>firstSaved.get(a.pieceId)!-firstSaved.get(b.pieceId)!||a.pieceId.localeCompare(b.pieceId)||a.from-b.from);
  const active=activeBits(ordered),done=ordered.filter(bit=>bit.done).sort((a,b)=>b.done!-a.done!);

  const row=(bit:TrickyBit)=>{
    const title=titleOf(bit),points=tempoPoints(history[bitHistoryKey(bit)]);
    // The tempo you are at: the latest practised day if there is one, else the fastest tempo saved on the bit.
    const now=points.at(-1)?.bpm??(bit.tempos.length?Math.max(...bit.tempos):null);
    const tempo=now?`${now}${bit.goal&&!bit.done?` → ${bit.goal}`:""}`:bit.goal&&!bit.done?(zh?`目标 ${bit.goal}`:`Goal ${bit.goal}`):"";
    const when=bit.done?(zh?`${shortDay(dayOf(bit.done),zh)} 完成`:`Done ${shortDay(dayOf(bit.done),zh)}`):"";
    const meta=[`${labels.bars} ${bit.label}`,tempo,when].filter(Boolean).join(" · ");
    const name=zh?`《${title}》第 ${bit.label} 小节`:`${title}, bars ${bit.label}`;
    return <li key={bit.id} className={bit.done?"done":undefined}>
      <label className="routine-list__check">
        <input type="checkbox" checked={!!bit.done} onChange={()=>setBitDone(bit.id,!bit.done)}
          aria-label={bit.done?(zh?`${name}：放回正在练`:`Put ${name} back on your list`):(zh?`${name}：标记为练好了`:`Mark ${name} done`)}/>
        <span aria-hidden="true">✓</span>
      </label>
      <Link className="passages__main" href={bitHref(bit,{back:"studio"})}><b>{title}</b><small>{meta}</small></Link>
      {hasTrend(points)&&!bit.done&&<span className="passages__trend"><TempoTrend points={points} zh={zh} small/></span>}
      <button type="button" className={armed===bit.id?"routine-delete is-armed":"routine-delete"}
        aria-label={armed===bit.id?(zh?`再点一下删除${name}`:`Tap again to delete ${name}`):(zh?`删除${name}`:`Delete ${name}`)}
        onClick={()=>{if(armed!==bit.id){setArmed(bit.id);return}removeBit(bit.id);setArmed(null)}}><PracticeIcon name="delete"/></button>
    </li>;
  };

  return <section id="shelf-tricky" className="shelf passages" aria-label={typeof heading==="string"?heading:undefined}>
    <div className="section-head">{heading}{actions&&<span className="section-head__actions">{actions}</span>}</div>
    {active.length>0&&<ol className="routine-list passages__list">{firstRow(active).map(row)}</ol>}
    {/* Done passages fold away: kept with their tempos, out of the way of what you are still working on. */}
    {done.length>0&&<details className="passages__done">
      <summary>{zh?`练好了 (${done.length})`:`Done (${done.length})`}</summary>
      <ol className="routine-list passages__list">{done.map(row)}</ol>
    </details>}
  </section>;
}

const dayOf=(at:number)=>{const d=new Date(at);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`};
