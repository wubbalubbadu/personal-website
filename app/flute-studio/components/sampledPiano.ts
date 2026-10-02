import {midiForPitch} from '../../../content/fingerings/flute';
import {pianoSampleKeys} from './pianoSampleKeys';
const buffers=new WeakMap<AudioContext,Promise<Map<number,AudioBuffer>>>();
export function loadPiano(context:AudioContext){
 let pending=buffers.get(context);if(!pending){pending=Promise.all(pianoSampleKeys.map(async midi=>{const response=await fetch(`/audio/piano/${midi}.wav`);if(!response.ok)throw new Error('Piano sample unavailable');return [midi,await context.decodeAudioData(await response.arrayBuffer())] as const})).then(entries=>new Map(entries));buffers.set(context,pending);pending.catch(()=>buffers.delete(context))}return pending;
}
export function sampledPianoNote(context:AudioContext,samples:Map<number,AudioBuffer>,pitch:string,start:number,duration:number,level=.7){
 const midi=midiForPitch(pitch),key=[...samples.keys()].reduce((best,key)=>Math.abs(key-midi)<Math.abs(best-midi)?key:best),source=context.createBufferSource(),gain=context.createGain();
 source.buffer=samples.get(key)!;source.playbackRate.value=2**((midi-key)/12);const end=start+Math.max(.04,duration);
 gain.gain.setValueAtTime(Math.max(.001,level*1.2),start);gain.gain.setValueAtTime(Math.max(.001,level*1.2),Math.max(start,end-.08));gain.gain.exponentialRampToValueAtTime(.0001,end+.07);
 source.connect(gain).connect(context.destination);source.start(start);source.stop(end+.08);source.onended=()=>{source.disconnect();gain.disconnect()};return source;
}
