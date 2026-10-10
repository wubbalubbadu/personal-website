import type {RowNote} from '../EngravedRow';

export type Ratio=readonly [number,number];
export type RhythmItem={written:number;ratio?:Ratio;rest?:boolean;pitch?:number;tieNext?:boolean};
export type RhythmPattern={id:string;items:RhythmItem[];/** Beats in the measure (quarter-note beats); 4 when left out. */top?:number;bars?:number[];beams?:number[][];tuplets?:{from:number;to:number;count:number}[]};
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
export function duration(item:RhythmItem):Ratio{
  // Written values are multiples of a sixteenth; a tuplet's ratio is actual:normal.
  const [actual,normal]=item.ratio??[1,1];
  if(!Number.isInteger(actual)||!Number.isInteger(normal)||actual<=0||normal<=0||item.written<=0||!Number.isInteger(item.written*4))throw new Error('Invalid written duration or tuplet ratio');
  const n=item.written*4*normal,d=4*actual,g=gcd(n,d);return [n/g,d/g];
}
export function compileRhythm(pattern:RhythmPattern){
  const lengths=pattern.items.map(duration);
  const ticksPerQuarter=lengths.reduce((l, [,d])=>l*d/gcd(l,d),1);
  let cursor=0;
  const ties:number[]=[];
  const timeline=pattern.items.map((item,i)=>{
    const [n,d]=lengths[i],ticks=n*ticksPerQuarter/d;
    const event={at:cursor/ticksPerQuarter,length:ticks/ticksPerQuarter,midi:item.rest?null:item.pitch??67};cursor+=ticks;
    if(item.tieNext){
      const next=pattern.items[i+1];
      if(item.rest||!next||next.rest||(item.pitch??67)!==(next.pitch??67))throw new Error('A tie needs adjacent sounding notes of the same pitch');
      ties.push(i);
    }
    return event;
  });
  const notes:RowNote[]=pattern.items.map((item,i)=>({v:timeline[i].length,written:item.written,rest:item.rest}));
  return {notes,timeline,ties,total:cursor/ticksPerQuarter,ticksPerQuarter,onsets:timeline.flatMap((e,i)=>e.midi!==null&&!ties.includes(i-1)?[e.at]:[])};
}
/** A half note and two quarters; HALF_TIED ties the half to the first quarter (3 beats, written as DOTTED_HALF). */
export const HALF_QUARTERS:RhythmPattern={id:'half-quarters',items:[{written:2},{written:1},{written:1}]};
export const HALF_TIED:RhythmPattern={id:'half-tied',items:[{written:2,tieNext:true},{written:1},{written:1}]};
export const DOTTED_HALF:RhythmPattern={id:'dotted-half',items:[{written:3},{written:1}]};
export const DOTTED_QUARTER:RhythmPattern={id:'dotted-quarter',items:[{written:1.5},{written:.5},{written:2}]};
/** A quarter and an eighth, then an eighth and a half: two separate sounds until a tie joins the first two. */
export const QUARTER_EIGHTHS:RhythmPattern={id:'quarter-eighths',items:[{written:1},{written:.5},{written:.5},{written:2}],beams:[[1,2]]};
/** The same rhythm as DOTTED_QUARTER, with the dot written as a tied eighth. */
export const TIED_QUARTER:RhythmPattern={id:'tied-quarter',items:[{written:1,tieNext:true},{written:.5},{written:.5},{written:2}],beams:[[1,2]]};
/** Beat 4 tied over the bar line to beat 1: one sound of 2 beats. ACROSS_APART is the same notes before the tie. */
export const ACROSS:RhythmPattern={id:'across',items:[{written:2},{written:1},{written:1,tieNext:true},{written:1},{written:1},{written:2}],bars:[3]};
export const ACROSS_APART:RhythmPattern={...ACROSS,id:'across-apart',items:ACROSS.items.map(n=>({...n,tieNext:false}))};
/** A dotted eighth and a sixteenth sharing beat 1, then a quarter and a half. */
export const DOTTED_EIGHTH:RhythmPattern={id:'dotted-eighth',items:[{written:.75},{written:.25},{written:1},{written:2}],beams:[[0,1]]};
/** Three rounds, a little harder each time: a dotted quarter in 4/4; short-long in 3/4; short-long plus a tie in 4/4. */
export const DRILLS:RhythmPattern[]=[
  DOTTED_QUARTER,
  {id:'short-long-3',top:3,items:[{written:.5},{written:1.5},{written:1}]},
  {id:'short-long-tied',items:[{written:.5},{written:1.5},{written:1,tieNext:true},{written:.5},{written:.5}],beams:[[3,4]]},
];
/** Where a tied note continues: no new start, so no tap. */
export const continuations=(pattern:RhythmPattern)=>{const d=compileRhythm(pattern);return d.ties.map(i=>d.timeline[i+1].at)};
export type TapMark={at:number;onset:number;timing:'on'|'early'|'late'|'extra'};
/**
 * Pair each tap with at most one note start (closest pairs first), then grade it. Offsets are in quarter notes.
 * A pair needs to be within PAIR seconds (and under half the gap to a neighbouring start, so a tap can never
 * belong to two notes); it only counts as on time within ON_TIME seconds of the start, measured from LEAD seconds
 * early: people tap a little ahead of a beat they hear (about 20 to 50 ms), so the window is centred there.
 * A wrong tap is never graded on time. Feedback only: progress never depends on it.
 */
export const ON_TIME=.1,PAIR=.3,LEAD=.025;
export function gradeTaps(taps:readonly number[],expected:readonly number[],secondsPerQuarter:number){
  const gaps=expected.slice(1).map((n,i)=>n-expected[i]),smallest=Math.min(1,...gaps);
  const pair=Math.min(PAIR/secondsPerQuarter,.45*smallest),onTime=Math.min(ON_TIME/secondsPerQuarter,.25*smallest),lead=LEAD/secondsPerQuarter;
  const pairs=taps.flatMap((t,ti)=>expected.map((e,ei)=>({ti,ei,d:Math.abs(t-e)}))).filter(p=>p.d<=pair).sort((a,b)=>a.d-b.d);
  const tapTo=taps.map(()=>-1),used=new Set<number>();
  for(const p of pairs)if(tapTo[p.ti]<0&&!used.has(p.ei)){tapTo[p.ti]=p.ei;used.add(p.ei)}
  const marks:TapMark[]=taps.map((at,i)=>{const e=tapTo[i];if(e<0)return {at,onset:-1,timing:'extra'};const err=at-expected[e]+lead;return {at,onset:e,timing:Math.abs(err)<=onTime?'on':err<0?'early':'late'}});
  const missing=expected.map((_,i)=>i).filter(i=>!used.has(i));
  return {marks,missing,perfect:missing.length===0&&marks.every(m=>m.timing==='on')};
}
