// Drone voice: the same voice Listen plays (ScoreViewer pianoTone): a sine with a faint 2nd overtone, a touch
// brighter for the first 90 ms, here simply held. Built in Web Audio, so it cannot waver.
// History: clarinet samples (harsh), oboe samples (wrong colour up in the flute's range), MuseScore flute renders
// with the vibrato flattened (the overtones still pulsed, heard as vibrato), a flute-overtone recipe (rejected).
// The old names (samples, ready, load) are kept so callers did not need to change; nothing is fetched.
// Oct 2026: the voice is now a choice in the tools panel (sine, organ, flute-like, cello-like); sine stays the default.

import {getToolSounds,type DroneSound} from "../lib/toolSounds";

/**
 * Strength of each overtone once the note is held, fundamental first. "sine" is the original drone (Listen's voice
 * settles at 0.12 x 0.3) and stays the default; the others are the tools panel's choices (lib/toolSounds.ts):
 * an organ's stacked stops, a flute-like tone (mostly fundamental, a little octave and twelfth) and a bowed string's
 * full row of overtones. All are built, not sampled, so none can waver.
 */
const OVERTONES:Record<DroneSound,number[]>={
  sine:[1,.036],
  organ:[1,.62,.34,.4,.06,.18,0,.14],
  flute:[1,.34,.13,.05,.02],
  cello:[1,.72,.52,.4,.3,.24,.18,.14,.11,.08,.06,.05],
};
export type DroneTimbre={wave:PeriodicWave};
const waves=new WeakMap<BaseAudioContext,Map<DroneSound,DroneTimbre>>();

function timbreFor(context:BaseAudioContext,sound:DroneSound="sine"){
  let map=waves.get(context);if(!map){map=new Map();waves.set(context,map)}
  let timbre=map.get(sound);
  if(!timbre){
    const strengths=OVERTONES[sound],real=new Float32Array(strengths.length+1),imag=new Float32Array(strengths.length+1);
    strengths.forEach((strength,index)=>{imag[index+1]=strength});
    timbre={wave:context.createPeriodicWave(real,imag)};map.set(sound,timbre);
  }
  return timbre;
}
export function loadDroneSamples(context:AudioContext){return Promise.resolve(timbreFor(context))}
/** Always ready: the tone is built, not loaded. */
export function droneSamplesIfReady(context:AudioContext):DroneTimbre|null{return timbreFor(context)}

/** A soft breath under the flute-like drone: looped noise, band-passed around the note. */
const breathBuffers=new WeakMap<BaseAudioContext,AudioBuffer>();
function breath(context:BaseAudioContext){
  let buffer=breathBuffers.get(context);
  if(!buffer){
    buffer=context.createBuffer(1,context.sampleRate*2,context.sampleRate);
    const data=buffer.getChannelData(0);let seed=12345;
    for(let i=0;i<data.length;i++){seed=(seed*1664525+1013904223)>>>0;data[i]=seed/2147483648-1}
    breathBuffers.set(context,buffer);
  }
  return buffer;
}

/**
 * Starts a steady drone note at `frequency`, fading in from `at`, in the voice chosen in the tools panel, with its
 * optional fifth above or octave below. Stop it with `gain` + `source.stop`: the extra parts stop with the source.
 * `_timbre` is kept for the callers that still pass one; the voice now comes from the studio's setting.
 */
export function droneVoice(context:AudioContext,_timbre:DroneTimbre,frequency:number,at:number,level:number,fadeIn=.12){
  const {drone,droneAdd}=getToolSounds();
  const source=context.createOscillator(),gain=context.createGain(),extras:AudioScheduledSourceNode[]=[];
  source.setPeriodicWave(timbreFor(context,drone).wave);source.frequency.value=frequency;
  // Each wave is normalised to the same peak, so the richer ones carry less energy; these bring them near the sine's
  // loudness (measured offline: sine RMS .20, then organ, flute and cello within about 30% of it).
  const trim=drone==="cello"?1.1:drone==="flute"?.9:1;
  if(drone==="sine"){
    // Listen's onset: the 2nd overtone starts at 0.12 and settles within 90 ms.
    const onset=context.createOscillator(),onsetGain=context.createGain();
    onset.frequency.value=frequency*2;onsetGain.gain.setValueAtTime(.12,at);onsetGain.gain.exponentialRampToValueAtTime(.001,at+.09);
    onset.connect(onsetGain).connect(gain);onset.start(at);onset.stop(at+.1);
  }
  const body=context.createGain();body.gain.value=trim;
  source.connect(body).connect(gain);
  if(drone==="flute"){
    const noise=context.createBufferSource(),band=context.createBiquadFilter(),air=context.createGain();
    noise.buffer=breath(context);noise.loop=true;
    band.type="bandpass";band.frequency.value=Math.min(8000,frequency*2);band.Q.value=1.4;air.gain.value=.022;
    noise.connect(band).connect(air).connect(gain);noise.start(at);extras.push(noise);
  }
  if(droneAdd!=="none"){
    // A pure fifth (3:2) rather than a tempered one, so the pair rings without beating.
    const second=context.createOscillator(),secondGain=context.createGain();
    second.setPeriodicWave(timbreFor(context,drone).wave);
    second.frequency.value=droneAdd==="fifth"?frequency*1.5:frequency/2;
    secondGain.gain.value=trim*(droneAdd==="fifth"?.55:.7);
    second.connect(secondGain).connect(gain);second.start(at);extras.push(second);
  }
  // About Listen's loudness (its master gain peaks near 0.3).
  const peak=level*.9;
  gain.gain.setValueAtTime(.0001,at);gain.gain.linearRampToValueAtTime(peak,at+fadeIn);
  gain.connect(context.destination);source.start(at);
  // Stopping the source stops the added note and the breath at the same moment, so callers keep their one stop().
  const stopSource=source.stop.bind(source);
  source.stop=(when?:number)=>{stopSource(when);extras.forEach(node=>{try{node.stop(when)}catch{/* never started */}})};
  source.onended=()=>{source.disconnect();gain.disconnect()};
  return {source,gain};
}
