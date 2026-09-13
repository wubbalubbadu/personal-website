import {counts,type Settings,breathAt} from './timing';
export default function Sequence({settings,beats,playing}:{settings:Settings;beats:number;playing:boolean}){
 const now=breathAt(beats,settings),active=settings.pattern==='even'?0:now.round%8;
 const steps=Array.from({length:settings.pattern==='even'?1:8},(_,i)=>counts(settings,i));
 return <section className="bl-sequence" aria-label="Full breathing sequence"><header><span>In / Out</span></header>
 {steps.map((step,i)=><div className="bl-step" key={i} aria-current={active===i?'step':undefined}><b>{step.inhale} / {step.exhale}</b><div className="bl-step-dots">{(['inhale','hold','exhale'] as const).map(phase=>{const elapsed=now.phase.toLowerCase()===phase?now.progress*now[phase]:phase==='inhale'&&now.phase!=='Inhale'||phase==='hold'&&now.phase==='Exhale'?step[phase]:0;return <span className={`bl-dot-group ${phase}`} key={phase}>{Array.from({length:Math.ceil(step[phase])},(_,n)=><i key={n} className={playing&&i===active&&elapsed>=n?(elapsed<n+1&&now.phase.toLowerCase()===phase?'current':'lit'):i<active?'lit':''} style={{opacity:n+1>step[phase] ? .5 : undefined}}/>)}</span>})}</div></div>)}
 </section>;
}
