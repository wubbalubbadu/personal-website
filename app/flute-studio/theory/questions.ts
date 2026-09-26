import {notationPitch} from './sequence';

export type Question={kind:'place'|'name';position:number};

function shuffle<T>(items:T[]){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

// Six rounds inside the staff (E4 to F5), alternating place and name, no note twice.
export function makePractice():Question[]{
  return shuffle([0,1,2,3,4,5,6,7,8]).slice(0,6).map((position,i)=>({kind:i%2?'name':'place',position}));
}

// Four ledger-line notes, which practice never drilled: two below the staff (G3 to C4,
// where clarinet and sax often read) and two above (A5 to C6, where flute often reads).
export function makeCheck():Question[]{
  const below=shuffle([-5,-4,-3,-2]).slice(0,2),above=shuffle([10,11,12]).slice(0,2);
  return shuffle([...below,...above]).map(position=>({kind:'name' as const,position}));
}

// The letters from one position to another, e.g. G to C gives "G, A, B, C". Used as the hint after a miss.
export function countFrom(start:number,position:number){
  const dir=position>=start?1:-1,names:string[]=[];
  for(let p=start;;p+=dir){names.push(notationPitch(p).name);if(p===position)break}
  return names.join(', ');
}

// The right letter plus its two neighbors, the letters people actually confuse it with.
export function nameChoices(position:number){
  const letters=[position-1,position,position+1].map(p=>notationPitch(p).name),turn=((position%3)+3)%3;
  return [...letters.slice(turn),...letters.slice(0,turn)];
}
