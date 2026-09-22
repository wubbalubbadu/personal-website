import {scaleNotes,majorKeys} from "../app/flute-studio/exercises/scales/scale-score";
const nm=(n:{step:string;alter:number})=>`${n.step}${n.alter===-1?"♭":n.alter===1?"♯":""}`;
let bad=0;
for(const key of majorKeys){
  const one=scaleNotes(key,"one","major").slice(0,8).map(nm);
  const letters=one.slice(0,7).map(s=>s[0]);
  const eachLetterOnce=new Set(letters).size===7;
  if(!eachLetterOnce){bad++;console.log("BAD",key.label,one.join(" "));}
}
console.log("major scales using each letter exactly once:",majorKeys.length-bad,"/",majorKeys.length);
for(const k of ["C","Db","F#","B"] as const){
  const key=majorKeys.find(x=>x.id===k);
  if(key)console.log(key.label.padEnd(4),scaleNotes(key,"one","major").slice(0,8).map(nm).join(" "));
}
