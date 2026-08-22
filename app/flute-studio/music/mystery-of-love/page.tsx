"use client";

import { PointerEvent, useEffect, useRef, useState } from "react";
import type { OpenSheetMusicDisplay as OSMDType } from "opensheetmusicdisplay";
import { useLanguage } from "../../i18n/LanguageContext";

const pitchClasses = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const semitones: Record<string, number> = { C:0,"C♯":1,D:2,"E♭":3,E:4,F:5,"F♯":6,G:7,"A♭":8,A:9,"B♭":10,B:11 };
const scorePhrase = ["B4","G4","B4","A4","G4","G4","E4","D4",null,"E4","F♯4","G4","D5","B4","A4"];
const mysteryScoreSequence = Array.from({length:4},()=>scorePhrase).flat();
const eventPhrase = [{p:"B4",d:6},{p:"G4",d:2},{p:"B4",d:2},{p:"A4",d:1},{p:"G4",d:1},{p:"G4",d:2},{p:"E4",d:2},{p:"D4",d:12},{p:null,d:4},{p:"E4",d:4},{p:"F♯4",d:4},{p:"G4",d:4},{p:"D5",d:4},{p:"B4",d:8},{p:"A4",d:8}];
const mysteryScoreEvents = Array.from({length:4},()=>eventPhrase).flat();
const mysteryMeasureStarts = Array.from({length:4},(_,group)=>[0,7,9,13].map(index=>index+group*15)).flat();
export type ScoreViewerConfig={title:string;composer:string;asset:string;id:string;backHref:string;pitches:(string|null)[];events:{p:string|null;d:number}[];measureStarts:number[];subtitle?:string};
const mysteryConfig:ScoreViewerConfig={title:"Mystery of Love",composer:"Sufjan Stevens",asset:"/mystery-of-love.mxl",id:"mystery-of-love",backHref:"/flute-studio/music",pitches:mysteryScoreSequence,events:mysteryScoreEvents,measureStarts:mysteryMeasureStarts};
/**
 * Standard closed-hole Boehm flute fingerings, covering the full chromatic
 * scale across the octaves this app can render. Octaves 4 and 5 share a
 * fingering, as on a real flute — the register change comes from air speed,
 * not the fingers. Octave 6 genuinely uses different (harmonic) fingerings,
 * and altissimo notes above G6 vary enough by player/flute that they're left
 * out rather than guessed.
 *
 * Keys: T=thumb, L1-3=left hand index/middle/ring, R1-3=right hand
 * index/middle/ring, LP=left-pinky G♯ key, REb=right-pinky Eb/D♯ key (a Boehm
 * quirk: every note from E up through B needs this key closed, or an "easy"
 * alternate Eb fingering that skips the right hand entirely), RC=right-pinky
 * low-C footjoint key, RCs=right-pinky low-C♯ footjoint key.
 */
