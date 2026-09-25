'use client';
import {useRef,useState,type PointerEvent,type KeyboardEvent} from 'react';
import TrebleClef from './TrebleClef';
import QuarterNote from './QuarterNote';
import {noteY,positionAt,ledgerLines} from './model';
export default function NotePractice({round,zh,onAnswer,onHear}:{round:number;zh:boolean;onAnswer:(correct:boolean,detail?:string)=>void;onHear:(position:number)=>void}){
  const [placed,setPlaced]=useState<number|null>(null),svg=useRef<SVGSVGElement>(null),drag=useRef<{active:boolean;position:number|null}>({active:false,position:null});
  const placement=round<2,target=round===0?2:5,notes=placement?(placed===null?[]:[placed]):round===2?[3]:round===4?[1,5]:[];
  function grade(p:number){onHear(p);onAnswer(p===target,round===1&&p===-2?(zh?'这也是 C，但在五线谱下方。这一题要找五线谱里面的 C。':'That is also C, below the staff. This question asks for C inside the staff.'):undefined)}
  function begin(e:PointerEvent<Element>,p:number|null){if(!placement)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);drag.current={active:true,position:p}}
  function move(e:PointerEvent<Element>){if(!drag.current.active||!svg.current)return;const point=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.current.getScreenCTM()!.inverse());const p=point.y>=75&&point.y<=236?positionAt(point.y):null;drag.current.position=p;setPlaced(p)}
  function release(){if(!drag.current.active)return;drag.current.active=false;if(drag.current.position!==null)grade(drag.current.position)}
  function cancel(){drag.current.active=false;setPlaced(null)}
  function keyboard(e:KeyboardEvent<Element>,p:number|null,index=0){if(placement&&(e.key==='ArrowUp'||e.key==='ArrowDown')){e.preventDefault();setPlaced(positionAt(noteY((p??0)+(e.key==='ArrowUp'?1:-1))))}else if(e.key==='Enter'||e.key===' '){e.preventDefault();if(placement){if(p===null)setPlaced(0);else grade(p)}else if(round===4){onHear(p!);onAnswer(index===1)}}}
  const choices=round===2?['G · sol','A · la','B · si']:['D · re','G · sol','F · fa'];
  return <div className="first-note-practice">
    <svg ref={svg} className="theory-staff" viewBox="0 40 760 245" preserveAspectRatio="xMidYMax meet" role="group" aria-label={zh?'识谱练习':'Reading practice'}>
      {[0,2,4,6,8].map(p=><line key={p} x1="55" x2="705" y1={noteY(p)} y2={noteY(p)} stroke={round===3&&p===2?'#b9362e':'#444'} strokeWidth={round===3&&p===2?2:1}/>)}<TrebleClef/>
      {notes.map((p,i)=><g key={i} transform={`translate(${round===4?300+i*230:400} ${noteY(p)})`} role="button" tabIndex={0} aria-label={placement?(zh?'拖动音符，方向键移动，回车确认。':'Drag the note, or use arrow keys and Enter to check.'):(zh?'音符':'Note')+` ${i+1}`} className={placement?'first-tray-note':'first-answer-note'} onPointerDown={e=>begin(e,p)} onPointerMove={move} onPointerUp={release} onPointerCancel={cancel} onClick={()=>{if(round===4){onHear(p);onAnswer(i===1)}}} onKeyDown={e=>keyboard(e,p,i)}>
        {ledgerLines(p).map(line=><line key={line} x1="-23" x2="23" y1={noteY(line)-noteY(p)} y2={noteY(line)-noteY(p)} stroke="#222"/>)}<QuarterNote down={p>=4}/><rect x="-30" y={p>=4?-22:-88} width="65" height="115" fill="transparent"/>
      </g>)}
      {round===3&&<circle cx="122" cy="176" r="26" fill="none" stroke="#b9362e" strokeWidth="2"/>}
    </svg>
    {placement&&<button className="first-note-tray" aria-label={zh?'把这个音符拖到谱上。也可以用方向键移动，回车确认。':'Drag this note onto the staff. Arrow keys move; Enter checks.'} onPointerDown={e=>begin(e,null)} onPointerMove={move} onPointerUp={release} onPointerCancel={cancel} onKeyDown={e=>keyboard(e,placed)}><svg viewBox="-30 -94 70 118" aria-hidden="true"><g opacity={placed===null?1:.15}><QuarterNote/></g></svg></button>}
    {(round===2||round===3)&&<div className="first-answer-options">{choices.map((choice,i)=><button key={choice} onClick={()=>{onAnswer(i===1);if(i===1)onHear(round===2?3:2)}}>{choice}</button>)}</div>}
  </div>;
}
