import {PITCHES} from '../model';

export type Acc='sharp'|'flat'|'natural';
/** A written note: `p` is its staff position (C4 = -2), `acc` the sign written in front of it. */
export type ReadNote={v:number;p:number;acc?:Acc;/** Room kept on the staff for a sign (drawing only; it never changes the pitch). */room?:Acc};

/** MIDI of the plain letter at staff position p. */
export const letterMidi=(p:number)=>PITCHES[p+2].midi;
/** MIDI of a note with a sign: a sharp raises it a half step, a flat lowers it, a natural or none leaves the letter. */
export const midiOf=(p:number,acc?:Acc)=>letterMidi(p)+(acc==='sharp'?1:acc==='flat'?-1:0);

/** The letters a key signature changes, in the order its signs are written: sharps F C G D A E B, flats the same letters backwards. */
export const SHARP_ORDER=['F','C','G','D','A','E','B'] as const;
export const FLAT_ORDER=['B','E','A','D','G','C','F'] as const;
/** The letters a signature changes: `key` counts sharps (positive) or flats (negative). */
export const keyLetters=(key:number):string[]=>key>=0?SHARP_ORDER.slice(0,key):FLAT_ORDER.slice(0,-key);
/** The sign the key signature gives a staff position, in every octave. */
export const keyAcc=(p:number,key:number):Acc|undefined=>keyLetters(key).includes(PITCHES[p+2].name)?(key>0?'sharp':'flat'):undefined;

/**
 * The sign each note sounds with. A written sign holds for later notes at the same staff position
 * until another sign at that position replaces it; a bar line clears everything. `bars` holds the
 * indices of notes that start a measure. A natural reads as no sign at all. With no written sign in
 * force, the key signature decides (`key`: sharps positive, flats negative), for every octave.
 */
export function soundingAcc(notes:ReadNote[],bars:number[],key=0):(Acc|undefined)[]{
  const out:(Acc|undefined)[]=[];let held=new Map<number,Acc>();
  notes.forEach((n,i)=>{
    if(bars.includes(i))held=new Map();
    if(n.acc)held.set(n.p,n.acc);
    const acc=held.get(n.p)??keyAcc(n.p,key);
    out.push(acc==='natural'?undefined:acc);
  });
  return out;
}

export function soundingMidi(notes:ReadNote[],bars:number[],key=0):number[]{
  const accs=soundingAcc(notes,bars,key);
  return notes.map((n,i)=>midiOf(n.p,accs[i]));
}
