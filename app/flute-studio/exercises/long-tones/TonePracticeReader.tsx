'use client';
import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import { ScoreViewer, type ScoreMarksContext } from '../../components/ScoreViewer';
import { useToneSession } from '../../lib/useToneSession';
import { toneSummary, tonePitchLabel, type ToneAttempt } from '../../lib/toneSession';
import { type ToneBlock, type TonePattern } from './long-tone-score';
import { ToneTrace } from './ToneTrace';
import { ToneNotation } from './ToneNotation';
import { FluteDiagram } from '../../components/FluteDiagram';
import { fingeringsForMidi } from '../../../../content/fingerings/flute';
import { usePracticeAudio } from '../../PracticeAudio';
import './tone-trace.css';

type Props=ComponentProps<typeof ScoreViewer>&{groups:ToneBlock[];pattern:TonePattern;zh:boolean};
export function TonePracticeReader({groups:providedGroups,pattern,zh,...reader}:Props){
  // Exercise identity is keyed by the host. Layout/settings rerenders preserve the take.
  const [groups]=useState(providedGroups);
  const targets=useMemo(()=>{let id=0;return groups.flatMap((group,g)=>group.notes.map(n=>({id:id++,midi:n.midi,group:g,pitch:`${n.step}${n.alter===1?'♯':n.alter===-1?'♭':''}${n.octave}`})))},[groups]);
  const session=useToneSession(targets);
  const [enabled,setEnabled]=useState(false),[closeup,setCloseup]=useState(false),[details,setDetails]=useState(false),[feedback,setFeedback]=useState(true),[fingerings,setFingerings]=useState(false),[repeat,setRepeat]=useState(false),[review,setReview]=useState<number|null>(null);
  const {bpm,setBpm,metro:metronome,toggleMetro:toggleMetronome}=usePracticeAudio();
  const running=session.status==='listening'||session.status==='starting';
  const current=targets[session.cursor];
  const selected=targets[review??session.cursor]??current;
  const group=selected?.group??0;
  const startEvent=targets.findIndex(t=>t.group===group);
  const all=session.live?[...session.attempts,session.live]:session.attempts;
  const viewed=all.filter(a=>a.target.group===group);
  const selectedAttempts=all.filter(a=>a.target.id===selected?.id);
  const [attemptIndex,setAttemptIndex]=useState<number|null>(null);
  const analysis=review===null?viewed:(attemptIndex===null?selectedAttempts.slice(-1):selectedAttempts.filter(a=>a.id===attemptIndex));
  const select=(event:number)=>{
    setEnabled(true);
    if(running){session.select(event);setReview(null)}
    else {session.select(event);setReview(event);setAttemptIndex(null);if(all.some(a=>a.target.id===event))setDetails(true)}
  };
  const navigate=(direction:number)=>{
    const next=Math.max(0,Math.min(groups.length-1,group+direction));
    select(targets.findIndex(t=>t.group===next));
  };
  const toggle=()=>{
    setEnabled(true);setReview(null);
    if(running)session.pause();else void session.start();
  };
  const controls=<div className="tone-controls">
    <button className={`tool tone-track ${running?'on':''}`} onClick={toggle} disabled={!targets.length} aria-pressed={running}><span aria-hidden="true">{running?'Ⅱ':'◉'}</span>{running?(zh?'暂停':'Pause'):(session.attempts.length?zh?'继续':'Resume':zh?'跟踪音准':'Track pitch')}</button>
    {!closeup&&<button className="tool" aria-pressed={closeup} onClick={()=>{setEnabled(true);setCloseup(!closeup)}}>{closeup?(zh?'完整乐谱':'Full score'):(zh?'近看':'Close-up')}</button>}
    <button className="tool" aria-pressed={details} onClick={()=>setDetails(!details)}>{zh?'分析':'Analysis'}</button>
    {all.length>0&&!running&&<button className="tool" onClick={()=>{session.clear();setReview(null);setAttemptIndex(null)}}>{zh?'清除此轮':'Clear take'}</button>}
    {(enabled||all.length>0)&&<button className="tool" aria-pressed={feedback} onClick={()=>setFeedback(!feedback)}>{zh?'反馈':'Feedback'}</button>}
  </div>;
  const message=session.error==='permission'?(zh?'请在浏览器中允许麦克风，然后重试。':'Allow microphone access in your browser, then try again.'):session.error?(zh?'无法使用麦克风，请检查设备后重试。':'Could not open the microphone. Check your input device and try again.'):session.status==='starting'?(zh?'正在打开麦克风…':'Opening microphone…'):running?(session.live?`${current?.pitch} · ${((session.live.frames.at(-1)!.at-session.live.startedAt)/1000).toFixed(1)}s`:(zh?'准备好后开始吹奏':'Play when you’re ready')):session.attempts.length?(zh?'已暂停，记录已保留':'Paused. Your take is retained.'):(zh?'选择起始音符，然后跟踪音准':'Select a starting note, then track pitch.');
  const entry=current?fingeringsForMidi(current.midi):null;
  return <div className={`tone-workspace ${closeup?'is-closeup':''} ${details?'has-analysis':''}`}>
    <div className="tone-full-reader" aria-hidden={closeup||undefined}>
      <ScoreViewer {...reader} practiceActions={controls} onPracticeNote={select} practiceEvent={enabled&&!closeup?session.cursor:undefined}
        scoreMarks={context=><ToneMarks {...context} active={session.cursor} cursorAfter={session.cursorAfter} live={session.live} attempts={feedback?session.attempts:[]} enabled={enabled} onSelect={select} zh={zh}/>}/>
    </div>
    {closeup&&<section className="tone-closeup">
      <header className="tone-closeup-header"><button onClick={()=>setCloseup(false)}>‹ {zh?'完整乐谱':'Full score'}</button><span>{reader.config.title}</span><span>{group+1} / {groups.length}</span></header>
      <div className="tone-closeup-toolbar">{controls}<button aria-pressed={fingerings} onClick={()=>setFingerings(!fingerings)}>{zh?'指法':'Fingerings'}</button><button aria-pressed={metronome} onClick={()=>toggleMetronome()}>{zh?'节拍器':'Metronome'}</button><label className="tone-tempo">♩ <input aria-label={zh?'速度':'Tempo'} type="number" min="40" max="220" value={bpm} onChange={e=>{const n=+e.target.value;if(n>=40&&n<=220)setBpm(n)}}/></label></div>
      {groups[group]&&<ToneNotation block={groups[group]} pattern={pattern} active={session.cursor} cursorAfter={session.cursorAfter} startEvent={startEvent} attempts={feedback?session.attempts:[]} onSelect={select} zh={zh}/>}
      <div className="tone-closeup-status"><span className={running?'is-listening':''}>{message}</span></div>
      {fingerings&&entry&&<div className="tone-fingering"><b>{current.pitch}</b><FluteDiagram pressed={entry.fingerings[0].keys}/></div>}
      <nav className="tone-group-nav" aria-label={zh?'练习组':'Practice groups'}><button disabled={group===0} onClick={()=>navigate(-1)}>‹ {zh?'上一组':'Previous'}</button><button aria-pressed={repeat} onClick={()=>{setRepeat(!repeat);session.setRepeat(!repeat)}}>{zh?'重复这一组':'Repeat group'}</button><button disabled={group===groups.length-1} onClick={()=>navigate(1)}>{zh?'下一组':'Next'} ›</button></nav>
    </section>}
    {!closeup&&(enabled||session.error)&&<div className="tone-session-status" role="status">{message}</div>}
    {details&&<section className="tone-detail-surface">
      <header><div><strong>{review!==null?`${selected?.pitch}`:zh?'当前组':'Current group'}</strong><span>{zh?'音准与时长':'Pitch & duration'}</span></div><button aria-label={zh?'关闭分析':'Close analysis'} onClick={()=>setDetails(false)}>×</button></header>
      {!closeup&&groups[group]&&<ToneNotation block={groups[group]} pattern={pattern} active={selected?.id??0} cursorAfter={review===null&&session.cursorAfter} startEvent={startEvent} attempts={feedback?session.attempts:[]} onSelect={select} zh={zh}/>}
      {review!==null&&selectedAttempts.length>1&&<label className="tone-attempt-picker">{zh?'尝试':'Attempt'} <select value={attemptIndex??selectedAttempts.at(-1)!.id} onChange={e=>setAttemptIndex(+e.target.value)}>{selectedAttempts.map((a,i)=><option value={a.id} key={a.id}>{i+1} · {(toneSummary(a).duration/1000).toFixed(1)}s</option>)}</select></label>}
      <ToneTrace attempts={analysis} zh={zh}/>
    </section>}
    {all.length>0&&!running&&<div className="tone-take-actions"><span>{session.attempts.length} {zh?'个音符记录':'note attempts retained'}</span><button onClick={()=>{session.clear();setReview(null);setAttemptIndex(null)}}>{zh?'清除此轮反馈':'Clear this take'}</button></div>}
  </div>;
}