const octave12Fingerings:Record<string,string[]>={
  C:["T","L1","L2","L3","R1","R2","R3","RC"],
  "C♯":["T","L1","L2","L3","R1","R2","R3","RCs"],
  D:["T","L1","L2","L3","R1","R2","R3"],
  "D♯":["T","L1","L2","L3","REb"],
  E:["T","L1","L2","L3","R1","R2","REb"],
  F:["T","L1","L2","L3","R1","REb"],
  "F♯":["T","L1","L2","L3","R3","REb"],
  G:["T","L1","L2","L3","REb"],
  "G♯":["T","L1","L2","L3","LP","REb"],
  A:["T","L1","L2","REb"],
  "A♯":["T","L1","R1","REb"],
  B:["T","L1","REb"],
};
const octave3Fingerings:Record<string,string[]>={
  C:["T","L1","L2","L3","R1","R2","R3","RC"],
  "C♯":["T","L1","L2","L3","R1","R2","R3","RCs"],
  D:["T","L2","L3"],
  "D♯":["T","L2","L3","REb"],
  E:["T","L1","L2","R1","R2","REb"],
  F:["T","L1","L2","L3","R1","REb"],
  "F♯":["T","L1","L3","R3","REb"],
  G:["L1","L2","L3","REb"],
  "G♯":["T","L1","L2","L3","LP","REb"],
};
const solfegeNames:Record<string,string>={C:"Do",D:"Re",E:"Mi",F:"Fa","F♯":"Fi",G:"Sol",A:"La",B:"Ti"};
function fingeringsFor(pitch:string){
  const match=pitch.match(/^([A-G]♯?)(\d)$/);
  if(!match)return [];
  const [,letter,octave]=match;
  const table=octave==="6"?octave3Fingerings:octave12Fingerings;
  return table[letter]??[];
}
type RhythmMode = "off"|"counts"|"bars";
type NoteDisplay = "off"|"names"|"solfege";
function fingeringOn(pitch:string,key:string){return fingeringsFor(pitch).includes(key)}
function measureForEvent(index:number,measureStarts:number[]){let result=1;measureStarts.forEach((start,i)=>{if(start<=index)result=i+1});return result}
function clampTip(x:number,y:number,width:number,height:number,anchor:"below"|"above"){
  const pad=12;
  const maxLeft=Math.max(pad,window.innerWidth-width-pad);
  const maxTop=Math.max(pad,window.innerHeight-height-pad);
  let left=x+14;
  if(left>maxLeft)left=Math.max(pad,x-14-width);
  left=Math.min(Math.max(left,pad),maxLeft);
  let top=anchor==="above"?y-height-14:y+14;
  top=Math.min(Math.max(top,pad),maxTop);
  return {left,top};
}
function overlay(root:HTMLDivElement,className:string,text:string,x:number,y:number){const item=document.createElement("span");item.className=`practice-overlay ${className}`;item.textContent=text;item.style.left=`${x}px`;item.style.top=`${y}px`;root.appendChild(item)}
function placePracticeOverlays(root:HTMLDivElement,scoreEvents:{p:string|null;d:number}[],measureStarts:number[]){root.querySelectorAll(".practice-overlay").forEach(n=>n.remove());const rootBox=root.getBoundingClientRect(),all=[...root.querySelectorAll<SVGGElement>(".vf-stavenote[data-event]")];for(let measure=1;measure<=measureStarts.length;measure++){const group=all.filter(n=>Number(n.dataset.measure)===measure);if(!group.length)continue;const start=measureStarts[measure-1],ancestor=group[0].closest<SVGGElement>(".vf-measure"),measureBox=ancestor?.getBoundingClientRect(),groupBottom=Math.max(...group.map(n=>n.getBoundingClientRect().bottom)),labelLane=(measureBox?.bottom??groupBottom)-rootBox.top+18,countLane=labelLane+24;group.forEach(note=>{const index=Number(note.dataset.event),event=scoreEvents[index],box=note.getBoundingClientRect(),x=box.left-rootBox.left+box.width/2;if(event?.p){const letter=event.p.replace(/\d/,"");overlay(root,"note-name-marker",letter,x,labelLane);overlay(root,"solfege-marker",solfegeNames[letter]??letter,x,labelLane);if(event.p.includes("♯"))overlay(root,"accidental-marker","♯",x,box.top-rootBox.top-18)}let onset=0;for(let i=start;i<index;i++)onset+=scoreEvents[i]?.d??0;const sixteenth=Math.round(onset);overlay(root,"count-marker",`${Math.floor(sixteenth/4)+1}${["","e","+","a"][sixteenth%4]}`,x,countLane)});let onset=0;const anchors=group.map((node,i)=>{const eventIndex=start+i,box=node.getBoundingClientRect(),anchor={t:onset,x:box.left-rootBox.left+box.width/2};onset+=scoreEvents[eventIndex]?.d||0;return anchor}),right=measureBox?measureBox.right-rootBox.left:anchors.at(-1)!.x+34;anchors.push({t:16,x:right});const top=(measureBox?.top??Math.min(...group.map(n=>n.getBoundingClientRect().top)))-rootBox.top-7;for(let beat=0;beat<4;beat++){const target=beat*4,left=[...anchors].reverse().find(a=>a.t<=target)??anchors[0],next=anchors.find(a=>a.t>=target)??anchors.at(-1)!,ratio=next.t===left.t?0:(target-left.t)/(next.t-left.t);overlay(root,"beat-stick","",left.x+(next.x-left.x)*ratio,top)}}}
function addTheoryTargets(root:HTMLDivElement){const targets:[[string,string],...[string,string][]]=[[".vf-clef","Treble clef: the curl circles the G line. Flute music is normally written in this clef."],[".vf-keysignature","Key signature: one sharp means every F is played as F-sharp unless an accidental changes it."],[".vf-timesignature","Time signature: the top number gives beats per measure; the bottom number identifies the beat value."],[".vf-stavetie","Tie: hold the connected notes as one continuous sound. Do not tongue the second note."]];targets.forEach(([selector,text])=>root.querySelectorAll<SVGElement>(selector).forEach(node=>{node.dataset.theory=text;node.classList.add("theory-target")}))}

