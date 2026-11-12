'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import EngravedRow from '../theory/EngravedRow';
import CountInPulse from '../components/CountInPulse';
import {useRhythmAudio} from '../theory/rhythm/useRhythmAudio';
import {usePhoneNotation} from '../theory/usePhoneNotation';
import {compileRhythm,gradeTaps,type TapMark} from '../theory/dots-and-ties/rhythmSequence';
import {useLanguage} from '../i18n/LanguageContext';
import {barLength,fitsTier,makeTierRhythm,maxLength,shortestOf,tierTempo,TIERS,type DrillPattern,type Tier} from './drills';
import realBarsJson from './real-bars.json';
import '../theory/engraved-row.css';
import '../theory/dots-and-ties/dots-and-ties.css';
import '../components/passage-guide.css';
import './rhythm-drills.css';

const REAL_BARS=realBarsJson as unknown as DrillPattern[];
const REAL_SHARE=.35,TIER_KEY='cookie:rhythm-drills-tier';
const COUNT_Y=248,MARK_Y=278;
type Phase='ready'|'run'|'result';
type Result={perfect:boolean;marks:TapMark[];missing:number[]};

function readTier():Tier{try{const t=localStorage.getItem(TIER_KEY);if(TIERS.some(x=>x.id===t))return t as Tier}catch{/* No storage: start easy. */}return 'easy'}
function saveTier(t:Tier){try{localStorage.setItem(TIER_KEY,t)}catch{/* Private mode: the choice is just not kept. */}}

/**
 * Rhythm drills. Pick Easy, Medium or Hard, read a rhythm, tap it after a one-bar count-in, and see each tap graded
 * under its note. Every rhythm is new (made on the spot, sometimes a real bar from the Library, named after you play it).
 */
