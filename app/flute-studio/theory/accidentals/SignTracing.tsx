'use client';
import {useRef,useState,type PointerEvent,type ReactNode} from 'react';
import {ACCIDENTALS} from '../accidentalGlyphs';
import EngravedRow,{type Meter,type RowLayout} from '../EngravedRow';
import {noteY} from '../model';
import {judgeSign,guideParts,GLYPH_SCALE,TRACE_TOLERANCE,type Pt} from './signJudge';
import type {Acc,ReadNote} from './pitch';

/**
 * The close-up staff of lesson 4. It is a normal EngravedRow, cropped around its notes (the same
 * staff, clef, ledger lines and signs as every other row), with a transparent layer on top for the
 * pointer: drawing a sign in front of one note (judged as a whole shape by signJudge, in any number
 * of strokes in any order) and tapping a note (a short touch that does not move).
 * With `sign` null it is just the staff, to look at, listen to and tap.
 */
type Props={
  notes:ReadNote[];bars?:number[];meter?:Meter;
  /** The note a sign goes in front of, and which sign to draw; null for neither. */
  target:number|null;sign:Acc|null;
  /** Notes lit red (sounding, or the last one touched, as in lesson 1), notes drawn faintly, a note ringed (what a question is about). */
  active?:number|number[];faint?:number[];circle?:number;
  /** Notes that keep their place but aren't drawn (a question mark stands there), and notes that fade in. */
  hidden?:number[];appear?:number[];
  /** Anything else drawn on the staff with the layout in hand. */
  extra?:(layout:RowLayout)=>ReactNode;
  label:string;onComplete:()=>void;onTapNote?:(index:number)=>void;
  /** Where the row ends, for more room between the notes than the narrow close-up gives. */
  right?:number;
  /** Changes when a drawing starts over (Clear), so the same staff can stay on screen from one drawing to the next. */
  attempt?:number;
};
export default function SignTracing({notes,bars=[],meter,target,sign,active=-1,faint=[],hidden=[],appear=[],circle,extra,label,onComplete,onTapNote,right,attempt=0}:Props){
  const drawing=sign!==null&&target!==null;
  // Ink and the finished state belong to one drawing (this note, this sign, this attempt): a new one starts clean without remounting the staff.
  const drawKey=`${target}:${sign}:${attempt}`;
  const [ink,setInk]=useState<{key:string;strokes:Pt[][]}>({key:drawKey,strokes:[]}),[doneKey,setDoneKey]=useState<string|null>(null);
  const strokes=ink.key===drawKey?ink.strokes:[],done=doneKey===drawKey;
  const setStrokes=(next:(old:Pt[][])=>Pt[][])=>setInk(old=>({key:drawKey,strokes:next(old.key===drawKey?old.strokes:[])}));
  const current=useRef<Pt[]|null>(null);
  const point=(e:PointerEvent<SVGRectElement>)=>{
    const matrix=e.currentTarget.ownerSVGElement?.getScreenCTM();
    return matrix?new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse()):null;
  };
  // The note a sign will go in front of keeps room for it, so nothing moves when the sign arrives.
  const row=notes.map((x,i)=>drawing&&i===target&&!x.acc&&!x.room?{...x,room:sign}:x);
  return <EngravedRow crop narrow right={right} notes={row} bars={bars} meter={meter??null} active={active} faint={faint} hidden={hidden} appear={appear} className={`acc-closeup${drawing&&!done?' is-drawing':''}`} label={label}>
    {layout=>{
      const noteAt=(i:number)=>({x:layout.xs[i],y:noteY(notes[i].p??4)});
      const origin=drawing?{x:noteAt(target).x-35,y:noteAt(target).y}:{x:0,y:0};
      const parts=drawing?guideParts(sign,origin):[];
      function down(e:PointerEvent<SVGRectElement>){
        const at=point(e);if(!at)return;
        e.currentTarget.setPointerCapture(e.pointerId);current.current=[{x:at.x,y:at.y}];
        if(drawing&&!done)setStrokes(old=>[...old,[{x:at.x,y:at.y}]]);
      }
      function move(e:PointerEvent<SVGRectElement>){
        const stroke=current.current,at=point(e);if(!stroke||!at)return;
        stroke.push({x:at.x,y:at.y});
        if(drawing&&!done)setStrokes(old=>old.map((s,i)=>i===old.length-1?[...s,{x:at.x,y:at.y}]:s));
      }
      function up(){
        const stroke=current.current;current.current=null;if(!stroke)return;
        const xs=stroke.map(q=>q.x),ys=stroke.map(q=>q.y),moved=Math.hypot(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));
        // A touch that hardly moved is a tap on a note, not a stroke.
        if(moved<4){
          if(drawing&&!done)setStrokes(old=>old.slice(0,-1));
          const last=stroke[stroke.length-1];
          let best=-1,bestDistance=Infinity;
          notes.forEach((_,i)=>{if(hidden.includes(i))return;const n=noteAt(i),dx=Math.abs(n.x-last.x),dy=Math.abs(n.y-last.y);if(dx<=24&&dy<=26&&dx+dy<bestDistance){best=i;bestDistance=dx+dy}});
          if(best>=0)onTapNote?.(best);
          return;
        }
        if(!drawing||done)return;
        // Stray ink (mostly off the sign) is taken away at once; the rest stays, and the whole drawing is judged.
        const stray=judgeSign(parts,[stroke],TRACE_TOLERANCE).onSign<.4;
        const kept=stray?strokes.slice(0,-1):strokes;
        setStrokes(()=>kept);
        if(judgeSign(parts,kept,TRACE_TOLERANCE).pass){setStrokes(()=>[]);setDoneKey(drawKey);onComplete()}
      }
      return <>
        {drawing&&!done&&<path className="acc-preview" d={ACCIDENTALS[sign]} transform={`translate(${origin.x} ${origin.y}) scale(${GLYPH_SCALE} ${-GLYPH_SCALE})`}/>}
        {circle!==undefined&&<circle className="measure-circle" cx={noteAt(circle).x} cy={noteAt(circle).y} r="22"/>}
        {strokes.map((stroke,i)=><polyline key={i} points={stroke.map(q=>`${q.x},${q.y}`).join(' ')} className="acc-stroke"/>)}
        {drawing&&<rect className="acc-pointer" x="0" y="40" width="1200" height="260" fill="transparent" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={()=>{current.current=null;setStrokes(old=>drawing&&!done?old.slice(0,-1):old)}}/>}
        {!drawing&&notes.map((_,i)=>!hidden.includes(i)&&<rect key={`note-${i}`} className="acc-hit" x={noteAt(i).x-24} y={noteAt(i).y-26} width="48" height="52" role="button" tabIndex={0} aria-label={`Play note ${i+1}`} onClick={()=>onTapNote?.(i)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onTapNote?.(i)}}}/>)}
        {/* Over the pointer layer, so anything here (the question mark) can be touched itself. */}
        {extra?.(layout)}
      </>;
    }}
  </EngravedRow>;
}
