"use client";
import {useState} from "react";
import {usePendingSessions,savePending,discardPending} from "../lib/practiceClock";

const minutes=(seconds:number,zh:boolean)=>{const m=Math.floor(seconds/60),s=seconds%60;return zh?(m?`${m} 分 ${s} 秒`:`${s} 秒`):(m?`${m} min ${s} s`:`${s} s`)};

/**
 * "Save this practice?" for a finished stretch of the practice clock: what it was, how long, a note if you want one,
 * then Save (into your practice log) or Discard. Shows the oldest one waiting; more follow one by one. The inside of
 * a panel: the top bar shows it in the recorder's floating panel, My Studio inside the practice card.
 */
export function SessionReview({zh}:{zh:boolean}){
  const pending=usePendingSessions(),session=pending[0];
  const [note,setNote]=useState(""),[forId,setForId]=useState<string|null>(null);
  // The note belongs to the session it was written for; a new one starts empty.
  const text=forId===session?.id?note:"";
  if(!session)return null;
  const done=()=>{setNote("");setForId(null)};
  return <div className="session-review">
    <header><span>{zh?"保存这次练习？":"Save this practice?"}</span>{pending.length>1&&<small>{zh?`还有 ${pending.length-1} 个`:`${pending.length-1} more`}</small>}</header>
    <p className="session-review__what"><b>{session.title}</b><span>{minutes(session.durationSeconds,zh)}</span></p>
    <textarea value={text} onChange={e=>{setForId(session.id);setNote(e.target.value)}} rows={3}
      placeholder={zh?"写点感受（可不填）：哪里顺了，哪里还要练？":"A note, if you like: what went well, what needs work?"} aria-label={zh?"练习笔记":"Practice note"}/>
    <div className="recorder-actions">
      <button type="button" className="recorder-delete" onClick={()=>{discardPending(session.id);done()}}>{zh?"不保存":"Discard"}</button>
      <button type="button" className="recorder-save" onClick={()=>{savePending(session.id,text);done()}}>{zh?"保存":"Save"}</button>
    </div>
  </div>;
}
