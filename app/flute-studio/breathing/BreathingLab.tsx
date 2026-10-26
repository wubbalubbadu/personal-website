'use client';
import {TempoPill} from "../components/TempoPill";
import {PracticeIcon} from "../components/PracticeIcon";
import {Stepper} from "../components/Stepper";
import {lazy,Suspense,useEffect,useRef,useState,useSyncExternalStore} from 'react';
import Sequence from './Sequence';
import {breathAt,counts,cueBank,cueBankZh,nextPhase,patterns,ROUNDS,sequenceBeats,type Settings} from './timing';
import './breathing-lab.css';
import {useLanguage} from '../i18n/LanguageContext';
const BodyView=lazy(()=>import('./BodyView'));

type Visual='cycle'|'flower'|'body'|'embouchure';
type Phase='Inhale'|'Hold'|'Exhale';
const visuals:[Visual,string,string][]=[['cycle','Cycle','呼吸环'],['flower','Flower','花朵'],['body','Body','身体'],['embouchure','Embouchure','口型']];

// Gentle cues: a soft tone where each phase begins (higher for in, lower for out) and a quiet tick on the other beats.
const phaseTone:Record<Phase,number>={Inhale:659.25,Hold:554.37,Exhale:440};
function tone(ctx:AudioContext,at:number,frequency:number,gain:number,length:number,live:OscillatorNode[]){
 const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=frequency;
 g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(gain,at+.012);g.gain.exponentialRampToValueAtTime(.0001,at+length);
 o.connect(g).connect(ctx.destination);o.start(at);o.stop(at+length+.02);live.push(o);
 o.onended=()=>{o.disconnect();g.disconnect();const i=live.indexOf(o);if(i>=0)live.splice(i,1)};
}

const motionQuery='(prefers-reduced-motion: reduce)';
const subscribeMotion=(change:()=>void)=>{const m=matchMedia(motionQuery);m.addEventListener('change',change);return()=>m.removeEventListener('change',change)};
function useReducedMotion(){return useSyncExternalStore(subscribeMotion,()=>matchMedia(motionQuery).matches,()=>false)}

