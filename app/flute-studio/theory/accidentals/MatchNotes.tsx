'use client';
import {useEffect,useRef,useState,type PointerEvent} from 'react';
import {ACCIDENTALS} from '../accidentalGlyphs';
import {noteY} from '../model';
import RhythmNote from '../rhythm/RhythmNote';
import TrebleClef from '../TrebleClef';
import type {PairNote,Round} from './pairs';

/**
 * Two columns of small staffs, one note each. Drag from a note on the left to the note on the right
 * that is the same key. Everything is drawn in one SVG so the lines, the staffs and the pointer share
 * one coordinate system (pointer events with capture, as in BarLineDrawing). A line that is not a
 * match never stays: it fades away.
 */
const W=360,ROW=60,K=.5,CELL=96,LEFT=2,RIGHT=W-CELL-2;
// In a small staff's own units: the clef, the note and the sign in front of it.
const CLEF_X=42,NOTE_X=146;

const rowY=(row:number)=>row*ROW+30;
const anchor=(side:'left'|'right',row:number)=>({x:side==='left'?LEFT+CELL:RIGHT,y:rowY(row)});

function MiniStaff({note,x,row,hint}:{note:PairNote;x:number;row:number;hint?:boolean}){
  const p=note.p;
  return <g transform={`translate(${x} ${rowY(row)-152*K}) scale(${K})`}>
    {/* The staff is drawn at half size, so its lines are thickened to stay visible. */}
    {[0,2,4,6,8].map(l=><line key={l} x1="0" x2={CELL/K} y1={noteY(l)} y2={noteY(l)} className="engraved-row__line" style={{strokeWidth:2.6}}/>)}
    {/* The clef is shrunk about the middle of the staff so it does not run into the rows above and below. */}
    <g transform={`translate(${CLEF_X} 152) scale(.62) translate(${-CLEF_X} -152)`}><TrebleClef x={CLEF_X}/></g>
    <g transform={`translate(${NOTE_X} ${noteY(p)})`}>
      <RhythmNote value={1} down={p>=4}/>
      {note.acc&&<path className="engraved-row__acc" d={ACCIDENTALS[note.acc]} transform="translate(-35 0) scale(.064 -.064)"/>}
    </g>
    {hint&&<rect x="-6" y="92" width={CELL/K+12} height="116" rx="10" className="acc-hint"/>}
  </g>;
}

type Props={round:Round;/** Left notes already matched. */matched:number[];/** A right note to outline (Show answer). */hint:number|null;label:string;
  onDrag:(left:number|null)=>void;
  /** Returns whether the line is a match; a line that is not fades away. */
  onDrop:(left:number,right:number)=>boolean};
export default function MatchNotes({round,matched,hint,label,onDrag,onDrop}:Props){
  const svg=useRef<SVGSVGElement|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [drag,setDrag]=useState<{left:number;x:number;y:number}|null>(null),[ghost,setGhost]=useState<{left:number;x:number;y:number}|null>(null);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[]);
  const at=(e:PointerEvent<SVGSVGElement>)=>{
    const matrix=svg.current?.getScreenCTM();
    return matrix?new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse()):null;
  };
  const rowAt=(y:number)=>Math.floor(y/ROW);
  function down(e:PointerEvent<SVGSVGElement>){
    const p=at(e);if(!p||p.x>LEFT+CELL+10)return;
    const left=rowAt(p.y);
    if(left<0||left>=round.left.length||matched.includes(left))return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setGhost(null);setDrag({left,x:p.x,y:p.y});onDrag(left);
  }
  function move(e:PointerEvent<SVGSVGElement>){
    const p=at(e);if(!p||!drag)return;
    setDrag({left:drag.left,x:p.x,y:p.y});
  }
  function up(e:PointerEvent<SVGSVGElement>){
    const p=at(e);if(!drag){return}
    const {left}=drag;setDrag(null);onDrag(null);
    if(!p||p.x<RIGHT-14)return;
    const right=rowAt(p.y);
    if(right<0||right>=round.right.length)return;
    if(!onDrop(left,right)){
      setGhost({left,x:p.x,y:anchor('right',right).y});
      if(timer.current)clearTimeout(timer.current);
      timer.current=setTimeout(()=>setGhost(null),500);
    }
  }
  const line=(a:{x:number;y:number},b:{x:number;y:number},cls:string,key:string)=><line key={key} className={cls} x1={a.x} y1={a.y} x2={b.x} y2={b.y}/>;
  return <svg ref={svg} className="engraved-row acc-closeup acc-match" viewBox={`0 0 ${W} ${ROW*round.left.length}`} role="group" aria-label={label}
    onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={()=>{setDrag(null);onDrag(null)}}>
    {round.left.map((note,i)=><MiniStaff key={`l${i}`} note={note} x={LEFT} row={i}/>)}
    {round.right.map((note,i)=><MiniStaff key={`r${i}`} note={note} x={RIGHT} row={i} hint={hint===i}/>)}
    {matched.map(l=>line(anchor('left',l),anchor('right',round.partner[l]),'acc-match-line is-right',`m${l}`))}
    {drag&&line(anchor('left',drag.left),{x:drag.x,y:drag.y},'acc-match-line',`drag`)}
    {ghost&&line(anchor('left',ghost.left),{x:ghost.x,y:ghost.y},'acc-match-line is-fading',`ghost`)}
  </svg>;
}
