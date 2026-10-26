import type {RhythmItem,RhythmPattern} from '../theory/dots-and-ties/rhythmSequence';

/**
 * Endless rhythm drills: one rhythm at a time, made on the spot for the level you are at.
 *
 * Difficulty is one ladder of ranks (RANKS below). `rankOf` reads any rhythm, made here or taken from a real piece, and
 * returns the hardest thing in it, so generated rhythms and real bars slot into the same ladder. A level asks for a
 * rhythm whose rank is exactly that level (up to 13), so each step up adds one new idea; from 14 on everything mixes.
 *
 * Generated rhythms are built beat by beat from cells (a quarter, two eighths, a dotted quarter and eighth...), so beats
 * are always grouped the way printed music groups them, and longer cells only start where a reader expects them
 * (in 4/4 on beat 1 or 3, in 5/4 inside its 3 + 2 groups).
 */

export type Meter={top:number;bottom:number};
export type DrillPattern=RhythmPattern&{
  meter:Meter;
  /** One click, in quarter notes: 1 for x/4, 1.5 for 6/8 (felt in two). */
  beat:number;
  /** Where a real bar comes from. */
  source?:{piece:string;title:string;zhTitle?:string;composer:string;bar:string};
  rank:number;
};

/** The ladder. Index = rank. Titles name what is new, plainly, for the level label. */
export const RANKS:[string,string][]=[
  ['',''],
  ['Quarter and half notes','四分音符和二分音符'],
  ['Dotted half notes','附点二分音符'],
  ['Eighth notes','八分音符'],
  ['Rests','休止符'],
  ['Notes after an eighth rest','八分休止符后的音'],
  ['Dotted quarter notes','附点四分音符'],
  ['Ties','延音线'],
  ['Sixteenth notes','十六分音符'],
  ['Dotted eighth and sixteenth','附点八分音符和十六分音符'],
  ['Notes between the beats','落在拍子之间的音'],
  ['Triplets','三连音'],
  ['6/8 time','6/8 拍'],
  ['5/4 time','5/4 拍'],
  ['Everything together','综合'],
];
export const TOP_RANK=RANKS.length-1;

const meterBeat=(m:Meter)=>m.bottom===8?1.5:4/m.bottom;
export const barLength=(m:Meter)=>m.top*4/m.bottom;

/** The hardest thing in a rhythm, on the RANKS ladder. */
export function rankOf(items:readonly RhythmItem[],meter:Meter):number{
  const beat=meterBeat(meter),eps=1e-6;
  const len=(i:RhythmItem)=>i.ratio?i.written*i.ratio[1]/i.ratio[0]:i.written;
  let r=1,t=0;
  const offBeat=(x:number)=>Math.abs(x/beat-Math.round(x/beat))>eps;
  items.forEach((item,i)=>{
    const at=t,l=len(item);t+=l;
    const prev=items[i-1],tiedIn=!!prev?.tieNext;
    if(item.rest){if(l>=1-eps&&meter.bottom===4)r=Math.max(r,4);return}
    if(item.ratio)r=Math.max(r,item.written>=1?14:11);
    else if(Math.abs(item.written-3)<eps)r=Math.max(r,2);
    else if(Math.abs(item.written-1.5)<eps)r=Math.max(r,6);
    else if(Math.abs(item.written-.75)<eps)r=Math.max(r,9);
    else if(Math.abs(item.written-.25)<eps)r=Math.max(r,8);
    else if(Math.abs(item.written-.5)<eps)r=Math.max(r,3);
    if(tiedIn)return;
    if(offBeat(at)&&prev?.rest&&!offBeat(at-len(prev)))r=Math.max(r,5);
    // How long this sound lasts, ties included.
    let end=at+l;for(let j=i;items[j]?.tieNext&&items[j+1];j++)end+=len(items[j+1]);
    if(item.tieNext)r=Math.max(r,7);
    const nextBeat=(Math.floor(at/beat+eps)+1)*beat;
    if(!item.ratio&&offBeat(at)&&end>nextBeat+eps)r=Math.max(r,10);
    // A note on the second sixteenth of a beat that lasts an eighth (sixteenth, eighth, sixteenth).
    if(!item.ratio&&meter.bottom===4&&Math.abs((at%1)-.25)<eps&&l>=.5-eps)r=Math.max(r,14);
  });
  if(meter.bottom===8)r=Math.max(r,12);
  if(meter.bottom===4&&meter.top===5)r=Math.max(r,13);
  return r;
}

