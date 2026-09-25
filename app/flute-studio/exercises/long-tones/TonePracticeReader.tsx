'use client';
import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { ScoreViewer, type ScoreMarksContext } from '../../components/ScoreViewer';
import { useToneSession } from '../../lib/useToneSession';
import { toneFinding, type ToneAttempt } from '../../lib/toneSession';
import { type ToneBlock, type TonePattern } from './long-tone-score';
import { appendPitchHistory, recordsFromAttempts, sessionReport, HOLD_GOAL_MS, type PitchReport } from '../../lib/pitchHistory';
import { ToneTrace } from './ToneTrace';
import { ToneNotation } from './ToneNotation';
import { FluteDiagram } from '../../components/FluteDiagram';
import { fingeringsForMidi } from '../../../../content/fingerings/flute';
import { PracticeIcon, SpectrumDef } from '../../components/PracticeIcon';
import { centsFromMidi, median } from '../../lib/pitch';
import './tone-trace.css';

type Props=ComponentProps<typeof ScoreViewer>&{groups:ToneBlock[];pattern:TonePattern;zh:boolean};
export function TonePracticeReader({groups:providedGroups,pattern,zh,...reader}:Props){
  // Exercise identity is keyed by the host. Layout/settings rerenders preserve the take.
  const [groups]=useState(providedGroups);
  const targets=useMemo(()=>{let id=0;return groups.flatMap((group,g)=>group.notes.map(n=>({id:id++,midi:n.midi,group:g,pitch:`${n.step}${n.alter===1?'♯':n.alter===-1?'♭':''}${n.octave}`})))},[groups]);
  const session=useToneSession(targets);
  // Pitch is a mode, like Mark up: one toolbar button opens its own row, and
  // everything it adds to the page (marks, playhead, note taps) exists only
  // while that row is open. Results survive closing it and reappear on reopen.
  const [enabled,setEnabled]=useState(false),[closeup,setCloseup]=useState(false),[details,setDetails]=useState(false),[repeat,setRepeat]=useState(false),[review,setReview]=useState<number|null>(null),[confirmClear,setConfirmClear]=useState(false),[report,setReport]=useState<PitchReport|null>(null);
  // Attempts already written to history, so closing twice never counts a note twice.
  const saved=useRef(new Set<number>());
  const running=session.status==='listening'||session.status==='starting';
  const current=targets[session.cursor];
  const selected=targets[review??session.cursor]??current;
  const group=selected?.group??0;
  const startEvent=targets.findIndex(t=>t.group===group);
  const all=session.live?[...session.attempts,session.live]:session.attempts;
  // The graph shows the current group as it was last played: replaying a note
  // replaces it (see ToneSession), so there is only ever one take to show.
  const take=all.filter(a=>a.target.group===group).sort((a,b)=>a.target.id-b.target.id);
  const highlighted=review===null?null:take.find(a=>a.target.id===review)?.id??null;
  // Clearing cannot be undone, so it takes a second tap rather than a dialog.
  useEffect(()=>{if(!confirmClear)return;const timer=setTimeout(()=>setConfirmClear(false),3000);return()=>clearTimeout(timer)},[confirmClear]);
  const select=(event:number)=>{
    setEnabled(true);
    if(running){session.select(event);setReview(null)}
    else {session.select(event);setReview(event);if(!closeup&&all.some(a=>a.target.id===event))setDetails(true)}
  };
  const navigate=(direction:number)=>{
    const next=Math.max(0,Math.min(groups.length-1,group+direction));
    select(targets.findIndex(t=>t.group===next));
  };
  const toggleListening=()=>{
    setReview(null);
    if(running)session.pause();else void session.start();
  };
  const saveTake=()=>{
    const fresh=session.attempts.filter(a=>!saved.current.has(a.id));
    fresh.forEach(a=>saved.current.add(a.id));
    const records=recordsFromAttempts(fresh,reader.config.title,Date.now(),session.firstTry);
    appendPitchHistory(records);
    return records;
  };
  const closeMode=()=>{
    if(running)session.pause();
    // Closing is the natural end of a session: keep it, and say how it went.
    const records=saveTake();
    setReport(records.length?sessionReport(records):null);
    setEnabled(false);setCloseup(false);setDetails(false);setReview(null);setConfirmClear(false);
  };
  const saveRef=useRef(saveTake);
  useEffect(()=>{saveRef.current=saveTake});
  useEffect(()=>{const keep=()=>saveRef.current();window.addEventListener('pagehide',keep);return()=>window.removeEventListener('pagehide',keep)},[]);
  const clearTake=()=>{
    if(!confirmClear){setConfirmClear(true);return}
    // Clear throws this take away before it reaches your history.
    session.clear();saved.current.clear();setReview(null);setConfirmClear(false);
  };
  const pitchButton=<button className={`tool has-tip pitch-mode-trigger ${enabled?'on':''}`} aria-pressed={enabled} data-tip={zh?'检查每个音的音准':'Check the pitch of each note you play'} onClick={()=>{if(enabled)closeMode();else{setEnabled(true);setReport(null);if(targets.length)void session.start()}}}><SpectrumDef id="pitch-spectrum" stops={COOL_STOPS}/><PracticeIcon name="tuner" gradient="pitch-spectrum"/><span className="pitch-mode-label">{zh?'音准':'Pitch'}</span></button>;
  // One readout, in the row. Hints are italic so they read as the app talking,
  // not as something to press; live numbers are upright.
  const liveCents=session.live?Math.round(median(session.live.frames.slice(-6).map(f=>centsFromMidi(f.hz,session.live!.target.midi)))):0;
  const liveTone=Math.abs(liveCents)<=10?'green':Math.abs(liveCents)<=25?'amber':'red';
  const readout=session.error==='permission'?(zh?'请允许使用麦克风，然后点麦克风':'Allow the microphone, then tap Mic')
    :session.error?(zh?'无法打开麦克风':'Couldn’t open the microphone')
    :session.status==='starting'?(zh?'正在打开麦克风…':'Opening microphone…')
    :running?(session.live?null:(zh?'从标记处开始吹，或点任意音符':'Play from the marker, or tap any note'))
    :session.attempts.length?(zh?`已暂停 · 已记录 ${session.attempts.length} 个音`:`Paused · ${session.attempts.length} ${session.attempts.length===1?'note':'notes'} recorded`)
    :(zh?'已暂停':'Paused');
  const pitchRow=enabled&&<div className="pitch-row"><div className="pitch-row-surface" role="toolbar" aria-label={zh?'音准工具':'Pitch tools'}>
    {/* A mic switch, like Metronome: lit while listening. Opening Pitch turns it on; this only pauses, for talking or noise between takes. */}
    <button className={`pitch-start has-tip ${running?'is-on':''}`} aria-pressed={running} disabled={!targets.length} data-tip={running?(zh?'正在聆听 · 点一下暂停':'Listening · tap to pause'):(zh?'已暂停 · 点一下继续聆听':'Paused · tap to listen')} onClick={toggleListening}><PracticeIcon name="mic"/>{zh?'麦克风':'Mic'}</button>
    {readout===null&&session.live
      ?<span className="pitch-readout is-live" aria-live="off"><b>{session.live.target.pitch}</b><span>{((session.live.frames.at(-1)!.at-session.live.startedAt)/1000).toFixed(1)}s</span><span className={`grade-${liveTone}`}>{liveCents>0?`↑ ${liveCents}¢`:liveCents<0?`↓ ${-liveCents}¢`:'0¢'}</span></span>
      :<span className={`pitch-readout ${session.error?'is-error':''}`} role="status">{readout}</span>}
    <span className="divider"/>
    <button className="has-tip" aria-pressed={closeup} data-tip={zh?'放大一组音，并在下方显示音准图':'Show one group large, with its pitch graph underneath'} onClick={()=>{if(!closeup)setDetails(true);setCloseup(!closeup)}}>{zh?'近看':'Close-up'}</button>
    <button className="has-tip" aria-pressed={details} data-tip={zh?'显示这一组的音准随时间的变化':'Show how the pitch moved over time for this group'} onClick={()=>setDetails(!details)}>{zh?'图表':'Graph'}</button>
    {/* Always in the row, grayed out until there is a take, like Mark up's trash. */}
    <button disabled={!all.length} className={`pitch-clear has-tip ${confirmClear?'is-confirming':''}`} data-tip={zh?'清除这次练习的所有结果':'Remove every result from this session'} onClick={clearTake}>{confirmClear?(zh?'再点一次清除':'Tap again to clear'):(zh?'清除':'Clear')}</button>
    <span className="divider"/>
    <button className="pitch-close" onClick={closeMode}>{zh?'关闭':'Close'}</button>
  </div></div>;
  const groupLine=targets.filter(t=>t.group===group).map(t=>t.pitch).join(' → ');
  const graph=<div className="tone-graph">
    <header className="tone-graph-head">
      <strong>{zh?`第 ${group+1} 组`:`Group ${group+1}`}</strong><span>{groupLine}</span>
    </header>
    <ToneTrace attempts={take} selectedId={highlighted} onSelect={id=>{const a=take.find(x=>x.id===id);if(a)setReview(a.target.id)}} zh={zh}/>
  </div>;
  const shownNote=targets[review??session.cursor];
  const entry=shownNote?fingeringsForMidi(shownNote.midi):null;
  // Close-up takes over the music area only. The toolbar, the pitch row and the
  // metronome all stay where they are, so it reads as a view, not a new page.
  // Fingering follows the reader's own View setting instead of a second switch.
  const stage=enabled&&closeup?({fingering}:{fingering:boolean})=><section className="tone-closeup" aria-label={zh?'近看':'Close-up'}>
    <nav className="tone-group-nav" aria-label={zh?'练习组':'Practice groups'}>
      <button disabled={group===0} onClick={()=>navigate(-1)}>‹ {zh?'上一组':'Previous'}</button>
      <span className="tone-group-count">{group+1} / {groups.length}</span>
      <button disabled={group===groups.length-1} onClick={()=>navigate(1)}>{zh?'下一组':'Next'} ›</button>
      <button className="has-tip" aria-pressed={repeat} data-tip={zh?'演奏完这一组后回到开头':'Go back to the start of this group when you finish it'} onClick={()=>{setRepeat(!repeat);session.setRepeat(!repeat)}}>{zh?'重复这一组':'Repeat group'}</button>
    </nav>
    <div className="tone-closeup-music">
      {groups[group]&&<ToneNotation block={groups[group]} pattern={pattern} active={session.cursor} cursorAfter={session.cursorAfter} startEvent={startEvent} attempts={session.attempts} onSelect={select} zh={zh} live={session.live} running={running}/>}
      {fingering&&entry&&<div className="tone-fingering"><b>{shownNote.pitch}</b><FluteDiagram pressed={entry.fingerings[0].keys}/></div>}
    </div>
    {details&&graph}
  </section>:undefined;
  return <div className="tone-workspace">
    <ScoreViewer {...reader} practiceActions={pitchButton} practiceRow={pitchRow} stage={stage}
      dock={enabled&&details&&!closeup?<div className="tone-dock">
          {groups[group]&&<div className="tone-dock-music"><ToneNotation block={groups[group]} pattern={pattern} active={selected?.id??0} cursorAfter={review===null&&session.cursorAfter} startEvent={startEvent} attempts={session.attempts} onSelect={select} zh={zh}/></div>}
          {graph}<button className="tone-dock-close" aria-label={zh?'关闭图表':'Close graph'} onClick={()=>setDetails(false)}>×</button></div>
        :!enabled&&report?<PitchReportCard report={report} zh={zh} onDone={()=>setReport(null)}/>:undefined}
      onPracticeNote={enabled?select:undefined} practiceEvent={enabled&&!closeup?session.cursor:undefined}
      scoreMarks={enabled?context=><ToneMarks {...context} active={session.cursor} cursorAfter={session.cursorAfter} live={session.live} attempts={session.attempts} running={running} onSelect={select} zh={zh}/>:undefined}/>
  </div>;
}

