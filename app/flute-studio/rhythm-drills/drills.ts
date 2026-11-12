import type {RhythmItem,RhythmPattern} from '../theory/dots-and-ties/rhythmSequence';

/**
 * Endless rhythm drills: one rhythm at a time, made on the spot for the level you are at.
 *
 * Difficulty is one ladder of ranks (RANKS below). `rankOf` reads any rhythm, made here or taken from a real piece, and
 * returns the hardest thing in it, so generated rhythms and real bars slot into the same ladder. A level asks for a
 * rhythm whose rank is exactly that level (up to 13), so each step up adds one new idea; from 14 on everything mixes.
 *
 * The page offers three difficulties (TIERS): Easy and Medium draw on this ladder, Hard has its own builder.
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

type CellId='Q'|'H'|'W'|'HR'|'DH'|'EE'|'QR'|'ERE'|'DQE'|'SSSS'|'ESS'|'SSE'|'DES'|'SES'|'EQE'|'T3'|'QT'|'C_DQ'|'C_QE'|'C_EQ'|'C_EEE'|'C_DQR'|'C_ERE'|'C_SSEE'|'C_DH';
type Cell={beats:number;items:RhythmItem[];tuplet?:boolean};
const n=(written:number,more:Partial<RhythmItem>={}):RhythmItem=>({written,...more});
const r=(written:number):RhythmItem=>({written,rest:true});
const t3=(written:number):RhythmItem=>({written,ratio:[3,2]});
// Simple-meter cells are counted in quarter beats; compound (C_) cells in dotted-quarter beats.
const CELLS:Record<CellId,Cell>={
  Q:{beats:1,items:[n(1)]},H:{beats:2,items:[n(2)]},DH:{beats:3,items:[n(3)]},W:{beats:4,items:[n(4)]},HR:{beats:2,items:[r(2)]},
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
/** A level's rules plus what it accepts: the ladder takes one rank per level, a difficulty takes its own mix. */
type Spec={L:Level;ok:(rank:number,items:readonly RhythmItem[])=>boolean;restStart:boolean;tieOdds:number};
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
const ladder=(level:number):Spec=>({L:levelOf(level),ok:rank=>rankOk(rank,level),restStart:level>=5,tieOdds:level===7||level===10?1:.35});

/**
 * Three difficulties. Easy and Medium reuse the ladder's cells and ranks; Hard has its own builder (below) because its
 * material (quintuplets, sextuplets, carved-out rests, hemiolas) is past the top of the ladder.
 */
export type Tier='easy'|'medium'|'hard';
export const TIERS:{id:Tier;name:[string,string];includes:[string,string]}[]=[
  {id:'easy',name:['Easy','简单'],includes:['Whole notes to eighths, with rests','全音符到八分音符，加休止符']},
  {id:'medium',name:['Medium','中等'],includes:['Sixteenths, dotted rhythms, ties, syncopation, triplets, 6/8','十六分、附点、延音线、切分、三连音、6/8']},
  {id:'hard',name:['Hard','困难'],includes:['Quintuplets, sextuplets, carved-out rests, hemiolas, snaps, ties over the beat','五连音、六连音、连音中的休止、黑米奥拉、逆附点、跨拍延音']},
];
/** How many different kinds of note and rest a rhythm uses: a rhythm needs a few to be worth reading. */
const kinds=(items:readonly RhythmItem[])=>new Set(items.map(i=>`${i.written}${i.rest?'r':''}${i.ratio?'t':''}`)).size;
/** Whether a rhythm (generated or a real bar) belongs to Easy or Medium. Hard rhythms only come from its own builder. */
export function fitsTier(items:readonly RhythmItem[],rank:number,tier:Tier){
  if(tier==='hard')return false;
  if(kinds(items)<3)return false;
  if(tier==='easy')return rank<=4&&!items.some(i=>i.tieNext||i.ratio);
  // Medium: something past Easy, short of Hard (no quarter-note triplets, which rank 14).
  return rank>=5&&rank<=12;
}
const tierSpecs=(tier:Tier,levels:number[],more:Spec[]=[]):Spec[]=>[...levels.map(ladder),...more].map(s=>({...s,ok:(rank,items)=>fitsTier(items,rank,tier)}));
/** Each rhythm draws its rules from one of these at random, so a difficulty mixes its ideas evenly. */
const TIER_SPECS:Record<'easy'|'medium',Spec[]>={
  easy:tierSpecs('easy',[],[{L:{meters:[M(4),M(3),M(2)],cells:['Q','H','DH','W','EE','QR','HR']},ok:()=>true,restStart:false,tieOdds:0}]),
  medium:tierSpecs('medium',[5,6,7,8,9,10,11,12]),
};

