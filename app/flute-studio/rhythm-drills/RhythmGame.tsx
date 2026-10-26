'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import EngravedRow from '../theory/EngravedRow';
import CountInPulse from '../components/CountInPulse';
import {useRhythmAudio} from '../theory/rhythm/useRhythmAudio';
import {usePhoneNotation} from '../theory/usePhoneNotation';
import {compileRhythm,gradeTaps,type TapMark} from '../theory/dots-and-ties/rhythmSequence';
import {useLanguage} from '../i18n/LanguageContext';
import {barLength,makeRhythm,maxLength,RANKS,shortestOf,tempoFor,TOP_RANK,wantedRank,type DrillPattern} from './drills';
import realBarsJson from './real-bars.json';
import '../theory/engraved-row.css';
import '../theory/dots-and-ties/dots-and-ties.css';
import '../components/passage-guide.css';
import './rhythm-drills.css';

const REAL_BARS=realBarsJson as unknown as DrillPattern[];
const LIVES=3,UP_AFTER=2,REAL_SHARE=.35,BEST_KEY='cookie:rhythm-drills-best';
const COUNT_Y=248,MARK_Y=278;
type Phase='start'|'ready'|'run'|'result'|'over';
type Best={level:number;streak:number};
type Result={perfect:boolean;marks:TapMark[];missing:number[];levelUp:boolean;levelDown:boolean};

function readBest():Best{try{const b=JSON.parse(localStorage.getItem(BEST_KEY)??'null');if(b&&typeof b.level==='number'&&typeof b.streak==='number')return b}catch{/* No storage: no best yet. */}return {level:0,streak:0}}
function saveBest(b:Best){try{localStorage.setItem(BEST_KEY,JSON.stringify(b))}catch{/* Private mode: the best is just not kept. */}}

/**
 * Endless rhythm drills. Read a rhythm, tap it after a one-bar count-in, see each tap graded under its note. Two clean
 * rhythms in a row move you up a level (the tempo creeps up too); a miss costs a life and a level. Three misses end the
 * run. Some rounds are real bars from pieces in the Library, named after you play them.
 */
