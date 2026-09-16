"use client";
import {ReaderPopover} from "./ReaderPopover";

import { PointerEvent, useEffect, useRef, useState } from "react";
import type { MusicSheetCalculator, OpenSheetMusicDisplay as OSMDType } from "opensheetmusicdisplay";
import { useLanguage } from "../i18n/LanguageContext";
import { useRecents } from "../lib/storage";
import { deriveScoreEvents, resolveKeyAccidentals } from "./deriveScoreEvents";
import {usePracticeAudio,pitchFrequency} from "../PracticeAudio";
import {PracticeIcon} from "./PracticeIcon";
import {FluteDiagramMini} from "./FluteDiagram";
import {fingeringsForMidi, midiForPitch} from "../../../content/fingerings/flute";
import {SaveButton} from "./SaveButton";
import {notationScale,pageOffsets,pageAt} from "./readerLayout";
import "../reader-workspace.css";
import type { ArticulationMode } from "./notePatterns";



/**
 * pitches/events/measureStarts are optional: omit them and ScoreViewer
 * derives the note sequence itself from the loaded score (see
 * deriveScoreEvents.ts) instead of needing it hand-transcribed. Pass them
 * explicitly only if a piece needs the sequence overridden (e.g. a solo
 * line pulled out of a multi-voice/chord XML the auto-derivation doesn't
 * handle yet).
 */
export type ScoreViewerConfig={title:string;composer:string;asset:string;id:string;backHref:string;backLabel?:string;pdfPath?:string;defaultTempo?:number;pitches?:(string|null)[];events?:{p:string|null;d:number;tied?:boolean;articulation?:ArticulationMode;slurContinuation?:boolean}[];measureStarts?:number[];subtitle?:string;displayPitches?:(string|null)[];measureKeyAccidentals?:string[][];syllables?:(string|null)[]};
/**
 * Fingerings come from content/fingerings/flute.ts, the same data the
 * fingering chart and the practice dock read. The two tables that used to
 * live here had real errors — D missing its E♭ lever, E♭ given G's
 * fingering, four "third octave" entries that were copies of first-octave
 * ones — which is what happens when one screen keeps its own copy.
 */
const solfegeNames:Record<string,string>={"C♭":"Ti",C:"Do","C♯":"Di","D♭":"Ra",D:"Re","D♯":"Ri","E♭":"Me",E:"Mi","E♯":"Fa","F♭":"Mi",F:"Fa","F♯":"Fi","G♭":"Se",G:"Sol","G♯":"Si","A♭":"Le",A:"La","A♯":"Li","B♭":"Te",B:"Ti","B♯":"Do"};
type RhythmMode = "off"|"counts"|"bars";
type NoteDisplay = "off"|"names"|"solfege";
/**
 * Splits each exercise across systems evenly, measured in NOTES.
 *
 * Every exercise starts with <print new-system="yes"/>. Balancing by
 * measure count does not work here: a measure of eight sixteenths and the
 * measure holding a single whole note both count as one, so an "even"
 * three-and-three split still leaves a line with five notes in it to be
 * justified across the full page. What a line can actually hold is a
 * number of notes, so that is the unit used for both the capacity and the
 * split.
 */
function balanceSystemBreaks(xml:string,noteCapacity:number){
  const marker='<print new-system="yes"/>';
  if(noteCapacity<1||!xml.includes(marker))return xml;
  const chunks=xml.split(/(?=<measure )/);
  const blocks:number[][]=[];
  chunks.forEach((chunk,index)=>{
    if(!chunk.startsWith("<measure "))return;
    if(chunk.includes(marker)||!blocks.length)blocks.push([index]);
    else blocks[blocks.length-1].push(index);
  });
  for(const block of blocks){
    const counts=block.map(index=>(chunks[index].match(/<note/g)||[]).length);
    const total=counts.reduce((sum,count)=>sum+count,0);
    if(total<=noteCapacity)continue;
    const cumulative:number[]=[];
    counts.reduce((running,count)=>{cumulative.push(running+count);return running+count},0);
    const cut=(lines:number)=>{
      const positions:number[]=[];
      for(let line=1;line<lines;line++){
        const goal=(total*line)/lines;
        let best=line,bestDistance=Infinity;
        for(let position=line;position<=block.length-(lines-line);position++){
          const distance=Math.abs(cumulative[position-1]-goal);
          if(distance<bestDistance){bestDistance=distance;best=position}
        }
        positions.push(best);
      }
      return positions;
    };
    // Start from the fewest lines that could hold it and add one whenever
    // the best split still overfills a line.
    let lines=Math.ceil(total/noteCapacity),positions=cut(lines);
    while(lines<block.length){
      const bounds=[0,...positions,block.length];
      const overfull=bounds.slice(1).some((end,index)=>{
        const from=bounds[index];
        return cumulative[end-1]-(from?cumulative[from-1]:0)>noteCapacity;
      });
      if(!overfull)break;
      positions=cut(++lines);
    }
    for(const position of positions){
      const index=block[position];
      if(!chunks[index].includes(marker))chunks[index]=chunks[index].replace(/(<measure[^>]*>)/,`$1${marker}`);
    }
  }
  return chunks.join("");
}
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
/**
 * Label widths come from a canvas, not from the DOM. The old code appended
 * each label and then read its getBoundingClientRect to decide whether it
 * collided with the previous one — a forced synchronous layout per label,
 * thousands of them per engrave, which is what made a big scale book take
 * seconds to appear. Canvas text metrics need no layout at all.
 */