/*
 * Hard. Built beat by beat like the others, from denser cells: tuplets of 5 and 6 (and quarter triplets) with one note
 * often carved out as a rest, 3 + 3 + 2 groupings and hemiolas, snaps, dotted rhythms. Then a sixteenth is often tied
 * over the beat. Every rhythm has at least one core cell, at least six notes, and no cell twice in a row. Spacing is the
 * same as everywhere (maxLength), so a sextuplet only fits a wider screen; a phone gets the rest.
 */
type HardCell={id:string;beats:number;core?:boolean;count?:number;meters?:'simple'|'compound'|'3/4';items:(random:()=>number)=>RhythmItem[]};
/** `n` notes in the time of `of`, written as `written`, with note `carve` (or none, -1) a rest. */
const tup=(count:number,of:number,written:number,carve=-1):RhythmItem[]=>Array.from({length:count},(_,i)=>({written,ratio:[count,of] as const,...(i===carve?{rest:true}:{})}));
const carve=(random:()=>number,count:number)=>random()<.6?Math.floor(random()*count):-1;
const HARD:HardCell[]=[
  {id:'Q5',beats:1,core:true,count:5,meters:'simple',items:r=>tup(5,4,.25,carve(r,5))},
  {id:'Q6',beats:1,core:true,count:6,meters:'simple',items:r=>tup(6,4,.25,carve(r,6))},
  {id:'QT',beats:2,core:true,count:3,meters:'simple',items:r=>tup(3,2,1,r()<.4?1+Math.floor(r()*2):-1)},
  {id:'D332',beats:2,core:true,meters:'simple',items:()=>[n(.75),n(.75),n(.5)]},
  {id:'HEM',beats:3,core:true,meters:'3/4',items:r=>r()<.5?[n(1.5),n(1.5)]:[n(.75),n(.75),n(1.5)]},
  {id:'T3R',beats:1,count:3,meters:'simple',items:r=>tup(3,2,.5,Math.floor(r()*2))},
  {id:'SES',beats:1,meters:'simple',items:()=>[n(.25),n(.5),n(.25)]},
  {id:'SNAP',beats:1,meters:'simple',items:()=>[n(.25),n(.75)]},
  {id:'DES',beats:1,meters:'simple',items:()=>[n(.75),n(.25)]},
  {id:'RSSS',beats:1,meters:'simple',items:()=>[r(.25),n(.25),n(.25),n(.25)]},
  {id:'SRSS',beats:1,meters:'simple',items:()=>[n(.25),r(.25),n(.25),n(.25)]},
  // 6/8: duplets and quadruplets against the three eighths, a hemiola bar, dotted and snapped groups.
  {id:'C_DUP',beats:1,core:true,count:2,meters:'compound',items:()=>tup(2,3,.5)},
  {id:'C_QUAD',beats:1,core:true,count:4,meters:'compound',items:r=>tup(4,3,.5,carve(r,4))},
  {id:'C_HEM',beats:2,core:true,meters:'compound',items:()=>[n(1),n(1),n(1)]},
  {id:'C_DOT',beats:1,meters:'compound',items:()=>[n(.75),n(.25),n(.5)]},
  {id:'C_SNAP',beats:1,meters:'compound',items:()=>[n(.25),n(.75),n(.5)]},
  {id:'C_RS',beats:1,meters:'compound',items:()=>[r(.25),n(.25),n(.5),n(.5)]},
  {id:'C_SSE',beats:1,meters:'compound',items:()=>[n(.25),n(.25),n(.25),n(.25),n(.5)]},
];
const HARD_METERS=[M(4),M(4),M(3),M(3),M(2),M(6,8),M(5)];

function buildHard(meter:Meter,bars:number,random:()=>number){
  const pick=<T,>(list:readonly T[])=>list[Math.floor(random()*list.length)];
  const compound=meter.bottom===8,top=compound?meter.top/3:meter.top,beat=compound?1.5:1;
  const pool=HARD.filter(c=>c.meters==='3/4'?meter.top===3&&!compound:c.meters===(compound?'compound':'simple'));
  const items:RhythmItem[]=[],beams:number[][]=[],tuplets:{from:number;to:number;count:number}[]=[],barStarts:number[]=[],used:string[]=[];
  for(let bar=0;bar<bars;bar++){
    if(bar)barStarts.push(items.length);
    for(let at=0;at<top;){
      const cell=pick(pool.filter(c=>c.id!==used[used.length-1]&&fits({beats:c.beats,items:[]},at,meter)));
      if(!cell)return null;
      const start=items.length,made=cell.items(random);
      made.forEach(item=>items.push(item));
      if(cell.count)tuplets.push({from:start,to:start+made.length-1,count:cell.count});
      if(made.every(i=>i.written<1)){const beam=made.map((_,i)=>start+i).filter(i=>!items[i].rest);if(beam.length>1)beams.push(beam)}
      used.push(cell.id);at+=cell.beats;
    }
  }
  if(!used.some(id=>HARD.find(c=>c.id===id)!.core))return null;
  if(new Set(used).size<Math.min(3,Math.max(2,used.length-1))||items.filter(i=>!i.rest).length<6)return null;
  if(items.some((item,i)=>item.rest&&items[i+1]?.rest))return null;
  const total=barLength(meter)*bars,len=(i:RhythmItem)=>i.ratio?i.written*i.ratio[1]/i.ratio[0]:i.written;
  if(items.filter(i=>i.rest).reduce((s,i)=>s+len(i),0)>total/4)return null;
  // A plain note that ends on a beat, tied into the plain note that starts it: the sound carries over the beat.
  const spots:number[]=[];let t=0;
  items.forEach((item,i)=>{t+=len(item);const next=items[i+1];
    if(next&&!item.rest&&!next.rest&&!item.ratio&&!next.ratio&&item.written<beat&&Math.abs(t/beat-Math.round(t/beat))<1e-6)spots.push(i)});
  if(spots.length&&random()<.7)items[pick(spots)].tieNext=true;
  return {items,beams,tuplets,bars:barStarts};
}

