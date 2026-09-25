'use client';
import {useRef,type PointerEvent} from 'react';
import TrebleClef from './TrebleClef';
import QuarterNote from './QuarterNote';
import {noteY,positionAt,pitchAt,ledgerLines,SOLFEGE} from './model';

type Props={showPlacement?:boolean;onCommit?:(position:number,slot:number)=>void;targets?:number[];step:number;position:number;phrase:(number|null)[];selected:number;playing:number;highlight:number|null;labels:boolean;solfege:boolean;zh:boolean;onPosition:(position:number,slot?:number)=>void;onHighlight:(position:number)=>void;onSelect:(slot:number)=>void};
export default function Staff({showPlacement=false,onCommit,targets,step,position,phrase,selected,playing,highlight,labels,solfege,zh,onPosition,onHighlight,onSelect}:Props){
  const drag=useRef<{pointer:number;slot:number;last:number;offset:number}|null>(null);
  function update(event:PointerEvent<SVGSVGElement>,start=false){
    if(step<3)return;
    const svg=event.currentTarget,matrix=svg.getScreenCTM();if(!matrix)return;
    const point=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
    if(start&&(point.y<60||point.y>244||point.x<150||point.x>695))return;
    const slot=step===5?Math.max(0,Math.min(phrase.length-1,Math.round((point.x-210)/(420/(phrase.length-1))))):0;
    const raw=positionAt(point.y);
    const existingSlot=(event.target as Element).closest?.("[data-note-slot]")?.getAttribute("data-note-slot");
    const original=existingSlot!==null&&existingSlot!==undefined?items[Number(existingSlot)]:null;
    const offset=start&&original!==null&&original!==undefined?original-raw:drag.current?.offset??0;
    const requested=raw+offset;
    const next=step===3?Math.max(0,Math.min(8,requested)):Math.max(-2,Math.min(10,requested));
    if(start){svg.setPointerCapture(event.pointerId);drag.current={pointer:event.pointerId,slot,last:next,offset};onSelect(slot);onPosition(next,slot)}
    else if(drag.current?.pointer===event.pointerId&&drag.current.last!==next){drag.current.last=next;onPosition(next,drag.current.slot)}
  }
  const items=step===5?phrase:[step>=2?position:null];
  return <svg className={`theory-staff ${step>=3?'is-editable':''}`} viewBox="0 40 760 245" preserveAspectRatio="xMidYMax meet" role="group" aria-label={step<2?(zh?'探索五条线和四个间':'Explore the five lines and four spaces'):(zh?'可交互的高音谱表，也可以选中音符并使用方向键。':'Interactive treble staff. Drag a note, or focus it and use the arrow keys.')}
    onPointerDown={event=>update(event,true)} onPointerMove={event=>update(event)} onPointerUp={()=>{if(drag.current)onCommit?.(drag.current.last,drag.current.slot);drag.current=null}} onPointerCancel={()=>{drag.current=null}}>
    <title>{step===5?(zh?'你的旋律':'Your phrase'):(zh?'五线谱':'The musical staff')}</title>
    {step===1&&[1,3,5,7].map((p,i)=><rect style={{animationDelay:`${i*200}ms`}} key={p} className={`theory-space ${highlight===p&&!showPlacement?'is-lit':''}`} x="150" y={noteY(p)-12} width="540" height="24" rx="3"/>)}
    {[0,2,4,6,8].map((p,index)=><g key={p} className={step===0?"staff-build-line":""} style={{animationDelay:`${index*180}ms`}}>
      <line className={`theory-staff-line ${highlight===p||step===2&&p===2?'is-lit':''}`} x1="55" x2="705" y1={noteY(p)} y2={noteY(p)} style={{animationDelay:`${index*85}ms`}}/>
      {step===0&&<circle cx="70" cy={noteY(p)} r="4" fill="#bb352e"/>}{step===0&&<text x="724" y={noteY(p)+5}  className={highlight===p?'theory-line-label is-lit':'theory-line-label'}>{index+1}</text>}
    </g>)}
    {step===1&&[1,3,5,7].map((p,i)=><text key={p} x="724" y={noteY(p)+5} className="theory-line-label" style={{animationDelay:`${i*280}ms`}}>{i+1}</text>)}
    {step===1&&showPlacement&&<g className="staff-placement-example" style={{transform:`translate(400px,${noteY(highlight??3)}px)`}}><QuarterNote/><text y={250-noteY(highlight??3)} textAnchor="middle" className="theory-caption">{(highlight??3)%2===0?(zh?'在线上':'on a line'):(zh?'在间里':'in a space')}</text></g>}
    {step>=2&&<TrebleClef/>}
    {step<2&&(step===0?[0,2,4,6,8]:showPlacement?[0,1,2,3,4,5,6,7,8]:[1,3,5,7]).map((p,index)=><g key={p} role="button" tabIndex={0} aria-label={zh?`第${showPlacement?Math.floor(p/2)+1:index+1}${step===0||showPlacement&&p%2===0?'线':'间'}`:`${step===0||showPlacement&&p%2===0?'Line':'Space'} ${showPlacement?Math.floor(p/2)+1:index+1}`}  onClick={()=>onHighlight(p)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onHighlight(p)}}} className="theory-staff-target" style={{animationDelay:`${index*180}ms`}}>
      <rect x="150" y={noteY(p)-11} width="540" height="22" fill="transparent"/>
      {highlight===p&&!showPlacement&&<><circle cx="400" cy={noteY(p)} r="7" className="theory-position-dot"/><text x="425" y={noteY(p)-7} className="theory-position-label">{zh?`第${index+1}${step===0?'线':'间'}`:`${step===0?'line':'space'} ${index+1}`}</text></>}
    </g>)}
    {step>=2&&items.map((p,index)=>{
      const x=step===5?210+index*(420/(phrase.length-1)):400;
      const keyboardProps=step>=3?{
        role:'button' as const,tabIndex:0,'data-note-slot':index,
        'aria-label':`${zh?'音符':'Note'} ${index+1}${p===null?'':`: ${pitchAt(p).name} ${SOLFEGE[pitchAt(p).name]}`}`,
        onFocus:()=>onSelect(index),
        onKeyDown:(event:React.KeyboardEvent<SVGGElement>)=>{
          if(['ArrowUp','ArrowDown','Enter',' '].includes(event.key)){
            event.preventDefault();onSelect(index);
            const next=p===null?2:Math.max(-2,Math.min(10,p+(event.key==='ArrowUp'?1:event.key==='ArrowDown'?-1:0)));
            onPosition(next,index);onCommit?.(next,index);
          }
        }
      }:{};
      if(p===null)return <g key={index} {...keyboardProps} className={`theory-empty ${selected===index?'is-selected':''}`}><rect x={x-40} y="70" width="80" height="170" fill="transparent"/><line x1={x} x2={x} y1="90" y2="215"/><text x={x} y="260">{targets?pitchAt(targets[index]).name+' · '+SOLFEGE[pitchAt(targets[index]).name]:index+1}</text></g>;
      const pitch=pitchAt(p),active=step===5?playing===index:playing>=0;
      return <g key={index} {...keyboardProps} data-note-slot={index} className={`theory-note ${active?'is-playing':''} ${step===5&&selected===index?'is-selected':''}`} style={{transform:`translate(${x}px, ${noteY(p)}px)`}}>
        {ledgerLines(p).map(line=><line key={line} x1="-23" x2="23" y1={noteY(line)-noteY(p)} y2={noteY(line)-noteY(p)} className="theory-ledger"/>)}
        <circle r="25" className="theory-note-halo"/>
        <QuarterNote down={p>=4}/>
        {targets&&<text y={274-noteY(p)} textAnchor="middle" className="theory-pitch-label">{pitchAt(targets[index]).name} · {SOLFEGE[pitchAt(targets[index]).name]}</text>}
        {labels&&!targets&&<text y={274-noteY(p)} textAnchor="middle" className="theory-pitch-label">{pitch.name}{solfege&&<tspan dy="0" dx="6" className="theory-solfege-label">{SOLFEGE[pitch.name]}</tspan>}</text>}
      </g>;
    })}
  </svg>;
}