/**
 * How many quarter notes fit across the staff when the shortest note is `shortest` quarters long, so noteheads never
 * touch: about 34 staff units per shortest note, out of the row's width (`room`, in staff units).
 */
export const maxLength=(room:number,shortest:number)=>room*shortest/34;
export const shortestOf=(items:readonly RhythmItem[])=>Math.min(...items.map(i=>i.ratio?i.written*i.ratio[1]/i.ratio[0]:i.written));

type CellId='Q'|'H'|'DH'|'EE'|'QR'|'ERE'|'DQE'|'SSSS'|'ESS'|'SSE'|'DES'|'SES'|'EQE'|'T3'|'QT'|'C_DQ'|'C_QE'|'C_EQ'|'C_EEE'|'C_DQR'|'C_ERE'|'C_SSEE'|'C_DH';
type Cell={beats:number;items:RhythmItem[];tuplet?:boolean};
const n=(written:number,more:Partial<RhythmItem>={}):RhythmItem=>({written,...more});
const r=(written:number):RhythmItem=>({written,rest:true});
const t3=(written:number):RhythmItem=>({written,ratio:[3,2]});
// Simple-meter cells are counted in quarter beats; compound (C_) cells in dotted-quarter beats.
const CELLS:Record<CellId,Cell>={
  Q:{beats:1,items:[n(1)]},H:{beats:2,items:[n(2)]},DH:{beats:3,items:[n(3)]},
  EE:{beats:1,items:[n(.5),n(.5)]},QR:{beats:1,items:[r(1)]},ERE:{beats:1,items:[r(.5),n(.5)]},
  DQE:{beats:2,items:[n(1.5),n(.5)]},
  SSSS:{beats:1,items:[n(.25),n(.25),n(.25),n(.25)]},ESS:{beats:1,items:[n(.5),n(.25),n(.25)]},SSE:{beats:1,items:[n(.25),n(.25),n(.5)]},
  DES:{beats:1,items:[n(.75),n(.25)]},SES:{beats:1,items:[n(.25),n(.5),n(.25)]},
  EQE:{beats:2,items:[n(.5),n(1),n(.5)]},
  T3:{beats:1,items:[t3(.5),t3(.5),t3(.5)],tuplet:true},QT:{beats:2,items:[t3(1),t3(1),t3(1)],tuplet:true},
  C_DQ:{beats:1,items:[n(1.5)]},C_QE:{beats:1,items:[n(1),n(.5)]},C_EQ:{beats:1,items:[n(.5),n(1)]},
  C_EEE:{beats:1,items:[n(.5),n(.5),n(.5)]},C_DQR:{beats:1,items:[r(1.5)]},C_ERE:{beats:1,items:[r(.5),n(.5),n(.5)]},
  C_SSEE:{beats:1,items:[n(.25),n(.25),n(.5),n(.5)]},C_DH:{beats:2,items:[n(3)]},
};

