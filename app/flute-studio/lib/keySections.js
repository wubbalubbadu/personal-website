/** Keep selected keys in book order, without repeating the clef or meter. */
export function filterKeySections(xml,selected,newLines=false){
  const ids=new Set(selected);let number=0;let previousId="";
  return xml.replace(/<measure\b[^>]*>[\s\S]*?<\/measure>/g,measure=>{
    const id=measure.match(/\bid="([^"]+)"/)?.[1];
    if(!ids.has(id))return "";
    const first=number===0,section=id!==previousId;previousId=id;
    measure=measure.replace(/\bnumber="[^"]+"/,`number="${++number}"`).replace(/<print\b[^>]*(?:\/>|>[\s\S]*?<\/print>)/g,"");
    if(!first)measure=measure.replace(/<(clef|time)\b[^>]*>[\s\S]*?<\/\1>/g,"");
    measure=measure.replace(/<barline\b[^>]*>[\s\S]*?<\/barline>/g,bar=>bar.replace(/<bar-style>light-(?:light|heavy)<\/bar-style>/g,"<bar-style>regular</bar-style>"));
    if(newLines&&section&&!first)measure=measure.replace(/^(<measure\b[^>]*>)/,'$1<print new-system="yes"/>');
    return measure;
  });
}
