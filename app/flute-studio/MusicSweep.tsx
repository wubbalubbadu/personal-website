"use client";

import {useEffect,useRef,type ReactNode} from "react";

/**
 * Lights the noteheads of an OSMD engraving one after another, left to right, like a playback cursor, then rests a
 * moment and starts again (Browse music tile, Nov 12). Works on whatever TrickyPreview drew inside it: it looks for
 * VexFlow's `.vf-notehead` groups in document order. Runs only while on screen; still with reduced motion.
 */
const STEP_MS=380,REST_STEPS=4;

export default function MusicSweep({children}:{children:ReactNode}){
  const root=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const el=root.current;if(!el||matchMedia("(prefers-reduced-motion: reduce)").matches)return;
    let timer=0,step=0,lit:Element|null=null;
    const tick=()=>{
      const heads=el.querySelectorAll(".vf-notehead");
      lit?.classList.remove("is-lit");lit=null;
      if(!heads.length)return;
      const i=step%(heads.length+REST_STEPS);
      if(i<heads.length){lit=heads[i];lit.classList.add("is-lit")}
      step++;
    };
    const observer=new IntersectionObserver(([entry])=>{
      clearInterval(timer);
      if(entry.isIntersecting)timer=window.setInterval(tick,STEP_MS);
      else{lit?.classList.remove("is-lit");lit=null}
    },{threshold:.4});
    observer.observe(el);
    return()=>{observer.disconnect();clearInterval(timer)};
  },[]);
  return <div className="music-sweep" ref={root}>{children}</div>;
}
