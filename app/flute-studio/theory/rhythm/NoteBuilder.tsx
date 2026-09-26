'use client';
import {useRef,useState,type PointerEvent} from 'react';
import RhythmNote,{STEM_X,STEM_HEIGHT} from './RhythmNote';
import {VALUES} from './rhythmModel';
import {traceSegment,type TracePoint} from '../traceProgress';

// One change at a time, shown side by side: the note you have on the left, and on the right a copy
// you change with one mark (stem, filled head, flag, second flag). Each mark halves the length.
// `stage` is the left note's index in VALUES; `drawn` means the right copy is finished.
// Guides are in the note's own coordinates (head centred on 0,0, stem up).
const TOP=-STEM_HEIGHT;
const GUIDES:Record<number,string>={
  0:`M${STEM_X} -4 V${TOP}`,
  2:`M${STEM_X} ${TOP} C${STEM_X+2} ${TOP+16} ${STEM_X+22} ${TOP+24} ${STEM_X+18} ${TOP+54}`,
  3:`M${STEM_X} ${TOP+24} C${STEM_X+2} ${TOP+40} ${STEM_X+26} ${TOP+48} ${STEM_X+22} ${TOP+78}`,
};
const SCALE=2,LEFT=220,RIGHT=540,BASE=214;

export default function NoteBuilder({stage,drawn,labels,zh,onDrawn}:{stage:number;drawn:boolean;labels:string[];zh:boolean;onDrawn:()=>void}){
  const group=useRef<SVGGElement>(null),guide=useRef<SVGPathElement>(null),last=useRef<TracePoint|null>(null);
  const covered=useRef(new Set<number>()),length=useRef(0),matched=useRef(0);
  const [stroke,setStroke]=useState<TracePoint[]>([]);
  const tracing=!drawn&&GUIDES[stage]!==undefined,filling=!drawn&&stage===1;
  function local(e:PointerEvent<SVGElement>){return new DOMPoint(e.clientX,e.clientY).matrixTransform(group.current!.getScreenCTM()!.inverse())}
  function reset(){last.current=null;covered.current.clear();length.current=0;matched.current=0;setStroke([])}
  function down(e:PointerEvent<SVGSVGElement>){
    if(!tracing)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);
    reset();const p=local(e);last.current=p;setStroke([{x:p.x,y:p.y}]);
  }
  function move(e:PointerEvent<SVGSVGElement>){
    const path=guide.current;if(!last.current||!path)return;
    const p=local(e),size=path.getTotalLength(),samples=Array.from({length:41},(_,i)=>path.getPointAtLength(size*i/40));
    // traceSegment's tolerance is 15 units; scaling by 2 makes it about 7 note units, 15 screen pixels here.
    const k=2,seg=traceSegment(samples.map(s=>({x:s.x*k,y:s.y*k})),{x:last.current.x*k,y:last.current.y*k},{x:p.x*k,y:p.y*k});
    seg.covered.forEach(i=>covered.current.add(i));length.current+=seg.length;matched.current+=seg.matchedLength;
    last.current=p;setStroke(old=>[...old,{x:p.x,y:p.y}]);
  }
  function up(){
    if(!last.current)return;last.current=null;
    const done=covered.current.size/41>=.7&&length.current>0&&matched.current/length.current>=.6;
    reset();if(done)onDrawn();
  }
  const before=VALUES[stage],after=VALUES[Math.min(stage+1,4)];
  return <svg className="rhythm-score note-builder" viewBox="0 0 760 285" preserveAspectRatio="xMidYMid meet" role="group"
    aria-label={zh?'把左边的音符改成更短的音符':'Change the note on the left into a shorter one'} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={reset}>
    <g transform={`translate(${LEFT} ${BASE}) scale(${SCALE})`}><g key={`left-${stage}`} className="note-builder-note"><RhythmNote value={before}/></g></g>
    <text x={LEFT+8} y="262" textAnchor="middle" className="note-builder-label">{labels[stage]}</text>
    <g className="note-builder-arrow" aria-hidden="true"><path d={`M${LEFT+70} ${BASE} H${RIGHT-60}`}/><path d={`M${RIGHT-72} ${BASE-8} L${RIGHT-60} ${BASE} L${RIGHT-72} ${BASE+8}`}/></g>
    <g ref={group} transform={`translate(${RIGHT} ${BASE}) scale(${SCALE})`}>
      <g key={`right-${stage}-${drawn}`} className="note-builder-note"><RhythmNote value={drawn?after:before}/></g>
      {tracing&&<path ref={guide} d={GUIDES[stage]} className="note-builder-guide"/>}
      {filling&&<g role="button" tabIndex={0} aria-label={zh?'把符头涂满':'Fill in the notehead'} className="note-builder-fill"
        onPointerDown={e=>{e.stopPropagation();e.preventDefault();onDrawn()}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onDrawn()}}}>
        <ellipse rx="20" ry="15" className="note-builder-target"/>
      </g>}
      {tracing&&<g role="button" tabIndex={0} aria-label={zh?'画出这一笔（或按回车）':'Draw this mark (or press Enter)'} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onDrawn()}}}><rect x="-10" y={TOP-10} width="60" height={STEM_HEIGHT+20} fill="transparent"/></g>}
      {stroke.length>1&&<polyline points={stroke.map(p=>`${p.x},${p.y}`).join(' ')} className="note-builder-stroke"/>}
    </g>
    <text x={RIGHT+8} y="262" textAnchor="middle" className={`note-builder-label ${drawn?'is-new':''}`}>{drawn?labels[stage+1]:'?'}</text>
  </svg>;
}
