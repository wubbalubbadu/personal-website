import {scaleNotes,majorKeys,scaleTypes} from "../app/flute-studio/exercises/scales/scale-score";
const name=(n:{step:string;alter:number;octave:number})=>
  `${n.step}${n.alter===-2?"𝄫":n.alter===-1?"♭":n.alter===1?"♯":n.alter===2?"𝄪":""}${n.octave}`;
let bad=0;
for(const type of scaleTypes){
  for(const key of majorKeys){
    const notes=scaleNotes(key,"two",type.id);
    const doubles=notes.filter(n=>Math.abs(n.alter)>1);
    if(doubles.length){
      bad++;
      if(bad<=8)console.log(`${key.label} ${type.label}`.padEnd(26),"doubles="+String(doubles.length).padStart(3),[...new Set(doubles.map(name))].slice(0,6).join(" "));
    }
  }
}
console.log("--- key+type combinations containing double accidentals:",bad);
