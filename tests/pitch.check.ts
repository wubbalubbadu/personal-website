import {detectPitch,midiFromHz,centsFromMidi} from "../app/flute-studio/lib/pitch";
const sr=48000,n=2048;
const tone=(hz:number,amp=0.2)=>{const b=new Float32Array(n);for(let i=0;i<n;i++)b[i]=amp*Math.sin(2*Math.PI*hz*i/sr)+0.2*amp*Math.sin(4*Math.PI*hz*i/sr);return b};
for(const hz of [440,523.25,880,1046.5,392]){
  const f=detectPitch(tone(hz),sr);
  if(!f){console.log(hz,"-> NO DETECTION");continue}
  const m=midiFromHz(f.hz);
  console.log(`${hz}Hz -> ${f.hz.toFixed(2)}Hz  midi ${m}  ${centsFromMidi(f.hz,m).toFixed(1)}c  clarity ${f.clarity.toFixed(2)}`);
}
console.log("silence ->",detectPitch(new Float32Array(n),sr));
console.log("quiet noise ->",detectPitch(tone(440,0.005),sr));