function generateHard(random:()=>number,room:number,id:string):DrillPattern{
  const pick=<T,>(list:readonly T[])=>list[Math.floor(random()*list.length)];
  let meter=pick(HARD_METERS),bars=1;
  for(let attempt=0;attempt<1200;attempt++){
    // A meter is kept for a while, so meters that fit easily don't crowd out the rest.
    if(attempt%40===0){meter=pick(HARD_METERS);bars=random()<.5?2:1}
    const built=buildHard(meter,bars,random);
    if(!built)continue;
    if(barLength(meter)*bars>maxLength(room,shortestOf(built.items))+1e-6)continue;
    return {...built,id,meter,beat:meterBeat(meter),top:meter.bottom===8?meter.top/3:meter.top,rank:rankOf(built.items,meter)};
  }
  return {id,items:[n(1),n(1),n(2)],meter:M(4),beat:1,top:4,rank:0};
}

/** Tempo for a difficulty, in quarter notes per minute: slower as the quickest note gets quicker, so it stays tappable. */
export function tierTempo(tier:Tier,pattern:DrillPattern){
  const s=shortestOf(pattern.items);
  if(tier==='easy')return 84;
  if(tier==='medium')return s<.3?84:s<.4?92:100;
  return s<.18?60:s<.22?66:s<.3?72:80;
}

/** Where a cell may start, as a beat in its bar. */
function fits(cell:Cell,at:number,meter:Meter){
  const top=meter.bottom===8?meter.top/3:meter.top;
  if(at+cell.beats>top)return false;
  if(cell.beats===1)return true;
  if(meter.bottom===8||cell.beats===4)return at===0;
  if(cell.beats===3)return at===0&&top!==5;
  // Two beats: in 4/4 on beat 1 or 3 (nothing crosses the middle), in 3/4 on beat 1 or 2, in 5/4 inside 3 + 2.
  return top===4?at%2===0:top===3?at<=1:top===5?at!==2:at===0;
}

/** Ways a level's rhythm can be laid out: one bar or two, as long as the row still fits. */
function layouts(L:Level){
  const out:{meter:Meter;bars:number}[]=[];
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
  return generate([ladder(level)],random,room,id);
}
/** One rhythm for a fixed difficulty, sized for `room` the same way. */
export function makeTierRhythm(tier:Tier,random:()=>number,room:number,id:string):DrillPattern{
  return tier==='hard'?generateHard(random,room,id):generate(TIER_SPECS[tier],random,room,id);
}

function generate(specs:Spec[],random:()=>number,room:number,id:string):DrillPattern{
  const pick=<T,>(list:readonly T[])=>list[Math.floor(random()*list.length)];
  // One set of rules per rhythm (moving on only if it keeps failing), so rules that succeed more often don't crowd out the rest.
  const first=Math.floor(random()*specs.length);
  let layout=layouts(specs[first].L)[0];
  for(let attempt=0;attempt<800;attempt++){
    const spec=specs[(first+Math.floor(attempt/200))%specs.length];
    layout=pick(layouts(spec.L));
    const {meter,bars}=layout;
    const built=build(spec,meter,bars,random);
    if(!built)continue;
    if(barLength(meter)*bars>maxLength(room,shortestOf(built.items))+1e-6)continue;
    const rank=rankOf(built.items,meter);
    if(!spec.ok(rank,built.items))continue;
    return {...built,id,meter,beat:meterBeat(meter),top:meter.bottom===8?meter.top/3:meter.top,rank};
  }
  // Only reached if a level's rules cannot fit `room` (the check script makes sure they can). Rank 0 marks it.
  const meter=M(4);
  return {id,items:[n(1),n(1),n(2)],meter,beat:1,top:4,rank:0};
}

function build({L,restStart,tieOdds}:Spec,meter:Meter,bars:number,random:()=>number){
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
  if(items[0].rest&&!restStart)return null;
  if(items.filter(i=>!i.rest).length<3)return null;
  if(L.ties&&random()<tieOdds&&!addTie(items,meter,bars,L.ties,random))return null;
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
