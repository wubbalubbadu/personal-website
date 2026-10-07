'use client';
import type {ReactNode} from 'react';
import {usePhoneNotation} from './usePhoneNotation';
import TrebleClef from './TrebleClef';
import {noteY,ledgerLines} from './model';
import RhythmNote,{STEM_X} from './rhythm/RhythmNote';
import {MUSIC_GLYPHS} from './rhythm/musicGlyphs';
import type {NoteValue} from './rhythm/rhythmModel';
import {TIME_SIG_GLYPHS} from './timeSignatureGlyphs';
import {ACCIDENTALS,ACCIDENTAL_EXTENT} from './accidentalGlyphs';
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
export type RowNote={v:number;p?:number;/** The sign written in front of the note. */acc?:'sharp'|'flat'|'natural';/** Room kept for a sign, written or not (when given, it decides the room even if the written sign is narrower), so nothing moves when signs come and go. */room?:'sharp'|'flat'|'natural'};
export type Meter={top:number;bottom:number;symbol?:'common'|'cut'};

const RHYTHM_P=1;                      // rhythm-only rows sit in the bottom space, like printed rhythm staffs
const DIGIT_SCALE=48/673;              // a digit spans exactly two staff spaces
const SLOT:Record<number,number>={.25:.7,.5:.85,.75:.95,1:1,1.5:1.2,2:1.45,3:1.7,4:1.9};
const DOTTED=new Set([.75,1.5,3]);
/** The undotted shape a length is drawn with (a dotted quarter is a quarter plus a dot). */
const shapeOf=(v:number):NoteValue=>(DOTTED.has(v)?v/1.5:v) as NoteValue;
const BAR_BEFORE=10,BAR_AFTER=20,NOTE_LEAD=16;
/**
 * Room in front of a note for its sign. The sign is drawn 35 units left of the note at scale .064, so
 * its left edge sits at (35 - from * .064) before the note; add the 12 units it must clear from whatever
 * comes before it (the clef, the time signature, a bar line, the previous note), less the lead every
 * note already has.
 */
const SIGN_SCALE=.064,SIGN_AT=35,SIGN_CLEAR=12;
const accRoom=(acc:'sharp'|'flat'|'natural')=>Math.ceil(SIGN_AT-ACCIDENTAL_EXTENT[acc].from*SIGN_SCALE+SIGN_CLEAR-NOTE_LEAD);
const MAX_ACC_ROOM=Math.max(accRoom('sharp'),accRoom('flat'),accRoom('natural'));

export type RowLayout={xs:number[];barXs:number[];gapXs:number[];startX:number;endX:number;meterX:number;starts:number[];beatX:(beat:number)=>number};

