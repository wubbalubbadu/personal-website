'use client';
import {useRef,useState,type PointerEvent} from 'react';
import {ACCIDENTALS} from '../accidentalGlyphs';
import {noteY} from '../model';
import RhythmNote from '../rhythm/RhythmNote';
import {traceSegment,traceComplete,type TracePoint} from '../traceProgress';

/**
 * Draw a sharp or a flat in front of a note, like lesson 1's treble clef tracing. The sign is a few
 * strokes, each a polyline in the engraved glyph's own units (y up, origin on the note's line or
 * space). They were tuned by laying them over the glyph: a sharp is two upright lines and two bars,
 * a flat is its stem and the curve of its bowl. A stroke counts when the finger, pencil or mouse
 * covers it (`traceSegment` and `traceComplete`, as in ClefTracing); strokes can come in any order.
 */
type Glyph=[number,number][];
const STROKES:Record<'sharp'|'flat',Glyph[]>={
  sharp:[[[98,-530],[98,498]],[[225,-495],[225,530]],[[0,-205],[323,-135]],[[0,130],[323,205]]],
  flat:[[[0,-225],[0,625]],[[10,150],[110,195],[210,160],[248,85],[225,-5],[150,-95],[70,-175],[5,-222]]],
};
/** The close-up is the staff drawn three times larger, so the strokes are long enough for traceComplete. */
const S=3,GLYPH=.064,SAMPLES=101;

/** SAMPLES evenly spaced points along a polyline. */
function along(points:TracePoint[]){
  const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y)),total=lengths.reduce((a,b)=>a+b,0);
  return Array.from({length:SAMPLES},(_,k)=>{
    let want=total*k/(SAMPLES-1),i=0;
    while(i<lengths.length-1&&want>lengths[i]){want-=lengths[i];i++}
    const t=lengths[i]?Math.min(1,want/lengths[i]):0;
    return {x:points[i].x+(points[i+1].x-points[i].x)*t,y:points[i].y+(points[i+1].y-points[i].y)*t};
  });
}

type Props={sign:'sharp'|'flat';/** The note's staff position. */p:number;label:string;onComplete:()=>void};
export default function SignTracing({sign,p,label,onComplete}:Props){
  const noteX=250,noteYpx=noteY(p),origin={x:noteX-35,y:noteYpx};
  const toSvg=(gx:number,gy:number):TracePoint=>({x:S*(origin.x+gx*GLYPH),y:S*(origin.y-gy*GLYPH)});
  const guides=STROKES[sign].map(stroke=>stroke.map(([gx,gy])=>toSvg(gx,gy)));
  const [strokes,setStrokes]=useState<TracePoint[][]>([]),[done,setDone]=useState<boolean[]>(guides.map(()=>false)),complete=done.every(Boolean);
  const svg=useRef<SVGSVGElement|null>(null),current=useRef<TracePoint[]|null>(null);
  const point=(e:PointerEvent<SVGSVGElement>)=>{
    const matrix=svg.current?.getScreenCTM();
    return matrix?new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse()):null;
  };
  function down(e:PointerEvent<SVGSVGElement>){
    if(complete)return;
    const at=point(e);if(!at)return;
    e.currentTarget.setPointerCapture(e.pointerId);current.current=[{x:at.x,y:at.y}];setStrokes(old=>[...old,[{x:at.x,y:at.y}]]);
  }
  function move(e:PointerEvent<SVGSVGElement>){
    const stroke=current.current,at=point(e);if(!stroke||!at)return;
    stroke.push({x:at.x,y:at.y});setStrokes(old=>old.map((s,i)=>i===old.length-1?[...s,{x:at.x,y:at.y}]:s));
  }
  function up(){
    const stroke=current.current;current.current=null;if(!stroke)return;
    // The guide this stroke covers best, if it covers one well enough.
    let best=-1,bestCovered=0;
    guides.forEach((guide,k)=>{
      if(done[k])return;
      const samples=along(guide),covered=new Set<number>();let length=0,matched=0;
      stroke.slice(1).forEach((b,i)=>{const seg=traceSegment(samples,stroke[i],b);seg.covered.forEach(c=>covered.add(c));length+=seg.length;matched+=seg.matchedLength});
      // A short bar can never be drawn 60 units long, so the length gate counts at least 60.
      if(traceComplete(covered.size,SAMPLES,matched,Math.max(length,60))&&covered.size>bestCovered){best=k;bestCovered=covered.size}
    });
    // The drawn mark stays only when it counted; a miss fades away.
    setStrokes(old=>old.slice(0,-1));
    if(best<0)return;
    const next=done.map((d,k)=>d||k===best);setDone(next);
    if(next.every(Boolean)){setStrokes([]);onComplete()}
  }
  return <svg ref={svg} className="engraved-row acc-closeup" viewBox="330 270 720 420" role="img" aria-label={label}
    onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={()=>{current.current=null;setStrokes(old=>old.slice(0,-1))}}>
    <g transform={`scale(${S})`}>
      {[0,2,4,6,8].map(l=><line key={l} x1="100" x2="380" y1={noteY(l)} y2={noteY(l)} className="engraved-row__line"/>)}
      <g transform={`translate(${noteX} ${noteYpx})`}><RhythmNote value={1} down={p>=4}/></g>
      {complete
        ?<path className="engraved-row__acc" d={ACCIDENTALS[sign]} transform={`translate(${origin.x} ${origin.y}) scale(${GLYPH} ${-GLYPH})`}/>
        :<path className="acc-preview" d={ACCIDENTALS[sign]} transform={`translate(${origin.x} ${origin.y}) scale(${GLYPH} ${-GLYPH})`}/>}
    </g>
    {!complete&&guides.map((guide,k)=>done[k]&&<polyline key={`done${k}`} points={guide.map(q=>`${q.x},${q.y}`).join(' ')} className="acc-stroke-done"/>)}
    {strokes.map((stroke,i)=><polyline key={i} points={stroke.map(q=>`${q.x},${q.y}`).join(' ')} className="acc-stroke"/>)}
  </svg>;
}
