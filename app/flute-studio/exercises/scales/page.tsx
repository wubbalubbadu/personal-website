"use client";

import {useEffect,useRef,useState} from "react";
import type {OpenSheetMusicDisplay as OSMDType} from "opensheetmusicdisplay";
import "./scales.css";

type RenderStatus="loading"|"ready"|"error";

export default function ScaleStudio(){
  const scoreRoot=useRef<HTMLDivElement>(null),osmd=useRef<OSMDType|null>(null);
  const [status,setStatus]=useState<RenderStatus>("loading");
  const [zoom,setZoom]=useState(.92);
  useEffect(()=>{let active=true;import("opensheetmusicdisplay").then(async({OpenSheetMusicDisplay})=>{if(!active||!scoreRoot.current)return;const display=new OpenSheetMusicDisplay(scoreRoot.current,{backend:"svg",autoResize:true,drawTitle:false,drawingParameters:"compacttight"});osmd.current=display;try{await display.load("/scales-flute.mxl","C and G major scales");if(!active)return;display.zoom=zoom;display.EngravingRules.MinimumDistanceBetweenSystems=14;display.render();setStatus("ready")}catch(error){console.error("Unable to render scale score",error);if(active)setStatus("error")}});return()=>{active=false}},[]);
  useEffect(()=>{if(!osmd.current||status!=="ready")return;osmd.current.zoom=zoom;osmd.current.render()},[zoom,status]);
  function openTool(tool:"tuner"|"metronome"|"drone"){window.dispatchEvent(new CustomEvent("cookie:open-practice-tools",{detail:{tool}}))}
  return <main className="scale-shell"><section className="scale-main">
    <header className="scale-page-header"><p>Exercises</p><div className="scale-heading-line"><h1>Scale Studio</h1><span>2 scales</span></div><p className="scale-page-intro">Two-octave C major and G major scales for flute.</p></header>
    <section className="scale-viewer" aria-label="Scale sheet music viewer">
      <header className="scale-viewer-header"><div><p>Scale study</p><h2>C major and G major</h2><span>Flute · 4/4 · 8 measures</span></div><div className="scale-viewer-actions" aria-label="Viewer controls"><button type="button" onClick={()=>openTool("metronome")}><span aria-hidden="true">◴</span> Metronome</button><button type="button" onClick={()=>openTool("drone")}><span aria-hidden="true">◉</span> Drone</button><div className="scale-zoom" role="group" aria-label="Score zoom"><button type="button" onClick={()=>setZoom(value=>Math.max(.7,Number((value-.08).toFixed(2))))} aria-label="Zoom out">−</button><span>{Math.round(zoom*100)}%</span><button type="button" onClick={()=>setZoom(value=>Math.min(1.25,Number((value+.08).toFixed(2))))} aria-label="Zoom in">+</button></div></div></header>
      <div className="scale-viewer-toolbar"><button type="button" onClick={()=>openTool("tuner")}><span aria-hidden="true">♩</span><b>Tuner</b><small>Check pitch</small></button><button type="button" onClick={()=>openTool("metronome")}><span aria-hidden="true">◴</span><b>Metronome</b><small>Keep time</small></button><button type="button" onClick={()=>openTool("drone")}><span aria-hidden="true">◉</span><b>Drone</b><small>Hear the key</small></button></div>
      <div className="scale-score-scroll"><article className="scale-paper" aria-busy={status==="loading"}><div className="scale-paper-title"><h2>Major Scales</h2><p>C major and G major · Two octaves</p></div>{status!=="ready"&&<div className={`scale-render-state ${status}`} role="status" aria-live="polite">{status==="loading"?"Engraving score…":"The scale score could not be rendered."}</div>}<div ref={scoreRoot} className="scale-score"/></article></div>
    </section>
  </section></main>
}
