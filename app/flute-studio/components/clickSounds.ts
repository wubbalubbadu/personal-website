// The metronome's sounds, chosen in the tools panel (lib/toolSounds.ts): beep (the original click), woodblock,
// soft tick, and recorded spoken counts. Each is rendered once into an
// AudioBuffer per context, so a booked click is a single source node: the schedulers in PracticeAudio cancel a
// click with one stop(), whatever the sound is made of.
import {getToolSounds,type AccentSound,type ClickSound} from "../lib/toolSounds";

export type ClickKind="normal"|"accent"|"tick";

const cache=new WeakMap<BaseAudioContext,Map<string,AudioBuffer>>();

/** Exponential fall from `peak` to silence (0.0001) over `length` seconds, like the original ramp. */
const fall=(t:number,peak:number,length:number)=>t>=length?0:peak*Math.pow(1e-4/peak,t/length);
const TAU=Math.PI*2;

/** Seeded noise, so every rendering of a sound is identical. */
function noise(seed:number){let a=seed>>>0;return()=>{a=(a*1664525+1013904223)>>>0;return a/2147483648-1}}

function render(audio:BaseAudioContext,seconds:number,fill:(t:number,i:number)=>number){
  const rate=audio.sampleRate,length=Math.ceil(seconds*rate),buffer=audio.createBuffer(1,length,rate),data=buffer.getChannelData(0);
  for(let i=0;i<length;i++)data[i]=fill(i/rate,i);
  return buffer;
}

// ---- sounds. Levels match the original beep (accent .55, normal .38, tick .16) so switching keeps the balance.

function beep(audio:BaseAudioContext,kind:ClickKind,high:boolean){
  if(kind==="tick")return render(audio,.035,t=>Math.sin(TAU*800*t)*fall(t,.16,.03));
  const f=high?1500:1100,peak=kind==="accent"?.55:.38;
  return render(audio,.055,t=>Math.sin(TAU*f*t)*fall(t,peak,.05));
}

function woodblock(audio:BaseAudioContext,kind:ClickKind,high:boolean){
  const f=kind==="tick"?1500:high?1250:950,peak=kind==="tick"?.2:kind==="accent"?.6:.45,n=noise(7);
  // Its parts add up past `peak`; .6 brings the loudest moment back in line with the beep.
  return render(audio,.06,t=>.6*(Math.sin(TAU*f*t)*fall(t,peak,.045)+.35*Math.sin(TAU*f*2.31*t)*fall(t,peak*.6,.02)+(t<.002?n()*peak*.5:0)));
}

function softTick(audio:BaseAudioContext,kind:ClickKind,high:boolean){
  const n=noise(11),peak=kind==="tick"?.14:kind==="accent"?.5:.36,f=high?3800:2900;let last=0;
  return render(audio,.03,t=>{const x=n();const crisp=x-last;last=x;return (crisp*.5+.4*Math.sin(TAU*f*t))*fall(t,peak,.018)});
}

function bell(audio:BaseAudioContext){
  const partials:[number,number,number][]=[[1,1,.26],[2.76,.55,.16],[5.4,.3,.09],[8.93,.16,.05]];
  return render(audio,.3,t=>partials.reduce((sum,[ratio,amp,length])=>sum+amp*Math.sin(TAU*1320*ratio*t)*fall(t,.3,length),0));
}

// Share the clear spoken counts used by rhythm practice. Decode before scheduling, never speak on a timer.
const countWords=["one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve"];
const voices=new WeakMap<BaseAudioContext,AudioBuffer[]>();
const loading=new WeakMap<BaseAudioContext,Promise<boolean>>();
export function prepareClickSounds(audio:BaseAudioContext):Promise<boolean>{
  if(getToolSounds().click!=="voice"||voices.has(audio))return Promise.resolve(false);
  const pending=loading.get(audio);if(pending)return pending;
  const promise=Promise.all(countWords.map(async word=>{
    const response=await fetch(`/audio/counts/${word}.wav`);
    if(!response.ok)throw new Error("Count unavailable");
    return audio.decodeAudioData(await response.arrayBuffer());
  })).then(buffers=>{voices.set(audio,buffers);cache.delete(audio);return true}).catch(()=>false).finally(()=>loading.delete(audio));
  loading.set(audio,promise);return promise;
}
function voice(audio:BaseAudioContext,kind:ClickKind,accent:AccentSound,count:number){
  if(kind==="tick")return softTick(audio,kind,false);
  const spoken=voices.get(audio)?.[Math.max(0,Math.min(11,count-1))];
  if(!spoken)return beep(audio,kind,kind==="accent");
  const data=spoken.getChannelData(0),chime=kind==="accent"&&accent==="bell"?bell(audio):null;
  const bellData=chime?.getChannelData(0);
  return render(audio,Math.max(spoken.duration,chime?.duration??0),(t,i)=>
    (data[Math.floor(t*spoken.sampleRate)]??0)*(kind==="accent"?.55:.4)+(bellData?.[i]??0)*.5);
}

function sound(audio:BaseAudioContext,click:ClickSound,accent:AccentSound,kind:ClickKind,count:number){
  if(click==="voice")return voice(audio,kind,accent,count);
  if(kind==="accent"&&accent==="bell")return bell(audio);
  // "Higher" plays the accent's own (higher) version; "louder" keeps the normal one and only turns it up.
  const high=kind==="accent"&&accent==="higher";
  const asKind:ClickKind=kind==="accent"&&accent==="louder"?"normal":kind;
  switch(click){
    case "woodblock":return woodblock(audio,asKind,high);
    case "tick":return softTick(audio,asKind,high);
    default:return beep(audio,asKind,high);
  }
}

/**
 * Books one metronome sound at `time` with the studio's current choice. `count` is the beat's number in the bar
 * (1 based) for the counting voice; 0 when unknown. Returns the source, to stop it if the click is cancelled.
 */
export function bookSound(audio:BaseAudioContext,time:number,kind:ClickKind,count=0,beatSeconds?:number){
  const {click,accent,clickVolume,accentVolume}=getToolSounds();
  const key=`${click}|${accent}|${kind}|${click==="voice"?count:0}`;
  let buffers=cache.get(audio);if(!buffers){buffers=new Map();cache.set(audio,buffers)}
  let buffer=buffers.get(key);if(!buffer){buffer=sound(audio,click,accent,kind,count);buffers.set(key,buffer)}
  const source=audio.createBufferSource(),gain=audio.createGain();
  source.buffer=buffer;
  if(click==="voice"&&kind!=="tick"&&voices.has(audio)){
    source.playbackRate.value=Math.max(kind==="accent"&&accent==="higher"?1.08:1,beatSeconds?buffer.duration/(beatSeconds*.9):1);
  }
  // The defaults (0.8) play exactly at the levels above; full volume is a quarter louder.
  gain.gain.value=(kind==="accent"?accentVolume:clickVolume)/.8;
  source.connect(gain).connect(audio.destination);
  source.onended=()=>{source.disconnect();gain.disconnect()};
  source.start(time);
  return source;
}
