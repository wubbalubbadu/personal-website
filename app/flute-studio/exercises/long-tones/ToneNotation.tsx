'use client';
import { useEffect, useRef, useState } from 'react';
import { toneGroupMusicXML, type ToneBlock, type TonePattern } from './long-tone-score';
import { toneFinding, type ToneAttempt } from '../../lib/toneSession';

export function ToneNotation({block,pattern,active,cursorAfter=false,startEvent,attempts,onSelect,zh,live=null,running=false}: {
  block:ToneBlock;pattern:TonePattern;active:number;cursorAfter?:boolean;startEvent:number;attempts:ToneAttempt[];onSelect:(event:number)=>void;zh:boolean;live?:ToneAttempt|null;running?:boolean;
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
  // Feedback marks are HTML over the engraving, not SVG text inside it: the
  // SVG scales with the notation, and text inside it scaled with it.
  const [marks,setMarks]=useState<{event:number;x:number;y:number;finding:ReturnType<typeof toneFinding>}[]>([]);
  // The playhead is the score's own (same line, cap and label), not an SVG line of its own.
  const [head,setHead]=useState<{x:number;top:number;height:number;labelY:number}|null>(null);
  useEffect(()=>{
    const el=host.current;
    if(!el)return;
    const observer=new ResizeObserver(()=>setVersion(v=>v+1));
    observer.observe(el);
    return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    const el=host.current;
    if(!el)return;
    const svg=el.querySelector('svg'),matrix=svg?.getScreenCTM(),frame=el.parentElement!.getBoundingClientRect();
    const next:typeof marks=[];let playhead:typeof head=null;
    el.querySelectorAll<SVGGElement>('[data-tone-event]').forEach(node=>{
      const event=Number(node.dataset.toneEvent);
      const head=node.querySelector('.vf-notehead path')??node.querySelector('.vf-notehead');
      if(!svg||!head||!matrix)return;
      const box=head.getBoundingClientRect();
      const measure=(node.closest('.vf-measure')??node).getBoundingClientRect();
      const attempted=attempts.some(a=>a.target.id===event);
      if(event===active){
        const top=Math.min(box.top,measure.top)-14-frame.top;
        playhead={x:(cursorAfter?box.right+10:box.left-10)-frame.left,top,height:measure.bottom-frame.top-top,labelY:measure.bottom-frame.top+(attempted?34:8)};
      }
      const attempt=attempts.filter(a=>a.target.id===event).at(-1);
      if(attempt){
        next.push({event,x:box.left+box.width/2-frame.left,y:measure.bottom-frame.top+6,finding:toneFinding(attempt,zh)});
      }
    });
    setMarks(next);setHead(playhead);
  },[active,cursorAfter,attempts,version,zh]);
  return <div className="tone-notation" role="group" aria-label={zh?"练习乐谱":"Practice notation"}>
    <div ref={host}/>
    {head&&<><span className={`tone-playhead ${cursorAfter?'is-after':''}`} style={{left:head.x,top:head.top,height:head.height}}/>
      {(live||(!cursorAfter&&!running))&&<span className="tone-note-time" style={{left:head.x+(cursorAfter?0:10),top:head.labelY}}>{live?`${((live.frames.at(-1)!.at-live.startedAt)/1000).toFixed(1)}s`:(zh?'从这里开始':'Start here')}</span>}</>}
    {marks.map(m=><button key={m.event} className={`tone-pitch-badge grade-${m.finding.grade} kind-${m.finding.kind}`} style={{left:m.x,top:m.y}} title={m.finding.text} aria-label={m.finding.text} onClick={()=>selectRef.current(m.event)}>{m.finding.short}</button>)}
    {failed&&<p role="alert">{zh?'无法显示乐谱，请返回完整乐谱。':'Notation could not load. Return to the full score.'}</p>}
  </div>;
}
