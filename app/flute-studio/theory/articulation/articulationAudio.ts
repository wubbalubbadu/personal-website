export type ArticulationEvent={midi:number;beats:number;slurNext?:boolean;mark?:'staccato'|'accent'|'tenuto'};
/**
 * A continuous wind tone across slurs. Written starts stay fixed; staccato and tenuto change sounding length only
 * (a plain note sounds 85% of its value, tenuto all of it, staccato 45%). An accent starts harder (a 6 ms attack
 * instead of 25 ms), louder (about +5 dB, easing back over a quarter second) and brighter (extra upper partials
 * for its first 60 ms), so it stands out by ear, not just on paper.
 */
export function articulationSamples(events:ArticulationEvent[],unit:number,rate:number){
 const total=events.reduce((n,e)=>n+e.beats,0)*unit;
 const out=new Float32Array(Math.ceil(total*rate));
 let phase=0,at=0;
 events.forEach((e,index)=>{
   const length=e.beats*unit,accent=e.mark==='accent';
   const gate=e.mark==='staccato'?.45:e.mark==='tenuto'||e.slurNext?1:.85;
   const from=Math.round(at*rate),end=Math.min(out.length,Math.round((at+length)*rate));
   for(let i=from;i<end;i++){
     const t=(i-from)/rate,remaining=length*gate-t;
     if(remaining<=0)continue;
     const attack=index>0&&events[index-1].slurNext?1:Math.min(1,t/(accent?.006:.025));
     const release=e.slurNext?1:Math.min(1,remaining/.035);
     phase+=2*Math.PI*(440*2**((e.midi-69)/12))/rate;
     const emphasis=accent?1+.8*Math.exp(-t/.25):1,bright=accent?.35*Math.exp(-t/.06):0;
     out[i]=.05*attack*release*emphasis*(Math.sin(phase)+(.3+bright)*Math.sin(2*phase)+(.12+bright)*Math.sin(3*phase)+bright*.5*Math.sin(4*phase));
   }
   at+=length;
 });
 return out;
}
