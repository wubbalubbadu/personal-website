/** MuseScore sometimes exports a whole rest plus invisible filler in 6/4.
 * Only a single visible whole rest filling an entire bar is a measure rest.
 * Ordinary rests, pickups and multiple voices keep their original notation. */
export function normalizeMeasureRests(xml:string){
 return xml.replace(/<part\s+id="[^"]+"[^>]*>[\s\S]*?<\/part>/g,part=>{
  let divisions=1,beats=4,beatType=4;
  return part.replace(/<measure\b[^>]*>[\s\S]*?<\/measure>/g,measure=>{
   divisions=Number(measure.match(/<divisions>(.*?)<\/divisions>/)?.[1]??divisions);
   beats=Number(measure.match(/<beats>(.*?)<\/beats>/)?.[1]??beats);beatType=Number(measure.match(/<beat-type>(.*?)<\/beat-type>/)?.[1]??beatType);
   const notes=[...measure.matchAll(/<note\b[^>]*>[\s\S]*?<\/note>/g)].map(m=>m[0]),visible=notes.filter(note=>!/^<note\b[^>]*print-object="no"/.test(note));
   if(visible.length!==1||notes.some(note=>!/<rest\b/.test(note))||/<backup>|<forward>/.test(measure))return measure;
   const note=visible[0];if(!/<type>whole<\/type>|<rest\b[^>]*measure="yes"/.test(note))return measure;
   const duration=notes.reduce((sum,n)=>sum+Number(n.match(/<duration>(.*?)<\/duration>/)?.[1]??0),0),bar=divisions*beats*4/beatType;
   if(Math.abs(duration-bar)>1e-7)return measure;
   const normalized=note.replace(/<rest\b[^>]*\/>/,'<rest measure="yes"/>').replace(/<duration>.*?<\/duration>/,`<duration>${duration}</duration>`);
   let written=false;return measure.replace(/<note\b[^>]*>[\s\S]*?<\/note>/g,()=>{if(written)return '';written=true;return normalized});
  });
 });
}
