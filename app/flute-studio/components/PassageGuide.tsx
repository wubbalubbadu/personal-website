"use client";
import Link from 'next/link';
import {useMemo,useState} from 'react';
import {PracticeNotation} from './PracticeNotation';
import {extractMeasures,labelPracticeNotes,relatedScale} from './practiceExcerpt';
import {runsFromXml,dotted,repeatedPairs,slidingGroups,addFermatas,splitOptions} from './practiceTechniques';
import type {PassageEvent} from './passageAnalysis';
import './passage-guide.css';

export function PassageGuide({xml,events,from,to,quarterBpm,onSelectAgain,onClose,sempreStaccato=false}:{xml:string;events:PassageEvent[];from:number;to:number;quarterBpm:number;onSelectAgain:()=>void;onClose:()=>void;sempreStaccato?:boolean}){
  const [active,setActive]=useState<string|null>(null),[names,setNames]=useState(false),[accidentals,setAccidentals]=useState(false),repeat=false,[seed,setSeed]=useState(1);
  const source=useMemo(()=>{try{return {xml:extractMeasures(xml,from,to),error:''}}catch(e){return {xml:'',error:e instanceof Error?e.message:'Could not open these measures.'}}},[xml,from,to]);
  const runs=useMemo(()=>{try{return source.xml?runsFromXml(source.xml):[]}catch{return []}},[source.xml]);
  const ctx=useMemo(()=>({key:source.xml.match(/<key[ >][\s\S]*?<\/key>/)?.[0],clef:source.xml.match(/<clef[ >][\s\S]*?<\/clef>/)?.[0]}),[source.xml]);
  const scale=useMemo(()=>relatedScale(events,source.xml),[events,source.xml]);
  const rows=useMemo(()=>{
    const pairs=runs.some(r=>r.length>1),list:{id:string;title:string;xml:string;shuffle?:boolean;gen?:boolean}[]=[];
    if(pairs){list.push({id:'ls',title:'Long–short',gen:true,xml:dotted(runs,'longShort',ctx)},{id:'sl',title:'Short–long',gen:true,xml:dotted(runs,'shortLong',ctx)},{id:'pairs',title:'Pairs ×2',gen:true,xml:repeatedPairs(runs,false,ctx)},{id:'shifted',title:'Shifted pairs',gen:true,xml:repeatedPairs(runs,true,ctx)})}
    if(runs.some(r=>r.length>=3))list.push({id:'s3',title:'Step through 3',gen:true,xml:slidingGroups(runs,3,ctx)});
    if(runs.some(r=>r.length>=4))list.push({id:'s4',title:'Step through 4',gen:true,xml:slidingGroups(runs,4,ctx)});
    if(source.xml){try{splitOptions(source.xml).forEach(o=>list.push({id:'split'+o.title,title:o.title,xml:o.xml}))}catch{/* No tuplets to regroup. */}}
    if(source.xml&&runs.length)list.push({id:'fermata',title:'Fermatas',xml:addFermatas(source.xml,seed),shuffle:true});
    return list;
  },[runs,ctx,source.xml,seed]);
  const low=Math.min(from,to),high=Math.max(from,to);
  const player=(id:string,score:string,name:string,clicks=false,staccato=false,autoBeam=false)=><PracticeNotation autoBeam={autoBeam} hideTime={autoBeam} zoom={id==='original'?.75:.65} xml={score} label={name} quarterBpm={quarterBpm} playing={active===id} onPlay={()=>setActive(id)} onStop={()=>setActive(null)} loop={repeat} clicks={clicks} sempreStaccato={staccato}/>;
  const toggle=(set:(v:boolean)=>void,v:boolean)=>()=>{setActive(null);set(!v)};
  return <section className="passage-guide" aria-label="Music close-up">
    <header className="passage-guide__heading"><h2>{low===high?`Bar ${low}`:`Bars ${low}–${high}`}</h2>
      <div className="passage-guide__options"><button type="button" aria-pressed={names} onClick={toggle(setNames,names)}>Note names</button><button type="button" aria-pressed={accidentals} onClick={toggle(setAccidentals,accidentals)}>Accidentals</button></div>
      <button type="button" onClick={onSelectAgain}>Change</button><button type="button" className="passage-guide__close" aria-label="Close close-up" onClick={onClose}>×</button></header>
    {source.error?<p role="alert">{source.error}</p>:<div className="passage-guide__list">
      <div className="passage-guide__row"><h3>Original</h3>{player('original',labelPracticeNotes(source.xml,names,accidentals),'original',false,sempreStaccato)}</div>
      <>
        {rows.map(r=><div className="passage-guide__row" key={r.id}><h3>{r.title}{r.shuffle&&<button type="button" className="passage-guide__shuffle" onClick={()=>{setActive(null);setSeed(seed+1)}}>Shuffle</button>}</h3>{player(r.id,r.xml,r.title.toLowerCase(),false,false,!!r.gen)}</div>)}
        {scale&&<div className="passage-guide__row"><h3>{scale.label}<Link href={`/flute-studio/exercises/scales?key=${encodeURIComponent(scale.key)}&type=${scale.type}`}>Scale Studio ›</Link></h3>{player('scale',scale.xml,scale.label)}</div>}
      </>
    </div>}
  </section>;
}
