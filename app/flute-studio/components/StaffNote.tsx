'use client';
import { EngravedNote } from './EngravedNote';
const names = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
const semitones: Record<string,number> = { C:0,D:2,E:4,F:5,G:7,A:9,B:11 };
export function StaffNote({midi,spelling,notation='quarter',label,width=170}: {
  midi:number; spelling?:string; notation?:'whole'|'quarter'; label?:string; width?:number;
}) {
  const name = spelling ?? names[((midi%12)+12)%12];
  const offset = semitones[name[0]] + (name.includes('♯') ? 1 : name.includes('♭') ? -1 : 0);
  // Written octave differs from sounding octave for B♯ and C♭.
  const octave = Math.round((midi-offset)/12)-1;
  return <EngravedNote pitch={`${name}${octave}`} notation={notation} label={label} width={width}/>;
}
