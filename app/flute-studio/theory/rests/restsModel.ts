import type {RowNote} from '../EngravedRow';

export const SILENCE:RowNote[]=[{v:1},{v:1,rest:true},{v:1},{v:1}];
export const GAPS:{notes:RowNote[];gap:number;answer:number}[]=[
  {notes:[{v:1},{v:1,rest:true},{v:2}],gap:1,answer:1},
  {notes:[{v:.5},{v:.5,rest:true},{v:1},{v:2}],gap:1,answer:.5},
  {notes:[{v:.25},{v:.25,rest:true},{v:.5},{v:1},{v:2}],gap:1,answer:.25},
];
export const restPitches=(notes:readonly RowNote[])=>notes.map(n=>n.rest?null:67);
export type TapResult='correct'|'rest'|'missing'|'timing';
/** Taps are quarter-note units after count-in. Judge only after the full measure ends. */
export function assessRestTaps(taps:readonly number[],tolerance=.28):TapResult{
  const expected=[0,2,3];
  if(taps.some(t=>t>.5&&t<1.5))return 'rest';
  if(taps.length<expected.length)return 'missing';
  if(taps.length!==expected.length)return 'timing';
  return taps.every((t,i)=>Math.abs(t-expected[i])<=tolerance)?'correct':'timing';
}
