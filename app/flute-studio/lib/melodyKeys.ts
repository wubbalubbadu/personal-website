/**
 * Melodies through the keys: which keys a short melody is shown in, and at which octave.
 *
 * A melody is written once, in one key. It is then shown moving up by half steps from that key (Reichert style),
 * so key n is the written melody moved up n semitones. A key that would leave the flute's range is moved by an
 * octave when that fits, or left out.
 *
 * Shared by the local uploader (tools/melody-uploader.mjs serves it with the types stripped) and the studio, so
 * both agree on which keys exist. Keep it free of imports other than ./transpose.
 */
import {FLUTE_HIGH,FLUTE_LOW} from "./transpose";

/** One key of a melody: semitones up from the written key (0 to 11) and an octave shift (-1, 0 or 1). */
export type MelodyKey={semitones:number;octave:number};

/**
 * The octave shift that keeps a transposed melody playable, or null when no shift does.
 * `low` and `high` are the lowest and highest written pitch (MIDI, middle C = 60) after moving up, before any
 * octave shift. The flute reads C4 (60) to D7 (98).
 */
export function fitToFlute(low:number,high:number):number|null{
  const fits=(shift:number)=>low+12*shift>=FLUTE_LOW&&high+12*shift<=FLUTE_HIGH;
  // Keep the melody where it was written when it fits; otherwise the nearer octave down, then up.
  for(const shift of [0,-1,1])if(fits(shift))return shift;
  return null;
}

/** The keys up from the written key, in order, for a melody whose written range is `low` to `high`. */
export function melodyKeys(low:number,high:number):Array<MelodyKey&{fits:boolean}>{
  return Array.from({length:12},(_,semitones)=>{
    const octave=fitToFlute(low+semitones,high+semitones);
    return {semitones,octave:octave??0,fits:octave!==null};
  });
}
