'use client';
import {lazy,Suspense,useEffect,useRef,useState} from 'react';
import Sequence from './Sequence';
import {breathAt,counts,cueBank,patterns,type Settings} from './timing';
import './breathing-lab.css';
const BodyView=lazy(()=>import('./BodyView'));
export default function BreathingLab(){
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
 const sample=breathAt(beats,settings),pattern=patterns.find(p=>p.id===settings.pattern)!,total=sample.inhale+sample.exhale+sample.hold;
 const cueOptions=cueBank[sample.phase as keyof typeof cueBank],cue=cueOptions[Math.floor(Math.abs(Math.sin((sample.round*3+cueSeed+sample.phase.length)*12.9898))*10000)%cueOptions.length];
 const angle=sample.cycle*Math.PI*2,inhale=sample.phase==='Inhale';
 const ring=<svg viewBox="0 0 240 240" className="bl-ring" role="img" aria-label={`${sample.phase}, beat ${sample.beat} of ${sample.phase==='Inhale'?sample.inhale:sample.phase==='Hold'?sample.hold:sample.exhale}`}>
  <circle cx="120" cy="120" r="94" fill="none" stroke="#ca9295" strokeWidth="9"/>
  <circle cx="120" cy="120" r="94" fill="none" stroke="#87b4c8" strokeWidth="9" pathLength="100" strokeDasharray={`${sample.inhale/total*100} 100`} transform="rotate(-90 120 120)"/>
  {sample.hold>0&&<circle cx="120" cy="120" r="94" fill="none" stroke="#cab994" strokeWidth="9" pathLength="100" strokeDasharray={`${sample.hold/total*100} 100`} strokeDashoffset={-sample.inhale/total*100} transform="rotate(-90 120 120)"/>}
  <circle cx={120+94*Math.sin(angle)} cy={120-94*Math.cos(angle)} r="8" fill="#40553d" stroke="white" strokeWidth="3"/>
  <text x="120" y="108" textAnchor="middle" className="bl-phase">{sample.phase}</text><text x="120" y="151" textAnchor="middle" className="bl-count">{playing?sample.beat:0}<tspan className="bl-total"> / {sample.phase==='Inhale'?sample.inhale:sample.phase==='Hold'?sample.hold:sample.exhale}</tspan></text>
 </svg>;
 return <main className="breathing-lab">
  <header className="bl-header"><h1>Breathing Lab</h1></header>
  <div className="bl-workspace">
   <nav className="bl-exercises" aria-label="Breathing exercises">{patterns.map(p=><button key={p.id} aria-pressed={settings.pattern===p.id} onClick={()=>{stop();setSettings(s=>({...s,pattern:p.id}))}}><div><strong>{p.name}</strong><small>{(()=>{const first=counts({...settings,pattern:p.id},0),last=counts({...settings,pattern:p.id},7);return `In ${first.inhale}${p.id!=='even'?` → ${last.inhale}`:''} · Out ${first.exhale}${p.id!=='even'?` → ${last.exhale}`:''}`})()}</small></div></button>)}</nav>
   <section className="bl-stage" aria-label="Breathing visualization">
    <div className="bl-scene">
     {(visual==='body'||visual==='embouchure')?<Suspense fallback={<div className="bl-loading">Loading model…</div>}><BodyView key={visual} mode={visual} fullness={sample.fullness} inhale={inhale} time={beats*60/bpm} running={playing} hold={sample.phase==='Hold'}/></Suspense>:visual==='cycle'?<div className="bl-large-ring">{ring}</div>:<svg className="bl-illustration" viewBox="0 0 480 460" role="img" aria-label={inhale?'Flower opening as you inhale':'Three balls moving in a horizontal left-to-right airstream'}>
      {inhale?<g><path d="M240 365 Q220 300 240 230" fill="none" stroke="#759365" strokeWidth="9" strokeLinecap="round"/><path d="M233 320 Q140 300 172 266 Q231 269 233 320" fill="#a7bd99"/><g transform={`translate(240 200) scale(${.65+.35*sample.fullness})`}>{Array.from({length:8},(_,i)=><ellipse key={i} cx="0" cy="-57" rx="32" ry="68" fill={i%2?'#e7c8cc':'#efd9d6'} transform={`rotate(${i*45})`}/>)}<circle r="36" fill="#d5b876"/><circle r="22" fill="#e5cf96"/></g><path d="M180 398 Q220 370 200 340 M265 403 Q300 372 279 335" fill="none" stroke="#87b4c8" strokeWidth="5" strokeDasharray="8 14" strokeDashoffset={-sample.progress*90} opacity=".65"/></g>:<g><rect x="48" y="160" width="390" height="132" rx="20" fill="#e6eff0" stroke="#a5b9be" strokeWidth="3"/>{[186,226,266].map(y=><path key={y} d={`M25 ${y} H460`} stroke="#87b4c8" strokeWidth="4" strokeDasharray="14 16" strokeDashoffset={playing?-beats*35:0} opacity=".65"/>)}{[130,245,360].map((x,i)=><g key={x} transform={`translate(${x+(playing?Math.sin(beats*3+i*1.8)*9:0)} ${226+(playing?Math.sin(beats*4+i*2)*13:0)})`}><circle r="31" fill="#f7f2e7" stroke="#d6cbb5" strokeWidth="2"/><path d="M-18 -10 Q-11 -22 3 -21" stroke="white" strokeWidth="5" fill="none" strokeLinecap="round"/></g>)}<path d="M441 215 l14 11 -14 11" fill="none" stroke="#87b4c8" strokeWidth="4"/></g>}
     </svg>}
    </div>
    <p className="bl-cue" key={sample.phase}>{cue}</p>
    <div className="bl-visuals" role="group" aria-label="Visual">{[['cycle','◯','Cycle'],['flower','✿','Flower & balls'],['body','♧','Body'],['embouchure','≈','Embouchure']].map(([id,icon,label])=><button key={id} aria-pressed={visual===id} onClick={()=>setVisual(id)}><span aria-hidden="true">{icon}</span>{label}</button>)}</div>
   </section>
   <aside className="bl-controls"><div><h2>{pattern.name}</h2></div><Sequence settings={settings} beats={beats} playing={playing}/><div className="bl-current" aria-live="off">{sample.phase} · {playing?sample.beat:0} / {sample.phase==='Inhale'?sample.inhale:sample.phase==='Hold'?sample.hold:sample.exhale}</div>
    <div className="bl-durations">{(['inhale','exhale'] as const).map(key=><label key={key}><span>{key==='inhale'?'Inhale':'Exhale'}</span><input aria-label={`${key} beats`} type="number" min=".5" max="20" step=".5" value={settings[key]} onChange={e=>{if(e.target.value)update(key,Number(e.target.value))}}/></label>)}</div>
    <details className="bl-hold"><summary>Hold {settings.hold>0?`· ${settings.hold}`:''}</summary><label>After inhale<input aria-label="Hold beats" type="number" min="0" max="4" step=".5" value={settings.hold} onChange={e=>{if(e.target.value)update('hold',Number(e.target.value))}}/></label></details>
    <div className="bl-metronome"><button aria-label={sound?'Mute metronome':'Enable metronome'} aria-pressed={sound} onClick={()=>setSound(!sound)}>{sound?'Sound on':'Sound off'}</button><label>♩ = <input aria-label="Tempo BPM" type="number" min="40" max="120" value={bpm} onChange={e=>{if(e.target.value){stop();setBpm(Math.max(40,Math.min(120,Number(e.target.value))))}}}/><small>BPM</small></label></div>
    {audioError&&<small role="status">Sound unavailable. The visual timer still works.</small>}
    <button className="bl-start" onClick={()=>void start()}>{playing?'Stop':'Start'}</button>
   </aside>
  </div>
 </main>;
}
