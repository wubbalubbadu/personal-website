// Drone voice: the same voice Listen plays (ScoreViewer pianoTone): a sine with a faint 2nd overtone, a touch
// brighter for the first 90 ms, here simply held. Built in Web Audio, so it cannot waver.
// History: clarinet samples (harsh), oboe samples (wrong colour up in the flute's range), MuseScore flute renders
// with the vibrato flattened (the overtones still pulsed, heard as vibrato), a flute-overtone recipe (rejected).
// The old names (samples, ready, load) are kept so callers did not need to change; nothing is fetched.

/** Strength of each overtone once the note is held, fundamental first: Listen's voice settles at 0.12 x 0.3. */
const OVERTONES=[1,.036];
export type DroneTimbre={wave:PeriodicWave};
const waves=new WeakMap<BaseAudioContext,DroneTimbre>();

function timbreFor(context:BaseAudioContext){
  let timbre=waves.get(context);
  if(!timbre){
    const real=new Float32Array(OVERTONES.length+1),imag=new Float32Array(OVERTONES.length+1);
    OVERTONES.forEach((strength,index)=>{imag[index+1]=strength});
    timbre={wave:context.createPeriodicWave(real,imag)};waves.set(context,timbre);
  }
  return timbre;
}
export function loadDroneSamples(context:AudioContext){return Promise.resolve(timbreFor(context))}
/** Always ready: the tone is built, not loaded. */
export function droneSamplesIfReady(context:AudioContext):DroneTimbre|null{return timbreFor(context)}

/** Starts a steady drone note at `frequency`, fading in from `at`. Stop it with `gain` + `source.stop`. */
export function droneVoice(context:AudioContext,timbre:DroneTimbre,frequency:number,at:number,level:number,fadeIn=.12){
  const source=context.createOscillator(),gain=context.createGain();
  source.setPeriodicWave(timbre.wave);source.frequency.value=frequency;
  // Listen's onset: the 2nd overtone starts at 0.12 and settles within 90 ms.
  const onset=context.createOscillator(),onsetGain=context.createGain();
  onset.frequency.value=frequency*2;onsetGain.gain.setValueAtTime(.12,at);onsetGain.gain.exponentialRampToValueAtTime(.001,at+.09);
  onset.connect(onsetGain).connect(gain);onset.start(at);onset.stop(at+.1);
  // About Listen's loudness (its master gain peaks near 0.3).
  const peak=level*.9;
  gain.gain.setValueAtTime(.0001,at);gain.gain.linearRampToValueAtTime(peak,at+fadeIn);
  source.connect(gain).connect(context.destination);source.start(at);
  source.onended=()=>{source.disconnect();gain.disconnect()};
  return {source,gain};
}