export default function BreathingLab(){
 const {lang}=useLanguage(),zh=lang==='zh';
 const [settings,setSettings]=useState<Settings>({pattern:'even',inhale:8,exhale:8,hold:0});
 const [bpm,setBpm]=useState(60),[playing,setPlaying]=useState(false),[beats,setBeats]=useState(0),[sound,setSound]=useState(true),[visual,setVisual]=useState<Visual>('cycle'),[cueSeed,setCueSeed]=useState(0),[audioError,setAudioError]=useState(false),[done,setDone]=useState(false);
 const audio=useRef<AudioContext|null>(null),nodes=useRef<OscillatorNode[]>([]),soundRef=useRef(sound);
 const reduced=useReducedMotion();
 useEffect(()=>{soundRef.current=sound},[sound]);
 useEffect(()=>{
  if(!playing)return;
  const end=sequenceBeats(settings),beat=60/bpm,lookahead=.12/beat;
  let frame=0,nextTick=0,nextCue=0;const start=performance.now(),audioStart=audio.current?.currentTime??0;
  const tick=()=>{const current=(performance.now()-start)/1000/beat;
   // A changing pattern ends after its eighth round instead of jumping back to the first.
   if(current>=end){setPlaying(false);setBeats(0);setDone(true);return}
   setBeats(current);
   const ctx=audio.current,on=soundRef.current&&ctx?.state==='running';
   while(nextCue<=current+lookahead&&nextCue<end){
    const phase=breathAt(nextCue+1e-6,settings).phase as Phase;
    if(on)tone(ctx!,Math.max(ctx!.currentTime,audioStart+nextCue*beat),phaseTone[phase],.09,.6,nodes.current);
    nextCue=nextPhase(nextCue+1e-6,settings).at;
   }
   while(nextTick<=current+lookahead&&nextTick<end){
    // No tick on a beat that already has its phase tone.
    const s=breathAt(nextTick,settings),intoPhase=s.progress*(s.phase==='Inhale'?s.inhale:s.phase==='Hold'?s.hold:s.exhale);
    if(on&&intoPhase>.05)tone(ctx!,Math.max(ctx!.currentTime,audioStart+nextTick*beat),1046.5,.035,.06,nodes.current);
    nextTick++;
   }
   frame=requestAnimationFrame(tick);
  };tick();
  const hide=()=>{if(document.hidden)setPlaying(false)};document.addEventListener('visibilitychange',hide);
  // Keep the phone screen awake while the exercise runs.
  let lock:WakeLockSentinel|null=null,released=false;
  navigator.wakeLock?.request('screen').then(l=>{if(released)void l.release();else lock=l}).catch(()=>{/* Not allowed here; the exercise still runs. */});
  return()=>{released=true;void lock?.release();cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',hide);nodes.current.forEach(o=>{try{o.stop()}catch{/* The tone may have already ended. */}});nodes.current=[]};
 },[playing,bpm,settings]);
 useEffect(()=>()=>{void audio.current?.close()},[]);
 const stop=()=>{setPlaying(false);setBeats(0);setDone(false)};
 const update=(key:'inhale'|'exhale'|'hold',value:number)=>{stop();setSettings(s=>({...s,[key]:Math.max(key==='hold'?0:.5,Math.min(key==='hold'?4:20,value))}))};
 const start=async()=>{if(playing){stop();return}setAudioError(false);setDone(false);try{audio.current??=new AudioContext();await audio.current.resume()}catch{setAudioError(true)}setBeats(0);setCueSeed(Math.floor(Math.random()*10000));setPlaying(true)};
 const sample=breathAt(beats,settings),total=sample.inhale+sample.exhale+sample.hold;
 const phaseLabel=zh?{Inhale:"吸气",Hold:"停留",Exhale:"呼气"}[sample.phase]:sample.phase;
 const cueOptions=(zh?cueBankZh:cueBank)[sample.phase as keyof typeof cueBank],cue=cueOptions[Math.floor(Math.abs(Math.sin((sample.round*3+cueSeed+sample.phase.length)*12.9898))*10000)%cueOptions.length];
 const angle=sample.cycle*Math.PI*2,inhale=sample.phase==='Inhale',moving=playing&&!reduced;
 const phaseCount=sample.phase==='Inhale'?sample.inhale:sample.phase==='Hold'?sample.hold:sample.exhale;
 const changing=settings.pattern!=='even';
 const message=done?(zh?`${ROUNDS}轮完成。`:`${ROUNDS} rounds done.`):!playing?(zh?'按开始，跟着圆环呼吸。':'Press Start and breathe with the ring.'):cue;
 const ring=<svg viewBox="0 0 240 240" className="bl-ring" role="img" aria-label={`${phaseLabel}, ${zh?"拍数":"beat"} ${sample.beat} / ${phaseCount}`}>
  <circle cx="120" cy="120" r="94" fill="none" stroke="#ca9295" strokeWidth="9"/>
  <circle cx="120" cy="120" r="94" fill="none" stroke="#87b4c8" strokeWidth="9" pathLength="100" strokeDasharray={`${sample.inhale/total*100} 100`} transform="rotate(-90 120 120)"/>
  {sample.hold>0&&<circle cx="120" cy="120" r="94" fill="none" stroke="#cab994" strokeWidth="9" pathLength="100" strokeDasharray={`${sample.hold/total*100} 100`} strokeDashoffset={-sample.inhale/total*100} transform="rotate(-90 120 120)"/>}
  <circle cx={120+94*Math.sin(angle)} cy={120-94*Math.cos(angle)} r="8" fill="#79588e" stroke="white" strokeWidth="3"/>
  <text x="120" y="108" textAnchor="middle" className="bl-phase">{phaseLabel}</text><text x="120" y="151" textAnchor="middle" className="bl-count">{playing?sample.beat:0}<tspan className="bl-total"> / {phaseCount}</tspan></text>
 </svg>;
 return <main className="breathing-lab">
  <header className="bl-header"><h1>{zh?"呼吸实验室":"Breathing Lab"}</h1></header>
  <div className="bl-workspace">
   <nav className="bl-exercises" aria-label={zh?"呼吸练习":"Breathing exercises"}>{patterns.map(p=><button key={p.id} aria-pressed={settings.pattern===p.id} onClick={()=>{stop();setSettings(s=>({...s,pattern:p.id}))}}><strong>{zh?p.nameZh:p.name}</strong><small>{(()=>{const first=counts({...settings,pattern:p.id},0),last=counts({...settings,pattern:p.id},ROUNDS-1);return `${zh?"吸":"In"} ${first.inhale}${p.id!=='even'?` → ${last.inhale}`:''} · ${zh?"呼":"Out"} ${first.exhale}${p.id!=='even'?` → ${last.exhale}`:''}`})()}</small></button>)}</nav>
   <div className="bl-stage-column">
    <section className="bl-stage" aria-label={zh?"呼吸动画":"Breathing visualization"}>
     <div className="bl-scene">
      {(visual==='body'||visual==='embouchure')?<Suspense fallback={<div className="bl-loading">{zh?"正在加载模型…":"Loading model…"}</div>}><BodyView key={visual} mode={visual} fullness={sample.fullness} inhale={inhale} time={beats*60/bpm} running={playing} hold={sample.phase==='Hold'}/></Suspense>:visual==='cycle'?<div className="bl-large-ring">{ring}</div>:<svg className="bl-illustration" viewBox="0 0 480 460" role="img" aria-label={zh?(inhale?'花朵随吸气展开':'三个球随水平气流移动'):(inhale?'Flower opening as you inhale':'Three balls moving in a horizontal left-to-right airstream')}>
       {inhale?<g><path d="M240 365 Q220 300 240 230" fill="none" stroke="#759365" strokeWidth="9" strokeLinecap="round"/><path d="M233 320 Q140 300 172 266 Q231 269 233 320" fill="#a7bd99"/><g transform={`translate(240 200) scale(${.65+.35*sample.fullness})`}>{Array.from({length:8},(_,i)=><ellipse key={i} cx="0" cy="-57" rx="32" ry="68" fill={i%2?'#e7c8cc':'#efd9d6'} transform={`rotate(${i*45})`}/>)}<circle r="36" fill="#d5b876"/><circle r="22" fill="#e5cf96"/></g><path d="M180 398 Q220 370 200 340 M265 403 Q300 372 279 335" fill="none" stroke="#87b4c8" strokeWidth="5" strokeDasharray="8 14" strokeDashoffset={moving?-sample.progress*90:0} opacity=".65"/></g>:<g><rect x="48" y="160" width="390" height="132" rx="20" fill="#e6eff0" stroke="#a5b9be" strokeWidth="3"/>{[186,226,266].map(y=><path key={y} d={`M25 ${y} H460`} stroke="#87b4c8" strokeWidth="4" strokeDasharray="14 16" strokeDashoffset={moving?-beats*35:0} opacity=".65"/>)}{[130,245,360].map((x,i)=><g key={x} transform={`translate(${x+(moving?Math.sin(beats*3+i*1.8)*9:0)} ${226+(moving?Math.sin(beats*4+i*2)*13:0)})`}><circle r="31" fill="#f7f2e7" stroke="#d6cbb5" strokeWidth="2"/><path d="M-18 -10 Q-11 -22 3 -21" stroke="white" strokeWidth="5" fill="none" strokeLinecap="round"/></g>)}<path d="M441 215 l14 11 -14 11" fill="none" stroke="#87b4c8" strokeWidth="4"/></g>}
      </svg>}
     </div>
     <p className="bl-cue" key={done?'done':playing?sample.phase:'idle'} aria-live="polite">{message}</p>
    </section>
    {/* What the stage shows: the studio's view switch, words only. */}
    <div className="view-switch bl-visuals" role="group" aria-label={zh?"动画":"Visual"}>{visuals.map(([id,en,zhLabel])=><button key={id} type="button" aria-pressed={visual===id} onClick={()=>setVisual(id)}>{zh?zhLabel:en}</button>)}</div>
   </div>
   {/* One compact panel: the eight rounds (changing patterns only), the three counts, then tempo and Start. */}
   <aside className="bl-controls">
    {changing&&<Sequence settings={settings} beats={beats} playing={playing}/>}
    <div className="bl-counts">{(['inhale','hold','exhale'] as const).map(key=><div className="bl-count-step" key={key}>
     <span>{zh?{inhale:'吸',hold:'停',exhale:'呼'}[key]:{inhale:'In',hold:'Hold',exhale:'Out'}[key]}</span>
     <Stepper className="bl-stepper" value={settings[key]} min={key==='hold'?0:.5} max={key==='hold'?4:20} onStep={d=>update(key,settings[key]+d)}
      label={zh?`${{inhale:"吸气",hold:"停留",exhale:"呼气"}[key]}拍数`:`${{inhale:'Inhale',hold:'Hold',exhale:'Exhale'}[key]} beats`}
      decreaseLabel={zh?`${{inhale:"吸气",hold:"停留",exhale:"呼气"}[key]}减少拍数`:`${key} fewer beats`} increaseLabel={zh?`${{inhale:"吸气",hold:"停留",exhale:"呼气"}[key]}增加拍数`:`${key} more beats`}/>
    </div>)}</div>
    <div className="bl-play-row">
     {/* The studio's tempo pill: its metronome button turns the sound cues on or off, the number is the beat in bpm. */}
     <TempoPill size="large" label={zh?"呼吸速度":"Breathing tempo"} tempo={bpm} sounding={sound} onSound={()=>setSound(!sound)}
       onChange={value=>{stop();setBpm(Math.max(40,Math.min(120,value)))}}/>
     <button type="button" className="bl-start" aria-pressed={playing} onClick={()=>void start()}><PracticeIcon name={playing?'stop':'play'}/>{playing?(zh?'停止':'Stop'):(zh?'开始':'Start')}</button>
    </div>
    {audioError&&<small className="bl-note" role="status">{zh?"声音不可用，呼吸动画仍可使用。":"Sound unavailable. The visual timer still works."}</small>}
   </aside>
  </div>
 </main>;
}
