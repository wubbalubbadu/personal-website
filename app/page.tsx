"use client";

import { PointerEvent, useEffect, useRef, useState } from "react";
import type { OpenSheetMusicDisplay as OSMDType } from "opensheetmusicdisplay";

const pitchClasses = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const semitones: Record<string, number> = { C:0,"C♯":1,D:2,"E♭":3,E:4,F:5,"F♯":6,G:7,"A♭":8,A:9,"B♭":10,B:11 };

function addLyric(document: Document, note: Element, number: string, text: string) {
  const lyric = document.createElement("lyric"); lyric.setAttribute("number", number); lyric.setAttribute("placement", "below");
  const syllabic = document.createElement("syllabic"); syllabic.textContent = "single";
  const label = document.createElement("text"); label.textContent = text; lyric.append(syllabic, label); note.appendChild(lyric);
}

function prepareScore(xml: string, showNames: boolean, showBeats: boolean) {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  document.querySelector("work-title")?.replaceChildren("Mystery of Love");
  document.querySelectorAll('creator[type="composer"]').forEach(node => node.remove());
  document.querySelectorAll("part > measure").forEach(measure => {
    let divisions = Number(measure.querySelector(":scope > attributes > divisions")?.textContent || 4); let offset = 0;
    measure.querySelectorAll(":scope > note").forEach(note => {
      const duration = Number(note.querySelector(":scope > duration")?.textContent || 0); const chord = !!note.querySelector(":scope > chord");
      const step = note.querySelector(":scope > pitch > step")?.textContent; const alter = Number(note.querySelector(":scope > pitch > alter")?.textContent || 0); const octave = note.querySelector(":scope > pitch > octave")?.textContent;
      if (showNames && step && octave) addLyric(document, note, "90", `${step}${alter === 1 ? "♯" : alter === -1 ? "♭" : ""}${octave}`);
      if (showBeats) { const sixteenth = Math.round(offset / divisions * 4); const beat = Math.floor(sixteenth / 4) + 1; const sub = ["", "e", "+", "a"][sixteenth % 4]; addLyric(document, note, "91", `${beat}${sub}`); }
      if (!chord) offset += duration;
    });
  });
  return new XMLSerializer().serializeToString(document);
}