export default function RhythmGame(){
  const {lang}=useLanguage(),zh=lang==='zh',tr=(en:string,cn:string)=>zh?cn:en;
  const phone=usePhoneNotation(),right=phone?520:820,room=right-120,frame=`20 45 ${right+10} 310`;
  const audio=useRhythmAudio();
  const [phase,setPhase]=useState<Phase>('ready');
  const [tier,setTier]=useState<Tier>('easy'),[streak,setStreak]=useState(0);
  const [pattern,setPattern]=useState<DrillPattern|null>(null),[result,setResult]=useState<Result|null>(null);
  const [marks,setMarks]=useState<TapMark[]>([]),[pressed,setPressed]=useState(false);
  const taps=useRef<number[]>([]),used=useRef(new Set<string>()),round=useRef(0),guard=useRef(0);
  const tierInfo=TIERS.find(t=>t.id===tier)!;

  const data=useMemo(()=>pattern?compileRhythm(pattern):null,[pattern]);
  const bpm=pattern?tierTempo(tier,pattern):0,spq=bpm?60/bpm:.75;
  const bar=pattern?barLength(pattern.meter):4,span=data?.total??0;

  /** The next rhythm: sometimes a real bar in this difficulty that fits the screen, otherwise a new one. */
  const next=useCallback((t:Tier)=>{
    round.current++;
    const real=REAL_BARS.filter(p=>!used.current.has(p.id)&&fitsTier(p.items,p.rank,t)&&barLength(p.meter)<=maxLength(room,shortestOf(p.items)));
    const p=real.length&&Math.random()<REAL_SHARE?real[Math.floor(Math.random()*real.length)]:makeTierRhythm(t,Math.random,room,`r${round.current}`);
    if(p.source)used.current.add(p.id);
    setPattern(p);setResult(null);setMarks([]);setPhase('ready');guard.current=performance.now()+250;
  },[room]);
  // The first rhythm is made after hydration: it is random, and the remembered difficulty lives in this browser.
  useEffect(()=>{const first=()=>{const t=readTier();setTier(t);next(t)};first()},[next]);

  function choose(t:Tier){
    if(t===tier)return;
    audio.stop();used.current.clear();saveTier(t);setTier(t);setStreak(0);next(t);
  }

  function grade(){
    if(!data||!pattern)return;
    const g=gradeTaps(taps.current,data.onsets,spq);
    setStreak(s=>g.perfect?s+1:0);
    setMarks(g.marks);setResult({perfect:g.perfect,marks:g.marks,missing:g.missing});
    setPhase('result');guard.current=performance.now()+500;
  }

  function play(){
    if(!data||!pattern)return;
    audio.stop();taps.current=[];setMarks([]);setPhase('run');
    void audio.counted({values:[bar+span],top:pattern.top??4,beatUnit:pattern.beat,notes:false,speak:false,secondsPerQuarter:spq,
      onEnd:grade,onError:()=>setPhase('ready')});
  }
  function proceed(){next(tier)}
  function hear(){
    if(!data||!pattern)return;
    if(audio.elapsed>=0){audio.stop();return}
    void audio.counted({values:data.notes.map(n=>n.v),timeline:data.timeline,ties:data.ties,top:pattern.top??4,beatUnit:pattern.beat,speak:false,secondsPerQuarter:spq});
  }

  const {position,clap}=audio;
  // One handler for the pad and the keyboard: start, tap, or go on, depending on where the round is.
  const press=useCallback((at?:number)=>{
    if(phase==='run'){
      const time=position(at);if(time<0)return;
      const offset=time/spq-bar;if(offset<-.3||offset>span+.3)return;
      taps.current.push(offset);setMarks(taps.current.map(t=>({at:t,onset:-1,timing:'extra'})));void clap();return;
    }
    if(performance.now()<guard.current)return;
    if(phase==='ready')play();
    else if(phase==='result')proceed();
  // play and proceed read the latest state each render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[phase,position,clap,spq,bar,span,data,tier]);
  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      if(e.repeat||e.metaKey||e.ctrlKey||e.altKey||['Shift','Control','Alt','Meta','Tab','Escape','CapsLock'].includes(e.key))return;
      // A focused button handles its own Enter and Space outside a run.
      if(phase!=='run'&&(e.target as HTMLElement)?.closest?.('button,a,input'))return;
      e.preventDefault();press(e.timeStamp);
    };
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[phase,press]);
  useEffect(()=>{const hide=()=>{if(document.hidden&&phase==='run'){audio.stop();setPhase('ready')}};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide)},[phase,audio]);

  // Difficulty on the page itself (the studio's View switch), with one line saying what it includes.
  const picker=<div className="rd-game__level">
    <div className="view-switch" role="group" aria-label={tr('Difficulty','难度')}>
      {TIERS.map(t=><button key={t.id} type="button" aria-pressed={tier===t.id} onClick={()=>choose(t.id)}>{tr(...t.name)}</button>)}
    </div>
    <small>{tr(...tierInfo.includes)}</small>
  </div>;
  if(!pattern||!data)return <main className="rd-game"><header className="rd-game__stats">{picker}</header></main>;

  const judged=phase==='result';
  const top=pattern.top??4,clicks=Array.from({length:Math.round(span/pattern.beat)},(_,i)=>i);
  const countIn=phase==='run'&&audio.beat>=0&&audio.beat<top?audio.beat:-1;
  const source=pattern.source;
  const counts=(k:number,one:string,many:string)=>k===1?one:many.replace('#',String(k));
  const summary=result?result.perfect?tr('Clean. Every note on time.','全对，每个音都准时。'):[
    [result.marks.filter(m=>m.timing==='early').length,tr('1 early','1 次早了'),tr('# early','# 次早了')],
    [result.marks.filter(m=>m.timing==='late').length,tr('1 late','1 次晚了'),tr('# late','# 次晚了')],
    [result.missing.length,tr('1 note missed','漏了 1 个音'),tr('# notes missed','漏了 # 个音')],
    [result.marks.filter(m=>m.timing==='extra').length,tr('1 extra tap','多点了 1 次'),tr('# extra taps','多点了 # 次')],
  ].filter(([k])=>(k as number)>0).map(([k,one,many])=>counts(k as number,one as string,many as string)).join(zh?'，':', ')+(zh?'。':'.'):'';
  const padLabel=phase==='ready'?tr('Tap here or press any key to start','点这里或按任意键开始'):phase==='run'?(countIn>=0?tr('Count in','预备'):tr('Tap each note','每个音点一下')):tr('Tap or press any key for the next rhythm','点一下或按任意键，下一个节奏');

  return <main className="rd-game">
    <header className="rd-game__stats">
      {picker}
      <div className="rd-game__stat"><b>{streak}</b><small>{tr('in a row','连续')}</small></div>
      <div className="rd-game__stat"><b>{bpm}</b><small>bpm</small></div>
    </header>

    <div className="rd-game__staff">
      <EngravedRow key={pattern.id} proportional notes={data.notes} ties={data.ties} tuplets={pattern.tuplets} beams={pattern.beams} bars={pattern.bars} clef={false} meter={pattern.meter} right={right} viewBox={frame} active={phase==='run'?-1:audio.active} label={tr('The rhythm to tap','要点的节奏')}>
        {l=>{const x=(t:number)=>l.beatX(Math.max(-.3,Math.min(span,t)));return <>
          {clicks.map(i=><text key={i} className="dt-count" x={x(i*pattern.beat)} y={COUNT_Y}>{i%top+1}</text>)}
          {judged&&<path className="dt-ruler" d={`M${x(0)} ${MARK_Y} H${x(span)}`}/>}
          {judged&&data.onsets.map((t,i)=><circle key={t} className={`dt-guide${result?.missing.includes(i)?' is-missed':''}`} cx={x(t)} cy={MARK_Y} r={result?.missing.includes(i)?7:5}/>)}
          {marks.map((m,i)=><g key={i}>
            {judged&&(m.timing==='early'||m.timing==='late')&&<path className="dt-tap-link" d={`M${x(m.at)} ${MARK_Y+22} L${x(data.onsets[m.onset])} ${MARK_Y+6}`}/>}
            <circle className={`dt-tap${judged?` is-${m.timing}`:''}`} cx={x(m.at)} cy={MARK_Y+22} r="6"/>
          </g>)}
        </>}}
      </EngravedRow>
    </div>

    {/* After the round: how it went, and where a real bar comes from. */}
    <p className={`rd-game__result${result?.perfect?' is-clean':result?' is-off':''}`} role="status" aria-live="polite">
      {result?summary:' '}
      {result&&source&&<span className="rd-game__source">{tr(`From ${source.title} (${source.composer}), bar ${source.bar}`,`出自《${source.zhTitle??source.title}》（${source.composer}），第 ${source.bar} 小节`)}</span>}
    </p>

    <div className="rd-game__count"><CountInPulse beat={countIn} total={top} active={countIn>=0} zh={zh}/></div>
    <div className={`rhythm-tap__pad rd-game__pad${pressed?' is-pressed':''}${phase==='run'?' is-live':''}`} role="button" tabIndex={-1} aria-label={padLabel}
      onPointerDown={e=>{e.preventDefault();setPressed(true);press(e.timeStamp)}} onPointerUp={()=>setPressed(false)} onPointerLeave={()=>setPressed(false)} onPointerCancel={()=>setPressed(false)}>
      <span className="rhythm-tap__pad-label">{padLabel}</span>
    </div>

    <div className="rd-game__actions">
      {phase==='ready'&&<button className="rd-button action-button action-button--large" onPointerUp={e=>e.currentTarget.blur()} onClick={play}>{tr('Count me in','数拍开始')}</button>}
      {phase==='run'&&<button className="rd-button action-button action-button--large" onPointerUp={e=>e.currentTarget.blur()} onClick={()=>{audio.stop();setMarks([]);setPhase('ready')}}>{tr('Stop','停止')}</button>}
      {phase==='result'&&<>
        <button className="rd-button action-button action-button--large" onPointerUp={e=>e.currentTarget.blur()} onClick={proceed}>{tr('Next rhythm','下一个节奏')}</button>
        <button className="rd-button action-button action-button--large" onPointerUp={e=>e.currentTarget.blur()} onClick={hear}>{audio.elapsed>=0?tr('Stop','停止'):tr('Hear it','听一遍')}</button>
      </>}
    </div>
  </main>;
}
