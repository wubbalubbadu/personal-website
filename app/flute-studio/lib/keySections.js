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

/** Tonic changes follow the visible key headings after filtering. */
export function keyDroneChanges(xml){
 let measure=0;const changes=[];
 for(const match of xml.matchAll(/<measure\b[^>]*>[\s\S]*?<\/measure>/g)){
  measure++;const tonic=match[0].match(/<words>([A-Ga-g][♭♯]?) (?:major|minor)<\/words>/)?.[1];
  if(tonic)changes.push({measure,pitch:tonic[0].toUpperCase()+tonic.slice(1)+'3'});
 }
 return changes;
}
