'use client';
import { useEffect, useRef, useState } from 'react';
import { toneGroupMusicXML, type ToneBlock, type TonePattern } from './long-tone-score';
import { toneSummary, tonePitchLabel, type ToneAttempt } from '../../lib/toneSession';

export function ToneNotation({block,pattern,active,cursorAfter=false,startEvent,attempts,onSelect,zh}: {
  block:ToneBlock;pattern:TonePattern;active:number;cursorAfter?:boolean;startEvent:number;attempts:ToneAttempt[];onSelect:(event:number)=>void;zh:boolean;
}) {
  const host=useRef<HTMLDivElement>(null);
  const selectRef=useRef(onSelect);
  useEffect(()=>{selectRef.current=onSelect},[onSelect]);
  const [version,setVersion]=useState(0),[failed,setFailed]=useState(false);
  useEffect(()=>{
    let disposed=false;
    const root=host.current!;
    import('opensheetmusicdisplay').then(async ({OpenSheetMusicDisplay})=>{
      const osmd=new OpenSheetMusicDisplay(root,{backend:'svg',autoResize:false,drawTitle:false,drawComposer:false,drawingParameters:'compacttight'});
      await osmd.load(toneGroupMusicXML(block,pattern));
      if(disposed)return;
      osmd.EngravingRules.RenderSingleHorizontalStaffline=true;
      osmd.EngravingRules.RenderTimeSignatures=false;
      osmd.render();
      const svg=root.querySelector('svg');
      if(svg){const box=svg.getBBox();svg.setAttribute('viewBox',`${box.x-12} ${box.y-15} ${box.width+24} ${box.height+40}`);svg.removeAttribute('width');svg.removeAttribute('height');}
      root.querySelectorAll<SVGGElement>('.vf-stavenote').forEach((node,i)=>{
        node.dataset.toneEvent=String(startEvent+i);
        node.setAttribute('role','button');node.setAttribute('tabindex','0');
        node.setAttribute('aria-label',`${zh?'选择音符':'Select note'} ${i+1}`);
        node.addEventListener('click',()=>selectRef.current(startEvent+i));
        node.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectRef.current(startEvent+i)}});
      });
      setVersion(v=>v+1);
    }).catch(()=>{if(!disposed)setFailed(true)});
    return()=>{disposed=true;root.replaceChildren()};
  },[block,pattern,startEvent,zh]);
  useEffect(()=>{
    host.current?.querySelectorAll('.tone-closeup-playhead,.tone-notation-pitch-label').forEach(node=>node.remove());
    host.current?.querySelectorAll<SVGGElement>('[data-tone-event]').forEach(node=>{
      const event=Number(node.dataset.toneEvent);
      node.classList.toggle('tone-notation-active',event===active);
      if(event===active){
        const svg=host.current?.querySelector('svg'),head=node.querySelector('.vf-notehead path')??node.querySelector('.vf-notehead');
        const matrix=svg?.getScreenCTM();
        if(svg&&head&&matrix){
          const box=head.getBoundingClientRect();
          const point=new DOMPoint(cursorAfter?box.right:box.left,box.top).matrixTransform(matrix.inverse());
          const line=document.createElementNS('http://www.w3.org/2000/svg','line');
          line.setAttribute('class','tone-closeup-playhead');
          line.setAttribute('x1',String(point.x+(cursorAfter?7:-7)));line.setAttribute('x2',String(point.x+(cursorAfter?7:-7)));
          line.setAttribute('y1',String(point.y-32));line.setAttribute('y2',String(point.y+18));
          svg.appendChild(line);
        }
      }
      const attempt=attempts.filter(a=>a.target.id===event).at(-1);
      node.dataset.grade=attempt?toneSummary(attempt).grade:'';
      const svg=host.current?.querySelector('svg'),head=node.querySelector('.vf-notehead path')??node.querySelector('.vf-notehead');
      const matrix=svg?.getScreenCTM();
      if(attempt&&svg&&head&&matrix){
        const box=head.getBoundingClientRect(),measure=(node.closest('.vf-measure')??node).getBoundingClientRect();
        const point=new DOMPoint(box.left+box.width/2,measure.bottom).matrixTransform(matrix.inverse());
        const label=tonePitchLabel(attempt,zh),text=document.createElementNS('http://www.w3.org/2000/svg','text');
        text.setAttribute('class',`tone-notation-pitch-label grade-${toneSummary(attempt).grade}`);
        text.setAttribute('x',String(point.x));text.setAttribute('y',String(point.y+12));text.setAttribute('text-anchor','middle');
        text.setAttribute('role','button');text.setAttribute('tabindex','0');text.setAttribute('aria-label',label.description);
        text.textContent=label.short;
        const title=document.createElementNS('http://www.w3.org/2000/svg','title');title.textContent=label.description;text.appendChild(title);
        text.addEventListener('click',()=>selectRef.current(event));
        text.addEventListener('keydown',key=>{if(key.key==='Enter'||key.key===' '){key.preventDefault();selectRef.current(event)}});
        svg.appendChild(text);
      }
    });
  },[active,cursorAfter,attempts,version,zh]);
  return <div className="tone-notation" role="group" aria-label={zh?"练习乐谱":"Practice notation"}>
    <div ref={host}/>{failed&&<p role="alert">{zh?'无法显示乐谱，请返回完整乐谱。':'Notation could not load. Return to the full score.'}</p>}
  </div>;
}
