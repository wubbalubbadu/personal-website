import type {RowNote} from '../EngravedRow';

/*
 * Random rhythms for lesson 3's exercises, built only from what the learner knows by now:
 * whole, half and quarter notes, and pairs of eighths that share one beat. No dots or rests yet.
 */
export function shuffle<T>(items:T[]){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const pick=<T,>(items:T[])=>items[Math.floor(Math.random()*items.length)];

/** One measure's note lengths, by beats per measure and difficulty. Eighths always come in pairs on a beat. */
const MEASURES:Record<number,{easy:number[][];mixed:number[][];eighths:number[][]}>={
  4:{easy:[[1,1,1,1]],mixed:[[2,1,1],[1,2,1],[1,1,2],[2,2],[4],[1,1,1,1]],
    eighths:[[.5,.5,1,2],[1,.5,.5,1,1],[2,.5,.5,1],[.5,.5,.5,.5,2],[1,1,.5,.5,1],[2,2],[1,2,1]]},
  3:{easy:[[1,1,1]],mixed:[[2,1],[1,2],[1,1,1]],eighths:[[.5,.5,1,1],[2,.5,.5],[1,.5,.5,1],[2,1],[1,2]]},
  2:{easy:[[1,1]],mixed:[[2],[1,1]],eighths:[[.5,.5,1],[1,.5,.5],[2]]},
};
export type Level=keyof typeof MEASURES[4];

export type Rhythm={notes:RowNote[];bars:number[];top:number};

/** A rhythm of `count` measures with its correct bar lines (as note indices a bar comes before). */
export function makeRhythm(top:number,count:number,level:Level):Rhythm{
  const pool=MEASURES[top][level],notes:RowNote[]=[],bars:number[]=[];
  let previous='';
  for(let m=0;m<count;m++){
    if(m>0)bars.push(notes.length);
    // Avoid the same measure twice in a row, so each measure has to be counted.
    let measure=pick(pool);
    while(pool.length>1&&measure.join()===previous)measure=pick(pool);
    previous=measure.join();
    measure.forEach(v=>notes.push({v}));
  }
  return {notes,bars,top};
}

/**
 * Beam groups the way printed music beams them: eighths within one beat together (a pair), sixteenths
 * within one beat together (four). `group` is the beaming unit in quarter notes (1 in 4/4 and 3/4, 1.5 in 6/8).
 */
export function beamGroups(notes:RowNote[],group=1):number[][]{
  const groups:number[][]=[];let t=0,current:number[]=[],slot=-1;
  notes.forEach((n,i)=>{
    const s=Math.floor(t/group+1e-6);
    if(n.v<1&&!([.75,1.5,3].includes(n.v))&&s===slot)current.push(i);
    else{if(current.length>1)groups.push(current);current=n.v<1?[i]:[];slot=n.v<1?s:-1}
    t+=n.v;
  });
  if(current.length>1)groups.push(current);
  return groups;
}

/** Which beat does a circled note start on? Two measures of 4/4; the circled note is in the second. */
export type BeatQuestion={notes:RowNote[];bars:number[];target:number;answer:number};
// Measures with a note starting on each beat; eighth pairs make the counting less automatic.
const STARTS_ON:Record<number,number[][]>={
  1:[[1,1,1,1],[2,1,1],[1,.5,.5,2]],
  2:[[.5,.5,1,2],[1,2,1],[.5,.5,1,1,1]],
  3:[[2,1,1],[.5,.5,.5,.5,2],[1,.5,.5,1,1],[.5,.5,1,1,1]],
  4:[[1,2,1],[2,.5,.5,1],[1,1,.5,.5,1],[.5,.5,2,1]],
};
/** Four questions whose answers are 1, 2, 3 and 4 in random order; most need a half note or eighths counted. */
export function makeBeatQuestions():BeatQuestion[]{
  return shuffle([1,2,3,4]).map(answer=>{
    const options=STARTS_ON[answer];
    const counted=options.filter(m=>{let t=0;for(const v of m){if(t===answer-1)break;if(v!==1)return true;t+=v}return false});
    const second=pick(counted.length?counted:options),first=pick(MEASURES[4].eighths);
    const notes=[...first,...second].map(v=>({v}));
    let t=0,target=first.length;
    for(let i=0;i<second.length;i++){if(Math.abs(t-(answer-1))<1e-6){target=first.length+i;break}t+=second[i]}
    return {notes,bars:[first.length],target,answer};
  });
}

/** Beats in each measure when bar lines are placed before the given note indices. */
export function measureTotals(notes:RowNote[],bars:number[]){
  const cuts=[0,...[...bars].sort((a,b)=>a-b),notes.length],totals:number[]=[];
  for(let i=0;i<cuts.length-1;i++)totals.push(notes.slice(cuts[i],cuts[i+1]).reduce((a,n)=>a+n.v,0));
  return {cuts,totals};
}
