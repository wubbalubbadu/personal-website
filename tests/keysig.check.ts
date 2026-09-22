import {keySignatureNotes,keyForType,majorKeys,typeById} from "../app/flute-studio/exercises/scales/scale-score";
for(const [keyId,typeId] of [["C","major"],["Db","major"],["D","major"],["Eb","major"],["E","major"],["Gb","major"],["C","natural"],["A","natural"],["C","harmonic"],["C","chromatic"]] as const){
  const key=majorKeys.find(k=>k.id===keyId)!;
  const spelled=keyForType(key,typeById(typeId));
  console.log(`${keyId} ${typeId}`.padEnd(20),"fifths="+String(spelled.fifths).padStart(3),keySignatureNotes(spelled.fifths).join(" ")||"(none)");
}
