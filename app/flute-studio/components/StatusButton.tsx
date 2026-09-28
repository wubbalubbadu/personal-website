"use client";

import {useEffect,useRef,useState} from "react";
import {STATUSES,STATUS_LABELS,STATUS_TONES,setStatus,useStatuses} from "../lib/musicStatus";
import "./status-button.css";

/**
 * How the studio keeps things (there is no star): put a piece, a book or an
 * exercise on one of your lists. One tap on something not yet on a list puts
 * it on Want to learn and opens the menu, so saving stays a single tap and
 * moving it to Working on or Learned is one more. Choosing the current list
 * again, or Remove, takes it off.
 *
 * `compact` is for Library rows: a round + until the item is on a list,
 * then the list's name with its dot.
 */
export function StatusButton({id,zh,compact=false}:{id:string;zh:boolean;compact?:boolean}){
  const status=useStatuses()[id];
  const [open,setOpen]=useState(false);
  const wrap=useRef<HTMLSpanElement>(null);
  useEffect(()=>{
    if(!open)return;
    const away=(event:PointerEvent)=>{if(!wrap.current?.contains(event.target as Node))setOpen(false)};
    const key=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false)};
    window.addEventListener("pointerdown",away);window.addEventListener("keydown",key);
    return()=>{window.removeEventListener("pointerdown",away);window.removeEventListener("keydown",key)};
  },[open]);
  const label=status?STATUS_LABELS[status][zh?"zh":"en"]:zh?"加入想学":"Want to learn";
  // Inside a Library row the button sits in a link; keep taps to itself.
  const own=(event:React.MouseEvent)=>{event.preventDefault();event.stopPropagation()};
  return <span className={`status-button${compact?" status-button--compact":""}`} ref={wrap}>
    <button type="button" className="status-button__trigger" data-status={status??undefined} aria-haspopup="menu" aria-expanded={open}
      aria-label={status?`${label}. ${zh?"更改列表":"Change list"}`:zh?"加入想学列表":"Add to Want to learn"}
      onClick={event=>{own(event);if(!status)setStatus(id,"want");setOpen(value=>!value)}}>
      {status?<i className="status-dot" data-tone={STATUS_TONES[status]} aria-hidden="true"/>:<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4.5v11M4.5 10h11"/></svg>}
      <span>{label}</span>
    </button>
    {open&&<span className="status-button__menu" role="menu">
      {STATUSES.map(value=><button key={value} type="button" role="menuitemradio" aria-checked={status===value} className={status===value?"is-on":""}
        onClick={event=>{own(event);setStatus(id,value);setOpen(false)}}>
        <i className="status-dot" data-tone={STATUS_TONES[value]} aria-hidden="true"/><span>{STATUS_LABELS[value][zh?"zh":"en"]}</span>{status===value&&<b aria-hidden="true">✓</b>}
      </button>)}
      {status&&<button type="button" role="menuitem" className="status-button__remove" onClick={event=>{own(event);setStatus(id,null);setOpen(false)}}>{zh?"从列表中移除":"Remove from lists"}</button>}
    </span>}
  </span>;
}