export default function RhythmGame(){
  const {lang}=useLanguage(),zh=lang==='zh',tr=(en:string,cn:string)=>zh?cn:en;
  const phone=usePhoneNotation(),right=phone?520:820,room=right-120,frame=`20 45 ${right+10} 310`;
  const audio=useRhythmAudio();
  const [phase,setPhase]=useState<Phase>('start');
  const [level,setLevel]=useState(1),[lives,setLives]=useState(LIVES),[streak,setStreak]=useState(0),[inARow,setInARow]=useState(0);
  const [run,setRun]=useState({best:0,top:1,rounds:0});
  const [best,setBest]=useState<Best>({level:0,streak:0}),[record,setRecord]=useState(false);
  const [pattern,setPattern]=useState<DrillPattern|null>(null),[result,setResult]=useState<Result|null>(null);
  const [marks,setMarks]=useState<TapMark[]>([]),[pressed,setPressed]=useState(false);
  const taps=useRef<number[]>([]),used=useRef(new Set<string>()),round=useRef(0),guard=useRef(0);
  // Read after hydration: the best lives in this browser's storage, which the server render has no view of.
  useEffect(()=>{const sync=()=>setBest(readBest());sync()},[]);

  const data=useMemo(()=>pattern?compileRhythm(pattern):null,[pattern]);
  const bpm=pattern?tempoFor(level,pattern):0,spq=bpm?60/bpm:.75;
  const bar=pattern?barLength(pattern.meter):4,span=data?.total??0;

  /** The next rhythm: sometimes a real bar near this level that fits the screen, otherwise a new one. */
  const next=useCallback((lvl:number)=>{
    round.current++;
    const want=wantedRank(lvl);
    const real=REAL_BARS.filter(p=>!used.current.has(p.id)&&(want>=TOP_RANK?p.rank>=10:p.rank<=want&&p.rank>=want-1)&&barLength(p.meter)<=maxLength(room,shortestOf(p.items)));
    const p=real.length&&Math.random()<REAL_SHARE?real[Math.floor(Math.random()*real.length)]:makeRhythm(lvl,Math.random,room,`r${round.current}`);
    if(p.source)used.current.add(p.id);
    setPattern(p);setResult(null);setMarks([]);setPhase('ready');guard.current=performance.now()+250;
  },[room]);

  function begin(from:number){
    audio.stop();used.current.clear();
    setLevel(from);setLives(LIVES);setStreak(0);setInARow(0);setRun({best:0,top:from,rounds:0});setRecord(false);
    next(from);
  }

  function grade(){
    if(!data||!pattern)return;
    const g=gradeTaps(taps.current,data.onsets,spq);
    let lvl=level,up=false,down=false;
    if(g.perfect){
      const row=inARow+1,s=streak+1;
      if(row>=UP_AFTER){lvl=level+1;up=true;setInARow(0)}else setInARow(row);
      setStreak(s);
      // A long streak earns a life back.
      if(s%10===0)setLives(l=>Math.min(LIVES,l+1));
      setRun(r=>({best:Math.max(r.best,s),top:Math.max(r.top,lvl),rounds:r.rounds+1}));
    }else{
      lvl=Math.max(1,level-1);down=lvl<level;
      setStreak(0);setInARow(0);setLives(l=>l-1);
      setRun(r=>({...r,rounds:r.rounds+1}));
    }
    setLevel(lvl);setMarks(g.marks);setResult({perfect:g.perfect,marks:g.marks,missing:g.missing,levelUp:up,levelDown:down});
    setPhase('result');guard.current=performance.now()+500;
  }

  function play(){
    if(!data||!pattern)return;
    audio.stop();taps.current=[];setMarks([]);setPhase('run');
    void audio.counted({values:[bar+span],top:pattern.top??4,beatUnit:pattern.beat,notes:false,speak:false,secondsPerQuarter:spq,
      onEnd:grade,onError:()=>setPhase('ready')});
  }
  // The run has ended when the last life went: show that result, then the end screen.
  function proceed(){
    if(lives<=0){
      const b={level:Math.max(best.level,run.top),streak:Math.max(best.streak,run.best)};
      setRecord(run.top>best.level||run.best>best.streak);
      if(b.level!==best.level||b.streak!==best.streak){saveBest(b);setBest(b)}
      audio.stop();setPhase('over');return;
    }
    next(level);
  }
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
  },[phase,position,clap,spq,bar,span,data,lives,level]);
  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      if(e.repeat||e.metaKey||e.ctrlKey||e.altKey||['Shift','Control','Alt','Meta','Tab','Escape','CapsLock'].includes(e.key))return;
      // A focused button handles its own Enter and Space outside a run.
      if(phase!=='run'&&(e.target as HTMLElement)?.closest?.('button,a,input'))return;
      if(phase==='start'||phase==='over')return;
      e.preventDefault();press(e.timeStamp);
    };
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[phase,press]);
  useEffect(()=>{const hide=()=>{if(document.hidden&&phase==='run'){audio.stop();setPhase('ready')}};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide)},[phase,audio]);

  const startAt=Math.max(1,Math.min(TOP_RANK,best.level-2));
  if(phase==='start'||phase==='over'||!pattern||!data){
    const over=phase==='over';
    return <main className="rd-game rd-game--intro">
      <h1>{tr('Rhythm drills','节奏训练')}</h1>
      {over?<>
        <p className="rd-game__big">{tr(`Level ${run.top}`,`第 ${run.top} 级`)}</p>
        <p className="rd-game__lead">{tr(`You got as far as ${RANKS[wantedRank(run.top)][0].toLowerCase()}, with ${run.best} in a row at best.`,`你一路练到了「${RANKS[wantedRank(run.top)][1]}」，最多连续答对 ${run.best} 个。`)}{record?tr(' A new best.',' 新纪录！'):''}</p>
      </>:<p className="rd-game__lead">{tr('Read the rhythm, then tap each note after the count-in. Two clean rhythms in a row take you up a level and a little faster. A miss costs one of your three lives. Some rhythms come from pieces in the Library.','先读节奏，数拍后在每个音开始时点一下。连续两次全对升一级，速度也会稍微加快。错一次扣一条命，一共三条。有些节奏来自曲库里的乐曲。')}</p>}
      {best.level>0&&<p className="rd-game__best">{tr(`Your best: level ${best.level}, ${best.streak} in a row`,`你的最佳：第 ${best.level} 级，连续 ${best.streak} 个`)}</p>}
      <div className="rd-game__actions">
        <button className="rd-button" onClick={()=>begin(1)}>{over?tr('Play again','再玩一次'):tr('Start','开始')}</button>
        {startAt>1&&<button className="rd-button" onClick={()=>begin(startAt)}>{tr(`Start at level ${startAt}`,`从第 ${startAt} 级开始`)}</button>}
      </div>
    </main>;
  }

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
  const levelNote=result?.levelUp?tr(` Up to level ${level}.`,` 升到第 ${level} 级。`):result?.levelDown?tr(` Back to level ${level}.`,` 回到第 ${level} 级。`):'';
  const padLabel=phase==='ready'?tr('Tap here or press any key to start','点这里或按任意键开始'):phase==='run'?(countIn>=0?tr('Count in','预备'):tr('Tap each note','每个音点一下')):lives<=0?tr('Tap or press any key to see your run','点一下或按任意键看结果'):tr('Tap or press any key for the next rhythm','点一下或按任意键，下一个节奏');

  return <main className="rd-game">
    <header className="rd-game__stats">
      <div className="rd-game__level"><b>{tr(`Level ${level}`,`第 ${level} 级`)}</b><small>{tr(...RANKS[Math.min(pattern.rank||1,TOP_RANK)])}</small></div>
      <div className="rd-game__stat"><b>{streak}</b><small>{tr('in a row','连续')}</small></div>
      <div className="rd-game__stat"><b>{bpm}</b><small>bpm</small></div>
      <div className="rd-game__lives" role="img" aria-label={tr(`${lives} of ${LIVES} lives left`,`还剩 ${lives} 条命`)}>{Array.from({length:LIVES},(_,i)=><i key={i} className={i<lives?'is-left':undefined}/>)}</div>
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
      {result?summary+levelNote:' '}
      {result&&source&&<span className="rd-game__source">{tr(`From ${source.title} (${source.composer}), bar ${source.bar}`,`出自《${source.zhTitle??source.title}》（${source.composer}），第 ${source.bar} 小节`)}</span>}
    </p>

    <div className="rd-game__count"><CountInPulse beat={countIn} total={top} active={countIn>=0} zh={zh}/></div>
    <div className={`rhythm-tap__pad rd-game__pad${pressed?' is-pressed':''}${phase==='run'?' is-live':''}`} role="button" tabIndex={-1} aria-label={padLabel}
      onPointerDown={e=>{e.preventDefault();setPressed(true);press(e.timeStamp)}} onPointerUp={()=>setPressed(false)} onPointerLeave={()=>setPressed(false)} onPointerCancel={()=>setPressed(false)}>
      <span className="rhythm-tap__pad-label">{padLabel}</span>
    </div>

    <div className="rd-game__actions">
      {phase==='ready'&&<button className="rd-button" onPointerUp={e=>e.currentTarget.blur()} onClick={play}>{tr('Count me in','数拍开始')}</button>}
      {phase==='run'&&<button className="rd-button" onPointerUp={e=>e.currentTarget.blur()} onClick={()=>{audio.stop();setMarks([]);setPhase('ready')}}>{tr('Stop','停止')}</button>}
      {phase==='result'&&<>
        <button className="rd-button" onPointerUp={e=>e.currentTarget.blur()} onClick={proceed}>{lives<=0?tr('See your run','看结果'):tr('Next rhythm','下一个节奏')}</button>
        <button className="rd-button" onPointerUp={e=>e.currentTarget.blur()} onClick={hear}>{audio.elapsed>=0?tr('Stop','停止'):tr('Hear it','听一遍')}</button>
      </>}
    </div>
  </main>;
}
