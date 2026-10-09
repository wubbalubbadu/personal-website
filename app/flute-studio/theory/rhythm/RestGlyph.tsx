import {REST_GLYPHS} from './restGlyphs';
import {noteY} from '../model';
import type {NoteValue} from './rhythmModel';

/** Same .064 scale as RhythmNote. Anchors follow VexFlow's D5 whole rest and B4 others. */
export function restY(value:number,measureRest=false){return noteY(measureRest||value===4?6:4)}
export default function RestGlyph({value,measureRest=false,staffLine=false}:{value:NoteValue;measureRest?:boolean;staffLine?:boolean}){
  const g=REST_GLYPHS[measureRest?4:value];
  return <>{staffLine&&(value===2||value===4)&&<line className="engraved-row__line" x1="-28" x2="28" y1="0" y2="0"/>}<path d={g.path} transform={`translate(${-g.width*.032} 0) scale(.064 -.064)`}/></>;
}
