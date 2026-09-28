'use client';
import type {ReactNode} from 'react';
import {usePhoneNotation} from './usePhoneNotation';
import TrebleClef from './TrebleClef';
import {noteY,ledgerLines} from './model';
import RhythmNote,{STEM_X} from './rhythm/RhythmNote';
import {MUSIC_GLYPHS} from './rhythm/musicGlyphs';
import type {NoteValue} from './rhythm/rhythmModel';
import {TIME_SIG_GLYPHS} from './timeSignatureGlyphs';
import './engraved-row.css';

/**
 * One engraved staff for every lesson, so notation always looks like real printed music:
 * the lessons' staff coordinates (24 units between lines, `noteY`), and only engraved glyphs
 * (noteheads, stems, flags, beams, clef, time-signature digits, C and cut time) from the
 * VexFlow font the app already uses.
 *
 * Clef rule: show the treble clef when pitch matters; leave it off when a row is about rhythm
 * or meter only (then every note sits on one line, like a rhythm staff).
 *
 * Spacing works like an engraver's: each note gets a minimum width plus a little more for
 * longer notes (not proportional, so spacing never gives a measure away), and every bar line
 * gets room on both sides. `even` gives every note the same width, for a row shown before
 * its measures are known. Changing `bars` or `even` slides the notes to their new places.
 */
/** A note's length in quarter notes; dotted lengths (.75, 1.5, 3) get an augmentation dot. */
export type RowNote={v:number;p?:number};
export type Meter={top:number;bottom:number;symbol?:'common'|'cut'};

const RHYTHM_P=1;                      // rhythm-only rows sit in the bottom space, like printed rhythm staffs
const DIGIT_SCALE=48/673;              // a digit spans exactly two staff spaces
const SLOT:Record<number,number>={.25:.7,.5:.85,.75:.95,1:1,1.5:1.2,2:1.45,3:1.7,4:1.9};
const DOTTED=new Set([.75,1.5,3]);
/** The undotted shape a length is drawn with (a dotted quarter is a quarter plus a dot). */
const shapeOf=(v:number):NoteValue=>(DOTTED.has(v)?v/1.5:v) as NoteValue;
const BAR_BEFORE=10,BAR_AFTER=20,NOTE_LEAD=16;

export type RowLayout={xs:number[];barXs:number[];gapXs:number[];startX:number;endX:number;meterX:number;starts:number[];beatX:(beat:number)=>number};

/** Where everything goes. Pages use this for their own overlays (beat sticks, tap targets). */
export function layoutRow(notes:RowNote[],{bars=[],even=false,clef=true,meter=null,left=40,right=860}:{bars?:number[];even?:boolean;clef?:boolean;meter?:Meter|null;left?:number;right?:number}={}):RowLayout{
  let head=left+(clef?122:14);
  const meterX=head;
  if(meter)head+=meterWidth(meter)+(clef?14:20);
  const startX=head+8,endX=right;
  const slots=notes.map(n=>even?1:SLOT[n.v]??1);
  const barCount=bars.filter(b=>b>0&&b<notes.length).length;
  const fixed=barCount*(BAR_BEFORE+BAR_AFTER)+NOTE_LEAD;
  const unit=(endX-startX-fixed)/slots.reduce((a,b)=>a+b,0);
  const xs:number[]=[],barXs:number[]=[],gapXs:number[]=[];
  let cursor=startX;
  notes.forEach((_,i)=>{
    if(i>0){
      if(bars.includes(i)){gapXs.push(cursor+BAR_BEFORE-4);cursor+=BAR_BEFORE;barXs.push(cursor);cursor+=BAR_AFTER}
      else gapXs.push(cursor-unit*.12);
    }
    xs.push(cursor+NOTE_LEAD);cursor+=slots[i]*unit;
  });
  const starts:number[]=[];let t=0;notes.forEach(n=>{starts.push(t);t+=n.v});
  // A beat's x: at a note's onset, or partway between onsets when the beat falls inside a long note.
  const beatX=(beat:number)=>{
    const anchors=[...starts.map((s,i)=>({t:s,x:xs[i]})),{t,x:endX-18}];
    const after=anchors.findIndex(a=>a.t>=beat);
    if(after<=0)return anchors[Math.max(0,after)].x;
    const a=anchors[after-1],b=anchors[after];
    return a.x+(b.x-a.x)*(beat-a.t)/(b.t-a.t);
  };
  return {xs,barXs,gapXs,startX,endX,meterX,starts,beatX};
}

