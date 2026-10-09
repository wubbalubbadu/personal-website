"use client";
import {useLayoutEffect,useRef,useState,type ReactNode,type RefObject,type CSSProperties} from 'react';
import {createPortal} from 'react-dom';
import {clampPanel} from './floatingPanel';

/** Keep a saved take on screen; move it by dragging its heading. */
export function RecordingPanel({anchor,children,role,label}:{anchor:RefObject<HTMLButtonElement|null>;children:ReactNode;role:'dialog'|'alert';label?:string}){
 const panel=useRef<HTMLDivElement>(null),drag=useRef<{x:number;y:number;left:number;top:number}|null>(null);
 const [position,setPosition]=useState({left:8,top:8});
 const fit=(left:number,top:number)=>{const box=panel.current?.getBoundingClientRect();return clampPanel(left,top,box?.width??320,box?.height??200,document.documentElement.clientWidth,window.innerHeight)};
 useLayoutEffect(()=>{
  // Measure the real anchor before paint to avoid a visible position jump.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  const box=anchor.current?.getBoundingClientRect();setPosition(fit(box?.left??8,box?.bottom??8));
  const resize=()=>setPosition(old=>fit(old.left,old.top));window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);
 },[anchor]);
 return createPortal(<div ref={panel} className="recorder-pop recorder-pop--floating" role={role} aria-label={label} style={{"--record-panel-left":`${position.left}px`,"--record-panel-top":`${position.top}px`} as CSSProperties}
  onPointerDown={event=>{if(!(event.target as Element).closest('header')||(event.target as Element).closest('button'))return;const box=panel.current!.getBoundingClientRect();drag.current={x:event.clientX,y:event.clientY,left:box.left,top:box.top};event.currentTarget.setPointerCapture(event.pointerId);event.preventDefault()}}
  onPointerMove={event=>{const origin=drag.current;if(origin)setPosition(fit(origin.left+event.clientX-origin.x,origin.top+event.clientY-origin.y))}}
  onPointerUp={()=>{drag.current=null}} onPointerCancel={()=>{drag.current=null}}>{children}</div>,document.body);
}
