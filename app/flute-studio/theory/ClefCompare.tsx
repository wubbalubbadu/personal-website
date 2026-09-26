'use client';
import TrebleClef from './TrebleClef';
import QuarterNote from './QuarterNote';
import {BassClef,AltoClef} from './OtherClefs';
import {noteY} from './model';

export type ClefName='treble'|'bass'|'alto';
// Each clef names one line: the note shown sits on it (G4, F3, middle C).
export const CLEFS:Record<ClefName,{line:number;letter:string;midi:number}>={
  treble:{line:2,letter:'G',midi:67},
  bass:{line:6,letter:'F',midi:53},
  alto:{line:4,letter:'C',midi:60},
};

export default function ClefCompare({clef,zh,onClef,onHear}:{clef:ClefName;zh:boolean;onClef:(clef:ClefName)=>void;onHear:(midi:number)=>void}){
  const {line,letter,midi}=CLEFS[clef];
  const names:Record<ClefName,string>={treble:zh?'高音谱号':'Treble clef',bass:zh?'低音谱号':'Bass clef',alto:zh?'中音谱号':'Alto clef'};
  return <div className="clef-compare">
    <svg className="theory-staff" viewBox="0 40 760 245" preserveAspectRatio="xMidYMid meet" role="group" aria-label={names[clef]}>
      {[0,2,4,6,8].map(p=><line key={p} x1="55" x2="705" y1={noteY(p)} y2={noteY(p)} className={`theory-staff-line ${p===line?'is-lit':''}`}/>)}
      <g key={clef} className="clef-compare-glyph">{clef==='treble'?<TrebleClef/>:clef==='bass'?<BassClef/>:<AltoClef/>}</g>
      <g role="button" tabIndex={0} aria-label={zh?`播放 ${letter}`:`Play ${letter}`} className="clef-compare-note" style={{transform:`translate(420px,${noteY(line)}px)`}}
        onClick={()=>onHear(midi)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onHear(midi)}}}>
        <circle r="30" fill="transparent"/><QuarterNote down={line>=4}/>
      </g>
      <text x="724" y={noteY(line)+5} className="theory-line-label">{zh?`${letter} 线`:`${letter} line`}</text>
    </svg>
    <div className="lesson-choices" role="group" aria-label={zh?'选择谱号':'Choose a clef'}>
      {(Object.keys(CLEFS) as ClefName[]).map(name=><button key={name} aria-pressed={clef===name} className={clef===name?'is-picked':''} onClick={()=>{onClef(name);onHear(CLEFS[name].midi)}}>{names[name]}<span>{CLEFS[name].letter} {zh?'谱号':'clef'}</span></button>)}
    </div>
  </div>;
}