/** Cooler sweep than Tones' warm one: Pitch is the "listening" tool, Tones the "choosing" one. */
const COOL_STOPS=['#5fb3b3','#5b9bd5','#7c83db','#9a7fd1','#5fb3b3'];

function ToneMarks({root,version,magnify,active,cursorAfter,live,attempts,running,onSelect,zh}:ScoreMarksContext&{active:number;cursorAfter:boolean;live:ToneAttempt|null;attempts:ToneAttempt[];running:boolean;onSelect:(n:number)=>void;zh:boolean}){
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
  return <div className="tone-score-feedback">{positions.map(p=>{
    const attempt=attempts.filter(a=>a.target.id===p.id).at(-1);
    const finding=attempt?toneFinding(attempt,zh):null;
    const current=p.id===active;
    if(!current&&!finding)return null;
    return <div className="tone-note-anchor" key={p.id} style={{left:p.x+p.w/2,top:p.y+p.h/2}}>
      {finding&&<>
        <button className="tone-note-hit" aria-label={`${attempt!.target.pitch}: ${finding.text}`} title={finding.text} onClick={()=>onSelect(p.id)}/>
        <button className={`tone-pitch-badge grade-${finding.grade} kind-${finding.kind}`} style={{top:p.labelY}} aria-label={finding.text} title={finding.text} onClick={()=>onSelect(p.id)}>{finding.short}</button>
      </>}
      {current&&<><span className={`tone-playhead ${cursorAfter?'is-after':''}`} style={{left:cursorAfter?p.w/2+12:-p.w/2-10}}/>{(live||(!cursorAfter&&!running))&&<span className="tone-note-time" style={{top:finding?p.labelY+30:30}}>{live?`${((live.frames.at(-1)!.at-live.startedAt)/1000).toFixed(1)}s`:(zh?'从这里开始':'Start here')}</span>}</>}

    </div>;
  })}</div>;
}

