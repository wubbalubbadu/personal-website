"use client";
import {useCallback,useEffect,useRef,useState,type RefObject} from "react";

/** Scale a fixed page around the fingers without changing its layout. */
export function usePaperMagnify(scrollerRef:RefObject<HTMLDivElement|null>,paperRef:RefObject<HTMLDivElement|null>,annotating:boolean){
  const [zoom,setZoom]=useState(1),current=useRef(1),drawing=useRef(annotating);
  useEffect(()=>{drawing.current=annotating},[annotating]);
  const apply=useCallback((value:number,x:number,y:number,dx=0,dy=0)=>{
    const el=scrollerRef.current,surface=paperRef.current;if(!el||!surface)return;
    const next=Math.max(.5,Math.min(4,value)),box=surface.getBoundingClientRect(),ratio=next/current.current;
    const left=el.scrollLeft+(x-dx-box.left)*(ratio-1)-dx,top=el.scrollTop+(y-dy-box.top)*(ratio-1)-dy;
    current.current=next;surface.style.setProperty('--viewer-magnify',String(next));
    el.scrollLeft=left;el.scrollTop=top;
  },[scrollerRef,paperRef]);
  const zoomAt=useCallback((value:number,x:number,y:number)=>{apply(value,x,y);setZoom(current.current)},[apply]);
  const reset=useCallback(()=>{
    current.current=1;setZoom(1);paperRef.current?.style.setProperty('--viewer-magnify','1');
    scrollerRef.current?.scrollTo({left:0,top:0,behavior:'instant'});
  },[scrollerRef,paperRef]);
  useEffect(()=>{
    const el=scrollerRef.current;if(!el)return;
    let distance=0,startZoom=1,midX=0,midY=0,gestureZoom=1,timer=0;
    const settle=()=>{window.clearTimeout(timer);setZoom(current.current)};
    const start=(e:TouchEvent)=>{
      if(drawing.current||e.touches.length!==2)return;e.preventDefault();
      const [a,b]=[e.touches[0],e.touches[1]];
      distance=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);startZoom=current.current;
      midX=(a.clientX+b.clientX)/2;midY=(a.clientY+b.clientY)/2;
    };
    const move=(e:TouchEvent)=>{
      if(drawing.current||e.touches.length!==2||!distance)return;e.preventDefault();
      const [a,b]=[e.touches[0],e.touches[1]],x=(a.clientX+b.clientX)/2,y=(a.clientY+b.clientY)/2;
      apply(startZoom*Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)/distance,x,y,x-midX,y-midY);midX=x;midY=y;
    };
    const end=()=>{if(distance){distance=0;settle()}};
    const wheel=(e:WheelEvent)=>{if(!e.ctrlKey||drawing.current)return;e.preventDefault();apply(current.current*Math.exp(-e.deltaY*.008),e.clientX,e.clientY);window.clearTimeout(timer);timer=window.setTimeout(settle,140)};
    const gs=(e:Event)=>{e.preventDefault();gestureZoom=current.current};
    const gc=(e:Event)=>{e.preventDefault();if(drawing.current||distance)return;const g=e as Event&{scale:number;clientX:number;clientY:number};apply(gestureZoom*g.scale,g.clientX,g.clientY)};
    el.addEventListener('touchstart',start,{passive:false});el.addEventListener('touchmove',move,{passive:false});el.addEventListener('touchend',end);el.addEventListener('touchcancel',end);
    el.addEventListener('wheel',wheel,{passive:false});el.addEventListener('gesturestart',gs,{passive:false});el.addEventListener('gesturechange',gc,{passive:false});el.addEventListener('gestureend',settle);
    return()=>{window.clearTimeout(timer);el.removeEventListener('touchstart',start);el.removeEventListener('touchmove',move);el.removeEventListener('touchend',end);el.removeEventListener('touchcancel',end);el.removeEventListener('wheel',wheel);el.removeEventListener('gesturestart',gs);el.removeEventListener('gesturechange',gc);el.removeEventListener('gestureend',settle)};
  },[apply,scrollerRef]);
  return {zoom,zoomAt,reset};
}
