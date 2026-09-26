'use client';
import {useEffect,useState,useRef,type PointerEvent} from 'react';
import TrebleClef from './TrebleClef';
import QuarterNote from './QuarterNote';
import {noteY,ledgerLines,SOLFEGE} from './model';
import {sceneNotes,notationPitch} from './sequence';

type Props={draggable?:boolean;focusPitch?:number|null;memory?:number;keyboard?:boolean;step:number;edits:Record<string,number>;active:number;keyboardPitch:number|null;zh:boolean;onMove:(id:string,position:number)=>void;onHear:(position:number,index:number)=>void;onKey:(midi:number)=>void};
export default function LessonDiagram({draggable=true,focusPitch=null,memory=-1,keyboard=false,step,edits,active,keyboardPitch,zh,onMove,onHear,onKey}:Props){
  const [arrival,setArrival]=useState<number|null>(null);
  const [exploring,setExploring]=useState(false);
  useEffect(()=>{
    if(focusPitch!==null||exploring||!keyboard)return;
    const timers=Array.from({length:8},(_,i)=>window.setTimeout(()=>setArrival(i),i*550));
    timers.push(window.setTimeout(()=>setArrival(null),8*550));
    return()=>timers.forEach(clearTimeout);
  },[focusPitch,exploring,keyboard]);
  const litPitch=keyboardPitch!==null?null:focusPitch??arrival;
  const drag=useRef<{id:string;startY:number;startPosition:number;index:number;last:number;pointer:number}|null>(null);
  const svg=useRef<SVGSVGElement|null>(null);
  const notes=memory>=0?([ [1,3,5,7],[0,2,4,6,8],[2,3,4] ][memory]).map((position,i)=>({id:`treble-${position}`,position,x:200+i*100,delay:i*220,ghost:false})):sceneNotes(step),showNames=step>=5,showKeyboard=keyboard,showClef=step>=4;
  function pointY(event:PointerEvent){const matrix=svg.current?.getScreenCTM();return matrix?new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse()).y:0}
  function begin(event:PointerEvent<SVGGElement>,id:string,position:number,index:number){
    setExploring(true);setArrival(null);event.preventDefault();
    if(!draggable){onHear(position,index);return}
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current={id,startY:pointY(event),startPosition:position,index,last:position,pointer:event.pointerId};onHear(position,index);
  }
  function move(event:PointerEvent<SVGGElement>){
    const d=drag.current;if(!d||event.pointerId!==d.pointer)return;
    const position=Math.max(step===6?0:-2,Math.min(step===6?7:10,d.startPosition+Math.round((d.startY-pointY(event))/12)));
    if(position!==d.last){d.last=position;onMove(d.id,position);onHear(position,d.index)}
  }
  return <div className={`sequence-figure ${draggable?'':'is-static'}`}>
    <svg ref={svg} className="sequence-staff" viewBox="0 40 760 245" preserveAspectRatio="xMidYMax meet" role="group" aria-label={zh?'高音谱表；点音符播放，拖动改变音高。':'Treble staff. Tap a note to hear it; drag to change its pitch.'}>
      {[0,2,4,6,8].map((p,i)=><g key={p}>
        <line x1="55" x2="705" y1={noteY(p)} y2={noteY(p)} className={`sequence-line ${step===9&&p===2?'is-anchor':''}`}/>
        <text aria-hidden="true" x="724" y={noteY(p)+5} className={`sequence-number ${step===1?'is-visible':''}`}>{i+1}</text>
      </g>)}
      {[1,3,5,7].map((p,i)=><g key={p} aria-hidden="true" className={`sequence-spaces ${step===2?'is-visible':''}`} style={{transitionDelay:`${i*100}ms`}}><rect x="70" y={noteY(p)-11} width="840" height="22" fill="#edf0f2"/><text x="724" y={noteY(p)+5}>{i+1}</text></g>)}
      <g className={`sequence-clef ${showClef?'is-visible':''}`} style={{transform:step===7?'translate(320px, 0px)':'translate(0px, 0px)'}}><TrebleClef/></g>
      <g aria-hidden="true" className={`sequence-g-anchor ${step===9?'is-visible':''}`}><circle cx="124" cy="176" r="23"/><line x1="148" x2="210" y1="176" y2="176"/><text x="226" y="182">G · sol</text></g>
      {Array.from({length:13},(_,i)=>i-2).map(p=>{
        const note=notes.find(n=>n.position===p),position=note?(edits[note.id]??p):p;
        const visible=!!note,ghost=note?.ghost,index=notes.findIndex(n=>n.position===p),pitch=notationPitch(position),x=note?.x??220+(p-2)*76;
        return <g key={p} className={`sequence-note ${visible?'is-visible':''} ${ghost?'is-ghost':''} ${(active===index||keyboardPitch===pitch.midi||litPitch===position)&&visible?'is-playing':''}`} style={{transform:`translate(${x}px, ${noteY(position)}px)`,animationDelay:`${focusPitch!==null?0:note?.delay??0}ms`,transitionDelay:`${focusPitch!==null||note&&edits[note.id]!==undefined?0:note?.delay??0}ms`}}
          role={visible&&!ghost?'button':undefined} tabIndex={visible&&!ghost?0:-1} aria-hidden={!visible||undefined} aria-label={visible?`${pitch.name}${pitch.octave} · ${SOLFEGE[pitch.name]}`:undefined}
          onPointerDown={e=>{if(note&&!ghost)begin(e,note.id,position,index)}} onPointerMove={move} onPointerUp={()=>{drag.current=null}} onPointerCancel={()=>{drag.current=null}}
          onKeyDown={e=>{if(!note||ghost)return;setExploring(true);setArrival(null);if(draggable&&(e.key==='ArrowUp'||e.key==='ArrowDown')){e.preventDefault();const next=Math.max(step===6?0:-2,Math.min(step===6?7:10,position+(e.key==='ArrowUp'?1:-1)));onMove(note.id,next);onHear(next,index)}else if(e.key==='Enter'||e.key===' '){e.preventDefault();onHear(position,index)}}}>
          <circle className="sequence-hit" r="28"/>
          {ledgerLines(position).map(line=><line key={line} className={`sequence-ledger ${step===15&&p===10?'is-hidden':''}`} x1="-24" x2="24" y1={noteY(line)-noteY(position)} y2={noteY(line)-noteY(position)} style={{strokeDashoffset:step===15&&p===10?48:0}}/>)}
          <g className={step===16&&p===10?'sequence-hidden-head':''}><QuarterNote down={position>=4}/></g>
          <text className={`sequence-note-name ${showNames?'is-visible':''}`} y={256-noteY(position)}>{pitch.name}{(step===6||step>=10)&&<tspan x="0" dy="19">{SOLFEGE[pitch.name]}</tspan>}</text>
        </g>;
      })}
      {step===15&&<text x="828" y="45" className="sequence-question">?</text>}
    </svg>
    <div className={`sequence-keyboard ${showKeyboard?'is-visible':''}`} aria-hidden={!showKeyboard}>
      <svg viewBox="0 0 350 105" role="group" aria-label={zh?'钢琴键盘':'Piano keyboard'}>
        {Array.from({length:8},(_,i)=>{const p=i,pitch=notationPitch(p),playing=keyboardPitch===pitch.midi||litPitch===p;return <g key={p} role="button" tabIndex={showKeyboard?0:-1} aria-label={`${pitch.name}${pitch.octave}`} onClick={()=>{setExploring(true);setArrival(null);onKey(pitch.midi)}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setExploring(true);setArrival(null);onKey(pitch.midi)}}}>
          <rect x={i*42+7} y="2" width="41" height="98" rx="3" className={playing?'is-key-active':'white-key'}/><text x={i*42+27} y="84">{step>=5?pitch.name:''}</text>
        </g>})}
        {[1,2,3,5,6].map(i=><rect key={i} aria-hidden="true" x={i*42+36} y="2" width="23" height="57" rx="2" className="black-key"/>)}
      </svg>
    </div>
  </div>;
}
