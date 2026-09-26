// A soft, sustained wind-like tone, rendered straight into samples so every note starts and
// ends at exact silence, independently of AudioParam scheduling.
// A bare sine sounds like a test beep; a few quiet overtones (weighted like a flute or recorder),
// a vibrato that eases in on longer notes, and a short breath at the onset make it sound played.
const PARTIALS=[1,.3,.12,.05,.02];

export function toneSamples(frequency:number,duration:number,sampleRate:number){
  const count=Math.ceil(duration*sampleRate),samples=new Float32Array(count);
  const attack=Math.min(.045,duration/3),release=Math.min(.12,duration/3);
  const nyquist=sampleRate/2,partials=PARTIALS.filter((_,k)=>(k+1)*frequency<nyquist*.9);
  let phase=0,noise=0,seed=Math.round(frequency*997)%2147483647||1;
  for(let i=0;i<count;i++){
    const time=i/sampleRate,remaining=(count-1-i)/sampleRate;
    const fadeIn=time<attack?.5-.5*Math.cos(Math.PI*time/attack):1;
    const fadeOut=remaining<release?.5-.5*Math.cos(Math.PI*remaining/release):1;
    // Settles from a slightly fuller onset to a steady level, like a player easing off the attack.
    const body=.82+.18*Math.exp(-time/.25);
    // Vibrato (5 Hz, about 6 cents) fades in after the first quarter second, so short notes stay steady.
    const vibratoDepth=.0035*Math.min(1,Math.max(0,(time-.25)/.4));
    phase+=2*Math.PI*frequency*(1+vibratoDepth*Math.sin(2*Math.PI*5*time))/sampleRate;
    let tone=0;
    for(let k=0;k<partials.length;k++)tone+=partials[k]*Math.sin((k+1)*phase);
    // Breath: low-passed noise that dies away within about 60 ms of the onset.
    seed=(seed*16807)%2147483647;
    noise+=.12*((seed/2147483647)*2-1-noise);
    const breath=.35*noise*Math.exp(-time/.06);
    samples[i]=.05*fadeIn*fadeOut*(body*tone+breath);
  }
  return samples;
}
