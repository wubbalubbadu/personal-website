import type {Acc} from './pitch';
import {midiOf} from './pitch';

/** A note on a staff: its staff position and the sign written in front of it (none for a plain note). */
export type PairNote={p:number;acc?:Acc};
export type Pair=[PairNote,PairNote];

/**
 * The four pairs, one key written two ways: a sharp on the top staff and its other name below.
 * C sharp and D flat were found in step 2, and E sharp and F were shown at the end of it, so nothing
 * here is new. C sharp and D flat come first: that pair is joined already, as the example.
 */
export const PAIRS:Pair[]=[
  [{p:-2,acc:'sharp'},{p:-1,acc:'flat'}],  // C sharp 4 / D flat 4
  [{p:1,acc:'sharp'},{p:2,acc:'flat'}],    // F sharp 4 / G flat 4
  [{p:3,acc:'sharp'},{p:4,acc:'flat'}],    // A sharp 4 / B flat 4
  [{p:0,acc:'sharp'},{p:1}],               // E sharp 4 / F 4
];

export const pairMidi=(pair:Pair)=>[midiOf(pair[0].p,pair[0].acc),midiOf(pair[1].p,pair[1].acc)];

export type Round={
  left:PairNote[];right:PairNote[];
  /** For each top note, the index of its partner on the bottom staff. */
  partner:number[];
};

function shuffled<T>(items:T[],rand:()=>number){
  const out=[...items];
  for(let i=out.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[out[i],out[j]]=[out[j],out[i]]}
  return out;
}

/** The top staff keeps its order; the bottom staff is shuffled so that no note sits straight below its own partner. */
export function makeRound(rand:()=>number=Math.random):Round{
  let order=PAIRS.map((_,i)=>i);
  do{order=shuffled(order,rand)}while(order.some((pair,slot)=>pair===slot));
  // order[slot] is which pair's lower note sits in that slot.
  return {left:PAIRS.map(pair=>pair[0]),right:order.map(pair=>PAIRS[pair][1]),partner:PAIRS.map((_,pair)=>order.indexOf(pair))};
}
