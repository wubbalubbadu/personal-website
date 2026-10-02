/** Keep selected keys in book order, without repeating the clef or meter. */
export function filterKeySections(xml,selected,newLines=false){
  const ids=new Set(selected);let number=0;let previousId="";
  return xml.replace(/<measure\b[^>]*>[\s\S]*?<\/measure>/g,measure=>{
    const id=measure.match(/\bid="([^"]+)"/)?.[1];
    if(!ids.has(id))return "";
    const first=number===0,section=id!==previousId;previousId=id;
    measure=measure.replace(/\bnumber="[^"]+"/,`number="${++number}"`).replace(/<print\b[^>]*(?:\/>|>[\s\S]*?<\/print>)/g,"");
    if(!first)measure=measure.replace(/<(clef|time)\b[^>]*>[\s\S]*?<\/\1>/g,"");

    if(newLines&&section&&!first)measure=measure.replace(/^(<measure\b[^>]*>)/,'$1<print new-system="yes"/>');
    return measure;
  });
}

/** Match the tonic's octave to its first written occurrence in each visible section. */
export function keyDroneChanges(xml){
 const measures=[...xml.matchAll(/<measure\b[^>]*>[\s\S]*?<\/measure>/g)].map(match=>match[0]);
 const changes=[];
 for(let index=0;index<measures.length;index++){
  const tonic=measures[index].match(/<words>([A-Ga-g][♭♯]?) (?:major|minor)<\/words>/)?.[1];
  if(!tonic)continue;
  const step=tonic[0].toUpperCase(),alter=tonic.includes('♭')?-1:tonic.includes('♯')?1:0;
  let octave=null;
  for(let next=index;next<measures.length&&octave===null;next++){
   if(next>index&&/<words>[A-Ga-g][♭♯]? (?:major|minor)<\/words>/.test(measures[next]))break;
   for(const match of measures[next].matchAll(/<pitch>([\s\S]*?)<\/pitch>/g)){
    const pitch=match[1];
    if(pitch.match(/<step>(.*?)<\/step>/)?.[1]===step&&Number(pitch.match(/<alter>(.*?)<\/alter>/)?.[1]??0)===alter){octave=Number(pitch.match(/<octave>(.*?)<\/octave>/)?.[1]);break}
   }
  }
  if(Number.isFinite(octave))changes.push({measure:index+1,pitch:step+tonic.slice(1)+octave});
 }
 return changes;
}
