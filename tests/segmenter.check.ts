import {NoteSegmenter, summarise, LOST_TONE_MS} from "../app/flute-studio/lib/noteSegmenter";
import {hzFromMidi} from "../app/flute-studio/lib/pitch";

const STEP=42;
function feed(seg:NoteSegmenter,at:number,midi:number|null,cents=0,rms=0.05){
  if(midi===null){seg.push(null,at);return}
  seg.push({hz:hzFromMidi(midi)*2**(cents/1200),rms,clarity:.99,at},at);
}

// 1. A long tone that sags 30 cents as the air runs out, held 8 seconds.
const a=new NoteSegmenter();
let t=0;
const frames=Math.round(8000/STEP);
for(let i=0;i<frames;i++,t+=STEP) feed(a,t,72,-30*(i/frames));
const noteA=a.result()[0];
const sumA=summarise(noteA);
console.log("sagging C5 :",
  `${(sumA.durationMs/1000).toFixed(1)}s`,
  `drift ${sumA.driftCents.toFixed(0)}c`,
  `spread ${(sumA.maxCents-sumA.minCents).toFixed(0)}c`,
  `mean ${sumA.meanCents.toFixed(0)}c`);

// 2. A brief breath mid-note must NOT end the note.
const b=new NoteSegmenter();
t=0;
for(let i=0;i<20;i++,t+=STEP) feed(b,t,72);
for(let i=0;i<10;i++,t+=STEP) feed(b,t,null);      // ~420ms below the gate
for(let i=0;i<20;i++,t+=STEP) feed(b,t,72);
console.log("brief dip  :", b.result().length, "note(s) — expected 1");

// 3. Silence past LOST_TONE_MS ends it.
const c=new NoteSegmenter();
t=0;
for(let i=0;i<20;i++,t+=STEP) feed(c,t,72);
const lastHeard=t-STEP;
for(let i=0;i<Math.ceil(LOST_TONE_MS/STEP)+3;i++,t+=STEP) feed(c,t,null);
const closed=c.result();
console.log("long gap   :", closed.length, "note(s), ended at", closed[0].endedAt, "= last heard", lastHeard);

// 4. Changing pitch opens a new note (the long-tone case: step up a semitone).
const d=new NoteSegmenter();
t=0;
for(let i=0;i<30;i++,t+=STEP) feed(d,t,72);
for(let i=0;i<30;i++,t+=STEP) feed(d,t,73);
console.log("C5 then C#5:", d.result().map(n=>n.midi).join(" -> "), "— expected 72 -> 73");

// 5. A steady note reads as steady.
const e=new NoteSegmenter();
t=0;
for(let i=0;i<120;i++,t+=STEP) feed(e,t,83,Math.sin(i/6)*3); // gentle 3-cent vibrato
const sumE=summarise(e.result()[0]);
console.log("steady B5  :",
  `spread ${(sumE.maxCents-sumE.minCents).toFixed(0)}c`,
  `drift ${sumE.driftCents.toFixed(0)}c`, "— expected small");
