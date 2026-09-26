'use client';
import {useEffect,useRef,useState} from 'react';
import TrebleClef from './TrebleClef';
import QuarterNote from './QuarterNote';
import {noteY,SOLFEGE,ledgerLines} from './model';
import {notationPitch} from './sequence';
export default function LedgerExplorer({zh,onHear}:{zh:boolean;onHear:(midi:number)=>void}){
  const [start,setStart]=useState(0),[active,setActive]=useState<number|null>(null);
  const touched=useRef(false);
  useEffect(()=>{
    const timers=[setTimeout(()=>{if(!touched.current)setStart(2)},650),setTimeout(()=>{if(!touched.current){setStart(3);setActive(10)}},1350)];
    return()=>timers.forEach(clearTimeout);
  },[]);
  return <div className="ledger-explorer"><svg className="sequence-staff" viewBox="0 40 760 245" preserveAspectRatio="xMidYMax meet" role="group" aria-label={zh?'延伸五线谱':'Extend the staff'}>
    {[0,2,4,6,8].map(p=><line key={p} x1="55" x2="705" y1={noteY(p)} y2={noteY(p)} className="sequence-line"/>)}<TrebleClef/>
    {Array.from({length:20},(_,i)=>i-4).map(p=>{const pitch=notationPitch(p),visible=p>=start&&p<start+8;return <g key={p} aria-hidden={!visible} role={visible?'button':undefined} tabIndex={visible?0:-1} aria-label={`${pitch.name}${pitch.octave}`} className={`sequence-note ${visible?'is-visible':''} ${active===p?'is-playing':''}`} style={{transform:`translate(${200+(p-start)*65}px,${noteY(p)}px)`}} onClick={()=>{setActive(p);onHear(pitch.midi)}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setActive(p);onHear(pitch.midi)}}}>
      <circle className="sequence-hit" r="26"/>{ledgerLines(p).map(line=><line key={line} x1="-24" x2="24" y1={noteY(line)-noteY(p)} y2={noteY(line)-noteY(p)} className="sequence-ledger"/>)}<QuarterNote down={p>=4}/><text className="sequence-note-name is-visible" y={256-noteY(p)}>{pitch.name}<tspan x="0" dy="19">{SOLFEGE[pitch.name]}</tspan></text>
    </g>})}
  </svg><label className="ledger-slider"><span>{zh?'更低':'Lower'}</span><input type="range" min="-4" max="6" step="1" value={start} aria-label={zh?'探索更低或更高的音':'Explore lower or higher notes'} onChange={e=>{touched.current=true;setStart(Number(e.target.value));setActive(null)}}/><span>{zh?'更高':'Higher'}</span></label></div>;
}
