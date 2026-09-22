import {articulationPresetSelection,resolveArticulationPattern,resolveArticulation,isMixedArticulation,marksStaccato} from "../app/flute-studio/components/notePatterns";
for(const id of ["allSlurred","allStaccato","allTenuto","slur2Tongue2","tongue2Slur2","slur2Tongue1"] as const){
  const sel=articulationPresetSelection(id);
  const pattern=resolveArticulationPattern(sel,8);
  const mixed=isMixedArticulation(pattern);
  const marks=Array.from({length:8},(_,i)=>{const m=resolveArticulation(pattern,i).mode;return marksStaccato(m,mixed)?".":m==="slur"?"‿":m==="tenuto"?"–":"·"});
  console.log(id.padEnd(14),"mixed="+String(mixed).padEnd(5),marks.join(" "));
}
