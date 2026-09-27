'use client';
import {useRef,useState,type PointerEvent} from 'react';
import EngravedRow,{layoutRow,type RowNote,type Meter} from '../EngravedRow';
import {noteY} from '../model';
import {measureTotals,beamGroups} from './rhythms';

/**
 * Draw the bar lines (pages 6 and 8). Draw a stroke down across the staff with a finger, pencil or
 * mouse: on release it snaps to the nearest gap between two notes and becomes a real bar line, and
 * the notes re-space around it. Tapping a bar line erases it. Notes start evenly spaced, so spacing
 * never gives the answer away. Each measure shows its beat total: green when it's full.
 *
 * Controlled: the page owns `bars` (note indices a bar line comes before) and decides what's right.
 */
export default function BarLineDrawing({notes,meter,bars,onToggle,locked=false,zh}:{notes:RowNote[];meter:Meter;bars:number[];onToggle:(index:number)=>void;locked?:boolean;zh:boolean}){
  const [stroke,setStroke]=useState<{x:number;y:number}[]>([]);
  const start=useRef<{x:number;y:number}|null>(null);
  const {totals}=measureTotals(notes,bars);
  // The same layout EngravedRow draws with, so strokes and taps map onto the notes exactly.
  const layout=layoutRow(notes,{bars,even:true,clef:false,meter});

  function local(e:PointerEvent<SVGRectElement>){
    const svg=e.currentTarget.ownerSVGElement!;
    return new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM()!.inverse());
  }
  function down(e:PointerEvent<SVGRectElement>){
    if(locked)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);
    const p=local(e);start.current={x:p.x,y:p.y};setStroke([{x:p.x,y:p.y}]);
  }
  function move(e:PointerEvent<SVGRectElement>){if(!start.current)return;const p=local(e);setStroke(s=>[...s,{x:p.x,y:p.y}])}
  function up(e:PointerEvent<SVGRectElement>){
    const s=start.current;start.current=null;setStroke([]);
    if(!s)return;
    const p=local(e),drawn=Math.abs(p.y-s.y)>28;
    const x=drawn?(s.x+p.x)/2:p.x;
    // A tap on an existing bar line erases it; a drawn stroke adds one at the nearest gap.
    const barHit=layout.barXs.findIndex(bx=>Math.abs(bx-x)<16);
    if(!drawn){if(barHit>=0)onToggle([...bars].sort((a,b)=>a-b)[barHit]);return}
    let best=-1,dist=Infinity;
    layout.gapXs.forEach((gx,j)=>{const d=Math.abs(gx-x);if(d<dist){dist=d;best=j+1}});
    if(best>0&&!bars.includes(best))onToggle(best);
  }

  return <EngravedRow notes={notes} clef={false} meter={meter} even bars={bars} beams={beamGroups(notes)} className="barline-drawing" label={zh?'画小节线':'Draw bar lines'}>
    {()=><>
      {/* The beat total of each measure, centred under it. */}
      {totals.map((total,m)=>{
        const x0=m===0?layout.startX:layout.barXs[m-1],x1=m<layout.barXs.length?layout.barXs[m]:layout.endX-10;
        const full=total===meter.top;
        return <text key={m} x={(x0+x1)/2} y={noteY(-2)+44} className={`measure-total ${full?'is-full':'is-off'}`}>{zh?`${total} 拍`:`${total} ${total===1?'beat':'beats'}`}</text>;
      })}
      {!locked&&<rect x={layout.startX-6} y={noteY(8)-40} width={layout.endX-layout.startX} height={noteY(0)-noteY(8)+80} className="barline-drawing__pad"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={()=>{start.current=null;setStroke([])}}/>}
      {stroke.length>1&&<polyline points={stroke.map(p=>`${p.x},${p.y}`).join(' ')} className="barline-drawing__pencil"/>}
      {/* Keyboard: every gap between notes is focusable; Enter or Space places or removes a bar line there. */}
      {!locked&&layout.gapXs.map((gx,j)=><rect key={j} x={gx-10} y={noteY(8)} width="20" height={noteY(0)-noteY(8)} className="barline-drawing__gap" tabIndex={0} role="button"
        aria-label={zh?`第 ${j+1} 和第 ${j+2} 个音之间${bars.includes(j+1)?'，已有小节线':''}`:`Between notes ${j+1} and ${j+2}${bars.includes(j+1)?', has a bar line':''}`}
        onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onToggle(j+1)}}}/>)}
    </>}
  </EngravedRow>;
}
