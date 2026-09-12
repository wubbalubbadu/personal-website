"use client";

import { PointerEvent, useEffect, useRef, useState } from "react";
import type { OpenSheetMusicDisplay as OSMDType } from "opensheetmusicdisplay";
import { useLanguage } from "../i18n/LanguageContext";
import { useRecents } from "../lib/storage";
import { deriveScoreEvents, resolveKeyAccidentals } from "./deriveScoreEvents";

const pitchClasses = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const semitones: Record<string, number> = { C:0,"C♯":1,D:2,"E♭":3,E:4,F:5,"F♯":6,G:7,"A♭":8,A:9,"B♭":10,B:11 };

/**
 * pitches/events/measureStarts are optional: omit them and ScoreViewer
 * derives the note sequence itself from the loaded score (see
 * deriveScoreEvents.ts) instead of needing it hand-transcribed. Pass them
 * explicitly only if a piece needs the sequence overridden (e.g. a solo
 * line pulled out of a multi-voice/chord XML the auto-derivation doesn't
 * handle yet).
 */
export type ScoreViewerConfig={title:string;composer:string;asset:string;id:string;backHref:string;backLabel?:string;pdfPath?:string;defaultTempo?:number;pitches?:(string|null)[];events?:{p:string|null;d:number;tied?:boolean}[];measureStarts?:number[];subtitle?:string};
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
function overlay(root:HTMLDivElement,className:string,text:string,x:number,y:number){const item=document.createElement("span");item.className=`practice-overlay ${className}`;item.textContent=text;item.style.left=`${x}px`;item.style.top=`${y}px`;root.appendChild(item);return item}

/**
 * Places a label at `baseY`; if it collides with whatever this same `rows`
 * tracker last placed on that row, drops to a second row a little further
 * down instead of hiding it. A note's own name/solfège should stay visible
 * even in a dense run where two labels can't fit side by side on one
 * line — that's different from a count-marker landing off the beat grid,
 * which has nothing meaningful to show in the first place. If a label
 * collides even on the second row (rare — three-plus notes crowded into
 * the same few pixels), it stays there rather than disappearing.
 */
function placeStackedLabel(root:HTMLDivElement,className:string,text:string,x:number,baseY:number,rowGap:number,rows:[number,number]){
  const label=overlay(root,className,text,x,baseY),box=label.getBoundingClientRect();
  if(box.left>=rows[0]+3){rows[0]=box.right;return}
  label.style.top=`${baseY+rowGap}px`;
  const moved=label.getBoundingClientRect();
  rows[1]=Math.max(rows[1],moved.right);
}
/**
 * unitsPerBeat is how many exact integer `.d` units make one quarter-note
 * beat — 4 for hand-authored pieces (their d values are sixteenth-notes),
 * or whatever deriveScoreEvents sized the piece to (8 for a piece with
 * 32nd notes, 16 for 64ths — see resolveUnitsPerWhole there). Onsets are
 * summed as exact integers, never rounded, so a run of 32nd notes can't
 * drift the beat count the way rounding-to-the-nearest-sixteenth did. A
 * count-marker syllable ("e"/"+"/"a") only exists at the four traditional
 * sixteenth-note grid points within a beat; a note landing anywhere finer
 * than that (a 32nd or 64th off-grid) gets no syllable at all rather than
 * a misleading/duplicate one.
 */
