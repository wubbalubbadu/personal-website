'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import EngravedRow from '../EngravedRow';
import CookieButton from '../CookieButton';
import {useRhythmAudio} from '../rhythm/useRhythmAudio';
import {compileRhythm,matchTapPositions,type RhythmPattern} from './rhythmSequence';

export default function RhythmPractice({pattern,zh,onAttempt,onFeedback}:{pattern:RhythmPattern;zh:boolean;onAttempt:()=>void;onFeedback:(text:string)=>void}){
  const audio=useRhythmAudio(),data=compileRhythm(pattern);
  const [mode,setMode]=useState<'idle'|'listen'|'tap'>('idle'),[marks,setMarks]=useState<number[]>([]),[finished,setFinished]=useState(false),[slow,setSlow]=useState(false);
  const taps=useRef<number[]>([]),unit=slow?1:.8;
  const tr=(en:string,cn:string)=>zh?cn:en;
  useEffect(()=>{const hide=()=>{if(document.hidden){setMode('idle');setFinished(false)}};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide)},[]);
  function stop(){audio.stop();setMode('idle')}
  function listen(){
    if(mode==='listen'){stop();return}
    setMode('listen');
    onFeedback(pattern.tuplets?.length?tr('Listen for equal spaces inside the beat. The main clicks stay steady.','听每拍里均匀的间隔，主拍保持不变。'):data.ties.length?tr('Listen through the tie: one start, then a continuous sound.','听延音线：只开始一次，然后声音持续。'):tr('Listen for each new note starting against the steady clicks.','听每个新音从稳定拍子的哪里开始。'));
    void audio.counted({values:data.notes.map(n=>n.v),timeline:data.timeline,ties:data.ties,speak:false,secondsPerQuarter:unit,onEnd:()=>setMode('idle'),onError:()=>setMode('idle')});
  }
  function start(){
    stop();taps.current=[];setMarks([]);setFinished(false);setMode('tap');onFeedback(tr('Four counts to get ready. Then tap only when a new note begins.','先数四拍准备，然后只在新音开始时点。'));
    void audio.counted({values:Array(8).fill(1),notes:false,speak:false,secondsPerQuarter:unit,
      onEnd:()=>{setMode('idle');setFinished(true);const result=taps.current;
        if(!result.length){onFeedback(tr('No taps recorded. Tap Count me in, then use Cookie or Space.','没有记录到点击。点数拍开始，再点 Cookie 或按空格。'));return}
        onAttempt();
        if(pattern.tuplets?.length){onFeedback(tr('Your taps are shown below the beat grid. Compare the spacing, then retry or move on.','你的点击显示在拍子下方。比较间隔，再试一次或继续。'));return}
        const match=matchTapPositions(result,data.onsets,unit);
        if(data.ties.length&&result.some(t=>Math.abs(t-1)<match.window))onFeedback(tr('The note on beat 2 continues through the tie. It does not need another tap.','第 2 拍的音通过延音线继续，不用再点。'));
        else onFeedback(match.missing.length===0&&match.matched.every(i=>i>=0)?tr('Your note starts lined up with this rhythm.','你的起音与这个节奏对齐了。'):tr('Compare your tap marks with the small guide marks. You can slow down and try again.','把你的点击和小标记比一比，也可以放慢再试。'));
      },onError:()=>{setMode('idle');onFeedback(tr('Sound could not start. Tap Count me in to try again.','声音未能启动，点数拍开始再试。'))}});
  }
  const {position,clap}=audio;
  const tap=useCallback(()=>{if(mode!=='tap')return;const time=position();if(time<0)return;const offset=time/unit-4;if(offset<-.18||offset>4)return;taps.current.push(offset);setMarks([...taps.current]);void clap()},[mode,unit,position,clap]);
  useEffect(()=>{
    const key=(event:globalThis.KeyboardEvent)=>{if(mode==='tap'&&event.code==='Space'&&!event.repeat){event.preventDefault();tap()}};
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[mode,tap]);
  const offset=audio.elapsed<0?-1:audio.elapsed/unit-(mode==='tap'?4:0);
  const active=mode==='tap'?(offset>=0?data.timeline.findIndex(e=>offset>=e.at&&offset<e.at+e.length):-1):audio.active;
  function hearNote(i:number){
    if(mode!=='idle')return;
    let end=i;
    while(data.ties.includes(end))end++;
    const timeline=data.timeline.slice(i,end+1).map(e=>({...e,at:e.at-data.timeline[i].at}));
    void audio.counted({values:timeline.map(e=>e.length),timeline,ties:data.ties.filter(n=>n>=i&&n<=end).map(n=>n-i),offset:i,speak:false,click:false,secondsPerQuarter:unit});
  }
  const x=(t:number)=>145+t*151;
  return <div className="dt-practice">
    <EngravedRow notes={data.notes} ties={data.ties} tuplets={pattern.tuplets} beams={pattern.beams} bars={pattern.bars} clef={false} meter={{top:4,bottom:4}} right={820} viewBox="20 64 830 300" active={active} interactive label={tr('Rhythm and your tap positions','节奏和你的点击位置')}>
      {l=><>
        {data.timeline.map((e,i)=>!data.ties.includes(i-1)&&e.midi!==null&&<rect key={i} className="dt-hit" x={l.xs[i]-24} y="98" width="48" height="111" role="button" tabIndex={0} aria-label={tr(`Hear note ${i+1}`,`听第 ${i+1} 个音`)} onClick={()=>hearNote(i)} onKeyDown={ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();hearNote(i)}}}/>)}
        <path className="dt-span" d={`M${x(0)} 284 H${x(4)}`}/>
        {[0,1,2,3,4].map(b=><g key={b}><path className="dt-span" d={`M${x(b)} 277 v14`}/>{b<4&&<text className="dt-count" x={x(b)} y="263">{b+1}</text>}</g>)}
        {data.onsets.map(t=><circle key={t} className="dt-guide" cx={x(t)} cy="284" r="4"/>)}
        {marks.map((t,i)=><circle key={i} className="dt-tap" cx={x(t)} cy="308" r="5"/>)}
        {offset>=0&&offset<4&&<circle className="dt-cursor" cx={x(offset)} cy="284" r="7"/>}
        {mode==='tap'&&offset<0&&<text className="dt-count" x="440" y="343">{tr('Get ready','准备')} {audio.beat>=0?audio.beat+1:'…'}</text>}
        {mode!=='tap'&&<text className="dt-label" x="440" y="348">{finished?tr('Beat grid above · your taps below','上方是拍子，下方是你的点击'):tr('Beat grid','拍子时间线')}</text>}
      </>}
    </EngravedRow>
    <div className="dt-practice-controls">
      <CookieButton disabled={mode!=='tap'} aria-label={tr('Tap the rhythm','点出节奏')} onPointerDown={e=>{e.preventDefault();tap()}} onKeyDown={e=>{if(e.key==='Enter'&&!e.repeat){e.preventDefault();tap()}}}/>
      <div className="lesson-tools">
        <button onClick={mode==='tap'?stop:start} disabled={mode==='listen'}>{mode==='tap'?tr('Stop','停止'):tr('Count me in','数拍开始')}</button>
        <button aria-pressed={slow} disabled={mode!=='idle'} onClick={()=>setSlow(s=>!s)}>{slow?tr('Slow pace','慢速'):tr('Slower','放慢')}</button>
        <button disabled={mode==='tap'} onClick={listen}>{mode==='listen'?tr('Stop example','停止示范'):tr('Hear the rhythm','听节奏')}</button>
      </div>
    </div>
    {audio.error&&<p role="alert" className="dt-audio-error">{tr('Audio unavailable. Try starting again.','声音暂时无法播放，请重新开始。')}</p>}
  </div>;
}
