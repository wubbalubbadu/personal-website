import type {ArticulationMode} from './notePatterns';

/** Printed staccato stays detached even within a phrase slur. */
export function scoreArticulation(slurred:boolean,staccato:boolean,tenuto:boolean,impliedStaccato=false):ArticulationMode{
  return staccato?'staccato':slurred?'slur':tenuto?'tenuto':impliedStaccato?'staccato':'tongue';
}
export function connectsSlur(previous:ArticulationMode|undefined,current:ArticulationMode|undefined,continuation:boolean){
  return previous==='slur'&&current==='slur'&&continuation;
}
