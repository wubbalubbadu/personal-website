'use client';
import Link from 'next/link';
import {useMemo,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {ScaleTemposPanel} from '../../components/ScaleTemposPanel';
import {SCALE_TEMPO_KEY,scaleTrackingId,scaleTrackedTempo} from '../scales/scale-tracking';
import {scaleNotes} from '../scales/scale-score';
import '../scales/scale-book.css';
import {ScoreTempoMarks} from '../../components/ScoreTempoMarks';
import {ScoreViewer} from '../../components/ScoreViewer';
import {PracticeIcon} from '../../components/PracticeIcon';
import BackChevron from '../../components/BackChevron';
import {useLanguage} from '../../i18n/LanguageContext';
import {routine,routineXML,routineBlocks,routineSpan,type RoutineExercise} from './routine';
import '../exercises.css';
import '../../music/books/book.css';

const home='/flute-studio/music/cookie-scales';
const href=(id:string)=>`${home}?exercise=${id}`;
function RoutineReader({exercise,zh}:{exercise:RoutineExercise;zh:boolean}){
  const index=routine.indexOf(exercise),previous=routine[index-1],next=routine[index+1];
  const [showTempos,setShowTempos]=useState(true);
  const [tempos,setTempos]=useState<Record<string,number>>(()=>{
    try{
      const shared=JSON.parse(localStorage.getItem(SCALE_TEMPO_KEY)??'{}');
      const legacy=JSON.parse(localStorage.getItem('cookie-routine-tempos')??'{}');
      for(const item of routine)for(const block of routineBlocks(item)){
        const oldId=`cookie-routine-${item.id}-${block.key.id}-${block.form}`;
        const id=scaleTrackingId(block,'full',routineSpan,item.groups);
        if(shared[id]===undefined&&Number.isFinite(legacy[oldId]))shared[id]=legacy[oldId];
      }
      return shared;
    }catch{return {}}
  });
  const [activeBlock,setActiveBlock]=useState<string|null>(null);
  const blocks=useMemo(()=>routineBlocks(exercise),[exercise]);
  const starts=useMemo(()=>blocks.reduce<number[]>((out,block)=>[...out,out[out.length-1]+scaleNotes(block.key,'custom',block.type,block.form,'hold','lowest',routineSpan,exercise.groups).length],[0]),[blocks,exercise.groups]);
  const xml=useMemo(()=>routineXML(exercise),[exercise]);
  return <ScoreViewer key={exercise.id} unmetered onTempoChange={tempo=>{
    if(!activeBlock)return;
    setTempos(previous=>{
      if(previous[activeBlock]===tempo)return previous;
      const updated={...previous,[activeBlock]:tempo};
      try{localStorage.setItem(SCALE_TEMPO_KEY,JSON.stringify(updated))}catch{/* Storage can be unavailable. */}
      return updated;
    });
  }}
    settings={reader=><ScaleTemposPanel reader={reader} zh={zh} activeBlock={activeBlock} onActive={setActiveBlock}
      rows={blocks.map((block,index)=>{
        const id=scaleTrackingId(block,'full',routineSpan,exercise.groups);
        return {id,name:block.label,tempo:scaleTrackedTempo(block,'full',routineSpan,exercise.groups,tempos),eventStart:starts[index]};
      })}
      onTempo={(id,tempo)=>{
        setActiveBlock(id);
        setTempos(previous=>{
          const updated={...previous,[id]:tempo};
          try{localStorage.setItem(SCALE_TEMPO_KEY,JSON.stringify(updated))}catch{/* Storage can be unavailable. */}
          return updated;
        });
      }}
      tempoMarks={showTempos} onTempoMarks={setShowTempos}/>}
    extraSystemSpacing={showTempos?3:0}
    practiceTempo={{value:showTempos,onChange:setShowTempos}}
    scoreMarks={showTempos?context=><ScoreTempoMarks root={context.root} version={context.version} zh={zh}
      marks={blocks.map(block=>{
        const id=scaleTrackingId(block,'full',routineSpan,exercise.groups);
        return {id,label:block.label,tempo:scaleTrackedTempo(block,'full',routineSpan,exercise.groups,tempos),rep:{key:id,title:block.label,kind:'scale' as const}};
      })}
      soundingId={context.controls.metronome?activeBlock:null}
      onChange={(id,tempo)=>{
        setActiveBlock(id);
        setTempos(previous=>{
          const updated={...previous,[id]:tempo};
          try{localStorage.setItem(SCALE_TEMPO_KEY,JSON.stringify(updated))}catch{/* Storage can be unavailable. */}
          return updated;
        });
        context.controls.setTempo(tempo);
      }}
      onSound={(id,tempo)=>{
        const running=context.controls.metronome&&activeBlock===id;
        setActiveBlock(id);
        context.controls.setTempo(tempo);
        if(running||!context.controls.metronome)context.controls.toggleMetronome();
      }}
    />:undefined}
    config={{id:`cookie-routine-${exercise.id}`,title:zh?exercise.zh:exercise.title,composer:'',asset:xml,defaultTempo:60,backHref:home,backLabel:zh?'Cookie 的音阶练习':'Cookie’s Scale Routine'}} headerActions={()=><span className="book-stepper">
    {previous?<Link className="book-stepper__arrow" href={href(previous.id)} aria-label={zh?'上一个练习':'Previous exercise'}><PracticeIcon name="previous"/></Link>:<span className="book-stepper__arrow is-off" aria-hidden="true"><PracticeIcon name="previous"/></span>}
    <span className="book-stepper__label">{index+1} / {routine.length}</span>
    {next?<Link className="book-stepper__arrow" href={href(next.id)} aria-label={zh?'下一个练习':'Next exercise'}><PracticeIcon name="next"/></Link>:<span className="book-stepper__arrow is-off" aria-hidden="true"><PracticeIcon name="next"/></span>}
  </span>}/>;
}
export default function CookieScaleRoutine(){
  const params=useSearchParams(),{lang}=useLanguage(),zh=lang==='zh';
  const exercise=routine.find(e=>e.id===params.get('exercise'));
  if(exercise)return <RoutineReader key={exercise.id} exercise={exercise} zh={zh}/>;
  return <main className="exercise-hub"><div className="exercise-hub__content">
    <Link className="book-page__back" href="/flute-studio/music?tag=exercise" aria-label={zh?'返回音乐库':'Back to Music Library'}><BackChevron/></Link>
    <header className="exercise-hub__header book-page__header"><div><h1>{zh?'Cookie 的音阶练习':'Cookie’s Scale Routine'}</h1></div>
    </header>
    <section className="book-page__list" aria-label={zh?'练习目录':'Routine exercises'}>{routine.map((e,i)=><article key={e.id} className="book-row"><Link className="book-row__main" href={href(e.id)}><span className="book-row__copy"><strong>{i+1}. {zh?e.zh:e.title}</strong></span></Link></article>)}</section>
  </div></main>;
}