function meterWidth(m:Meter){
  if(m.symbol)return 40;
  const w=(n:number)=>String(n).split('').reduce((sum,d)=>sum+TIME_SIG_GLYPHS[d].w,0)*DIGIT_SCALE;
  return Math.max(w(m.top),w(m.bottom));
}

/** An engraved time signature whose left edge is at x. Digits fill the staff: top in the upper two spaces, bottom in the lower two. */
export function TimeSignature({meter,x,className=''}:{meter:Meter;x:number;className?:string}){
  if(meter.symbol){
    const g=TIME_SIG_GLYPHS[meter.symbol];
    return <path className={`time-sig ${className}`} d={g.d} transform={`translate(${x} ${noteY(4)}) scale(${DIGIT_SCALE} ${-DIGIT_SCALE})`}/>;
  }
  const width=meterWidth(meter);
  const number=(n:number,baseline:number,part:string)=>{
    const digits=String(n).split(''),w=digits.reduce((sum,d)=>sum+TIME_SIG_GLYPHS[d].w,0)*DIGIT_SCALE;
    let cx=x+(width-w)/2;
    return <g className={`time-sig__${part}`}>{digits.map((d,i)=>{const el=<path key={i} d={TIME_SIG_GLYPHS[d].d} transform={`translate(${cx} ${baseline}) scale(${DIGIT_SCALE} ${-DIGIT_SCALE})`}/>;cx+=TIME_SIG_GLYPHS[d].w*DIGIT_SCALE;return el})}</g>;
  };
  return <g className={`time-sig ${className}`}>{number(meter.top,noteY(4),'top')}{number(meter.bottom,noteY(0),'bottom')}</g>;
}

type Props={
  notes:RowNote[];bars?:number[];even?:boolean;clef?:boolean;meter?:Meter|null;
  /** Beamed groups, as note indices (eighths and sixteenths). */
  beams?:number[][];
  /** Index of the note sounding now (red). */
  active?:number;
  /** Something under each note, e.g. its counts, drawn with x = 0 at the note (it moves with the note). */
  below?:(index:number,x:number,layout:RowLayout)=>ReactNode;
  /** Anything drawn over the staff with the layout in hand: tap targets, beat sticks, highlights. */
  children?:(layout:RowLayout)=>ReactNode;
  className?:string;label?:string;
  /** SVG viewBox; the default frames the staff with room for stems and one row of counts underneath. */
  viewBox?:string;
};

export function phoneRowRight(notes:RowNote[],clef:boolean,meter:Meter|null){
  return Math.min(860,Math.max(480,40+(clef?122:14)+(meter?70:0)+notes.length*44));
}

