import {AugmentationDot,Beam,Flag,GlyphSvg,HollowNotehead,Notehead,Stem,TupletNumber,centeredStart} from "../exercises/scales/notationGlyphs";
import type {ClickNote} from "../lib/metronomeSetup";

/**
 * A beat and how it is divided, drawn as notation (COMPONENTS.md): one quarter, two beamed eighths, a beamed
 * triplet, or four beamed sixteenths. Built from Scale Studio's glyph pieces so it matches the rhythm icons there.
 */
export function SubdivisionIcon({parts}:{parts:1|2|3|4}){
  const left=centeredStart(parts),xs=Array.from({length:parts},(_,i)=>left+i*16);
  return <GlyphSvg className="subdivision-icon" viewBox="18 -1 64 49">
    {parts>1&&<Beam from={xs[0]} to={xs[parts-1]}/>}
    {parts===4&&<Beam from={xs[0]} to={xs[3]} level={1}/>}
    {parts===3&&<TupletNumber x={xs[1]+4}/>}
    {xs.map((x,i)=><g key={i}><Stem x={x}/><Notehead x={x}/></g>)}
  </GlyphSvg>;
}

/** The note a metronome click counts (quarter, eighth, dotted quarter, half), drawn with the same glyph pieces. */
export function ClickNoteIcon({note}:{note:ClickNote}){
  const x=note==="dotted"?46:50;
  return <GlyphSvg className="subdivision-icon click-note-icon" viewBox="18 -1 64 49">
    <Stem x={x}/>{note==="half"?<HollowNotehead x={x}/>:<Notehead x={x}/>}
    {note==="eighth"&&<Flag x={x}/>}{note==="dotted"&&<AugmentationDot x={x}/>}
  </GlyphSvg>;
}
