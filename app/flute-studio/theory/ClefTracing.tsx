'use client';
import {traceSegment,traceComplete} from './traceProgress';
import {useRef,useState,type PointerEvent} from 'react';
export const CLEF_GUIDE='M 382 176 C 374 187 355 177 360 162 C 368 141 403 153 406 177 C 410 207 361 216 347 191 C 324 151 409 120 399 80 C 396 68 391 60 386 56 C 372 75 381 121 383 156 L 383 225 C 384 247 368 252 360 239';
export default function ClefTracing({zh,onComplete,onReset,onIncomplete}:{zh:boolean;onComplete?:()=>void;onReset?:()=>void;onIncomplete?:()=>void}){
  const guide=useRef<SVGPathElement|null>(null),last=useRef<{x:number;y:number}|null>(null);
  const covered=useRef(new Set<number>()),length=useRef(0),matched=useRef(0);
  const [strokes,setStrokes]=useState<{x:number;y:number}[][]>([]),[complete,setComplete]=useState(false);
  function clear(){last.current=null;covered.current.clear();length.current=0;matched.current=0;setStrokes([]);setComplete(false);onReset?.()}
  function trace(event:PointerEvent<SVGSVGElement>,start=false){
    const path=guide.current,matrix=event.currentTarget.getScreenCTM();if(!path||!matrix)return;
    const point=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
    if(start){
      if(complete)clear();
      event.currentTarget.setPointerCapture(event.pointerId);last.current=point;
      setStrokes(old=>[...old,[{x:point.x,y:point.y}]]);return;
    }
    if(!last.current)return;
    const size=path.getTotalLength(),samples=Array.from({length:101},(_,i)=>path.getPointAtLength(size*i/100));
    const segment=traceSegment(samples,last.current,point);
    segment.covered.forEach(i=>covered.current.add(i));length.current+=segment.length;matched.current+=segment.matchedLength;
    last.current=point;setStrokes(old=>old.map((stroke,i)=>i===old.length-1?[...stroke,{x:point.x,y:point.y}]:stroke));
  }
  function finish(){
    if(!last.current)return;last.current=null;
    if(traceComplete(covered.current.size,101,matched.current,length.current)){setComplete(true);setStrokes([]);onComplete?.()}
    else onIncomplete?.();
  }
  return <div className="theory-tracing">
    <svg viewBox="0 40 760 245" preserveAspectRatio="xMidYMax meet" role="img" aria-label={zh?'沿虚线画高音谱号。':'Draw a treble clef along the dotted guide.'} onPointerDown={e=>trace(e,true)} onPointerMove={e=>trace(e)} onPointerUp={finish} onPointerCancel={()=>{last.current=null}}>
      {[0,1,2,3,4].map(i=><line key={i} x1="55" x2="705" y1={104+i*24} y2={104+i*24} stroke={i===3?'#bb352e':'#333'} strokeWidth={i===3?2:1}/>)}
      <path ref={guide} d={CLEF_GUIDE} fill="none" stroke={complete?'#171717':'#aaa'} strokeWidth={complete?4:3} strokeDasharray={complete?undefined:'1 9'} strokeLinecap="round"/>
      {strokes.map((stroke,i)=><polyline key={i} points={stroke.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="#171717" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>)}
      <line x1="412" x2="525" y1="176" y2="150" stroke="#bb352e"/>
      <text x="535" y="150" className="theory-pitch-label">{complete?'G · sol':zh?'第二线':'the second line'}</text>
      {complete&&<text x="535" y="172" className="theory-caption">{zh?'G 谱号':'the G clef'}</text>}
    </svg>
    <div className="theory-explore-controls"><button className="theory-text-button" onClick={clear}>{zh?'清除':'Clear'}</button></div>
  </div>;
}
