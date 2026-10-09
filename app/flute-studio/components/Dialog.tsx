"use client";
import {useEffect,type ReactNode,type Ref} from "react";
import {CloseButton} from "./CloseButton";
import "./dialog.css";

/**
 * The one dialog shell (COMPONENTS.md): a dimmed backdrop that closes on tap, a white panel, and a title row that
 * always ends in the shared CloseButton. Escape closes it. What goes inside is the caller's.
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
  return <div className="dialog" role="dialog" aria-modal="true" aria-label={label}>
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
