'use client';
import EngravedRow from '../theory/EngravedRow';
import {compileRhythm,type RhythmPattern} from '../theory/dots-and-ties/rhythmSequence';
import '../theory/dots-and-ties/dots-and-ties.css';
import './rhythm-drills-preview.css';

/**
 * The Rhythm drills card acts out one drill: the same staff and tap marks as the real page. Taps land under each note
 * one after another (one a little late, in orange, the way grading shows it), then the row starts over.
 * CSS only; with reduced motion the marks simply show.
 */
const PATTERN:RhythmPattern={id:'preview',top:4,items:[{written:1},{written:.5},{written:.5},{written:1.5},{written:.5}],beams:[[1,2]]};
const LATE=3;
const MARK_Y=278;

export default function RhythmDrillsPreview(){
  const data=compileRhythm(PATTERN);
  return <div className="rd-preview" aria-hidden="true">
    <EngravedRow proportional clef={false} notes={data.notes} beams={PATTERN.beams} meter={{top:4,bottom:4}} right={620} viewBox="20 70 630 250">
      {l=><>
        {[0,1,2,3].map(b=><text key={b} className="dt-count" x={l.beatX(b)} y={248}>{b+1}</text>)}
        <path className="dt-ruler" d={`M${l.beatX(0)} ${MARK_Y} H${l.beatX(4)}`}/>
        {data.onsets.map((t,i)=><g key={i} className="rd-preview__tap" style={{animationDelay:`${.3+i*.45}s`}}>
          <circle className="dt-guide" cx={l.beatX(t)} cy={MARK_Y} r="5"/>
          {i===LATE&&<path className="dt-tap-link" d={`M${l.beatX(t+.18)} ${MARK_Y+22} L${l.beatX(t)} ${MARK_Y+6}`}/>}
          <circle className={`dt-tap ${i===LATE?'is-late':'is-on'}`} cx={l.beatX(i===LATE?t+.18:t)} cy={MARK_Y+22} r="7"/>
        </g>)}
      </>}
    </EngravedRow>
  </div>;
}
