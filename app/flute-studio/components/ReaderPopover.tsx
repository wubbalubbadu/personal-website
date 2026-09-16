"use client";
import {useLayoutEffect,useRef,useState,type ReactNode} from "react";
import {createPortal} from "react-dom";

/** Shared button-anchored settings surface; edits do not dismiss the panel. */
export function ReaderPopover({label,trigger,children,className="",open:controlledOpen,onOpenChange}:{label:string;trigger:ReactNode;children:ReactNode;className?:string;open?:boolean;onOpenChange?:(open:boolean)=>void}){
  const panel=useRef<HTMLDivElement>(null),button=useRef<HTMLButtonElement>(null);
  const [uncontrolledOpen,setUncontrolledOpen]=useState(false),[placed,setPlaced]=useState(false),[position,setPosition]=useState({left:12,top:60,width:360});
  const open=controlledOpen??uncontrolledOpen;
  const setOpen=(value:boolean|((previous:boolean)=>boolean))=>{
    const next=typeof value==="function"?value(open):value;
    if(controlledOpen===undefined)setUncontrolledOpen(next);
    onOpenChange?.(next);
  };
  // Placement runs in a LAYOUT effect, before the browser paints: a plain
  // effect let the panel paint once at its default {left:12,top:60} — a
  // full panel flashing in the top-left corner before jumping under its
  // button, most visible on a fresh load when nothing is warm yet. The
  // `placed` gate covers the rest: until the first measurement lands the
  // panel is laid out but not painted.
  useLayoutEffect(()=>{
    if(!open){setPlaced(false);return}
    // Anchors to the trigger's LEFT edge (clamped to stay on-screen) rather
    // than its right edge — a trigger sitting anywhere left-of-center would
    // otherwise force the panel's right edge to hug it, dragging the whole
    // panel off toward the left screen edge instead of opening under the
    // button that was actually clicked.
    // The panel has no internal scrollbar (by design — see reader-settings-panel
    // in reader-workspace.css), so a tall one (e.g. Practice tempos expanded)
    // can run past the bottom of a short window with no way to reach the rest
    // of it. Pull `top` up — using the panel's own measured height, which
    // changes whenever an accordion section opens/closes — so its bottom edge
    // never passes the viewport; only floors at 12px from the top, which for
    // genuinely taller-than-the-screen content is the best that's possible
    // without reintroducing a scrollbar.
    function place(){
      const rect=button.current?.getBoundingClientRect();if(!rect)return;
      const width=Math.min(360,window.innerWidth-24);
      const height=panel.current?.getBoundingClientRect().height??0;
      const top=Math.max(12,Math.min(rect.bottom+8,window.innerHeight-height-12));
      setPosition({width,left:Math.max(12,Math.min(rect.left,window.innerWidth-width-12)),top});setPlaced(true);
    }
    function outside(event:PointerEvent){const node=event.target as Node;if(!panel.current?.contains(node)&&!button.current?.contains(node))setOpen(false)}
    function key(event:KeyboardEvent){if(event.key==="Escape"){setOpen(false);button.current?.focus()}}
    place();document.addEventListener("pointerdown",outside);document.addEventListener("keydown",key);window.addEventListener("resize",place);
    const resize=panel.current&&new ResizeObserver(place);
    if(panel.current&&resize)resize.observe(panel.current);
    return()=>{resize?.disconnect();document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",key);window.removeEventListener("resize",place)};
  },[open]);
  return <span className="reader-popover-anchor"><button ref={button} type="button" className={className} aria-label={label} data-tip={label} aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{trigger}</button>{open&&createPortal(<div ref={panel} role="dialog" aria-label={label} className="reader-settings-panel" style={{...position,visibility:placed?"visible":"hidden"}}><div className="reader-panel-heading"><strong>{label}</strong><button type="button" aria-label={`Close ${label}`} onClick={()=>{setOpen(false);button.current?.focus()}}>×</button></div>{children}</div>,document.fullscreenElement??document.body)}</span>;
}
