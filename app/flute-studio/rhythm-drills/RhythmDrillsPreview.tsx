'use client';
import EngravedRow from '../theory/EngravedRow';
import {compileRhythm,type RhythmPattern} from '../theory/dots-and-ties/rhythmSequence';
import '../theory/dots-and-ties/dots-and-ties.css';
import './rhythm-drills-preview.css';

/**
 * The Rhythm drills card: one engraved bar with a tap mark appearing under each note in turn, then starting over.
 * Ink only and no counts (Nov 12): the grading colours and beat numbers were too much for a tile.
 * CSS only; with reduced motion the marks simply show.
 */
const PATTERN:RhythmPattern={id:'preview',top:4,items:[{written:1},{written:.5},{written:.5},{written:1.5},{written:.5}],beams:[[1,2]]};
const MARK_Y=262;

export default function RhythmDrillsPreview(){
  const data=compileRhythm(PATTERN);
  return <div className="rd-preview" aria-hidden="true">
    <EngravedRow proportional clef={false} notes={data.notes} beams={PATTERN.beams} meter={{top:4,bottom:4}} right={620} viewBox="20 70 630 250">
      {l=><>
        {data.onsets.map((t,i)=><circle key={i} className="rd-preview__tap" style={{animationDelay:`${.3+i*.45}s`}} cx={l.beatX(t)} cy={MARK_Y} r="7"/>)}
      </>}
    </EngravedRow>
  </div>;
}