type Level={meters:Meter[];cells:CellId[];ties?:'bar'|'offbeat'|'both'};
const M=(top:number,bottom=4):Meter=>({top,bottom});
const SIMPLE:CellId[]=['Q','H','EE','QR','ERE','DQE','ESS','SSE','SSSS','DES','EQE','T3'];
const COMPOUND:CellId[]=['C_DQ','C_QE','C_EQ','C_EEE','C_DQR','C_ERE','C_SSEE','C_DH'];
/** What each level may use. Level k asks for a rhythm of rank k (see rankOf); level 14 and up take rank 10 or more. */
const LEVELS:Record<number,Level>={
  1:{meters:[M(4),M(3)],cells:['Q','H']},
  2:{meters:[M(3),M(4)],cells:['Q','H','DH']},
  3:{meters:[M(2),M(4),M(3)],cells:['Q','H','EE']},
  4:{meters:[M(4),M(2),M(3)],cells:['Q','H','EE','QR']},
  5:{meters:[M(2),M(4)],cells:['Q','H','EE','QR','ERE']},
  6:{meters:[M(4),M(2),M(3)],cells:['Q','H','EE','QR','DQE']},
  7:{meters:[M(2),M(4),M(3)],cells:['Q','H','EE','DQE'],ties:'bar'},
  8:{meters:[M(2),M(4),M(3)],cells:['Q','EE','SSSS','ESS','SSE','QR']},
  9:{meters:[M(2),M(4),M(3)],cells:['Q','EE','SSSS','ESS','SSE','DES']},
  10:{meters:[M(2),M(4),M(3)],cells:['Q','EE','QR','ERE','DQE','EQE','ESS','SSE'],ties:'offbeat'},
  11:{meters:[M(2),M(4),M(3)],cells:['Q','H','EE','QR','DQE','ESS','T3']},
  12:{meters:[M(6,8)],cells:COMPOUND},
  13:{meters:[M(5)],cells:['Q','H','EE','QR','ERE','DQE','ESS','SSE','EQE','T3']},
  14:{meters:[M(4),M(3),M(2),M(5),M(6,8)],cells:[...SIMPLE,'SES','QT',...COMPOUND],ties:'both'},
};
const levelOf=(level:number)=>LEVELS[Math.min(level,TOP_RANK)];
export const wantedRank=(level:number)=>Math.min(level,TOP_RANK);
const rankOk=(rank:number,level:number)=>level>=TOP_RANK?rank>=10:rank===level;

/** Where a cell may start, as a beat in its bar. */
function fits(cell:Cell,at:number,meter:Meter){
  const top=meter.bottom===8?meter.top/3:meter.top;
  if(at+cell.beats>top)return false;
  if(cell.beats===1)return true;
  if(meter.bottom===8)return at===0;
  if(cell.beats===3)return at===0&&top!==5;
  // Two beats: in 4/4 on beat 1 or 3 (nothing crosses the middle), in 3/4 on beat 1 or 2, in 5/4 inside 3 + 2.
  return top===4?at%2===0:top===3?at<=1:top===5?at!==2:at===0;
}

/** Ways a level's rhythm can be laid out: one bar or two, as long as the row still fits. */
function layouts(level:number){
  const L=levelOf(level),out:{meter:Meter;bars:number}[]=[];
  for(const meter of L.meters){
    out.push({meter,bars:1});
    // Two bars wherever they fit: makeRhythm drops rows that would crowd their shortest notes.
    out.push({meter,bars:2});
  }
  return out;
}

/**
 * One rhythm for a level. `room` is the staff's width in staff units (about 400 on a phone, 720 on a wide screen): rows
 * that would crowd their shortest notes are rejected, so a phone gets shorter rhythms at the same level.
 */
export function makeRhythm(level:number,random:()=>number,room:number,id:string):DrillPattern{
  const L=levelOf(level),pick=<T,>(list:readonly T[])=>list[Math.floor(random()*list.length)];
  const options=layouts(level);
  for(let attempt=0;attempt<800;attempt++){
    const {meter,bars}=pick(options);
    const built=build(L,meter,bars,random,level);
    if(!built)continue;
    if(barLength(meter)*bars>maxLength(room,shortestOf(built.items))+1e-6)continue;
    const rank=rankOf(built.items,meter);
    if(!rankOk(rank,level))continue;
    return {...built,id,meter,beat:meterBeat(meter),top:meter.bottom===8?meter.top/3:meter.top,rank};
  }
  // Only reached if a level's rules cannot fit `room` (the check script makes sure they can). Rank 0 marks it.
  const meter=M(4);
  return {id,items:[n(1),n(1),n(2)],meter,beat:1,top:4,rank:0};
}

