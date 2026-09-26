"use client";

import Link from "next/link";
import PracticeRecorder from "../PracticeRecorder";
import {ReaderPopover} from "./ReaderPopover";

import { useEffect, useRef, useState } from "react";
import {AnnotationLayer} from "./AnnotationLayer";
import { createPortal } from "react-dom";
import type { MusicSheetCalculator, OpenSheetMusicDisplay as OSMDType } from "opensheetmusicdisplay";
import { useLanguage } from "../i18n/LanguageContext";
import { useRecents } from "../lib/storage";
import { deriveScoreEvents, resolveKeyAccidentals } from "./deriveScoreEvents";
import {usePracticeAudio,pitchFrequency} from "../PracticeAudio";
import {PracticeIcon} from "./PracticeIcon";
import {FluteDiagramMini} from "./FluteDiagram";
import {fingeringsForMidi, midiForPitch} from "../../../content/fingerings/flute";
import {SaveButton} from "./SaveButton";
import AccountMenu from "../AccountMenu";
import {notationScale,pageOffsets,pageAt,tabletReader,initialReaderLayout} from "./readerLayout";
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
export type ScoreViewerConfig={title:string;composer:string;asset:string;id:string;backHref:string;backLabel?:string;pdfPath?:string;defaultTempo?:number;pitches?:(string|null)[];events?:{p:string|null;d:number;tied?:boolean;articulation?:ArticulationMode;slurContinuation?:boolean}[];measureStarts?:number[];subtitle?:string;displayPitches?:(string|null)[];noteKeySignatures?:string[][];syllables?:(string|null)[]};
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
/**
 * VexFlow charges every note for the articulation marks hanging off it:
 * Articulation.format does `state.left_shift += width/2; state.right_shift
 * += width/2`, so a staccato dot makes its note ~9px wider on the staff.
 * In Scale Studio that is very visible — switching a scale from plain
 * tongued to staccato took a line from 29 notes down to 15, and the whole
 * book reflowed. It is also not what an engraver does: a staccato dot or a
 * tenuto line is centred under the notehead and claims no horizontal room
 * of its own; only the vertical stacking (which setTextLine handles, and
 * which we leave alone) is real.
 *
 * Patched through an instance rather than an import because OSMD bundles
 * its own private copy of VexFlow and does not re-export it. The flag keeps
 * it to the unmetered exercise books — repertoire keeps whatever spacing
 * VexFlow has always given it.
 */
let suppressArticulationSpacing=false;
let articulationSpacingPatched=false;
type ArticulationModifier={getCategory?:()=>string;constructor:{format?:(articulations:unknown,state:{left_shift:number;right_shift:number})=>boolean}};
function patchArticulationSpacing(osmd:OSMDType){
  if(articulationSpacingPatched)return;
  const measures=(osmd.GraphicSheet?.MeasureList??[]) as {vfVoices?:Record<string,{tickables?:{modifiers?:ArticulationModifier[]}[]}>}[][];
  for(const row of measures)for(const measure of row??[])for(const voice of Object.values(measure?.vfVoices??{}))for(const tickable of voice?.tickables??[])for(const modifier of tickable?.modifiers??[]){
    if(modifier.getCategory?.()!=="articulations")continue;
    const original=modifier.constructor.format;
    if(!original)return;
    modifier.constructor.format=(articulations,state)=>{
      const left=state.left_shift,right=state.right_shift;
      const handled=original(articulations,state);
      if(suppressArticulationSpacing){state.left_shift=left;state.right_shift=right}
      return handled;
    };
    articulationSpacingPatched=true;
    return;
  }
}

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
/** What a host needs to place its own marks on the engraving. */
/**
 * The exercise-book engraving rules, in one place so the reader and the PDF
 * export cannot drift apart: an exercise book has no bar numbers, no time
 * signature, and does not cancel the previous exercise's key with a row of
 * naturals. Returns the courtesy-signature suppressor, which has to be
 * re-applied after every load.
 */
