import {scaleMusicXML,majorKeys} from "../app/flute-studio/exercises/scales/scale-score";
import {articulationPresetSelection} from "../app/flute-studio/components/notePatterns";
const C=majorKeys.find(k=>k.id==="C")!;
for(const id of ["allSlurred","allStaccato","slur2Tongue2","tongue2Slur2","slur2Tongue1"] as const){
  const xml=scaleMusicXML(C,"one",articulationPresetSelection(id));
  const notes=(xml.match(/<note>/g)||[]).length;
  const stac=(xml.match(/<staccato\/>/g)||[]).length;
  const slurStart=(xml.match(/<slur type="start"/g)||[]).length;
  console.log(id.padEnd(14),"notes="+String(notes).padStart(3),"staccato="+String(stac).padStart(3),"slurs="+String(slurStart).padStart(3));
}