function ToneMarks({root,version,magnify,active,cursorAfter,live,attempts,enabled,onSelect,zh}:ScoreMarksContext&{active:number;cursorAfter:boolean;live:ToneAttempt|null;attempts:ToneAttempt[];enabled:boolean;onSelect:(n:number)=>void;zh:boolean}){
  const [positions,setPositions]=useState<{id:number;x:number;y:number;w:number;h:number;labelY:number}[]>([]);
  useEffect(()=>{
    if(!root)return;
    let frame=0;
    const measure=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
      const box=root.getBoundingClientRect(),scale=root.offsetWidth?box.width/root.offsetWidth:1;
      setPositions([...root.querySelectorAll<SVGGElement>('.vf-stavenote[data-event]')].map(node=>{
        const b=(node.querySelector('.vf-notehead path')??node.querySelector('.vf-notehead')??node).getBoundingClientRect();
        const measure=(node.closest('.vf-measure')??node).getBoundingClientRect();
        return {id:Number(node.dataset.event),x:(b.left-box.left)/scale,y:(b.top-box.top)/scale,w:b.width/scale,h:b.height/scale,labelY:(measure.bottom-b.top-b.height/2)/scale+10};
      }));
    })};
    measure();const observer=new ResizeObserver(measure);observer.observe(root);
    return()=>{cancelAnimationFrame(frame);observer.disconnect()};
  },[root,version,magnify]);
  useEffect(()=>{
    if(!root)return;
    const nodes=[...root.querySelectorAll<SVGGElement>('.vf-stavenote[data-event]')];
    for(const node of nodes){
      const attempt=attempts.filter(a=>a.target.id===Number(node.dataset.event)).at(-1);
      if(attempt)node.dataset.toneGrade=toneSummary(attempt).grade;
      else delete node.dataset.toneGrade;
    }
    return()=>{for(const node of nodes)delete node.dataset.toneGrade};
  },[root,version,attempts]);
  return <div className="tone-score-feedback">{positions.map(p=>{
    const attempt=attempts.filter(a=>a.target.id===p.id).at(-1);
    const result=attempt?toneSummary(attempt):null;
    const current=enabled&&p.id===active;
    const label=attempt?tonePitchLabel(attempt,zh):null;
    if(!current&&!result)return null;
    return <div className="tone-note-anchor" key={p.id} style={{left:p.x+p.w/2,top:p.y+p.h/2}}>
      {result&&label&&<>
        <button className="tone-note-hit" aria-label={`${attempt!.target.pitch}: ${label.description}. ${zh?'查看轨迹':'Review trace'}`} title={label.description} onClick={()=>onSelect(p.id)}/>
        <button className={`tone-pitch-badge grade-${result.grade}`} style={{top:p.labelY}} aria-label={label.description} title={label.description} onClick={()=>onSelect(p.id)}>{label.short}</button>
      </>}
      {current&&<><span className={`tone-playhead ${cursorAfter?'is-after':''}`} style={{left:cursorAfter?p.w/2+12:-p.w/2-10}}/><span className="tone-note-time" style={{top:result?p.labelY+20:30}}>{live?`${((live.frames.at(-1)!.at-live.startedAt)/1000).toFixed(1)}s`:cursorAfter?(zh?'已完成':'Finished'):(zh?'开始':'Start here')}</span></>}

    </div>;
  })}</div>;
}
