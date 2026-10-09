'use client';
import {useRef,useState,type PointerEvent} from 'react';
import {TIME_SIG_GLYPHS} from '../timeSignatureGlyphs';

/** Replace only the top number, keeping the rest and lower number stationary. */
export default function MeterSwap({x,onChange,zh}:{x:number;onChange:()=>void;zh:boolean}){
  const [selected,setSelected]=useState(false),[pen,setPen]=useState<{x:number;y:number}|null>(null);
  const drag=useRef(false);
  const at=(e:PointerEvent<SVGGElement>)=>{const m=e.currentTarget.ownerSVGElement?.getScreenCTM();return m?new DOMPoint(e.clientX,e.clientY).matrixTransform(m.inverse()):null};
  const glyph=(cx:number,cy:number)=><path d={TIME_SIG_GLYPHS['3'].d} transform={`translate(${cx} ${cy}) scale(${48/673} ${-48/673})`}/>;
  const choose=()=>setSelected(true);
  return <g onPointerMove={e=>{if(drag.current)setPen(at(e))}} onPointerUp={e=>{if(!drag.current)return;drag.current=false;setPen(null);const p=at(e);if(p&&Math.abs(p.x-(x+16))<40&&p.y>92&&p.y<160)onChange()}} onPointerCancel={()=>{drag.current=false;setPen(null)}}>
    <rect x={x-8} y="98" width="52" height="60" className={`rests-hit rests-gap${selected?' is-selected':''}`} role="button" tabIndex={0} aria-label={zh?'把上面的数字换成 3':'Replace the top number with 3'} onClick={()=>{if(selected)onChange()}} onKeyDown={e=>{if(selected&&(e.key==='Enter'||e.key===' ')){e.preventDefault();onChange()}}}/>
    <g role="button" tabIndex={0} aria-label={zh?'选择数字 3':'Choose number 3'} onPointerDown={e=>{e.preventDefault();choose();drag.current=true;e.currentTarget.setPointerCapture(e.pointerId)}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose()}}}>
      {glyph(338,365)}{selected&&<circle className="rests-selection" cx="355" cy="342" r="34"/>}<rect className="rests-hit" x="315" y="304" width="80" height="80"/>
    </g>
    {pen&&<g className="rests-drag-ghost">{glyph(pen.x-16,pen.y+24)}</g>}
  </g>;
}