function build(L:Level,meter:Meter,bars:number,random:()=>number,level:number){
  const pick=<T,>(list:readonly T[])=>list[Math.floor(random()*list.length)];
  const compound=meter.bottom===8,top=compound?meter.top/3:meter.top;
  const cells=L.cells.filter(c=>c.startsWith('C_')===compound);
  const items:RhythmItem[]=[],beams:number[][]=[],tuplets:{from:number;to:number;count:number}[]=[],barStarts:number[]=[],used:CellId[]=[],barKeys:string[]=[];
  for(let bar=0;bar<bars;bar++){
    if(bar)barStarts.push(items.length);
    const inBar:CellId[]=[];
    for(let at=0;at<top;){
      const id=pick(cells.filter(c=>fits(CELLS[c],at,meter)));
      if(!id)return null;
      const cell=CELLS[id],start=items.length;
      cell.items.forEach(item=>items.push({...item}));
      const idx=cell.items.map((_,i)=>start+i);
      if(cell.tuplet)tuplets.push({from:start,to:start+cell.items.length-1,count:3});
      // Beam what shares a beat: eighths and shorter, never across a rest (a cell's rest is always at its start).
      const beam=idx.filter(i=>!items[i].rest&&items[i].written<1);
      if(beam.length>1&&id!=='EQE'&&id!=='C_QE'&&id!=='C_EQ')beams.push(beam);
      used.push(id);inBar.push(id);at+=cell.beats;
    }
    barKeys.push(inBar.join(' '));
  }
  // What a teacher would not write.
  if(bars===2&&barKeys[0]===barKeys[1])return null;
  if(new Set(used).size<2&&!(compound&&used.length>1))return null;
  const total=barLength(meter)*bars,rests=items.filter(i=>i.rest);
  if(rests.reduce((s,i)=>s+i.written,0)>Math.max(1.5,total/4))return null;
  if(items.some((item,i)=>item.rest&&items[i+1]?.rest))return null;
  if(items[0].rest&&level<5)return null;
  if(items.filter(i=>!i.rest).length<3)return null;
  if(L.ties&&random()<(level===7||level===10?1:.35)&&!addTie(items,meter,bars,L.ties,random))return null;
  return {items,beams,tuplets,bars:barStarts};
}

/** Tie two notes where a tie is the only way to write the sound: across the bar line, the middle of 4/4, or off the beat. */
function addTie(items:RhythmItem[],meter:Meter,bars:number,kind:'bar'|'offbeat'|'both',random:()=>number){
  const bar=barLength(meter),eps=1e-6,spots:number[]=[];let t=0;
  items.forEach((item,i)=>{
    const from=t;t+=item.ratio?item.written*item.ratio[1]/item.ratio[0]:item.written;
    const next=items[i+1];
    if(!next||item.rest||next.rest||item.ratio||next.ratio)return;
    const atBar=Math.abs(t/bar-Math.round(t/bar))<eps,mid=meter.bottom===4&&meter.top===4&&Math.abs(t%bar-2)<eps&&from%bar>eps;
    const offbeat=Math.abs(t-Math.round(t))<eps&&Math.abs(from%1-.5)<eps&&item.written===.5;
    if((kind!=='offbeat'&&item.written>=1&&((atBar&&bars>1)||mid))||(kind!=='bar'&&offbeat))spots.push(i);
  });
  if(!spots.length)return false;
  items[spots[Math.floor(random()*spots.length)]].tieNext=true;
  return true;
}

/** Small seeded generator (mulberry32), for the check script and for repeatable sequences. */
export function rng(seed:number){
  let a=seed>>>0;
  return ()=>{a=(a+0x6d2b79f5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296};
}

/**
 * Tempo for a level, in quarter notes per minute: it creeps up as you climb (and keeps climbing past the top rank),
 * capped lower when the rhythm has sixteenths or triplets so the quick notes stay tappable.
 */
export function tempoFor(level:number,pattern:DrillPattern){
  const s=shortestOf(pattern.items);
  const cap=s<.3?88:s<.4?100:116;
  return Math.min(cap,70+2*Math.min(level,TOP_RANK)+3*Math.max(0,level-TOP_RANK));
}
