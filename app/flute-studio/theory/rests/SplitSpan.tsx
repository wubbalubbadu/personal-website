'use client';
import {useRef,type PointerEvent} from 'react';

/** A cut through the midpoint divides a duration. Tap and keyboard are equivalent alternatives. */
export default function SplitSpan({x,y,width,enabled,label,onSplit}:{x:number;y:number;width:number;enabled:boolean;label:string;onSplit:()=>void}){
  const start=useRef<{x:number;y:number}|null>(null);
  const at=(e:PointerEvent<SVGGElement>)=>{const m=e.currentTarget.ownerSVGElement?.getScreenCTM();return m?new DOMPoint(e.clientX,e.clientY).matrixTransform(m.inverse()):null};
  return <g className={`rests-split-target${enabled?' is-enabled':''}`} role={enabled?'button':undefined} tabIndex={enabled?0:undefined} aria-label={label}
    onPointerDown={e=>{if(!enabled)return;start.current=at(e);e.currentTarget.setPointerCapture(e.pointerId)}}
    onPointerUp={e=>{const from=start.current,to=at(e);start.current=null;if(!enabled||!from||!to)return;const midpoint=x+width/2;const tap=Math.hypot(to.x-from.x,to.y-from.y)<8;const cuts=Math.min(from.y,to.y)<=y&&Math.max(from.y,to.y)>=y&&Math.abs((from.x+to.x)/2-midpoint)<28;if(tap||cuts)onSplit()}}
    onPointerCancel={()=>{start.current=null}}
    onKeyDown={e=>{if(enabled&&(e.key==='Enter'||e.key===' ')){e.preventDefault();onSplit()}}}>
    <path className="rests-span" d={`M${x} ${y-12} v12 h${width} v-12`}/>
    {enabled&&<><path className="rests-cut" d={`M${x+width/2} ${y-20} v40`}/><rect className="rests-cut-hit" x={x+width/2-30} y={y-32} width="60" height="64"/></>}
  </g>;
}
