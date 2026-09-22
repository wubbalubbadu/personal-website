import {scaleNoteName,midiForNote,octaveOfMidi,pitchClassOfMidi} from "../app/flute-studio/exercises/scales/scale-score";
for(const m of [59,60,61,63,72,84,96,98])
  console.log(m,"->",scaleNoteName(m),"| octave",octaveOfMidi(m),"pc",pitchClassOfMidi(m),"| roundtrip",midiForNote(octaveOfMidi(m),pitchClassOfMidi(m))===m);