/** Shown once, when Pitch closes: this session in four facts, and the way to the long view. */
function PitchReportCard({report,zh,onDone}:{report:PitchReport;zh:boolean;onDone:()=>void}){
  const secs=(ms:number)=>(ms/1000).toFixed(1);
  const worst=report.worst.map(r=>{
    const ending=r.drift<-10&&Math.abs(r.drift)>Math.abs(r.center);
    const cents=ending?r.drift:r.center;
    return `${r.pitch} ${ending?(zh?'尾':'end '):''}${cents<0?'↓':'↑'}${Math.abs(cents)}¢`;
  });
  return <section className="tone-dock tone-report" aria-label={zh?'本次练习报告':'Session report'}>
    <header className="tone-graph-head"><strong>{zh?'本次练习':'This session'}</strong><span>{zh?'已保存到你的练习记录':'Saved to your practice history'}</span></header>
    <ul className="tone-report-facts">
      <li><b>{report.notes}</b><span>{zh?'个音':report.notes===1?'note':'notes'}</span></li>
      <li className={report.needWork?'is-warn':''}><b>{report.needWork}</b><span>{zh?'需要练习':'need work'}</span></li>
      <li><b>{report.longNotes?`${report.endingDrops}/${report.longNotes}`:'—'}</b><span>{zh?'长音结尾下降':'long notes drop at the end'}</span></li>
      <li><b>{secs(report.medianHoldMs)}s</b><span>{zh?'平均保持':'typical hold'}</span></li>
    </ul>
    {worst.length>0&&<p className="tone-report-line">{zh?'先练：':'Start with: '}{worst.join(' · ')}</p>}
    {report.medianHoldMs<HOLD_GOAL_MS&&report.notes>=3&&<p className="tone-report-line">{zh?`试着把每个音保持到 ${HOLD_GOAL_MS/1000} 秒。`:`Try holding each note for ${HOLD_GOAL_MS/1000}s.`}</p>}
    <footer><a href="/flute-studio/practice#pitch">{zh?'查看你的音准倾向 ›':'See your pitch tendencies ›'}</a><button onClick={onDone}>{zh?'完成':'Done'}</button></footer>
  </section>;
}
