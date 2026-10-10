import type {RowNote} from '../EngravedRow';

export type Ratio=readonly [number,number];
export type RhythmItem={written:number;ratio?:Ratio;rest?:boolean;pitch?:number;tieNext?:boolean};
export type RhythmPattern={id:string;items:RhythmItem[];bars?:number[];beams?:number[][];tuplets?:{from:number;to:number;count:number}[]};
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
export const DOT_HALF:RhythmPattern={id:'dot-half',items:[{written:3},{written:1}]};
export const DOT_QUARTER:RhythmPattern={id:'dot-quarter',items:[{written:1.5},{written:.5},{written:2}]};
export const SYNCOPATED:RhythmPattern={id:'syncopated',items:[{written:.5},{written:.5,tieNext:true},{written:.5},{written:.5},{written:1},{written:1}],beams:[[0,1],[2,3]]};
export function dividedBeat(count:2|3|5):RhythmPattern{
  return {id:`divide-${count}`,items:[...Array.from({length:count},()=>({written:count===5?.25:.5,ratio:(count===2?[1,1]:count===3?[3,2]:[5,4]) as Ratio})),{written:1},{written:1},{written:1}],beams:[Array.from({length:count},(_,i)=>i)],tuplets:count===2?[]:[{from:0,to:count-1,count}]};
}
export const DRILLS=[DOT_HALF,DOT_QUARTER,SYNCOPATED,dividedBeat(3)];
/** Feedback is informative, not a completion gate. Never match two taps to the same onset. */
export function matchTapPositions(taps:readonly number[],expected:readonly number[],secondsPerQuarter:number){
  const gaps=expected.slice(1).map((n,i)=>n-expected[i]);
  const window=Math.min(.18/secondsPerQuarter,.4*Math.min(...gaps,1));
  const available=new Set(expected.map((_,i)=>i));
  const matched=taps.map(t=>{
    let nearest=-1,distance=Infinity;
    for(const i of available){const d=Math.abs(expected[i]-t);if(d<distance){nearest=i;distance=d}}
    if(distance<=window){available.delete(nearest);return nearest}return -1;
  });
  return {matched,missing:[...available],window};
}
