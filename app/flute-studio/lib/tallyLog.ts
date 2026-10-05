/**
 * Repetition tallies for a tricky bit: the sticks you draw on paper, four
 * upright and a fifth across them. Pure helpers (the page owns the storage in
 * lib/trickyBits.ts).
 */

/** A count after adding delta, never below zero or a fraction. */
export function bumpTally(count:number,delta:number){
  return Math.max(0,Math.floor(Number.isFinite(count)?count:0)+delta);
}

/** The count as groups of sticks: every full group of five is crossed, a last group of 1 to 4 is not. */
export function tallyGroups(count:number):{sticks:number;crossed:boolean}[]{
  const total=Math.max(0,Math.floor(Number.isFinite(count)?count:0)),groups:{sticks:number;crossed:boolean}[]=[];
  for(let left=total;left>0;left-=5)groups.push(left>=5?{sticks:5,crossed:true}:{sticks:left,crossed:false});
  return groups;
}
