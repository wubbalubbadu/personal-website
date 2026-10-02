"use client";
import Link from 'next/link';
import {useMemo,useState} from 'react';
import {PracticeNotation} from './PracticeNotation';
import {extractMeasures,practiceVariation,labelPracticeNotes,relatedScale,type PracticeVariation} from './practiceExcerpt';
import type {PassageEvent} from './passageAnalysis';
import './passage-guide.css';

export function PassageGuide({xml,events,from,to,quarterBpm,onSelectAgain,onClose,sempreStaccato=false}:{xml:string;events:PassageEvent[];from:number;to:number;quarterBpm:number;onSelectAgain:()=>void;onClose:()=>void;sempreStaccato?:boolean}){
  const [tab,setTab]=useState<'practice'|'rhythm'>('practice'),[active,setActive]=useState<string|null>(null),[names,setNames]=useState(false),[accidentals,setAccidentals]=useState(false),[repeat,setRepeat]=useState(false),[articulation,setArticulation]=useState<PracticeVariation>('slur');
  const source=useMemo(()=>{try{return {xml:extractMeasures(xml,from,to),error:''}}catch(e){return {xml:'',error:e instanceof Error?e.message:'Could not open these measures.'}}},[xml,from,to]);
  const original=useMemo(()=>labelPracticeNotes(source.xml,names,accidentals),[source.xml,names,accidentals]);
  const even=useMemo(()=>source.xml?practiceVariation(source.xml,'even'):'',[source.xml]);
  const articulated=useMemo(()=>source.xml?practiceVariation(source.xml,articulation):'',[source.xml,articulation]);
  const scale=useMemo(()=>relatedScale(events,source.xml),[events,source.xml]);
  const low=Math.min(from,to),high=Math.max(from,to);
  const attacks=events.filter(e=>e.p&&!e.tied&&e.d>0);
  const canEven=attacks.length>1&&(new Set(attacks.map(e=>e.d)).size>1||events.some(e=>!e.p||e.tied));
  const player=(id:string,score:string,label:string,clicks=false,staccato=false)=><PracticeNotation xml={score} label={label} quarterBpm={quarterBpm} playing={active===id} onPlay={()=>setActive(id)} onStop={()=>setActive(null)} loop={repeat} clicks={clicks} sempreStaccato={staccato}/>;
  return <section className="passage-guide" aria-label="Music close-up">
    <header className="passage-guide__heading"><div><h2>Close-up</h2><span>{low===high?`Measure ${low}`:`Measures ${low}–${high}`}</span></div><button type="button" onClick={onSelectAgain}>Change measures</button><button type="button" className="passage-guide__close" aria-label="Close close-up" onClick={onClose}>×</button></header>
    <nav className="passage-guide__tabs" aria-label="Close-up tools">{(['practice','rhythm'] as const).map(value=><button key={value} type="button" aria-pressed={tab===value} onClick={()=>{setActive(null);setTab(value)}}>{value==='practice'?'Practice':'Rhythm'}</button>)}</nav>
    {source.error?<p role="alert">{source.error}</p>:<>
      <section className="passage-guide__original"><header><h3>Original</h3><div className="passage-guide__options"><button type="button" aria-pressed={names} onClick={()=>{setActive(null);setNames(!names)}}>Note names</button><button type="button" aria-pressed={accidentals} onClick={()=>{setActive(null);setAccidentals(!accidentals)}}>Accidentals</button><button type="button" aria-pressed={repeat} onClick={()=>setRepeat(!repeat)}>Repeat</button></div></header>{player('original',original,'original',tab==='rhythm',sempreStaccato)}</section>
      {tab==='practice'?<div className="passage-guide__cards">
        {canEven&&<article><header><h3>Even rhythm</h3><span>Simplify</span></header><p>Keep the pitches. Play each new note as an even eighth note, then return to the original.</p>{player('even',even,'even rhythm')}</article>}
        <article><header><h3>Change the articulation</h3><span>Coordination</span></header><p>Keep the written rhythm and try a different connection between notes.</p><div className="passage-guide__options">{([['slur','Slurred'],['tongue','Tongued'],['staccato','Staccato']] as const).map(([value,label])=><button key={value} type="button" aria-pressed={articulation===value} onClick={()=>{setActive(null);setArticulation(value)}}>{label}</button>)}</div>{player('articulation',articulated,'articulation exercise')}</article>
        {scale&&<article className="passage-guide__scale"><header><h3>{scale.label}</h3><span>Prepare the fingers</span></header><p>Practise the shared notes {scale.evidence.join(' · ')} in scale order, in the same register.</p>{player('scale',scale.xml,scale.label)}<Link href={`/flute-studio/exercises/scales?key=${encodeURIComponent(scale.key)}&type=${scale.type}`}>Explore in Scale Studio →</Link></article>}
      </div>:<div className="passage-guide__rhythm"><h3>Hear it with the beat</h3><p>Listen above to hear the written rhythm against a steady quarter-note click. Turn on Repeat to follow it again. Tied notes continue without a new attack.</p><small>The click marks quarter notes, independent of how many fit in each measure.</small></div>}
    </>}
  </section>;
}
