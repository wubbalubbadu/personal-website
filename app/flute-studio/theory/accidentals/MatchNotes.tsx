'use client';
import {useEffect,useRef,useState,type PointerEvent} from 'react';
import {RowGraphics,layoutRow,type RowNote} from '../EngravedRow';
import {noteY} from '../model';
import type {PairNote,Round} from './pairs';

/**
 * Two full-size staffs, one above the other, drawn by the same code as every other staff (RowGraphics).
 * Connect each note on the top staff to the note below it that is the same key: tap one and then the
 * other (the main way), or drag from one to the other. Everything is in one SVG (staff units) so the
 * lines, the staffs and the pointer share one coordinate system. The staffs never move: the keyboard
 * a hint brings back has its room reserved from the start. A line that is not a match fades away.
 */
const OFFSET=196,RIGHT=620,CLEARANCE=26;
const rowNotes=(notes:PairNote[]):RowNote[]=>notes.map(note=>({v:1,p:note.p,acc:note.acc}));

type Props={
  round:Round;
  /** Top notes already matched. */
  matched:number[];
  /** A top note tapped and waiting for its partner. */
  selected:number|null;
  /** A bottom note to outline (Show answer). */
  hint:number|null;
  /** Top notes that count as matched but get no line (pairs too plain to need one, like C and C). */
  quiet?:number[];
  label:string;
  /** The top note picked (tapped or dragged), or null when none. */
  onSelect:(top:number|null)=>void;
  /** Returns whether the line is a match; a line that is not fades away. */
  onDrop:(top:number,bottom:number)=>boolean;
};
export default function MatchNotes({round,matched,selected,hint,quiet=[],label,onSelect,onDrop}:Props){
  const svg=useRef<SVGSVGElement|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const press=useRef<{side:'top'|'bottom';index:number;x:number;y:number}|null>(null);
  const [drag,setDrag]=useState<{top:number;x:number;y:number}|null>(null),[ghost,setGhost]=useState<{top:number;x:number;y:number}|null>(null);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[]);
  const top=rowNotes(round.left),bottom=rowNotes(round.right);
  // Both staffs have the same number of notes and room for a sign before each, so they share one layout.
  const layout=layoutRow(top,{clef:true,right:RIGHT,reserveAcc:true});
  const xs=layout.xs,split=noteY(0)+OFFSET/2+12;
  const at=(e:PointerEvent<SVGSVGElement>)=>{
    const matrix=svg.current?.getScreenCTM();
    return matrix?new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse()):null;
  };
  /** The note slot a point falls in: the whole column under a note counts, so a finger can't miss. */
  const slotAt=(p:{x:number;y:number})=>{
    let index=0;xs.forEach((x,i)=>{if(Math.abs(x-p.x)<Math.abs(xs[index]-p.x))index=i});
    const half=(xs[1]-xs[0])/2;
    if(Math.abs(xs[index]-p.x)>half)return null;
    return {side:(p.y<split?'top':'bottom') as 'top'|'bottom',index};
  };
  const from=(i:number)=>({x:xs[i],y:noteY(round.left[i].p)+CLEARANCE});
  const to=(i:number)=>({x:xs[i],y:noteY(round.right[i].p)+OFFSET-CLEARANCE});
  function down(e:PointerEvent<SVGSVGElement>){
    const p=at(e);if(!p)return;
    const slot=slotAt(p);if(!slot)return;
    e.currentTarget.setPointerCapture(e.pointerId);
    press.current={...slot,x:p.x,y:p.y};setGhost(null);
  }
  function move(e:PointerEvent<SVGSVGElement>){
    const p=at(e),start=press.current;if(!p||!start)return;
    if(drag){setDrag({top:drag.top,x:p.x,y:p.y});return}
    // Dragging starts from a top note that has no partner yet, after a few units of movement.
    if(start.side==='top'&&!matched.includes(start.index)&&Math.hypot(p.x-start.x,p.y-start.y)>8){onSelect(start.index);setDrag({top:start.index,x:p.x,y:p.y})}
  }
  function fail(topIndex:number,bottomIndex:number){
    setGhost({top:topIndex,...to(bottomIndex)});
    if(timer.current)clearTimeout(timer.current);
    timer.current=setTimeout(()=>setGhost(null),500);
  }
  function up(e:PointerEvent<SVGSVGElement>){
    const p=at(e),start=press.current;press.current=null;
    if(!start)return;
    if(drag){
      const {top:picked}=drag;setDrag(null);
      const slot=p&&slotAt(p);
      if(slot&&slot.side==='bottom'&&!onDrop(picked,slot.index))fail(picked,slot.index);
      onSelect(null);return;
    }
    // A tap: a top note is picked (tap it again to put it down); a bottom note then joins it.
    if(start.side==='top'){if(!matched.includes(start.index))onSelect(selected===start.index?null:start.index);return}
    if(selected!==null){
      // Right or wrong, the pick is put down: after a wrong line, tapping the same top note again picks it again (not un-picks it).
      if(!onDrop(selected,start.index))fail(selected,start.index);
      onSelect(null);
    }
  }
  const line=(a:{x:number;y:number},b:{x:number;y:number},cls:string,key:string)=><line key={key} className={cls} x1={a.x} y1={a.y} x2={b.x} y2={b.y}/>;
  return <svg ref={svg} className="engraved-row acc-closeup acc-match" viewBox={`20 50 ${RIGHT-10} ${OFFSET+252-50}`} role="group" aria-label={label}
    onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={()=>{press.current=null;setDrag(null);onSelect(null)}}>
    {/* The top note picked turns red, like a touched note anywhere else; no extra circle. */}
    <RowGraphics notes={top} layout={layout} active={drag?drag.top:selected??-1}/>
    <g transform={`translate(0 ${OFFSET})`}><RowGraphics notes={bottom} layout={layout}/></g>
    {hint!==null&&<rect className="acc-hint" x={xs[hint]-46} y={OFFSET+96} width="92" height="120" rx="12"/>}
    {matched.filter(l=>!quiet.includes(l)).map(l=>line(from(l),to(round.partner[l]),'acc-match-line is-right',`m${l}`))}
    {drag&&line(from(drag.top),{x:drag.x,y:drag.y},'acc-match-line','drag')}
    {ghost&&line(from(ghost.top),{x:ghost.x,y:ghost.y},'acc-match-line is-fading','ghost')}
  </svg>;
}
