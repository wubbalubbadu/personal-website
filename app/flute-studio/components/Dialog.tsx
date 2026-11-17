"use client";
import {useEffect,useRef,type ReactNode,type Ref} from "react";
import {nextFocusIndex,tabbableWithin} from "../lib/focusTrap";
import {CloseButton} from "./CloseButton";
import "./dialog.css";

/**
 * The one dialog shell (COMPONENTS.md): a dimmed backdrop that closes on tap, a white panel, and a title row that
 * always ends in the shared CloseButton. Escape closes it. What goes inside is the caller's.
 * Focus: opening moves focus into the dialog (to a `data-autofocus` element if the caller marked one, else the first
 * control; a caller that focuses something itself is left alone), Tab and Shift+Tab stay inside, and closing gives
 * focus back to whatever had it before.
 * `title` is the left of the title row (a heading, or a heading with a pager). `width` is "medium" (forms) or "wide"
 * (music). `panelClassName` is for the caller's own layout inside the panel, never for the shell's look.
 */
export function Dialog({label,closeLabel,onClose,title,width="medium",panelClassName,panelRef,children}:{
  label:string;closeLabel:string;onClose:()=>void;title:ReactNode;width?:"medium"|"wide";
  panelClassName?:string;panelRef?:Ref<HTMLDivElement>;children:ReactNode;
}){
  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{if(event.key==="Escape")onClose()};
    window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);
  },[onClose]);
  const root=useRef<HTMLDivElement>(null);
  // Focus in on open, back out on close. Runs after the children's own effects, so their autofocus wins.
  useEffect(()=>{
    const dialog=root.current,opener=document.activeElement instanceof HTMLElement?document.activeElement:null;
    if(dialog&&!dialog.contains(document.activeElement)){
      (dialog.querySelector<HTMLElement>("[data-autofocus]")??tabbableWithin(dialog)[0])?.focus();
      // Nothing to focus, or the panel is still hidden (the tricky bit dialog waits for its music): hold focus here.
      if(!dialog.contains(document.activeElement))dialog.focus();
    }
    return()=>{
      // Only when focus was left in the dialog (now gone, so on the page body): a caller that moved it keeps it.
      const active=document.activeElement;
      if(opener?.isConnected&&(!active||active===document.body||dialog?.contains(active)))opener.focus();
    };
  },[]);
  // Tab wraps at the two ends. The tab stops are read at each key press because the contents change.
  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{
      const dialog=root.current,active=document.activeElement;
      if(event.key!=="Tab"||event.altKey||event.ctrlKey||event.metaKey||!dialog)return;
      // A popover opened from inside the dialog lives outside it (ReaderPopover portals to the body): leave it be.
      if(active instanceof Element&&!dialog.contains(active)&&active.closest('[role="dialog"]'))return;
      const stops=tabbableWithin(dialog),next=nextFocusIndex(stops.length,stops.indexOf(active as HTMLElement),event.shiftKey);
      if(next===null)return;
      event.preventDefault();
      (stops[next]??dialog).focus();
    };
    window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);
  },[]);
  return <div className="dialog" role="dialog" aria-modal="true" aria-label={label} ref={root} tabIndex={-1} style={{outline:"none"}}>
    <button type="button" className="dialog__scrim" aria-label={closeLabel} tabIndex={-1} onClick={onClose}/>
    <div className={`dialog__panel dialog__panel--${width}${panelClassName?` ${panelClassName}`:""}`} ref={panelRef}>
      <div className="dialog__head">
        <div className="dialog__title">{title}</div>
        <CloseButton className="dialog__close" label={closeLabel} onClick={onClose}/>
      </div>
      {children}
    </div>
  </div>;
}