type ScoreNote={id:string;kind:"text"|"sticky";x:number;y:number;text:string};
function notesStorageKey(id:string){return `cookie:${id}:notes`}
function readNotes(id:string):ScoreNote[]{try{const saved=JSON.parse(localStorage.getItem(notesStorageKey(id))??"[]");return Array.isArray(saved)?saved:[]}catch{return []}}

function prepareScore(xml: string,title:string) {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  document.querySelector("work-title")?.replaceChildren(title);
  document.querySelectorAll('creator[type="composer"]').forEach(node => node.remove());
  return new XMLSerializer().serializeToString(document);
}

export function ScoreViewer({config=mysteryConfig}:{config?:ScoreViewerConfig}) {
  const {t}=useLanguage();
  const {title,composer,asset,id,backHref,pitches:scoreSequence,events:scoreEvents,measureStarts}=config;
  const scoreRef = useRef<HTMLDivElement>(null); const canvasRef = useRef<HTMLCanvasElement>(null); const osmdRef = useRef<OSMDType | null>(null);
  const audioRef = useRef<AudioContext | null>(null); const dronesRef = useRef(new Map<string,OscillatorNode>()); const playbackTimers=useRef<number[]>([]); const playbackNodes=useRef<OscillatorNode[]>([]); const metroRef = useRef<number | null>(null); const metroBeat=useRef(0); const metroTaps=useRef<number[]>([]); const drawing = useRef(false); const inkHistory=useRef<string[]>([]); const inkIndex=useRef(-1);
  const [loading,setLoading]=useState(true); const [error,setError]=useState(""); const [bpm,setBpm]=useState(76); const [startMeasure,setStartMeasure]=useState(1); const [playing,setPlaying]=useState(false); const [metro,setMetro]=useState(false); const [accent]=useState(true); const [activeDrones,setActiveDrones]=useState<string[]>([]); const [dronePitch,setDronePitch]=useState("G"); const [droneOctave,setDroneOctave]=useState(4); const [picker,setPicker]=useState(false); const [annotating,setAnnotating]=useState(false); const [inkColor,setInkColor]=useState("#e45d46"); const [eraser,setEraser]=useState(false); const [historyTick,setHistoryTick]=useState(0); const [noteDisplay,setNoteDisplay]=useState<NoteDisplay>("off"); const [accidentals,setAccidentals]=useState(false); const [tonguing,setTonguing]=useState(false); const [fingering,setFingering]=useState(false); const [rhythmMode,setRhythmMode]=useState<RhythmMode>("off"); const [zoom,setZoom]=useState(.8); const [magnify,setMagnify]=useState(1); const [fingerTip,setFingerTip]=useState<{pitch:string;x:number;y:number}|null>(null); const [theoryTip,setTheoryTip]=useState<{text:string;x:number;y:number}|null>(null); const [favorite,setFavorite]=useState(false);
  function cycleNoteDisplay(){setNoteDisplay(current=>current==="off"?"names":current==="names"?"solfege":"off")}
  function cycleRhythm(){setRhythmMode(current=>current==="off"?"counts":current==="counts"?"bars":"off")}

  const [notes,setNotes]=useState<ScoreNote[]>([]);
  const notesRef=useRef<ScoreNote[]>([]);
  const noteDrag=useRef<{id:string;startX:number;startY:number;origX:number;origY:number}|null>(null);
  useEffect(()=>{notesRef.current=notes},[notes]);
  useEffect(()=>{setNotes(readNotes(id))},[id]);
  function persistNotes(next:ScoreNote[]){setNotes(next);notesRef.current=next;localStorage.setItem(notesStorageKey(id),JSON.stringify(next))}
  function addScoreNote(kind:"text"|"sticky"){const note:ScoreNote={id:crypto.randomUUID(),kind,x:60+notes.length*16,y:60+notes.length*16,text:""};persistNotes([...notes,note])}
  function updateScoreNoteText(noteId:string,text:string){persistNotes(notes.map(n=>n.id===noteId?{...n,text}:n))}
  function removeScoreNote(noteId:string){persistNotes(notes.filter(n=>n.id!==noteId))}
  function noteDown(event:React.PointerEvent<HTMLDivElement>,note:ScoreNote){
    if((event.target as HTMLElement).tagName==="TEXTAREA"||(event.target as HTMLElement).closest("button"))return;
    noteDrag.current={id:note.id,startX:event.clientX,startY:event.clientY,origX:note.x,origY:note.y};
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function noteMove(event:React.PointerEvent<HTMLDivElement>){
    if(!noteDrag.current)return;
    const {id:noteId,startX,startY,origX,origY}=noteDrag.current;
    const dx=(event.clientX-startX)/magnify,dy=(event.clientY-startY)/magnify;
    setNotes(current=>current.map(n=>n.id===noteId?{...n,x:origX+dx,y:origY+dy}:n));
  }
  function noteUp(){
    if(!noteDrag.current)return;
    noteDrag.current=null;
    persistNotes(notesRef.current);
  }

  useEffect(()=>{const saved=JSON.parse(localStorage.getItem("cookie:music-favorites")||"[]") as string[];setFavorite(saved.includes(id));let mounted=true; async function load(){ try { setLoading(true); const {OpenSheetMusicDisplay}=await import("opensheetmusicdisplay"); if(!mounted||!scoreRef.current)return; scoreRef.current.replaceChildren(); const osmd=new OpenSheetMusicDisplay(scoreRef.current,{backend:"svg",autoResize:true,drawTitle:false,drawComposer:false,drawingParameters:"compacttight"}); osmd.setOptions({pageFormat:"Endless",drawMeasureNumbers:true,drawPartNames:false,drawMetronomeMarks:true}); osmd.OnXMLRead = xml=>prepareScore(xml,title); osmd.zoom=zoom; await osmd.load(asset,title); osmd.EngravingRules.MinimumDistanceBetweenSystems=12; osmd.render(); osmdRef.current=osmd; scoreRef.current.querySelectorAll<SVGGElement>(".vf-stavenote").forEach((node,index)=>{node.dataset.event=String(index);node.dataset.measure=String(measureForEvent(index,measureStarts));const pitch=scoreSequence[index];if(pitch)node.dataset.pitch=pitch});placePracticeOverlays(scoreRef.current,scoreEvents,measureStarts);addTheoryTargets(scoreRef.current);setLoading(false); } catch(e){setError(e instanceof Error?e.message:t.scoreViewer.engravingFailed);setLoading(false);} } load(); return()=>{mounted=false};},[]);
  useEffect(()=>{const root=scoreRef.current;if(!root)return;root.dataset.noteDisplay=noteDisplay;root.classList.toggle("show-accidentals",accidentals);root.dataset.rhythm=rhythmMode},[noteDisplay,accidentals,rhythmMode,loading]);
  useEffect(()=>{ if(!osmdRef.current)return; osmdRef.current.zoom=zoom; osmdRef.current.render();window.setTimeout(()=>{if(!scoreRef.current)return;scoreRef.current.querySelectorAll<SVGGElement>(".vf-stavenote").forEach((node,index)=>{node.dataset.event=String(index);node.dataset.measure=String(measureForEvent(index,measureStarts));const pitch=scoreSequence[index];if(pitch)node.dataset.pitch=pitch});placePracticeOverlays(scoreRef.current,scoreEvents,measureStarts);addTheoryTargets(scoreRef.current)},0) },[zoom]);
  useEffect(()=>()=>{if(metroRef.current)window.clearInterval(metroRef.current);playbackTimers.current.forEach(window.clearTimeout);dronesRef.current.forEach(o=>{try{o.stop()}catch{}});audioRef.current?.close()},[]);
  const audio=()=>audioRef.current??(audioRef.current=new AudioContext());
  function scheduleClick(at:number,strong:boolean){const c=audio(),o=c.createOscillator(),g=c.createGain();o.frequency.value=strong?1250:850;g.gain.setValueAtTime(strong ? .11 : .055,at);g.gain.exponentialRampToValueAtTime(.0001,at+.06);o.connect(g).connect(c.destination);o.start(at);o.stop(at+.06);playbackNodes.current.push(o)}
  function click(){scheduleClick(audio().currentTime,accent&&metroBeat.current%4===0);metroBeat.current++}
  function toggleMetro(){if(metro){if(metroRef.current)window.clearInterval(metroRef.current);metroRef.current=null;setMetro(false)}else{metroBeat.current=0;click();metroRef.current=window.setInterval(click,60000/bpm);setMetro(true)}}
  function tapTempo(){const now=performance.now(),recent=[...metroTaps.current.filter(t=>now-t<2500),now].slice(-6);metroTaps.current=recent;if(recent.length<2)return;const intervals=recent.slice(1).map((time,index)=>time-recent[index]).filter(value=>value>=270&&value<=1500).sort((a,b)=>a-b);if(!intervals.length)return;const middle=Math.floor(intervals.length/2),interval=intervals.length%2?intervals[middle]:(intervals[middle-1]+intervals[middle])/2;setBpm(Math.max(40,Math.min(220,Math.round(60000/interval))))}
  function droneFrequency(pitch=dronePitch,octave=droneOctave){const midi=(octave+1)*12+semitones[pitch];return 440*2**((midi-69)/12)}
  function toggleDrone(pitch=dronePitch,octave=droneOctave){const key=`${pitch}${octave}`,existing=dronesRef.current.get(key);if(existing){existing.stop();dronesRef.current.delete(key)}else{const c=audio(),o=c.createOscillator(),g=c.createGain();o.type="triangle";o.frequency.value=droneFrequency(pitch,octave);g.gain.value=.027;o.connect(g).connect(c.destination);o.start();dronesRef.current.set(key,o)}setActiveDrones([...dronesRef.current.keys()]);setPicker(false)}
  function stopAllDrones(){dronesRef.current.forEach(o=>o.stop());dronesRef.current.clear();setActiveDrones([]);setPicker(false)}
  useEffect(()=>{if(picker&&activeDrones.length)stopAllDrones()},[picker]);
  function fluteTone(pitch:string,start:number,duration:number){const match=pitch.match(/^([A-G][♯♭]?)(\d)$/);if(!match)return;const c=audio(),fund=c.createOscillator(),gain=c.createGain(),vibrato=c.createOscillator(),vibGain=c.createGain(),frequency=droneFrequency(match[1],+match[2]);fund.type="sine";fund.frequency.value=frequency;vibrato.frequency.value=5.2;vibGain.gain.value=frequency*.004;vibrato.connect(vibGain);vibGain.connect(fund.frequency);gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.075,start+.035);gain.gain.setValueAtTime(.07,start+Math.max(.05,duration-.07));gain.gain.exponentialRampToValueAtTime(.0001,start+duration);fund.connect(gain).connect(c.destination);fund.start(start);vibrato.start(start);fund.stop(start+duration);vibrato.stop(start+duration);playbackNodes.current.push(fund,vibrato)}
  function stopPlayback(){playbackTimers.current.forEach(window.clearTimeout);playbackTimers.current=[];playbackNodes.current.forEach(o=>{try{o.stop()}catch{}});playbackNodes.current=[];scoreRef.current?.querySelectorAll(".playback-active").forEach(n=>n.classList.remove("playback-active"));setPlaying(false)}
  function togglePlayback(){if(playing){stopPlayback();return}if(metroRef.current)window.clearInterval(metroRef.current);setPlaying(true);let cursor=0;const c=audio(),audioStart=c.currentTime+.08,unit=60000/bpm/4,nodes=scoreRef.current?.querySelectorAll<SVGGElement>(".vf-stavenote")||[],first=measureStarts[startMeasure-1]||0;scoreEvents.slice(first).forEach((event,offset)=>{const index=first+offset,start=cursor;playbackTimers.current.push(window.setTimeout(()=>{nodes.forEach(n=>n.classList.remove("playback-active"));nodes[index]?.classList.add("playback-active")},start+80));if(event.p)fluteTone(event.p,audioStart+start/1000,Math.max(.09,event.d*unit/1000*.88));cursor+=event.d*unit});if(metro){const beatMs=60000/bpm;for(let time=0,beat=0;time<cursor;time+=beatMs,beat++)scheduleClick(audioStart+time/1000,accent&&beat%4===0)}playbackTimers.current.push(window.setTimeout(stopPlayback,cursor+160))}
  function point(e:PointerEvent<HTMLCanvasElement>){const r=e.currentTarget.getBoundingClientRect();return{x:(e.clientX-r.left)*e.currentTarget.width/r.width,y:(e.clientY-r.top)*e.currentTarget.height/r.height}}
  function begin(e:PointerEvent<HTMLCanvasElement>){if(!annotating)return;drawing.current=true;const p=point(e),c=e.currentTarget.getContext("2d");c?.beginPath();c?.moveTo(p.x,p.y);e.currentTarget.setPointerCapture(e.pointerId)}
  function draw(e:PointerEvent<HTMLCanvasElement>){if(!drawing.current||!annotating)return;const p=point(e),c=e.currentTarget.getContext("2d");if(!c)return;c.lineWidth=eraser?28:4;c.lineCap="round";c.globalCompositeOperation=eraser?"destination-out":"source-over";c.strokeStyle=inkColor;c.lineTo(p.x,p.y);c.stroke()}
  function pushHistory(data:string){inkHistory.current=inkHistory.current.slice(0,inkIndex.current+1);inkHistory.current.push(data);inkIndex.current=inkHistory.current.length-1;localStorage.setItem(`cookie:${id}:ink`,data);setHistoryTick(v=>v+1)}
  function saveInk(){drawing.current=false;const data=canvasRef.current?.toDataURL();if(data)pushHistory(data)}
  function showHistory(index:number){const canvas=canvasRef.current;if(!canvas)return;const context=canvas.getContext("2d");context?.clearRect(0,0,1600,2200);const data=inkHistory.current[index];if(data){const image=new Image();image.onload=()=>context?.drawImage(image,0,0);image.src=data}inkIndex.current=index;if(data)localStorage.setItem(`cookie:${id}:ink`,data);else localStorage.removeItem(`cookie:${id}:ink`);setHistoryTick(v=>v+1)}
  function undoInk(){if(inkIndex.current>0)showHistory(inkIndex.current-1)} function redoInk(){if(inkIndex.current<inkHistory.current.length-1)showHistory(inkIndex.current+1)}
  function clearInk(){const canvas=canvasRef.current;canvas?.getContext("2d")?.clearRect(0,0,1600,2200);if(canvas)pushHistory(canvas.toDataURL())}
  useEffect(()=>{const saved=localStorage.getItem(`cookie:${id}:ink`),canvas=canvasRef.current;if(!canvas)return;const blank=canvas.toDataURL();inkHistory.current=[blank];inkIndex.current=0;if(saved){const image=new Image();image.onload=()=>{canvas.getContext("2d")?.drawImage(image,0,0);inkHistory.current.push(saved);inkIndex.current=1;setHistoryTick(v=>v+1)};image.src=saved}},[]);
  function scoreMove(e:React.MouseEvent<HTMLDivElement>){const theory=(e.target as Element).closest<SVGElement>("[data-theory]");setTheoryTip(theory?{text:theory.dataset.theory!,x:e.clientX,y:e.clientY}:null);const node=(e.target as Element).closest<SVGGElement>(".vf-stavenote[data-pitch]");if(!node){setFingerTip(null);return}const pitch=node.dataset.pitch!;if(fingering)setFingerTip({pitch,x:e.clientX,y:e.clientY})}
  function scoreClick(e:React.MouseEvent<HTMLDivElement>){const node=(e.target as Element).closest<SVGGElement>(".vf-stavenote[data-pitch]");if(!node||annotating)return;const match=node.dataset.pitch!.match(/^([A-G][♯♭]?)(\d)$/);if(!match)return;setStartMeasure(Number(node.dataset.measure)||1);setDronePitch(match[1]);setDroneOctave(+match[2]);toggleDrone(match[1],+match[2])}
  function toggleFavorite(){const saved=JSON.parse(localStorage.getItem("cookie:music-favorites")||"[]") as string[],next=saved.includes(id)?saved.filter(item=>item!==id):[...saved,id];localStorage.setItem("cookie:music-favorites",JSON.stringify(next));setFavorite(next.includes(id));window.dispatchEvent(new Event("cookie:favorites-updated"))}
  return <main className="app-shell" style={{"--viewer-magnify":magnify,"--score-composer":`"${composer}"`} as React.CSSProperties}>
    <section className="workspace"><header className="topbar"><div><a className="back" href={backHref} aria-label={t.scoreViewer.back} title={t.scoreViewer.back}>‹</a><strong>{title}</strong></div><div><button className={favorite?"viewer-star active has-tip":"viewer-star has-tip"} data-tip={favorite?t.scoreViewer.removeFromSaved:t.scoreViewer.saveMusic} aria-label={favorite?t.scoreViewer.removeFromSaved:t.scoreViewer.saveMusic} onClick={toggleFavorite}>
      <svg viewBox="0 0 20 20" width="19" height="19" fill={favorite?"currentColor":"none"} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M10 2.8l2.2 4.55 5 .73-3.6 3.53.85 4.99L10 14.2l-4.45 2.4.85-4.99L2.8 8.08l5-.73L10 2.8z"/></svg>
    </button><button className="icon-btn has-tip" data-tip={t.scoreViewer.shareScore} aria-label={t.scoreViewer.shareScore}>↗</button><button className="icon-btn has-tip" data-tip={t.scoreViewer.moreActions} aria-label={t.scoreViewer.moreActions}>•••</button></div></header>
      <div className="practice-bar"><div className="tool-group">
        <button data-tip={t.scoreViewer.noteDisplayTip} className={noteDisplay!=="off"?"tool on has-tip":"tool has-tip"} onClick={cycleNoteDisplay}><span>A♭</span>{noteDisplay==="off"?t.scoreViewer.noteDisplay:noteDisplay==="names"?t.scoreViewer.noteNames:t.scoreViewer.solfege}</button>
        <button data-tip={t.scoreViewer.rhythmDisplay} className={rhythmMode!=="off"?"tool on has-tip":"tool has-tip"} onClick={cycleRhythm}><span>▥</span>{rhythmMode==="off"?t.scoreViewer.rhythm:rhythmMode==="counts"?t.scoreViewer.rhythmCountsShort:t.scoreViewer.rhythmBarsShort}</button>
        <button data-tip={t.scoreViewer.accidentalsTip} className={accidentals?"tool on has-tip":"tool has-tip"} onClick={()=>setAccidentals(!accidentals)}><span>♯</span>{t.scoreViewer.accidentals}</button>
        <button data-tip={t.scoreViewer.tonguingTip} className="tool disabled has-tip" disabled><span>•</span>{t.scoreViewer.tonguing}</button>
        <button data-tip={t.scoreViewer.fingeringTip} className={fingering?"tool on has-tip":"tool has-tip"} onClick={()=>setFingering(!fingering)}><span>●○</span>{t.scoreViewer.fingering}</button>
        <button data-tip={t.scoreViewer.markUpTip} className={annotating?"tool on coral has-tip":"tool has-tip"} onClick={()=>setAnnotating(!annotating)}><span>✎</span>{t.scoreViewer.markUp}</button>
      </div>
        <div className="transport"><button data-tip={t.scoreViewer.playTip(startMeasure)} className={playing?"score-play active has-tip":"score-play has-tip"} onClick={togglePlayback}>{playing?t.scoreViewer.stop:t.scoreViewer.play}</button><div className="tempo"><input aria-label={t.scoreViewer.tempoAria} type="range" min="40" max="220" value={bpm} onChange={e=>setBpm(+e.target.value)}/><span><b>{bpm}</b> {t.scoreViewer.bpm}</span><button className="tap-tempo-btn has-tip" data-tip={t.scoreViewer.tapTempo} aria-label={t.scoreViewer.tapTempo} onClick={tapTempo}>⟳</button></div>
          <button data-tip={t.scoreViewer.metronomeTip} className={metro?"audio-tool active has-tip":"audio-tool has-tip"} onClick={toggleMetro}><span>♩</span>{t.scoreViewer.metronome}</button>
          <div className="transport-menu">
            <button data-tip={t.scoreViewer.droneTip} className={activeDrones.length?"audio-tool active has-tip":"audio-tool has-tip"} onClick={()=>setPicker(o=>!o)}><span>◉</span>{t.scoreViewer.drone} <b>{activeDrones.length?activeDrones.join("+"):t.scoreViewer.droneOff}</b></button>
            {picker&&<>
              <div className="transport-menu-backdrop" onClick={()=>setPicker(false)}/>
              <div className="transport-pop">
                <div className="pitch-grid">{pitchClasses.map(n=><button className={n===dronePitch?"selected":""} key={n} onClick={()=>setDronePitch(n)}>{n}</button>)}</div>
                <label className="octave-row">{t.scoreViewer.octave} <select value={droneOctave} onChange={e=>setDroneOctave(+e.target.value)}>{[3,4,5,6].map(o=><option key={o}>{o}</option>)}</select></label>
                <button className="transport-pop-primary" onClick={()=>toggleDrone(dronePitch,droneOctave)}>{activeDrones.includes(`${dronePitch}${droneOctave}`)?t.scoreViewer.stopWord:t.scoreViewer.start} {dronePitch}{droneOctave}</button>
                {activeDrones.length>0&&<div className="active-drone-list">{activeDrones.map(n=><button key={n} onClick={()=>toggleDrone(n.slice(0,-1),+n.slice(-1))}>{n} ×</button>)}<button onClick={stopAllDrones}>{t.scoreViewer.stopAll}</button></div>}
                <small>{t.scoreViewer.droneHint}</small>
              </div>
            </>}
          </div>
        </div></div>
      {annotating&&<div className="markup-row"><button onClick={undoInk} disabled={inkIndex.current<=0}>{t.scoreViewer.undo}</button><button onClick={redoInk} disabled={inkIndex.current>=inkHistory.current.length-1}>{t.scoreViewer.redo}</button><span className="divider"/>{["#e45d46","#2e6fb0","#3b7a57","#242623"].map(c=><button aria-label={t.scoreViewer.useColor(c)} key={c} className={inkColor===c&&!eraser?"swatch chosen":"swatch"} style={{background:c}} onClick={()=>{setInkColor(c);setEraser(false)}}/>)}<button className={eraser?"eraser chosen":"eraser"} onClick={()=>setEraser(true)}>{t.scoreViewer.eraser}</button><span className="divider"/><button className="has-tip" data-tip={t.scoreViewer.addTextTip} onClick={()=>addScoreNote("text")}>{t.scoreViewer.addText}</button><button className="has-tip" data-tip={t.scoreViewer.addStickyTip} onClick={()=>addScoreNote("sticky")}>{t.scoreViewer.addSticky}</button><button className="clear" onClick={clearInk}>{t.scoreViewer.clearPage}</button><small>{t.scoreViewer.markupSaved}</small><i>{historyTick>=0?"":""}</i></div>}
      <div className="score-scroll"><div className="score-paper engraved"><div className="custom-score-heading"><h1>{title}</h1></div>{loading&&<div className="score-loading">{t.scoreViewer.engraving}</div>}{error&&<div className="score-error">{error}</div>}<div ref={scoreRef} className="osmd-score" onMouseMove={scoreMove} onMouseLeave={()=>{setFingerTip(null);setTheoryTip(null)}} onClick={scoreClick}/><canvas ref={canvasRef} width="1600" height="2200" className={annotating?"ink active":"ink"} onPointerDown={begin} onPointerMove={draw} onPointerUp={saveInk} onPointerCancel={saveInk}/>
        {notes.map(note=><div key={note.id} className={note.kind==="sticky"?"score-note sticky":"score-note text"} style={{left:note.x,top:note.y}} onPointerDown={e=>noteDown(e,note)} onPointerMove={noteMove} onPointerUp={noteUp} onPointerCancel={noteUp}>
          <button type="button" className="score-note__remove" aria-label={t.scoreViewer.deleteNote} onClick={()=>removeScoreNote(note.id)}>×</button>
          <textarea value={note.text} onChange={e=>updateScoreNoteText(note.id,e.target.value)} placeholder={t.scoreViewer.notePlaceholder}/>
        </div>)}
      </div></div>
      <footer className="statusbar"><span className="viewer-zoom-group"><b>{t.scoreViewer.reflow}</b><button onClick={()=>setZoom(Math.max(.55,zoom-.1))}>−</button>{Math.round(zoom*100)}%<button onClick={()=>setZoom(Math.min(1.25,zoom+.1))}>＋</button><b>{t.scoreViewer.magnify}</b><button onClick={()=>setMagnify(Math.max(.75,magnify-.1))}>−</button>{Math.round(magnify*100)}%<button onClick={()=>setMagnify(Math.min(1.5,magnify+.1))}>＋</button></span></footer>
    </section>{theoryTip&&<div className="theory-tip" style={clampTip(theoryTip.x,theoryTip.y,280,150,"below")}><small>{t.scoreViewer.musicTheory}</small><p>{theoryTip.text}</p></div>}{fingerTip&&<div className="flute-tip finger-chart" style={clampTip(fingerTip.x,fingerTip.y,340,255,"above")}><strong>{fingerTip.pitch.replace(/\d/,"")}<sup>{fingerTip.pitch.match(/\d/)?.[0]}</sup></strong><div className="finger-diagram">
        <div className="finger-diagram__group"><span className="finger-diagram__dot-wrap"><i className={fingeringOn(fingerTip.pitch,"T")?"finger-dot pressed":"finger-dot"}/><small>T</small></span></div>
        <span className="finger-diagram__divider"/>
        <div className="finger-diagram__group">{[1,2,3].map(n=><span key={`l${n}`} className="finger-diagram__dot-wrap"><i className={fingeringOn(fingerTip.pitch,`L${n}`)?"finger-dot pressed":"finger-dot"}/><small>{n}</small></span>)}{fingeringOn(fingerTip.pitch,"LP")&&<span className="finger-diagram__dot-wrap"><i className="finger-dot pressed small"/><small>G♯</small></span>}</div>
        <span className="finger-diagram__divider"/>
        <div className="finger-diagram__group">{[1,2,3].map(n=><span key={`r${n}`} className="finger-diagram__dot-wrap"><i className={fingeringOn(fingerTip.pitch,`R${n}`)?"finger-dot pressed":"finger-dot"}/><small>{n}</small></span>)}</div>
        <span className="finger-diagram__divider"/>
        <div className="finger-diagram__group">
          <span className="finger-diagram__dot-wrap"><i className={fingeringOn(fingerTip.pitch,"REb")?"finger-dot pressed small":"finger-dot small"}/><small>E♭</small></span>
          {fingeringOn(fingerTip.pitch,"RCs")?
            <span className="finger-diagram__dot-wrap"><i className="finger-dot pressed"/><small>C♯</small></span>:
            <span className="finger-diagram__dot-wrap"><i className={fingeringOn(fingerTip.pitch,"RC")?"finger-dot pressed":"finger-dot"}/><small>C</small></span>}
        </div>
      </div><small className="finger-diagram__legend">{t.scoreViewer.fingerChartCaption}</small></div>}</main>
}

export default function MysteryOfLovePage(){return <ScoreViewer/>}
