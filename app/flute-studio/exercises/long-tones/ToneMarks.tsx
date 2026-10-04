"use client";
import {useEffect,useState,type CSSProperties} from 'react';
import type {ScoreMarksContext} from '../../components/ScoreViewer';
import {PracticeIcon} from '../../components/PracticeIcon';
import {toneFinding,type ToneAttempt} from '../../lib/toneSession';
import {centsFromMidi,median} from '../../lib/pitch';
import type {useToneSession} from '../../lib/useToneSession';

/** The Tone Lab's own pitch pieces, shared so the reader's Close-up shows exactly what the Long Tone studio shows. */

/** The Mic switch and the one-line readout beside it (live note, time and cents, or what to do next). */
export function PitchMic({session,disabled,onToggle,zh}:{session:ReturnType<typeof useToneSession>;disabled:boolean;onToggle:()=>void;zh:boolean}){
  const running=session.status==='listening'||session.status==='starting';
  // One readout, in the row. Hints are italic so they read as the app talking,
  // not as something to press; live numbers are upright.
  const liveCents=session.live?Math.round(median(session.live.frames.slice(-6).map(f=>centsFromMidi(f.hz,session.live!.target.midi)))):0;
  const liveTone=Math.abs(liveCents)<=10?'green':Math.abs(liveCents)<=25?'amber':'red';
  const readout=session.error==='permission'?(zh?'请允许使用麦克风，然后点麦克风':'Allow the microphone, then tap Mic')
    :session.error==='silent'?(zh?'麦克风没有收到声音。检查浏览器的麦克风权限，或关掉再打开麦克风':'The microphone isn’t sending any sound. Check the browser’s mic permission, or turn Mic off and on')
    :session.error?(zh?'无法打开麦克风':'Couldn’t open the microphone')
    :session.status==='starting'?(zh?'正在打开麦克风…':'Opening microphone…')
    :running?(session.live?null:(zh?'从标记处开始吹，或点任意音符':'Play from the marker, or tap any note'))
    :session.attempts.length?(zh?`已暂停 · 已记录 ${session.attempts.length} 个音`:`Paused · ${session.attempts.length} ${session.attempts.length===1?'note':'notes'} recorded`)
    :(zh?'已暂停':'Paused');
  return <>
    {/* A mic switch, like Metronome: lit while listening. Opening Pitch turns it on; this only pauses, for talking or noise between takes. */}
    <button className={`pitch-start has-tip ${running?'is-on':''}`} style={{'--level':Math.min(1,session.level*8)} as CSSProperties} aria-pressed={running} disabled={disabled} data-tip={running?(zh?'正在聆听 · 点一下暂停':'Listening · tap to pause'):(zh?'已暂停 · 点一下继续聆听':'Paused · tap to listen')} onClick={onToggle}><PracticeIcon name="mic"/>{zh?'麦克风':'Mic'}</button>
    {readout===null&&session.live
      ?<span className="pitch-readout is-live" aria-live="off"><b>{session.live.target.pitch}</b><span>{((session.live.frames.at(-1)!.at-session.live.startedAt)/1000).toFixed(1)}s</span><span className={`grade-${liveTone}`}>{liveCents>0?`↑ ${liveCents}¢`:liveCents<0?`↓ ${-liveCents}¢`:'0¢'}</span></span>
      :<span className={`pitch-readout ${session.error?'is-error':''}`} role="status">{readout}</span>}
  </>;
}

/** The marks on the page: playhead, each note's result badge, and the running time. */
export function ToneMarks({root,version,magnify,active,cursorAfter,live,attempts,running,onSelect,zh}:Pick<ScoreMarksContext,'root'|'version'|'magnify'>&{active:number;cursorAfter:boolean;live:ToneAttempt|null;attempts:ToneAttempt[];running:boolean;onSelect:(n:number)=>void;zh:boolean}){
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

