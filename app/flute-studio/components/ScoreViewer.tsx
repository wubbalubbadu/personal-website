"use client";

import Link from "next/link";
import {normalizeMeasureRests} from "./measureRests";
import {readAccompaniment,type AccompanimentNote} from "./accompaniment";
import {loadPiano,sampledPianoNote} from "./sampledPiano";
import {droneEvents,droneCountIn,type DroneChange} from "./smartDrone";
import {solfege,placeNoteLabels,addReminderAccidentals} from "./scoreLabels";
import {refineDirectionWords} from "./directionWords";
import PracticeRecorder from "../PracticeRecorder";
import {ReaderPopover} from "./ReaderPopover";
import {PassageGuide} from "./PassageGuide";

import { useEffect, useRef, useState } from "react";
import {AnnotationLayer} from "./AnnotationLayer";
import { createPortal } from "react-dom";
import type { MusicSheetCalculator, OpenSheetMusicDisplay as OSMDType } from "opensheetmusicdisplay";
import { useLanguage } from "../i18n/LanguageContext";
import { useRecents } from "../lib/storage";
import { deriveScoreEvents, resolveKeyAccidentals } from "./deriveScoreEvents";
import type { ComposerInfo } from "../../../content/music-library";
import {readScoreFacts,keySignatureFromFifths,keySignatureFromNotes,timeSignatureText,metronomeText,performanceTermText,directionStyle,directionRuns,tuckMetronomeMarks,clearRehearsalMarks,spaceMetronomeMarks,METRONOME_TUCK_SHIFT,type ScoreFacts} from "./scoreTheory";
import {measureBeatOffsets,meterGrid} from "./rhythmGrid";
import {installGhostNoteFix} from "../lib/ghostNoteFix";
import {installReminderAccidentalFix,setReminderAccidentals} from "../lib/reminderAccidentalFix";
import {scheduledTempoAt,type TempoPoint} from "../lib/scoreTempo";
import {usePracticeAudio,pitchFrequency} from "../PracticeAudio";
import {PracticeIcon} from "./PracticeIcon";
import {FluteDiagramMini} from "./FluteDiagram";
import {fingeringsForMidi, midiForPitch} from "../../../content/fingerings/flute";
import {StatusButton} from "./StatusButton";
import {measureStops,cursorAt,type CursorBeat} from "./playbackCursor";
import BackChevron from "./BackChevron";
import {DownloadIcon,PlusIcon,CheckIcon} from "./HeaderIcons";
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
export type ScoreViewerConfig={title:string;composer:string;
  /** What tapping the composer's name shows: a short bio and a line about this piece. */
  story?:{composer?:ComposerInfo;year?:number;about?:string;tempoHint?:string};
  asset:string;id:string;backHref:string;backLabel?:string;/** Short visible name beside the back arrow on a phone (a book piece's composer, "Köhler"). */backName?:string;practiceGuide?:boolean;
  /** Which list entry the list button changes, when not this score's own id (a book's numbers share the book's). */
  accompaniment?:{asset:string;readingPartId:string;kind:"piano"|"chords"};smartDrone?:DroneChange[];smartDroneCountInBeats?:number;hideRehearsalMarks?:boolean;sempreStaccatoFromMeasure?:number;pulsePerMeasure?:boolean;listId?:string;pdfPath?:string;defaultTempo?:number;pitches?:(string|null)[];events?:{p:string|null;d:number;tied?:boolean;articulation?:ArticulationMode;slurContinuation?:boolean;level?:number;accent?:boolean;trill?:string}[];measureStarts?:number[];subtitle?:string;tempoHint?:string;displayPitches?:(string|null)[];noteKeySignatures?:string[][];syllables?:(string|null)[]};
/**
 * Fingerings come from content/fingerings/flute.ts, the same data the
 * fingering chart and the practice dock read. The two tables that used to
 * live here had real errors — D missing its E♭ lever, E♭ given G's
 * fingering, four "third octave" entries that were copies of first-octave
 * ones — which is what happens when one screen keeps its own copy.
 */
type RhythmMode = "off"|"bars";
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
type ReaderTuplet={notes:{beam?:unknown;getStemDirection:()=>number;getStemExtents:()=>{topY:number;baseY:number}}[];location:number;options:{bracketed?:boolean;y_offset?:number};getNestedTupletCount:()=>number;getYPosition:()=>number};
const patchedTuplets=new WeakSet<object>();
function patchTupletPlacement(osmd:OSMDType){
  let changed=false;
  for(const row of osmd.GraphicSheet?.MeasureList??[])for(const measure of row){
    const values=(measure as unknown as {vftuplets?:ReaderTuplet[]}).vftuplets??[];
    for(const tuplet of Object.values(values).flat()){
      const prototype=Object.getPrototypeOf(tuplet) as ReaderTuplet;
      if(patchedTuplets.has(prototype))continue;
      const original=prototype.getYPosition;
      if(!original)continue;
      prototype.getYPosition=function(this:ReaderTuplet){
        if(this.location===-1&&!this.options.bracketed&&this.notes.every(n=>n.beam&&n.getStemDirection()===-1)){
          return Math.max(...this.notes.map(n=>n.getStemExtents().topY))+12+this.getNestedTupletCount()*15+(this.options.y_offset??0);
        }
        return original.call(this);
      };
      patchedTuplets.add(prototype);changed=true;
    }
  }
  return changed;
}

/**
 * Stems reach the middle line. Engravers lengthen the stem of a note on
 * ledger lines until its tip reaches the staff's middle line, so a run up
 * at a high B keeps its beams near the staff instead of floating an octave
 * above it (Arnold's Fantasy from B on). VexFlow gives every stem the same
 * 3.5 spaces. Beams are placed from the stem tips, so they follow.
 *
 * VexFlow counts staff positions in lines: 1 is the bottom line, 3 the
 * middle, 5 the top, 0.5 per step, 10px per line. Patched on the prototype
 * of a note from the first engrave, since OSMD's VexFlow is private.
 */
type ReaderStaveNote={getStemExtension:()=>number;getStemDirection:()=>number;getKeyProps?:()=>{line:number}[];stem_extension_override?:number|null;stemExtensionOverride?:number|null;isRest?:()=>boolean};
const patchedStemNotes=new WeakSet<object>();
function patchStemLengths(osmd:OSMDType){
  let changed=false;
  const measures=(osmd.GraphicSheet?.MeasureList??[]) as {vfVoices?:Record<string,{tickables?:object[]}>}[][];
  for(const row of measures)for(const measure of row??[])for(const voice of Object.values(measure?.vfVoices??{}))for(const tickable of voice?.tickables??[]){
    const prototype=Object.getPrototypeOf(tickable) as ReaderStaveNote;
    if(patchedStemNotes.has(prototype)||typeof prototype.getStemExtension!=="function"||typeof prototype.getKeyProps!=="function")continue;
    const original=prototype.getStemExtension;
    prototype.getStemExtension=function(this:ReaderStaveNote){
      const base=original.call(this);
      if(this.stem_extension_override!=null||this.stemExtensionOverride!=null||this.isRest?.())return base;
      const lines=this.getKeyProps?.().map(key=>key.line)??[];
      if(!lines.length)return base;
      const STEM=3.5,MIDDLE=3;
      // Down stems run from the lowest note down; up stems from the highest up.
      const short=this.getStemDirection()===-1?Math.min(...lines)-STEM-base/10-MIDDLE:MIDDLE-(Math.max(...lines)+STEM+base/10);
      return short>0?base+short*10:base;
    };
    patchedStemNotes.add(prototype);changed=true;
  }
  return changed;
}

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

/**
 * Ties are drawn by VexFlow's StaveTie, which bends every tie by the same
 * fixed amount (control points 8 and 12 units) whatever its length, using two
 * quadratic curves. Short ties between close notes came out as pointy "^"
 * hats and long ones as heavy crescents, which is not how ties are engraved.
 *
 * This redraws the same outline as two cubic curves whose height follows the
 * tie's length (about a fifth of it, 2.4 to 7 units, where a staff space is
 * 10) and a middle 2 to 2.5 units thick (VexFlow's own was 2), so a tie reads as a
 * shallow, round arc at any length. Position, direction and grouping are
 * VexFlow's own; only the shape changes. Patched once through a live tie,
 * like patchArticulationSpacing, since OSMD keeps its VexFlow private.
 */
let tieShapePatched=false;
type TieDrawArgs={first_x_px:number;last_x_px:number;first_ys:number[];last_ys:number[];direction:number};
type StaveTieLike={context:{openGroup:(kind:string,id:string)=>unknown;beginPath:()=>void;moveTo:(x:number,y:number)=>void;bezierCurveTo:(a:number,b:number,c:number,d:number,e:number,f:number)=>void;closePath:()=>void;fill:()=>void;closeGroup:()=>void};render_options:{first_x_shift:number;last_x_shift:number;y_shift:number};first_indices:number[];last_indices:number[];first_note?:{getAttribute:(name:string)=>string};setAttribute:(name:string,value:unknown)=>void};
function patchTieShape(osmd:OSMDType){
  if(tieShapePatched)return false;
  const measures=(osmd.GraphicSheet?.MeasureList??[]) as {vfTies?:object[]}[][];
  const tie=measures.flatMap(row=>row??[]).find(measure=>measure?.vfTies?.length)?.vfTies?.[0];
  if(!tie)return false;
  const proto=Object.getPrototypeOf(tie) as {renderTie?:(this:StaveTieLike,args:TieDrawArgs)=>void};
  if(typeof proto.renderTie!=="function")return false;
  proto.renderTie=function(this:StaveTieLike,args:TieDrawArgs){
    const ctx=this.context,dir=args.direction,{first_x_shift,last_x_shift,y_shift}=this.render_options;
    for(let i=0;i<this.first_indices.length;++i){
      const x0=args.first_x_px+first_x_shift,x1=args.last_x_px+last_x_shift,y0=args.first_ys[this.first_indices[i]]+y_shift*dir,y1=args.last_ys[this.last_indices[i]]+y_shift*dir;
      if(!Number.isFinite(y0)||!Number.isFinite(y1))continue;
      const width=Math.abs(x1-x0),height=Math.min(7,Math.max(2.4,width*.2)),thickness=Math.min(2.5,Math.max(2,width*.045));
      // A cubic's apex sits at 3/4 of its control offset.
      const reach=(x1-x0)*.28,outer=height/.75*dir,inner=(height+thickness)/.75*dir;
      this.setAttribute("el",ctx.openGroup("stavetie",`${this.first_note?.getAttribute("id")}-tie`));
      ctx.beginPath();ctx.moveTo(x0,y0);
      ctx.bezierCurveTo(x0+reach,y0+outer,x1-reach,y1+outer,x1,y1);
      ctx.bezierCurveTo(x1-reach,y1+inner,x0+reach,y0+inner,x0,y0);
      ctx.closePath();ctx.fill();ctx.closeGroup();
    }
  };
  tieShapePatched=true;
  return true;
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
/** What a host needs to place its own marks on the engraving. */
/** Slur end placement for OSMD; the arch itself is redrawn by reshapeSlurs. Shared by the reader and the PDF export. */
function applySlurRules(osmd:OSMDType){
  // Ends start a little off the notehead instead of touching it. The
  // curve itself is redrawn after engraving, in reshapeSlurs.
  osmd.EngravingRules.SlurNoteHeadYOffset=0.9;
}

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

export type OverlayVisibility={names:boolean;solfege:boolean;accidentals:boolean;tonguing:boolean;sticks:boolean};
/** What a host needs to place its own marks on the engraving. */
export type ScoreMarksContext={root:HTMLDivElement|null;version:number;magnify:number;controls:ReaderControls};
/** Where overlay() appends while a pass is running: a fragment, so a whole pass is one DOM write, and the bar being laid out, so a later pass can redo just some bars. */
/** Colours the engraved reminder accidentals (the ones addReminderAccidentals wrote in) so they read as reminders, not as the music's own. */
function tagReminderAccidentals(drawn:SVGGElement[],reminders:Set<number>,from:number){
  // Start clean: a tag left from an earlier engraving must not outlive the reminder it belonged to.
  for(let i=from;i<drawn.length;i++)drawn[i].querySelectorAll(".reminder-accidental").forEach(path=>path.classList.remove("reminder-accidental"));
  const found:SVGPathElement[]=[];
  reminders.forEach(index=>{
    if(index<from)return;
    const node=drawn[index],head=node?.querySelector(".vf-notehead");if(!head)return;
    const left=head.getBoundingClientRect().left;
    node.querySelectorAll<SVGPathElement>(".vf-modifiers path").forEach(path=>{const box=path.getBoundingClientRect();if(box.right<=left+2&&box.height>box.width*1.3)found.push(path)});
  });
  found.forEach(path=>path.classList.add("reminder-accidental"));
}
let overlaySink:ParentNode|null=null,overlayMeasure=0;
function overlay(root:HTMLDivElement,className:string,text:string,x:number,y:number){const item=document.createElement("span");item.className=`practice-overlay ${className}`;item.textContent=text;item.style.left=`${x}px`;item.style.top=`${y}px`;item.dataset.measure=String(overlayMeasure);(overlaySink??root).appendChild(item);return item}

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
/**
 * Tints the bar Listen will start from, MuseScore style. The tint is an SVG
 * rect inside the bar's own <g>, sized from getBBox in the same local
 * coordinates, so it lines up at any zoom and sits behind the notes. It
 * covers the staff itself: top to bottom line (the five unclassed, zero-height
 * paths VexFlow draws), starting after any clef, key or time signature, so a
 * first bar doesn't also light up its tempo mark. A re-render draws fresh
 * bars, so syncNotesAndOverlays puts it back.
 */
function markPlayStart(root:HTMLElement,from:number|null,to:number|null=from){
  root.querySelectorAll(".play-start-bar").forEach(node=>node.remove());
  if(from===null)return;
  for(let measure=from;measure<=(to??from);measure++){
    const bar=root.querySelector<SVGGElement>(`.vf-stavenote[data-measure="${measure}"]`)?.closest<SVGGElement>(".vf-measure");
    if(bar)tintBar(bar,"play-start-bar");
  }
}
/** The tint behind one bar, sized to its staff. Shared by the play-from-here bar and the close-up selection so the two always match. */
function tintBar(bar:SVGGElement,className:string){
  const box=bar.getBBox(),firstNote=bar.querySelector<SVGGElement>(".vf-stavenote")?.getBBox().x??box.x+box.width;
  // The staff lines give the bar's real extent on all four sides; the bar's
  // own box also takes in a tie or slur reaching back from the previous bar
  // (Syrinx bar 7), which pulled the tint half a bar to the left.
  // Other flat unclassed paths live in the bar too (an 8va bracket, the
  // dashes after "accel. poco a poco"), and taking them as staff lines
  // stretched the tint up over the lines above (Arnold's Fantasy, bar 18).
  // The staff is the run of five evenly spaced ones.
  const flat=[...bar.children].filter((child):child is SVGPathElement=>child instanceof SVGPathElement&&!child.getAttribute("class")&&child.getBBox().height<1).map(line=>line.getBBox()).sort((a,b)=>a.y-b.y);
  const staffAt=flat.findIndex((line,i)=>{
    const five=flat.slice(i,i+5);if(five.length<5)return false;
    const gap=five[1].y-five[0].y;
    return gap>2&&five.every((l,k)=>k===0||Math.abs(l.y-five[k-1].y-gap)<.75);
  });
  const lines=staffAt>=0?flat.slice(staffAt,staffAt+5):flat;
  const top=lines.length?Math.min(...lines.map(line=>line.y)):box.y,bottom=lines.length?Math.max(...lines.map(line=>line.y)):box.y+box.height;
  const left=lines.length?Math.min(...lines.map(line=>line.x)):box.x,right=lines.length?Math.max(...lines.map(line=>line.x+line.width)):box.x+box.width;
  const lead=[...bar.querySelectorAll<SVGGElement>(".vf-clef,.vf-keysignature,.vf-timesignature")].map(sign=>sign.getBBox()).filter(sign=>sign.x<firstNote).reduce((edge,sign)=>Math.max(edge,sign.x+sign.width+4),left);
  const rect=document.createElementNS("http://www.w3.org/2000/svg","rect"),pad=5;
  rect.setAttribute("class",className);
  rect.setAttribute("x",String(lead));rect.setAttribute("y",String(top-pad));
  rect.setAttribute("width",String(Math.max(0,right-lead)));rect.setAttribute("height",String(bottom-top+pad*2));
  rect.setAttribute("rx","6");
  bar.insertBefore(rect,bar.firstChild);
}
/**
 * One felt beat and one full bar, in `.d` units, for a time signature: the
 * beat-type note (a quarter in 3/4, an eighth in 3/8, a half in 2/2), or a
 * dotted quarter in compound time (6/8, 9/8, 12/8), where the eighths are felt
 * in threes. Shared by the beat sticks and the metronome that follows playback,
 * so the two can never disagree about where a beat is.
 */
function meterBeat(meter:{beats:number;beatType:number},unitsPerBeat:number){const {beatLength,barLength}=meterGrid(meter,unitsPerBeat);return {beatLen:beatLength,fullBar:barLength}}

/** Staff-line geometry only. Text, slurs, dynamics and beams deliberately do
 * not participate, because their bounding boxes differ from bar to bar and
 * made the rhythm guides wander vertically. */
function unscaledBox(element:Element,scale:number){
  const box=element.getBoundingClientRect();
  return new DOMRect(box.x/scale,box.y/scale,box.width/scale,box.height/scale);
}
function staffFrame(measure:SVGGElement|undefined,rootBox:DOMRect,scale=1){
  if(!measure)return null;
  const lines=[...measure.children].filter((child):child is SVGPathElement=>child instanceof SVGPathElement&&!child.getAttribute("class")).map(line=>unscaledBox(line,scale)).filter(box=>box.width>20&&box.height<2);
  if(!lines.length)return null;
  return {top:Math.min(...lines.map(line=>line.top))-rootBox.top,bottom:Math.max(...lines.map(line=>line.bottom))-rootBox.top,right:Math.max(...lines.map(line=>line.right))-rootBox.left};
}
function placePracticeOverlaysInner(root:HTMLDivElement,scoreEvents:{p:string|null;d:number}[],measureStarts:number[],unitsPerBeat:number,keyAccidentals:Set<string>,displayPitches?:(string|null)[],noteKeys?:string[][],unmetered=false,syllables?:(string|null)[],visible:OverlayVisibility={names:true,solfege:true,accidentals:true,tonguing:true,sticks:true},meters?:{beats:number;beatType:number}[],fromMeasure=1){
// A pass from bar N on (a long piece drawn a couple of systems at a time) clears and redoes only bars N onward.
root.querySelectorAll<HTMLElement>(".practice-overlay").forEach(n=>{if(fromMeasure<=1||Number(n.dataset.measure)>=fromMeasure)n.remove()});
const all=[...root.querySelectorAll<SVGGElement>(".vf-stavenote[data-event]")].filter(note=>Number(note.dataset.measure)>=fromMeasure);
// EVERY layout read happens here, before a single node is appended. Mixing
// reads and writes forces the browser to re-lay-out the whole score on each
// read; in a book of a few thousand notes that alone was seconds of work.
// Overlay positions are paper coordinates, never magnified screen pixels.
const scale=root.offsetWidth?root.getBoundingClientRect().width/root.offsetWidth:1;
const rootBox=unscaledBox(root,scale);
const noteBox=new Map<Element,DOMRect>(),byMeasure=new Map<number,SVGGElement[]>();
for(const note of all){
  noteBox.set(note,unscaledBox(note,scale));
  // Bucket by measure once: the old code re-filtered all notes for every
  // measure, which is quadratic in the size of the book.
  const index=Number(note.dataset.measure);
  const bucket=byMeasure.get(index);
  if(bucket)bucket.push(note);else byMeasure.set(index,[note]);
}
const measureBoxes=new Map<Element,DOMRect>(),frames=new Map<Element,ReturnType<typeof staffFrame>>();
// Staff frames are layout reads too. They used to be read inside the bar loop below, right after the previous bar's labels were appended, so the browser re-laid-out the whole score once per bar (seconds on a long piece).
for(const group of byMeasure.values()){const node=group[0].closest<SVGGElement>(".vf-measure");if(node&&!measureBoxes.has(node)){measureBoxes.set(node,unscaledBox(node,scale));frames.set(node,staffFrame(node,rootBox,scale))}}
for(let measure=Math.max(1,fromMeasure);measure<=measureStarts.length;measure++){const group=byMeasure.get(measure);if(!group?.length)continue;overlayMeasure=measure;const start=measureStarts[measure-1],end=measureStarts[measure]??scoreEvents.length,
// The bar's own time signature, not an assumed 4/4 (see meterBeat). A first
// bar holding less than its meter is a pickup: it is the END of a bar, so its
// first note does not fall on beat 1 (Amazing Grace starts on beat 3), and
// `pickup` shifts it there.
meter=meters?.[measure-1]??{beats:4,beatType:4},
// Scale and exercise books marked unmetered never build a beat plan. Their
// note durations still drive playback, but no meter, pickup, count or guide
// calculation runs for the page overlay.
plan=unmetered?null:measureBeatOffsets(scoreEvents.slice(start,end).map(event=>event.d),meter,unitsPerBeat,measure===1),
fullBar=plan?.barLength??0,content=plan?.contentLength??0,ancestor=group[0].closest<SVGGElement>(".vf-measure"),measureBox=ancestor?measureBoxes.get(ancestor):undefined,frame=ancestor?frames.get(ancestor)??null:null;
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
  // Sits above the accidental lane (-18) rather than sharing it, so a
  // tongued note with a key-signature accidental doesn't overlap its own
  // syllable label.
  if(visible.tonguing&&syllables?.[index])overlay(root,"tonguing-marker",syllables[index]!,x,box.top-rootBox.top-(visible.names||visible.solfege?56:34));

});
// Grace notes are excluded here too (same reasoning) — a duplicate onset
// with a real note right after it, rather than a proper beat position of
// its own, was throwing off the left/right anchor search below.
if(unmetered||!plan)continue;
if(!visible.sticks)continue;
const onsets=new Map<number,number>();let measureOnset=0;for(let eventIndex=start;eventIndex<end;eventIndex++){onsets.set(eventIndex,measureOnset);measureOnset+=scoreEvents[eventIndex]?.d??0}
const anchors:{t:number;x:number}[]=[];group.forEach(node=>{const eventIndex=Number(node.dataset.event),d=scoreEvents[eventIndex]?.d??0;if(d>0){const box=noteBox.get(node)!;anchors.push({t:onsets.get(eventIndex)??0,x:box.left-rootBox.left+box.width/2})}});const right=frame?.right??(measureBox?measureBox.right-rootBox.left:anchors.at(-1)!.x+34),
// One stick per beat of the music actually in the bar. A bar can hold more
// or less than its time signature (a pickup, the shortened last bar that
// balances it, or a bar that genuinely runs long), so the count comes from
// the notes, and the sticks start on the first real beat after a pickup.
measureUnits=content||fullBar;anchors.push({t:measureUnits,x:right});const top=frame?frame.top-54:(measureBox?.top??Math.min(...group.map(n=>noteBox.get(n)!.top)))-rootBox.top-7;for(const target of plan.offsets){const left=[...anchors].reverse().find(a=>a.t<=target)??anchors[0],next=anchors.find(a=>a.t>=target)??anchors.at(-1)!,ratio=next.t===left.t?0:(target-left.t)/(next.t-left.t);overlay(root,"beat-stick","",left.x+(next.x-left.x)*ratio,top).style.setProperty("--staff-h",`${frame?frame.bottom-frame.top:40}px`)}}}

