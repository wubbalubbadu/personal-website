'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import EngravedRow from '../EngravedRow';
import {useRhythmAudio} from '../rhythm/useRhythmAudio';
import {compileRhythm,continuations,gradeTaps,type RhythmPattern,type TapMark} from './rhythmSequence';

const COUNT_Y=248,MARK_Y=278,UNIT=.75;

/**
 * One measure to tap: Count me in gives four clicks, then the learner taps the pad (or Space) on each new note.
 * Judged after the whole measure. A recorded attempt is enough to go on; only a tap on time is green, and the
 * bubble is green only when every note start was hit on time with nothing extra.
 */
/** `onSpot` hands the lesson the element Cookie should move to; `onTapped` fires on every tap so Cookie can squish. */
export default function RhythmPractice({pattern,zh,right,frame,onAttempt,onFeedback,onSpot,onTapped}:{pattern:RhythmPattern;zh:boolean;right:number;frame:string;onAttempt:()=>void;onFeedback:(text:string,tone?:'correct'|'wrong'|null)=>void;onSpot:(el:HTMLElement|null)=>void;onTapped:()=>void}){
  const audio=useRhythmAudio(),data=compileRhythm(pattern),top=pattern.top??4;
  const [mode,setMode]=useState<'idle'|'listen'|'tap'>('idle'),[marks,setMarks]=useState<TapMark[]>([]),[missing,setMissing]=useState<number[]>([]),[graded,setGraded]=useState(false);
  const taps=useRef<number[]>([]);
  const tr=(en:string,cn:string)=>zh?cn:en;
  useEffect(()=>{const hide=()=>{if(document.hidden)setMode('idle')};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide)},[]);
  function stop(){audio.stop();setMode('idle')}
  function listen(){
    if(mode==='listen'){stop();return}
    setMode('listen');
    onFeedback(data.ties.length?tr('Listen: the tied note is one sound, with no new start.','听：连起来的音是一个声音，没有重新开始。'):tr('Listen for where each note starts against the clicks.','听每个音在哪一下拍点上开始。'));
    void audio.counted({values:data.notes.map(n=>n.v),timeline:data.timeline,ties:data.ties,top,speak:false,secondsPerQuarter:UNIT,onEnd:()=>setMode('idle'),onError:()=>setMode('idle')});
  }
  function report(result:number[]){
    const grade=gradeTaps(result,data.onsets,UNIT);
    setMarks(grade.marks);setMissing(grade.missing);setGraded(true);
    if(grade.perfect){onFeedback(tr('Every note start was on time.','每个音都准时开始了。'),'correct');return}
    const extra=grade.marks.filter(m=>m.timing==='extra');
    const onTie=continuations(pattern).some(c=>extra.some(m=>Math.abs(m.at-c)<.25));
    if(onTie){onFeedback(tr('The tied note keeps sounding. It does not need another tap.','连起来的音还在响，不用再点。'),'wrong');return}
    const n=(k:number,one:string,many:string)=>k===1?one:many.replace('#',String(k));
    const parts=[
      [grade.marks.filter(m=>m.timing==='early').length,tr('1 tap was early','1 次点早了'),tr('# taps were early','# 次点早了')],
      [grade.marks.filter(m=>m.timing==='late').length,tr('1 tap was late','1 次点晚了'),tr('# taps were late','# 次点晚了')],
      [grade.missing.length,tr('1 note had no tap','1 个音没有点'),tr('# notes had no tap','# 个音没有点')],
      [extra.length,tr('1 tap had no note','1 次点击没有对应的音'),tr('# taps had no note','# 次点击没有对应的音')],
    ].filter(([k])=>k as number>0).map(([k,one,many])=>n(k as number,one as string,many as string));
    onFeedback(tr(`${parts.join(', ')}. Orange marks show where. Try again when you are ready.`,`${parts.join('，')}。橙色标记显示位置，准备好再试一次。`),'wrong');
  }
  function start(){
    stop();taps.current=[];setMarks([]);setMissing([]);setGraded(false);setMode('tap');onFeedback(tr(`${top}/4: one measure of ${top} clicks, then start.`,`${top}/4 拍：先听一小节 ${top} 下点击，然后开始。`));
    void audio.counted({values:Array(top*2).fill(1),top,notes:false,speak:false,secondsPerQuarter:UNIT,
      onEnd:()=>{setMode('idle');const result=taps.current;
        if(!result.length){onFeedback(tr('No taps came in. Tap Count me in, then tap the pad or press Space.','没有收到点击。点“数拍开始”，然后点击方块或按空格。'));return}
        onAttempt();report(result);
      },onError:()=>{setMode('idle');onFeedback(tr('Sound could not start. Tap Count me in to try again.','声音没能启动，点“数拍开始”再试。'))}});
  }
  const {position,clap}=audio;
  const tap=useCallback((at?:number)=>{if(mode!=='tap')return;const time=position(at);if(time<0)return;const offset=time/UNIT-top;if(offset<-.3||offset>top)return;taps.current.push(offset);setMarks(taps.current.map(at=>({at,onset:-1,timing:'extra'})));onTapped();void clap()},[mode,top,position,clap,onTapped]);
  useEffect(()=>{
    const key=(event:globalThis.KeyboardEvent)=>{if(mode==='tap'&&event.code==='Space'&&!event.repeat){event.preventDefault();tap(event.timeStamp)}};
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[mode,tap]);
  const offset=audio.elapsed<0?-1:audio.elapsed/UNIT-(mode==='tap'?top:0);
  // While you tap, nothing lights the notes (that would show when to tap); only the counts follow the clicks.
  const active=mode==='tap'?-1:audio.active;
  const countIn=mode==='tap'&&offset<0&&audio.beat>=0?audio.beat+1:0;
  const lit=mode==='idle'||offset<0?-1:Math.floor(offset);
  function hearNote(i:number){
    if(mode!=='idle')return;
    let end=i;
    while(data.ties.includes(end))end++;
    const timeline=data.timeline.slice(i,end+1).map(e=>({...e,at:e.at-data.timeline[i].at}));
    void audio.counted({values:timeline.map(e=>e.length),timeline,ties:data.ties.filter(n=>n>=i&&n<end).map(n=>n-i),offset:i,speak:false,click:false,secondsPerQuarter:UNIT});
  }
  const judged=graded&&mode==='idle';
  return <div className="dt-practice">
    <EngravedRow proportional notes={data.notes} ties={data.ties} beams={pattern.beams} bars={pattern.bars} clef={false} meter={{top,bottom:4}} right={right} viewBox={frame} active={active} interactive label={tr('The rhythm, with your taps under it','节奏，下面是你的点击')}>
      {l=>{const x=(t:number)=>l.beatX(Math.max(-.3,Math.min(top,t)));return <>
        {data.timeline.map((e,i)=>!data.ties.includes(i-1)&&<rect key={i} className="dt-hit" x={l.xs[i]-24} y="98" width="48" height="114" role="button" tabIndex={0} aria-label={tr(`Hear note ${i+1}`,`听第 ${i+1} 个音`)} onClick={()=>hearNote(i)} onKeyDown={ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();hearNote(i)}}}/>)}
        {Array.from({length:top},(_,b)=>b).map(b=><text key={b} className={`dt-count${lit===b?' is-lit':''}`} x={x(b)} y={COUNT_Y}>{b+1}</text>)}
        {judged&&<path className="dt-ruler" d={`M${x(0)} ${MARK_Y} H${x(top)}`}/>}
        {judged&&data.onsets.map((t,i)=><circle key={t} className={`dt-guide${missing.includes(i)?' is-missed':''}`} cx={x(t)} cy={MARK_Y} r={missing.includes(i)?7:5}/>)}
        {marks.map((m,i)=><g key={i}>
          {judged&&(m.timing==='early'||m.timing==='late')&&<path className="dt-tap-link" d={`M${x(m.at)} ${MARK_Y+22} L${x(data.onsets[m.onset])} ${MARK_Y+6}`}/>}
          <circle className={`dt-tap${judged?` is-${m.timing}`:''}`} cx={x(m.at)} cy={MARK_Y+22} r="6"/>
        </g>)}
        {countIn>0&&<text className="dt-label" x={(x(0)+x(top))/2} y={MARK_Y+60}>{tr('Get ready','准备')} {countIn}</text>}
      </>}}
    </EngravedRow>
    <div className="dt-practice-controls">
      {/* Cookie comes here from the bubble. The whole area is the tap target; Cookie itself is only the picture. */}
      <div className={`dt-tap-spot${mode==='tap'?' is-live':''}`} role="button" tabIndex={0} aria-disabled={mode!=='tap'} aria-label={tr('Tap Cookie on each new note','每个新音点一下 Cookie')}
        onPointerDown={e=>{e.preventDefault();if(mode==='tap')tap(e.timeStamp);else onTapped()}} onKeyDown={e=>{if(e.key==='Enter'&&!e.repeat){e.preventDefault();if(mode==='tap')tap(e.timeStamp)}}}>
        <span ref={onSpot} className="dt-cookie-home"/>
        <span className="dt-tap-say" aria-hidden="true">{tr('Tap on me!','点我！')}<small>{tr('or press Space','或按空格')}</small></span>
      </div>
      <div className="lesson-tools">
        <button onClick={mode==='tap'?stop:start} disabled={mode==='listen'}>{mode==='tap'?tr('Stop','停止'):tr('Count me in','数拍开始')}</button>
        <button disabled={mode==='tap'} onClick={listen}>{mode==='listen'?tr('Stop','停止'):tr('Hear it','听一遍')}</button>
      </div>
    </div>
  </div>;
}
