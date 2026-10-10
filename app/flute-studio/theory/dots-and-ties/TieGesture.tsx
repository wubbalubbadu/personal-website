'use client';
import {useRef,useState,type PointerEvent} from 'react';

/** Forgiving connection: draw between noteheads or tap/keyboard-select the two endpoints. */
export default function TieGesture({from,to,y,joined,onJoin,zh}:{from:number;to:number;y:number;joined:boolean;onJoin:(join:boolean)=>void;zh:boolean}){
  const [selected,setSelected]=useState(false),[ink,setInk]=useState<{x:number;y:number}[]>([]);
  const start=useRef<{x:number;y:number}|null>(null);
  const at=(e:PointerEvent<SVGElement>)=>{const m=e.currentTarget.ownerSVGElement?.getScreenCTM();return m?new DOMPoint(e.clientX,e.clientY).matrixTransform(m.inverse()):null};
  const target=(end:boolean)=>{if(end&&selected){onJoin(true);setSelected(false)}else if(!end)setSelected(true)};
  return <g>
    {selected&&!joined&&<circle className="dt-selection" cx={from} cy={y} r="23"/>}
    {ink.length>1&&!joined&&<polyline className="dt-ink" points={ink.map(p=>`${p.x},${p.y}`).join(' ')}/>}
    {!joined&&<rect className="dt-hit dt-tie-area" x={from-28} y={y-28} width={to-from+56} height="98"
      onPointerDown={e=>{const p=at(e);if(!p||Math.abs(p.x-from)>35||Math.abs(p.y-y)>35)return;start.current=p;setInk([p]);e.currentTarget.setPointerCapture(e.pointerId)}}
      onPointerMove={e=>{if(start.current){const p=at(e);if(p)setInk(v=>[...v,p])}}}
      onPointerUp={e=>{const p=at(e),first=start.current;start.current=null;setInk([]);if(first&&p&&Math.abs(p.x-to)<35&&Math.abs(p.y-y)<42)onJoin(true);else if(p&&Math.abs(p.x-from)<30)target(false);else if(p&&Math.abs(p.x-to)<30)target(true)}} onPointerCancel={()=>{start.current=null;setInk([])}}/>}
    {!joined&&[from,to].map((x,i)=><circle key={i} className="dt-endpoint" cx={x} cy={y+35} r="8" role="button" tabIndex={0} aria-label={zh?(i?'连接第二个音':'选择第一个音'):(i?'Connect the second note':'Select the first note')} onClick={()=>target(i===1)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();target(i===1)}}}/>)}
    {joined&&<rect className="dt-hit" x={from} y={y+18} width={to-from} height="36" role="button" tabIndex={0} aria-label={zh?'移除延音线':'Remove the tie'} onClick={()=>onJoin(false)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onJoin(false)}}}/>}
  </g>;
}