const labelWidth=(()=>{
  // The measuring canvas is created on first use, not at module load: this
  // module is evaluated during server rendering too, where `document` does
  // not exist, and a top-level createElement there throws before the page
  // ever reaches the browser.
  let context:CanvasRenderingContext2D|null|undefined;
  const cache=new Map<string,number>();
  return (text:string,font:string)=>{
    if(context===undefined)context=typeof document==="undefined"?null:document.createElement("canvas").getContext("2d");
    const key=`${font}|${text}`;
    let width=cache.get(key);
    if(width===undefined){if(context)context.font=font;width=context?context.measureText(text).width:text.length*8;cache.set(key,width)}
    return width;
  };
})();
export type OverlayVisibility={names:boolean;solfege:boolean;accidentals:boolean;tonguing:boolean;counts:boolean;sticks:boolean};
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
function placeStackedLabel(root:HTMLDivElement,className:string,text:string,x:number,baseY:number,rowGap:number,rows:[number,number],font:string){
  // x is the label's centre and CSS translateX(-50%) centres it there, so
  // its edges are known from the text width alone.
  const half=labelWidth(text,font)/2,left=x-half,right=x+half;
  if(left>=rows[0]+3){overlay(root,className,text,x,baseY);rows[0]=right;return}
  overlay(root,className,text,x,baseY+rowGap);
  rows[1]=Math.max(rows[1],right);
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
function placePracticeOverlays(root:HTMLDivElement,scoreEvents:{p:string|null;d:number}[],measureStarts:number[],unitsPerBeat:number,keyAccidentals:Set<string>,displayPitches?:(string|null)[],measureKeys?:string[][],unmetered=false,syllables?:(string|null)[],visible:OverlayVisibility={names:true,solfege:true,accidentals:true,tonguing:true,counts:true,sticks:true}){root.querySelectorAll(".practice-overlay").forEach(n=>n.remove());
const all=[...root.querySelectorAll<SVGGElement>(".vf-stavenote[data-event]")],step=unitsPerBeat/4;
// EVERY layout read happens here, before a single node is appended. Mixing
// reads and writes forces the browser to re-lay-out the whole score on each
// read; in a book of a few thousand notes that alone was seconds of work.
const rootBox=root.getBoundingClientRect();
const noteBox=new Map<Element,DOMRect>(),headBox=new Map<Element,DOMRect>(),byMeasure=new Map<number,SVGGElement[]>();
for(const note of all){
  noteBox.set(note,note.getBoundingClientRect());
  if(visible.accidentals){const head=note.querySelector(".vf-notehead");if(head)headBox.set(note,head.getBoundingClientRect())}
  // Bucket by measure once: the old code re-filtered all notes for every
  // measure, which is quadratic in the size of the book.
  const index=Number(note.dataset.measure);
  const bucket=byMeasure.get(index);
  if(bucket)bucket.push(note);else byMeasure.set(index,[note]);
}
const measureBoxes=new Map<Element,DOMRect>();
for(const node of root.querySelectorAll<SVGGElement>(".vf-measure"))measureBoxes.set(node,node.getBoundingClientRect());
for(let measure=1;measure<=measureStarts.length;measure++){const group=byMeasure.get(measure);if(!group?.length)continue;const start=measureStarts[measure-1],ancestor=group[0].closest<SVGGElement>(".vf-measure"),measureBox=ancestor?measureBoxes.get(ancestor):undefined,groupBottom=Math.max(...group.map(n=>noteBox.get(n)!.bottom)),labelLane=(measureBox?.bottom??groupBottom)-rootBox.top+18,countLane=labelLane+32;
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
  const box=noteBox.get(note)!,x=box.left-rootBox.left+box.width/2;
  if(event?.p){
    const letter=(displayPitches?.[index]??event.p).replace(/\d/,"");
    // Consecutive notes on the exact same pitch repeat the same letter —
    // skip re-printing it (count-markers still show every beat regardless,
    // this is only about pitch identity) so the space goes to notes that
    // actually need it instead of getting crowded out by their own echo.
    if(letter!==lastLetter){
      // Only the row that is actually on screen gets built — the other was
      // thousands of hidden nodes created and laid out for nothing.
      if(visible.names)placeStackedLabel(root,"note-name-marker",letter,x,labelLane,15,nameRows,"700 16px Arial");
      if(visible.solfege)placeStackedLabel(root,"solfege-marker",solfegeNames[letter]??letter,x,labelLane,15,solfegeRows,"700 16px Arial");
      lastLetter=letter;
    }
    if(visible.accidentals&&(measureKeys?.[measure-1]?.includes(letter)??keyAccidentals.has(letter))){
      const head=headBox.get(note)??box;
      const size=Math.round(Math.max(11,Math.min(26,head.height*2.1)));
      const mark=overlay(root,"accidental-marker",letter.slice(1),head.left-rootBox.left+head.width/2,box.top-rootBox.top-size*1.25-3);
      mark.style.fontSize=`${size}px`;
    }
  }
  // Sits above the accidental lane (-18) rather than sharing it, so a
  // tongued note with a key-signature accidental doesn't overlap its own
  // syllable label.
  if(visible.tonguing&&syllables?.[index])overlay(root,"tonguing-marker",syllables[index]!,x,box.top-rootBox.top-34);
  if(unmetered)return;
  let onset=0;for(let i=start;i<index;i++)onset+=scoreEvents[i]?.d??0;
  if(visible.counts&&onset%step===0){const text=`${Math.floor(onset/unitsPerBeat)+1}${["","e","+","a"][(onset/step)%4]}`,half=labelWidth(text,"700 15px Arial")/2;if(x-half>=lastCountRight+3){overlay(root,"count-marker",text,x,countLane);lastCountRight=x+half}}
});
// Grace notes are excluded here too (same reasoning) — a duplicate onset
// with a real note right after it, rather than a proper beat position of
// its own, was throwing off the left/right anchor search below.
if(unmetered)continue;
if(!visible.sticks)continue;
let onset=0;const anchors:{t:number;x:number}[]=[];group.forEach((node,i)=>{const eventIndex=start+i,d=scoreEvents[eventIndex]?.d??0;if(d>0){const box=noteBox.get(node)!;anchors.push({t:onset,x:box.left-rootBox.left+box.width/2})}onset+=d});const right=measureBox?measureBox.right-rootBox.left:anchors.at(-1)!.x+34,
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

export type ReaderControls={
  bpm:number;
  setTempo:(tempo:number)=>void;
  metronome:boolean;
  toggleMetronome:()=>void;
  /** True while the score is sounding, whoever started it. */
  playing:boolean;
  /**
   * Start playback at a note, by its index in the score's event list — the
   * same index the overlay arrays (displayPitches, syllables) use, so a
   * caller that built those already knows where each of its sections
   * begins. Passing the index the transport is already playing from stops
   * instead, which is what makes one button a play/stop toggle.
   */
  playFromEvent:(eventIndex:number)=>void;
  /** Which event playback last started from, or null when stopped. */
  playingFrom:number|null;
};
export function ScoreViewer({config,toolbar,settings,onTempoChange,unmetered=false,lineBreak}:{config:ScoreViewerConfig;toolbar?:React.ReactNode;settings?:(controls:ReaderControls)=>React.ReactNode;onTempoChange?:(tempo:number)=>void;unmetered?:boolean;lineBreak?:{value:boolean;onChange:(value:boolean)=>void}}) {
  const {t,lang}=useLanguage();
  const zh=lang==="zh";
  const {bpm,setBpm,metro,toggleMetro,toggleDrone,stopAllDrones,drones,initializeScore}=usePracticeAudio();
  const [picker,setPicker]=useState(false),[,setDronePitch]=useState("G"),[droneOctave,setDroneOctave]=useState(4);
  // The field holds a raw draft while it is being typed, so "1" on the way
  // to "120" isn't clamped to 40 under the cursor; it commits on blur/Enter.
  const [tempoDraft,setTempoDraft]=useState<string|null>(null);
  function commitTempo(){if(tempoDraft===null)return;const next=Number(tempoDraft);setTempoDraft(null);if(Number.isFinite(next)&&tempoDraft.trim()!=="")setBpm(next)}
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
  const sequenceRef=useRef<{pitches:(string|null)[];events:{p:string|null;d:number;tied?:boolean;articulation?:ArticulationMode;slurContinuation?:boolean}[];measureStarts:number[];unitsPerBeat:number;keyAccidentals:Set<string>}>({pitches:config.pitches??[],events:config.events??[],measureStarts:config.measureStarts??[],unitsPerBeat:4,keyAccidentals:new Set()});
  const scoreRef = useRef<HTMLDivElement>(null); const scoreScrollRef = useRef<HTMLDivElement>(null); const canvasRef = useRef<HTMLCanvasElement>(null); const osmdRef = useRef<OSMDType | null>(null);
  // Scroll offsets (within .score-scroll's own content, not the viewport)
  // where each computed "page" starts — see computePages(). Kept in a ref
  // rather than state since only page TURNS need to re-render; the offsets
  // themselves are consumed imperatively by goToPage/the scroll-snap effect.
  const pageOffsetsRef = useRef<number[]>([0]);
  const audioRef = useRef<AudioContext | null>(null); const playbackTimers=useRef<number[]>([]); const playbackNodes=useRef<OscillatorNode[]>([]); const playbackPosition=useRef<{audioStart:number;unit:number;from:number}|null>(null); const drawing = useRef(false); const inkHistory=useRef<string[]>([]); const inkIndex=useRef(-1);
  // Logical (CSS-pixel) size of the ink canvas's drawing surface — set once
  // the score has rendered, from the paper's actual size, not a fixed
  // constant. The canvas's real backing-store resolution is this times
  // devicePixelRatio (see the load effect), so strokes stay crisp on
  // retina displays instead of a fixed-resolution bitmap getting stretched
  // to fit whatever size the paper turns out to be.
  const inkSizeRef = useRef({ w: 1600, h: 2200 });
  // Which overlay rows are actually on screen. Held in a ref because the
  // layout pass also runs from a ResizeObserver and from the load effect,
  // neither of which re-closes over current state.
  const overlayVisibilityRef=useRef<OverlayVisibility>({names:false,solfege:false,accidentals:false,tonguing:true,counts:false,sticks:false});
  const [loading,setLoading]=useState(true); const [error,setError]=useState(""); const [startMeasure,setStartMeasure]=useState(1); const [playing,setPlaying]=useState(false); const [playingFrom,setPlayingFrom]=useState<number|null>(null); const [annotating,setAnnotating]=useState(false); const [inkColor,setInkColor]=useState("#e52e31"); const [eraser,setEraser]=useState(false);
  // Page-turn mode: false (free scroll) by default until the mount effect
  // below picks a real default (stored preference, else viewport width) —
  // starting false keeps first paint identical between server and client.
  const [pageIndex,setPageIndex]=useState(0); const [pageCount,setPageCount]=useState(1);
  // Focus mode: hides the global nav/topbar/practice-bar and, where the
  // platform allows it, requests real fullscreen — an iPad-PDF-reader-style
  // "tap the page to read distraction-free" mode. See scoreClick below for
  // the tap trigger and the effect further down for the fullscreen attempt.
  const [focusMode,setFocusMode]=useState(false);
  // Whether the pencil/eraser is the selected tool right now — separate
  // from `annotating` (mark-up mode being on at all). Without this, the
  // canvas captured every pointer event the whole time mark-up was open:
  // typing into a text box and then clicking away to deselect it landed
  // that click on the canvas too and left a stray dot. A dedicated pencil
  // tool (below) is the only thing that turns this back on; placing a
  // text/sticky note turns it off, since what the user wants right after
  // placing one is to interact with it, not keep drawing.
  const [inkActive,setInkActive]=useState(true); const [,setHistoryTick]=useState(0); const [noteDisplay,setNoteDisplay]=useState<NoteDisplay>("off"); const [accidentals,setAccidentals]=useState(false); const [tonguing,setTonguing]=useState(true); const [fingering,setFingering]=useState(false); const [rhythmMode,setRhythmMode]=useState<RhythmMode>("off");  const [magnify,setMagnify]=useState(1); const [fingerTip,setFingerTip]=useState<{pitch:string;name:string;solfege:string;beat:string;x:number;y:number}|null>(null); const [theoryTip,setTheoryTip]=useState<{text:string;x:number;y:number}|null>(null); const [favorite,setFavorite]=useState(false);
  const [theoryEnabled,setTheoryEnabled]=useState(false),[sizePreference,setSizePreference]=useState(.8);
  const sizePreferenceRef=useRef(sizePreference);
  // How much vertical gap OSMD leaves between systems — user-adjustable
  // (see the Score settings panel) rather than a fixed constant, since
  // "enough breathing room" is a matter of taste once it's in a reasonable
  // range. 12 matches standard engraving density.
  const [systemSpacing,setSystemSpacing]=useState(12);
  const systemSpacingRef=useRef(systemSpacing);
  // How much room each note gets along the staff. Notation size scales the
  // whole engraving; this changes only how tightly notes are packed, which
  // is what decides how much music fits on a line.
  const [noteSpacing,setNoteSpacing]=useState(1);
  const noteSpacingRef=useRef(noteSpacing);
  const readerAnchor=useRef<{event:string;offset:number}|null>(null);
  const reportTempo=useRef(false);
  const [pageWidth,setPageWidth]=useState("900");
  const [spreadPageCount,setSpreadPageCount]=useState(0);
  const originalPageMargins=useRef<{left:number;right:number;top:number;narrow:number;bottom:number}|null>(null);
  const pageWidthRef=useRef(pageWidth);
  const pageTargetRef=useRef<number|null>(null);
  const metroTaps=useRef<number[]>([]);
  function tapTempo(){const now=performance.now();metroTaps.current=[...metroTaps.current.filter(t=>now-t<3000),now].slice(-5);const taps=metroTaps.current;if(taps.length>1)setBpm(60000/((now-taps[0])/(taps.length-1)))}
  const selectedEventRef=useRef<number|null>(null);
  useEffect(()=>{initializeScore(id,config.defaultTempo??76)},[id]);
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
    root.querySelectorAll<SVGGElement>(".vf-stavenote").forEach((node,index)=>{node.dataset.event=String(index);node.classList.toggle("playback-start",index===selectedEventRef.current);node.dataset.measure=String(measureForEvent(index,seq.measureStarts));const pitch=seq.pitches[index];if(pitch)node.dataset.pitch=pitch});
    placePracticeOverlays(root,seq.events,seq.measureStarts,seq.unitsPerBeat,seq.keyAccidentals??new Set(),config.displayPitches,config.measureKeyAccidentals,unmetered,config.syllables,overlayVisibilityRef.current);
    addTheoryTargets(root);
    updateDroneHighlight();
  }
  // A droned note needs its own color, distinct from the coral
  // playback-highlight, or there's no visual way to tell which pitch is
  // currently sounding a drone. Re-run whenever the active drone set
  // changes (a toggle shouldn't need a full resync) and also from
  // syncNotesAndOverlays, since a fresh render/resize replaces every note
  // node OSMD drew and none of them start out tagged.
  function updateDroneHighlight(){
    const root=scoreRef.current;if(!root)return;
    root.querySelectorAll<SVGGElement>(".vf-stavenote[data-pitch]").forEach(node=>{node.classList.toggle("drone-active",drones.includes(node.dataset.pitch!))});
  }
  useEffect(updateDroneHighlight,[drones]);

  /**
   * Splits the (still-continuous, still-Endless) engraving into viewport-
   * sized "pages" purely by measuring rendered systems — no OSMD pagination
   * involved, so it works the same for a 12-scale Scale Studio sheet or a
   * two-line exercise. A system/line boundary is detected by left edge,
   * not top: measures on the same line always advance left-to-right, so
   * any measure whose left edge doesn't clear the previous one has wrapped
   * to a new line. (Top alone is unreliable — a measure with a high note's
   * ledger lines can start higher than its neighbor on the very same line,
   * which read as a false new-system break.) Systems are then packed
   * greedily into pages, closing a page as soon as the next system would
   * overflow one screenful, so a page break always lands between systems
   * rather than slicing through the middle of a scale.
   */
  function computePages(){
    const root=scoreRef.current,scroller=scoreScrollRef.current;
    if(!root||!scroller)return;
    const scrollerBox=scroller.getBoundingClientRect();
    if(root.classList.contains("score-spread")){
      const pages=[...root.querySelectorAll<SVGSVGElement>(":scope > div > svg")];
      root.dataset.oddPages=String(pages.length%2===1);
      setSpreadPageCount(pages.length);
      const max=Math.max(0,scroller.scrollHeight-scroller.clientHeight);
      const offsets=pages.filter((_,i)=>i%2===0).map((p,i)=>i===0?0:Math.min(max,p.getBoundingClientRect().top-scrollerBox.top+scroller.scrollTop-12));
      if(offsets.length){pageOffsetsRef.current=offsets;setPageCount(offsets.length);if(pageTargetRef.current===null)setPageIndex(pageAt(offsets,scroller.scrollTop));return}
    }
    setSpreadPageCount(0);
    const measures=[...root.querySelectorAll<SVGGElement>(".vf-measure")];
    if(!measures.length){pageOffsetsRef.current=[0];setPageCount(1);return}
    const systems:{top:number;bottom:number}[]=[];let lastLeft=-Infinity;
    measures.forEach(measure=>{
      const box=measure.getBoundingClientRect(),top=box.top-scrollerBox.top+scroller.scrollTop,bottom=box.bottom-scrollerBox.top+scroller.scrollTop+24;
      if(box.left<=lastLeft||!systems.length)systems.push({top,bottom});
      else {const system=systems[systems.length-1];system.top=Math.min(system.top,top);system.bottom=Math.max(system.bottom,bottom)}
      lastLeft=box.left;
    });
    const offsets=pageOffsets(systems,scroller.clientHeight,Math.max(0,scroller.scrollHeight-scroller.clientHeight));
    pageOffsetsRef.current=offsets;setPageCount(offsets.length);
    if(pageTargetRef.current===null)setPageIndex(pageAt(offsets,scroller.scrollTop));
  }
  function resync(){syncNotesAndOverlays();computePages()}
  function rememberPosition(){
    const scroller=scoreScrollRef.current,root=scoreRef.current;if(!scroller||!root)return;
    if(scroller.scrollTop<8){readerAnchor.current=null;return}
    const top=scroller.getBoundingClientRect().top;
    const note=[...root.querySelectorAll<SVGElement>("[data-event]")].find(node=>node.getBoundingClientRect().bottom>=top);
    if(note)readerAnchor.current={event:note.dataset.event!,offset:(note.getBoundingClientRect().top-top)/magnifyRef.current};
  }
  function layoutScore(){
    const osmd=osmdRef.current,scroller=scoreScrollRef.current,root=scoreRef.current;if(!osmd||!scroller||!root)return;
    const anchor=readerAnchor.current;
    const spread=pageWidthRef.current==="spread"&&scroller.clientWidth>=1000;
    root.classList.toggle("score-spread",spread);
    osmd.setOptions({pageFormat:spread?"A4 P":"Endless",drawTitle:spread});
    scroller.classList.toggle("spread-viewport",spread);
    const margins=originalPageMargins.current;
    if(margins){osmd.EngravingRules.PageLeftMargin=spread?8:margins.left;osmd.EngravingRules.PageRightMargin=spread?8:margins.right;osmd.EngravingRules.PageTopMargin=spread?8:margins.top;osmd.EngravingRules.PageTopMarginNarrow=spread?8:margins.narrow;osmd.EngravingRules.PageBottomMargin=spread?8:margins.bottom;}
    const padding=getComputedStyle(scroller);
    const width=scroller.clientWidth-parseFloat(padding.paddingLeft)-parseFloat(padding.paddingRight);
    if(root.parentElement)root.parentElement.style.width=`${width}px`;
    const next=notationScale(spread?scroller.clientWidth/2:scroller.clientWidth,scroller.clientHeight,sizePreferenceRef.current);
    osmd.zoom=next;
    osmd.EngravingRules.MinimumDistanceBetweenSystems=systemSpacingRef.current;
    osmd.EngravingRules.VoiceSpacingMultiplierVexflow=noteSpacingRef.current;
    if(unmetered)osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem=0;
    const spreadWidth=width-24;
    if(spread){
      // Book pages use the available aspect ratio instead of shrinking A4 to fit height.
      const pageHeight=Math.max(100,scroller.clientHeight-48);
      osmd.EngravingRules.PageFormat.width=210;
      osmd.EngravingRules.PageFormat.height=210*pageHeight/(spreadWidth/2);
      osmd.EngravingRules.TitleBottomDistance=2;
      root.style.setProperty("--book-page-ratio",`${spreadWidth/2} / ${pageHeight}`);
    }
    if(spread)root.style.width=`${spreadWidth/2}px`;else root.style.width="";
    osmd.render();root.style.width=spread?`${spreadWidth}px`:"";resync();
    sizeInkCanvas(canvasRef.current,inkSizeRef,inkHistory,inkIndex,id,()=>setHistoryTick(v=>v+1));
    if(spread){const offsets=pageOffsetsRef.current;scroller.scrollTop=offsets[Math.min(pageIndex,offsets.length-1)]??0;}
    else if(anchor){const node=root.querySelector<SVGElement>(`[data-event="${anchor.event}"]`);if(node)scroller.scrollTop+=node.getBoundingClientRect().top-scroller.getBoundingClientRect().top-anchor.offset*magnifyRef.current}
    else scroller.scrollTop=0;
    computePages();
  }
  function goToPage(index:number){
    const scroller=scoreScrollRef.current,offsets=pageOffsetsRef.current;
    if(!scroller||!offsets.length)return;
    const clamped=Math.max(0,Math.min(index,offsets.length-1));
    pageTargetRef.current=offsets[clamped];
    setPageIndex(clamped);
    scroller.scrollTo({top:offsets[clamped],behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});
  }
  async function toggleFocusMode(){
    if(document.fullscreenElement){await document.exitFullscreen().catch(()=>{});setFocusMode(false);return}
    if(focusMode){setFocusMode(false);return}
    const root=scoreScrollRef.current?.closest<HTMLElement>(".app-shell");
    if(root?.requestFullscreen){try{await root.requestFullscreen();setFocusMode(true)}catch{setFocusMode(true)}}
    else setFocusMode(true);
  }
  // If the OS/browser exits fullscreen on its own (Esc, a swipe gesture),
  // bring the app's own chrome back too rather than leaving the score
  // expanded with no visible way to restore it.
  useEffect(()=>{
    function onFullscreenChange(){if(!document.fullscreenElement)setFocusMode(false)}
    document.addEventListener("fullscreenchange",onFullscreenChange);
    return()=>document.removeEventListener("fullscreenchange",onFullscreenChange);
  },[]);
  // Hiding/showing the topbar+practice-bar changes .score-scroll's height,
  // not .osmd-score's width, so the width-driven ResizeObserver elsewhere
  // in this file won't catch it — recompute pages explicitly whenever
  // focus mode toggles. The class lives on <html> (not local JSX) because
  // the global nav and PracticeToolDock this also needs to hide are
  // siblings mounted outside this component's own tree (see layout.tsx).
  useEffect(()=>{
    document.documentElement.classList.toggle("score-focus-mode",focusMode);
    computePages();
    return()=>{document.documentElement.classList.remove("score-focus-mode")};
  },[focusMode]);
  useEffect(()=>{
    function navigate(event:KeyboardEvent){
      if(event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
      const target=event.target as HTMLElement;
      if(target.closest("input,textarea,select,[contenteditable], [role=dialog]"))return;
      if(document.querySelector(".reader-settings-panel"))return;
      const direction=event.key==="ArrowRight"||event.key==="ArrowDown"?1:event.key==="ArrowLeft"||event.key==="ArrowUp"?-1:0;
      if(!direction)return;
      event.preventDefault();goToPage(pageIndex+direction);
    }
    document.addEventListener("keydown",navigate);
    return()=>document.removeEventListener("keydown",navigate);
  },[pageIndex]);
  // Manual scrolling only updates the indicator. It never triggers a page turn.
  useEffect(()=>{
    const scroller=scoreScrollRef.current;if(!scroller)return;
    // While following a goToPage target, trust the index goToPage already
    // set rather than re-deriving it from scrollTop on every frame of the
    // smooth-scroll animation: the animation's final pixels approach the
    // target asymptotically, so several trailing frames sit fractionally
    // short of the exact offset — and pageAt's boundary math reads any of
    // those as the PREVIOUS page. A proximity check only guards the one
    // frame it runs on, not the frames after it, so it briefly overwrote
    // the correct number (turning to page 2 flashed back to 1). Instead,
    // treat "no scroll events for a beat" as the real arrival signal: keep
    // resetting a short quiet-timer on every frame while a target is set,
    // and only resume live scrollTop tracking once it fires.
    let settleTimer=0;
    const onScroll=()=>{if(pageTargetRef.current!==null){window.clearTimeout(settleTimer);settleTimer=window.setTimeout(()=>{pageTargetRef.current=null;rememberPosition()},120);return}setPageIndex(pageAt(pageOffsetsRef.current,scroller.scrollTop));rememberPosition()};
    const interrupt=()=>{window.clearTimeout(settleTimer);pageTargetRef.current=null};
    scroller.addEventListener("wheel",interrupt,{passive:true});scroller.addEventListener("touchstart",interrupt,{passive:true});
    scroller.addEventListener("scroll",onScroll,{passive:true});
    return()=>{window.clearTimeout(settleTimer);scroller.removeEventListener("scroll",onScroll);scroller.removeEventListener("wheel",interrupt);scroller.removeEventListener("touchstart",interrupt)};
  },[]);

  // Keep engraving width fixed while magnifying; preserve the point under the gesture.
  const magnifyRef=useRef(magnify);
  useEffect(()=>{magnifyRef.current=magnify},[magnify]);
  useEffect(()=>{
    const el=scoreScrollRef.current;if(!el)return;
    let frame=0,touchDistance=0,touchZoom=1,gestureZoom=1;
    function apply(value:number,x:number,y:number){
      const next=Math.max(.5,Math.min(3,value)),old=magnifyRef.current,box=el!.getBoundingClientRect();
      const px=x-box.left,py=y-box.top,left=(el!.scrollLeft+px)*next/old-px,top=(el!.scrollTop+py)*next/old-py;
      magnifyRef.current=next;setMagnify(next);cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{el!.scrollLeft=left;el!.scrollTop=top;rememberPosition()});
    }
    function wheel(e:WheelEvent){if(!e.ctrlKey)return;e.preventDefault();apply(magnifyRef.current*Math.exp(-e.deltaY*.008),e.clientX,e.clientY)}
    function start(e:TouchEvent){if(e.touches.length!==2)return;e.preventDefault();touchDistance=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);touchZoom=magnifyRef.current}
    function move(e:TouchEvent){if(e.touches.length!==2||!touchDistance)return;e.preventDefault();const [a,b]=[e.touches[0],e.touches[1]];apply(touchZoom*Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)/touchDistance,(a.clientX+b.clientX)/2,(a.clientY+b.clientY)/2)}
    function end(){touchDistance=0}
    function gestureStart(e:Event){e.preventDefault();gestureZoom=magnifyRef.current}
    function gestureChange(e:Event){e.preventDefault();if(touchDistance)return;const g=e as Event&{scale:number;clientX:number;clientY:number};apply(gestureZoom*g.scale,g.clientX,g.clientY)}
    el.addEventListener("wheel",wheel,{passive:false});el.addEventListener("touchstart",start,{passive:false});el.addEventListener("touchmove",move,{passive:false});el.addEventListener("touchend",end);el.addEventListener("touchcancel",end);el.addEventListener("gesturestart",gestureStart);el.addEventListener("gesturechange",gestureChange);
    return()=>{cancelAnimationFrame(frame);el.removeEventListener("wheel",wheel);el.removeEventListener("touchstart",start);el.removeEventListener("touchmove",move);el.removeEventListener("touchend",end);el.removeEventListener("touchcancel",end);el.removeEventListener("gesturestart",gestureStart);el.removeEventListener("gesturechange",gestureChange)};
  },[]);

  useEffect(()=>{const saved=JSON.parse(localStorage.getItem("cookie:music-favorites")||"[]") as string[];setFavorite(saved.includes(id));let mounted=true; async function load(){ try { if(unmetered&&!asset.includes("<note>")){scoreRef.current?.replaceChildren();osmdRef.current=null;setLoading(false);return;} setLoading(true); const {OpenSheetMusicDisplay}=await import("opensheetmusicdisplay"); if(!mounted||!scoreRef.current)return; scoreRef.current.replaceChildren(); const osmd=new OpenSheetMusicDisplay(scoreRef.current,{backend:"svg",autoResize:false,drawTitle:false,drawComposer:false,drawingParameters:"compacttight"}); osmd.setOptions({pageFormat:"Endless",drawMeasureNumbers:true,drawPartNames:false,drawMetronomeMarks:true}); osmd.OnXMLRead = xml=>{if(config.defaultTempo===undefined){const doc=new DOMParser().parseFromString(xml,"application/xml");const marked=Number(doc.querySelector("sound[tempo]")?.getAttribute("tempo"));if(marked>0)initializeScore(id,marked)}return prepareScore(xml,title)}; osmd.zoom=notationScale(scoreScrollRef.current?.clientWidth??700,scoreScrollRef.current?.clientHeight??650); await osmd.load(asset,title); if(!mounted||!scoreRef.current)return;
      // React's Strict Mode runs this whole effect twice in dev (mount,
      // cleanup, mount again) to surface exactly this kind of bug: without
      // re-checking `mounted` after every await, a stale first run and the
      // real second run were both landing in the same container — each one
      // individually correct, but their note-tagging/overlay calls
      // interleaving mid-flight, which is what produced measures with
      // extra/misplaced beat-sticks (right on first load, never on a later
      // resize, since by then only one run was ever still in flight).
      // User-adjustable (Score settings > System spacing); systemSpacingRef
      // starts at 12 (standard engraving density) and layoutScore() re-
      // applies it on every relayout, so changing the setting takes effect.
      originalPageMargins.current={left:osmd.EngravingRules.PageLeftMargin,right:osmd.EngravingRules.PageRightMargin,top:osmd.EngravingRules.PageTopMargin,narrow:osmd.EngravingRules.PageTopMarginNarrow,bottom:osmd.EngravingRules.PageBottomMargin};
      osmd.EngravingRules.MinimumDistanceBetweenSystems=systemSpacingRef.current;
      osmd.EngravingRules.VoiceSpacingMultiplierVexflow=noteSpacingRef.current;
      // Scale Studio's invisible measures end in a repeat barline every
      // couple of beats — with the default 0 margin, the last note before
      // it was rendering flush against the barline. This is a general
      // per-measure margin, but it only becomes visible where a visible
      // barline actually sits close to the last note, which in practice is
      // just these repeat endings.
      osmd.EngravingRules.MeasureRightMargin=0.6;
      let suppressCourtesySignatures=()=>{};
      if(unmetered){
        osmd.setOptions({drawMeasureNumbers:false,newSystemFromXML:true});
        osmd.EngravingRules.RenderTimeSignatures=false;
        // Explicit per-exercise breaks (inserted in OnXMLRead, where the
        // page width is known) replace the global rule — the two would
        // fight, since RenderXMeasuresPerLineAkaSystem forces its own cut
        // at a fixed measure count regardless of where an exercise ends.
        osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem=0;
        suppressCourtesySignatures=()=>{
          // Independent exercises keep only the opening clef and do not
          // cancel the preceding exercise's key signature with naturals.
          osmd.GraphicSheet.MeasureList.forEach((staffMeasures,index)=>staffMeasures.forEach(measure=>{
            if(index>0)measure.addClefAtBegin=()=>{};
            const addKey=measure.addKeyAtBegin.bind(measure);
            measure.addKeyAtBegin=(current,_previous,clef)=>addKey(current,current,clef);
          }));
          // Courtesy signatures use extra measures created during reflow.
          // Scope their omission to this score's synchronous layout pass.
          const sheet=osmd.GraphicSheet;
          const calculate=sheet.reCalculate.bind(sheet);
          sheet.reCalculate=(...args)=>{
            const factory=(sheet.GetCalculator.constructor as typeof MusicSheetCalculator).symbolFactory;
            const createExtra=factory.createExtraGraphicalMeasure;
            factory.createExtraGraphicalMeasure=(...params)=>{
              const extra=createExtra.apply(factory,params);
              extra.addKeyAtBegin=()=>{};
              return extra;
            };
            try{return calculate(...args)}finally{factory.createExtraGraphicalMeasure=createExtra}
          };
        };
        suppressCourtesySignatures();
        osmd.EngravingRules.StretchLastSystemLine=false;
      }
      osmd.render();
      osmdRef.current=osmd; sizeInkCanvas(canvasRef.current,inkSizeRef,inkHistory,inkIndex,id,()=>setHistoryTick(v=>v+1)); if(!config.pitches)sequenceRef.current={...deriveScoreEvents(osmd),keyAccidentals:new Set()};
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
      window.setTimeout(async ()=>{
        if(!mounted)return;
        layoutScore();
        // Rebalancing happens HERE, not straight after the first render:
        // at render time the score element has not been laid out at its
        // real width yet, so OSMD had wrapped at one measure per line and
        // every capacity measured off that was nonsense. layoutScore() has
        // re-rendered at the true width by this point.
        if(unmetered&&scoreRef.current&&asset.includes('<print new-system="yes"/>')){
          const nodes=[...scoreRef.current.querySelectorAll<SVGGElement>(".vf-measure")];
          const boxes=nodes.map(node=>node.getBoundingClientRect());
          // A measure's bbox top moves with how high its notes reach (see
          // computePages), so measures sharing a system do not share a
          // top. The left edge resetting to the margin is the reliable
          // "new system" signal.
          let systemMeasures=boxes.length?1:0;
          for(let index=1;index<boxes.length&&boxes[index].left>boxes[0].left+4;index++)systemMeasures++;
          const noteCapacity=nodes.slice(0,systemMeasures).reduce((sum,node)=>sum+node.querySelectorAll(".vf-stavenote").length,0);
          const balanced=noteCapacity>=8?balanceSystemBreaks(asset,noteCapacity):asset;
          if(balanced!==asset){
            await osmd.load(balanced,title);
            if(!mounted||!scoreRef.current)return;
            suppressCourtesySignatures();
            osmd.render();
            if(!config.pitches)sequenceRef.current={...deriveScoreEvents(osmd),keyAccidentals:sequenceRef.current.keyAccidentals};
            layoutScore();
          }
        }
        setLoading(false);
      },0);
      } catch(e){setError(e instanceof Error?e.message:t.scoreViewer.engravingFailed);setLoading(false);} } load(); return()=>{mounted=false};},[asset]);
  useEffect(()=>{const root=scoreRef.current;if(!root)return;root.dataset.noteDisplay=noteDisplay;root.classList.toggle("show-accidentals",accidentals);root.dataset.rhythm=rhythmMode;root.dataset.tonguing=tonguing?"on":"off";
    const next={names:noteDisplay==="names",solfege:noteDisplay==="solfege",accidentals,tonguing,counts:rhythmMode==="counts",sticks:rhythmMode==="bars"};
    const previous=overlayVisibilityRef.current;
    overlayVisibilityRef.current=next;
    // Turning a row on now has to build it, since it is no longer built
    // upfront and hidden with CSS.
    const changed=(Object.keys(next) as (keyof OverlayVisibility)[]).some(key=>next[key]!==previous[key]);
    if(changed&&!loading&&osmdRef.current)syncNotesAndOverlays();},[noteDisplay,accidentals,rhythmMode,tonguing,loading]);
  useEffect(()=>{sizePreferenceRef.current=sizePreference;rememberPosition();layoutScore()},[sizePreference]);
  useEffect(()=>{pageWidthRef.current=pageWidth;rememberPosition();layoutScore()},[pageWidth]);
  useEffect(()=>{systemSpacingRef.current=systemSpacing;rememberPosition();layoutScore()},[systemSpacing]);
  useEffect(()=>{noteSpacingRef.current=noteSpacing;rememberPosition();layoutScore()},[noteSpacing]);
  useEffect(()=>{if(osmdRef.current)computePages()},[magnify]);
  useEffect(()=>{
    const scroller=scoreScrollRef.current;if(!scroller)return;
    let timer=0,lastWidth=scroller.clientWidth,lastHeight=scroller.clientHeight;
    const observer=new ResizeObserver(()=>{
      const {clientWidth:width,clientHeight:height}=scroller;
      if(width===lastWidth&&height===lastHeight)return;
      const widthChanged=width!==lastWidth;lastWidth=width;lastHeight=height;window.clearTimeout(timer);
      timer=window.setTimeout(()=>{if(widthChanged||pageWidthRef.current==="spread")layoutScore();else computePages()},180);
    });observer.observe(scroller);
    return()=>{window.clearTimeout(timer);observer.disconnect()};
  },[]);
  useEffect(()=>()=>{playbackTimers.current.forEach(window.clearTimeout);if(audioRef.current&&audioRef.current.state!=="closed")audioRef.current.close().catch(()=>{})},[]);
  const audio=()=>audioRef.current??(audioRef.current=new AudioContext());
  useEffect(()=>{if(!reportTempo.current){reportTempo.current=true;return}onTempoChange?.(bpm)},[bpm,onTempoChange]);
  useEffect(()=>{
    if(!playing)return;
    const pos=playbackPosition.current;
    if(!pos)return;
    const elapsedMs=(audio().currentTime-pos.audioStart)*1000,seq=sequenceRef.current;
    let cursor=0,fromIndex=seq.events.length;
    for(let i=pos.from;i<seq.events.length;i++){if(cursor>elapsedMs){fromIndex=i;break}cursor+=seq.events[i].d*pos.unit}
    playbackTimers.current.forEach(window.clearTimeout);
    playbackTimers.current=[];
    scheduleNotes(fromIndex);
    // Deliberately excludes `playing`: togglePlayback already calls
    // scheduleNotes directly when Play is pressed, so reacting to `playing`
    // here too would double-schedule every note the instant it flips true.
    // The note already sounding when bpm changes rings out untouched (its
    // oscillator is already committed to the audio graph); only notes from
    // fromIndex onward pick up the new tempo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[bpm]);
  function fluteTone(pitch:string,start:number,duration:number,peakGain=.075){const match=pitch.match(/^([A-G][♯♭]?)(\d)$/);if(!match)return;const c=audio(),fund=c.createOscillator(),gain=c.createGain(),vibrato=c.createOscillator(),vibGain=c.createGain(),frequency=pitchFrequency(match[1],+match[2]);fund.type="sine";fund.frequency.value=frequency;vibrato.frequency.value=5.2;vibGain.gain.value=frequency*.004;vibrato.connect(vibGain);vibGain.connect(fund.frequency);gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(peakGain,start+.035);gain.gain.setValueAtTime(peakGain*.933,start+Math.max(.05,duration-.07));gain.gain.exponentialRampToValueAtTime(.0001,start+duration);fund.connect(gain).connect(c.destination);fund.start(start);vibrato.start(start);fund.stop(start+duration);vibrato.stop(start+duration);playbackNodes.current.push(fund,vibrato)}
  function stopPlayback(){playbackTimers.current.forEach(window.clearTimeout);playbackTimers.current=[];playbackNodes.current.forEach(o=>{try{o.stop()}catch{/* Already-ended notes need no further cleanup. */}});playbackNodes.current=[];playbackPosition.current=null;scoreRef.current?.querySelectorAll(".playback-active").forEach(n=>n.classList.remove("playback-active"));setPlaying(false);setPlayingFrom(null)}
  // Articulation only ever changes how long a note's own envelope rings,
  // never the start-to-start spacing between notes (that stays `event.d*unit`
  // regardless) — staccato fades out early to leave an audible gap, tenuto
  // and slur ring through to the next onset, and a plain tongue note keeps
  // the app's original .88 factor so pieces with no articulation data
  // (Mystery of Love) play back exactly as before.
  function articulationAudio(articulation:ArticulationMode|undefined,slurContinuation:boolean|undefined){
    if(articulation==="staccato")return {factor:.5,peakGain:.075};
    if(articulation==="tenuto"||articulation==="slur")return {factor:1,peakGain:articulation==="slur"&&slurContinuation?.045:.075};
    return {factor:.88,peakGain:.075};
  }
  // Extracted from togglePlayback so a mid-playback bpm change (see the
  // [bpm] effect above) can reschedule only the notes that haven't sounded
  // yet, instead of the whole piece. Each note's delay is still an
  // independent offset from one `audioStart` fixed at call time — never
  // chained off a previous callback's actual fire time — which is what
  // keeps this drift-free regardless of setTimeout jitter.
  function scheduleNotes(fromIndex:number){
    const c=audio(),audioStart=c.currentTime+.08,seq=sequenceRef.current,unit=60000/bpm/seq.unitsPerBeat,nodes=scoreRef.current?.querySelectorAll<SVGGElement>(".vf-stavenote")||[],slice=seq.events.slice(fromIndex);
    let cursor=0;
    // A tie is two written notes, not one — the second is still its own
    // event here (still gets its own beat position and highlight), but it
    // isn't a fresh sound, it's the first note continuing. Summing each
    // tie chain's total length once, backwards, means the chain's first
    // note gets fluteTone'd for the whole combined duration and every
    // note after it in the chain is skipped rather than re-attacking.
    const soundUnits:number[]=new Array(slice.length);for(let i=slice.length-1;i>=0;i--)soundUnits[i]=slice[i].d+(i+1<slice.length&&slice[i+1].tied?soundUnits[i+1]:0);
    slice.forEach((event,offset)=>{
      const index=fromIndex+offset,start=cursor;
      playbackTimers.current.push(window.setTimeout(()=>{nodes.forEach(n=>n.classList.remove("playback-active"));nodes[index]?.classList.add("playback-active")},start+80));
      if(event.p&&!event.tied){
        const pitch=event.p,{factor,peakGain}=articulationAudio(event.articulation,event.slurContinuation),absoluteStart=audioStart+start/1000,soundDuration=Math.max(.09,soundUnits[offset]*unit/1000*factor);
        playbackTimers.current.push(window.setTimeout(()=>fluteTone(pitch,absoluteStart,soundDuration,peakGain),start));
      }
      cursor+=event.d*unit;
    });

    playbackTimers.current.push(window.setTimeout(stopPlayback,cursor+160));
    playbackPosition.current={audioStart,unit,from:fromIndex};
  }
  function togglePlayback(){if(playing){stopPlayback();return}setPlaying(true);const first=sequenceRef.current.measureStarts[startMeasure-1]??0;setPlayingFrom(first);scheduleNotes(first)}
  /**
   * Play from one note rather than from the transport's start measure.
   * Re-pressing the control that started it stops, so the caller can render
   * a single play/stop button per section. The start measure moves with it,
   * so the main transport picks up where this left off.
   */
  function playFromEvent(eventIndex:number){
    if(playing&&playingFrom===eventIndex){stopPlayback();return}
    if(playing)stopPlayback();
    const seq=sequenceRef.current;
    const index=Math.max(0,Math.min(eventIndex,Math.max(0,seq.events.length-1)));
    setStartMeasure(measureForEvent(index,seq.measureStarts));
    setPlaying(true);setPlayingFrom(index);scheduleNotes(index);
  }
  function point(e:PointerEvent<HTMLCanvasElement>){const r=e.currentTarget.getBoundingClientRect(),{w,h}=inkSizeRef.current;return{x:(e.clientX-r.left)*w/r.width,y:(e.clientY-r.top)*h/r.height}}
  function begin(e:PointerEvent<HTMLCanvasElement>){if(!annotating||!inkActive)return;drawing.current=true;const p=point(e),c=e.currentTarget.getContext("2d");c?.beginPath();c?.moveTo(p.x,p.y);e.currentTarget.setPointerCapture(e.pointerId)}
  function draw(e:PointerEvent<HTMLCanvasElement>){if(!drawing.current||!annotating)return;const p=point(e),c=e.currentTarget.getContext("2d");if(!c)return;c.lineWidth=eraser?28:4;c.lineCap="round";c.lineJoin="round";c.globalCompositeOperation=eraser?"destination-out":"source-over";c.strokeStyle=inkColor;c.lineTo(p.x,p.y);c.stroke()}
  function pushHistory(data:string){inkHistory.current=inkHistory.current.slice(0,inkIndex.current+1);inkHistory.current.push(data);inkIndex.current=inkHistory.current.length-1;localStorage.setItem(`cookie:${id}:ink`,data);setHistoryTick(v=>v+1)}
  function saveInk(){drawing.current=false;const data=canvasRef.current?.toDataURL();if(data)pushHistory(data)}
  function showHistory(index:number){const canvas=canvasRef.current;if(!canvas)return;const context=canvas.getContext("2d"),{w,h}=inkSizeRef.current;context?.clearRect(0,0,w,h);const data=inkHistory.current[index];if(data){const image=new Image();image.onload=()=>context?.drawImage(image,0,0,w,h);image.src=data}inkIndex.current=index;if(data)localStorage.setItem(`cookie:${id}:ink`,data);else localStorage.removeItem(`cookie:${id}:ink`);setHistoryTick(v=>v+1)}
  function undoInk(){if(inkIndex.current>0)showHistory(inkIndex.current-1)} function redoInk(){if(inkIndex.current<inkHistory.current.length-1)showHistory(inkIndex.current+1)}
  function clearInk(){const canvas=canvasRef.current,{w,h}=inkSizeRef.current;canvas?.getContext("2d")?.clearRect(0,0,w,h);if(canvas)pushHistory(canvas.toDataURL())}
  function showNoteInfo(node:SVGGElement,x:number,y:number){
    if(noteDisplay==="off"&&!fingering&&rhythmMode==="off"){setFingerTip(null);return}
    setFingerTip({pitch:node.dataset.pitch!,name:node.dataset.noteName??node.dataset.pitch!.replace(/\d/,""),solfege:node.dataset.solfege??"",beat:node.dataset.beat??"",x,y});
  }
  function scoreMove(e:React.MouseEvent<HTMLDivElement>){
    if(annotating)return;
    const theory=(e.target as Element).closest<SVGElement>("[data-theory]");
    setTheoryTip(theoryEnabled&&theory?{text:theory.dataset.theory!,x:e.clientX,y:e.clientY}:null);
    const node=(e.target as Element).closest<SVGGElement>(".vf-stavenote[data-pitch]");
    if(!node){setFingerTip(null);return}showNoteInfo(node,e.clientX,e.clientY);
  }
  function scoreClick(e:React.MouseEvent<HTMLDivElement>){
    if(annotating)return;
    const node=(e.target as Element).closest<SVGGElement>(".vf-stavenote[data-pitch]");
    const theory=(e.target as Element).closest<SVGElement>("[data-theory]");
    if(theoryEnabled&&theory){setTheoryTip({text:theory.dataset.theory!,x:e.clientX,y:e.clientY});return}
    setTheoryTip(null);
    if(!node){setFingerTip(null);return}
    const match=node.dataset.pitch!.match(/^([A-G][♯♭]?)(\d)$/);if(!match)return;
    setStartMeasure(Number(node.dataset.measure)||1);setDronePitch(match[1]);setDroneOctave(+match[2]);toggleDrone(match[1],+match[2]);
    showNoteInfo(node,e.clientX,e.clientY);
  }
  function toggleFavorite(){const saved=JSON.parse(localStorage.getItem("cookie:music-favorites")||"[]") as string[],next=saved.includes(id)?saved.filter(item=>item!==id):[...saved,id];localStorage.setItem("cookie:music-favorites",JSON.stringify(next));setFavorite(next.includes(id));window.dispatchEvent(new Event("cookie:favorites-updated"))}
  return <main className="app-shell reader-workspace restored-reader" data-layout={pageWidth} style={{"--reader-page-width":pageWidth==="900"?"900px":"100%","--viewer-magnify":magnify,"--score-composer":`"${composer}"`} as React.CSSProperties}>
    <section className="workspace">
      <header className="topbar"><div><a className="back has-tip" href={backHref} aria-label={backLabel?`${t.scoreViewer.back}: ${backLabel}`:t.scoreViewer.back} data-tip={backLabel||t.scoreViewer.back}><span className="back-arrow" aria-hidden="true">‹</span>{backLabel&&<span className="back-label">{backLabel}</span>}</a>{!toolbar&&<strong>{title}</strong>}</div><div><SaveButton saved={favorite} onToggle={toggleFavorite} label={favorite?t.scoreViewer.removeFromSaved:t.scoreViewer.saveMusic} tip={favorite?t.scoreViewer.removeFromSaved:t.scoreViewer.saveMusic}/><span className="topbar-toolbar-slot">{toolbar}</span>{pdfPath&&<a className="icon-btn has-tip" href={pdfPath} download data-tip={t.scoreViewer.downloadPdf} aria-label={t.scoreViewer.downloadPdf}>↓</a>}</div></header>

      <div className="practice-bar"><div className="tool-group">        <button data-tip={t.scoreViewer.markUpTip} className={annotating?"tool on coral has-tip":"tool has-tip"} onClick={()=>{const next=!annotating;setAnnotating(next);if(next)setInkActive(true)}}><PracticeIcon name="markup"/>{t.scoreViewer.markUp}</button>
      </div>
        <div className="transport"><button data-tip={t.scoreViewer.playTip(startMeasure)} className={playing?"tool on has-tip":"tool has-tip"} onClick={togglePlayback}><PracticeIcon name={playing?"stop":"play"}/>{playing?t.scoreViewer.stop:t.scoreViewer.play}</button><span className="record-slot"/><label className="tempo"><b>♩ =</b><input aria-label={t.scoreViewer.tempoAria} type="number" min="40" max="220" value={tempoDraft??bpm} onChange={e=>setTempoDraft(e.target.value)} onBlur={commitTempo} onKeyDown={e=>{if(e.key==="Enter")e.currentTarget.blur()}}/><small>{t.scoreViewer.bpm}</small></label><button className="tool has-tip" data-tip={t.scoreViewer.tapTempo} aria-label={t.scoreViewer.tapTempo} onClick={tapTempo}><PracticeIcon name="tap"/>{zh?"打拍":"Tap"}</button>
          <button data-tip={t.scoreViewer.metronomeTip} className={metro?"tool on has-tip":"tool has-tip"} onClick={toggleMetro}><PracticeIcon name="metronome"/>{t.scoreViewer.metronome}</button>
          <div className="transport-menu">
            <button aria-label={t.scoreViewer.drone} aria-pressed={drones.length>0} aria-expanded={picker} data-tip={t.scoreViewer.droneTip} className={drones.length?"tool on has-tip":"tool has-tip"} onClick={()=>setPicker(o=>!o)}><PracticeIcon name="drone"/>{t.scoreViewer.drone}<small>{drones.length?drones.join("+"):t.scoreViewer.droneOff}</small></button>
            {picker&&<>
              <div className="transport-menu-backdrop" onClick={()=>setPicker(false)}/>
              <div className="transport-pop" role="dialog" aria-label={t.scoreViewer.drone}>
                <label className="octave-row">{t.scoreViewer.octave} <select value={droneOctave} onChange={e=>setDroneOctave(+e.target.value)}>{[3,4,5,6].map(o=><option key={o}>{o}</option>)}</select></label>
                <div className="pitch-grid">{["C","C♯","D","E♭","E","F","F♯","G","A♭","A","B♭","B"].map(n=>{
                  const sounding=drones.filter(d=>d.slice(0,-1)===n).map(d=>d.slice(-1)).sort();
                  return <button key={n} aria-pressed={sounding.length>0} className={sounding.length?"selected":""} onClick={()=>{setDronePitch(n);toggleDrone(n,droneOctave)}}>{n}{sounding.length>0&&<i>{sounding.join("·")}</i>}</button>;
                })}</div>
                {drones.length>0&&<div className="active-drone-list">{drones.map(n=><button key={n} onClick={()=>toggleDrone(n.slice(0,-1),+n.slice(-1))}>{n} ×</button>)}<button onClick={stopAllDrones}>{t.scoreViewer.stopAll}</button></div>}
                <small>{t.scoreViewer.droneHint}</small>
              </div>
            </>}
          </div>
        </div>      <div className="reader-header restored-view-controls">        
        <div className="reader-view">{settings?.({bpm,setTempo:setBpm,metronome:metro,toggleMetronome:toggleMetro,playing,playFromEvent,playingFrom})}{magnify!==1&&<button onClick={()=>setMagnify(1)}>{zh?"重置缩放":"Reset zoom"}</button>}
          <ReaderPopover label={zh?"显示设置":"View settings"} trigger={<><PracticeIcon name="gear"/>{zh?"显示":"View"}</>} className="tool has-tip">

            <div className="reader-setting-row"><span>{zh?"页面布局":"Page layout"}</span><div className="reader-choice" role="group" aria-label={zh?"页面布局":"Page layout"}>{[["900",zh?"竖向单页":"Portrait"],["auto",zh?"适应窗口":"Fit window"],["spread",zh?"双页":"Two pages"]].map(([value,label])=><button key={value} aria-pressed={pageWidth===value} onClick={()=>setPageWidth(value)}>{label}</button>)}</div></div>
            {lineBreak&&<div className="reader-setting-row"><span>{zh?"换行":"Line breaks"}</span><div className="reader-choice" role="group" aria-label={zh?"换行":"Line breaks"}><button aria-pressed={!lineBreak.value} onClick={()=>lineBreak.onChange(false)}>{zh?"接续上一个":"Continue from previous"}</button><button aria-pressed={lineBreak.value} onClick={()=>lineBreak.onChange(true)}>{zh?"另起一行":"Start on a new line"}</button></div></div>}
            <label className="reader-setting-row">{zh?"音符大小":"Notation size"}<input type="range" min="0.75" max="1.5" step="0.05" value={sizePreference} onChange={e=>setSizePreference(+e.target.value)}/></label>
            <label className="reader-setting-row">{zh?"行间距":"System spacing"}<input type="range" min="7" max="24" step="1" value={systemSpacing} onChange={e=>setSystemSpacing(+e.target.value)}/></label>
            <label className="reader-setting-row">{zh?"音符间距":"Note spacing"}<input type="range" min="0.5" max="2" step="0.05" value={noteSpacing} onChange={e=>setNoteSpacing(+e.target.value)}/></label>
            <div className="reader-display-options">
        <button data-tip={t.scoreViewer.noteDisplayTip} className={noteDisplay!=="off"?"tool on has-tip":"tool has-tip"} onClick={cycleNoteDisplay}><span>A♭</span>{noteDisplay==="off"?t.scoreViewer.noteDisplay:noteDisplay==="names"?t.scoreViewer.noteNames:t.scoreViewer.solfege}</button>
        {!unmetered&&<button data-tip={t.scoreViewer.rhythmDisplay} className={rhythmMode!=="off"?"tool on has-tip":"tool has-tip"} onClick={cycleRhythm}><span>▥</span>{rhythmMode==="off"?t.scoreViewer.rhythm:rhythmMode==="counts"?t.scoreViewer.rhythmCountsShort:t.scoreViewer.rhythmBarsShort}</button>}
        <button data-tip={t.scoreViewer.accidentalsTip} className={accidentals?"tool on has-tip":"tool has-tip"} onClick={()=>setAccidentals(!accidentals)}><span>♯</span>{t.scoreViewer.accidentals}</button>
        <button data-tip={t.scoreViewer.tonguingTip} className={tonguing?"tool on has-tip":"tool has-tip"} onClick={()=>setTonguing(!tonguing)}><span>•</span>{t.scoreViewer.tonguing}</button>
        <button data-tip={t.scoreViewer.fingeringTip} className={fingering?"tool on has-tip":"tool has-tip"} onClick={()=>setFingering(!fingering)}><span>●○</span>{t.scoreViewer.fingering}</button>
<button data-tip={t.scoreViewer.musicalTermsTip} className={theoryEnabled?"tool on has-tip":"tool has-tip"} aria-pressed={theoryEnabled} onClick={()=>setTheoryEnabled(v=>!v)}><span>𝑓</span>{zh?"音乐术语":"Musical terms"}</button></div>
            <button className="reader-settings-reset" onClick={()=>{setSizePreference(.8);setSystemSpacing(12);setNoteSpacing(1);setPageWidth("900")}}>{zh?"恢复默认":"Restore defaults"}</button>
          </ReaderPopover>
        </div>
        <div className="reader-pages" data-mode="pages"><button aria-label={t.scoreViewer.previousPage} disabled={pageIndex<=0} onClick={()=>goToPage(pageIndex-1)}><PracticeIcon name="previous"/></button><button aria-label={t.scoreViewer.nextPage} disabled={pageIndex>=pageCount-1} onClick={()=>goToPage(pageIndex+1)}><PracticeIcon name="next"/></button><span aria-live="polite">{spreadPageCount?`${pageIndex*2+1}${pageIndex*2+2<=spreadPageCount?`–${pageIndex*2+2}`:""} / ${spreadPageCount}`:`${pageIndex+1} / ${pageCount}`}</span><button className={focusMode?"tool on has-tip":"tool has-tip"} aria-pressed={focusMode} data-tip={t.scoreViewer.focusModeTip} aria-label={focusMode?t.scoreViewer.exitFocusMode:t.scoreViewer.enterFocusMode} onClick={toggleFocusMode}><PracticeIcon name={focusMode?"close":"fullscreen"}/>{focusMode?(zh?"退出":"Exit"):(zh?"全屏":"Full")}</button></div>
</div>
</div>
      {annotating&&<div className="markup-row"><div className="markup-row-surface" role="toolbar" aria-label={zh?"批注工具":"Annotation tools"}>
        <button aria-pressed={inkActive&&!eraser} className={inkActive&&!eraser?"markup-icon chosen has-tip":"markup-icon has-tip"} data-tip={t.scoreViewer.pencil} aria-label={t.scoreViewer.pencil} onClick={()=>{setInkActive(true);setEraser(false)}}><svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M13.5 4.5l2 2L6.5 15.5l-3 1 1-3L13.5 4.5z"/><path d="M12 6l2 2"/></svg></button>
        <button aria-pressed={eraser} className={eraser?"markup-icon chosen has-tip":"markup-icon has-tip"} data-tip={t.scoreViewer.eraser} aria-label={t.scoreViewer.eraser} onClick={()=>{setInkActive(true);setEraser(true)}}><svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 15.5L3.8 12.8a1.6 1.6 0 010-2.26l5.7-5.7a1.6 1.6 0 012.26 0l3.66 3.66a1.6 1.6 0 010 2.26l-5.7 5.7a1.6 1.6 0 01-2.26 0z"/><path d="M9.3 7.1l3.6 3.6"/><path d="M3.5 15.5h7.5"/></svg></button>
        <button className="markup-icon has-tip" data-tip={t.scoreViewer.addText} aria-label={t.scoreViewer.addText} onClick={()=>addScoreNote("text")}>T</button>
        <button className="markup-icon has-tip" data-tip={t.scoreViewer.addSticky} aria-label={t.scoreViewer.addSticky} onClick={()=>addScoreNote("sticky")}><i className="sticky-swatch"/></button>
        <span className="divider"/>
        {["#e52e31","#2379c5","#2f9e4c","#222222"].map(c=><button aria-label={t.scoreViewer.useColor(c)} aria-pressed={inkColor===c&&!eraser} key={c} className={inkColor===c&&!eraser?"swatch chosen":"swatch"} style={{background:c}} onClick={()=>{setInkColor(c);setEraser(false);setInkActive(true)}}/>)}
        <span className="divider"/>
        <button className="markup-icon history-control has-tip" data-tip={t.scoreViewer.undo} aria-label={t.scoreViewer.undo} onClick={undoInk} disabled={inkIndex.current<=0}><PracticeIcon name="undo"/></button>
        <button className="markup-icon history-control has-tip" data-tip={t.scoreViewer.redo} aria-label={t.scoreViewer.redo} onClick={redoInk} disabled={inkIndex.current>=inkHistory.current.length-1}><PracticeIcon name="redo"/></button>
        <button className="markup-icon history-control has-tip" data-tip={t.scoreViewer.clearPage} aria-label={t.scoreViewer.clearPage} onClick={clearInk}><svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h12M8 6V4.5a1 1 0 011-1h2a1 1 0 011 1V6M6 6l.6 10.2a1 1 0 001 .8h4.8a1 1 0 001-.8L14 6"/><path d="M8.5 9v5M11.5 9v5"/></svg></button>
        <button className="markup-close" onClick={()=>setAnnotating(false)}>{zh?"关闭":"Close"}</button>
      </div></div>}
      <div className="score-scroll" ref={scoreScrollRef}><div className="score-paper engraved" data-loading={loading}><div className="custom-score-heading"><h1>{title}</h1></div>{loading&&<div className="score-loading"><i className="score-loading__spinner" aria-hidden="true"/><span>{t.scoreViewer.engraving}</span></div>}{error&&<div className="score-error">{error}</div>}<div ref={scoreRef} className="osmd-score" data-theory-enabled={theoryEnabled} onMouseMove={scoreMove} onMouseLeave={()=>{setFingerTip(null);setTheoryTip(null)}} onClick={scoreClick}/><canvas ref={canvasRef} width="1600" height="2200" className={annotating&&inkActive?"ink active":"ink"} onPointerDown={begin} onPointerMove={draw} onPointerUp={saveInk} onPointerCancel={saveInk}/>
        {notes.map(note=><div key={note.id} className={note.kind==="sticky"?"score-note sticky":"score-note text"} style={{left:note.x,top:note.y}} onPointerDown={e=>noteDown(e,note)} onPointerMove={noteMove} onPointerUp={noteUp} onPointerCancel={noteUp}>
          <button type="button" className="score-note__remove" aria-label={t.scoreViewer.deleteNote} onClick={()=>removeScoreNote(note.id)}>×</button>
          <textarea value={note.text} onChange={e=>updateScoreNoteText(note.id,e.target.value)} placeholder={t.scoreViewer.notePlaceholder}/>
        </div>)}
      </div></div>

    </section>{theoryTip&&<div className="theory-tip" style={clampTip(theoryTip.x,theoryTip.y,280,150,"below")}><small>{t.scoreViewer.musicTheory}</small><p>{theoryTip.text}</p></div>}{fingerTip&&<div className={fingering?"flute-tip finger-chart":"flute-tip note-info-tip"} style={clampTip(fingerTip.x,fingerTip.y,340,255,"above")}>{(noteDisplay!=="off"||fingering)&&<strong>{noteDisplay==="solfege"?fingerTip.solfege:fingerTip.name}<sup>{fingerTip.pitch.match(/\d/)?.[0]}</sup></strong>}{rhythmMode!=="off"&&!unmetered&&<p className="note-info-beat">{zh?"拍位":"Beat"} {fingerTip.beat}</p>}{fingering&&<><div className="finger-diagram">{(()=>{
        const entry=fingeringsForMidi(midiForPitch(fingerTip.pitch));
        return entry?<FluteDiagramMini pressed={entry.fingerings[0].keys}/>:<em className="finger-diagram__none">{t.scoreViewer.noFingering}</em>;
      })()}</div><small className="finger-diagram__legend">{t.scoreViewer.fingerChartCaption}</small></>}</div>}</main>
}