function placePracticeOverlays(root:HTMLDivElement,scoreEvents:{p:string|null;d:number}[],measureStarts:number[],unitsPerBeat:number,keyAccidentals:Set<string>){root.querySelectorAll(".practice-overlay").forEach(n=>n.remove());const rootBox=root.getBoundingClientRect(),all=[...root.querySelectorAll<SVGGElement>(".vf-stavenote[data-event]")],step=unitsPerBeat/4;for(let measure=1;measure<=measureStarts.length;measure++){const group=all.filter(n=>Number(n.dataset.measure)===measure);if(!group.length)continue;const start=measureStarts[measure-1],ancestor=group[0].closest<SVGGElement>(".vf-measure"),measureBox=ancestor?.getBoundingClientRect(),groupBottom=Math.max(...group.map(n=>n.getBoundingClientRect().bottom)),labelLane=(measureBox?.bottom??groupBottom)-rootBox.top+18,countLane=labelLane+32;
// Two notes rendered close together (a fast run, or a note right after a
// dotted/off-grid one that got no syllable of its own) can sit closer than
// a label's own text is wide — labels would print on top of each other.
// Each row (note names, solfège, counts) tracks its own previous surviving
// label's right edge in the same left-to-right walk the notes are already
// in, so a label that would collide just doesn't render, rather than
// overlapping. Note names and solfège share the same lane (only one is
// ever visible at a time — see engraved.css's [data-note-display]) but are
// tracked separately since only one of them being on-screen doesn't mean
// they'd collide at the same x the same way.
const nameRows:[number,number]=[-Infinity,-Infinity],solfegeRows:[number,number]=[-Infinity,-Infinity];let lastCountRight=-Infinity,lastLetter="";
group.forEach(note=>{const index=Number(note.dataset.event),event=scoreEvents[index];
  // A grace note borrows its time from the note it decorates rather than
  // occupying a beat position of its own (deriveScoreEvents gives it
  // d=0, the only events that ever do) — it isn't "on" any beat, so it
  // gets no note-name/solfège/count label at all, rather than a label
  // that duplicates or crowds out the main note right next to it.
  if(event?.d===0)return;
  const box=note.getBoundingClientRect(),x=box.left-rootBox.left+box.width/2;
  if(event?.p){
    const letter=event.p.replace(/\d/,"");
    // Consecutive notes on the exact same pitch repeat the same letter —
    // skip re-printing it (count-markers still show every beat regardless,
    // this is only about pitch identity) so the space goes to notes that
    // actually need it instead of getting crowded out by their own echo.
    if(letter!==lastLetter){
      placeStackedLabel(root,"note-name-marker",letter,x,labelLane,15,nameRows);
      placeStackedLabel(root,"solfege-marker",solfegeNames[letter]??letter,x,labelLane,15,solfegeRows);
      lastLetter=letter;
    }
    if(keyAccidentals.has(letter))overlay(root,"accidental-marker",letter.slice(1),x,box.top-rootBox.top-18);
  }
  let onset=0;for(let i=start;i<index;i++)onset+=scoreEvents[i]?.d??0;
  if(onset%step===0){const label=overlay(root,"count-marker",`${Math.floor(onset/unitsPerBeat)+1}${["","e","+","a"][(onset/step)%4]}`,x,countLane),labelBox=label.getBoundingClientRect();if(labelBox.left<lastCountRight+3)label.remove();else lastCountRight=labelBox.right}
});
// Grace notes are excluded here too (same reasoning) — a duplicate onset
// with a real note right after it, rather than a proper beat position of
// its own, was throwing off the left/right anchor search below.
let onset=0;const anchors:{t:number;x:number}[]=[];group.forEach((node,i)=>{const eventIndex=start+i,d=scoreEvents[eventIndex]?.d??0;if(d>0){const box=node.getBoundingClientRect();anchors.push({t:onset,x:box.left-rootBox.left+box.width/2})}onset+=d});const right=measureBox?measureBox.right-rootBox.left:anchors.at(-1)!.x+34,
// Most measures are exactly 4 beats, but a few in this piece genuinely run
// longer or shorter than their printed 4/4 (confirmed against OSMD's own
// per-measure Duration, not a rounding artifact) — draw ticks for however
// much is actually there instead of assuming a fixed 4.
measureUnits=Math.max(unitsPerBeat*4,onset);anchors.push({t:measureUnits,x:right});const top=(measureBox?.top??Math.min(...group.map(n=>n.getBoundingClientRect().top)))-rootBox.top-7;for(let beat=0;beat*unitsPerBeat<measureUnits;beat++){const target=beat*unitsPerBeat,left=[...anchors].reverse().find(a=>a.t<=target)??anchors[0],next=anchors.find(a=>a.t>=target)??anchors.at(-1)!,ratio=next.t===left.t?0:(target-left.t)/(next.t-left.t);overlay(root,"beat-stick","",left.x+(next.x-left.x)*ratio,top)}}}

/**
 * Sizes the ink canvas's backing store to match the score paper's actual
 * rendered size (not a fixed 1600x2200) times devicePixelRatio, then scales
 * the context so drawing coordinates stay in that logical size regardless
 * of the backing resolution. Fixes annotations looking thick/pixelated: the
 * old fixed backing store was routinely far shorter than a real page of
 * music (a few hundred native px vs. a couple thousand CSS px tall), so the
 * browser was stretching a low-res bitmap to fill the space, and on a
 * retina display that stretch was on top of an already-too-coarse pixel
 * grid. Also restores any saved stroke from localStorage, sized to fit.
 */