function placePracticeOverlays(...args:Parameters<typeof placePracticeOverlaysInner>){
  const root=args[0],fragment=document.createDocumentFragment();
  overlaySink=fragment;
  try{placePracticeOverlaysInner(...args)}finally{overlaySink=null}
  root.appendChild(fragment);
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
/**
 * Redraws every slur as an even arch.
 *
 * OSMD hands VexFlow a curve whose two control points sit near its own
 * ends, so a slur over a leap came out as a slanted stroke with a hook at
 * one end, and a slur between neighbouring notes was nearly flat. Engraved
 * slurs (and MuseScore's) are symmetric arches whose height grows with
 * their length but stays within bounds. So each slur keeps OSMD's two end
 * points (the one nearer the notes moved out on a steep leap, so the slope
 * stays under 45°) and the side it bows to, and gets a new symmetric
 * curve that bows straight up or down:
 *
 * - height ≈ 0.45 × √(length in staff spaces), held between 0.8 and 2.2
 *   staff spaces, so a two-note slur visibly curves and a long phrase
 *   doesn't balloon;
 * - raised further only where a note in between would otherwise poke
 *   through it (at most 4 spaces);
 * - thin at the ends and about 0.18 of a space thick in the middle, the
 *   way VexFlow draws it.
 *
 * Runs after every engrave (reader and PDF), on the SVG itself.
 */
function reshapeSlurs(root:Element){
  root.querySelectorAll<SVGSVGElement>("svg").forEach(svg=>{
    const curves=[...svg.querySelectorAll<SVGPathElement>("g.vf-curve > path")];
    if(!curves.length)return;
    // One staff space in this SVG's units, from the noteheads.
    const heads=[...svg.querySelectorAll<SVGGraphicsElement>(".vf-notehead")].slice(0,40).map(head=>head.getBBox().height).filter(height=>height>0).sort((a,b)=>a-b);
    const space=heads.length?heads[Math.floor(heads.length/2)]:10;
    const notes=[...svg.querySelectorAll<SVGGraphicsElement>("g.vf-stavenote")].map(note=>note.getBBox());
    curves.forEach(path=>{
      const n=(path.getAttribute("d")?.match(/-?\d*\.?\d+(?:e-?\d+)?/g)??[]).map(Number);
      if(n.length<12)return;
      const [x0,rawY0,c1x,c1y,c2x,c2y,x3,rawY3,,y3b]=n;
      const dx=x3-x0;
      if(!(Math.abs(dx)>1))return;
      // Up or down, whichever side OSMD put it on (the control points'
      // side of the line between the ends).
      const chordAt=(x:number)=>rawY0+(rawY3-rawY0)*(x-x0)/dx;
      const up=((c1y-chordAt(c1x))+(c2y-chordAt(c2x)))<0,dir=up?-1:1;
      // A slur over a big leap does not have to run from notehead to
      // notehead: the end nearer the notes is moved out (up for a slur
      // above) until the slope is at most 45°, as engravers do. Any
      // stricter and a slur over an octave leap floats off its first note.
      const maxRise=Math.abs(dx);
      let y0=rawY0,y3=rawY3;
      if(Math.abs(y3-y0)>maxRise){
        if(up){if(y0>y3)y0=y3+maxRise;else y3=y0+maxRise}
        else{if(y0<y3)y0=y3-maxRise;else y3=y0-maxRise}
      }
      const dy=y3-y0,width=Math.abs(dx);
      const ends=Math.min(Math.abs(y3b-rawY3)||.5,1);
      let height=Math.min(2.2,Math.max(.8,.45*Math.sqrt(width/space)))*space;
      // Clear any note between the two ends (the end notes themselves are
      // what the slur starts and stops at, so they are not obstacles).
      const margin=.5*space;
      for(const box of notes){
        const t=(box.x+box.width/2-x0)/dx;
        if(t<.12||t>.88)continue;
        const chordY=y0+dy*t,edge=up?box.y:box.y+box.height;
        // Only notes on this staff line count. Without this a note in the system below, whose bottom edge is still within 8 spaces, read as sitting under the slur and bowed it into a tall thin arc (Köhler Op. 33 Book 1 No. 1, bar 45).
        if(Math.abs(box.y+box.height/2-chordY)>5*space)continue;
        if(Math.abs(edge-chordY)>8*space)continue;
        const reach=up?chordY-(edge-margin):(edge+margin)-chordY;
        if(reach>0)height=Math.max(height,Math.min(4*space,reach/(3*t*(1-t))*.75));
      }
      // Symmetric cubic: both control points lifted by c gives an apex of
      // 0.75c; the second edge is lifted a little more for the thickness.
      const c=height/.75,k=.18*space/.75;
      const at=(f:number,off:number)=>`${x0+dx*f} ${y0+dy*f+dir*off}`;
      path.setAttribute("d",`M${x0} ${y0}C${at(.2,c)},${at(.8,c)},${x3} ${y3}L${x3} ${y3+dir*ends}C${at(.8,c+k)},${at(.2,c+k)},${x0} ${y0+dir*ends}Z`);
    });
  });
}

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

/**
 * Tags every marking the "Musical terms" layer can explain. Signatures and
 * tempo marks are explained for the measure they sit on: the first note
 * after a signature carries the event index that says which measure that
 * is, and the score's facts say what that measure's key and meter are.
 */
function addTheoryTargets(root:HTMLDivElement,noteKeys?:string[][],facts?:ScoreFacts|null,measureStarts:number[]=[]){
  const tag=(node:SVGElement,title:string,text:string)=>{node.dataset.theoryTitle=title;node.dataset.theory=text;node.classList.add("theory-target")};
  const targets:[string,string,string][]=[
    [".vf-clef","Treble clef","The curl circles the G line. Flute music is normally written in this clef."],
    [".vf-stavetie","Tie","Hold the connected notes as one continuous sound. Do not tongue the second note."],
  ];
  targets.forEach(([selector,title,text])=>root.querySelectorAll<SVGElement>(selector).forEach(node=>tag(node,title,text)));

  tagFermatas(root,"Hold the note longer than its written value. How much longer is your choice. Here it marks the end of the exercise, so let the sound settle before you stop.");

  const notes=[...root.querySelectorAll<SVGGElement>(".vf-stavenote[data-event]")];
  const eventAfter=(node:Element)=>{
    const next=notes.find(note=>node.compareDocumentPosition(note)&Node.DOCUMENT_POSITION_FOLLOWING);
    const event=next?Number(next.dataset.event):NaN;
    return Number.isFinite(event)?event:undefined;
  };
  const measureAfter=(node:Element)=>{
    const event=eventAfter(node);
    return event===undefined||!measureStarts.length?undefined:facts?.measures[measureForEvent(event,measureStarts)-1];
  };

  root.querySelectorAll<SVGElement>(".vf-timesignature").forEach(node=>{
    const meter=measureAfter(node);
    if(meter){const {title,text}=timeSignatureText(meter);tag(node,title,text)}
    else tag(node,"Time signature","The top number gives beats per measure; the bottom number identifies the beat value.");
  });

  root.querySelectorAll<SVGElement>(".vf-keysignature").forEach(node=>{
    const measure=measureAfter(node);
    if(measure&&facts){
      // The measures this signature governs: from here to the next written
      // key, so a natural minor exercise is not credited with the raised
      // 7th of the harmonic minor one after it.
      const from=facts.measures.indexOf(measure);
      const until=facts.measures.findIndex((entry,index)=>index>from&&entry.keyWritten);
      const {title,text}=keySignatureFromFifths(measure.fifths,measure.mode,facts.lastPitch,facts.measures.slice(from,until<0?undefined:until));
      tag(node,title,text);return;
    }
    const event=eventAfter(node);
    const altered=event===undefined?undefined:noteKeys?.[event];
    tag(node,"Key signature",altered?keySignatureFromNotes(altered)
      :"Shows which notes are sharped or flatted for the rest of the piece, unless an accidental changes one.");
  });

  // Metronome marks, matched to the score's own marks by measure, then by
  // order if the measure lookup fails.
  root.querySelectorAll<SVGGElement>(".vf-stavetempo").forEach((node,index)=>{
    const event=eventAfter(node);
    const measureNumber=event===undefined||!measureStarts.length?undefined:measureForEvent(event,measureStarts);
    const mark=facts?.metronomes.find(entry=>entry.measure===measureNumber)??facts?.metronomes[index];
    const {title,text}=metronomeText(mark,mark?facts?.measures[mark.measure-1]:undefined,node.textContent??"");
    tag(node,title,text);
  });

  // Tempo and expression words. Only the ones the glossary knows: a
  // tooltip that says "this is text" teaches nothing.
  root.querySelectorAll<SVGTextElement>(".vf-text:not(.measure-number) text").forEach(node=>{
    const words=node.textContent?.trim()??"";
    const explained=performanceTermText(words,facts?.metronomes.find(entry=>entry.words===words));
    if(explained)tag(node,explained.title,explained.text);
    // One style per kind of marking, whatever OSMD's own tempo-word list happened to catch.
    const style=directionStyle(words);
    if(style){node.setAttribute("font-weight",style==="tempo"?"bold":"normal");node.setAttribute("font-style",style==="tempo"?"normal":"italic")}
    // A mixed marking ("un poco rit. a tempo.") gets each part its own style.
    const runs=directionRuns(words);
    if(runs){
      node.textContent="";
      runs.forEach((run,index)=>{
        const span=document.createElementNS("http://www.w3.org/2000/svg","tspan");
        span.textContent=(index?" ":"")+run.text;
        span.setAttribute("font-weight",run.style==="tempo"?"bold":"normal");
        span.setAttribute("font-style",run.style==="tempo"?"normal":"italic");
        node.appendChild(span);
      });
    }
  });
}

/**
 * The catalog's title and composer win over whatever the file carries (often
 * a website name or a surname only). The page heading shows both; the book
 * layout hides that heading and lets OSMD draw them, so they have to be in the
 * XML too. Without a composer the file's own one is dropped.
 */
function prepareScore(xml: string,title:string,composer?:string,reminders?:(indexes:number[])=>void) {
  const document = new DOMParser().parseFromString(normalizeMeasureRests(xml), "application/xml");
  const root=document.documentElement;
  // Many files have no title at all (OSMD then prints "Untitled Score") or a
  // website name in it, so the catalog title is always written in, and a
  // movement title that would compete with it goes.
  let work=root?.querySelector(":scope > work");
  if(root&&!work){work=document.createElement("work");root.insertBefore(work,root.firstElementChild)}
  let workTitle=work?.querySelector(":scope > work-title");
  if(work&&!workTitle){workTitle=document.createElement("work-title");work.appendChild(workTitle)}
  workTitle?.replaceChildren(title);
  root?.querySelectorAll(":scope > movement-title").forEach(node=>node.remove());
  document.querySelectorAll('creator[type="composer"]').forEach(node => node.remove());
  if(composer&&root){
    let identification=root.querySelector(":scope > identification");
    if(!identification){identification=document.createElement("identification");root.insertBefore(identification,root.querySelector(":scope > defaults, :scope > credit, :scope > part-list"))}
    const creator=document.createElement("creator");creator.setAttribute("type","composer");creator.textContent=composer;
    identification.insertBefore(creator,identification.firstChild);
  }
  if(reminders)reminders(addReminderAccidentals(document));
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
/**
 * The composer card: who wrote this and where the piece comes from. Plain
 * facts only, written in content/composers.json and the catalog's `about`.
 */
function StoryCard({composer,title,story,style,onClose}:{composer:string;title:string;story:NonNullable<ScoreViewerConfig["story"]>;style:React.CSSProperties;onClose:()=>void}){
  const info=story.composer;
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==="Escape")onClose()};window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key)},[onClose]);
  const facts=[info?.born&&info?.died?`${info.born} to ${info.died}`:info?.born?`Born ${info.born}`:null,info?.nationality,info?.era].filter(Boolean).join(" · ");
  return <div className="story-card" style={style} role="dialog" aria-label={composer}>
    <strong>{composer}</strong>{facts&&<small>{facts}</small>}
    {info?.bio&&<p>{info.bio}</p>}
    {story.about&&<p className="story-card__piece"><b>{title}{story.year?` (${story.year})`:""}</b> {story.about}</p>}
    {story.tempoHint&&<p>{story.tempoHint}</p>}
  </div>;
}
export function ScoreViewer({config,toolbar,settings,aside,printConfig,practiceActions,practiceRow,stage,dock,onPracticeNote,practiceEvent,defaultNoteSpacing,onTempoChange,unmetered=false,lineBreak,practiceTempo,scoreMarks,headerActions,save,extraSystemSpacing=0}:{config:ScoreViewerConfig;toolbar?:React.ReactNode;settings?:(controls:ReaderControls)=>React.ReactNode;/** Pinned below the music inside the scroll area — for a live readout that has to stay visible while the page scrolls. */aside?:React.ReactNode;/** Title and music to print instead of what is on screen. The PDF is written with jsPDF's built-in Latin-1 fonts, which cannot encode Chinese at all, so a Chinese book prints from an English copy of itself. */printConfig?:{title:string;asset:string};practiceActions?:React.ReactNode;/** A tool row of the host's own, stacked above mark-up's row so both modes can be open at once. */practiceRow?:React.ReactNode;/** Replaces the music area in place (e.g. a close-up view) while the toolbar stays. The engraving stays mounted underneath so its layout survives the switch. */stage?:React.ReactNode|((view:{fingering:boolean})=>React.ReactNode);/** A panel under the music, on the same canvas, that shrinks the score instead of covering it. */dock?:React.ReactNode;onPracticeNote?:(event:number)=>void;practiceEvent?:number;/** Starting note spacing, for books whose notes are faster than the exercise default assumes. Overridden by a saved preference. */defaultNoteSpacing?:number;onTempoChange?:(tempo:number)=>void;unmetered?:boolean;lineBreak?:{value:boolean;onChange:(value:boolean)=>void};practiceTempo?:{value:boolean;onChange:(value:boolean)=>void};scoreMarks?:(context:ScoreMarksContext)=>React.ReactNode;headerActions?:(controls:ReaderControls)=>React.ReactNode;save?:{saved:boolean;onToggle:()=>void;label:string;savedLabel:string};extraSystemSpacing?:number}) {
  const {t,lang}=useLanguage();
  const zh=lang==="zh";
  const {bpm,setBpm,setPlaybackBpm,metro,toggleMetro,stopMetro,toggleDrone,stopAllDrones,drones,initializeScore,setAccent,getAudio,alignMetronome,metroHeld,setBeats}=usePracticeAudio();
  const [droneArmed,setDroneArmed]=useState(false);
  // Notification pills say their piece and go: about 2.5 seconds on screen.
  const [droneHint,setDroneHint]=useState(false),droneHintTimer=useRef(0);
  function flashDroneHint(){setDroneHint(true);window.clearTimeout(droneHintTimer.current);droneHintTimer.current=window.setTimeout(()=>setDroneHint(false),2500)}
  const [accompanimentMode,setAccompanimentMode]=useState<'off'|'piano'|'both'>('piano'),[pianoLoading,setPianoLoading]=useState(false),[pianoError,setPianoError]=useState('');
  const playbackAccompaniment=useRef<'off'|'piano'|'both'>('off');
  const accompanimentNotes=useRef<AccompanimentNote[]>([]),pianoSamples=useRef<Map<number,AudioBuffer>|null>(null);
  useEffect(()=>{let current=true;accompanimentNotes.current=[];if(config.accompaniment)fetch(config.accompaniment.asset).then(r=>{if(!r.ok)throw new Error('Could not load accompaniment');return r.text()}).then(xml=>{if(current)accompanimentNotes.current=readAccompaniment(xml,config.accompaniment!.readingPartId).notes}).catch(error=>{if(current)setPianoError(error.message)});return()=>{current=false}},[config.accompaniment?.asset]);
  const [smartRunning,setSmartRunning]=useState(false),[smartEvent,setSmartEvent]=useState<number|null>(null);
  const smartEventRef=useRef<number|null>(null),smartTimers=useRef<number[]>([]),smartNodes=useRef<OscillatorNode[]>([]),smartCursorBeats=useRef<CursorBeat[]>([]);
  const smartLastBpm=useRef<number|null>(null);
  smartEventRef.current=smartEvent;
  const smartMode=useRef(false),countInPending=useRef(false);
  const [,setCountLength]=useState(4),[countBar,setCountBar]=useState(2);
  const smartStartedMetronome=useRef(false);
  const [countBeat,setCountBeat]=useState<number|null>(null);
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
  // Key, meter and tempo per measure, read from the MusicXML on every load so the
  // Musical terms layer can explain the marking you tapped, not the concept.
  const scoreFactsRef=useRef<ScoreFacts|null>(null);
  const sequenceRef=useRef<{pitches:(string|null)[];events:{p:string|null;d:number;tied?:boolean;articulation?:ArticulationMode;slurContinuation?:boolean;level?:number;accent?:boolean;trill?:string}[];measureStarts:number[];unitsPerBeat:number;keyAccidentals:Set<string>}>({pitches:config.pitches??[],events:config.events??[],measureStarts:config.measureStarts??[],unitsPerBeat:4,keyAccidentals:new Set()});
  const scoreRef = useRef<HTMLDivElement>(null); const scoreScrollRef = useRef<HTMLDivElement>(null); const osmdRef = useRef<OSMDType | null>(null);
  // Scroll offsets (within .score-scroll's own content, not the viewport)
  // where each computed "page" starts — see computePages(). Kept in a ref
  // rather than state since only page TURNS need to re-render; the offsets
  // themselves are consumed imperatively by goToPage/the scroll-snap effect.
  const pageOffsetsRef = useRef<number[]>([0]);
  const playbackTimers=useRef<number[]>([]); const playbackNodes=useRef<(OscillatorNode|AudioBufferSourceNode)[]>([]); const playbackPosition=useRef<{audioStart:number;unit:number;from:number}|null>(null);
  // Which overlay rows are actually on screen. Held in a ref because the
  // layout pass also runs from a ResizeObserver and from the load effect,
  // neither of which re-closes over current state.
  const overlayVisibilityRef=useRef<OverlayVisibility>({names:false,solfege:false,accidentals:false,tonguing:true,sticks:false});
  const [loading,setLoading]=useState(true); const [error,setError]=useState(""); const [selectedMeasure,setSelectedMeasureRaw]=useState<number|null>(null); const startMeasure=selectedMeasure??1; const smartStartMeasure=selectedMeasure??(config.smartDrone?.[0]?.measure??1); const [playing,setPlaying]=useState(false); const [playingFrom,setPlayingFrom]=useState<number|null>(null); const [playingEvent,setPlayingEvent]=useState<number|null>(null); const [annotating,setAnnotating]=useState(false);
  const playingRef=useRef(playing);playingRef.current=playing;
  // One selection for everything: a bar (where Listen starts) or a range of bars (Play, Loop, Close-up, Tricky bits). selectedMeasure is its first bar; rangeEnd is the last bar of a range, or null for a single bar. Bar numbers here are positions (1, 2, 3...), not printed numbers.
  const [rangeEnd,setRangeEnd]=useState<number|null>(null),[closeup,setCloseup]=useState<{from:number;to:number;numbers:{from:string;to:string}}|null>(null),[rangeMode,setRangeMode]=useState<null|"once"|"loop">(null),[rangeBarAt,setRangeBarAt]=useState<{x:number;y:number}|null>(null);
  const selection=selectedMeasure===null?null:{from:selectedMeasure,to:Math.max(selectedMeasure,rangeEnd??selectedMeasure)};
  const isRange=!!selection&&selection.to>selection.from,closeupOpen=closeup!==null;
  const selectionRef=useRef<{from:number;to:number}|null>(null);selectionRef.current=selection;
  /** Choosing a single bar (or none) always ends any range. */
  function setSelectedMeasure(next:number|null|((current:number|null)=>number|null)){setRangeEnd(null);setSelectedMeasureRaw(next)}
  function setRange(low:number,high:number){setSelectedMeasureRaw(low);setRangeEnd(high>low?high:null)}
  const rangePlay=useRef<{start:number;end:number;loop:boolean}|null>(null);
  const gesture=useRef<{id:number;type:string;x:number;y:number;bar:number;mode:"idle"|"drag"|"press";timer:number}|null>(null);
  const swallowClick=useRef(false),touchSelecting=useRef(false);
  const guideXml=useRef("");
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
  const [noteDisplay,setNoteDisplay]=useState<NoteDisplay>("off"); const [accidentals,setAccidentals]=useState(false); const [tonguing,setTonguing]=useState(true); const [fingering,setFingering]=useState(false); const [rhythmMode,setRhythmMode]=useState<RhythmMode>("off");  const [magnify,setMagnify]=useState(1); const [fingerTip,setFingerTip]=useState<{pitch:string;name:string;octave:string;solfege:string;beat:string;x:number;y:number}|null>(null); const [theoryTip,setTheoryTip]=useState<{title:string;text:string;x:number;y:number}|null>(null); const [storyCard,setStoryCard]=useState<{x:number;y:number}|null>(null);
  // Unmetered exercise books have no beat grid. Keep this effective value
  // off even if an older saved exercise preference contains a rhythm mode.
  const activeRhythmMode:RhythmMode=unmetered?"off":rhythmMode;
  const [theoryEnabled,setTheoryEnabled]=useState(false),[sizePreference,setSizePreference]=useState(.8),[fitNote,setFitNote]=useState("");
  const sizePreferenceRef=useRef(sizePreference);
  // The size the reader chose (saved and shared). The size on screen can differ: a phone zooms a short piece up to fill the page without changing this.
  const userSizeRef=useRef(.8);
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
  /** Names or solfège widen the notes a little so the labels fit. Applied on top of your spacing at engrave time, never saved as your spacing. */
  const labelSpacing=useRef(1);
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
  /** What belongs to the screen, not the kind of music: pieces and exercises on one device share these, so the size set for one is still there for the next. */
  const screenPrefsKey="cookie:reader-view:screen:v1";
  const viewPrefsLoaded=useRef(false);
  useEffect(()=>{
    try{
      const own=JSON.parse(localStorage.getItem(viewPrefsKey)||"null"),shared=JSON.parse(localStorage.getItem(screenPrefsKey)||"null");
      // The shared screen settings win; a device that has only the older per-kind copy keeps using that.
      const saved=own||shared?{...own,...shared}:null;
      /* eslint-disable react-hooks/set-state-in-effect */
      const tablet=tabletReader(navigator.maxTouchPoints,Math.min(screen.width,screen.height));
      const tabletKey=`${viewPrefsKey}:tablet-layout`;
      const tabletLayout=tablet?localStorage.getItem(tabletKey):null;
      setPageWidth(initialReaderLayout(tablet,saved?.pageWidth,tabletLayout));
      if(saved){
        if(Number.isFinite(saved.sizePreference)){userSizeRef.current=saved.sizePreference;setSizePreference(saved.sizePreference)}
        if(Number.isFinite(saved.systemSpacing))setSystemSpacing(saved.systemSpacing);
        if(Number.isFinite(own?.noteSpacing))setNoteSpacing(own.noteSpacing);
        if(typeof saved.noteDisplay==="string")setNoteDisplay(saved.noteDisplay);
        if(typeof saved.accidentals==="boolean")setAccidentals(saved.accidentals);
        if(typeof saved.tonguing==="boolean")setTonguing(saved.tonguing);
        if(typeof saved.fingering==="boolean")setFingering(saved.fingering);
        /* The old counting mode is gone: a saved "counts" now shows the beat sticks. */if(typeof saved.rhythmMode==="string")setRhythmMode(saved.rhythmMode==="off"?"off":"bars");
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
        sizePreference:userSizeRef.current,systemSpacing,noteSpacing,pageWidth,
        noteDisplay,accidentals,tonguing,fingering,rhythmMode,
      }));
      localStorage.setItem(screenPrefsKey,JSON.stringify({sizePreference:userSizeRef.current,systemSpacing,pageWidth}));
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
  // The bar Listen starts from, read by syncNotesAndOverlays (which runs from
  // stale closures after a re-render) to put its highlight back.
  const selectedMeasureRef=useRef<number|null>(null);selectedMeasureRef.current=selectedMeasure;
  // A bar pulse and an eighth-note pulse use different tempo units. Do not
  // apply a saved ratio from the old eighth-note interpretation to this bar.
  useEffect(()=>{tempoSectionRef.current=1;initializeScore(config.pulsePerMeasure?`${id}:bar-pulse`:id,config.defaultTempo??60)},[id]);
  // An unmetered book has no bar lines, so there is no downbeat for the
  // metronome to lean on — a stressed beat every four clicks implies a 4/4
  // that is not there.
  useEffect(()=>{setAccent(!unmetered)},[unmetered,setAccent]);
  function cycleNoteDisplay(){setNoteDisplay(current=>current==="off"?"names":current==="names"?"solfege":"off")}
  function cycleRhythm(){setRhythmMode(current=>current==="off"?"bars":"off")}

  useEffect(()=>{record(id)},[id,record]);

  // Re-tags every rendered note with its event index/measure/pitch (OSMD
  // gives us fresh DOM nodes with none of that whenever it re-renders) and
  // rebuilds the note-name/count/beat-stick overlays against their current
  // positions. Must be re-run any time OSMD redraws for any reason — a
  // fresh load, a zoom change, or (see the ResizeObserver effect below) its
  // own autoResize reflow — or the overlays silently go stale/empty.
  /** How many notes already carry their event index and labels. Drawing a long piece a couple of systems at a time redoes only the notes after this, not the whole score each time. */
  const labelledEvents=useRef(0);
  /** Reminder accidentals are written into the XML before engraving, so turning them on or off runs the same fresh load as opening the piece (the reading position is kept). */
  const reminderEvents=useRef<Set<number>>(new Set()),remindersOn=useRef(false),lastLoadedAsset=useRef<string|null>(null);
  /** Where each note falls in its bar, worked out once per score: which events start a beat (for the pills) and each event's beat position as text ("1", "2½"), for the tap tip. */
  const beatCache=useRef<{events:unknown;measures:unknown;starts:Set<number>;labels:Map<number,string>}|null>(null);
  const FRACTIONS:[number,string][]=[[.25,"¼"],[.5,"½"],[.75,"¾"],[1/3,"⅓"],[2/3,"⅔"]];
  function beatInfo(){
    const seq=sequenceRef.current,measures=scoreFactsRef.current?.measures;
    if(beatCache.current?.events===seq.events&&beatCache.current.measures===measures)return beatCache.current;
    const starts=new Set<number>(),labels=new Map<number,string>();
    if(!unmetered)for(let measure=1;measure<=seq.measureStarts.length;measure++){
      const start=seq.measureStarts[measure-1],end=seq.measureStarts[measure]??seq.events.length,meter=measures?.[measure-1]??{beats:4,beatType:4};
      const plan=measureBeatOffsets(seq.events.slice(start,end).map(event=>event.d),meter,seq.unitsPerBeat,measure===1);
      if(!plan)continue;
      const beats=new Set(plan.offsets),beatLength=meterBeat(meter,seq.unitsPerBeat).beatLen;let onset=0;
      for(let i=start;i<end;i++){
        if(beats.has(onset))starts.add(i);
        if(seq.events[i]?.p&&seq.events[i].d>0){
          const position=(onset+plan.pickup)/beatLength,whole=Math.floor(position+1e-6),part=position-whole;
          const glyph=part<1e-3?"":FRACTIONS.find(([value])=>Math.abs(value-part)<.02)?.[1]??`.${Math.round(part*100)}`;
          labels.set(i,`${whole+1}${glyph}`);
        }
        onset+=seq.events[i]?.d??0;
      }
    }
    beatCache.current={events:seq.events,measures,starts,labels};
    return beatCache.current;
  }
  const beatStartSet=()=>beatInfo().starts;
  /** Name or solfège pills above the notes, from a bar on (or all of them). */
  function placeNameLabels(fromMeasure=1){
    const root=scoreRef.current;if(!root)return;
    const visible=overlayVisibilityRef.current,kind=visible.names?"names":visible.solfege?"solfege":null,seq=sequenceRef.current;
    if(!kind){root.querySelectorAll<HTMLElement>(".note-pill").forEach(pill=>pill.remove());return}
    placeNoteLabels(root,{kind,events:seq.events,displayPitches:config.displayPitches,beatStarts:beatStartSet(),fromMeasure});
  }
  /** Just the overlays (labels, accidentals, sticks), for a toggle: no theory targets, title or drone highlight to redo. */
  function placeLabels(){
    const root=scoreRef.current;if(!root)return;
    const seq=sequenceRef.current;
    placePracticeOverlays(root,seq.events,seq.measureStarts,seq.unitsPerBeat,seq.keyAccidentals??new Set(),config.displayPitches,config.noteKeySignatures,unmetered,config.syllables,overlayVisibilityRef.current,scoreFactsRef.current?.measures);
    placeNameLabels();
  }
  function syncNotesAndOverlays(fromEvent=0){
    const root=scoreRef.current;
    if(!root)return;
    const seq=sequenceRef.current,drawn=[...root.querySelectorAll<SVGGElement>(".vf-stavenote")];
    labelledEvents.current=drawn.length;
    drawn.forEach((node,index)=>{if(index<fromEvent)return;node.dataset.event=String(index);node.dataset.quarterBeats=String((seq.events[index]?.d??0)/seq.unitsPerBeat);node.dataset.measure=String(measureForEvent(index,seq.measureStarts));const pitch=seq.pitches[index];if(pitch)node.dataset.pitch=pitch;const beat=beatInfo().labels.get(index);if(beat)node.dataset.beat=beat;const written=config.displayPitches?.[index];if(written){node.dataset.noteName=written.replace(/\d/,"");node.dataset.solfege=solfege(written);const octave=written.match(/\d/)?.[0];if(octave)node.dataset.noteOctave=octave}});
    tagReminderAccidentals(drawn,remindersOn.current?reminderEvents.current:new Set(),fromEvent);
    placePracticeOverlays(root,seq.events,seq.measureStarts,seq.unitsPerBeat,seq.keyAccidentals??new Set(),config.displayPitches,config.noteKeySignatures,unmetered,config.syllables,overlayVisibilityRef.current,scoreFactsRef.current?.measures,fromEvent>0?measureForEvent(fromEvent,seq.measureStarts):1);
    placeNameLabels(fromEvent>0?measureForEvent(fromEvent,seq.measureStarts):1);
    addTheoryTargets(root,config.noteKeySignatures,scoreFactsRef.current,seq.measureStarts);
    updateDroneHighlight();
    markPlayStart(root,selectionRef.current?.from??null,selectionRef.current?.to??null);
    // Two pages draws the title and composer inside the score. Tag them so CSS
    // can give them the page heading's fonts (Georgia title, grey system-font
    // composer), and so the composer opens the same card when there is one.
    root.querySelectorAll<SVGTextElement>("svg text").forEach(text=>{const words=text.textContent?.trim();if(words===title){text.dataset.scoreTitle="";text.textContent="";for(const part of title.split(/(\d+)/)){const span=document.createElementNS('http://www.w3.org/2000/svg','tspan');span.textContent=part;if(/^\d+$/.test(part))span.setAttribute('font-family','Times New Roman, serif');text.appendChild(span)}}else if(words===composer){text.dataset.composer="";const svg=text.ownerSVGElement;const titleText=svg?Array.from(svg.querySelectorAll<SVGTextElement>("text")).find(node=>node.textContent?.trim()===title):undefined;if(titleText){const bounds=titleText.getBBox();text.setAttribute("x",String(bounds.x+bounds.width/2));text.setAttribute("text-anchor","middle");const composerBounds=text.getBBox();text.setAttribute("y",String(bounds.y+bounds.height+composerBounds.height*1.6));}if(config.story)text.dataset.composerCard=""}});
  }
  useEffect(()=>{const root=scoreRef.current;if(!root)return;markPlayStart(root,selection?.from??null,selection?.to??null);placeRangeUi()},[selectedMeasure,rangeEnd,layoutVersion]);
  // While it plays, the start-bar tint steps aside: the moving note shows
  // where you are, and a tinted bar left behind reads as a second cursor.
  // The selection itself stays, so the next Play starts there again.
  useEffect(()=>{scoreRef.current?.classList.toggle("is-playing",playing)},[playing]);
  // A long piece: the back link and title row tucks away while you scroll
  // down through the music and comes back as soon as you scroll up (or reach
  // the top), like Safari's own toolbar. The practice controls stay.
  useEffect(()=>{
    const scroller=scoreScrollRef.current,workspace=scroller?.closest(".workspace");
    if(!scroller||!workspace)return;
    let last=scroller.scrollTop;
    // Phone only: resizing the score area makes a long piece re-measure its
    // pages, a half-second stall (Arnold's Fantasy) that a laptop's height
    // doesn't need to pay. Focus mode hides the header on any screen.
    const phone=window.matchMedia("(max-width:760px)");
    const onScroll=()=>{
      const top=scroller.scrollTop,delta=top-last;last=top;
      if(!phone.matches){workspace.classList.remove("is-tucked");return}
      if(magnifyRef.current!==1)return;
      if(top<40)workspace.classList.remove("is-tucked");
      else if(delta>6)workspace.classList.add("is-tucked");
      else if(delta<-6)workspace.classList.remove("is-tucked");
    };
    scroller.addEventListener("scroll",onScroll,{passive:true});
    return()=>{scroller.removeEventListener("scroll",onScroll);workspace.classList.remove("is-tucked")};
  },[]);
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
      root.dataset.singlePage=String(pages.length===1);
      setSpreadPageCount(pages.length);
      const max=Math.max(0,scroller.scrollHeight-scroller.clientHeight);
      const offsets=pages.filter((_,i)=>i%2===0).map((p,i)=>i===0?0:Math.min(max,p.getBoundingClientRect().top-scrollerBox.top+scroller.scrollTop-12));
      if(offsets.length){pageOffsetsRef.current=offsets;setPageCount(offsets.length);if(pageTargetRef.current===null)setPageIndex(pageAt(offsets,scroller.scrollTop));return}
    }
    delete root.dataset.singlePage;
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
  function resync(fromEvent=0){syncNotesAndOverlays(fromEvent);computePages();mountMarksLayer()}
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
    // Notes are in reading order, so the first one still on screen is found
    // by halving (about ten measurements) rather than measuring every note
    // from the top, which on a long piece meant hundreds per scroll event.
    const notes=root.querySelectorAll<SVGElement>(".vf-stavenote[data-event]");
    let low=0,high=notes.length-1,found=-1;
    while(low<=high){const mid=(low+high)>>1;if(notes[mid].getBoundingClientRect().bottom>=top){found=mid;high=mid-1}else low=mid+1}
    const note=found>=0?notes[found]:null;
    if(note)readerAnchor.current={event:note.dataset.event!,offset:(note.getBoundingClientRect().top-top)/magnifyRef.current};
  }
  /** rememberPosition, once scrolling pauses, instead of on every scroll event. */
  const rememberTimer=useRef(0);
  function rememberPositionSoon(){window.clearTimeout(rememberTimer.current);rememberTimer.current=window.setTimeout(rememberPosition,150)}
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
    finishRenderedScore();
  }
  function finishRenderedScore(){
    if(scoreRef.current){
      reshapeSlurs(scoreRef.current);
      refineDirectionWords(scoreRef.current);
      scoreRef.current.querySelectorAll<SVGTextElement>('svg text').forEach(text=>{
        if(!/^expressif et souple Solo$/i.test(text.textContent?.trim()??''))return;
        const x=Number(text.getAttribute('x')),y=Number(text.getAttribute('y')),svg=text.ownerSVGElement;
        const staves=Array.from(svg?.querySelectorAll<SVGPathElement>('.vf-measure > path:first-child')??[]).map(p=>p.getBBox()).filter(b=>b.x<=x&&b.x+b.width>=x&&b.y<y);
        const staff=staves.sort((a,b)=>b.y-a.y)[0];if(!staff)return;
        text.textContent='expressif et souple';
        const solo=text.cloneNode(false) as SVGTextElement;solo.textContent='Solo';solo.setAttribute('y',String(staff.y-24));solo.setAttribute('font-style','normal');text.parentNode?.appendChild(solo);
      });
    }
    if(scoreRef.current)spaceMetronomeMarks(scoreRef.current);
    // Words clear of rehearsal boxes first, then each ♩ = n mark goes beside
    // its own words. Mark by mark: a piece where one mark stands alone (so
    // the up-front shift is off) still gets the others tucked.
    if(scoreRef.current){clearRehearsalMarks(scoreRef.current);tuckMetronomeMarks(scoreRef.current)}
  }
  function prepareLayoutBox(){
    const osmd=osmdRef.current,scroller=scoreScrollRef.current,root=scoreRef.current;
    if(!scroller)return;
    if(root?.parentElement){
      const padding=getComputedStyle(scroller);
      root.parentElement.style.setProperty("--score-layout-width",`${Math.min(pageWidthRef.current==="900"?900:Infinity,scroller.clientWidth-parseFloat(padding.paddingLeft)-parseFloat(padding.paddingRight))}px`);
    }
    const zoom=notationScale(Math.min(900,scroller.clientWidth),scroller.clientHeight,sizePreferenceRef.current);
    if(osmd)osmd.zoom=zoom;
    return zoom;
  }
  /**
   * "Fit page": a one-time action, not a mode. Finds the largest notation size at which the whole score is in view at once, in the current window and layout, and sets the Notation size slider to it. A bigger zoom wraps into more systems, so height only grows with zoom and a halving search finds the edge. A score too long to fit at a readable size is left alone, with a note saying so.
   */
  /** The largest notation size (slider units) at which the whole score is in view, or null when even the smallest does not fit. Leaves the score engraved at a trial size: callers lay it out again. */
  function fitPreference():{preference:number;capped:boolean}|null{
    const osmd=osmdRef.current,scroller=scoreScrollRef.current,root=scoreRef.current,paper=root?.parentElement;
    if(!osmd||!scroller||!root||!paper)return null;
    const style=getComputedStyle(scroller),room=scroller.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom)-6;
    // The paper is stretched to the window, so its own height says nothing: measure where the music ends.
    const paperBottom=parseFloat(getComputedStyle(paper).paddingBottom)||0;
    const fits=(zoom:number)=>{osmd.zoom=zoom;renderScore(osmd);return root.offsetTop+root.offsetHeight+paperBottom<=room};
    const perUnit=notationScale(Math.min(900,scroller.clientWidth),scroller.clientHeight,1),smallest=.5;
    if(!fits(smallest))return null;
    let low=smallest,high=3;
    for(let step=0;step<7;step++){const middle=(low+high)/2;if(fits(middle))low=middle;else high=middle}
    return {preference:Math.max(.6,Math.min(2,Math.round(low/perUnit*20)/20)),capped:low/perUnit>2};
  }
  /** Phone: a short piece opens as large as it can while the whole of it is still on screen. Only ever enlarges, and is not saved. */
  function autoFitPhone(){
    const osmd=osmdRef.current;
    if(!osmd||!window.matchMedia("(max-width:760px)").matches)return;
    // Always from the reader's own size, so stepping on to a long piece after a short one goes back to normal.
    let target=userSizeRef.current;
    if(osmd.Sheet.SourceMeasures.length<=48){
      const result=fitPreference();
      if(result&&result.preference>target+.04)target=result.preference;
    }else if(target===sizePreferenceRef.current)return;
    sizePreferenceRef.current=target;setSizePreference(target);layoutScore();
  }
  function fitToPage(){
    const osmd=osmdRef.current,scroller=scoreScrollRef.current,root=scoreRef.current,paper=root?.parentElement;
    if(!osmd||!scroller||!root||!paper)return;
    const say=(note:string)=>{setFitNote(note);window.setTimeout(()=>setFitNote(""),4000)};
    if(pageWidthRef.current==="spread"&&scroller.clientWidth>=1000)return say(zh?"双页布局下无法适合一页":"Not available in the two-page layout");
    if(osmd.Sheet.SourceMeasures.length>120)return say(zh?"太长，无法放进一页":"Too long to fit on one page");
    const result=fitPreference();
    if(result===null){layoutScore();return say(zh?"太长，无法放进一页":"Too long to fit on one page")}
    const {preference,capped}=result;
    userSizeRef.current=preference;
    sizePreferenceRef.current=preference;rememberPosition();setSizePreference(preference);layoutScore();
    say(capped?(zh?"已调到最大":"Set to the largest size"):"");
  }
  function layoutScore(reuseInitialRender=false){
    const osmd=osmdRef.current,scroller=scoreScrollRef.current,root=scoreRef.current;if(!osmd||!scroller||!root)return;
    const anchor=readerAnchor.current;
    const spread=pageWidthRef.current==="spread"&&scroller.clientWidth>=1000;
    const paged=spread;
    root.classList.toggle("score-spread",spread);
    osmd.setOptions({pageFormat:paged?"A4 P":"Endless",drawTitle:!config.subtitle,drawComposer:!config.subtitle,newSystemFromXML:lineBreak?.value??false});
    scroller.classList.toggle("spread-viewport",spread);
    const margins=originalPageMargins.current;
    if(margins){osmd.EngravingRules.PageLeftMargin=paged?8:margins.left;osmd.EngravingRules.PageRightMargin=paged?8:margins.right;osmd.EngravingRules.PageTopMargin=paged?8:margins.top;osmd.EngravingRules.PageTopMarginNarrow=paged?8:margins.narrow;osmd.EngravingRules.PageBottomMargin=paged?8:margins.bottom;}
    const padding=getComputedStyle(scroller);
    const width=scroller.clientWidth-parseFloat(padding.paddingLeft)-parseFloat(padding.paddingRight);
    if(root.parentElement)root.parentElement.style.setProperty("--score-layout-width",`${Math.min(pageWidthRef.current==="900"?900:Infinity,width)}px`);
    osmd.zoom=notationScale(Math.min(900,scroller.clientWidth),scroller.clientHeight,sizePreferenceRef.current);
    osmd.EngravingRules.TitleBottomDistance=8;
    osmd.EngravingRules.MinimumDistanceBetweenSystems=systemSpacingTotal();
    osmd.EngravingRules.VoiceSpacingMultiplierVexflow=noteSpacingRef.current*labelSpacing.current;
    if(unmetered)osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem=0;
    const spreadWidth=width-24;
    if(spread){
      // Book pages use the available aspect ratio instead of shrinking A4 to fit height.
      const pageHeight=Math.max(100,scroller.clientHeight-48);
      osmd.EngravingRules.PageFormat.width=210;
      osmd.EngravingRules.PageFormat.height=210*pageHeight/(spreadWidth/2);
      osmd.EngravingRules.TitleBottomDistance=8;
      root.style.setProperty("--book-page-ratio",`${spreadWidth/2} / ${pageHeight}`);
    }
    if(spread)root.style.width=`${spreadWidth/2}px`;else root.style.width="";
    // The first engrave already used this width, zoom, and Endless format.
    // Long scores otherwise pay for a second full SVG engrave before opening.
    if(!reuseInitialRender||spread)renderScore(osmd);
    root.style.width=spread?`${spreadWidth}px`:"";resync();
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
    const onScroll=()=>{if(pageTargetRef.current!==null){window.clearTimeout(settleTimer);settleTimer=window.setTimeout(()=>{pageTargetRef.current=null;rememberPosition()},120);return}setPageIndex(pageAt(pageOffsetsRef.current,scroller.scrollTop));rememberPositionSoon()};
    const interrupt=()=>{window.clearTimeout(settleTimer);pageTargetRef.current=null};
    scroller.addEventListener("wheel",interrupt,{passive:true});scroller.addEventListener("touchstart",interrupt,{passive:true});
    scroller.addEventListener("scroll",onScroll,{passive:true});
    return()=>{window.clearTimeout(settleTimer);scroller.removeEventListener("scroll",onScroll);scroller.removeEventListener("wheel",interrupt);scroller.removeEventListener("touchstart",interrupt)};
  },[]);

  // Keep engraving width fixed while magnifying; preserve the point under the gesture.
  const magnifyRef=useRef(magnify);
  function applyMagnify(value:number,x:number,y:number,dx=0,dy=0){
    const el=scoreScrollRef.current,paper=scoreRef.current?.parentElement;if(!el||!paper)return;
    const next=Math.max(.5,Math.min(3,value)),old=magnifyRef.current;
    const box=paper.getBoundingClientRect();
    // Anchor to the paper, including its inset in the scroller. Moving the
    // midpoint pans the same musical point along with the fingers.
    const left=el.scrollLeft+(x-dx-box.left)*(next/old-1)-dx;
    const top=el.scrollTop+(y-dy-box.top)*(next/old-1)-dy;
    magnifyRef.current=next;
    el.closest<HTMLElement>(".restored-reader")?.style.setProperty("--viewer-magnify",String(next));
    el.scrollLeft=left;el.scrollTop=top;
  }
  function zoomAnnotations(value:number,x:number,y:number){
    applyMagnify(value,x,y);setMagnify(magnifyRef.current);
  }
  useEffect(()=>{magnifyRef.current=magnify},[magnify]);
  useEffect(()=>{
    const el=scoreScrollRef.current;if(!el)return;
    let touchDistance=0,touchZoom=1,gestureZoom=1,midX=0,midY=0,commit=0;
    const settle=()=>{window.clearTimeout(commit);setMagnify(magnifyRef.current);rememberPosition()};
    function wheel(e:WheelEvent){
      if(!e.ctrlKey)return;e.preventDefault();
      if(el?.querySelector('.annotation-layer[data-drawing="true"]'))return;
      applyMagnify(magnifyRef.current*Math.exp(-e.deltaY*.008),e.clientX,e.clientY);
      window.clearTimeout(commit);commit=window.setTimeout(settle,140);
    }
    function start(e:TouchEvent){
      if(annotatingRef.current||e.touches.length!==2)return;e.preventDefault();
      const [a,b]=[e.touches[0],e.touches[1]];
      touchDistance=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);touchZoom=magnifyRef.current;
      midX=(a.clientX+b.clientX)/2;midY=(a.clientY+b.clientY)/2;
    }
    function move(e:TouchEvent){
      if(annotatingRef.current||e.touches.length!==2||!touchDistance)return;e.preventDefault();
      const [a,b]=[e.touches[0],e.touches[1]],x=(a.clientX+b.clientX)/2,y=(a.clientY+b.clientY)/2;
      applyMagnify(touchZoom*Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)/touchDistance,x,y,x-midX,y-midY);
      midX=x;midY=y;
    }
    function end(){if(touchDistance){touchDistance=0;settle()}}
    function gestureStart(e:Event){e.preventDefault();if(annotatingRef.current)return;gestureZoom=magnifyRef.current}
    function gestureChange(e:Event){e.preventDefault();if(annotatingRef.current||touchDistance)return;const g=e as Event&{scale:number;clientX:number;clientY:number};applyMagnify(gestureZoom*g.scale,g.clientX,g.clientY)}
    function gestureEnd(){if(!annotatingRef.current)settle()}
    el.addEventListener("wheel",wheel,{passive:false});el.addEventListener("touchstart",start,{passive:false});el.addEventListener("touchmove",move,{passive:false});el.addEventListener("touchend",end);el.addEventListener("touchcancel",end);el.addEventListener("gesturestart",gestureStart,{passive:false});el.addEventListener("gesturechange",gestureChange,{passive:false});el.addEventListener("gestureend",gestureEnd);
    return()=>{window.clearTimeout(commit);el.removeEventListener("wheel",wheel);el.removeEventListener("touchstart",start);el.removeEventListener("touchmove",move);el.removeEventListener("touchend",end);el.removeEventListener("touchcancel",end);el.removeEventListener("gesturestart",gestureStart);el.removeEventListener("gesturechange",gestureChange);el.removeEventListener("gestureend",gestureEnd)};
  },[]);

  useEffect(()=>{let mounted=true;let backgroundTimer=0;const reminders=accidentals;
  // Same piece, different setting: keep the reading position, which means drawing it in one go (an incremental draw would not have reached the place yet).
  const resume=osmdRef.current&&lastLoadedAsset.current===asset;lastLoadedAsset.current=asset;if(resume)rememberPosition(); async function load(){ try { if(unmetered&&!asset.includes("<note>")){scoreRef.current?.replaceChildren();osmdRef.current=null;setLoading(false);return;} setLoading(true); const {OpenSheetMusicDisplay,VexFlowConverter,AccidentalCalculator,MusicSheetCalculator}=await import("opensheetmusicdisplay");installGhostNoteFix(VexFlowConverter);installReminderAccidentalFix(AccidentalCalculator,MusicSheetCalculator);setReminderAccidentals(reminders);remindersOn.current=reminders; if(!mounted||!scoreRef.current)return; scoreRef.current.replaceChildren(); const osmd=new OpenSheetMusicDisplay(scoreRef.current,{backend:"svg",autoResize:false,drawTitle:!config.subtitle,drawComposer:!config.subtitle,drawingParameters:"compacttight"}); osmd.setOptions({pageFormat:"Endless",drawMeasureNumbers:true,drawPartNames:false,drawMetronomeMarks:true,newSystemFromXML:lineBreak?.value??false}); applySlurRules(osmd); osmd.EngravingRules.RenderRehearsalMarks=!config.hideRehearsalMarks; /* Chord symbols stay in the MusicXML (for a future accompaniment) but are never drawn. OSMD builds them inside load(), so this has to be set first. */ osmd.EngravingRules.RenderChordSymbols=false; /* Each rest bar drawn on its own, never folded into a multi-bar rest: notes are matched to the event list by drawing order, so three rests drawn as one "3" shifted every later note (and bar selection, and playback start) by three. */ osmd.EngravingRules.RenderMultipleRestMeasures=false; osmd.EngravingRules.AutoGenerateMultipleRestMeasuresFromRestMeasures=false; osmd.OnXMLRead = xml=>{guideXml.current=xml;scoreFactsRef.current=readScoreFacts(xml);
        // The page's own opening mark wins over the catalog's suggestion (69,
        // not the uploader's rounded 70), counted in the mark's beat.
        const opening=scoreFactsRef.current.tempos[0];if(opening)initializeScore(id,opening.quarter/opening.beat);
        reminderEvents.current=new Set();
        return prepareScore(xml,title,composer,reminders?indexes=>{reminderEvents.current=new Set(indexes)}:undefined)}; await osmd.load(asset,title); if(!mounted||!scoreRef.current)return;
      // Measure count tracks engraving cost better than XML byte size: a
      // verbose short file is still quick, while a long score needs feedback.
      const longScore=osmd.Sheet.SourceMeasures.length>=80;
      if(longScore){
        setShowSpinner(true);
        // Give the browser one paint before synchronous SVG engraving starts.
        await new Promise<void>(resolve=>requestAnimationFrame(()=>window.setTimeout(resolve,0)));
        if(!mounted||!scoreRef.current)return;
      }
      // One line for "Allegro assai ♩ = 144" instead of two; see tuckMetronomeMarks.
      osmd.EngravingRules.MetronomeMarkYShift=scoreFactsRef.current?.tempoWordsWithMetronome?METRONOME_TUCK_SHIFT:-1;
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
      osmd.EngravingRules.TitleBottomDistance=8;
    osmd.EngravingRules.MinimumDistanceBetweenSystems=systemSpacingTotal();
      osmd.EngravingRules.VoiceSpacingMultiplierVexflow=noteSpacingRef.current*labelSpacing.current;
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
      patchTieShape(osmd);
      const initialWidth=scoreScrollRef.current?.clientWidth;
      // Long scores can show their first two systems while OSMD draws the
      // rest in later browser tasks. Spread mode needs complete page layout.
      const incremental=longScore&&!(resume&&readerAnchor.current)&&!(pageWidthRef.current==="spread"&&(initialWidth??0)>=1000);
      if(incremental){osmd.renderNext({systems:2});finishRenderedScore()}else renderScore(osmd);
      // Ties may only exist once the first engrave has run; patch then and redraw once.
      const tiesPatched=patchTieShape(osmd),tupletsPatched=patchTupletPlacement(osmd),stemsPatched=patchStemLengths(osmd);
      if(tiesPatched||tupletsPatched||stemsPatched){
        if(incremental){osmd.resetIncrementalRendering();osmd.renderNext({systems:2});finishRenderedScore()}
        else renderScore(osmd);
      }
      osmdRef.current=osmd; if(!config.pitches)sequenceRef.current={...deriveScoreEvents(osmd,config.sempreStaccatoFromMeasure),keyAccidentals:new Set()};
      // Independent of whether the note sequence itself is auto-derived or
      // hand-authored — the key signature always comes straight from OSMD,
      // so even Mystery of Love (predates deriveScoreEvents, passes its
      // pitches/events by hand) gets this right rather than losing it.
      sequenceRef.current.keyAccidentals=resolveKeyAccidentals(osmd);
      applySectionMeter(selectedMeasureRef.current??1);
      // A tick of delay before the first sync, same as the zoom effect below
      // already does — osmd.render() returning doesn't guarantee the SVG's
      // layout is fully settled yet, and measuring note positions one frame
      // too early is exactly what produced extra/misplaced beat-sticks on
      // first load (measures' note x-coordinates would shift slightly after
      // this point, but nothing re-measured them).
      window.setTimeout(async ()=>{
        if(!mounted)return;
        layoutScore(scoreScrollRef.current?.clientWidth===initialWidth);
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
            if(!config.pitches)sequenceRef.current={...deriveScoreEvents(osmd,config.sempreStaccatoFromMeasure),keyAccidentals:sequenceRef.current.keyAccidentals};
            layoutScore();
          }
        }
        setLoading(false);
        if(!resume&&!incremental)window.requestAnimationFrame(()=>{if(mounted&&osmdRef.current===osmd)autoFitPhone()});
        if(incremental&&osmd.IncrementalRenderingActive){
          const drawMore=()=>{
            if(!mounted||osmdRef.current!==osmd||!osmd.IncrementalRenderingActive||osmd.IncrementalRenderingComplete)return;
            try{osmd.renderNext({systems:2});finishRenderedScore();resync(labelledEvents.current);}
            catch(error){setError(error instanceof Error?error.message:t.scoreViewer.engravingFailed);return}
            if(!osmd.IncrementalRenderingComplete)backgroundTimer=window.setTimeout(drawMore,0);
          };
          requestAnimationFrame(()=>{backgroundTimer=window.setTimeout(drawMore,0)});
        }
      },0);
      } catch(e){setError(e instanceof Error?e.message:t.scoreViewer.engravingFailed);setLoading(false);} } load(); return()=>{mounted=false;window.clearTimeout(backgroundTimer)};},[asset,accidentals]);
  useEffect(()=>{const root=scoreRef.current;if(!root)return;root.dataset.noteDisplay=noteDisplay;root.classList.toggle("show-accidentals",accidentals);root.dataset.rhythm=activeRhythmMode;root.dataset.tonguing=tonguing?"on":"off";
    const next={names:noteDisplay==="names",solfege:noteDisplay==="solfege",accidentals,tonguing,sticks:activeRhythmMode==="bars"};
    const previous=overlayVisibilityRef.current;
    overlayVisibilityRef.current=next;
    // Turning a row on now has to build it, since it is no longer built
    // upfront and hidden with CSS.
    const changed=(Object.keys(next) as (keyof OverlayVisibility)[]).some(key=>next[key]!==previous[key]);
    const pillsOn=next.names||next.solfege,pillsWereOn=previous.names||previous.solfege;
    if(pillsOn!==pillsWereOn){labelSpacing.current=pillsOn?1.2:1;if(!loading&&osmdRef.current){rememberPosition();layoutScore()}}
    if(changed&&!loading&&osmdRef.current)placeLabels();},[noteDisplay,accidentals,activeRhythmMode,tonguing,loading]);
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
  useEffect(()=>{
    const scroller=scoreScrollRef.current;if(!scroller)return;
    let timer=0,lastWidth=scroller.clientWidth,lastHeight=scroller.clientHeight;
    const observer=new ResizeObserver(()=>{
      const {clientWidth:width,clientHeight:height}=scroller;
      if(width===lastWidth&&height===lastHeight)return;
      const widthChanged=width!==lastWidth;lastWidth=width;lastHeight=height;window.clearTimeout(timer);
      timer=window.setTimeout(()=>{if(widthChanged||(pageWidthRef.current==="spread"&&scroller.clientWidth>=1000))layoutScore();else computePages()},180);
    });observer.observe(scroller);
    return()=>{window.clearTimeout(timer);observer.disconnect()};
  },[]);
  // Playback shares the studio's one AudioContext with the metronome, so the
  // beat grid handed to it is on the same clock. It is not ours to close:
  // leaving the page stops our notes and hands the metronome back.
  useEffect(()=>()=>{playbackTimers.current.forEach(window.clearTimeout);playbackNodes.current.forEach(o=>{try{o.stop()}catch{/* ended */}});smartTimers.current.forEach(window.clearTimeout);smartNodes.current.forEach(o=>{try{o.stop()}catch{/* ended */}});alignMetronome(null)},[]);
  const audio=getAudio;
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
    if(skipTempoReschedule.current){skipTempoReschedule.current=false;return}
    if(!playing)return;
    const pos=playbackPosition.current;
    if(!pos)return;
    const elapsedMs=(audio().currentTime-pos.audioStart)*1000,seq=sequenceRef.current;
    let cursor=0,fromIndex=seq.events.length;
    // The next note not yet sounding, by the real schedule (which already
    // bends through an accel. or rit.); smart drone keeps no schedule, so it
    // counts at the steady speed.
    const upcoming=cursorBeats.current.find(beat=>beat.at>audio().currentTime+.005);
    if(resumeSectionAt.current!==null){fromIndex=resumeSectionAt.current;resumeSectionAt.current=null}
    else if(cursorBeats.current.length)fromIndex=upcoming?upcoming.index:seq.events.length;
    else for(let i=pos.from;i<seq.events.length;i++){if(cursor>elapsedMs){fromIndex=i;break}cursor+=seq.events[i].d*pos.unit}
    playbackTimers.current.forEach(window.clearTimeout);
    playbackTimers.current=[];
    if(smartMode.current||playbackAccompaniment.current!=="off"){playbackNodes.current.forEach(o=>{try{o.stop()}catch{/* Already ended. */}});playbackNodes.current=[]}
    scheduleNotes(fromIndex,false);
    // Deliberately excludes `playing`: togglePlayback already calls
    // scheduleNotes directly when Play is pressed, so reacting to `playing`
    // here too would double-schedule every note the instant it flips true.
    // The note already sounding when bpm changes rings out untouched (its
    // oscillator is already committed to the audio graph); only notes from
    // fromIndex onward pick up the new tempo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[bpm]);
  useEffect(()=>{
    if(!smartRunning||smartLastBpm.current===bpm)return;
    scheduleAutoDrone(smartEventRef.current??sequenceRef.current.measureStarts[smartStartMeasure-1]??0,false);
  },[bpm,smartRunning]);
  /**
   * A light electric-piano voice. The old sine wave with continuous vibrato
   * sounded synthetic, while the first piano replacement stacked too many
   * harmonics and became heavy in fast passages. This uses a clean sine
   * fundamental, one quiet overtone and a short release. It remains fully
   * scheduled on the AudioContext clock, so changing the timbre does not
   * change rhythm, ties, articulation or playback highlighting.
   */
  function pianoTone(pitch:string,start:number,duration:number,peakGain=.075,connected=false){
    const match=pitch.match(/^([A-G][♯♭]?)(\d)$/);if(!match)return;
    const c=audio(),frequency=pitchFrequency(match[1],+match[2]),master=c.createGain(),level=peakGain*4;
    const attackEnd=start+(connected?.014:.004),releaseStart=start+Math.max(.022,duration-(connected?.015:.045)),stopAt=Math.max(attackEnd+.055,start+duration+(connected?.012:.025));
    master.gain.setValueAtTime(.0001,start);
    master.gain.exponentialRampToValueAtTime(Math.max(.0002,level),attackEnd);
    master.gain.exponentialRampToValueAtTime(Math.max(.0002,level*.85),Math.min(releaseStart,attackEnd+.11));
    master.gain.setValueAtTime(Math.max(.0002,level*.85),releaseStart);
    master.gain.exponentialRampToValueAtTime(.0001,stopAt);
    master.connect(c.destination);
    const partials:[[number,number],[number,number]]=[[1,1],[2,.12]];
    partials.forEach(([multiple,partialLevel],index)=>{
      const oscillator=c.createOscillator(),color=c.createGain();
      oscillator.type="sine";oscillator.frequency.setValueAtTime(frequency*multiple,start);
      color.gain.setValueAtTime(partialLevel,start);
      color.gain.exponentialRampToValueAtTime(Math.max(.001,partialLevel*(index ? .3 : 1)),Math.min(stopAt-.01,start+(index ? .09 : .45)));
      oscillator.connect(color).connect(master);oscillator.start(start);oscillator.stop(stopAt);playbackNodes.current.push(oscillator);
    });
  }
  function stopPlayback(){rangePlay.current=null;setRangeMode(null);if(!smartRunning)setCountBeat(null);playbackTimers.current.forEach(window.clearTimeout);playbackTimers.current=[];playbackNodes.current.forEach(o=>{try{o.stop()}catch{/* Already-ended notes need no further cleanup. */}});playbackNodes.current=[];playbackPosition.current=null;
    // A metronome that was clicking along stops with the music instead of
    // bursting into a free-running click; the next Listen (or the
    // Metronome button) brings it back.
    if(!smartRunning)alignMetronome(metro?{time:0,beatSeconds:1,beatInBar:0,beatsPerBar:1,hold:true}:null);
    setPlaying(false);setPlayingFrom(null);setPlayingEvent(null)}
  function clearAutoDroneSchedule(){
    smartTimers.current.forEach(window.clearTimeout);smartTimers.current=[];
    smartNodes.current.forEach(node=>{try{node.stop()}catch{/* Already ended. */}});smartNodes.current=[];
    smartCursorBeats.current=[];
  }
  function stopAutoDrone(){
    clearAutoDroneSchedule();setSmartRunning(false);setSmartEvent(null);setCountBeat(null);
    if(!playingRef.current)alignMetronome(null);
    if(smartStartedMetronome.current){smartStartedMetronome.current=false;if(!playingRef.current)stopMetro()}
  }
  /** Auto drone follows score time without starting Listen or scheduling flute notes. */
  function scheduleAutoDrone(fromIndex:number,withCountIn:boolean){
    clearAutoDroneSchedule();
    smartLastBpm.current=bpm;
    const c=audio(),seq=sequenceRef.current,fromMeasure=measureForEvent(fromIndex,seq.measureStarts);
    const meter=scoreFactsRef.current?.measures[fromMeasure-1]??{beats:4,beatType:4};
    const {beatLen,fullBar}=meterBeat(meter,seq.unitsPerBeat);
    const sectionBeat=config.pulsePerMeasure?fullBar/seq.unitsPerBeat:tempoSectionAt(fromMeasure)?.beat??beatLen/seq.unitsPerBeat;
    const unit=60000/(bpm*sectionBeat)/seq.unitsPerBeat;
    const clockStart=c.currentTime+.08;
    const countGrid=unmetered?{time:clockStart,beatSeconds:60/bpm,beatInBar:0,beatsPerBar:config.smartDroneCountInBeats??4}:playbackGrid(fromIndex,clockStart,unit);
    const plan=droneCountIn(clockStart,countGrid.beatSeconds,countGrid.beatsPerBar,withCountIn,unmetered?config.smartDroneCountInBeats??4:undefined);
    const start=plan.start;
    if(withCountIn){setCountLength(plan.beats);setCountBar(countGrid.beatsPerBar);for(let beat=0;beat<plan.beats;beat++)smartTimers.current.push(window.setTimeout(()=>setCountBeat(beat),Math.max(0,(clockStart+beat*countGrid.beatSeconds-c.currentTime)*1000)));smartTimers.current.push(window.setTimeout(()=>setCountBeat(null),Math.max(0,(start-c.currentTime)*1000)))}
    const pitches=droneEvents(config.smartDrone??[],seq.events,seq.measureStarts),onsets:number[]=[];
    let elapsed=0;
    for(let i=fromIndex;i<seq.events.length;i++){
      const event=seq.events[i],at=start+elapsed*unit/1000,end=at+event.d*unit/1000;
      smartCursorBeats.current.push({index:i,at,end});onsets.push(elapsed);
      smartTimers.current.push(window.setTimeout(()=>setSmartEvent(i),Math.max(0,(at-c.currentTime)*1000)));
      elapsed+=event.d;
    }
    for(let i=fromIndex;i<seq.events.length;){
      const pitch=pitches[i];let end=i+1,duration=seq.events[i].d;
      while(end<seq.events.length&&pitches[end]===pitch)duration+=seq.events[end++].d;
      const match=pitch?.match(/^([A-G][♯♭]?)(\d)$/);
      if(match&&duration>0){
        const at=start+onsets[i-fromIndex]*unit/1000,until=at+duration*unit/1000,frequency=pitchFrequency(match[1],Number(match[2]));
        // The manual drone's voice: one triangle wave, no octave layer. Set louder than the manual one, which is too quiet to hear on a tablet.
        const osc=c.createOscillator(),gain=c.createGain();osc.type="triangle";osc.frequency.value=frequency;
        gain.gain.setValueAtTime(.0001,at);gain.gain.linearRampToValueAtTime(.1,Math.min(at+.04,until));gain.gain.setTargetAtTime(.0001,until,.015);
        osc.connect(gain).connect(c.destination);osc.start(at);osc.stop(until+.08);smartNodes.current.push(osc);
      }
      i=end;
    }
    if(!playing){applySectionMeter(fromMeasure);alignMetronome(withCountIn?{...countGrid,time:clockStart}:playbackGrid(fromIndex,start,unit))}
    smartTimers.current.push(window.setTimeout(stopAutoDrone,Math.max(0,(start+elapsed*unit/1000-c.currentTime)*1000)));
  }
  // Articulation only ever changes how long a note's own envelope rings,
  // never the start-to-start spacing between notes (that stays `event.d*unit`
  // regardless) — staccato fades out early to leave an audible gap, tenuto
  // and slur ring through to the next onset, and a plain tongue note keeps
  // the app's original .88 factor so pieces with no articulation data
  // (Mystery of Love) play back exactly as before.
  function articulationAudio(articulation:ArticulationMode|undefined,slurContinuation:boolean|undefined){
    if(articulation==="staccato")return {factor:.5,peakGain:.075};
    if(articulation==="slur")return {factor:1.06,peakGain:slurContinuation?.045:.075};
    if(articulation==="tenuto")return {factor:1,peakGain:.075};
    return {factor:.88,peakGain:.075};
  }
  // Extracted from togglePlayback so a mid-playback bpm change (see the
  // [bpm] effect above) can reschedule only the notes that haven't sounded
  // yet, instead of the whole piece. Each note's delay is still an
  // independent offset from one `audioStart` fixed at call time — never
  // chained off a previous callback's actual fire time — which is what
  // keeps this drift-free regardless of setTimeout jitter.
  /**
   * Which tempo section the transport's number belongs to (the measure its
   * <sound tempo> starts on). The score's own changes (Arnold's Fantasy: 69,
   * then 180 at B) scale that number by their ratio, so a player who slowed
   * the opening down to 50 hears B slowed down by the same proportion.
   */
  const tempoSectionRef=useRef(1);
  const liveTempoPoints=useRef<TempoPoint[]>([]);
  const [liveTempo,setLiveTempo]=useState<number|null>(null);
  useEffect(()=>{
    if(!playing)return;
    let frame=0,last:number|null=null;
    const draw=()=>{
      const next=scheduledTempoAt(liveTempoPoints.current,getAudio().currentTime);
      if(next!==last){last=next;setLiveTempo(next)}
      frame=requestAnimationFrame(draw);
    };
    frame=requestAnimationFrame(draw);
    return()=>cancelAnimationFrame(frame);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- uses the current scheduled timeline ref
  },[playing]);
  /** The notes playback has scheduled, on the audio clock, for the moving cursor. */
  const cursorBeats=useRef<CursorBeat[]>([]);
  useEffect(()=>{
    const root=scoreRef.current,paper=root?.closest<HTMLElement>(".score-paper"),scroller=scoreScrollRef.current;
    if((!playing&&!smartRunning)||!root||!paper||!scroller)return;
    if(getComputedStyle(paper).position==="static")paper.style.position="relative";
    const line=document.createElement("div");line.className="playback-cursor";paper.appendChild(line);
    const stops=measureStops(root.querySelectorAll<SVGGElement>(".vf-stavenote"),paper,magnifyRef.current);
    const source=playing?cursorBeats:smartCursorBeats;
    let frame=0,beats=source.current,pointer={k:0},lastTop=-1;
    const draw=()=>{
      if(source.current!==beats){beats=source.current;pointer={k:0}}
      const at=cursorAt(audio().currentTime,beats,stops,pointer);
      if(!at)line.style.opacity="0";
      else{
        line.style.opacity="1";
        line.style.transform=`translate(${at.x}px,${at.top}px)`;line.style.height=`${at.height}px`;
        // Keep the line in view: when it moves to a line below the window,
        // bring that line up to a third of the way down.
        if(at.top!==lastTop){
          lastTop=at.top;
          const rect=line.getBoundingClientRect(),view=scroller.getBoundingClientRect();
          if(rect.bottom>view.bottom-24||rect.top<view.top)scroller.scrollTo({top:scroller.scrollTop+rect.top-view.top-view.height/3,behavior:"smooth"});
        }
      }
      frame=requestAnimationFrame(draw);
    };
    frame=requestAnimationFrame(draw);
    return()=>{cancelAnimationFrame(frame);line.remove()};
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reads refs; restarts per play
  },[playing,smartRunning]);
  /** Set when playback itself moves the number, so the [bpm] effect does not reschedule twice. */
  const skipTempoReschedule=useRef(false);
  /** The note a section change resumes from (the new section's first), for the [bpm] effect. */
  const resumeSectionAt=useRef<number|null>(null);
  function tempoSectionAt(measure:number){
    let section:{measure:number;quarter:number;beat:number}|null=null;
    for(const change of scoreFactsRef.current?.tempos??[])if(change.measure<=measure)section=change;
    return section;
  }
  /** The number printed on the page for a section (quarters over its mark's beat: 180/1.5 = 120). */
  const printed=(section:{quarter:number;beat:number})=>section.quarter/section.beat;
  /** The transport's number counts the page's beat, so the free metronome accents that many per bar. */
  function applySectionMeter(measure:number){
    const facts=scoreFactsRef.current?.measures[measure-1];
    if(!facts)return;
    const {beatLen,fullBar}=meterBeat(facts,sequenceRef.current.unitsPerBeat);
    setBeats(config.pulsePerMeasure?1:Math.max(1,Math.round(fullBar/beatLen)));
  }
  function scheduleNotes(fromIndex:number,fresh=true){
    setLiveTempo(null);
    const c=audio(),seq=sequenceRef.current,tempos=scoreFactsRef.current?.tempos??[];
    const fromMeasure=measureForEvent(fromIndex,seq.measureStarts);
    // Starting in another section than the number was set for converts it,
    // keeping your share of the printed speed (half of 69 → half of 120).
    let playBpm=bpm;
    if(fresh){
      const here=tempoSectionAt(fromMeasure),was=tempoSectionAt(tempoSectionRef.current);
      if(here&&was&&here!==was){playBpm=Math.max(20,Math.min(300,Math.round(bpm*printed(here)/printed(was))));skipTempoReschedule.current=true;setPlaybackBpm(playBpm,printed(here))}
      if(here){tempoSectionRef.current=here.measure;applySectionMeter(here.measure)}
    }
    // The number counts the section's printed beat; notes are timed in quarters.
    const openingMeter=scoreFactsRef.current?.measures[fromMeasure-1]??{beats:4,beatType:4};
    const openingGrid=meterBeat(openingMeter,seq.unitsPerBeat);
    const sectionBeat=config.pulsePerMeasure?openingGrid.fullBar/seq.unitsPerBeat:tempoSectionAt(fromMeasure)?.beat??openingGrid.beatLen/seq.unitsPerBeat;
    const unit=60000/(playBpm*sectionBeat)/seq.unitsPerBeat;
    // The next change after where this starts, and the note it lands on.
    const nextChange=tempos.find(change=>change.measure>fromMeasure),changeIndex=nextChange?seq.measureStarts[nextChange.measure-1]:undefined;
    let changeAt:number|null=null;
    const beats:CursorBeat[]=[],graces:{pitch:string;level:number}[]=[];
    const clockStart=c.currentTime+.08;
    const countGrid=unmetered&&smartMode.current?{...playbackGrid(fromIndex,clockStart,unit),time:clockStart,beatSeconds:60/playBpm,beatsPerBar:config.smartDroneCountInBeats??4,beatInBar:0}:playbackGrid(fromIndex,clockStart,unit);
    const countPlan=droneCountIn(clockStart,countGrid.beatSeconds,countGrid.beatsPerBar,countInPending.current,unmetered?config.smartDroneCountInBeats??4:countGrid.pickupBeats>0?countGrid.beatsPerBar+countGrid.pickupBeats:undefined);
    const countBeats=countPlan.beats,countIn=countPlan.duration;countInPending.current=false;
    const rp=rangePlay.current,audioStart=countPlan.start,slice=seq.events.slice(fromIndex,rp?.end);
    if(countIn&&!smartMode.current){setCountLength(countBeats);setCountBar(countGrid.beatsPerBar);for(let beat=0;beat<countBeats;beat++){const at=audioStart-countIn+beat*countGrid.beatSeconds;if(!metro){const osc=c.createOscillator(),gain=c.createGain();osc.frequency.value=beat%countGrid.beatsPerBar===0?1200:800;gain.gain.setValueAtTime(.12,at);gain.gain.exponentialRampToValueAtTime(.0001,at+.04);osc.connect(gain).connect(c.destination);osc.start(at);osc.stop(at+.05);playbackNodes.current.push(osc)}playbackTimers.current.push(window.setTimeout(()=>setCountBeat(beat),Math.max(0,(at-c.currentTime)*1000)))}playbackTimers.current.push(window.setTimeout(()=>setCountBeat(null),Math.max(0,(audioStart-c.currentTime)*1000)))}
    if(smartMode.current){
      const pitches=droneEvents(config.smartDrone??[],seq.events,seq.measureStarts);
      if(countIn){
        setCountLength(countBeats);setCountBar(countGrid.beatsPerBar);
        for(let beat=0;beat<countBeats;beat++)playbackTimers.current.push(window.setTimeout(()=>setCountBeat(beat),80+beat*countGrid.beatSeconds*1000));
        playbackTimers.current.push(window.setTimeout(()=>setCountBeat(null),80+countIn*1000));
      }
      let elapsed=0;
      for(let i=fromIndex;i<seq.events.length;){
        const pitch=pitches[i];let end=i+1,duration=seq.events[i].d;
        while(end<seq.events.length&&pitches[end]===pitch)duration+=seq.events[end++].d;
        const match=pitch?.match(/^([A-G][♯♭]?)(\d)$/);
        if(match&&duration>0){
          const osc=c.createOscillator(),gain=c.createGain(),at=audioStart+elapsed*unit/1000,until=at+duration*unit/1000;
          osc.type='triangle';osc.frequency.value=pitchFrequency(match[1],+match[2]);
          gain.gain.setValueAtTime(.0001,at);gain.gain.linearRampToValueAtTime(.1,Math.min(at+.04,until));gain.gain.setTargetAtTime(.0001,until,.015);
          osc.connect(gain).connect(c.destination);osc.start(at);osc.stop(until+.08);playbackNodes.current.push(osc);
        }
        elapsed+=duration;i=end;
      }
    }
    let cursor=0;
    // accel. and rit.: how fast playback runs at a point in the score, as a
    // factor of the section's speed (scoreTheory readRamps decides where each
    // one runs and toward what). A point is measure + fraction of that bar.
    const ramps=scoreFactsRef.current?.ramps??[];
    const barUnits=new Map<number,number>();
    const barLength=(measure:number)=>{
      let length=barUnits.get(measure);if(length!==undefined)return length;
      length=0;for(let k=seq.measureStarts[measure-1]??0;k<(seq.measureStarts[measure]??seq.events.length);k++)length+=seq.events[k].d;
      barUnits.set(measure,length);return length;
    };
    const speedAt=(point:number)=>{
      for(const ramp of ramps){
        const base=tempoSectionAt(ramp.measure);if(!base)continue;
        const from=ramp.measure+ramp.at,to=ramp.until,end=ramp.target?ramp.target/base.quarter:ramp.kind==="accel"?1.25:.75;
        if(point>=from&&point<to)return 1+(end-1)*(point-from)/Math.max(.01,to-from);
        // A rit. with nowhere to go holds its slower speed until "a tempo" (or a new section).
        if(point>=to&&ramp.target===null&&(ramp.release===null||point<ramp.release)&&tempoSectionAt(Math.floor(point))===base)return end;
      }
      return 1;
    };
    let atMeasure=fromMeasure,intoBar=0;
    for(let k=seq.measureStarts[fromMeasure-1]??fromIndex;k<fromIndex;k++)intoBar+=seq.events[k].d;
    /** Each note's place in units from fromIndex, its start (ms) and speed, for the metronome's beats. */
    const timeline:{units:number;ms:number;speed:number}[]=[];let unitsSoFar=0;
    // A tie is two written notes, not one — the second is still its own
    // event here (still gets its own beat position and highlight), but it
    // isn't a fresh sound, it's the first note continuing. Summing each
    // tie chain's total length once, backwards, means the chain's first
    // note gets fluteTone'd for the whole combined duration and every
    // note after it in the chain is skipped rather than re-attacking.
    const soundUnits:number[]=new Array(slice.length);for(let i=slice.length-1;i>=0;i--)soundUnits[i]=slice[i].d+(i+1<slice.length&&slice[i+1].tied?soundUnits[i+1]:0);
    slice.forEach((event,offset)=>{
      const index=fromIndex+offset,start=cursor;
      if(index===changeIndex)changeAt=start;
      while(atMeasure<seq.measureStarts.length&&index>=(seq.measureStarts[atMeasure]??Infinity)){atMeasure++;intoBar=0}
      const speed=speedAt(atMeasure+intoBar/Math.max(1,barLength(atMeasure)));
      intoBar+=event.d;
      timeline.push({units:unitsSoFar,ms:start,speed});unitsSoFar+=event.d;
      // Grace notes take no time of their own. They are collected here and
      // played quickly just before the note they decorate (below), so that
      // note still lands on its beat.
      if(event.d<=0){if(event.p)graces.push({pitch:event.p,level:event.level??1});return}
      const decorations=graces.splice(0);
      if(decorations.length&&!smartMode.current&&playbackAccompaniment.current!=="piano"){
        // About 70ms each, less when the main note is short, never before playback began.
        const each=Math.min(.07,event.d*unit/1000/3),first=Math.max(audioStart,audioStart+start/1000-decorations.length*each);
        playbackTimers.current.push(window.setTimeout(()=>{
          decorations.forEach((grace,i)=>pianoTone(grace.pitch,first+i*each,each*.95,Math.min(.2,.075*grace.level*.85)));
        },Math.max(0,start-decorations.length*each*1000-30)));
      }
      // The moving cursor shows where playback is (see playbackCursor.ts);
      // notes are no longer coloured one by one.
      beats.push({index,at:audioStart+start/1000,end:audioStart+(start+event.d*unit/speed)/1000});
      playbackTimers.current.push(window.setTimeout(()=>{setPlayingEvent(index)},start+80+countIn*1000));
      // The first note always sounds: starting on the second half of a tie
      // (bar 102 of the Pavane) has no earlier note ringing to continue.
      if(!smartMode.current&&playbackAccompaniment.current!=="piano"&&event.p&&(!event.tied||offset===0)){
        const pitch=event.p,{factor,peakGain}=articulationAudio(event.articulation,event.slurContinuation),absoluteStart=audioStart+start/1000,soundDuration=Math.max(.09,soundUnits[offset]*unit/speed/1000*factor);
        // Dynamics and hairpins scale the note (deriveScoreEvents works out the
        // level, 1 = mf); an accent (sf, fz…) pushes just this one note.
        // Preserve the score's decibel spacing. A square root compressed the
        // ppp-to-fff range by half, and the old cap flattened f through fff.
        const gain=Math.min(.19,.06*(peakGain/.075)*(event.level??1)*(event.accent?1.3:1)),trill=event.trill;
        playbackTimers.current.push(window.setTimeout(()=>{
          if(!trill){pianoTone(pitch,absoluteStart,soundDuration,gain,event.articulation==="slur");return}
          // A trill alternates main and upper note, starting on the main note
          // and ending on it, at 32nd notes of the current tempo (kept
          // between about 11 and 18 notes a second so it stays a trill).
          const step=Math.min(.09,Math.max(.055,60/playBpm/8)),count=Math.max(3,Math.floor(soundDuration/step)|1);
          for(let i=0;i<count;i++)pianoTone(i%2?trill:pitch,absoluteStart+i*step,i===count-1?Math.max(step*1.05,soundDuration-i*step):step*1.08,gain*(i%2?.92:1));
        },start));
      }
      cursor+=event.d*unit/speed;
    });

    playbackTimers.current.push(window.setTimeout(rp?.loop?()=>restartRangeRef.current():stopPlayback,cursor+(rp?.loop?20:160)+countIn*1000));
    // Just before the first note of the next section, move the number by the
    // score's ratio; the [bpm] effect then reschedules everything from that
    // note on at the new speed, metronome included.
    if(nextChange&&changeAt!==null){
      const was=tempoSectionAt(fromMeasure);
      const at=changeAt;
      // Fired just before the new section's first note is handed to the audio
      // clock (its timer runs at `at`), after the note before it has been; the
      // reschedule then starts exactly there. Guessing the resume point from
      // the time let it restart in the old section, which scheduled the same
      // change again and multiplied the speed (69 → 120 → 209 → 220).
      playbackTimers.current.push(window.setTimeout(()=>{
        if(!was)return;
        tempoSectionRef.current=nextChange.measure;applySectionMeter(nextChange.measure);
        resumeSectionAt.current=changeIndex??null;
        setPlaybackBpm(Math.max(20,Math.min(300,Math.round(playBpm*printed(nextChange)/printed(was)))),printed(nextChange));
      },Math.max(0,at+countIn*1000-8)));
    }
    if(!smartMode.current&&playbackAccompaniment.current!=='off'&&pianoSamples.current){
      const fromQuarter=seq.events.slice(0,fromIndex).reduce((sum,event)=>sum+event.d,0)/seq.unitsPerBeat;
      const msAt=(quarter:number)=>{const units=(quarter-fromQuarter)*seq.unitsPerBeat;let point=timeline[0];for(const next of timeline){if(next.units>units)break;point=next}return point?point.ms+(units-point.units)*unit/point.speed:units*unit};
      for(const note of accompanimentNotes.current){if(note.at+note.duration<=fromQuarter)continue;const start=Math.max(fromQuarter,note.at),at=msAt(start),end=msAt(note.at+note.duration);playbackNodes.current.push(sampledPianoNote(c,pianoSamples.current,note.pitch,audioStart+at/1000,Math.max(.04,(end-at)/1000),note.level))}
    }
    playbackPosition.current={audioStart,unit,from:fromIndex};
    cursorBeats.current=beats;
    liveTempoPoints.current=smartMode.current?[]:timeline.map(point=>({at:audioStart+point.ms/1000,bpm:playBpm*point.speed}));
    const grid=playbackGrid(fromIndex,audioStart,unit);
    // When the beats are not one even grid (an accel. or rit., or a meter
    // change inside the section: 4/4 to 6/8 keeps the eighths the same length
    // but clicks in dotted quarters), the metronome gets every beat's time
    // from the same timeline as the notes, bar by bar in that bar's own
    // meter, with its downbeats marked for the accent. Up to the next tempo
    // mark, where playback reschedules anyway.
    let beatTimes:number[]|undefined,beatAccents:boolean[]|undefined;
    const stopUnits=Math.min(unitsSoFar,changeIndex!==undefined?timeline[changeIndex-fromIndex]?.units??Infinity:Infinity);
    const lastMeasure=measureForEvent(Math.max(fromIndex,(changeIndex??seq.events.length)-1),seq.measureStarts);
    const meterOf=(measure:number)=>scoreFactsRef.current?.measures[measure-1]??{beats:4,beatType:4};
    const startMeter=meterOf(fromMeasure);
    let meterChanges=false;
    for(let m=fromMeasure+1;m<=lastMeasure&&!meterChanges;m++){const meter=meterOf(m);meterChanges=meter.beats!==startMeter.beats||meter.beatType!==startMeter.beatType}
    if(!smartMode.current&&!unmetered&&(meterChanges||timeline.some(point=>point.speed!==1))){
      beatTimes=[];beatAccents=[];
      let i=0;
      const timeAt=(units:number)=>{while(i<timeline.length-1&&timeline[i+1].units<=units)i++;const point=timeline[i];return audioStart+(point.ms+(units-point.units)*unit/point.speed)/1000};
      // Bar starts measured from fromIndex (so the first bar's start is at or before 0).
      let barStart=0;for(let k=seq.measureStarts[fromMeasure-1]??fromIndex;k<fromIndex;k++)barStart-=seq.events[k].d;
      for(let m=fromMeasure;m<=lastMeasure&&barStart<stopUnits;m++){
        const {beatLen,fullBar}=meterBeat(meterOf(m),seq.unitsPerBeat),length=barLength(m);
        // A pickup bar is the end of a full bar: count its beats back from the barline.
        const shift=m===1&&length>0&&length<fullBar?length-fullBar:0;
        for(let k=0;shift+k*beatLen<length-1e-9;k++){
          const at=barStart+shift+k*beatLen;
          if(at< -1e-9||shift+k*beatLen<0)continue;
          if(at>=stopUnits)break;
          beatTimes.push(timeAt(at));beatAccents.push(k===0);
        }
        barStart+=length;
      }
    }
    alignMetronome(unmetered?(smartMode.current?{...countGrid,time:countIn?clockStart:audioStart}:null):countIn?{...grid,time:audioStart-countIn,beatInBar:0}:beatTimes?{...grid,beatTimes,beatAccents}:grid);
  }
  /**
   * Where the beats fall once playback starts at `fromIndex`, for the
   * metronome to click on. Starting mid-bar (or on a pickup) the first click
   * is the next real beat, counted in that bar's meter, so beat 1 still gets
   * the accent. A meter change later in the piece keeps the starting bar's
   * grid; none of the library's pieces change meter.
   */
  function playbackGrid(fromIndex:number,audioStart:number,unit:number){
    const seq=sequenceRef.current,measure=measureForEvent(fromIndex,seq.measureStarts),barStart=seq.measureStarts[measure-1]??0;
    const measureGrid=meterBeat(scoreFactsRef.current?.measures[measure-1]??{beats:4,beatType:4},seq.unitsPerBeat);
    const fullBar=measureGrid.fullBar,beatLen=config.pulsePerMeasure?fullBar:measureGrid.beatLen;
    const units=(from:number,to:number)=>seq.events.slice(from,to).reduce((sum,event)=>sum+event.d,0);
    const firstBar=measure===1?units(0,seq.measureStarts[1]??seq.events.length):fullBar,pickup=firstBar>0&&firstBar<fullBar?fullBar-firstBar:0;
    const position=units(barStart,fromIndex)+pickup,beatsPerBar=Math.max(1,Math.round(fullBar/beatLen)),next=Math.ceil(position/beatLen-1e-9);
    // firstUnits/beatLen let scheduleNotes place beats on a bending (accel./rit.) timeline.
    return {time:audioStart+(next*beatLen-position)*unit/1000,beatSeconds:beatLen*unit/1000,beatInBar:next%beatsPerBar,beatsPerBar,firstUnits:next*beatLen-position,beatLen,pickupBeats:pickup/beatLen};
  }
  // Play, pause, play again: pausing remembers the note playback reached,
  // and the next Play carries on from it instead of starting over. Choosing
  // a bar (a new selectedMeasure) forgets it, so that bar is where it starts.
  const resumeAt=useRef<number|null>(null);
  useEffect(()=>{resumeAt.current=null;applySectionMeter(selectedMeasure??1)},[selectedMeasure]);
  async function togglePlayback(withAccompaniment=false){
    if(!playing)playbackAccompaniment.current=withAccompaniment?accompanimentMode:"off";
    if(!playing&&playbackAccompaniment.current!=='off'){
      setPianoLoading(true);setPianoError('');try{const context=audio();await context.resume();pianoSamples.current=await loadPiano(context);if(!accompanimentNotes.current.length)throw new Error('Accompaniment is not ready');countInPending.current=true}catch(error){setPianoError(error instanceof Error?error.message:'Could not load piano');return}finally{setPianoLoading(false)}
    }
    smartMode.current=false;
    if(playing){resumeAt.current=playingEvent;stopPlayback();return}
    setPlaying(true);
    const first=resumeAt.current??sequenceRef.current.measureStarts[startMeasure-1]??0;
    resumeAt.current=null;
    setPlayingFrom(first);scheduleNotes(first);
  }
  /**
   * Play from one note rather than from the transport's start measure.
   * Re-pressing the control that started it stops, so the caller can render
   * a single play/stop button per section. The start measure moves with it,
   * so the main transport picks up where this left off.
   */
  function playFromEvent(eventIndex:number){
    smartMode.current=false;
    if(playing&&playingFrom===eventIndex){stopPlayback();return}
    if(playing)stopPlayback();
    const seq=sequenceRef.current;
    const index=Math.max(0,Math.min(eventIndex,Math.max(0,seq.events.length-1)));
    setSelectedMeasure(measureForEvent(index,seq.measureStarts));
    setPlaying(true);setPlayingFrom(index);scheduleNotes(index);
  }
  /** Play the selected bars once, or round and round. Pressing the same button again stops. */
  useEffect(()=>{
    if(selectedMeasure===null)return;
    const key=(e:KeyboardEvent)=>{
      if(e.key!=="Escape"||(e.target as HTMLElement)?.closest?.("input,textarea,[role=dialog]"))return;
      if(closeupOpen)setCloseup(null);else setSelectedMeasure(null);
    };
    window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);
  },[selectedMeasure,closeupOpen]);
  function openCloseup(){
    const current=selectionRef.current;if(!current||current.to<=current.from)return;
    const printed=(position:number)=>scoreFactsRef.current?.measures[position-1]?.number??String(position);
    stopPlayback();if(smartRunning)stopAutoDrone();setFingerTip(null);setAnnotating(false);setDroneArmed(false);
    setCloseup({from:current.from,to:current.to,numbers:{from:printed(current.from),to:printed(current.to)}});
  }
  function playRange(loop:boolean){
    const current=selectionRef.current;if(!current||current.to<=current.from)return;
    if(playing&&rangeMode===(loop?"loop":"once")){stopPlayback();return}
    if(playing)stopPlayback();
    if(smartRunning)stopAutoDrone();
    smartMode.current=false;playbackAccompaniment.current="off";
    const seq=sequenceRef.current,start=seq.measureStarts[current.from-1]??0,end=seq.measureStarts[current.to]??seq.events.length;
    rangePlay.current={start,end,loop};setRangeMode(loop?"loop":"once");
    setFingerTip(null);setPlaying(true);setPlayingFrom(start);scheduleNotes(start);
  }
  function restartRange(){
    const range=rangePlay.current;if(!range)return;
    stopPlayback();rangePlay.current=range;setRangeMode("loop");
    setPlaying(true);setPlayingFrom(range.start);scheduleNotes(range.start,false);
  }
  const restartRangeRef=useRef(restartRange);restartRangeRef.current=restartRange;
  function showNoteInfo(node:SVGGElement,x:number,y:number){
    if(noteDisplay==="off"&&!fingering&&activeRhythmMode==="off"){setFingerTip(null);return}
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
  /**
   * The bar under a tap, including its empty space between notes. Hit-testing
   * is left to the browser and the comparison done in the SVG's own
   * coordinates, because score magnification makes screen rects of
   * SVG elements disagree with the pointer (see markPlayStart).
   */
  function measureAt(x:number,y:number){
    const root=scoreRef.current;if(!root)return null;
    const stack=document.elementsFromPoint(x,y);
    let bar=stack.find(el=>el.classList?.contains("vf-measure")&&root.contains(el)) as SVGGElement|undefined;
    if(!bar){
      const svg=stack.find((el):el is SVGSVGElement=>el instanceof SVGSVGElement&&root.contains(el)),matrix=svg?.getScreenCTM();
      if(!svg||!matrix)return null;
      const point=new DOMPoint(x,y).matrixTransform(matrix.inverse());
      bar=[...svg.querySelectorAll<SVGGElement>(".vf-measure")].find(measure=>{const box=measure.getBBox();return point.x>=box.x&&point.x<=box.x+box.width&&point.y>=box.y-12&&point.y<=box.y+box.height+12});
    }
    const measure=Number(bar?.querySelector<SVGGElement>(".vf-stavenote[data-measure]")?.dataset.measure);
    return measure>0?measure:null;
  }
  /**
   * A term (mf, cresc., a fermata…) within a fingertip of the tap. The glyphs are small, so on a
   * tablet a tap usually lands just beside one and would otherwise select the bar underneath.
   */
  function theoryNear(x:number,y:number){
    const root=scoreRef.current;if(!root)return null;
    const slop=14;let best:SVGElement|null=null,dist=Infinity;
    root.querySelectorAll<SVGElement>("[data-theory]").forEach(el=>{
      const r=el.getBoundingClientRect();if(!r.width&&!r.height)return;
      const dx=Math.max(r.left-x,0,x-r.right),dy=Math.max(r.top-y,0,y-r.bottom),d=Math.hypot(dx,dy);
      if(d<=slop&&d<dist){best=el;dist=d}
    });
    return best as SVGElement|null;
  }
  /** Handles on both ends of a range, and the floating bar above it. Handles live inside the engraving (OSMD wipes them on a redraw, and the effect that calls this redraws them). */
  function placeRangeUi(){
    const root=scoreRef.current,scroller=scoreScrollRef.current;if(!root||!scroller)return;
    const tints=[...root.querySelectorAll<SVGElement>(".play-start-bar")];
    const handles=[...root.querySelectorAll<HTMLElement>(".range-handle")];
    if(!isRange||tints.length<2){handles.forEach(handle=>handle.remove());setRangeBarAt(null);return}
    const make=(side:"start"|"end")=>{
      const handle=document.createElement("div");handle.className="range-handle";handle.dataset.side=side;
      handle.addEventListener("pointerdown",event=>{
        event.preventDefault();event.stopPropagation();handle.setPointerCapture(event.pointerId);touchSelecting.current=true;swallowClick.current=true;
        const move=(moved:PointerEvent)=>moveHandleRef.current(side,moved.clientX,moved.clientY);
        const done=()=>{handle.removeEventListener("pointermove",move);handle.removeEventListener("pointerup",done);handle.removeEventListener("pointercancel",done);touchSelecting.current=false};
        handle.addEventListener("pointermove",move);handle.addEventListener("pointerup",done);handle.addEventListener("pointercancel",done);
      });
      root.appendChild(handle);return handle;
    };
    const start=handles.find(h=>h.dataset.side==="start")??make("start"),end=handles.find(h=>h.dataset.side==="end")??make("end");
    const box=root.getBoundingClientRect(),scale=root.offsetWidth?box.width/root.offsetWidth:1,first=tints[0].getBoundingClientRect(),last=tints[tints.length-1].getBoundingClientRect();
    start.style.left=`${(first.left-box.left)/scale}px`;start.style.top=`${(first.bottom-box.top)/scale}px`;
    end.style.left=`${(last.right-box.left)/scale}px`;end.style.top=`${(last.bottom-box.top)/scale}px`;
    updateRangeBar();
  }
  /** The floating bar sits just above the first bar, or under the last one when there is no room above. */
  function updateRangeBar(){
    const root=scoreRef.current,scroller=scoreScrollRef.current;if(!root||!scroller)return;
    const tints=[...root.querySelectorAll<SVGElement>(".play-start-bar")];
    if(!isRange||tints.length<2){setRangeBarAt(null);return}
    const first=tints[0].getBoundingClientRect(),last=tints[tints.length-1].getBoundingClientRect(),view=scroller.getBoundingClientRect();
    let y=first.top-52;if(y<view.top+6)y=Math.min(last.bottom+14,view.bottom-56);
    const width=document.querySelector<HTMLElement>(".range-bar")?.offsetWidth??(window.innerWidth<=760?190:330);
    const x=Math.max(8,Math.min(first.left,window.innerWidth-width-8));
    setRangeBarAt(previous=>previous&&Math.abs(previous.x-x)<1&&Math.abs(previous.y-y)<1?previous:{x,y});
  }
  /** A handle was dragged: the bar under the finger (a little above the handle) becomes that end of the range. */
  function moveHandle(side:"start"|"end",x:number,y:number){
    const bar=measureAt(x,y-30)??measureAt(x,y),current=selectionRef.current;
    if(bar===null||!current)return;
    if(side==="start")setRange(Math.min(bar,current.to),current.to);else setRange(current.from,Math.max(bar,current.from));
  }
  useEffect(()=>{
    const scroller=scoreScrollRef.current;if(!scroller)return;
    const block=(e:TouchEvent)=>{if(touchSelecting.current&&e.cancelable)e.preventDefault()};
    const follow=()=>updateRangeBar();
    scroller.addEventListener("touchmove",block,{passive:false});scroller.addEventListener("scroll",follow,{passive:true});window.addEventListener("resize",follow);
    return()=>{scroller.removeEventListener("touchmove",block);scroller.removeEventListener("scroll",follow);window.removeEventListener("resize",follow)};
  });
  const moveHandleRef=useRef(moveHandle);moveHandleRef.current=moveHandle;
  /**
   * Selecting a range by pointer. A mouse drags once it enters a second bar (so a plain click stays a click). A finger needs a
   * long press first (about 0.4s without moving), because a plain drag has to keep scrolling; after the press, the drag extends the range.
   */
  function scorePointerDown(e:React.PointerEvent<HTMLDivElement>){
    swallowClick.current=false;
    if(annotating||onPracticeNote||(e.pointerType==="mouse"&&e.button!==0)||(e.target as Element).closest("[data-theory],.range-handle"))return;
    const bar=measureAt(e.clientX,e.clientY);if(bar===null)return;
    const g={id:e.pointerId,type:e.pointerType,x:e.clientX,y:e.clientY,bar,mode:"idle" as "idle"|"drag"|"press",timer:0};
    gesture.current=g;
    if(e.pointerType!=="mouse")g.timer=window.setTimeout(()=>{
      if(gesture.current!==g)return;
      g.mode="press";touchSelecting.current=true;setFingerTip(null);setRange(bar,bar);navigator.vibrate?.(8);
    },400);
  }
  function scorePointerMove(e:React.PointerEvent<HTMLDivElement>){
    const g=gesture.current;if(!g||g.id!==e.pointerId)return;
    if(g.mode==="idle"){
      if(g.type==="mouse"){
        if(e.buttons!==1)return;
        const bar=measureAt(e.clientX,e.clientY);
        if(bar!==null&&bar!==g.bar){g.mode="drag";swallowClick.current=true;setFingerTip(null);setRange(Math.min(g.bar,bar),Math.max(g.bar,bar))}
      }else if(Math.hypot(e.clientX-g.x,e.clientY-g.y)>8){window.clearTimeout(g.timer);gesture.current=null}
      return;
    }
    const bar=measureAt(e.clientX,e.clientY);
    if(bar!==null)setRange(Math.min(g.bar,bar),Math.max(g.bar,bar));
  }
  function scorePointerEnd(e:React.PointerEvent<HTMLDivElement>){
    const g=gesture.current;if(!g||g.id!==e.pointerId)return;
    window.clearTimeout(g.timer);
    if(g.mode!=="idle"){swallowClick.current=true;touchSelecting.current=false}
    gesture.current=null;
  }
  function scoreClick(e:React.MouseEvent<HTMLDivElement>){
    if(annotating)return;
    if(swallowClick.current){swallowClick.current=false;return}
    if(config.story&&(e.target as Element).closest("[data-composer-card]")){setTheoryTip(null);setStoryCard(storyCard?null:{x:e.clientX,y:e.clientY});return}
    setStoryCard(null);
    const node=(e.target as Element).closest<SVGGElement>(".vf-stavenote[data-pitch]")??noteNear(e.clientX,e.clientY);
    // Directly on a term, or near one when the tap isn't right on a note.
    const onNote=!!(e.target as Element).closest(".vf-stavenote");
    const theory=(e.target as Element).closest<SVGElement>("[data-theory]")??(theoryEnabled&&!onNote?theoryNear(e.clientX,e.clientY):null);
    if(theoryEnabled&&theory){setTheoryTip({title:theory.dataset.theoryTitle??"",text:theory.dataset.theory!,x:e.clientX,y:e.clientY});return}
    setTheoryTip(null);
    if(onPracticeNote){if(node)onPracticeNote(Number(node.dataset.event));else setFingerTip(null);return}
    // A tap is the only gesture a tablet has, so it cannot mean "sound this
    // note" and "start playback here" at once. With the drone control on, a
    // tap right on a note drones it and a tap anywhere else in the bar still
    // picks the bar Listen starts from; otherwise a tap picks the bar (tap it
    // again to go back to the top) and tells you about the note under it.
    const onPitch=(e.target as Element).closest<SVGGElement>(".vf-stavenote[data-pitch]");
    const match=onPitch?.dataset.pitch!.match(/^([A-G][♯♭]?)(\d)$/);
    if(droneArmed&&onPitch&&match){toggleDrone(match[1],+match[2]);showNoteInfo(onPitch,e.clientX,e.clientY);return}
    const measure=measureAt(e.clientX,e.clientY)??(node?Number(node.dataset.measure)||null:null);
    // Shift-click: everything from the first selected bar to this one.
    if(e.shiftKey&&measure!==null&&selection){const anchor=selection.from;setRange(Math.min(anchor,measure),Math.max(anchor,measure));setFingerTip(null);return}
    // While Listen is playing, a tap on a bar jumps playback there.
    if(playing&&!smartMode.current&&measure!==null){
      stopPlayback();setSelectedMeasure(measure);
      const first=sequenceRef.current.measureStarts[measure-1]??0;
      setPlaying(true);setPlayingFrom(first);scheduleNotes(first);
      setFingerTip(null);return;
    }
    // A bar inside the selection clears it; any other bar becomes the new single bar.
    if(measure!==null)setSelectedMeasure(selection&&measure>=selection.from&&measure<=selection.to?null:measure);
    if(node)showNoteInfo(node,e.clientX,e.clientY);else setFingerTip(null);
  }
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
      const osmd=new OpenSheetMusicDisplay(stage,{backend:"svg",autoResize:false,drawTitle:true,drawComposer:true,drawingParameters:"compacttight"});applySlurRules(osmd);
      osmd.setOptions({pageFormat:"A4 P",drawMeasureNumbers:true,drawPartNames:false,drawMetronomeMarks:true,newSystemFromXML:lineBreak?.value??false});
      osmd.EngravingRules.RenderChordSymbols=false;
      osmd.EngravingRules.RenderMultipleRestMeasures=false;osmd.EngravingRules.AutoGenerateMultipleRestMeasuresFromRestMeasures=false;
      const printTitle=plainAccidentals(printConfig?.title??title);
      let printFacts:ScoreFacts|null=null;
      osmd.OnXMLRead=xml=>{printFacts=readScoreFacts(xml);return prepareScore(xml,printTitle)};
      const suppress=unmetered?applyExerciseRules(osmd):()=>{};
      await osmd.load(printConfig?.asset??asset,printTitle);
      suppress();
      const tuck=(printFacts as ScoreFacts|null)?.tempoWordsWithMetronome??false;
      osmd.EngravingRules.MetronomeMarkYShift=tuck?METRONOME_TUCK_SHIFT:-1;
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
      reshapeSlurs(stage);
      spaceMetronomeMarks(stage);
      if(tuck)tuckMetronomeMarks(stage);
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
  // The notes the current drone sits under turn blue, the same way notes with a manual drone do.
  useEffect(()=>{
    const root=scoreRef.current;if(!root)return;
    root.querySelectorAll('.vf-stavenote.smart-drone-active').forEach(n=>n.classList.remove('smart-drone-active'));
    if(!smartRunning||smartEvent===null)return;
    const seq=sequenceRef.current,pitches=droneEvents(config.smartDrone??[],seq.events,seq.measureStarts),audible=pitches[smartEvent];if(!audible)return;
    let first=smartEvent,last=smartEvent;
    while(first>0&&pitches[first-1]===audible)first--;
    while(last+1<pitches.length&&pitches[last+1]===audible)last++;
    // Only the notes that are the drone's own pitch, in its own octave as written on the page, not everything it sounds under.
    const tonic=droneEvents((config.smartDrone??[]).map(change=>({...change,pitch:change.displayPitch??change.pitch})),seq.events,seq.measureStarts)[smartEvent];if(!tonic)return;
    const spell=(pitch:string)=>pitch.replace(/#/g,'♯').replace(/^([A-G])b/,'$1♭'),target=spell(tonic);
    root.querySelectorAll<SVGGElement>('.vf-stavenote[data-event]').forEach(node=>{
      const index=Number(node.dataset.event),written=node.dataset.noteName&&node.dataset.noteOctave?node.dataset.noteName+node.dataset.noteOctave:node.dataset.pitch;
      if(index>=first&&index<=last&&written&&spell(written)===target)node.classList.add('smart-drone-active');
    });
  },[smartRunning,smartEvent,layoutVersion,config.smartDrone]);

  const readerControls:ReaderControls={bpm,setTempo:setBpm,metronome:metro,toggleMetronome:toggleMetro,playing,playFromEvent,playingFrom,playingEvent,download:downloadPdf,exporting};
  const droneControls=<>          <div className="transport-menu">
            <button aria-label={t.scoreViewer.drone} aria-pressed={droneArmed||drones.length>0} data-tip={t.scoreViewer.droneTip} className={droneArmed||drones.length?"tool on has-tip drone-tool":"tool has-tip drone-tool"} onClick={()=>{if(droneArmed)stopAllDrones();else flashDroneHint();setDroneArmed(!droneArmed)}}><PracticeIcon name="drone"/>{t.scoreViewer.drone}<small>{drones.length?drones.join("+"):droneArmed?t.scoreViewer.droneOn:t.scoreViewer.droneOff}</small></button>
          </div>{config.smartDrone&&<button type="button" data-tip={smartRunning?"Stop":"Tonic drone with count-in"} aria-pressed={smartRunning} aria-label={smartRunning?"Stop auto drone":"Start auto drone"} className={`tool has-tip smart-drone-trigger${smartRunning?" on":""}`} onClick={()=>{
      if(smartRunning){stopAutoDrone();return}
      stopAllDrones();setDroneArmed(false);if(!metro){toggleMetro();smartStartedMetronome.current=true}setSmartEvent(null);setSmartRunning(true);
      const first=sequenceRef.current.measureStarts[smartStartMeasure-1]??0;scheduleAutoDrone(first,true);
    }}><span className="auto-drone-icon"><PracticeIcon name="drone"/><PracticeIcon name={smartRunning?'pause':'play'}/></span>Auto drone</button>}</>;
  const accompanimentControl=config.accompaniment&&<ReaderPopover panelClassName="reader-play-card" label={zh?'伴奏':'Accompaniment'} trigger={<><PracticeIcon name="piano"/>{zh?'伴奏':'Accompaniment'}</>} className={`tool has-tip reader-accompaniment${playing&&playbackAccompaniment.current!=='off'?' on':''}`}><div className="reader-play-row"><div className="reader-choice" role="group" aria-label={zh?"伴奏方式":"Accompaniment playback"}>{([['piano',zh?'仅钢琴':'Piano only'],['both',zh?'钢琴与长笛':'Piano + flute']] as const).map(([mode,label])=><button key={mode} aria-pressed={accompanimentMode===mode} onClick={()=>{if(playing)stopPlayback();setAccompanimentMode(mode)}}>{label}</button>)}</div><button className={playing?"reader-play-start on":"reader-play-start"} disabled={pianoLoading} aria-label={playing?(zh?'暂停':'Pause'):(zh?'开始播放':'Start playback')} onClick={()=>togglePlayback(true)}><PracticeIcon name={playing?'pause':'play'}/></button></div>{pianoLoading&&<p role="status">{zh?'正在载入钢琴…':'Loading piano…'}</p>}{pianoError&&<p role="alert">{pianoError}</p>}</ReaderPopover>;
  const viewControls=<div className="reader-view">{settings?.(readerControls)}

          <ReaderPopover label={zh?"显示设置":"View settings"} trigger={<><PracticeIcon name="view"/>{zh?"显示":"View"}</>} className="tool has-tip">

            <div className="reader-setting-row"><div className="reader-row-head"><span>{zh?"页面布局":"Page layout"}</span><button type="button" className="reader-text-action" title={zh?"让整页谱子适合窗口":"Make the music fit this window"} onClick={fitToPage}>{zh?"适合一页":"Fit page"}</button></div>{fitNote&&<small className="reader-fit-note" role="status">{fitNote}</small>}<div className="reader-choice" role="group" aria-label={zh?"页面布局":"Page layout"}>{[["900",zh?"竖向单页":"Portrait"],["auto",zh?"适应窗口":"Fit window"],["spread",zh?"双页":"Two pages"]].map(([value,label])=><button key={value} aria-pressed={pageWidth===value} onClick={()=>{setPageWidth(value);if(tabletReader(navigator.maxTouchPoints,Math.min(screen.width,screen.height)))try{localStorage.setItem(`${viewPrefsKey}:tablet-layout`,value)}catch{/* Keep the selected layout for this visit. */}}}>{label}</button>)}</div></div>
            {practiceTempo&&<div className="reader-setting-row"><span>{zh?"练习速度":"Practice tempo"}</span><div className="reader-choice" role="group" aria-label={zh?"练习速度":"Practice tempo"}><button aria-pressed={!practiceTempo.value} onClick={()=>practiceTempo.onChange(false)}>{zh?"隐藏":"Hidden"}</button><button aria-pressed={practiceTempo.value} onClick={()=>practiceTempo.onChange(true)}>{zh?"显示在乐谱上":"On the page"}</button></div></div>}
            {lineBreak&&<div className="reader-setting-row"><span>{zh?"换行":"Line breaks"}</span><div className="reader-choice" role="group" aria-label={zh?"换行":"Line breaks"}><button aria-pressed={!lineBreak.value} onClick={()=>lineBreak.onChange(false)}>{zh?"接续上一个":"Continue from previous"}</button><button aria-pressed={lineBreak.value} onClick={()=>lineBreak.onChange(true)}>{zh?"另起一行":"Start on a new line"}</button></div></div>}
            <label className="reader-setting-row">{zh?"音符大小":"Notation size"}<input type="range" min="0.6" max="2" step="0.05" value={sizePreference} onChange={e=>{userSizeRef.current=+e.target.value;setSizePreference(+e.target.value)}}/></label>
            <label className="reader-setting-row">{zh?"行间距":"System spacing"}<input type="range" min="4" max="40" step="1" value={systemSpacing} onChange={e=>setSystemSpacing(+e.target.value)}/></label>
            <label className="reader-setting-row">{zh?"音符间距":"Note spacing"}<input type="range" min="0.3" max="2" step="0.05" value={noteSpacing} onChange={e=>setNoteSpacing(+e.target.value)}/></label>
            {/* The other groups in this panel are labelled; this one was a
                bare row of icons, so what the five toggles had in common was
                left for the reader to infer. */}
            <div className="reader-setting-row reader-setting-row--stack"><span>{zh?"在谱面上显示":"Show on the page"}</span>
            <div className="reader-display-options">
        <button data-tip={t.scoreViewer.noteDisplayTip} className={noteDisplay!=="off"?"tool on has-tip":"tool has-tip"} onClick={cycleNoteDisplay}><span>A♭</span>{noteDisplay==="off"?t.scoreViewer.noteDisplay:noteDisplay==="names"?t.scoreViewer.noteNames:t.scoreViewer.solfege}</button>
        {!unmetered&&<button data-tip={t.scoreViewer.rhythmDisplay} className={rhythmMode!=="off"?"tool on has-tip":"tool has-tip"} onClick={cycleRhythm}><span>▥</span>{t.scoreViewer.rhythm}</button>}
        <button data-tip={t.scoreViewer.accidentalsTip} className={accidentals?"tool on has-tip":"tool has-tip"} onClick={()=>setAccidentals(!accidentals)}><span>♯</span>{t.scoreViewer.accidentals}</button>
        <button data-tip={t.scoreViewer.tonguingTip} className={tonguing?"tool on has-tip":"tool has-tip"} onClick={()=>setTonguing(!tonguing)}><span>•</span>{t.scoreViewer.tonguing}</button>
        <button data-tip={t.scoreViewer.fingeringTip} className={fingering?"tool on has-tip":"tool has-tip"} onClick={()=>setFingering(!fingering)}><span>●○</span>{t.scoreViewer.fingering}</button>
<button data-tip={t.scoreViewer.musicalTermsTip} className={theoryEnabled?"tool on has-tip":"tool has-tip"} aria-pressed={theoryEnabled} onClick={()=>setTheoryEnabled(v=>!v)}><span>𝑓</span>{zh?"音乐术语":"Musical terms"}</button></div>
            </div><button className="reader-settings-reset" onClick={()=>{/* A clean page: every "Show on the page" overlay off, not just the layout sliders. */setNoteDisplay("off");setRhythmMode("off");setAccidentals(false);setTonguing(false);setFingering(false);setTheoryEnabled(false);userSizeRef.current=.8;setSizePreference(.8);setSystemSpacing(12);setNoteSpacing(defaultNoteSpacing??(unmetered?0.82:1));/* Pinch or Ctrl-scroll zoom is part of the view too. */magnifyRef.current=1;setMagnify(1);scoreScrollRef.current?.closest<HTMLElement>(".restored-reader")?.style.setProperty("--viewer-magnify","1");setPageWidth(initialReaderLayout(tabletReader(navigator.maxTouchPoints,Math.min(screen.width,screen.height))));try{localStorage.removeItem(`${viewPrefsKey}:tablet-layout`)}catch{/* Defaults still apply for this visit. */}}}>{zh?"恢复默认":"Restore defaults"}</button>
          </ReaderPopover>
        </div>;
  return <main className="app-shell reader-workspace restored-reader" data-layout={pageWidth} data-annotating={annotating} data-dock={dock||closeupOpen?"true":undefined} style={{"--reader-page-width":pageWidth==="900"?"900px":"100%","--viewer-magnify":magnify} as React.CSSProperties}>
    <section className="workspace">
      <header className="topbar"><div><Link className="back has-tip" href={backHref} aria-label={backLabel?`${t.scoreViewer.back}: ${backLabel}`:t.scoreViewer.back} data-tip={backLabel||t.scoreViewer.back}><BackChevron/></Link>{(config.backName??(toolbar?undefined:title))&&<span className="back__name">{config.backName??title}</span>}{!toolbar&&<strong>{title}</strong>}</div><div><span className="topbar-toolbar-slot">{toolbar}</span>{/* No star: a score goes on one of your lists (want to learn, working on, learned). Scale Studio instead saves the panel as a set: a + that turns into a tick. */}{save?<button type="button" className="icon-btn has-tip reader-set-save" aria-pressed={save.saved} data-tip={save.saved?save.savedLabel:save.label} aria-label={save.saved?save.savedLabel:save.label} onClick={save.onToggle}>{save.saved?<CheckIcon/>:<PlusIcon/>}</button>:<StatusButton id={config.listId??config.id} zh={lang==="zh"}/>}{headerActions?.(readerControls)}{pdfPath&&<a className="icon-btn has-tip" href={pdfPath} download data-tip={t.scoreViewer.downloadPdf} aria-label={t.scoreViewer.downloadPdf}><DownloadIcon/></a>}{/* The reader hides the studio nav, so the two controls that live there on every other page — practice tools and the account menu — come here instead, on the same row as the back link. */}<span className="topbar-spacer"/><div id="reader-tools-slot" className="topbar-tools-slot"/><AccountMenu/></div></header>

      <div className="practice-bar"><div className="tool-group">        <button data-tip={t.scoreViewer.markUpTip} className={annotating?"tool on coral has-tip":"tool has-tip"} onClick={()=>setAnnotating(!annotating)}><PracticeIcon name="markup"/>{t.scoreViewer.markUp}</button>
      </div>
        <div className="transport">{practiceActions}<PracticeRecorder/><div className="transport-pill"><button data-tip={t.scoreViewer.playTip(selectedMeasure)} className={playing?"tool on has-tip":"tool has-tip"} disabled={pianoLoading||closeupOpen} aria-label={playing?(lang==="zh"?"暂停":"Pause"):t.scoreViewer.play} onClick={()=>togglePlayback()}><PracticeIcon name={playing?"pause":"play"}/>{playing?(lang==="zh"?"暂停":"Pause"):t.scoreViewer.play}</button>{/* Everything about tempo in one group: the metronome that sounds it, the number, and the steppers. The metronome used to sit after Listen, which is what made "Listen" read as "start the metronome"; the steppers reuse the − n + shape the on-page tempo marks already use rather than a spinner. */}<div className="tempo-group"><button data-tip={t.scoreViewer.metronomeTip} className={metro&&!metroHeld?"tool on has-tip":"tool has-tip"} onClick={()=>{if(metroHeld)alignMetronome(null);else toggleMetro()}}><PracticeIcon name="metronome"/>{t.scoreViewer.metronome}</button>{/* A div, not a label: buttons nested in a label get the label's hover applied to them as a set — hovering + lit up − too — and a tap on one activates the label, which focuses the number field and would raise the keyboard on a tablet. Only the field is labelled. */}<div className="tempo"><button type="button" className="tempo-step" aria-label={zh?"减慢":"Slower"} disabled={bpm<=30} onClick={()=>setBpm(bpm-1)}>−</button><label className="tempo-field"><input aria-label={t.scoreViewer.tempoAria} type="number" min="30" max="220" value={tempoDraft??(playing?liveTempo??bpm:bpm)} onFocus={()=>setTempoDraft(String(bpm))} onChange={e=>setTempoDraft(e.target.value)} onBlur={commitTempo} onKeyDown={e=>{if(e.key==="Enter")e.currentTarget.blur()}}/></label><button type="button" className="tempo-step" aria-label={zh?"加快":"Faster"} disabled={bpm>=220} onClick={()=>setBpm(bpm+1)}>+</button></div></div><button className="tool has-tip reader-tap" data-tip={t.scoreViewer.tapTempo} aria-label={t.scoreViewer.tapTempo} onClick={tapTempo}><PracticeIcon name="tap"/>{zh?"打拍":"Tap"}</button></div>{accompanimentControl}
          {droneControls}
        </div>      <div className="reader-header restored-view-controls">
        {viewControls}
        <div className="reader-pages" data-mode="pages">{/* Back to the first page. A long exercise book is a lot of
            arrow presses to get home, and in scroll mode there are no
            arrows at all — this is the only way back to the top. */}
          <button className="reader-pages__top" aria-label={zh?"回到开头":"Back to top"} data-tip={zh?"回到开头":"Back to top"} disabled={pageIndex<=0&&(scoreScrollRef.current?.scrollTop??0)<8} onClick={backToTop}><PracticeIcon name="top"/></button><button aria-label={t.scoreViewer.previousPage} disabled={pageIndex<=0} onClick={()=>goToPage(pageIndex-1)}><PracticeIcon name="previous"/></button><button aria-label={t.scoreViewer.nextPage} disabled={pageIndex>=pageCount-1} onClick={()=>goToPage(pageIndex+1)}><PracticeIcon name="next"/></button><span aria-live="polite">{spreadPageCount?`${pageIndex*2+1}${pageIndex*2+2<=spreadPageCount?`–${pageIndex*2+2}`:""} / ${spreadPageCount}`:`${pageIndex+1} / ${pageCount}`}</span><button className="tool has-tip" aria-pressed={focusMode} data-tip={focusMode?t.scoreViewer.exitFocusMode:t.scoreViewer.focusModeTip} aria-label={focusMode?t.scoreViewer.exitFocusMode:t.scoreViewer.enterFocusMode} onClick={toggleFocusMode}><PracticeIcon name={focusMode?"exitFullscreen":"fullscreen"}/></button></div>
</div>
</div>
      <div className="reader-rows">{practiceRow}<div className="markup-row" ref={setAnnotationToolbar}/></div>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- The score is a pointer and touch surface (tap a bar, a note, a mark). Keyboard use goes through the page-level arrow keys and the toolbar buttons, so a tab stop on the engraving itself would add nothing. */}
      <div className="score-scroll" ref={scoreScrollRef}>{countBeat!==null&&<div className="score-count-in" role="status" aria-label={`Count in, beat ${countBeat%countBar+1}`}><span>{Array.from({length:countBar},(_,beat)=><i key={beat} className={beat===countBeat%countBar?"current":beat<countBeat%countBar?"done":""}/>)}</span></div>}<div className="score-paper engraved" data-loading={loading}><div className="custom-score-heading"><h1>{title.split(/(\d+)/).map((part,index)=>/^\d+$/.test(part)?<span key={index} className="score-title-number">{part}</span>:part)}</h1>{config.subtitle&&<p className="excerpt-score-subtitle">{config.subtitle}</p>}{config.story?<button type="button" className="score-composer" aria-expanded={!!storyCard} onClick={e=>{e.stopPropagation();setTheoryTip(null);setStoryCard(storyCard?null:{x:e.clientX,y:e.clientY})}}>{composer}</button>:<div className="score-composer">{composer}</div>}</div>{showSpinner&&<div className="score-loading" role="status" aria-label={t.scoreViewer.engraving}/>}{error&&<div className="score-error">{error}</div>}<div ref={scoreRef} className="osmd-score" data-theory-enabled={theoryEnabled} data-note-tap={droneArmed||fingering||noteDisplay!=="off"||activeRhythmMode!=="off"||!!onPracticeNote?"on":undefined} onMouseMove={scoreMove} onMouseLeave={()=>{setFingerTip(null);setTheoryTip(null)}} onPointerDown={scorePointerDown} onPointerMove={scorePointerMove} onPointerUp={scorePointerEnd} onPointerCancel={scorePointerEnd} onClick={scoreClick}/>{scoreMarks&&marksLayer&&createPortal(scoreMarks({root:scoreRef.current,version:layoutVersion,magnify,controls:readerControls}),marksLayer)}<AnnotationLayer key={id} id={id} active={annotating} layoutReady={!loading} layoutVersion={layoutVersion} toolbar={annotationToolbar} zh={zh} onClose={()=>setAnnotating(false)} zoom={magnify} onZoom={zoomAnnotations}/>
      </div>{droneArmed&&droneHint&&<div className="drone-hint" role="status">{t.scoreViewer.droneTip}</div>}{rangeBarAt&&isRange&&!closeupOpen&&<div className="range-bar" role="toolbar" aria-label={zh?"所选小节":"Selected bars"} style={{left:rangeBarAt.x,top:rangeBarAt.y}}><button type="button" aria-label={rangeMode==="once"?(zh?"停":"Stop"):(zh?"播放所选小节":"Play selected bars")} className={rangeMode==="once"?"on":undefined} onClick={()=>playRange(false)}><PracticeIcon name={rangeMode==="once"?"pause":"play"}/>{rangeMode==="once"?(zh?"停":"Stop"):(zh?"播放":"Play")}</button><button type="button" aria-label={zh?"循环所选小节":"Loop selected bars"} aria-pressed={rangeMode==="loop"} className={rangeMode==="loop"?"on":undefined} onClick={()=>playRange(true)}><PracticeIcon name="loop"/>{zh?"循环":"Loop"}</button>{config.practiceGuide&&<button type="button" aria-label={zh?"近看所选小节":"Close-up of selected bars"} onClick={openCloseup}><PracticeIcon name="zoom"/>{zh?"近看":"Close-up"}</button>}<button type="button" disabled aria-label={zh?"精练小节（即将推出）":"Tricky bits (coming soon)"} title={zh?"即将推出":"Coming soon"}><PracticeIcon name="plus"/>{zh?"精练小节":"Tricky bits"}</button></div>}{aside&&<div className="score-aside">{aside}</div>}</div>{stage&&<div className="reader-stage">{typeof stage==="function"?stage({fingering}):stage}</div>}{(dock||closeupOpen)&&<div className="reader-dock">{closeup&&<PassageGuide xml={guideXml.current} events={sequenceRef.current.events.slice(sequenceRef.current.measureStarts[closeup.from-1]??0,sequenceRef.current.measureStarts[closeup.to]??sequenceRef.current.events.length)} from={closeup.from} to={closeup.to} numbers={closeup.numbers} quarterBpm={bpm*(config.pulsePerMeasure?((scoreFactsRef.current?.measures[closeup.from-1]?.beats??4)*4/(scoreFactsRef.current?.measures[closeup.from-1]?.beatType??4)):tempoSectionAt(closeup.from)?.beat??1)} sempreStaccato={config.sempreStaccatoFromMeasure!==undefined&&closeup.from>=config.sempreStaccatoFromMeasure} onClose={()=>setCloseup(null)}/>}{dock}</div>}

    </section>{theoryTip&&<div className="theory-tip" style={clampTip(theoryTip.x,theoryTip.y,280,150,"below")}><strong>{theoryTip.title}</strong><p>{theoryTip.text}</p></div>}{storyCard&&config.story&&<StoryCard composer={composer} title={title} story={config.story} style={clampTip(storyCard.x,storyCard.y,340,260,"below")} onClose={()=>setStoryCard(null)}/>}{fingerTip&&<div className={fingering?"flute-tip finger-chart":"flute-tip note-info-tip"} style={clampTip(fingerTip.x,fingerTip.y,fingering?238:200,fingering?(fingeringsForMidi(midiForPitch(fingerTip.pitch))?.fingerings.length??1)*88+34:(noteDisplay!=="off"&&activeRhythmMode!=="off"&&fingerTip.beat?96:56),"above")}>{(noteDisplay!=="off"||fingering)&&<strong>{noteDisplay==="solfege"?fingerTip.solfege:fingerTip.name}<sup>{fingerTip.octave}</sup></strong>}{activeRhythmMode!=="off"&&fingerTip.beat&&<p className="note-info-beat">{zh?"拍位":"Beat"} {fingerTip.beat}</p>}{fingering&&(()=>{
        // Every way to play the note, each with its name, drawn on the card itself: nothing to click, so the card can close the moment the pointer moves on.
        const entry=fingeringsForMidi(midiForPitch(fingerTip.pitch));
        if(!entry)return <div className="finger-diagram"><em className="finger-diagram__none">{t.scoreViewer.noFingering}</em></div>;
        const several=entry.fingerings.length>1;
        return <div className="finger-all">{entry.fingerings.map((fingeringOption,i)=><div className="finger-diagram" key={i}>{several&&fingeringOption.label&&<small className="finger-diagram__label">{zh&&fingeringOption.zhLabel?fingeringOption.zhLabel:fingeringOption.label}</small>}<FluteDiagramMini pressed={fingeringOption.keys}/></div>)}</div>;
      })()}</div>}</main>
}
