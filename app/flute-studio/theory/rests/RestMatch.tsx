'use client';
import {useRef,useState,type PointerEvent} from 'react';
import {RowGraphics,layoutRow} from '../EngravedRow';
import {noteY} from '../model';

const TOP=[4,2,1],BOTTOM=[1,4,2],OFFSET=175;
const top=TOP.map(v=>({v})),bottom=BOTTOM.map(v=>({v,rest:true}));
const layout=layoutRow(top,{clef:false,right:660,even:true});
const {xs}=layout;
/** Connect note/rest values in one coordinate system; tap, drag and keyboard are equivalent. */
export default function RestMatch({practice,hint,matched,onMatch,zh}:{practice:boolean;hint:boolean;matched:number[];onMatch:(top:number,bottom:number)=>void;zh:boolean}){
  const svg=useRef<SVGSVGElement>(null),press=useRef<number|null>(null);
  const [selected,setSelected]=useState<number|null>(null),[pen,setPen]=useState<{x:number;y:number}|null>(null);
  const restNotes=practice?bottom:TOP.map(v=>({v,rest:true}));
  const names=zh?['全音符','二分音符','四分音符']:['Whole note','Half note','Quarter note'];
  const rests=zh?['四分休止符','全休止符','二分休止符']:['Quarter rest','Whole rest','Half rest'];
  const point=(e:PointerEvent<SVGSVGElement>)=>{const m=svg.current?.getScreenCTM();return m?new DOMPoint(e.clientX,e.clientY).matrixTransform(m.inverse()):null};
  const pick=(i:number)=>{if(!matched.includes(i))setSelected(i)};
  const answer=(i:number)=>{if(selected!==null){onMatch(selected,i);setSelected(null)}};
  return <svg ref={svg} className="engraved-row rests-canvas rests-match" viewBox="20 30 680 430" role="group" aria-label={zh?'连接时值相同的音符和休止符':'Match notes and rests of equal length'}
    onPointerMove={e=>{if(press.current!==null){const p=point(e);if(p)setPen(p)}}}
    onPointerUp={e=>{const start=press.current;press.current=null;setPen(null);if(start===null)return;const p=point(e);if(!p||p.y<265||p.y>410)return;const i=xs.findIndex(x=>Math.abs(x-p.x)<75);if(i>=0){onMatch(start,i);setSelected(null)}}}
    onPointerCancel={()=>{press.current=null;setPen(null);setSelected(null)}}>
    <RowGraphics notes={top} layout={layout} clef={false} finalBar={false}/>
    <g transform={`translate(0 ${OFFSET})`}><RowGraphics notes={restNotes} layout={layout} clef={false} finalBar={false}/></g>
    {(!practice||hint)&&TOP.map((v,i)=><text className="rests-caption" key={v} x={xs[i]} y="246">{v} {zh?'拍':v===1?'beat':'beats'}</text>)}
    {hint&&practice&&BOTTOM.map((v,i)=><text className="rests-caption" key={v} x={xs[i]} y="417">{v} {zh?'拍':v===1?'beat':'beats'}</text>)}
    {!practice&&TOP.map((v,i)=><text className="rests-caption" key={v} x={xs[i]} y="417">{v} {zh?'拍':v===1?'beat':'beats'}</text>)}
    {practice&&matched.map(i=><line className="rests-connection" key={i} x1={xs[i]} y1="212" x2={xs[BOTTOM.indexOf(TOP[i])]} y2="271"/>)}
    {pen&&selected!==null&&<line className="rests-connection is-drawing" x1={xs[selected]} y1="212" x2={pen.x} y2={pen.y}/>}
    {practice&&xs.map((x,i)=><g key={i}>
      <rect className={`rests-hit${selected===i?' is-selected':''}${matched.includes(i)?' is-right':''}`} x={x-40} y={noteY(8)-22} width="80" height="144" rx="12" role="button" tabIndex={0} aria-label={names[i]} aria-pressed={selected===i}
        onPointerDown={e=>{if(matched.includes(i))return;e.preventDefault();pick(i);press.current=i;svg.current?.setPointerCapture(e.pointerId)}}
        onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick(i)}}}/>
      <rect className="rests-hit" x={x-40} y="272" width="80" height="124" rx="12" role="button" tabIndex={0} aria-label={rests[i]}
        onClick={()=>answer(i)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();answer(i)}}}/>
    </g>)}
  </svg>;
}
export const matchingValue=(top:number,bottom:number)=>TOP[top]===BOTTOM[bottom];
