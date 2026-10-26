'use client';
import { EngravedNote } from '../components/EngravedNote';
import { staffBoxStyle } from '../fingerings/NotePicker';

/** The trill engraved in a `.chart-staff` box sized for its octave's highest note (see staffBoxStyle). */
export default function TrillNotation({base,upper,highestStep}:{base:string;upper:string;highestStep:number}) {
  return <div className="chart-staff chart-staff--trill" style={staffBoxStyle(highestStep)}><EngravedNote pitch={base} auxiliary={upper} width={400}/></div>;
}
