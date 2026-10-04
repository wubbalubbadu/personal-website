/**
 * OSMD draws an <accidental> that is in the MusicXML, except where the same
 * pitch was already altered earlier in the bar: its own accidental logic
 * treats that as "already shown" and skips even an explicit one. A reminder
 * accidental is exactly that case (the engraver printed the sign once, and the
 * player needs it again), so while reminders are on, draw it.
 *
 * Off by default: with reminders off the engraving is OSMD's own, unchanged.
 */
let remindersOn=false;
export function setReminderAccidentals(on){remindersOn=!!on}

const patched=new WeakSet();
export function installReminderAccidentalFix(AccidentalCalculator,MusicSheetCalculator){
  if(patched.has(AccidentalCalculator))return;
  patched.add(AccidentalCalculator);
  const original=AccidentalCalculator.prototype.checkAccidental;
  AccidentalCalculator.prototype.checkAccidental=function(graphicalNote,pitch){
    if(!remindersOn||!pitch||!pitch.AccidentalXml)return original.call(this,graphicalNote,pitch);
    const key=pitch.FundamentalNote+12*pitch.Octave;
    const alteredEarlier=this.currentAlterationsComparedToKeyInstructionList.indexOf(key)>=0;
    const unchanged=this.currentInMeasureNoteAlterationsDict.containsKey(key)&&this.currentInMeasureNoteAlterationsDict.getValue(key)===pitch.AccidentalHalfTones;
    const result=original.call(this,graphicalNote,pitch);
    // The one case OSMD skips: same pitch, same alteration, already altered earlier in this bar.
    if(alteredEarlier&&unchanged&&this.Transpose===0)MusicSheetCalculator.symbolFactory.addGraphicalAccidental(graphicalNote,pitch);
    return result;
  };
}
