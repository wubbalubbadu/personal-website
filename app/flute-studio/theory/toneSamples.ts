// A sample-defined envelope starts and ends at exact silence, independently of
// AudioParam scheduling. Soft attacks avoid a percussive onset on headphones.
export function toneSamples(frequency:number,duration:number,sampleRate:number){
  const count=Math.ceil(duration*sampleRate),samples=new Float32Array(count);
  const attack=Math.min(.075,duration/3),release=Math.min(.12,duration/3);
  for(let i=0;i<count;i++){
    const time=i/sampleRate,remaining=(count-1-i)/sampleRate;
    const fadeIn=time<attack?.5-.5*Math.cos(Math.PI*time/attack):1;
    const fadeOut=remaining<release?.5-.5*Math.cos(Math.PI*remaining/release):1;
    const phase=2*Math.PI*frequency*time;
    samples[i]=.065*fadeIn*fadeOut*(Math.sin(phase)+.035*Math.sin(2*phase));
  }
  return samples;
}
