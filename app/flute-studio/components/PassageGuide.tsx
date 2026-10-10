"use client";
import {CloseButton} from "./CloseButton";
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useMemo,useState} from 'react';
import {PracticeNotation} from './PracticeNotation';
import {usePitchPractice} from './PitchPractice';
import {extractMeasures,relatedScale} from './practiceExcerpt';
import {runsFromXml,tupletsXml,groupedXml,randomGroupSizes,fermataPitchesXml,dotted,repeatedPairs,splitOptions} from './practiceTechniques';
import {noDisplay,type PracticeDisplay} from './practiceDisplay';
import {useLanguage} from '../i18n/LanguageContext';
import type {PassageEvent} from './passageAnalysis';
import {RhythmTap,type PassageRhythm} from './RhythmTap';
import './passage-guide.css';

type Mode='technique'|'pitch'|'rhythm';
const MODE_KEY='cookie:closeup-mode';

export function PassageGuide({xml,events,from,to,quarterBpm,numbers,onClose,sempreStaccato=false,initialDisplay=noDisplay,title,rhythm}:{xml:string;events:PassageEvent[];from:number;to:number;quarterBpm:number;numbers?:{from:string;to:string};onClose:()=>void;sempreStaccato?:boolean;/** The reader's View settings when the close-up opened; the toggles here start from them. */initialDisplay?:PracticeDisplay;/** The piece's name, for the pitch history. */title:string;/** Note starts and beat clicks for the Rhythm mode (tap the passage yourself). */rhythm?:PassageRhythm}){
  // Scale Studio's Back returns here (the piece), not to Exercises.
  const pathname=usePathname();
  const {t,lang}=useLanguage(),s=t.scoreViewer,zh=lang==="zh";
  const labels:Record<string,string>={"Original":"原谱","Dotted rhythm":"附点节奏","Long–short":"长短","Short–long":"短长","Pairs":"成对练习","Pairs ×2":"成对重复两次","Shifted pairs":"错位成对","Triplets":"三连音","Quintuplets":"五连音","Random groups":"随机分组","Groupings":"分组","Fermatas":"延长音","Hold a few":"延长部分音符"};
  const label=(text:string)=>zh?(labels[text]??text.replace(/^(\d+) as /,"$1 分为 ")):text;
  const [active,setActive]=useState<string|null>(null),[display,setDisplay]=useState(initialDisplay),repeat=false;
  // Technique is the default; the last choice is remembered so reopening costs no click.
  const [mode,setMode]=useState<Mode>(()=>{try{const saved=localStorage.getItem(MODE_KEY);return saved==='pitch'||saved==='rhythm'?saved:'technique'}catch{return 'technique'}});
  const source=useMemo(()=>{try{return {xml:extractMeasures(xml,from,to),error:''}}catch(e){return {xml:'',error:zh?'无法打开这些小节。':e instanceof Error?e.message:'Could not open these measures.'}}},[xml,from,to,zh]);
  const pitch=usePitchPractice({xml:source.xml,title,on:mode==='pitch',silence:active!==null,onStart:()=>setActive(null)});
  const choose=(next:Mode)=>{setActive(null);setMode(next);try{localStorage.setItem(MODE_KEY,next)}catch{/* The choice lasts for this visit. */}};
  const runs=useMemo(()=>{try{return source.xml?runsFromXml(source.xml):[]}catch{return []}},[source.xml]);
  const ctx=useMemo(()=>({key:source.xml.match(/<key[ >][\s\S]*?<\/key>/)?.[0],clef:source.xml.match(/<clef[ >][\s\S]*?<\/clef>/)?.[0]}),[source.xml]);
  const scale=useMemo(()=>relatedScale(events,source.xml),[events,source.xml]);
  // Random groups opens on a different pattern each time (Shuffle steps on from there).
  const [seed,setSeed]=useState(1),[groupSeed,setGroupSeed]=useState(()=>1+Math.floor(Math.random()*100000));
  type Row={id:string;title:string;xml:string;gen?:boolean;shuffle?:()=>void};
  // Exercises in sections; each row is just its name and the music.
  const sections=useMemo(()=>{
    const list:{title:string;rows:Row[]}[]=[],count=runs.flat().length;
    if(runs.some(r=>r.length>1)){
      list.push({title:'Dotted rhythm',rows:[{id:'ls',title:'Long–short',gen:true,xml:dotted(runs,'longShort',ctx)},{id:'sl',title:'Short–long',gen:true,xml:dotted(runs,'shortLong',ctx)}]});
      list.push({title:'Pairs',rows:[{id:'pairs',title:'Pairs ×2',gen:true,xml:repeatedPairs(runs,false,ctx)},{id:'shifted',title:'Shifted pairs',gen:true,xml:repeatedPairs(runs,true,ctx)}]});
    }
    const groupings:Row[]=count>=3?[{id:'triplets',title:'Triplets',xml:tupletsXml(runs,3,ctx)},{id:'quintuplets',title:'Quintuplets',xml:tupletsXml(runs,5,ctx)},{id:'random',title:'Random groups',xml:groupedXml(runs,randomGroupSizes(count,groupSeed),ctx),shuffle:()=>setGroupSeed(v=>v+1)}]:[];
    if(source.xml){try{splitOptions(source.xml).forEach(o=>groupings.push({id:'split'+o.title,title:o.title,xml:o.xml}))}catch{/* No tuplets to regroup. */}}
    if(groupings.length)list.push({title:'Groupings',rows:groupings});
    if(count)list.push({title:'Fermatas',rows:[{id:'fermata',title:'Hold a few',xml:fermataPitchesXml(runs,seed,ctx),shuffle:()=>setSeed(v=>v+1)}]});
    return list;
  },[runs,ctx,source.xml,seed,groupSeed]);
  const low=Math.min(from,to),high=Math.max(from,to);
  const player=(id:string,score:string,name:string,staccato=false,autoBeam=false,shown?:PracticeDisplay,tone?:{marks:Parameters<typeof PracticeNotation>[0]['marks'];onNote:(event:number)=>void},hideTime=autoBeam)=><PracticeNotation marks={tone?.marks} onNote={tone?.onNote} autoBeam={autoBeam} hideTime={hideTime} zoom={id==='original'?.85:.65} xml={score} label={name} quarterBpm={quarterBpm} playing={active===id} onPlay={()=>setActive(id)} onStop={()=>setActive(null)} loop={repeat} sempreStaccato={staccato} display={shown}/>;
  const flip=(next:PracticeDisplay)=>{setActive(null);setDisplay(next)};
  const cycleNames=()=>flip({...display,names:display.names==='off'?'names':display.names==='names'?'solfege':'off'});
  const namesLabel=display.names==='off'?s.noteDisplay:display.names==='names'?s.noteNames:s.solfege;
  // The View panel's own three toggles (same glyphs and wording), icon only here.
  const toggles:{glyph:string;label:string;on:boolean;onClick:()=>void}[]=[
    {glyph:'A♭',label:namesLabel,on:display.names!=='off',onClick:cycleNames},
    {glyph:'▥',label:s.rhythm,on:display.rhythm,onClick:()=>flip({...display,rhythm:!display.rhythm})},
    {glyph:'♯',label:s.accidentals,on:display.accidentals,onClick:()=>flip({...display,accidentals:!display.accidentals})}];
  const original=(marks?:Parameters<typeof PracticeNotation>[0]['marks'],onNote?:(event:number)=>void)=><div className="passage-guide__row passage-guide__row--original"><h3>{label("Original")}</h3>{player('original',source.xml,'original',sempreStaccato,false,display,marks?{marks,onNote:onNote!}:undefined)}</div>;
  return <section className="passage-guide" aria-label={zh?"乐谱近看":"Music close-up"}>
    <header className="passage-guide__heading"><h2>{`${zh?"小节":"Bars"} ${numbers?.from??low}–${numbers?.to??high}`}</h2>
      <div className="passage-guide__modes reader-choice" role="group" aria-label={zh?"练习":"Practice"}>{(['technique','pitch',...(rhythm?['rhythm']:[])] as Mode[]).map(m=><button type="button" key={m} aria-pressed={mode===m} onClick={()=>choose(m)}>{m==='technique'?(zh?'技巧':'Technique'):m==='pitch'?(zh?'音准':'Pitch'):(zh?'节奏':'Rhythm')}</button>)}</div>
      <div className="passage-guide__options">{toggles.map(x=><button type="button" key={x.glyph} className="passage-guide__icon has-tip" data-tip={x.label} aria-label={x.label} aria-pressed={x.on} onClick={x.onClick}><span aria-hidden="true">{x.glyph}</span></button>)}</div>
      {/* Mark up's close button: same icon, size and colour, no hover fill. */}<CloseButton className="passage-guide__close markup-close" label={zh?"关闭近看":"Close close-up"} onClick={onClose}/></header>
    {source.error?<p role="alert">{source.error}</p>:<div className="passage-guide__list">
      {original(mode==='pitch'?pitch.marks:undefined,mode==='pitch'?pitch.onNote:undefined)}
      {mode==='pitch'&&pitch.panel}
      {mode==='rhythm'&&rhythm&&<RhythmTap rhythm={rhythm} quarterBpm={quarterBpm} zh={zh}/>}
      {/* Kept mounted while Pitch is open, so coming back to Technique does not redraw every exercise. */}
      <div hidden={mode!=='technique'}>
        {scale&&<div className="passage-guide__row"><h3>{scale.label}<Link href={`/flute-studio/exercises/scales?key=${encodeURIComponent(scale.key)}&type=${scale.type}${'form' in scale&&scale.form==='arpeggio'?'&form=arpeggio':''}&back=${encodeURIComponent(pathname)}`}>{zh?"音阶练习":"Scale Studio"}</Link></h3>{player('scale',scale.xml,scale.label)}</div>}
        {sections.map(section=><section className="passage-guide__section" key={section.title}><h4>{label(section.title)}</h4>
          {section.rows.map(r=><div className="passage-guide__row" key={r.id}><h3>{label(r.title)}{r.shuffle&&<button type="button" className="passage-guide__shuffle" onClick={()=>{setActive(null);r.shuffle!()}}>{zh?"重新排列":"Shuffle"}</button>}</h3>{player(r.id,r.xml,r.title.toLowerCase(),false,!!r.gen,undefined,undefined,true)}</div>)}
        </section>)}
        {!sections.length&&!scale&&<p className="passage-guide__none">{zh?"选择更多音符生成练习，或选择音准检查这些音符。":"Select a few more notes for exercises, or pick Pitch to check these."}</p>}
      </div>
    </div>}
  </section>;
}