export default function EngravedRow({notes,bars=[],even=false,clef=true,meter=null,beams=[],active=-1,below,children,className='',label,viewBox='20 62 870 222'}:Props){
  const phone=usePhoneNotation();
  const right=phone?phoneRowRight(notes,clef,meter):860;
  const frame=viewBox.split(" ");
  if(phone)frame[2]=String(right+10);
  const layout=layoutRow(notes,{bars,even,clef,meter,right});
  const {xs,barXs,endX,meterX}=layout;
  const pos=notes.map(n=>clef?n.p??4:RHYTHM_P);
  const beamed=new Map<number,number[]>();beams.forEach(g=>g.forEach(i=>beamed.set(i,g)));
  const down=(i:number)=>{const g=beamed.get(i);return g?g.reduce((s,j)=>s+pos[j],0)/g.length>=4:pos[i]>=4};
  const left=40;
  return <svg className={`engraved-row ${className}`} viewBox={frame.join(" ")} role="img" aria-label={label}>
    {[0,2,4,6,8].map(l=><line key={l} x1={left} x2={endX} y1={noteY(l)} y2={noteY(l)} className="engraved-row__line"/>)}
    {clef&&<TrebleClef x={left+42}/>}
    {meter&&<TimeSignature meter={meter} x={meterX}/>}
    {barXs.map((x,i)=><line key={i} x1="0" x2="0" y1={noteY(8)} y2={noteY(0)} className="engraved-row__bar" style={{transform:`translateX(${x}px)`}}/>)}
    <line x1={endX-9} x2={endX-9} y1={noteY(8)} y2={noteY(0)} className="engraved-row__bar"/>
    <line x1={endX-2.5} x2={endX-2.5} y1={noteY(8)} y2={noteY(0)} className="engraved-row__final"/>
    {notes.map((n,i)=>{
      const p=pos[i],g=beamed.get(i),isDown=down(i);
      return <g key={i} className={`engraved-row__note ${active===i?'is-active':''}`} style={{transform:`translate(${xs[i]}px,${noteY(p)}px)`}}>
        {ledgerLines(p).map(l=><line key={l} x1="-22" x2="22" y1={noteY(l)-noteY(p)} y2={noteY(l)-noteY(p)} className="engraved-row__ledger"/>)}
        {g?<path d={MUSIC_GLYPHS.filled.path} transform={`translate(${-MUSIC_GLYPHS.filled.width*.032} 0) scale(.064 -.064)`}/>:<RhythmNote value={shapeOf(n.v)} down={isDown}/>}
        {/* Augmentation dot: to the right of the head, in a space (moved up a space when the note sits on a line). */}
        {DOTTED.has(n.v)&&<circle cx="24" cy={p%2===0?-12:0} r="4"/>}
      </g>;
    })}
    {beams.map((g,k)=>{
      // Beamed stems end on one straight beam, a little slanted with the melody, like an engraver's.
      const isDown=down(g[0]),dir=isDown?1:-1,sx=(i:number)=>xs[i]+(isDown?-STEM_X:STEM_X);
      const ys=g.map(i=>noteY(pos[i])),x0=sx(g[0]),x1=sx(g.at(-1)!);
      const slope=Math.max(-.12,Math.min(.12,(ys.at(-1)!-ys[0])/((x1-x0)||1)))*.5;
      const edge=isDown?Math.max(...g.map((i,j)=>ys[j]+84-slope*(sx(i)-x0))):Math.min(...g.map((i,j)=>ys[j]-84-slope*(sx(i)-x0)));
      const yAt=(x:number)=>edge+slope*(x-x0);
      return <g key={k} className="engraved-row__beam">
        {g.map((i,j)=><line key={i} x1={sx(i)} x2={sx(i)} y1={ys[j]+dir*3} y2={yAt(sx(i))} className="engraved-row__stem"/>)}
        {(()=>{
          const beam=(a:number,b:number,level:number,key:string)=>{const o=-dir*level*13,h=-dir*8;return <polygon key={key} points={`${a},${yAt(a)+o} ${b},${yAt(b)+o} ${b},${yAt(b)+o+h} ${a},${yAt(a)+o+h}`}/>};
          const parts=[beam(x0-1,x1+1,0,'main')];
          // Sixteenths get a second beam: joined to a neighbouring sixteenth, or a short stub toward a longer neighbour.
          g.forEach((i,j)=>{
            if(notes[i].v>.25)return;
            const nextSixteenth=j<g.length-1&&notes[g[j+1]].v<=.25;
            if(nextSixteenth)parts.push(beam(sx(i)-1,sx(g[j+1])+1,1,`s${i}`));
            else if(!(j>0&&notes[g[j-1]].v<=.25)){const toward=j>0?-1:1;parts.push(beam(Math.min(sx(i),sx(i)+toward*16),Math.max(sx(i),sx(i)+toward*16),1,`s${i}`))}
          });
          return parts;
        })()}
      </g>;
    })}
    {below&&notes.map((_,i)=><g key={`b${i}`} className="engraved-row__below" style={{transform:`translateX(${xs[i]}px)`}}>{below(i,xs[i],layout)}</g>)}
    {children?.(layout)}
  </svg>;
}
