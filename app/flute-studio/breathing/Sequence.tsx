import {useLanguage} from '../i18n/LanguageContext';
import {counts,ROUNDS,type Settings,breathAt} from './timing';
// The eight rounds of a changing pattern as one row: each round's in and out counts, the current round lit in the
// studio's purple with a bar that fills as the breath goes by. One row instead of a list, so the phone needs no scrolling.
export default function Sequence({settings,beats,playing}:{settings:Settings;beats:number;playing:boolean}){
 const {lang}=useLanguage(),zh=lang==='zh';
 const now=breathAt(beats,settings),active=playing?now.round:-1;
 const steps=Array.from({length:ROUNDS},(_,i)=>counts(settings,i));
 return <section className="bl-sequence" aria-label={zh?'八轮呼吸序列':'Eight rounds'}>
  <div className="bl-sequence__legend" aria-hidden="true"><span className="is-in">{zh?'吸':'In'}</span><span className="is-out">{zh?'呼':'Out'}</span></div>
  <ol>{steps.map((step,i)=><li key={i} aria-current={active===i?'step':undefined}
   aria-label={`${zh?'第':'Round '}${i+1}${zh?'轮':''}: ${zh?'吸':'in'} ${step.inhale}, ${zh?'呼':'out'} ${step.exhale}`}>
   <b>{step.inhale}</b><b>{step.exhale}</b>
   <i style={{transform:`scaleX(${active>i?1:active===i?now.cycle:0})`}}/>
  </li>)}</ol>
 </section>;
}
