'use client';
import {useRef,useState,type PointerEvent,type KeyboardEvent} from 'react';
import TrebleClef from './TrebleClef';
import QuarterNote from './QuarterNote';
import {noteY,positionAt,ledgerLines,SOLFEGE} from './model';
import {notationPitch} from './sequence';
import {nameChoices,type Question} from './questions';

// One question: either place a named note on the staff (tap or drag anywhere, release to check)
// or name the note shown. Keyed by the parent per round, so state starts fresh each time.
export default function NotePractice({question,locked,zh,onAnswer,onHear}:{question:Question;locked:boolean;zh:boolean;onAnswer:(correct:boolean,picked:number|string)=>void;onHear:(position:number)=>void}){
  const [placed,setPlaced]=useState<number|null>(null),[hover,setHover]=useState<number|null>(null),[picked,setPicked]=useState<string|null>(null);
  const svg=useRef<SVGSVGElement>(null),dragging=useRef(false);
  const place=question.kind==='place',shown=place?placed:question.position;
  function at(e:PointerEvent<SVGSVGElement>){const point=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.current!.getScreenCTM()!.inverse());return positionAt(point.y)}
  // Any note with the right letter counts: E and F each appear twice on the staff.
  function grade(p:number){onHear(p);onAnswer(notationPitch(p).name===notationPitch(question.position).name,p)}
  function down(e:PointerEvent<SVGSVGElement>){if(!place||locked)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);dragging.current=true;setPlaced(at(e))}
  // With a mouse, a faint note shows where a click would land, so a slip is visible before it counts.
  function move(e:PointerEvent<SVGSVGElement>){if(dragging.current)setPlaced(at(e));else if(place&&!locked&&e.pointerType==='mouse')setHover(at(e))}
  function up(){if(!dragging.current)return;dragging.current=false;if(placed!==null)grade(placed)}
  function keys(e:KeyboardEvent<SVGSVGElement>){
    if(!place||locked)return;
    if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();setPlaced(p=>positionAt(noteY((p??4)+(e.key==='ArrowUp'?1:-1))))}
    else if((e.key==='Enter'||e.key===' ')&&placed!==null){e.preventDefault();grade(placed)}
  }
  function choose(letter:string){if(locked)return;setPicked(letter);onHear(question.position);onAnswer(letter===notationPitch(question.position).name,letter)}
  return <div className="note-practice">
    <svg ref={svg} className={`theory-staff ${place?'is-placing':''}`} viewBox="0 40 760 245" preserveAspectRatio="xMidYMid meet" role="group" tabIndex={place?0:-1}
      aria-label={place?(zh?'点或拖动来放音符，方向键移动，回车确认。':'Tap or drag to place the note. Arrow keys move it; Enter checks.'):(zh?'要认的音符':'The note to name')}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={()=>{dragging.current=false}} onPointerLeave={()=>setHover(null)} onKeyDown={keys}>
      {[0,2,4,6,8].map(p=><line key={p} x1="55" x2="705" y1={noteY(p)} y2={noteY(p)} className="theory-staff-line"/>)}
      <TrebleClef/>
      {place&&placed===null&&<line x1="400" x2="400" y1="92" y2="212" className="note-practice-guide"/>}
      {place&&!locked&&hover!==null&&hover!==placed&&<g className="note-practice-ghost" style={{transform:`translate(400px,${noteY(hover)}px)`}} aria-hidden="true">
        {ledgerLines(hover).map(line=><line key={line} x1="-24" x2="24" y1={noteY(line)-noteY(hover)} y2={noteY(line)-noteY(hover)} className="theory-ledger"/>)}
        <QuarterNote down={hover>=4}/>
      </g>}
      {shown!==null&&<g className={`note-practice-note ${locked?'is-correct':''}`} style={{transform:`translate(400px,${noteY(shown)}px)`}}>
        {ledgerLines(shown).map(line=><line key={line} x1="-24" x2="24" y1={noteY(line)-noteY(shown)} y2={noteY(line)-noteY(shown)} className="theory-ledger"/>)}
        <QuarterNote down={shown>=4}/>
      </g>}
    </svg>
    {!place&&<div className="lesson-choices" role="group" aria-label={zh?'选择音名':'Choose the note name'}>
      {nameChoices(question.position).map(letter=><button key={letter} className={picked===letter?(locked?'is-correct':'is-wrong'):''} disabled={locked&&picked!==letter} onClick={()=>choose(letter)}>{letter}<span>{SOLFEGE[letter]}</span></button>)}
    </div>}
  </div>;
}
