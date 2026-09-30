/** OSMD's ghost spacer can be smaller than its duration lookup threshold.
 * Supply an invisible glyph shape; GhostNotes still assigns the exact original ticks.
 * This does not alter visible notes, tuplets, or the MusicXML.
 */
const patched=new WeakSet();
export function installGhostNoteFix(converter){
 if(patched.has(converter))return;
 patched.add(converter);
 const ghostNotes=converter.GhostNotes;
 converter.GhostNotes=function(length){
  if(!(length.RealValue>0&&length.RealValue<=.0001))return ghostNotes.call(this,length);
  const durations=converter.durations;
  converter.durations=function(value,tuplet){return value===length?['128']:durations.call(this,value,tuplet)};
  try{return ghostNotes.call(this,length)}finally{converter.durations=durations}
 };
}