export default function Home() {
  const scoreRef = useRef<HTMLDivElement>(null); const canvasRef = useRef<HTMLCanvasElement>(null); const osmdRef = useRef<OSMDType | null>(null);
  const audioRef = useRef<AudioContext | null>(null); const droneRef = useRef<OscillatorNode | null>(null); const metroRef = useRef<number | null>(null); const drawing = useRef(false);
  const [loading,setLoading]=useState(true); const [error,setError]=useState(""); const [bpm,setBpm]=useState(76); const [metro,setMetro]=useState(false); const [drone,setDrone]=useState(false); const [dronePitch,setDronePitch]=useState("G"); const [droneOctave,setDroneOctave]=useState(4); const [picker,setPicker]=useState(false); const [annotating,setAnnotating]=useState(false); const [noteNames,setNoteNames]=useState(false); const [tonguing,setTonguing]=useState(false); const [beats,setBeats]=useState(false); const [zoom,setZoom]=useState(.8);

  useEffect(()=>{ let mounted=true; async function load(){ try { setLoading(true); const {OpenSheetMusicDisplay}=await import("opensheetmusicdisplay"); if(!mounted||!scoreRef.current)return; scoreRef.current.replaceChildren(); const osmd=new OpenSheetMusicDisplay(scoreRef.current,{backend:"svg",autoResize:true,drawTitle:false,drawComposer:false,drawingParameters:"compacttight"}); osmd.setOptions({pageFormat:"Endless",drawMeasureNumbers:true,drawPartNames:false,drawMetronomeMarks:true}); osmd.OnXMLRead = xml => prepareScore(xml,noteNames,beats); osmd.zoom=zoom; await osmd.load("/mystery-of-love.mxl","Mystery of Love"); osmd.render(); osmdRef.current=osmd; setLoading(false); } catch(e){setError(e instanceof Error?e.message:"The score could not be engraved.");setLoading(false);} } load(); return()=>{mounted=false};},[noteNames,beats]);
  useEffect(()=>{ if(!osmdRef.current)return; osmdRef.current.zoom=zoom; osmdRef.current.render(); },[zoom]);
  useEffect(()=>()=>{if(metroRef.current)window.clearInterval(metroRef.current);try{droneRef.current?.stop()}catch{}audioRef.current?.close()},[]);
  const audio=()=>audioRef.current??(audioRef.current=new AudioContext());
  function click(){const c=audio(),o=c.createOscillator(),g=c.createGain();o.frequency.value=1000;g.gain.setValueAtTime(.07,c.currentTime);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+.06);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+.06)}
  function toggleMetro(){if(metro){if(metroRef.current)window.clearInterval(metroRef.current);metroRef.current=null;setMetro(false)}else{click();metroRef.current=window.setInterval(click,60000/bpm);setMetro(true)}}
  function droneFrequency(pitch=dronePitch,octave=droneOctave){const midi=(octave+1)*12+semitones[pitch];return 440*2**((midi-69)/12)}
  function toggleDrone(pitch=dronePitch,octave=droneOctave){if(droneRef.current){droneRef.current.stop();droneRef.current=null;setDrone(false);return}const c=audio(),o=c.createOscillator(),g=c.createGain();o.type="triangle";o.frequency.value=droneFrequency(pitch,octave);g.gain.value=.035;o.connect(g).connect(c.destination);o.start();droneRef.current=o;setDrone(true);setPicker(false)}
  function point(e:PointerEvent<HTMLCanvasElement>){const r=e.currentTarget.getBoundingClientRect();return{x:(e.clientX-r.left)*e.currentTarget.width/r.width,y:(e.clientY-r.top)*e.currentTarget.height/r.height}}
  function begin(e:PointerEvent<HTMLCanvasElement>){if(!annotating)return;drawing.current=true;const p=point(e),c=e.currentTarget.getContext("2d");c?.beginPath();c?.moveTo(p.x,p.y);e.currentTarget.setPointerCapture(e.pointerId)}
  function draw(e:PointerEvent<HTMLCanvasElement>){if(!drawing.current||!annotating)return;const p=point(e),c=e.currentTarget.getContext("2d");if(!c)return;c.lineWidth=4;c.lineCap="round";c.strokeStyle="#e45d46";c.lineTo(p.x,p.y);c.stroke()}
  function clearInk(){canvasRef.current?.getContext("2d")?.clearRect(0,0,1600,2200)}
  return <main className="app-shell"><aside className="sidebar"><div className="brand"><span>◒</span><strong>Long Tone</strong><small>FLUTE STUDIO</small></div><label className="search"><span>⌕</span><input aria-label="Search music" placeholder="Search your library" /></label><div className="filter-row"><button>Difficulty <b>⌄</b></button><button>Category <b>⌄</b></button></div><p className="eyebrow">YOUR MUSIC · 1</p><button className="piece active"><span className="piece-icon">♫</span><span><strong>Mystery of Love</strong><small>Flute solo · Intermediate</small><em><i>lyrical</i><i>G major</i></em></span></button><div className="profile"><span>HW</span><div><strong>Haylie&apos;s studio</strong><small>Flute · Teacher</small></div><b>•••</b></div></aside>
    <section className="workspace"><header className="topbar"><div><button className="back">‹</button><span className="file-kind">SCORE</span><strong>Mystery of Love</strong><span className="saved">● MusicXML</span></div><div><button className="icon-btn">↗ Share</button><button className="icon-btn">•••</button></div></header>
      <div className="practice-bar"><div className="tool-group"><button className={noteNames?"tool on":"tool"} onClick={()=>setNoteNames(!noteNames)}><span>A♭</span>Note names</button><button className={tonguing?"tool pending":"tool"} onClick={()=>setTonguing(!tonguing)} title="Tonguing comes after these first overlays"><span>•</span>Tonguing</button><button className={beats?"tool on":"tool"} onClick={()=>setBeats(!beats)}><span>▥</span>Rhythm counts</button><button className={annotating?"tool on coral":"tool"} onClick={()=>setAnnotating(!annotating)}><span>✎</span>Mark up</button>{annotating&&<button className="clear" onClick={clearInk}>Clear ink</button>}</div>
        <div className="transport"><div className="tempo"><input aria-label="Tempo" type="range" min="40" max="144" value={bpm} onChange={e=>setBpm(+e.target.value)}/><span><b>{bpm}</b> BPM</span></div><button className={metro?"audio-tool active":"audio-tool"} onClick={toggleMetro}><span>♩</span>Metronome</button><div className="drone-wrap"><button className={drone?"audio-tool active":"audio-tool"} onClick={()=>drone?toggleDrone():setPicker(!picker)}><span>◉</span>Drone <b>{dronePitch}{droneOctave}</b></button>{picker&&<div className="drone-pop chromatic"><strong>Choose a drone pitch</strong><div className="pitch-grid">{pitchClasses.map(n=><button className={n===dronePitch?"selected":""} key={n} onClick={()=>setDronePitch(n)}>{n}</button>)}</div><label>Octave <select value={droneOctave} onChange={e=>setDroneOctave(+e.target.value)}>{[3,4,5,6].map(o=><option key={o}>{o}</option>)}</select></label><button className="start-drone" onClick={()=>toggleDrone(dronePitch,droneOctave)}>Start {dronePitch}{droneOctave}</button></div>}</div></div></div>
      <div className="score-scroll"><div className="score-paper engraved"><div className="custom-score-heading"><p>FLUTE SOLO</p><h1>Mystery of Love</h1><span>Flute</span></div>{loading&&<div className="score-loading">Engraving the MusicXML score…</div>}{error&&<div className="score-error">{error}</div>}<div ref={scoreRef} className="osmd-score"/><canvas ref={canvasRef} width="1600" height="2200" className={annotating?"ink active":"ink"} onPointerDown={begin} onPointerMove={draw} onPointerUp={()=>drawing.current=false} onPointerCancel={()=>drawing.current=false}/></div></div>
      <footer className="statusbar"><span>MusicXML engraving · Flute</span><span>Notation rendered from the attached score</span><span><button onClick={()=>setZoom(Math.max(.55,zoom-.1))}>−</button> {Math.round(zoom*100)}% <button onClick={()=>setZoom(Math.min(1.25,zoom+.1))}>＋</button></span></footer>
    </section></main>
}
