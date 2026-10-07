"use client";
import Link from 'next/link';
import {useLanguage} from '../i18n/LanguageContext';
import {useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {useToneSession} from '../lib/useToneSession';
import {appendPitchHistory,recordsFromAttempts} from '../lib/pitchHistory';
import {ToneMarks,PitchMic} from '../exercises/long-tones/ToneMarks';
import {ToneTrace} from '../exercises/long-tones/ToneTrace';
import {attackTargets} from './practiceDisplay';
import type {ScoreMarksContext} from './ScoreViewer';
import '../exercises/long-tones/tone-trace.css';

export type PitchMarks=(context:Pick<ScoreMarksContext,'root'|'version'>)=>ReactNode;

/**
 * Close-up's Pitch mode is the Tone Lab, on the selected notes: the same listener, the same marks on the
 * page, the same Mic readout and pitch graph, and the same save to your pitch history.
 *
 * A hook rather than a component, so the Original row it marks stays mounted when Pitch is switched on or
 * off (rebuilding that row on every switch made the panel blink). The session lives as long as the close-up
 * (the host keys it per selection); `on` starts and pauses the microphone, and leaving Pitch keeps the take.
 */
export function usePitchPractice({xml,title,on,silence,onStart}:{xml:string;title:string;on:boolean;/** Something else is making sound: stop listening so it is not heard as the player. */silence:boolean;onStart:()=>void}){
  const {lang}=useLanguage(),zh=lang==='zh';
  const targets=useMemo(()=>attackTargets(xml),[xml]);
  const session=useToneSession(targets),{pause,start}=session;
  const running=session.status==='listening'||session.status==='starting';
  // The graph opens from the row's Graph button, or by tapping a note that has a result (as in the Tone Lab).
  const [graph,setGraph]=useState(false);
  const select=(id:number)=>{const index=targets.findIndex(t=>t.id===id);if(index<0)return;session.select(index);if(session.attempts.some(a=>a.target.id===id))setGraph(true)};
  // Results go to the pitch history once each, when Pitch closes or the page is left, like the Tone Lab.
  const saved=useRef(new Set<number>()),save=useRef(()=>{});
  useEffect(()=>{save.current=()=>{
    const fresh=session.attempts.filter(a=>!saved.current.has(a.id));
    fresh.forEach(a=>saved.current.add(a.id));
    if(fresh.length)appendPitchHistory(recordsFromAttempts(fresh,title,Date.now(),session.firstTry));
  }});
  // Switching Pitch on starts listening, like the Tone Lab's Pitch button; switching it off pauses and keeps the take.
  const startRef=useRef(()=>{});
  useEffect(()=>{startRef.current=()=>{onStart();void start()}});
  useEffect(()=>{if(on){if(targets.length)startRef.current()}else{pause();save.current()}},[on,targets.length,pause]);
  useEffect(()=>{if(silence&&running)pause()},[silence,running,pause]);
  useEffect(()=>{const keep=()=>save.current();window.addEventListener('pagehide',keep);return()=>{window.removeEventListener('pagehide',keep);keep()}},[]);
  const all=session.live?[...session.attempts,session.live]:session.attempts;
  const take=[...all].sort((a,b)=>a.target.id-b.target.id);
  const marks:PitchMarks=({root,version})=><ToneMarks root={root} version={version} magnify={1} active={targets[session.cursor]?.id??-1} cursorAfter={session.cursorAfter} live={session.live} attempts={session.attempts} running={running} onSelect={select} zh={zh}/>;
  const panel=<div className="tone-workspace pitch-practice">
    <div className="pitch-row"><div className="pitch-row-surface" role="toolbar" aria-label={zh?"音准工具":"Pitch tools"}>
      <PitchMic session={session} disabled={!targets.length} onToggle={()=>{if(running)pause();else startRef.current()}} zh={zh}/>
      <span className="divider"/>
      <button type="button" className="has-tip" aria-pressed={graph} data-tip={zh?"查看音高随时间的变化":"Show how the pitch moved over time"} onClick={()=>setGraph(!graph)}>{zh?"曲线":"Graph"}</button>
      <button type="button" disabled={!all.length} onClick={()=>{session.clear();saved.current.clear();session.select(0)}}>{zh?"清除":"Clear"}</button>
      <span className="divider"/>
      <Link className="pitch-history" href="/flute-studio/practice#pitch">{zh?"音准记录":"Pitch history"} ›</Link>
    </div></div>
    {graph&&<div className="tone-graph">
      <ToneTrace attempts={take} selectedId={null} onSelect={id=>{const a=take.find(x=>x.id===id);if(a)select(a.target.id)}} zh={zh}/>
    </div>}
  </div>;
  return {marks,onNote:select,panel};
}