/** Where everything goes. Pages use this for their own overlays (beat sticks, tap targets). */
export function layoutRow(notes:RowNote[],{bars=[],even=false,clef=true,meter=null,left=40,right=860,reserveAcc=false}:{bars?:number[];even?:boolean;clef?:boolean;meter?:Meter|null;left?:number;right?:number;reserveAcc?:boolean}={}):RowLayout{
  let head=left+(clef?122:14);
  const meterX=head;
  if(meter)head+=meterWidth(meter)+(clef?14:20);
  const startX=head+8;
  const slots=notes.map(n=>even?1:SLOT[n.v]??1);
  const barCount=bars.filter(b=>b>0&&b<notes.length).length;
  // A note that carries a sign (or will, or any note when signs may be added anywhere) gets room for it, so the row still fits.
  const signOf=(n:RowNote)=>n.room??n.acc;
  const roomFor=(n:RowNote)=>reserveAcc?MAX_ACC_ROOM:signOf(n)?accRoom(signOf(n)!):0;
  const fixed=barCount*(BAR_BEFORE+BAR_AFTER)+NOTE_LEAD+notes.reduce((sum,n)=>sum+roomFor(n),0);
  // A sign must also clear the note before it (its head or ledger line reaches 22 units either side), so a note followed by a signed note
  // gets at least the width that needs; the other notes share what is left.
  const floorOf=notes.map((n,i)=>{
    const next=notes[i+1];
    if(!next||bars.includes(i+1)||!(reserveAcc||signOf(next)))return 0;
    // With signs possible anywhere, plan for the widest-reaching one (the flat).
    const sign=signOf(next),from=reserveAcc||!sign?ACCIDENTAL_EXTENT.flat.from:ACCIDENTAL_EXTENT[sign].from;
    return Math.ceil(22+SIGN_CLEAR+SIGN_AT-from*SIGN_SCALE-roomFor(next)+roomFor(n));
  });
  // The row is never narrower than its notes need: if `right` is too tight, the row grows past it (and the final bar moves with it)
  // instead of notes spilling past the final bar line.
  const MIN_UNIT=40;
  const needed=startX+fixed+notes.reduce((sum,_,i)=>sum+Math.max(floorOf[i],slots[i]*MIN_UNIT),0)+18;
  const endX=Math.max(right,needed);
  const locked=notes.map(()=>false);let lockedSum=0,unit=0;
  for(let pass=0;pass<=notes.length;pass++){
    const freeSlots=slots.reduce((a,sl,i)=>locked[i]?a:a+sl,0);
    unit=(endX-startX-fixed-lockedSum)/(freeSlots||1);
    let changed=false;
    slots.forEach((sl,i)=>{if(!locked[i]&&sl*unit<floorOf[i]){locked[i]=true;lockedSum+=floorOf[i];changed=true}});
    if(!changed)break;
  }
  const widthOf=(i:number)=>locked[i]?floorOf[i]:slots[i]*unit;
  const xs:number[]=[],barXs:number[]=[],gapXs:number[]=[];
  let cursor=startX;
  notes.forEach((_,i)=>{
    if(i>0){
      if(bars.includes(i)){gapXs.push(cursor+BAR_BEFORE-4);cursor+=BAR_BEFORE;barXs.push(cursor);cursor+=BAR_AFTER}
      else gapXs.push(cursor-unit*.12);
    }
    cursor+=roomFor(notes[i]);
    xs.push(cursor+NOTE_LEAD);cursor+=widthOf(i);
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
  /** Index of the note sounding now (red), or several notes lit together. */
  active?:number|number[];
  /** Something under each note, e.g. its counts, drawn with x = 0 at the note (it moves with the note). */
  below?:(index:number,x:number,layout:RowLayout)=>ReactNode;
  /** Anything drawn over the staff with the layout in hand: tap targets, beat sticks, highlights. */
  children?:(layout:RowLayout)=>ReactNode;
  /** Leave room in front of every note for a sign that may be added. */
  reserveAcc?:boolean;
  className?:string;label?:string;
  /** SVG viewBox; the default frames the staff with room for stems and one row of counts underneath. */
  viewBox?:string;
  /** Notes drawn at a quarter of their strength (to be there, but not yet). */
  faint?:number[];
  /** Notes that keep their place but are not drawn (a slot something else stands in for, like a question mark). */
  hidden?:number[];
  /** Notes that fade in (taking over from whatever stood in their place). */
  appear?:number[];
  /** A close-up: the same staff, cropped around its notes (never scaled differently, so the proportions are the same). */
  crop?:boolean;
  /** Use the narrow (phone) width on every screen, for a row of only a few notes. */
  narrow?:boolean;
  /** The final double bar (default on). */
  finalBar?:boolean;
  /** Where the row ends, for a short row that needs more room between its notes than `narrow` gives (overrides it). */
  right?:number;
};

export function phoneRowRight(notes:RowNote[],clef:boolean,meter:Meter|null,reserveAcc=false){
  const room=notes.reduce((sum,n)=>{const sign=n.room??n.acc;return sum+(reserveAcc?MAX_ACC_ROOM:sign?accRoom(sign):0)},0);
  return Math.min(860,Math.max(480,40+(clef?122:14)+(meter?70:0)+notes.length*44+room));
}

type GraphicsProps={
  notes:RowNote[];layout:RowLayout;clef?:boolean;meter?:Meter|null;beams?:number[][];active?:number|number[];faint?:number[];hidden?:number[];appear?:number[];
  /** The final double bar; off for a few notes that are not a whole piece (a card picture). */
  finalBar?:boolean;
  below?:Props['below'];children?:Props['children'];
};

/**
 * Everything a staff draws: lines, clef, time signature, bar lines, notes with their signs and ledger
 * lines, beams. The one place that does. EngravedRow wraps it in an svg; a page that needs several staffs in
 * one drawing (a line joining two of them) places it inside its own svg.
 */
export function RowGraphics({notes,layout,clef=true,meter=null,beams=[],active=-1,faint=[],hidden=[],appear=[],finalBar=true,below,children}:GraphicsProps){
  const {xs,barXs,endX,meterX}=layout;
  const pos=notes.map(n=>clef?n.p??4:RHYTHM_P);
  const beamed=new Map<number,number[]>();beams.forEach(g=>g.forEach(i=>beamed.set(i,g)));
  const down=(i:number)=>{const g=beamed.get(i);return g?g.reduce((s,j)=>s+pos[j],0)/g.length>=4:pos[i]>=4};
  const left=40;
  return <>
    {[0,2,4,6,8].map(l=><line key={l} x1={left} x2={endX} y1={noteY(l)} y2={noteY(l)} className="engraved-row__line"/>)}
    {clef&&<TrebleClef x={left+42}/>}
    {meter&&<TimeSignature meter={meter} x={meterX}/>}
    {barXs.map((x,i)=><line key={i} x1="0" x2="0" y1={noteY(8)} y2={noteY(0)} className="engraved-row__bar" style={{transform:`translateX(${x}px)`}}/>)}
    {finalBar&&<>
      <line x1={endX-9} x2={endX-9} y1={noteY(8)} y2={noteY(0)} className="engraved-row__bar"/>
      <line x1={endX-2.5} x2={endX-2.5} y1={noteY(8)} y2={noteY(0)} className="engraved-row__final"/>
    </>}
    {notes.map((n,i)=>{
      const p=pos[i],g=beamed.get(i),isDown=down(i);
      return <g key={i} className={`engraved-row__note ${(Array.isArray(active)?active.includes(i):active===i)?'is-active':''}${appear.includes(i)?' is-appearing':''}`} style={{transform:`translate(${xs[i]}px,${noteY(p)}px)`,opacity:hidden.includes(i)?0:faint.includes(i)?.25:1}} aria-hidden={hidden.includes(i)||undefined}>
        {ledgerLines(p).map(l=><line key={l} x1="-22" x2="22" y1={noteY(l)-noteY(p)} y2={noteY(l)-noteY(p)} className="engraved-row__ledger"/>)}
        {/* The sign sits just left of the head, centred on the note's line or space, and turns red with the note. */}
        {n.acc&&<path className="engraved-row__acc" d={ACCIDENTALS[n.acc]} transform="translate(-35 0) scale(.064 -.064)"/>}
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
  </>;
}

export default function EngravedRow({notes,bars=[],even=false,clef=true,meter=null,beams=[],active=-1,below,children,reserveAcc=false,className='',label,viewBox='20 62 870 222',faint=[],hidden=[],appear=[],crop=false,narrow=false,finalBar=true,right:rightProp}:Props){
  const phone=usePhoneNotation();
  // `narrow`: a short row uses the narrower width phones use, centred, instead of a few notes spread thinly across the page.
  const short=phone||narrow||rightProp!==undefined;
  const right=rightProp??(short?phoneRowRight(notes,clef,meter,reserveAcc):860);
  const frame=viewBox.split(" ");
  const layout=layoutRow(notes,{bars,even,clef,meter,right,reserveAcc});
  // A row that needed more room than `right` grew; the frame grows with it, so nothing is cut off.
  if(short||layout.endX>right)frame[2]=String(Math.max(Number(frame[2]),layout.endX+10));
  if(short)frame[2]=String(layout.endX+10);
  // A close-up crops around the notes, tall enough for the whole clef, so nothing is scaled differently.
  if(crop){frame[0]='20';frame[1]='50';frame[2]=String(layout.endX+10-20);frame[3]='205'}
  return <svg className={`engraved-row ${className}`} viewBox={frame.join(" ")} role="img" aria-label={label}>
    <RowGraphics notes={notes} layout={layout} clef={clef} meter={meter} beams={beams} active={active} faint={faint} hidden={hidden} appear={appear} finalBar={finalBar} below={below}>{children}</RowGraphics>
  </svg>;
}
