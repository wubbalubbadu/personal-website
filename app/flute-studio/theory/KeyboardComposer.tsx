'use client';
import {useState} from 'react';
import Staff from './Staff';
import {pitchAt} from './model';
export default function KeyboardComposer({zh,playing,onPlay,onStop,onSave}:{zh:boolean;playing:number;onPlay:(notes:number[],offset?:number)=>void;onStop:()=>void;onSave:(notes:(number|null)[])=>void}){
  const [notes,setNotes]=useState<number[]>([]),[last,setLast]=useState<number|null>(null);
  function add(p:number){const next=notes.length<4?[...notes,p]:[...notes.slice(0,3),p];setNotes(next);setLast(p);onPlay([p],next.length-1);onSave([...next,...Array(4-next.length).fill(null)])}
  return <div className="first-keyboard-composer">
    <Staff step={5} position={2} phrase={[...notes,...Array(4-notes.length).fill(null)]} selected={Math.max(0,notes.length-1)} playing={playing} highlight={null} labels solfege zh={zh} onPosition={(p,i=0)=>{const next=notes.map((v,n)=>n===i?p:v);setNotes(next);onSave([...next,...Array(4-next.length).fill(null)]);setLast(p);onPlay([p],i)}} onHighlight={()=>{}} onSelect={()=>{}}/>
    <div className="first-keyboard-tools">
      <button disabled={!notes.length} onClick={()=>{onStop();const next=notes.slice(0,-1);setNotes(next);onSave([...next,...Array(4-next.length).fill(null)])}}>{zh?'撤回':'Undo'}</button>
      <svg className="first-compose-keys" viewBox="0 0 350 105" role="group" aria-label={zh?'点白键写旋律':'Play white keys to write a melody'}>
        {Array.from({length:8},(_,p)=><g key={p} role="button" tabIndex={0} aria-label={`${pitchAt(p).name}${pitchAt(p).octave}`} onClick={()=>add(p)} onKeyDown={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();add(p)}}}><rect x={p*42+7} y="2" width="41" height="98" rx="2" fill={playing>=0&&(last??notes[playing])===p?'#efd1cd':'white'} stroke="#888"/><text x={p*42+27} y="85" textAnchor="middle">{pitchAt(p).name}</text></g>)}
        {[1,2,3,5,6].map(i=><rect key={i} x={i*42+36} y="2" width="23" height="57" rx="2" fill="#222" aria-hidden="true"/>)}
      </svg>
      <button disabled={!notes.length} onClick={()=>{if(playing>=0)onStop();else{setLast(null);onPlay(notes)}}}>{playing>=0?(zh?'停止':'Stop'):(zh?'听一听':'Listen')}</button>
    </div>
  </div>;
}
