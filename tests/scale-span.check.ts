import {scaleNotes,majorKeys,DEFAULT_SCALE_SPAN} from "../app/flute-studio/exercises/scales/scale-score";
const C=majorKeys.find(k=>k.id==="C")!;
const show=(label:string,notes:{midi:number}[])=>
  console.log(label.padEnd(26),"n="+String(notes.length).padStart(3),
    "low="+Math.min(...notes.map(n=>n.midi)),"high="+Math.max(...notes.map(n=>n.midi)));
show("standard (C4-C7)",scaleNotes(C,"standard"));
show("full (B3-D7)",scaleNotes(C,"full"));
show("custom 60-72",scaleNotes(C,"custom","major","scale","none","tonic",{low:60,high:72}));
show("custom 62-84",scaleNotes(C,"custom","major","scale","none","tonic",{low:62,high:84}));
show("custom reversed 84-62",scaleNotes(C,"custom","major","scale","none","tonic",{low:84,high:62}));
show("custom default",scaleNotes(C,"custom","major","scale","none","tonic",DEFAULT_SCALE_SPAN));
show("custom 62-84 (lowest)",scaleNotes(C,"custom","major","scale","none","lowest",{low:62,high:84}));
show("custom 67-79 arpeggio",scaleNotes(C,"custom","major","arpeggio","none","tonic",{low:67,high:79}));
