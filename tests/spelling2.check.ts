import {scaleNotes,majorKeys,typeById} from "../app/flute-studio/exercises/scales/scale-score";
const nm=(n:{step:string;alter:number})=>`${n.step}${n.alter===-1?"♭":n.alter===1?"♯":""}`;
for(const [k,t] of [["Db","chromatic"],["E","chromatic"],["Gb","chromatic"],["Ab","harmonic"]] as const){
  const key=majorKeys.find(x=>x.id===k)!;
  const notes=scaleNotes(key,"one",t);
  console.log(`${key.label} ${typeById(t).label}`.padEnd(22),notes.slice(0,13).map(nm).join(" "));
  // every letter must be a real letter and every alter within one semitone
  const ok=notes.every(n=>Math.abs(n.alter)<=1);
  const monotonic=notes.slice(0,13).every((n,i,a)=>i===0||a[i].midi>=a[i-1].midi);
  console.log("".padEnd(22),"singleAccidentals="+ok,"midiAscends="+monotonic,"midiRange="+Math.min(...notes.map(n=>n.midi))+"-"+Math.max(...notes.map(n=>n.midi)));
}
