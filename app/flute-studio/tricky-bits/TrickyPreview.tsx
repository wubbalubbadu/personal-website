"use client";
import {useEffect,useRef,useState} from "react";
import "./tricky-preview.css";
import {loadExcerptXml} from "../lib/excerptXml";
import {installGhostNoteFix} from "../lib/ghostNoteFix";

/** Card previews are engraved one at a time: OSMD blocks the main thread, and a page of cards drawn together freezes it. */
let queue:Promise<unknown>=Promise.resolve();
const inLine=<T,>(job:()=>Promise<T>):Promise<T>=>{const run=queue.then(job,job);queue=run.catch(()=>undefined);return run};

/** A small, quiet engraving of a saved passage: no playback, no controls. */
export default function TrickyPreview({scorePath,from,to,label,onSettled}:{scorePath:string;from:number;to:number;label:string;/** Drawn or failed: the caller can stop waiting. */onSettled?:()=>void}){
  const host=useRef<HTMLDivElement>(null);
  const [state,setState]=useState<"waiting"|"ready"|"error">("waiting");
  const settledRef=useRef(onSettled);
  useEffect(()=>{settledRef.current=onSettled});
  useEffect(()=>{if(state!=="waiting")settledRef.current?.()},[state]);
  useEffect(()=>{
    let gone=false;const el=host.current;if(!el)return;
    inLine(async()=>{
      if(gone)return;
      try{
        const xml=await loadExcerptXml(scorePath,from,to);if(gone)return;
        const {OpenSheetMusicDisplay,VexFlowConverter}=await import("opensheetmusicdisplay");installGhostNoteFix(VexFlowConverter);if(gone)return;
        el.replaceChildren();
        const score=new OpenSheetMusicDisplay(el,{backend:"svg",autoResize:false,drawingParameters:"compacttight",drawTitle:false,drawComposer:false,drawPartNames:false});
        score.setOptions({pageFormat:"Endless",drawMeasureNumbers:true,newSystemFromXML:false});
        score.EngravingRules.RenderSingleHorizontalStaffline=true;score.EngravingRules.MinNoteDistance=1.4;
        score.EngravingRules.RenderMultipleRestMeasures=false;score.EngravingRules.AutoGenerateMultipleRestMeasuresFromRestMeasures=false;
        await score.load(xml);if(gone)return;
        score.Zoom=.62;score.render();
        if(!gone)setState("ready");
      }catch{if(!gone)setState("error")}
    });
    return()=>{gone=true};
  },[scorePath,from,to]);
  return <div className="tricky-preview" data-state={state}><div ref={host} className="tricky-preview__music" role="img" aria-label={label}/>{state==="waiting"&&<span className="tricky-preview__note">…</span>}{state==="error"&&<span className="tricky-preview__note">Could not draw these bars.</span>}</div>;
}
