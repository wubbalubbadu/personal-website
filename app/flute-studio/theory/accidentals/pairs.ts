import type {Acc} from './pitch';
import {midiOf} from './pitch';

/** A note on a small staff: its staff position and the sign written in front of it (none for a plain note). */
export type PairNote={p:number;acc?:Acc};
export type Pair=[PairNote,PairNote];

/** Shown, not asked: the black key between A and B is A sharp and B flat. */
export const SHOWN:Pair=[{p:3,acc:'sharp'},{p:4,acc:'flat'}];
/** Pairs that are asked. Each is one key written two ways, a sharp on the left and its flat on the right. */
export const POOL:Pair[]=[
  [{p:5,acc:'sharp'},{p:6,acc:'flat'}],   // C sharp 5 / D flat 5
  [{p:-1,acc:'sharp'},{p:0,acc:'flat'}],  // D sharp 4 / E flat 4
  [{p:1,acc:'sharp'},{p:2,acc:'flat'}],   // F sharp 4 / G flat 4
  [{p:2,acc:'sharp'},{p:3,acc:'flat'}],   // G sharp 4 / A flat 4
];
/** Always included: a sharp that is a white key. E sharp is just F. */
export const WHITE:Pair=[{p:0,acc:'sharp'},{p:1}];

export const pairMidi=(pair:Pair)=>[midiOf(pair[0].p,pair[0].acc),midiOf(pair[1].p,pair[1].acc)];

export type Round={
  left:PairNote[];right:PairNote[];
  /** For each left note, the index of its partner on the right. */
  partner:number[];
};

function shuffled<T>(items:T[],rand:()=>number){
  const out=[...items];
  for(let i=out.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[out[i],out[j]]=[out[j],out[i]]}
  return out;
}

/**
 * Four pairs: the shown one first, then three drawn fresh (the white-key pair and two from the pool).
 * The left column keeps that order; the right column is shuffled so that no note sits level with its
 * own partner (every line has to be drawn across).
 */
export function makeRound(rand:()=>number=Math.random):Round{
  const drawn=shuffled([WHITE,...shuffled(POOL,rand).slice(0,2)],rand);
  const pairs=[SHOWN,...drawn];
  let order=pairs.map((_,i)=>i);
  do{order=shuffled(order,rand)}while(order.some((pair,slot)=>pair===slot));
  // order[slot] is which pair's right note sits in that slot on the right.
  const right=order.map(pair=>pairs[pair][1]);
  const partner=pairs.map((_,pair)=>order.indexOf(pair));
  return {left:pairs.map(pair=>pair[0]),right,partner};
}
