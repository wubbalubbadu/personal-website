'use client';
import {lazy,Suspense,useEffect,useRef,useState} from 'react';
import Sequence from './Sequence';
import {breathAt,counts,cueBank,cueBankZh,patterns,type Settings} from './timing';
import './breathing-lab.css';
import {useLanguage} from '../i18n/LanguageContext';
const BodyView=lazy(()=>import('./BodyView'));
export default function BreathingLab(){
 const {lang}=useLanguage(),zh=lang==='zh';
 const [settings,setSettings]=useState<Settings>({pattern:'even',inhale:8,exhale:8,hold:0});
 const [bpm,setBpm]=useState(60),[playing,setPlaying]=useState(false),[beats,setBeats]=useState(0),[sound,setSound]=useState(true),[visual,setVisual]=useState('cycle'),[cueSeed,setCueSeed]=useState(0),[audioError,setAudioError]=useState(false);
 const audio=useRef<AudioContext|null>(null),nodes=useRef<OscillatorNode[]>([]),soundRef=useRef(sound);
 useEffect(()=>{soundRef.current=sound},[sound]);
 useEffect(()=>{
  if(!playing)return;
  let frame=0,nextBeat=0;const start=performance.now(),audioStart=audio.current?.currentTime??0;
  const tick=()=>{const elapsed=(performance.now()-start)/1000,current=elapsed*bpm/60;
   setBeats(current);
   while(nextBeat<=current+.12*bpm/60){
    const ctx=audio.current;
    if(soundRef.current&&ctx?.state==='running'){
     const at=Math.max(ctx.currentTime,audioStart+nextBeat*60/bpm),o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=nextBeat===0?880:660;g.gain.setValueAtTime(.055,at);g.gain.exponentialRampToValueAtTime(.0001,at+.045);o.connect(g).connect(ctx.destination);o.start(at);o.stop(at+.05);nodes.current.push(o);o.onended=()=>{o.disconnect();g.disconnect();nodes.current=nodes.current.filter(n=>n!==o)};
    }nextBeat++;
   }frame=requestAnimationFrame(tick);
  };tick();
  const hide=()=>{if(document.hidden)setPlaying(false)};document.addEventListener('visibilitychange',hide);
  return()=>{cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',hide);nodes.current.forEach(o=>{try{o.stop()}catch{/* The click may have already ended. */}});nodes.current=[]};
 },[playing,bpm]);
 useEffect(()=>()=>{void audio.current?.close()},[]);
 const stop=()=>{setPlaying(false);setBeats(0)};
 const update=(key:'inhale'|'exhale'|'hold',value:number)=>{stop();setSettings(s=>({...s,[key]:Math.max(key==='hold'?0:.5,Math.min(key==='hold'?4:20,value))}))};
 const start=async()=>{if(playing){stop();return}setAudioError(false);try{audio.current??=new AudioContext();await audio.current.resume()}catch{setAudioError(true)}setBeats(0);setCueSeed(Math.floor(Math.random()*10000));setPlaying(true)};
 const sample=breathAt(beats,settings),total=sample.inhale+sample.exhale+sample.hold;
 const phaseLabel=zh?{Inhale:"吸气",Hold:"停留",Exhale:"呼气"}[sample.phase]:sample.phase;
 const cueOptions=(zh?cueBankZh:cueBank)[sample.phase as keyof typeof cueBank],cue=cueOptions[Math.floor(Math.abs(Math.sin((sample.round*3+cueSeed+sample.phase.length)*12.9898))*10000)%cueOptions.length];
 const angle=sample.cycle*Math.PI*2,inhale=sample.phase==='Inhale';
 const ring=<svg viewBox="0 0 240 240" className="bl-ring" role="img" aria-label={`${phaseLabel}, ${zh?"拍数":"beat"} ${sample.beat} / ${sample.phase==='Inhale'?sample.inhale:sample.phase==='Hold'?sample.hold:sample.exhale}`}>
  <circle cx="120" cy="120" r="94" fill="none" stroke="#ca9295" strokeWidth="9"/>
  <circle cx="120" cy="120" r="94" fill="none" stroke="#87b4c8" strokeWidth="9" pathLength="100" strokeDasharray={`${sample.inhale/total*100} 100`} transform="rotate(-90 120 120)"/>
  {sample.hold>0&&<circle cx="120" cy="120" r="94" fill="none" stroke="#cab994" strokeWidth="9" pathLength="100" strokeDasharray={`${sample.hold/total*100} 100`} strokeDashoffset={-sample.inhale/total*100} transform="rotate(-90 120 120)"/>}
  <circle cx={120+94*Math.sin(angle)} cy={120-94*Math.cos(angle)} r="8" fill="#40553d" stroke="white" strokeWidth="3"/>
  <text x="120" y="108" textAnchor="middle" className="bl-phase">{phaseLabel}</text><text x="120" y="151" textAnchor="middle" className="bl-count">{playing?sample.beat:0}<tspan className="bl-total"> / {sample.phase==='Inhale'?sample.inhale:sample.phase==='Hold'?sample.hold:sample.exhale}</tspan></text>
 </svg>;
 return <main className="breathing-lab">
  <header className="bl-header"><h1>{lang==="zh"?"呼吸实验室":"Breathing Lab"}</h1></header>
  <div className="bl-workspace">
   <nav className="bl-exercises" aria-label={zh?"呼吸练习":"Breathing exercises"}>{patterns.map(p=><button key={p.id} aria-pressed={settings.pattern===p.id} onClick={()=>{stop();setSettings(s=>({...s,pattern:p.id}))}}><div><strong>{zh?p.nameZh:p.name}</strong><small>{(()=>{const first=counts({...settings,pattern:p.id},0),last=counts({...settings,pattern:p.id},7);return `${zh?"吸":"In"} ${first.inhale}${p.id!=='even'?` → ${last.inhale}`:''} · ${zh?"呼":"Out"} ${first.exhale}${p.id!=='even'?` → ${last.exhale}`:''}`})()}</small></div></button>)}</nav>
   <section className="bl-stage" aria-label={zh?"呼吸动画":"Breathing visualization"}>
    <div className="bl-scene">
     {(visual==='body'||visual==='embouchure')?<Suspense fallback={<div className="bl-loading">{zh?"正在加载模型…":"Loading model…"}</div>}><BodyView key={visual} mode={visual} fullness={sample.fullness} inhale={inhale} time={beats*60/bpm} running={playing} hold={sample.phase==='Hold'}/></Suspense>:visual==='cycle'?<div className="bl-large-ring">{ring}</div>:<svg className="bl-illustration" viewBox="0 0 480 460" role="img" aria-label={zh?(inhale?'花朵随吸气展开':'三个球随水平气流移动'):(inhale?'Flower opening as you inhale':'Three balls moving in a horizontal left-to-right airstream')}>
      {inhale?<g><path d="M240 365 Q220 300 240 230" fill="none" stroke="#759365" strokeWidth="9" strokeLinecap="round"/><path d="M233 320 Q140 300 172 266 Q231 269 233 320" fill="#a7bd99"/><g transform={`translate(240 200) scale(${.65+.35*sample.fullness})`}>{Array.from({length:8},(_,i)=><ellipse key={i} cx="0" cy="-57" rx="32" ry="68" fill={i%2?'#e7c8cc':'#efd9d6'} transform={`rotate(${i*45})`}/>)}<circle r="36" fill="#d5b876"/><circle r="22" fill="#e5cf96"/></g><path d="M180 398 Q220 370 200 340 M265 403 Q300 372 279 335" fill="none" stroke="#87b4c8" strokeWidth="5" strokeDasharray="8 14" strokeDashoffset={-sample.progress*90} opacity=".65"/></g>:<g><rect x="48" y="160" width="390" height="132" rx="20" fill="#e6eff0" stroke="#a5b9be" strokeWidth="3"/>{[186,226,266].map(y=><path key={y} d={`M25 ${y} H460`} stroke="#87b4c8" strokeWidth="4" strokeDasharray="14 16" strokeDashoffset={playing?-beats*35:0} opacity=".65"/>)}{[130,245,360].map((x,i)=><g key={x} transform={`translate(${x+(playing?Math.sin(beats*3+i*1.8)*9:0)} ${226+(playing?Math.sin(beats*4+i*2)*13:0)})`}><circle r="31" fill="#f7f2e7" stroke="#d6cbb5" strokeWidth="2"/><path d="M-18 -10 Q-11 -22 3 -21" stroke="white" strokeWidth="5" fill="none" strokeLinecap="round"/></g>)}<path d="M441 215 l14 11 -14 11" fill="none" stroke="#87b4c8" strokeWidth="4"/></g>}
     </svg>}
    </div>
    <p className="bl-cue" key={sample.phase}>{cue}</p>
    <div className="bl-visuals" role="group" aria-label={zh?"动画":"Visual"}>{[['cycle','◯',zh?'呼吸环':'Cycle'],['flower','✿',zh?'花朵与气流球':'Flower & balls'],['body','♧',zh?'身体':'Body'],['embouchure','≈',zh?'口型':'Embouchure']].map(([id,icon,label])=><button key={id} aria-pressed={visual===id} onClick={()=>setVisual(id)}><span aria-hidden="true">{icon}</span>{label}</button>)}</div>
   </section>
   {/* One compact panel: the three counts, then tempo, sound and Start.
       The ring already shows the phase and beat, so nothing here repeats
       it; the round-by-round list only appears for the patterns whose
       counts change from round to round. */}
   <aside className="bl-controls">
    {settings.pattern!=='even'&&<Sequence settings={settings} beats={beats} playing={playing}/>}
    <div className="bl-counts">{(['inhale','hold','exhale'] as const).map(key=><div className="bl-count-step" key={key}>
     <span>{zh?{inhale:'吸',hold:'停',exhale:'呼'}[key]:{inhale:'In',hold:'Hold',exhale:'Out'}[key]}</span>
     <div className="bl-stepper"><button type="button" aria-label={zh?`${{inhale:"吸气",hold:"停留",exhale:"呼气"}[key]}减少拍数`:`${key} fewer beats`} onClick={()=>update(key,settings[key]-1)}>−</button><b>{settings[key]}</b><button type="button" aria-label={zh?`${{inhale:"吸气",hold:"停留",exhale:"呼气"}[key]}增加拍数`:`${key} more beats`} onClick={()=>update(key,settings[key]+1)}>+</button></div>
    </div>)}</div>
    <div className="bl-play-row">
     <div className="bl-stepper bl-tempo"><button type="button" aria-label={zh?"减慢":"Slower"} onClick={()=>{stop();setBpm(b=>Math.max(40,b-2))}}>−</button><b>{bpm}<small> bpm</small></b><button type="button" aria-label={zh?"加快":"Faster"} onClick={()=>{stop();setBpm(b=>Math.min(120,b+2))}}>+</button></div>
     <button type="button" className="bl-sound" aria-pressed={sound} aria-label={zh?(sound?'关闭节拍声':'开启节拍声'):(sound?'Mute the beat':'Play the beat')} onClick={()=>setSound(!sound)}>
      <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 8h3l4-3.5v11L6 12H3z"/>{sound?<path d="M13 7.5a3.5 3.5 0 0 1 0 5M15 5.5a6 6 0 0 1 0 9"/>:<path d="M13 8l4 4M17 8l-4 4"/>}</svg>
     </button>
     <button type="button" className="bl-start" onClick={()=>void start()}>{playing?(zh?'停止':'Stop'):(zh?'开始':'Start')}</button>
    </div>
    {audioError&&<small role="status">{zh?"声音不可用，呼吸动画仍可使用。":"Sound unavailable. The visual timer still works."}</small>}
   </aside>
  </div>
 </main>;
}
