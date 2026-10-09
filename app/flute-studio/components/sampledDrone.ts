// Drone voice: sustained oboe notes rendered in MuseScore (see
// public/audio/oboe/README.md). The clarinet was tried first and sounded harsh. Each file is a 1 s attack followed by a
// body that loops seamlessly from 1 s to the end, so a drone can hold forever.
// Until the files have loaded, callers get null and fall back to their own tone.
export const droneSampleKeys=Array.from({length:10},(_,index)=>58+index*4);
/** How far each rendered sample sits from equal temperament (A=440), in cents; playback corrects for it. */
const tuning:Record<number,number>={58:-2.4,62:-2.1,66:.2,70:3.4,74:-2.2,78:-1.1,82:-3.4,86:-3.6,90:-3.4,94:-4};
const LOOP_START=1;
const loaded=new WeakMap<AudioContext,Map<number,AudioBuffer>>(),pending=new WeakMap<AudioContext,Promise<Map<number,AudioBuffer>>>();

export function loadDroneSamples(context:AudioContext){
  let promise=pending.get(context);
  if(!promise){
    promise=Promise.all(droneSampleKeys.map(async midi=>{const response=await fetch(`/audio/oboe/${midi}.wav`);if(!response.ok)throw new Error('Drone sample missing');return [midi,await context.decodeAudioData(await response.arrayBuffer())] as const}))
      .then(entries=>{const map=new Map(entries);loaded.set(context,map);return map});
    promise.catch(()=>pending.delete(context));
    pending.set(context,promise);
  }
  return promise;
}
/** The samples if they are ready; otherwise starts loading them and returns null. */
export function droneSamplesIfReady(context:AudioContext){const map=loaded.get(context);if(!map)void loadDroneSamples(context).catch(()=>{});return map??null}

/** Starts a looping oboe note at `frequency`, fading in from `at`. Stop it with `gain` + `source.stop`. */
export function droneVoice(context:AudioContext,samples:Map<number,AudioBuffer>,frequency:number,at:number,level:number,fadeIn=.12){
  const midi=69+12*Math.log2(frequency/440);
  const key=[...samples.keys()].reduce((best,k)=>Math.abs(k-midi)<Math.abs(best-midi)?k:best);
  const source=context.createBufferSource(),gain=context.createGain(),buffer=samples.get(key)!;
  source.buffer=buffer;source.playbackRate.value=2**((midi-key-(tuning[key]??0)/100)/12);
  source.loop=true;source.loopStart=LOOP_START;source.loopEnd=buffer.duration;
  gain.gain.setValueAtTime(.0001,at);gain.gain.linearRampToValueAtTime(level,at+fadeIn);
  source.connect(gain).connect(context.destination);source.start(at);
  source.onended=()=>{source.disconnect();gain.disconnect()};
  return {source,gain};
}