function applyExerciseRules(osmd:OSMDType){
  osmd.setOptions({drawMeasureNumbers:false,newSystemFromXML:true});
  osmd.EngravingRules.RenderTimeSignatures=false;
  // Explicit per-exercise breaks (inserted in OnXMLRead, where the page
  // width is known) replace the global rule — the two would fight, since
  // RenderXMeasuresPerLineAkaSystem forces its own cut at a fixed measure
  // count regardless of where an exercise ends.
  osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem=0;
  // Exercise books are pages of parallel lines, and a final line left at
  // natural width reads as a mistake rather than as the end of a paragraph:
  // it stops short of the margin AND, being unstretched, sits tighter than
  // every justified line above it. balanceSystemBreaks has already made the
  // last line a fair share of its block, so there is nothing to protect it
  // from. Repertoire keeps OSMD's default, where a genuinely short final
  // system should not be stretched across the page.
  osmd.EngravingRules.StretchLastSystemLine=true;
  return ()=>{
    // Independent exercises keep only the opening clef and do not cancel
    // the preceding exercise's key signature with naturals.
    osmd.GraphicSheet.MeasureList.forEach((staffMeasures,index)=>staffMeasures.forEach(measure=>{
      if(index>0)measure.addClefAtBegin=()=>{};
      const addKey=measure.addKeyAtBegin.bind(measure);
      measure.addKeyAtBegin=(current,_previous,clef)=>addKey(current,current,clef);
    }));
    // Courtesy signatures use extra measures created during reflow. Scope
    // their omission to this score's synchronous layout pass.
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
}

/**
 * ♭ and ♯ are not in the font faces a PDF can assume are there, and they
 * come out as mojibake — "D♭ major scale" printed as "D&m major scale",
 * with the letter spacing thrown off to match.
 *
 * This only ever touches the exercise NAMES. Every accidental that belongs
 * to the music — the ones in key signatures and in front of notes — is
 * drawn by VexFlow as a path, not as text, so it converts perfectly and is
 * untouched here. Swapping the two characters for their plain-text
 * spellings is what a teacher would type anyway, and it costs nothing;
 * keeping the real glyphs would mean embedding a Unicode font in every
 * download for two characters.
 */
/**
 * Accidental signs as letters.
 *
 * The PDF is written with jsPDF's built-in Times, which is a Latin-1 font:
 * it has no glyph for ♭, ♯ or any of the double accidentals, so a heading
 * like "D♭ major" comes out as mojibake. Double accidentals go first —
 * 𝄫 is a single code point, but ♭♭ is two, and replacing ♭ first would
 * leave "bb" either way, which is what a flutist reads anyway.
 */
export function plainAccidentals(text:string){
  return text
    .replace(/𝄫/g,"bb").replace(/𝄪/g,"x")
    .replace(/♭/g,"b").replace(/♯/g,"#").replace(/♮/g,"");
}
function plainTextAccidentals(svg:SVGSVGElement){
  for(const node of svg.querySelectorAll("text")){
    const text=node.textContent;
    if(!text)continue;
    const plain=plainAccidentals(text);
    if(plain!==text)node.textContent=plain;
  }
}

/** Width the export stage is laid out at, in px. Only the ratio to
 *  PAGE_MM matters — the SVG is mapped 1:1 onto the PDF page afterwards. */
const PRINT_PAGE_WIDTH=794;
const PAGE_MM={width:210,height:297};
/** Page margin for the export, in OSMD units (≈ millimetres). */
const PRINT_MARGIN=8;
/**
 * Top margin, wider than the rest so the title and the byline have a band
 * of their own to sit in — at the default the byline landed on top of the
 * first scale.
 *
 * It goes on every page, not just the first: OSMD uses the NARROW top
 * margin on every page when it is not drawing a title itself, which is our
 * case, so PageTopMargin alone does nothing and both have to be set. An
 * even top margin throughout is normal in printed music anyway.
 *
 * Units are OSMD's, not millimetres — empirically about 1.87mm each, so 13
 * puts the first ink around 25mm down, clear of a byline whose baseline is
 * at 19mm.
 */
const PRINT_TOP_MARGIN=13;
/**
 * One staff space on paper, in millimetres — the single number that decides
 * how big the printed music is, and the reason the export ignores the
 * reader's notation-size setting entirely. Engravers quote this as a
 * rastral: 1.75mm is score size, 2.2mm is a large method book. 1.9mm sits
 * where a printed solo part normally does, which is what a handout is.
 */
const STAFF_SPACE_MM=1.9;
/** Whose studio made the handout, under the title on the first page. */
const BYLINE="Cookie Flute Studio";
/**
 * Measures a rendered staff space, in millimetres of the finished page.
 *
 * Off a notehead, because it is the one dimension that is both trivial to
 * find in the DOM and fixed by convention: a black notehead is 1.18 staff
 * spaces wide in every engraving tradition. The staff lines themselves
 * carry no class of their own, and the enclosing .staffline box grows with
 * ledger lines and high notes, so measuring that reports whatever the
 * music happens to reach rather than the staff.
 */
function staffSpaceMm(stage:HTMLElement){
  const svg=stage.querySelector<SVGSVGElement>(":scope > div > svg");
  const head=svg?.querySelector<SVGGElement>(".vf-notehead");
  const viewWidth=svg?.viewBox.baseVal.width;
  if(!svg||!head||!viewWidth)return 0;
  const spaceInViewUnits=head.getBBox().width/1.18;
  // The viewBox spans the whole page, so view units convert straight to mm.
  return spaceInViewUnits*(PAGE_MM.width/viewWidth);
}

export type OverlayVisibility={names:boolean;solfege:boolean;accidentals:boolean;tonguing:boolean;counts:boolean;sticks:boolean};
/** What a host needs to place its own marks on the engraving. */
export type ScoreMarksContext={root:HTMLDivElement|null;version:number;magnify:number;controls:ReaderControls};
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
function placePracticeOverlays(root:HTMLDivElement,scoreEvents:{p:string|null;d:number}[],measureStarts:number[],unitsPerBeat:number,keyAccidentals:Set<string>,displayPitches?:(string|null)[],noteKeys?:string[][],unmetered=false,syllables?:(string|null)[],visible:OverlayVisibility={names:true,solfege:true,accidentals:true,tonguing:true,counts:true,sticks:true}){root.querySelectorAll(".practice-overlay").forEach(n=>n.remove());
const all=[...root.querySelectorAll<SVGGElement>(".vf-stavenote[data-event]")],step=unitsPerBeat/4;
// EVERY layout read happens here, before a single node is appended. Mixing
// reads and writes forces the browser to re-lay-out the whole score on each
// read; in a book of a few thousand notes that alone was seconds of work.
const rootBox=root.getBoundingClientRect();
const markedThisMeasure=new Set<string>();
let accidentalMeasure=-1;
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
// Which letters have already been marked in the bar currently being laid
// out. An accidental holds for the rest of its measure, so a B♭ written
// once applies to every later B in that bar — those repeats are marked
// too, in a second colour, because the player has to remember them rather
// than read them.
group.forEach(note=>{const index=Number(note.dataset.event),event=scoreEvents[index];
  // A grace note borrows its time from the note it decorates rather than
  // occupying a beat position of its own (deriveScoreEvents gives it
  // d=0, the only events that ever do) — it isn't "on" any beat, so it
  // gets no note-name/solfège/count label at all, rather than a label
  // that duplicates or crowds out the main note right next to it.
  if(event?.d===0)return;
  const box=noteBox.get(note)!,x=box.left-rootBox.left+box.width/2;
  if(event?.p){
    const written=displayPitches?.[index]??event.p;
    const letter=written.replace(/\d/,"");
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
    if(visible.accidentals){
      if(measure!==accidentalMeasure){markedThisMeasure.clear();accidentalMeasure=measure}
      const keySig=noteKeys?.[index]??[...keyAccidentals];
      const base=letter[0];
      // What the key signature alters. Never printed beside the note, so
      // always marked.
      const inKeySig=keySig.includes(letter);
      // What the staff prints for itself: an accidental the signature does
      // not account for, and a natural cancelling one that it does.
      const writtenNatural=letter.length===1&&keySig.some(entry=>entry[0]===base);
      const writtenAccidental=(letter.length>1&&!inKeySig)||writtenNatural;
      // The engraver prints an accidental once per bar per octave, so a
      // note that returns later in the same bar — the descent of a scale
      // that turned around inside it — carries no sign at all. That is
      // exactly where a reminder is worth having. Keyed on the written
      // pitch, octave included, because an accidental only governs its own
      // octave and the same letter an octave away IS printed again.
      const carried=writtenAccidental&&markedThisMeasure.has(written);
      if(inKeySig||carried){
        const head=headBox.get(note)??box;
        const size=Math.round(Math.max(11,Math.min(26,head.height*2.1)));
        // Spelled from the key signature where that is what is being
        // marked: the derived pitch normalises enharmonics, so a staff C♯
        // arrives here as D♭ and would print the wrong symbol.
        const glyph=inKeySig?(keySig.find(entry=>entry[0]===base)??letter).slice(1)
          :writtenNatural?"♮":letter.slice(1);
        const mark=overlay(root,`accidental-marker${carried?" is-carried":""}`,glyph,head.left-rootBox.left+head.width/2,box.top-rootBox.top-size*1.25-3);
        mark.style.fontSize=`${size}px`;
      }
      if(writtenAccidental)markedThisMeasure.add(written);
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

/** Major and relative-minor keys by number of sharps, then by number of flats. */
const SHARP_KEYS=[["C","A"],["G","E"],["D","B"],["A","F♯"],["E","C♯"],["B","G♯"],["F♯","D♯"],["C♯","A♯"]];
const FLAT_KEYS=[["C","A"],["F","D"],["B♭","G"],["E♭","C"],["A♭","F"],["D♭","B♭"],["G♭","E♭"],["C♭","A♭"]];

/**
 * What a key signature actually says.
 *
 * "Key signature: shows which notes are sharped or flatted" describes the
 * concept, which is no use when you are looking at three flats and want to
 * know which three. The altered notes come from the score's own per-measure
 * key data, so the answer is the engraved key rather than a guess.
 */
/** Key signatures add their accidentals in a fixed order. */
const SHARP_ORDER=["F♯","C♯","G♯","D♯","A♯","E♯","B♯"];
const FLAT_ORDER=["B♭","E♭","A♭","D♭","G♭","C♭","F♭"];

function keySignatureText(raw:string[]){
  const altered=[...new Set(raw)];
  if(!altered.length)return "None — C major or A minor. No note is sharped or flatted unless an accidental says so.";
  const flats=altered.some(note=>note.includes("♭"));
  const order=flats?FLAT_ORDER:SHARP_ORDER;
  // Only name a key when the accidentals really are the first n of the
  // standard order. The caller's list can hold more than the signature —
  // naming a key off a list that is not a key signature would state a
  // confident wrong fact, which is worse than the vague sentence it replaced.
  const sorted=[...altered].sort((a,b)=>order.indexOf(a)-order.indexOf(b));
  const canonical=sorted.every((note,index)=>note===order[index]);
  const list=sorted.length===1?sorted[0]
    :`${sorted.slice(0,-1).join(", ")} and ${sorted[sorted.length-1]}`;
  if(!canonical)return `Every ${list} is ${flats?"flattened":"sharpened"} here, unless an accidental changes one.`;
  const pair=(flats?FLAT_KEYS:SHARP_KEYS)[sorted.length];
  return `${pair[0]} major or ${pair[1]} minor. Every ${list} is ${flats?"flattened":"sharpened"} for the rest of the line, unless an accidental changes one.`;
}

/**
 * A fermata is a modifier glyph hanging off a notehead, and VexFlow gives it
 * no class of its own — it is a bare <path> inside .vf-modifiers, exactly
 * like an accidental. Shape tells them apart: a fermata is a wide, shallow
 * arc (about 18x10), while accidentals are tall and narrow (6x22) and a
 * tenuto is a near-flat line. Comparing width to height rather than to fixed
 * pixels keeps it true at any zoom.
 *
 * This matters beyond the tooltip text: score clicks give [data-theory] the
 * first say and return, so tagging the fermata is also what stops a tap on
 * it being read as a tap on the note underneath — which was starting a drone.
 */
function tagFermatas(root:HTMLDivElement,text:string){
  root.querySelectorAll<SVGPathElement>(".vf-modifiers path").forEach(path=>{
    const box=path.getBoundingClientRect();
    if(!box.width||!box.height)return;
    const wide=box.width>box.height*1.35, notALine=box.height>box.width*0.3;
    if(!wide||!notALine)return;
    path.dataset.theoryTitle="Fermata";
    path.dataset.theory=text;
    path.classList.add("theory-target");
  });
}

function addTheoryTargets(root:HTMLDivElement,noteKeys?:string[][]){
  const targets:[string,string,string][]=[
    [".vf-clef","Treble clef","The curl circles the G line. Flute music is normally written in this clef."],
    [".vf-timesignature","Time signature","The top number gives beats per measure; the bottom number identifies the beat value."],
    [".vf-stavetie","Tie","Hold the connected notes as one continuous sound. Do not tongue the second note."],
  ];
  targets.forEach(([selector,title,text])=>root.querySelectorAll<SVGElement>(selector).forEach(node=>{node.dataset.theoryTitle=title;node.dataset.theory=text;node.classList.add("theory-target")}));

  tagFermatas(root,"Hold the note longer than its written value — how much longer is your choice. Here it marks the end of the exercise, so let the sound settle before you stop.");

  // Which key a signature announces depends on where it sits, and a scale
  // book changes key every few lines. The nearest note after it carries the
  // event index that says which measure that is.
  const notes=[...root.querySelectorAll<SVGGElement>(".vf-stavenote[data-event]")];
  root.querySelectorAll<SVGElement>(".vf-keysignature").forEach(node=>{
    let altered:string[]|undefined;
    if(noteKeys){
      // The first note after the signature carries the signature it is
      // written under, so there is nothing to compute.
      const next=notes.find(note=>node.compareDocumentPosition(note)&Node.DOCUMENT_POSITION_FOLLOWING);
      const event=next?Number(next.dataset.event):NaN;
      if(Number.isFinite(event))altered=noteKeys[event];
    }
    node.dataset.theoryTitle="Key signature";
    node.dataset.theory=altered?keySignatureText(altered)
      :"Shows which notes are sharped or flatted for the rest of the piece, unless an accidental changes one.";
    node.classList.add("theory-target");
  });
}

function prepareScore(xml: string,title:string) {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  document.querySelector("work-title")?.replaceChildren(title);
  document.querySelectorAll('creator[type="composer"]').forEach(node => node.remove());
  return new XMLSerializer().serializeToString(document);
}

export type ReaderControls={
  /** Write the score out as a PDF file the reader can keep. */
  download:()=>void;
  /** True while that PDF is being written. */
  exporting:boolean;
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
  /**
   * The event the music is ON right now, which is not where it started —
   * a host listing exercises needs the moving one to know which of them is
   * sounding once playback has run past the first.
   */
  playingEvent:number|null;
};
export function ScoreViewer({config,toolbar,settings,aside,printConfig,practiceActions,practiceRow,stage,dock,onPracticeNote,practiceEvent,defaultNoteSpacing,onTempoChange,unmetered=false,lineBreak,practiceTempo,scoreMarks,headerActions,save,extraSystemSpacing=0}:{config:ScoreViewerConfig;toolbar?:React.ReactNode;settings?:(controls:ReaderControls)=>React.ReactNode;/** Pinned below the music inside the scroll area — for a live readout that has to stay visible while the page scrolls. */aside?:React.ReactNode;/** Title and music to print instead of what is on screen. The PDF is written with jsPDF's built-in Latin-1 fonts, which cannot encode Chinese at all, so a Chinese book prints from an English copy of itself. */printConfig?:{title:string;asset:string};practiceActions?:React.ReactNode;/** A tool row of the host's own, stacked above mark-up's row so both modes can be open at once. */practiceRow?:React.ReactNode;/** Replaces the music area in place (e.g. a close-up view) while the toolbar stays. The engraving stays mounted underneath so its layout survives the switch. */stage?:React.ReactNode|((view:{fingering:boolean})=>React.ReactNode);/** A panel under the music, on the same canvas, that shrinks the score instead of covering it. */dock?:React.ReactNode;onPracticeNote?:(event:number)=>void;practiceEvent?:number;/** Starting note spacing, for books whose notes are faster than the exercise default assumes. Overridden by a saved preference. */defaultNoteSpacing?:number;onTempoChange?:(tempo:number)=>void;unmetered?:boolean;lineBreak?:{value:boolean;onChange:(value:boolean)=>void};practiceTempo?:{value:boolean;onChange:(value:boolean)=>void};scoreMarks?:(context:ScoreMarksContext)=>React.ReactNode;headerActions?:(controls:ReaderControls)=>React.ReactNode;save?:{saved:boolean;onToggle:()=>void;label:string;savedLabel:string};extraSystemSpacing?:number}) {
  const {t,lang}=useLanguage();
  const zh=lang==="zh";
  const {bpm,setBpm,metro,toggleMetro,toggleDrone,stopAllDrones,drones,initializeScore,setAccent}=usePracticeAudio();
  const [droneArmed,setDroneArmed]=useState(false);
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
  const scoreRef = useRef<HTMLDivElement>(null); const scoreScrollRef = useRef<HTMLDivElement>(null); const osmdRef = useRef<OSMDType | null>(null);
  // Scroll offsets (within .score-scroll's own content, not the viewport)
  // where each computed "page" starts — see computePages(). Kept in a ref
  // rather than state since only page TURNS need to re-render; the offsets
  // themselves are consumed imperatively by goToPage/the scroll-snap effect.
  const pageOffsetsRef = useRef<number[]>([0]);
  const audioRef = useRef<AudioContext | null>(null); const playbackTimers=useRef<number[]>([]); const playbackNodes=useRef<OscillatorNode[]>([]); const playbackPosition=useRef<{audioStart:number;unit:number;from:number}|null>(null);
  // Which overlay rows are actually on screen. Held in a ref because the
  // layout pass also runs from a ResizeObserver and from the load effect,
  // neither of which re-closes over current state.
  const overlayVisibilityRef=useRef<OverlayVisibility>({names:false,solfege:false,accidentals:false,tonguing:true,counts:false,sticks:false});
  const [loading,setLoading]=useState(true); const [error,setError]=useState(""); const [startMeasure,setStartMeasure]=useState(1); const [playing,setPlaying]=useState(false); const [playingFrom,setPlayingFrom]=useState<number|null>(null); const [playingEvent,setPlayingEvent]=useState<number|null>(null); const [annotating,setAnnotating]=useState(false);
  const [annotationToolbar,setAnnotationToolbar]=useState<HTMLDivElement|null>(null);
  const annotatingRef=useRef(false);
  useEffect(()=>{annotatingRef.current=annotating;if(annotating){setFingerTip(null);setTheoryTip(null)}},[annotating]);
  // Page-turn mode: false (free scroll) by default until the mount effect
  // below picks a real default (stored preference, else viewport width) —
  // starting false keeps first paint identical between server and client.
  const [pageIndex,setPageIndex]=useState(0); const [pageCount,setPageCount]=useState(1);
  // Focus mode: hides the global nav/topbar/practice-bar and, where the
  // platform allows it, requests real fullscreen — an iPad-PDF-reader-style
  // "tap the page to read distraction-free" mode. See scoreClick below for
  // the tap trigger and the effect further down for the fullscreen attempt.
  const [focusMode,setFocusMode]=useState(false);
  const [noteDisplay,setNoteDisplay]=useState<NoteDisplay>("off"); const [accidentals,setAccidentals]=useState(false); const [tonguing,setTonguing]=useState(true); const [fingering,setFingering]=useState(false); const [rhythmMode,setRhythmMode]=useState<RhythmMode>("off");  const [magnify,setMagnify]=useState(1); const [fingerTip,setFingerTip]=useState<{pitch:string;name:string;octave:string;solfege:string;beat:string;x:number;y:number}|null>(null); const [theoryTip,setTheoryTip]=useState<{title:string;text:string;x:number;y:number}|null>(null); const [favorite,setFavorite]=useState(false);
  const [theoryEnabled,setTheoryEnabled]=useState(false),[sizePreference,setSizePreference]=useState(.8);
  const sizePreferenceRef=useRef(sizePreference);
  // How much vertical gap OSMD leaves between systems — user-adjustable
  // (see the Score settings panel) rather than a fixed constant, since
  // "enough breathing room" is a matter of taste once it's in a reasonable
  // range. 12 matches standard engraving density.
  const [systemSpacing,setSystemSpacing]=useState(12);
  const systemSpacingRef=useRef(systemSpacing);
  // Extra room a host asks for above every system, on top of whatever the
  // reader's own System spacing setting is. Scale Studio uses it to open a
  // real lane for its practice tempos — an annotation printed into a gap
  // that was never sized for one lands on the beams of the system above.
  const extraSystemSpacingRef=useRef(extraSystemSpacing);
  const systemSpacingTotal=()=>systemSpacingRef.current+extraSystemSpacingRef.current;
  // How much room each note gets along the staff. Notation size scales the
  // whole engraving; this changes only how tightly notes are packed, which
  // is what decides how much music fits on a line.
  const [noteSpacing,setNoteSpacing]=useState(defaultNoteSpacing??(unmetered?0.82:1));
  const noteSpacingRef=useRef(noteSpacing);
  const marksLayerRef=useRef<HTMLDivElement|null>(null);
  const [marksLayer,setMarksLayer]=useState<HTMLDivElement|null>(null);
  // Bumped after every engrave so a host drawing on the score knows its
  // measurements are stale — note positions change on any re-render.
  const [layoutVersion,setLayoutVersion]=useState(0);
  const readerAnchor=useRef<{event:string;offset:number}|null>(null);
  /** Last tempo actually handed to onTempoChange; null until the first. */
  const reportTempo=useRef<number|null>(null);
  const [pageWidth,setPageWidth]=useState("900");

  /**
   * How the reader is set up is a fact about your eyes, not about the
   * piece — so it is stored once and restored everywhere, rather than
   * reset on every reload (and lost entirely whenever Scale Studio
   * rebuilt its id from a new set of scales).
   *
   * Metered and unmetered books keep separate settings: an exercise book
   * of sixteenth-note runs wants tighter packing than a piece does.
   */
  const viewPrefsKey=`cookie:reader-view:${unmetered?"exercise":"piece"}:v1`;
  const viewPrefsLoaded=useRef(false);
  useEffect(()=>{
    try{
      const saved=JSON.parse(localStorage.getItem(viewPrefsKey)||"null");
      /* eslint-disable react-hooks/set-state-in-effect */
      const tablet=tabletReader(navigator.maxTouchPoints,Math.min(screen.width,screen.height));
      const tabletKey=`${viewPrefsKey}:tablet-layout`;
      const tabletLayout=tablet?localStorage.getItem(tabletKey):null;
      setPageWidth(initialReaderLayout(tablet,saved?.pageWidth,tabletLayout));
      if(saved){
        if(Number.isFinite(saved.sizePreference))setSizePreference(saved.sizePreference);
        if(Number.isFinite(saved.systemSpacing))setSystemSpacing(saved.systemSpacing);
        if(Number.isFinite(saved.noteSpacing))setNoteSpacing(saved.noteSpacing);
        if(typeof saved.noteDisplay==="string")setNoteDisplay(saved.noteDisplay);
        if(typeof saved.accidentals==="boolean")setAccidentals(saved.accidentals);
        if(typeof saved.tonguing==="boolean")setTonguing(saved.tonguing);
        if(typeof saved.fingering==="boolean")setFingering(saved.fingering);
        if(typeof saved.rhythmMode==="string")setRhythmMode(saved.rhythmMode);
        /* eslint-enable react-hooks/set-state-in-effect */
      }
    }catch{/* Unreadable preferences fall back to the defaults. */}
    viewPrefsLoaded.current=true;
  },[viewPrefsKey]);
  useEffect(()=>{
    // Only after the restore pass, or the defaults would overwrite what
    // was saved before it had a chance to load.
    if(!viewPrefsLoaded.current)return;
    try{
      localStorage.setItem(viewPrefsKey,JSON.stringify({
        sizePreference,systemSpacing,noteSpacing,pageWidth,
        noteDisplay,accidentals,tonguing,fingering,rhythmMode,
      }));
    }catch{/* Storage may be disabled. */}
  },[viewPrefsKey,sizePreference,systemSpacing,noteSpacing,pageWidth,noteDisplay,accidentals,tonguing,fingering,rhythmMode]);
  const [spreadPageCount,setSpreadPageCount]=useState(0);
  const originalPageMargins=useRef<{left:number;right:number;top:number;narrow:number;bottom:number}|null>(null);
  const pageWidthRef=useRef(pageWidth);
  // True only while the score is being re-engraved for paper. A ref as well
  // as state because layoutScore() reads it synchronously, outside React.
  /** True while the PDF is being written, so the button can say so. */
  const exportingRef=useRef(false);
  const [exporting,setExporting]=useState(false);
  const pageTargetRef=useRef<number|null>(null);
  const metroTaps=useRef<number[]>([]);
  function tapTempo(){const now=performance.now();metroTaps.current=[...metroTaps.current.filter(t=>now-t<3000),now].slice(-5);const taps=metroTaps.current;if(taps.length>1)setBpm(60000/((now-taps[0])/(taps.length-1)))}
  const selectedEventRef=useRef<number|null>(null);
  useEffect(()=>{initializeScore(id,config.defaultTempo??76)},[id]);
  // An unmetered book has no bar lines, so there is no downbeat for the
  // metronome to lean on — a stressed beat every four clicks implies a 4/4
  // that is not there.
  useEffect(()=>{setAccent(!unmetered)},[unmetered,setAccent]);
  function cycleNoteDisplay(){setNoteDisplay(current=>current==="off"?"names":current==="names"?"solfege":"off")}
  function cycleRhythm(){setRhythmMode(current=>current==="off"?"counts":current==="counts"?"bars":"off")}

  useEffect(()=>{record(id)},[id,record]);

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
    root.querySelectorAll<SVGGElement>(".vf-stavenote").forEach((node,index)=>{node.dataset.event=String(index);node.classList.toggle("playback-start",index===selectedEventRef.current);node.dataset.measure=String(measureForEvent(index,seq.measureStarts));const pitch=seq.pitches[index];if(pitch)node.dataset.pitch=pitch;const written=config.displayPitches?.[index];if(written){node.dataset.noteName=written.replace(/\d/,"");const octave=written.match(/\d/)?.[0];if(octave)node.dataset.noteOctave=octave}});
    placePracticeOverlays(root,seq.events,seq.measureStarts,seq.unitsPerBeat,seq.keyAccidentals??new Set(),config.displayPitches,config.noteKeySignatures,unmetered,config.syllables,overlayVisibilityRef.current);
    addTheoryTargets(root,config.noteKeySignatures);
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
    updatePageCut();
  }
  /**
   * A page is a run of whole systems, but the view is a fixed-height window,
   * so the next page's first system used to show sliced in half at the
   * bottom. When the view sits exactly on a page start, fade the notation out
   * just above the next page instead. Free scrolling (between page starts)
   * shows everything, so nothing appears in chunks. Only the engraving is
   * masked; the paper stays white to the bottom.
   */
  function updatePageCut(){
    const root=scoreRef.current,scroller=scoreScrollRef.current;
    if(!root||!scroller)return;
    const offsets=pageOffsetsRef.current,top=scroller.scrollTop;
    const at=offsets.findIndex(offset=>Math.abs(offset-top)<2);
    const next=at>=0?offsets[at+1]:undefined;
    if(next===undefined||next-top>=scroller.clientHeight||root.classList.contains("score-spread")){delete root.dataset.pageCut;return}
    const rootTop=root.getBoundingClientRect().top-scroller.getBoundingClientRect().top+top;
    root.style.setProperty("--page-cut",`${(next-rootTop)/magnifyRef.current}px`);
    root.dataset.pageCut="true";
  }
  useEffect(()=>{
    const scroller=scoreScrollRef.current;if(!scroller)return;
    scroller.addEventListener("scroll",updatePageCut,{passive:true});
    return()=>scroller.removeEventListener("scroll",updatePageCut);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reads refs only
  },[]);
  function resync(){syncNotesAndOverlays();computePages();mountMarksLayer()}
  /** Jump to the very start, in either page-turn or free-scroll mode. */
  function backToTop(){
    readerAnchor.current=null;
    setPageIndex(0);
    scoreScrollRef.current?.scrollTo({top:0,behavior:"smooth"});
  }
  /**
   * A host-owned layer pinned inside the engraving, for things the PAGE
   * wants to put on the music (Scale Studio's practice tempos) rather than
   * things the reader itself draws. It is a plain div React portals into,
   * re-appended after every engrave because OSMD clears .osmd-score's
   * children whenever it redraws. Coordinates inside it are .osmd-score's
   * own, which is the same frame the practice overlays already use.
   */
  function mountMarksLayer(){
    const root=scoreRef.current;if(!root)return;
    let layer=marksLayerRef.current;
    if(!layer){layer=document.createElement("div");layer.className="score-marks";marksLayerRef.current=layer;setMarksLayer(layer)}
    if(layer.parentElement!==root)root.appendChild(layer);
    setLayoutVersion(version=>version+1);
  }
  function rememberPosition(){
    const scroller=scoreScrollRef.current,root=scoreRef.current;if(!scroller||!root)return;
    if(scroller.scrollTop<8){readerAnchor.current=null;return}
    const top=scroller.getBoundingClientRect().top;
    const note=[...root.querySelectorAll<SVGElement>("[data-event]")].find(node=>node.getBoundingClientRect().bottom>=top);
    if(note)readerAnchor.current={event:note.dataset.event!,offset:(note.getBoundingClientRect().top-top)/magnifyRef.current};
  }
  /**
   * The width and zoom layoutScore() would pick, applied BEFORE the first
   * engrave rather than only after it. Without this the initial render ran
   * at the paper's unset width and at full notation size (the `preference`
   * argument was simply left off), so every re-engrave — which in Scale
   * Studio means every settings change — produced one throwaway layout
   * around a third too big before layoutScore() corrected it. It was
   * hidden, but the hide is what the eye read as a glitch: the music
   * blanked out and snapped back at a different size. Matching the two up
   * front means the first layout is already the final one.
   */
  /** Every engrave goes through here so the articulation-spacing patch is
   *  in force for exactly the renders it should apply to. */
  function renderScore(osmd:OSMDType){
    suppressArticulationSpacing=unmetered;
    try{osmd.render()}finally{suppressArticulationSpacing=false}
  }
  function prepareLayoutBox(){
    const osmd=osmdRef.current,scroller=scoreScrollRef.current,root=scoreRef.current;
    if(!scroller)return;
    if(root?.parentElement){
      const padding=getComputedStyle(scroller);
      root.parentElement.style.width=`${scroller.clientWidth-parseFloat(padding.paddingLeft)-parseFloat(padding.paddingRight)}px`;
    }
    const spread=pageWidthRef.current==="spread"&&scroller.clientWidth>=1000;
    const zoom=notationScale(spread?scroller.clientWidth/2:scroller.clientWidth,scroller.clientHeight,sizePreferenceRef.current);
    if(osmd)osmd.zoom=zoom;
    return zoom;
  }
  function layoutScore(){
    const osmd=osmdRef.current,scroller=scoreScrollRef.current,root=scoreRef.current;if(!osmd||!scroller||!root)return;
    const anchor=readerAnchor.current;
    const spread=pageWidthRef.current==="spread"&&scroller.clientWidth>=1000;
    const paged=spread;
    root.classList.toggle("score-spread",spread);
    osmd.setOptions({pageFormat:paged?"A4 P":"Endless",drawTitle:spread});
    scroller.classList.toggle("spread-viewport",spread);
    const margins=originalPageMargins.current;
    if(margins){osmd.EngravingRules.PageLeftMargin=paged?8:margins.left;osmd.EngravingRules.PageRightMargin=paged?8:margins.right;osmd.EngravingRules.PageTopMargin=paged?8:margins.top;osmd.EngravingRules.PageTopMarginNarrow=paged?8:margins.narrow;osmd.EngravingRules.PageBottomMargin=paged?8:margins.bottom;}
    const padding=getComputedStyle(scroller);
    const width=scroller.clientWidth-parseFloat(padding.paddingLeft)-parseFloat(padding.paddingRight);
    if(root.parentElement)root.parentElement.style.width=`${width}px`;
    osmd.zoom=notationScale(spread?scroller.clientWidth/2:scroller.clientWidth,scroller.clientHeight,sizePreferenceRef.current);
    osmd.EngravingRules.MinimumDistanceBetweenSystems=systemSpacingTotal();
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
    renderScore(osmd);root.style.width=spread?`${spreadWidth}px`:"";resync();
    if(spread){const offsets=pageOffsetsRef.current;scroller.scrollTop=offsets[Math.min(pageIndex,offsets.length-1)]??0;}
    else if(anchor){const node=root.querySelector<SVGElement>(`[data-event="${anchor.event}"]`);if(node)scroller.scrollTop+=node.getBoundingClientRect().top-scroller.getBoundingClientRect().top-anchor.offset*magnifyRef.current}
    else scroller.scrollTop=0;
    computePages();
  }
  useEffect(()=>{
    if(practiceEvent===undefined)return;
    const frame=requestAnimationFrame(()=>{
      const root=scoreRef.current,scroller=scoreScrollRef.current;
      const note=root?.querySelector<SVGGElement>(`.vf-stavenote[data-event="${practiceEvent}"]`);
      if(!note||!scroller||!scroller.clientHeight)return;
      const box=note.getBoundingClientRect(),viewport=scroller.getBoundingClientRect();
      if(box.top>=viewport.top+25&&box.bottom<=viewport.bottom-25)return;
      const absoluteTop=box.top-viewport.top+scroller.scrollTop;
      const offsets=pageOffsetsRef.current;
      let page=0;
      for(let i=0;i<offsets.length;i++)if(offsets[i]<=absoluteTop)page=i;
      pageTargetRef.current=offsets[page]??0;
      setPageIndex(page);
      scroller.scrollTo({top:offsets[page]??0,behavior:"instant"});
    });
    return()=>cancelAnimationFrame(frame);
  },[practiceEvent,layoutVersion]);

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
  function zoomAnnotations(value:number,x:number,y:number){
    const el=scoreScrollRef.current;if(!el)return;
    const next=Math.max(.5,Math.min(3,value)),old=magnifyRef.current,box=el.getBoundingClientRect();
    const px=x-box.left,py=y-box.top,left=(el.scrollLeft+px)*next/old-px,top=(el.scrollTop+py)*next/old-py;
    magnifyRef.current=next;
    el.closest<HTMLElement>(".restored-reader")?.style.setProperty("--viewer-magnify",String(next));
    setMagnify(next);el.scrollLeft=left;el.scrollTop=top;
  }
  useEffect(()=>{magnifyRef.current=magnify},[magnify]);
  useEffect(()=>{
    const el=scoreScrollRef.current;if(!el)return;
    let frame=0,touchDistance=0,touchZoom=1,gestureZoom=1;
    // The magnification is written straight to the custom property while a
    // gesture is running, and only committed to React state when it ends.
    // Calling setMagnify on every touchmove re-rendered the whole reader
    // dozens of times a second, which is what made a pinch shake and flash.
    const surface=el.closest<HTMLElement>(".restored-reader");
    let commit=0;
    function apply(value:number,x:number,y:number){
      const next=Math.max(.5,Math.min(3,value)),old=magnifyRef.current,box=el!.getBoundingClientRect();
      const px=x-box.left,py=y-box.top,left=(el!.scrollLeft+px)*next/old-px,top=(el!.scrollTop+py)*next/old-py;
      magnifyRef.current=next;
      surface?.style.setProperty("--viewer-magnify",String(next));
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{el!.scrollLeft=left;el!.scrollTop=top;rememberPosition()});
      // One state update once the fingers settle, so the scrollable area is
      // re-reserved and anything else watching magnify sees the final value.
      window.clearTimeout(commit);
      commit=window.setTimeout(()=>setMagnify(magnifyRef.current),140);
    }
    function wheel(e:WheelEvent){if(!e.ctrlKey)return;e.preventDefault();if(el?.querySelector('.annotation-layer[data-drawing="true"]'))return;apply(magnifyRef.current*Math.exp(-e.deltaY*.008),e.clientX,e.clientY)}
    function start(e:TouchEvent){if(annotatingRef.current||e.touches.length!==2)return;e.preventDefault();touchDistance=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);touchZoom=magnifyRef.current}
    function move(e:TouchEvent){if(annotatingRef.current||e.touches.length!==2||!touchDistance)return;e.preventDefault();const [a,b]=[e.touches[0],e.touches[1]];apply(touchZoom*Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)/touchDistance,(a.clientX+b.clientX)/2,(a.clientY+b.clientY)/2)}
    function end(){touchDistance=0}
    function gestureStart(e:Event){e.preventDefault();if(annotatingRef.current)return;gestureZoom=magnifyRef.current}
    function gestureChange(e:Event){e.preventDefault();if(annotatingRef.current||touchDistance)return;const g=e as Event&{scale:number;clientX:number;clientY:number};apply(gestureZoom*g.scale,g.clientX,g.clientY)}
    el.addEventListener("wheel",wheel,{passive:false});el.addEventListener("touchstart",start,{passive:false});el.addEventListener("touchmove",move,{passive:false});el.addEventListener("touchend",end);el.addEventListener("touchcancel",end);el.addEventListener("gesturestart",gestureStart);el.addEventListener("gesturechange",gestureChange);
    return()=>{cancelAnimationFrame(frame);window.clearTimeout(commit);el.removeEventListener("wheel",wheel);el.removeEventListener("touchstart",start);el.removeEventListener("touchmove",move);el.removeEventListener("touchend",end);el.removeEventListener("touchcancel",end);el.removeEventListener("gesturestart",gestureStart);el.removeEventListener("gesturechange",gestureChange)};
  },[]);

  useEffect(()=>{const saved=JSON.parse(localStorage.getItem("cookie:music-favorites")||"[]") as string[];setFavorite(saved.includes(id));let mounted=true; async function load(){ try { if(unmetered&&!asset.includes("<note>")){scoreRef.current?.replaceChildren();osmdRef.current=null;setLoading(false);return;} setLoading(true); const {OpenSheetMusicDisplay}=await import("opensheetmusicdisplay"); if(!mounted||!scoreRef.current)return; scoreRef.current.replaceChildren(); const osmd=new OpenSheetMusicDisplay(scoreRef.current,{backend:"svg",autoResize:false,drawTitle:false,drawComposer:false,drawingParameters:"compacttight"}); osmd.setOptions({pageFormat:"Endless",drawMeasureNumbers:true,drawPartNames:false,drawMetronomeMarks:true}); osmd.OnXMLRead = xml=>{if(config.defaultTempo===undefined){const doc=new DOMParser().parseFromString(xml,"application/xml");const marked=Number(doc.querySelector("sound[tempo]")?.getAttribute("tempo"));if(marked>0)initializeScore(id,marked)}return prepareScore(xml,title)}; await osmd.load(asset,title); if(!mounted||!scoreRef.current)return;
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
      osmd.EngravingRules.MinimumDistanceBetweenSystems=systemSpacingTotal();
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
        suppressCourtesySignatures=applyExerciseRules(osmd);
        suppressCourtesySignatures();
      }
      // AFTER load, never before: osmd.load() resets zoom to 1, which is
      // what made the first engrave of every re-render land a third too
      // large before layoutScore() pulled it back.
      osmd.zoom=prepareLayoutBox()??osmd.zoom;
      patchArticulationSpacing(osmd);
      renderScore(osmd);
      osmdRef.current=osmd; if(!config.pitches)sequenceRef.current={...deriveScoreEvents(osmd),keyAccidentals:new Set()};
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
            osmd.zoom=prepareLayoutBox()??osmd.zoom;
            renderScore(osmd);
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
  // The spinner announces a real wait, not the ~150ms a re-engrave takes
  // after a settings change. Flashing it on every click was half of what
  // made changing a scale feel glitchy: spinner in, spinner out, before
  // you had finished reading the word. It only appears if the engrave is
  // genuinely slow — a first load, or a very large book.
  const [showSpinner,setShowSpinner]=useState(false);
  useEffect(()=>{
    if(!loading){setShowSpinner(false);return}
    const timer=window.setTimeout(()=>setShowSpinner(true),450);
    return()=>window.clearTimeout(timer);
  },[loading]);
  useEffect(()=>{sizePreferenceRef.current=sizePreference;rememberPosition();layoutScore()},[sizePreference]);
  useEffect(()=>{pageWidthRef.current=pageWidth;rememberPosition();layoutScore()},[pageWidth]);
  useEffect(()=>{systemSpacingRef.current=systemSpacing;rememberPosition();layoutScore()},[systemSpacing]);
  useEffect(()=>{extraSystemSpacingRef.current=extraSystemSpacing;rememberPosition();layoutScore()},[extraSystemSpacing]);
  useEffect(()=>{noteSpacingRef.current=noteSpacing;rememberPosition();layoutScore()},[noteSpacing]);
  useEffect(()=>{if(osmdRef.current)computePages()},[magnify]);
  // A scaled element still occupies its unscaled box, so without this the
  // scroller has nothing to scroll into and the magnified page is simply
  // clipped. transform-origin is the top left corner, so the overflow is
  // all to the right and below.
  useEffect(()=>{
    const paper=scoreRef.current?.closest<HTMLElement>(".score-paper");
    if(!paper)return;
    const grow=Math.max(0,magnify-1);
    paper.style.marginRight=grow?`${grow*paper.offsetWidth}px`:"";
    paper.style.marginBottom=grow?`${grow*paper.offsetHeight}px`:"";
  },[magnify,layoutVersion]);
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
  // Report real tempo CHANGES only. This effect also re-runs whenever the
  // onTempoChange callback's identity changes, which happens every time the
  // host switches which exercise is active — and firing there re-reported
  // the transport's unchanged tempo, stamping it onto whichever exercise
  // had just been selected. That is what silently reset every practice
  // tempo to 60: typing into one mark selected that exercise, and the
  // re-fire wrote the transport's 60 straight back over it.
  useEffect(()=>{
    if(reportTempo.current===null){reportTempo.current=bpm;return}
    if(reportTempo.current===bpm)return;
    reportTempo.current=bpm;
    onTempoChange?.(bpm);
  },[bpm,onTempoChange]);
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
  function stopPlayback(){playbackTimers.current.forEach(window.clearTimeout);playbackTimers.current=[];playbackNodes.current.forEach(o=>{try{o.stop()}catch{/* Already-ended notes need no further cleanup. */}});playbackNodes.current=[];playbackPosition.current=null;scoreRef.current?.querySelectorAll(".playback-active").forEach(n=>n.classList.remove("playback-active"));setPlaying(false);setPlayingFrom(null);setPlayingEvent(null)}
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
      playbackTimers.current.push(window.setTimeout(()=>{nodes.forEach(n=>n.classList.remove("playback-active"));nodes[index]?.classList.add("playback-active");setPlayingEvent(index)},start+80));
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
  function showNoteInfo(node:SVGGElement,x:number,y:number){
    if(noteDisplay==="off"&&!fingering&&rhythmMode==="off"){setFingerTip(null);return}
    setFingerTip({pitch:node.dataset.pitch!,name:node.dataset.noteName??node.dataset.pitch!.replace(/\d/,""),octave:node.dataset.noteOctave??node.dataset.pitch!.match(/\d/)?.[0]??"",solfege:node.dataset.solfege??"",beat:node.dataset.beat??"",x,y});
  }
  function scoreMove(e:React.MouseEvent<HTMLDivElement>){
    if(annotating)return;
    const theory=(e.target as Element).closest<SVGElement>("[data-theory]");
    setTheoryTip(theoryEnabled&&theory?{title:theory.dataset.theoryTitle??"",text:theory.dataset.theory!,x:e.clientX,y:e.clientY}:null);
    // A fermata hangs off a notehead, so walking up from it lands on the
    // note and used to show a fingering beside the term explanation. The
    // mark you are pointing at wins, the way it already does on click.
    if(theoryEnabled&&theory){setFingerTip(null);return}
    // Hovering only opens the popover when it has something to add. Note
    // names and beat numbers are already printed on the page as overlays
    // when those are switched on, so repeating them under the pointer is
    // noise; a fingering diagram, and knowing which note a drone would
    // land on, are not on the page.
    if(!fingering&&!droneArmed){setFingerTip(null);return}
    const node=(e.target as Element).closest<SVGGElement>(".vf-stavenote[data-pitch]");
    if(!node){setFingerTip(null);return}showNoteInfo(node,e.clientX,e.clientY);
  }
  /**
   * How far a tap may land from a notehead and still count, in pixels.
   * A fingertip is far wider than an engraved notehead.
   */
  const TAP_SLOP=16;
  /**
   * The note a tap meant, when it did not quite land on one.
   *
   * SVG hit-testing only registers on the painted glyph, so a tap a couple
   * of pixels off a notehead has e.target === the <svg> itself and finds no
   * note at all. With a mouse you simply click again; with a finger you
   * cannot reliably hit a 6px glyph, which is why tapping a sounding note
   * to switch its drone off so often did nothing.
   *
   * Only taps get this. Hover is precise by nature, and measuring every
   * note on a pointermove would thrash layout on a page holding hundreds.
   */
  function noteNear(x:number,y:number){
    const root=scoreRef.current;
    if(!root)return null;
    // Bound the search to the measure under the finger rather than the
    // whole book — a scale page can carry 350 notes.
    const stack=document.elementsFromPoint(x,y);
    const scope=stack.find(el=>el.classList?.contains("vf-measure"))??root;
    let best:SVGGElement|null=null,bestDistance=Infinity;
    scope.querySelectorAll<SVGGElement>(".vf-stavenote[data-pitch]").forEach(note=>{
      const box=(note.querySelector(".vf-notehead")??note).getBoundingClientRect();
      const dx=Math.max(box.left-x,0,x-box.right),dy=Math.max(box.top-y,0,y-box.bottom);
      const distance=Math.hypot(dx,dy);
      if(distance<bestDistance){bestDistance=distance;best=note}
    });
    return bestDistance<=TAP_SLOP?best:null;
  }
  function scoreClick(e:React.MouseEvent<HTMLDivElement>){
    if(annotating)return;
    const node=(e.target as Element).closest<SVGGElement>(".vf-stavenote[data-pitch]")??noteNear(e.clientX,e.clientY);
    const theory=(e.target as Element).closest<SVGElement>("[data-theory]");
    if(theoryEnabled&&theory){setTheoryTip({title:theory.dataset.theoryTitle??"",text:theory.dataset.theory!,x:e.clientX,y:e.clientY});return}
    setTheoryTip(null);
    if(!node){setFingerTip(null);return}
    if(onPracticeNote){onPracticeNote(Number(node.dataset.event));return}
    const match=node.dataset.pitch!.match(/^([A-G][♯♭]?)(\d)$/);if(!match)return;
    setStartMeasure(Number(node.dataset.measure)||1);
    // A tap is the only gesture a tablet has, so it cannot mean "show me
    // this note" and "sound this note" at once. The drone control arms it
    // first; until then a tap only tells you about the note.
    if(droneArmed)toggleDrone(match[1],+match[2]);
    showNoteInfo(node,e.clientX,e.clientY);
  }
  function toggleFavorite(){const saved=JSON.parse(localStorage.getItem("cookie:music-favorites")||"[]") as string[],next=saved.includes(id)?saved.filter(item=>item!==id):[...saved,id];localStorage.setItem("cookie:music-favorites",JSON.stringify(next));setFavorite(next.includes(id));window.dispatchEvent(new Event("cookie:favorites-updated"))}
  /**
   * Re-engrave for paper, hand over to the browser's own print-to-PDF, then
   * put the screen layout back.
   *
   * The browser's window is the point rather than something to route
   * around: "Save as PDF", paper size and margins already live there, and a
   * real PDF writer in the page would mean shipping a PDF library to render
   * something the browser can already render.
   *
   * The document title is swapped for the piece's own while it happens,
   * because that is what every browser offers as the default filename — so
   * the save comes up as "Major scales.pdf" rather than the tab's title.
   */
  /**
   * Write the score out as a real PDF file.
   *
   * Engraved OFF-SCREEN, in a second OSMD instance of its own. The first
   * version re-laid-out the score you were looking at and put it back
   * afterwards, which made the viewer jump about every time you pressed
   * download. Nothing here touches the visible engraving at all.
   *
   * It is also deliberately NOT a copy of your screen settings. Notation
   * size, system spacing and note spacing are reading preferences — how
   * you like the music on a screen at whatever width the window happens to
   * be — and paper has none of those problems. So the PDF is engraved at
   * one traditional size, the same for everybody, every time. The only
   * setting it keeps is where the line breaks go, because that is a
   * decision about the music rather than about the screen, and it already
   * lives in the MusicXML.
   *
   * Vector, not a screenshot: OSMD draws noteheads and stems as paths, so
   * they convert straight through and stay sharp at any zoom.
   */
  async function downloadPdf(){
    if(exportingRef.current)return;
    exportingRef.current=true;
    setExporting(true);
    const stage=document.createElement("div");
    // Off-screen rather than display:none — OSMD has to measure what it
    // draws, and a hidden element measures zero.
    stage.style.cssText=`position:fixed;left:-10000px;top:0;width:${PRINT_PAGE_WIDTH}px;pointer-events:none;opacity:0`;
    document.body.appendChild(stage);
    try{
      const [{OpenSheetMusicDisplay},{jsPDF},{svg2pdf}]=await Promise.all([
        import("opensheetmusicdisplay"),import("jspdf"),import("svg2pdf.js"),
      ]);
      const osmd=new OpenSheetMusicDisplay(stage,{backend:"svg",autoResize:false,drawTitle:false,drawComposer:false,drawingParameters:"compacttight"});
      osmd.setOptions({pageFormat:"A4 P",drawMeasureNumbers:true,drawPartNames:false,drawMetronomeMarks:true});
      const printTitle=plainAccidentals(printConfig?.title??title);
      osmd.OnXMLRead=xml=>prepareScore(xml,printTitle);
      const suppress=unmetered?applyExerciseRules(osmd):()=>{};
      await osmd.load(printConfig?.asset??asset,printTitle);
      suppress();
      osmd.EngravingRules.PageLeftMargin=PRINT_MARGIN;
      osmd.EngravingRules.PageRightMargin=PRINT_MARGIN;
      osmd.EngravingRules.PageTopMargin=PRINT_TOP_MARGIN;
      osmd.EngravingRules.PageTopMarginNarrow=PRINT_TOP_MARGIN;
      osmd.EngravingRules.PageBottomMargin=PRINT_MARGIN;
      osmd.EngravingRules.PageFormat.width=PAGE_MM.width;
      osmd.EngravingRules.PageFormat.height=PAGE_MM.height;
      osmd.EngravingRules.MeasureRightMargin=0.6;
      // Engraving defaults, not the reader's: 12 is standard system
      // density and 1 is unstretched note spacing.
      osmd.EngravingRules.MinimumDistanceBetweenSystems=12;
      osmd.EngravingRules.VoiceSpacingMultiplierVexflow=1;
      // Measure, then set. A staff space is the unit every other dimension
      // in engraving is quoted in, so sizing the page by measuring one and
      // scaling it to the traditional 1.75mm lands the same size on paper
      // whatever the zoom happened to be.
      osmd.zoom=1;
      osmd.render();
      const measured=staffSpaceMm(stage);
      // Clamped so a measurement that goes wrong cannot collapse or explode
      // the whole book; at the extremes it just engraves at zoom 1.
      const scale=measured?Math.min(3,Math.max(.3,STAFF_SPACE_MM/measured)):1;
      if(Math.abs(scale-1)>0.01){osmd.zoom=scale;suppress();osmd.render()}
      const pages=[...stage.querySelectorAll<SVGSVGElement>(":scope > div > svg")];
      if(!pages.length)return;
      // compress: the engraving is thousands of small paths, and flate
      // takes a twelve-page book from megabytes to something you can email.
      const pdf=new jsPDF({orientation:"portrait",unit:"mm",format:"a4",compress:true});
      for(let index=0;index<pages.length;index++){
        if(index)pdf.addPage();
        plainTextAccidentals(pages[index]);
        await svg2pdf(pages[index],pdf,{x:0,y:0,width:PAGE_MM.width,height:PAGE_MM.height});
      }
      pdf.setPage(1);
      pdf.setFont("times","normal");
      pdf.setFontSize(18);
      pdf.text(printTitle,PAGE_MM.width/2,13,{align:"center"});
      pdf.setFont("times","italic");
      pdf.setFontSize(9);
      pdf.setTextColor(110);
      pdf.text(BYLINE,PAGE_MM.width/2,19,{align:"center"});
      pdf.save(`${printTitle}.pdf`);
    }catch(e){
      setError(e instanceof Error?e.message:t.scoreViewer.engravingFailed);
    }finally{
      stage.remove();
      exportingRef.current=false;
      setExporting(false);
    }
  }

  // Built once and handed to both the settings panel and anything drawing
  // on the score, so a tempo mark on the page can drive the transport the
  // same way a row in a panel does.
  const readerControls:ReaderControls={bpm,setTempo:setBpm,metronome:metro,toggleMetronome:toggleMetro,playing,playFromEvent,playingFrom,playingEvent,download:downloadPdf,exporting};
  return <main className="app-shell reader-workspace restored-reader" data-layout={pageWidth} data-annotating={annotating} data-dock={dock?"true":undefined} style={{"--reader-page-width":pageWidth==="900"?"900px":"100%","--viewer-magnify":magnify,"--score-composer":`"${composer}"`} as React.CSSProperties}>
    <section className="workspace">
      <header className="topbar"><div><Link className="back has-tip" href={backHref} aria-label={backLabel?`${t.scoreViewer.back}: ${backLabel}`:t.scoreViewer.back} data-tip={backLabel||t.scoreViewer.back}><span className="back-arrow" aria-hidden="true">‹</span>{backLabel&&<span className="back-label">{backLabel}</span>}</Link>{!toolbar&&<strong>{title}</strong>}</div><div><span className="topbar-toolbar-slot">{toolbar}</span>{save?<SaveButton saved={save.saved} onToggle={save.onToggle} label={save.saved?save.savedLabel:save.label} tip={save.saved?save.savedLabel:save.label}/>:<SaveButton saved={favorite} onToggle={toggleFavorite} label={favorite?t.scoreViewer.removeFromSaved:t.scoreViewer.saveMusic} tip={favorite?t.scoreViewer.removeFromSaved:t.scoreViewer.saveMusic}/>}{headerActions?.(readerControls)}{pdfPath&&<a className="icon-btn has-tip" href={pdfPath} download data-tip={t.scoreViewer.downloadPdf} aria-label={t.scoreViewer.downloadPdf}>↓</a>}{/* The reader hides the studio nav, so the two controls that live there on every other page — practice tools and the account menu — come here instead, on the same row as the back link. */}<span className="topbar-spacer"/><div id="reader-tools-slot" className="topbar-tools-slot"/><AccountMenu/></div></header>

      <div className="practice-bar"><div className="tool-group">        <button data-tip={t.scoreViewer.markUpTip} className={annotating?"tool on coral has-tip":"tool has-tip"} onClick={()=>setAnnotating(!annotating)}><PracticeIcon name="markup"/>{t.scoreViewer.markUp}</button>
      </div>
        <div className="transport">{practiceActions}<button data-tip={t.scoreViewer.playTip(startMeasure)} className={playing?"tool on has-tip":"tool has-tip"} onClick={togglePlayback}><PracticeIcon name={playing?"stop":"play"}/>{playing?t.scoreViewer.stop:t.scoreViewer.play}</button><PracticeRecorder/>{/* Everything about tempo in one group: the metronome that sounds it, the number, and the steppers. The metronome used to sit after Listen, which is what made "Listen" read as "start the metronome"; the steppers reuse the − n + shape the on-page tempo marks already use rather than a spinner. */}<div className="tempo-group"><button data-tip={t.scoreViewer.metronomeTip} className={metro?"tool on has-tip":"tool has-tip"} onClick={toggleMetro}><PracticeIcon name="metronome"/>{t.scoreViewer.metronome}</button>{/* A div, not a label: buttons nested in a label get the label's hover applied to them as a set — hovering + lit up − too — and a tap on one activates the label, which focuses the number field and would raise the keyboard on a tablet. Only the field is labelled. */}<div className="tempo"><button type="button" className="tempo-step" aria-label={zh?"减慢":"Slower"} disabled={bpm<=40} onClick={()=>setBpm(bpm-1)}>−</button><label className="tempo-field"><input aria-label={t.scoreViewer.tempoAria} type="number" min="40" max="220" value={tempoDraft??bpm} onChange={e=>setTempoDraft(e.target.value)} onBlur={commitTempo} onKeyDown={e=>{if(e.key==="Enter")e.currentTarget.blur()}}/></label><button type="button" className="tempo-step" aria-label={zh?"加快":"Faster"} disabled={bpm>=220} onClick={()=>setBpm(bpm+1)}>+</button></div></div><button className="tool has-tip reader-tap" data-tip={t.scoreViewer.tapTempo} aria-label={t.scoreViewer.tapTempo} onClick={tapTempo}><PracticeIcon name="tap"/>{zh?"打拍":"Tap"}</button>
          <div className="transport-menu">
            <button aria-label={t.scoreViewer.drone} aria-pressed={droneArmed||drones.length>0} data-tip={t.scoreViewer.droneTip} className={droneArmed||drones.length?"tool on has-tip":"tool has-tip"} onClick={()=>setDroneArmed(on=>{
              // Turning the drone off stops what is sounding. Keeping the
              // pitches armed-but-silent would mean a second hidden state to
              // explain, and the note highlights read straight off the
              // sounding list, so they clear themselves with it.
              if(on)stopAllDrones();
              return !on;
            })}><PracticeIcon name="drone"/>{t.scoreViewer.drone}<small>{drones.length?drones.join("+"):droneArmed?t.scoreViewer.droneOn:t.scoreViewer.droneOff}</small></button>
          </div>
        </div>      <div className="reader-header restored-view-controls">        
        <div className="reader-view">{settings?.(readerControls)}
          <ReaderPopover label={zh?"显示设置":"View settings"} trigger={<><PracticeIcon name="gear"/>{zh?"显示":"View"}</>} className="tool has-tip">

            <div className="reader-setting-row"><span>{zh?"页面布局":"Page layout"}</span><div className="reader-choice" role="group" aria-label={zh?"页面布局":"Page layout"}>{[["900",zh?"竖向单页":"Portrait"],["auto",zh?"适应窗口":"Fit window"],["spread",zh?"双页":"Two pages"]].map(([value,label])=><button key={value} aria-pressed={pageWidth===value} onClick={()=>{setPageWidth(value);if(tabletReader(navigator.maxTouchPoints,Math.min(screen.width,screen.height)))try{localStorage.setItem(`${viewPrefsKey}:tablet-layout`,value)}catch{/* Keep the selected layout for this visit. */}}}>{label}</button>)}</div></div>
            {practiceTempo&&<div className="reader-setting-row"><span>{zh?"练习速度":"Practice tempo"}</span><div className="reader-choice" role="group" aria-label={zh?"练习速度":"Practice tempo"}><button aria-pressed={!practiceTempo.value} onClick={()=>practiceTempo.onChange(false)}>{zh?"隐藏":"Hidden"}</button><button aria-pressed={practiceTempo.value} onClick={()=>practiceTempo.onChange(true)}>{zh?"显示在乐谱上":"On the page"}</button></div></div>}
            {lineBreak&&<div className="reader-setting-row"><span>{zh?"换行":"Line breaks"}</span><div className="reader-choice" role="group" aria-label={zh?"换行":"Line breaks"}><button aria-pressed={!lineBreak.value} onClick={()=>lineBreak.onChange(false)}>{zh?"接续上一个":"Continue from previous"}</button><button aria-pressed={lineBreak.value} onClick={()=>lineBreak.onChange(true)}>{zh?"另起一行":"Start on a new line"}</button></div></div>}
            <label className="reader-setting-row">{zh?"音符大小":"Notation size"}<input type="range" min="0.6" max="2" step="0.05" value={sizePreference} onChange={e=>setSizePreference(+e.target.value)}/></label>
            <label className="reader-setting-row">{zh?"行间距":"System spacing"}<input type="range" min="4" max="40" step="1" value={systemSpacing} onChange={e=>setSystemSpacing(+e.target.value)}/></label>
            <label className="reader-setting-row">{zh?"音符间距":"Note spacing"}<input type="range" min="0.3" max="2" step="0.05" value={noteSpacing} onChange={e=>setNoteSpacing(+e.target.value)}/></label>
            {/* The other groups in this panel are labelled; this one was a
                bare row of icons, so what the five toggles had in common was
                left for the reader to infer. */}
            <div className="reader-setting-row reader-setting-row--stack"><span>{zh?"在谱面上显示":"Show on the page"}</span>
            <div className="reader-display-options">
        <button data-tip={t.scoreViewer.noteDisplayTip} className={noteDisplay!=="off"?"tool on has-tip":"tool has-tip"} onClick={cycleNoteDisplay}><span>A♭</span>{noteDisplay==="off"?t.scoreViewer.noteDisplay:noteDisplay==="names"?t.scoreViewer.noteNames:t.scoreViewer.solfege}</button>
        {!unmetered&&<button data-tip={t.scoreViewer.rhythmDisplay} className={rhythmMode!=="off"?"tool on has-tip":"tool has-tip"} onClick={cycleRhythm}><span>▥</span>{rhythmMode==="off"?t.scoreViewer.rhythm:rhythmMode==="counts"?t.scoreViewer.rhythmCountsShort:t.scoreViewer.rhythmBarsShort}</button>}
        <button data-tip={t.scoreViewer.accidentalsTip} className={accidentals?"tool on has-tip":"tool has-tip"} onClick={()=>setAccidentals(!accidentals)}><span>♯</span>{t.scoreViewer.accidentals}</button>
        <button data-tip={t.scoreViewer.tonguingTip} className={tonguing?"tool on has-tip":"tool has-tip"} onClick={()=>setTonguing(!tonguing)}><span>•</span>{t.scoreViewer.tonguing}</button>
        <button data-tip={t.scoreViewer.fingeringTip} className={fingering?"tool on has-tip":"tool has-tip"} onClick={()=>setFingering(!fingering)}><span>●○</span>{t.scoreViewer.fingering}</button>
<button data-tip={t.scoreViewer.musicalTermsTip} className={theoryEnabled?"tool on has-tip":"tool has-tip"} aria-pressed={theoryEnabled} onClick={()=>setTheoryEnabled(v=>!v)}><span>𝑓</span>{zh?"音乐术语":"Musical terms"}</button></div>
            </div><button className="reader-settings-reset" onClick={()=>{setSizePreference(.8);setSystemSpacing(12);setNoteSpacing(1);setPageWidth(initialReaderLayout(tabletReader(navigator.maxTouchPoints,Math.min(screen.width,screen.height))));try{localStorage.removeItem(`${viewPrefsKey}:tablet-layout`)}catch{/* Defaults still apply for this visit. */}}}>{zh?"恢复默认":"Restore defaults"}</button>
          </ReaderPopover>
        </div>
        <div className="reader-pages" data-mode="pages">{/* Back to the first page. A long exercise book is a lot of
            arrow presses to get home, and in scroll mode there are no
            arrows at all — this is the only way back to the top. */}
          <button className="reader-pages__top" aria-label={zh?"回到开头":"Back to top"} data-tip={zh?"回到开头":"Back to top"} disabled={pageIndex<=0&&(scoreScrollRef.current?.scrollTop??0)<8} onClick={backToTop}><PracticeIcon name="top"/></button><button aria-label={t.scoreViewer.previousPage} disabled={pageIndex<=0} onClick={()=>goToPage(pageIndex-1)}><PracticeIcon name="previous"/></button><button aria-label={t.scoreViewer.nextPage} disabled={pageIndex>=pageCount-1} onClick={()=>goToPage(pageIndex+1)}><PracticeIcon name="next"/></button><span aria-live="polite">{spreadPageCount?`${pageIndex*2+1}${pageIndex*2+2<=spreadPageCount?`–${pageIndex*2+2}`:""} / ${spreadPageCount}`:`${pageIndex+1} / ${pageCount}`}</span><button className={focusMode?"tool on has-tip":"tool has-tip"} aria-pressed={focusMode} data-tip={t.scoreViewer.focusModeTip} aria-label={focusMode?t.scoreViewer.exitFocusMode:t.scoreViewer.enterFocusMode} onClick={toggleFocusMode}><PracticeIcon name={focusMode?"close":"fullscreen"}/></button></div>
</div>
</div>
      <div className="reader-rows">{practiceRow}<div className="markup-row" ref={setAnnotationToolbar}/></div>
      <div className="score-scroll" ref={scoreScrollRef}><div className="score-paper engraved" data-loading={loading}><div className="custom-score-heading"><h1>{title}</h1></div>{showSpinner&&<div className="score-loading"><i className="score-loading__spinner" aria-hidden="true"/><span>{t.scoreViewer.engraving}</span></div>}{error&&<div className="score-error">{error}</div>}<div ref={scoreRef} className="osmd-score" data-theory-enabled={theoryEnabled} onMouseMove={scoreMove} onMouseLeave={()=>{setFingerTip(null);setTheoryTip(null)}} onClick={scoreClick}/>{scoreMarks&&marksLayer&&createPortal(scoreMarks({root:scoreRef.current,version:layoutVersion,magnify,controls:readerControls}),marksLayer)}<AnnotationLayer key={id} id={id} active={annotating} layoutReady={!loading} layoutVersion={layoutVersion} toolbar={annotationToolbar} zh={zh} onClose={()=>setAnnotating(false)} zoom={magnify} onZoom={zoomAnnotations}/>
      </div>{aside&&<div className="score-aside">{aside}</div>}</div>{stage&&<div className="reader-stage">{typeof stage==="function"?stage({fingering}):stage}</div>}{dock&&<div className="reader-dock">{dock}</div>}

    </section>{theoryTip&&<div className="theory-tip" style={clampTip(theoryTip.x,theoryTip.y,280,150,"below")}><strong>{theoryTip.title}</strong><p>{theoryTip.text}</p></div>}{fingerTip&&<div className={fingering?"flute-tip finger-chart":"flute-tip note-info-tip"} style={clampTip(fingerTip.x,fingerTip.y,340,255,"above")}>{(noteDisplay!=="off"||fingering)&&<strong>{noteDisplay==="solfege"?fingerTip.solfege:fingerTip.name}<sup>{fingerTip.octave}</sup></strong>}{rhythmMode!=="off"&&!unmetered&&<p className="note-info-beat">{zh?"拍位":"Beat"} {fingerTip.beat}</p>}{fingering&&<><div className="finger-diagram">{(()=>{
        const entry=fingeringsForMidi(midiForPitch(fingerTip.pitch));
        return entry?<FluteDiagramMini pressed={entry.fingerings[0].keys}/>:<em className="finger-diagram__none">{t.scoreViewer.noFingering}</em>;
      })()}</div>{(()=>{
        // The caption used to be a static legend naming every key on the
        // instrument — the same sentence under every note, which read as a
        // claim about which keys this note presses. What is actually worth
        // saying here is whether there is more than one way to play it.
        const entry=fingeringsForMidi(midiForPitch(fingerTip.pitch));
        const alts=(entry?.fingerings.length??0)-1;
        if(alts<1)return null;
        return <Link className="finger-diagram__alts" href={`/flute-studio/fingerings?note=${encodeURIComponent(entry!.pitch)}`}>
          {zh?`另有 ${alts} 种指法 →`:`${alts} more fingering${alts>1?"s":""} →`}
        </Link>;
      })()}</>}</div>}</main>
}
