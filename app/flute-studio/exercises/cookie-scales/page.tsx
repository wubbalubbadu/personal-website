'use client';
import Link from 'next/link';
import {useMemo} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import {ScoreViewer} from '../../components/ScoreViewer';
import BackChevron from '../../components/BackChevron';
import {PracticeIcon} from '../../components/PracticeIcon';
import {useLanguage} from '../../i18n/LanguageContext';
import {majorKeys} from '../scales/scale-score';
import {routine,routineXML,type RoutineExercise} from './routine';
import '../exercises.css';
import '../../music/books/book.css';

const home='/flute-studio/exercises/cookie-scales';
const href=(id:string,key:string)=>`${home}?exercise=${id}&key=${key}`;
function RoutineReader({exercise,keyId,zh}:{exercise:RoutineExercise;keyId:string;zh:boolean}){
  const router=useRouter();
  const index=routine.indexOf(exercise),keys=exercise.type==='chromatic'?majorKeys.slice(0,1):majorKeys;
  const selected=keys.find(k=>k.id===keyId)??keys[0];
  const xml=useMemo(()=>routineXML(exercise,selected.id),[exercise,selected.id]);
  return <ScoreViewer key={`${exercise.id}-${selected.id}`} unmetered config={{id:`cookie-routine-${exercise.id}-${selected.id}`,title:`${selected.label} · ${zh?exercise.zh:exercise.title}`,composer:'',asset:xml,defaultTempo:60,backHref:home,backLabel:zh?'Cookie 的音阶练习':'Cookie’s Favorite Scale Routine'}}
    headerActions={()=><span className="book-stepper">
      {index>0&&<Link className="book-stepper__arrow" href={href(routine[index-1].id,selected.id)} aria-label={zh?'上一个练习':'Previous exercise'}><PracticeIcon name="previous"/></Link>}
      <span className="book-stepper__label">{index+1} / {routine.length}</span>
      {index<routine.length-1&&<Link className="book-stepper__arrow" href={href(routine[index+1].id,selected.id)} aria-label={zh?'下一个练习':'Next exercise'}><PracticeIcon name="next"/></Link>}
      <label>{zh?'调':'Key'} <select aria-label={zh?'选择调':'Choose key'} value={selected.id} onChange={e=>{router.replace(href(exercise.id,e.target.value))}}>{keys.map(k=><option key={k.id} value={k.id}>{k.label}</option>)}</select></label>
    </span>}/>;
}
export default function CookieScaleRoutine(){
  const params=useSearchParams(),{lang}=useLanguage(),zh=lang==='zh';
  const exercise=routine.find(e=>e.id===params.get('exercise'));
  if(exercise)return <RoutineReader exercise={exercise} keyId={params.get('key')??'C'} zh={zh}/>;
  return <main className="exercise-hub"><div className="exercise-hub__content">
    <Link className="book-page__back" href="/flute-studio/exercises" aria-label={zh?'返回练习':'Back to exercises'}><BackChevron/></Link>
    <header className="exercise-hub__header book-page__header"><div><h1>{zh?'Cookie 的音阶练习':'Cookie’s Favorite Scale Routine'}</h1></div>
      <p className="book-page__composer">{zh?'进阶 · 低音 B 至高音 D':'Advanced · Low B to high D'}</p>
      <p className="book-page__about">{zh?'每项从音域内最低音开始并结束。舒适时连续演奏两遍，保持音色稳定。每次打开一个练习、一个调。':'Start and finish on the lowest available note. Play each pattern twice continuously when comfortable, keeping the tone steady. Open one exercise and one key at a time.'}</p>
    </header>
    <section className="book-page__list" aria-label={zh?'练习目录':'Routine exercises'}>{routine.map((e,i)=><article key={e.id} className="book-row"><Link className="book-row__main" href={href(e.id,'C')}><span className="book-row__copy"><strong>{i+1}. {zh?e.zh:e.title}</strong><small>{e.type==='chromatic'?(zh?'半音阶':'Chromatic'):(zh?'12 个调，分别打开':'12 keys, opened individually')}</small></span></Link></article>)}</section>
  </div></main>;
}