function sizeInkCanvas(canvas:HTMLCanvasElement|null,sizeRef:{current:{w:number;h:number}},historyRef:{current:string[]},indexRef:{current:number},id:string,onRestore:()=>void){
  if(!canvas)return;
  const paper=canvas.closest<HTMLElement>(".score-paper"),dpr=window.devicePixelRatio||1;
  const w=Math.max(1,Math.round(paper?.clientWidth||canvas.clientWidth||sizeRef.current.w)),h=Math.max(1,Math.round(paper?.scrollHeight||canvas.clientHeight||sizeRef.current.h));
  sizeRef.current={w,h};
  canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
  canvas.getContext("2d")?.scale(dpr,dpr);
  const saved=localStorage.getItem(`cookie:${id}:ink`),blank=canvas.toDataURL();
  historyRef.current=[blank];indexRef.current=0;
  if(saved){const image=new Image();image.onload=()=>{canvas.getContext("2d")?.drawImage(image,0,0,w,h);historyRef.current.push(saved);indexRef.current=1;onRestore()};image.src=saved}
}
function addTheoryTargets(root:HTMLDivElement){const targets:[[string,string],...[string,string][]]=[[".vf-clef","Treble clef: the curl circles the G line. Flute music is normally written in this clef."],[".vf-keysignature","Key signature: shows which notes are sharped or flatted for the rest of the piece, unless an accidental changes one."],[".vf-timesignature","Time signature: the top number gives beats per measure; the bottom number identifies the beat value."],[".vf-stavetie","Tie: hold the connected notes as one continuous sound. Do not tongue the second note."]];targets.forEach(([selector,text])=>root.querySelectorAll<SVGElement>(selector).forEach(node=>{node.dataset.theory=text;node.classList.add("theory-target")}))}

type ScoreNote={id:string;kind:"text"|"sticky";x:number;y:number;text:string};
function notesStorageKey(id:string){return `cookie:${id}:notes`}
function readNotes(id:string):ScoreNote[]{try{const saved=JSON.parse(localStorage.getItem(notesStorageKey(id))??"[]");return Array.isArray(saved)?saved:[]}catch{return []}}

function prepareScore(xml: string,title:string) {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  document.querySelector("work-title")?.replaceChildren(title);
  document.querySelectorAll('creator[type="composer"]').forEach(node => node.remove());
  return new XMLSerializer().serializeToString(document);
}

export function ScoreViewer({config}:{config:ScoreViewerConfig}) {
  const {t}=useLanguage();
  const {record}=useRecents("music");
  const {title,composer,asset,id,backHref,pdfPath}=config;
  // Names the back button's actual destination (e.g. "‹ Library") instead of
  // a bare arrow sitting next to the piece title, which reads as "back into
  // this piece" when it really navigates away from it. config.backLabel can
  // override; otherwise it's inferred from known destinations.
  const backLabel=config.backLabel??(backHref==="/flute-studio/music"?t.library.title:backHref==="/flute-studio/exercises"?t.exercises.title:undefined);
  // Populated from config if given, otherwise filled in by deriveScoreEvents
  // once the score has loaded (see the load effect below).
  // unitsPerBeat: how many `.d` units make one quarter-note beat. Hand-
  // authored configs (pitches/events passed in directly) are always written
  // against the legacy 4-units-per-beat grid; deriveScoreEvents works out
  // whatever grid the piece actually needs (see resolveUnitsPerWhole) and
  // overwrites this once the score loads.
  const sequenceRef=useRef<{pitches:(string|null)[];events:{p:string|null;d:number;tied?:boolean}[];measureStarts:number[];unitsPerBeat:number;keyAccidentals:Set<string>}>({pitches:config.pitches??[],events:config.events??[],measureStarts:config.measureStarts??[],unitsPerBeat:4,keyAccidentals:new Set()});
  const scoreRef = useRef<HTMLDivElement>(null); const canvasRef = useRef<HTMLCanvasElement>(null); const osmdRef = useRef<OSMDType | null>(null);
  const audioRef = useRef<AudioContext | null>(null); const dronesRef = useRef(new Map<string,OscillatorNode>()); const playbackTimers=useRef<number[]>([]); const playbackNodes=useRef<OscillatorNode[]>([]); const metroRef = useRef<number | null>(null); const metroBeat=useRef(0); const metroTaps=useRef<number[]>([]); const drawing = useRef(false); const inkHistory=useRef<string[]>([]); const inkIndex=useRef(-1);
  // Logical (CSS-pixel) size of the ink canvas's drawing surface — set once
  // the score has rendered, from the paper's actual size, not a fixed
  // constant. The canvas's real backing-store resolution is this times
  // devicePixelRatio (see the load effect), so strokes stay crisp on
  // retina displays instead of a fixed-resolution bitmap getting stretched
  // to fit whatever size the paper turns out to be.
  const inkSizeRef = useRef({ w: 1600, h: 2200 });
  const [loading,setLoading]=useState(true); const [error,setError]=useState(""); const [bpm,setBpm]=useState(config.defaultTempo??76); const [startMeasure,setStartMeasure]=useState(1); const [playing,setPlaying]=useState(false); const [metro,setMetro]=useState(false); const [accent]=useState(true); const [activeDrones,setActiveDrones]=useState<string[]>([]); const [dronePitch,setDronePitch]=useState("G"); const [droneOctave,setDroneOctave]=useState(4); const [picker,setPicker]=useState(false); const [annotating,setAnnotating]=useState(false); const [inkColor,setInkColor]=useState("#e45d46"); const [eraser,setEraser]=useState(false);
  // Whether the pencil/eraser is the selected tool right now — separate
  // from `annotating` (mark-up mode being on at all). Without this, the
  // canvas captured every pointer event the whole time mark-up was open:
  // typing into a text box and then clicking away to deselect it landed
  // that click on the canvas too and left a stray dot. A dedicated pencil
  // tool (below) is the only thing that turns this back on; placing a
  // text/sticky note turns it off, since what the user wants right after
  // placing one is to interact with it, not keep drawing.
  const [inkActive,setInkActive]=useState(true); const [historyTick,setHistoryTick]=useState(0); const [noteDisplay,setNoteDisplay]=useState<NoteDisplay>("off"); const [accidentals,setAccidentals]=useState(false); const [tonguing,setTonguing]=useState(false); const [fingering,setFingering]=useState(false); const [rhythmMode,setRhythmMode]=useState<RhythmMode>("off"); const [zoom,setZoom]=useState(.8); const [magnify,setMagnify]=useState(1); const [fingerTip,setFingerTip]=useState<{pitch:string;x:number;y:number}|null>(null); const [theoryTip,setTheoryTip]=useState<{text:string;x:number;y:number}|null>(null); const [favorite,setFavorite]=useState(false);
  function cycleNoteDisplay(){setNoteDisplay(current=>current==="off"?"names":current==="names"?"solfege":"off")}
  function cycleRhythm(){setRhythmMode(current=>current==="off"?"counts":current==="counts"?"bars":"off")}

  const [notes,setNotes]=useState<ScoreNote[]>([]);
  const notesRef=useRef<ScoreNote[]>([]);
  const noteDrag=useRef<{id:string;startX:number;startY:number;origX:number;origY:number}|null>(null);
  useEffect(()=>{notesRef.current=notes},[notes]);
  useEffect(()=>{setNotes(readNotes(id))},[id]);
  useEffect(()=>{record(id)},[id,record]);
  function persistNotes(next:ScoreNote[]){setNotes(next);notesRef.current=next;localStorage.setItem(notesStorageKey(id),JSON.stringify(next))}
  function addScoreNote(kind:"text"|"sticky"){const note:ScoreNote={id:crypto.randomUUID(),kind,x:60+notes.length*16,y:60+notes.length*16,text:""};persistNotes([...notes,note]);setInkActive(false)}
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

  // Re-tags every rendered note with its event index/measure/pitch (OSMD
  // gives us fresh DOM nodes with none of that whenever it re-renders) and
  // rebuilds the note-name/count/beat-stick overlays against their current
  // positions. Must be re-run any time OSMD redraws for any reason — a
  // fresh load, a zoom change, or (see the ResizeObserver effect below) its
  // own autoResize reflow — or the overlays silently go stale/empty.
  function syncNotesAndOverlays(){
    const root=scoreRef.current;
    if(!root)return;
    const seq=sequenceRef.current;
    root.querySelectorAll<SVGGElement>(".vf-stavenote").forEach((node,index)=>{node.dataset.event=String(index);node.dataset.measure=String(measureForEvent(index,seq.measureStarts));const pitch=seq.pitches[index];if(pitch)node.dataset.pitch=pitch});
    placePracticeOverlays(root,seq.events,seq.measureStarts,seq.unitsPerBeat,seq.keyAccidentals??new Set());
    addTheoryTargets(root);
  }

  useEffect(()=>{const saved=JSON.parse(localStorage.getItem("cookie:music-favorites")||"[]") as string[];setFavorite(saved.includes(id));let mounted=true; async function load(){ try { setLoading(true); const {OpenSheetMusicDisplay}=await import("opensheetmusicdisplay"); if(!mounted||!scoreRef.current)return; scoreRef.current.replaceChildren(); const osmd=new OpenSheetMusicDisplay(scoreRef.current,{backend:"svg",autoResize:true,drawTitle:false,drawComposer:false,drawingParameters:"compacttight"}); osmd.setOptions({pageFormat:"Endless",drawMeasureNumbers:true,drawPartNames:false,drawMetronomeMarks:true}); osmd.OnXMLRead = xml=>prepareScore(xml,title); osmd.zoom=zoom; await osmd.load(asset,title); if(!mounted||!scoreRef.current)return;
      // React's Strict Mode runs this whole effect twice in dev (mount,
      // cleanup, mount again) to surface exactly this kind of bug: without
      // re-checking `mounted` after every await, a stale first run and the
      // real second run were both landing in the same container — each one
      // individually correct, but their note-tagging/overlay calls
      // interleaving mid-flight, which is what produced measures with
      // extra/misplaced beat-sticks (right on first load, never on a later
      // resize, since by then only one run was ever still in flight).
      osmd.EngravingRules.MinimumDistanceBetweenSystems=12; osmd.render(); osmdRef.current=osmd; sizeInkCanvas(canvasRef.current,inkSizeRef,inkHistory,inkIndex,id,()=>setHistoryTick(v=>v+1)); if(!config.pitches)sequenceRef.current=deriveScoreEvents(osmd);
      // Independent of whether the note sequence itself is auto-derived or
      // hand-authored — the key signature always comes straight from OSMD,
      // so even Mystery of Love (predates deriveScoreEvents, passes its
      // pitches/events by hand) gets this right rather than losing it.
      sequenceRef.current.keyAccidentals=resolveKeyAccidentals(osmd);
      // A tick of delay before the first sync, same as the zoom effect below
      // already does — osmd.render() returning doesn't guarantee the SVG's
      // layout is fully settled yet, and measuring note positions one frame
      // too early is exactly what produced extra/misplaced beat-sticks on
      // first load (measures' note x-coordinates would shift slightly after
      // this point, but nothing re-measured them).
      window.setTimeout(()=>{if(!mounted)return;syncNotesAndOverlays();setLoading(false)},0);
      } catch(e){setError(e instanceof Error?e.message:t.scoreViewer.engravingFailed);setLoading(false);} } load(); return()=>{mounted=false};},[]);
  useEffect(()=>{const root=scoreRef.current;if(!root)return;root.dataset.noteDisplay=noteDisplay;root.classList.toggle("show-accidentals",accidentals);root.dataset.rhythm=rhythmMode},[noteDisplay,accidentals,rhythmMode,loading]);
  useEffect(()=>{ if(!osmdRef.current)return; osmdRef.current.zoom=zoom; osmdRef.current.render();window.setTimeout(syncNotesAndOverlays,0) },[zoom]);

  // OSMD's autoResize option makes it silently rebuild its own SVG (fresh
  // DOM nodes, none of our data-event/data-measure/data-pitch tags) any
  // time its container's size changes — switching between a split and full
  // window, resizing the panel, anything. Nothing was watching for that,
  // so the note tagging and every overlay (note names, rhythm counts,
  // beat-sticks) would go stale or vanish outright after any resize.
  // Re-run the same sync OSMD's own resize settles — debounced, since a
  // drag-resize fires this repeatedly, and delayed a beat because OSMD's
  // reflow runs off the same signal and needs to finish first.
  // ResizeObserver always fires once immediately on observe(), reporting
  // the element's current size as if it were a change — it isn't one. And
  // OSMD's own initial layout can shift slightly as it finishes settling
  // (its layout engine does a couple of passes). Neither is a real resize,
  // but left unguarded both were counted as one, so the very first load
  // was getting a second (sometimes third) full re-sync a moment after the
  // first — each individually correct, but landing on top of each other's
  // note tagging and overlays without either being a genuine "the user
  // resized" event to justify starting over. That's what was producing
  // extra/duplicate beat-sticks on specific measures on first load, with
  // no resize involved at all. Ignore everything in the first second.
  useEffect(()=>{
    const root=scoreRef.current;
    if(!root)return;
    const mountedAt=performance.now();
    let timer=0,lastWidth=-1;
    const observer=new ResizeObserver(entries=>{
      const width=entries[0]?.contentRect.width??root.clientWidth;
      if(performance.now()-mountedAt<1000){lastWidth=width;return}
      if(Math.abs(width-lastWidth)<1)return;
      lastWidth=width;
      window.clearTimeout(timer);
      timer=window.setTimeout(()=>{if(osmdRef.current)syncNotesAndOverlays()},150);
    });
    observer.observe(root);
    return()=>{window.clearTimeout(timer);observer.disconnect()};
  },[]);
  useEffect(()=>()=>{if(metroRef.current)window.clearInterval(metroRef.current);playbackTimers.current.forEach(window.clearTimeout);dronesRef.current.forEach(o=>{try{o.stop()}catch{}});if(audioRef.current&&audioRef.current.state!=="closed")audioRef.current.close().catch(()=>{})},[]);
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
  function togglePlayback(){if(playing){stopPlayback();return}if(metroRef.current)window.clearInterval(metroRef.current);setPlaying(true);let cursor=0;const c=audio(),audioStart=c.currentTime+.08,seq=sequenceRef.current,unit=60000/bpm/seq.unitsPerBeat,nodes=scoreRef.current?.querySelectorAll<SVGGElement>(".vf-stavenote")||[],first=seq.measureStarts[startMeasure-1]||0,slice=seq.events.slice(first);
    // A tie is two written notes, not one — the second is still its own
    // event here (still gets its own beat position and highlight), but it
    // isn't a fresh sound, it's the first note continuing. Summing each
    // tie chain's total length once, backwards, means the chain's first
    // note gets fluteTone'd for the whole combined duration and every
    // note after it in the chain is skipped rather than re-attacking.
    const soundUnits:number[]=new Array(slice.length);for(let i=slice.length-1;i>=0;i--)soundUnits[i]=slice[i].d+(i+1<slice.length&&slice[i+1].tied?soundUnits[i+1]:0);
    slice.forEach((event,offset)=>{const index=first+offset,start=cursor;playbackTimers.current.push(window.setTimeout(()=>{nodes.forEach(n=>n.classList.remove("playback-active"));nodes[index]?.classList.add("playback-active")},start+80));if(event.p&&!event.tied)fluteTone(event.p,audioStart+start/1000,Math.max(.09,soundUnits[offset]*unit/1000*.88));cursor+=event.d*unit});if(metro){const beatMs=60000/bpm;for(let time=0,beat=0;time<cursor;time+=beatMs,beat++)scheduleClick(audioStart+time/1000,accent&&beat%4===0)}playbackTimers.current.push(window.setTimeout(stopPlayback,cursor+160))}
  function point(e:PointerEvent<HTMLCanvasElement>){const r=e.currentTarget.getBoundingClientRect(),{w,h}=inkSizeRef.current;return{x:(e.clientX-r.left)*w/r.width,y:(e.clientY-r.top)*h/r.height}}
  function begin(e:PointerEvent<HTMLCanvasElement>){if(!annotating||!inkActive)return;drawing.current=true;const p=point(e),c=e.currentTarget.getContext("2d");c?.beginPath();c?.moveTo(p.x,p.y);e.currentTarget.setPointerCapture(e.pointerId)}
  function draw(e:PointerEvent<HTMLCanvasElement>){if(!drawing.current||!annotating)return;const p=point(e),c=e.currentTarget.getContext("2d");if(!c)return;c.lineWidth=eraser?28:4;c.lineCap="round";c.lineJoin="round";c.globalCompositeOperation=eraser?"destination-out":"source-over";c.strokeStyle=inkColor;c.lineTo(p.x,p.y);c.stroke()}
  function pushHistory(data:string){inkHistory.current=inkHistory.current.slice(0,inkIndex.current+1);inkHistory.current.push(data);inkIndex.current=inkHistory.current.length-1;localStorage.setItem(`cookie:${id}:ink`,data);setHistoryTick(v=>v+1)}
  function saveInk(){drawing.current=false;const data=canvasRef.current?.toDataURL();if(data)pushHistory(data)}
  function showHistory(index:number){const canvas=canvasRef.current;if(!canvas)return;const context=canvas.getContext("2d"),{w,h}=inkSizeRef.current;context?.clearRect(0,0,w,h);const data=inkHistory.current[index];if(data){const image=new Image();image.onload=()=>context?.drawImage(image,0,0,w,h);image.src=data}inkIndex.current=index;if(data)localStorage.setItem(`cookie:${id}:ink`,data);else localStorage.removeItem(`cookie:${id}:ink`);setHistoryTick(v=>v+1)}
  function undoInk(){if(inkIndex.current>0)showHistory(inkIndex.current-1)} function redoInk(){if(inkIndex.current<inkHistory.current.length-1)showHistory(inkIndex.current+1)}
  function clearInk(){const canvas=canvasRef.current,{w,h}=inkSizeRef.current;canvas?.getContext("2d")?.clearRect(0,0,w,h);if(canvas)pushHistory(canvas.toDataURL())}
  function scoreMove(e:React.MouseEvent<HTMLDivElement>){const theory=(e.target as Element).closest<SVGElement>("[data-theory]");setTheoryTip(theory?{text:theory.dataset.theory!,x:e.clientX,y:e.clientY}:null);const node=(e.target as Element).closest<SVGGElement>(".vf-stavenote[data-pitch]");if(!node){setFingerTip(null);return}const pitch=node.dataset.pitch!;if(fingering)setFingerTip({pitch,x:e.clientX,y:e.clientY})}
  function scoreClick(e:React.MouseEvent<HTMLDivElement>){const node=(e.target as Element).closest<SVGGElement>(".vf-stavenote[data-pitch]");if(!node||annotating)return;const match=node.dataset.pitch!.match(/^([A-G][♯♭]?)(\d)$/);if(!match)return;setStartMeasure(Number(node.dataset.measure)||1);setDronePitch(match[1]);setDroneOctave(+match[2]);toggleDrone(match[1],+match[2])}
  function toggleFavorite(){const saved=JSON.parse(localStorage.getItem("cookie:music-favorites")||"[]") as string[],next=saved.includes(id)?saved.filter(item=>item!==id):[...saved,id];localStorage.setItem("cookie:music-favorites",JSON.stringify(next));setFavorite(next.includes(id));window.dispatchEvent(new Event("cookie:favorites-updated"))}
  return <main className="app-shell" style={{"--viewer-magnify":magnify,"--score-composer":`"${composer}"`} as React.CSSProperties}>
    <section className="workspace"><header className="topbar"><div><a className="back" href={backHref} aria-label={backLabel?`${t.scoreViewer.back}: ${backLabel}`:t.scoreViewer.back} title={backLabel||t.scoreViewer.back}><span className="back-arrow" aria-hidden="true">‹</span>{backLabel&&<span className="back-label">{backLabel}</span>}</a><strong>{title}</strong></div><div><button className={favorite?"viewer-star active has-tip":"viewer-star has-tip"} data-tip={favorite?t.scoreViewer.removeFromSaved:t.scoreViewer.saveMusic} aria-label={favorite?t.scoreViewer.removeFromSaved:t.scoreViewer.saveMusic} onClick={toggleFavorite}>
      <svg viewBox="0 0 20 20" width="19" height="19" fill={favorite?"currentColor":"none"} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M10 2.8l2.2 4.55 5 .73-3.6 3.53.85 4.99L10 14.2l-4.45 2.4.85-4.99L2.8 8.08l5-.73L10 2.8z"/></svg>
    </button>{pdfPath&&<a className="icon-btn has-tip" href={pdfPath} download data-tip={t.scoreViewer.downloadPdf} aria-label={t.scoreViewer.downloadPdf}>↓</a>}<button className="icon-btn has-tip" data-tip={t.scoreViewer.shareScore} aria-label={t.scoreViewer.shareScore}>↗</button><button className="icon-btn has-tip" data-tip={t.scoreViewer.moreActions} aria-label={t.scoreViewer.moreActions}>•••</button></div></header>
      <div className="practice-bar"><div className="tool-group">
        <button data-tip={t.scoreViewer.noteDisplayTip} className={noteDisplay!=="off"?"tool on has-tip":"tool has-tip"} onClick={cycleNoteDisplay}><span>A♭</span>{noteDisplay==="off"?t.scoreViewer.noteDisplay:noteDisplay==="names"?t.scoreViewer.noteNames:t.scoreViewer.solfege}</button>
        <button data-tip={t.scoreViewer.rhythmDisplay} className={rhythmMode!=="off"?"tool on has-tip":"tool has-tip"} onClick={cycleRhythm}><span>▥</span>{rhythmMode==="off"?t.scoreViewer.rhythm:rhythmMode==="counts"?t.scoreViewer.rhythmCountsShort:t.scoreViewer.rhythmBarsShort}</button>
        <button data-tip={t.scoreViewer.accidentalsTip} className={accidentals?"tool on has-tip":"tool has-tip"} onClick={()=>setAccidentals(!accidentals)}><span>♯</span>{t.scoreViewer.accidentals}</button>
        <button data-tip={t.scoreViewer.tonguingTip} className="tool disabled has-tip" disabled><span>•</span>{t.scoreViewer.tonguing}</button>
        <button data-tip={t.scoreViewer.fingeringTip} className={fingering?"tool on has-tip":"tool has-tip"} onClick={()=>setFingering(!fingering)}><span>●○</span>{t.scoreViewer.fingering}</button>
        <button data-tip={t.scoreViewer.markUpTip} className={annotating?"tool on coral has-tip":"tool has-tip"} onClick={()=>{const next=!annotating;setAnnotating(next);if(next)setInkActive(true)}}><span>✎</span>{t.scoreViewer.markUp}</button>
      </div>
        <div className="transport"><button data-tip={t.scoreViewer.playTip(startMeasure)} className={playing?"score-play active has-tip":"score-play has-tip"} onClick={togglePlayback}>{playing?t.scoreViewer.stop:t.scoreViewer.play}</button><div className="tempo"><input aria-label={t.scoreViewer.tempoAria} type="range" min="40" max="220" value={bpm} onChange={e=>setBpm(+e.target.value)}/><span><b>{bpm}</b> {t.scoreViewer.bpm}</span><button className="tap-tempo-btn has-tip" data-tip={t.scoreViewer.tapTempo} aria-label={t.scoreViewer.tapTempo} onClick={tapTempo}><svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="10" cy="10" r="2.4" fill="currentColor" stroke="none"/><circle cx="10" cy="10" r="6.5" opacity=".45"/></svg></button></div>
          <button data-tip={t.scoreViewer.metronomeTip} className={metro?"audio-tool active has-tip":"audio-tool has-tip"} onClick={toggleMetro}><span>♩</span>{t.scoreViewer.metronome}</button>
          <div className="transport-menu">
            <button data-tip={t.scoreViewer.droneTip} className={activeDrones.length?"audio-tool active has-tip":"audio-tool has-tip"} onClick={()=>setPicker(o=>!o)}><span>◉</span>{t.scoreViewer.drone}<small>{activeDrones.length?activeDrones.join("+"):t.scoreViewer.droneOff}</small></button>
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
      {annotating&&<div className="markup-row">
        <button className={inkActive&&!eraser?"markup-icon chosen has-tip":"markup-icon has-tip"} data-tip={t.scoreViewer.pencil} aria-label={t.scoreViewer.pencil} onClick={()=>{setInkActive(true);setEraser(false)}}><svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M13.5 4.5l2 2L6.5 15.5l-3 1 1-3L13.5 4.5z"/><path d="M12 6l2 2"/></svg></button>
        <button className={eraser?"markup-icon chosen has-tip":"markup-icon has-tip"} data-tip={t.scoreViewer.eraser} aria-label={t.scoreViewer.eraser} onClick={()=>{setInkActive(true);setEraser(true)}}><svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 15.5L3.8 12.8a1.6 1.6 0 010-2.26l5.7-5.7a1.6 1.6 0 012.26 0l3.66 3.66a1.6 1.6 0 010 2.26l-5.7 5.7a1.6 1.6 0 01-2.26 0z"/><path d="M9.3 7.1l3.6 3.6"/><path d="M3.5 15.5h7.5"/></svg></button>
        <button className="markup-icon has-tip" data-tip={t.scoreViewer.addText} aria-label={t.scoreViewer.addText} onClick={()=>addScoreNote("text")}>T</button>
        <button className="markup-icon has-tip" data-tip={t.scoreViewer.addSticky} aria-label={t.scoreViewer.addSticky} onClick={()=>addScoreNote("sticky")}><i className="sticky-swatch"/></button>
        <span className="divider"/>
        {["#e45d46","#2e6fb0","#3b7a57","#242623"].map(c=><button aria-label={t.scoreViewer.useColor(c)} key={c} className={inkColor===c&&!eraser?"swatch chosen":"swatch"} style={{background:c}} onClick={()=>{setInkColor(c);setEraser(false);setInkActive(true)}}/>)}
        <span className="divider"/>
        <button className="markup-icon has-tip" data-tip={t.scoreViewer.undo} aria-label={t.scoreViewer.undo} onClick={undoInk} disabled={inkIndex.current<=0}>↩</button>
        <button className="markup-icon has-tip" data-tip={t.scoreViewer.redo} aria-label={t.scoreViewer.redo} onClick={redoInk} disabled={inkIndex.current>=inkHistory.current.length-1}>↪</button>
        <button className="markup-icon has-tip" data-tip={t.scoreViewer.clearPage} aria-label={t.scoreViewer.clearPage} onClick={clearInk}><svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h12M8 6V4.5a1 1 0 011-1h2a1 1 0 011 1V6M6 6l.6 10.2a1 1 0 001 .8h4.8a1 1 0 001-.8L14 6"/><path d="M8.5 9v5M11.5 9v5"/></svg></button>
      </div>}
      <div className="score-scroll"><div className="score-paper engraved"><div className="custom-score-heading"><h1>{title}</h1></div>{loading&&<div className="score-loading">{t.scoreViewer.engraving}</div>}{error&&<div className="score-error">{error}</div>}<div ref={scoreRef} className="osmd-score" onMouseMove={scoreMove} onMouseLeave={()=>{setFingerTip(null);setTheoryTip(null)}} onClick={scoreClick}/><canvas ref={canvasRef} width="1600" height="2200" className={annotating&&inkActive?"ink active":"ink"} onPointerDown={begin} onPointerMove={draw} onPointerUp={saveInk} onPointerCancel={saveInk}/>
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
