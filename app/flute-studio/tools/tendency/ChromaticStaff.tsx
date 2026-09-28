"use client";

import {useEffect,useRef,useState} from "react";
import {spell} from "../../lib/tendencyTest";

/**
 * A short run of the chromatic scale, engraved with VexFlow like the rest of
 * the studio's notation (see components/EngravedNote): whole notes, real
 * accidentals and ledger lines. Notes already played are grey and the current
 * one green. There are no barlines, so a note whose letter was altered earlier
 * in the run gets its natural sign, as it would on a printed page.
 *
 * `reach` reserves room for a whole range's ledger lines, so the staff keeps
 * one height while its notes change (the range picker's buttons stay put).
 * `onDrag` lets each note be dragged up and down the staff, as in the theory
 * lessons; it reports the natural note under the pointer.
 *
 * `slots` fixes the layout: the staff is that many columns wide and each note
 * sits in the middle of its column, whatever its accidental. Without it the
 * spacing followed the notes, so a sharp appearing nudged its neighbours and
 * a shorter run shortened the staff. Fewer notes than slots are centred.
 */
export type StaffNote={midi:number;rising:boolean;state:"done"|"current"|"next"};

const LETTERS="CDEFGAB",NATURAL=[0,2,4,5,7,9,11];
const GREY="#b9bbc1",GREEN="#46633d";
/** Staff step of F5, the top line; each step is half a staff space (5 VexFlow units). */
const TOP_LINE_STEP=38;

function written(midi:number,rising:boolean){
  const name=spell(midi,rising),letter=name[0],octave=Number(name.match(/-?\d+$/)?.[0]);
  const accidental=name.includes("♯")?"#":name.includes("♭")?"b":"";
  return {key:`${letter.toLowerCase()}/${octave}`,letter,accidental,step:octave*7+LETTERS.indexOf(letter)};
}
const stepOf=(midi:number)=>written(midi,true).step;
/** VexFlow, loaded once and shared by every redraw. */
const importVexflow=()=>import("vexflow");
let vexflow:ReturnType<typeof importVexflow>|null=null;
const loadVexflow=()=>(vexflow??=importVexflow());
const midiOfStep=(step:number)=>(Math.floor(step/7)+1)*12+NATURAL[((step%7)+7)%7];

export default function ChromaticStaff({notes,label,reach,slots,onDrag}:{notes:StaffNote[];label?:string;reach?:[number,number];slots?:number;onDrag?:(index:number,midi:number)=>void}){
  const host=useRef<HTMLDivElement>(null);
  const geometry=useRef<{width:number;height:number;topLine:number;xs:number[]}|null>(null);
  const dragging=useRef<number|null>(null);
  const [failed,setFailed]=useState(false);
  const signature=notes.map(n=>`${n.midi}${n.rising?"u":"d"}${n.state[0]}`).join(",")+(reach?`|${reach.join("-")}`:"")+(slots?`|${slots}`:"");
  useEffect(()=>{
    let cancelled=false;
    const container=host.current!;
    loadVexflow().then(({default:Vex})=>{
      if(cancelled||!notes.length)return;
      const VF=Vex.Flow;
      const parts=notes.map(n=>({...written(n.midi,n.rising),state:n.state}));
      // Room for ledger lines above and below the staff, as far as these
      // notes (or the whole `reach`) go.
      const steps=[...parts.map(p=>p.step),...(reach?reach.map(stepOf):[])];
      const above=Math.max(0,Math.max(...steps)-TOP_LINE_STEP)*5,below=Math.max(0,28-Math.min(...steps))*5;
      const columns=Math.max(slots??0,parts.length);
      const width=90+columns*58,height=110+above+below;
      // Drawn off-screen and swapped in when finished: clearing first left
      // the staff blank for a moment on every ± press, which flickered.
      const sheet=document.createElement("div");
      const renderer=new VF.Renderer(sheet,VF.Renderer.Backends.SVG);
      renderer.resize(width,height);
      const context=renderer.getContext();
      const ink=getComputedStyle(container).color||"#292a33";
      context.setFillStyle(ink);context.setStrokeStyle(ink);
      const stave=new VF.Stave(6,10+above,width-12);
      stave.addClef("treble").setContext(context).draw();
      const altered=new Set<string>();
      const tickables=parts.map(p=>{
        const note=new VF.StaveNote({keys:[p.key],duration:"w"});
        const mark=p.accidental||(altered.has(p.letter)?"n":"");
        if(mark)note.addAccidental(0,new VF.Accidental(mark));
        if(p.accidental)altered.add(p.letter);else altered.delete(p.letter);
        const colour=p.state==="done"?GREY:p.state==="current"?GREEN:null;
        if(colour)note.setStyle({fillStyle:colour,strokeStyle:colour});
        return note;
      });
      const voice=new VF.Voice({num_beats:4*tickables.length,beat_value:4}).setMode(VF.Voice.Mode.SOFT).addTickables(tickables);
      new VF.Formatter().joinVoices([voice]).formatToStave([voice],stave);
      if(slots){
        // Tick context x is measured from the stave's note start, so this
        // moves each note and its accidental together into its column.
        const start=stave.getNoteStartX(),column=(stave.getNoteEndX()-start)/columns,first=(columns-parts.length)/2;
        tickables.forEach((note,i)=>note.getTickContext().setX(column*(first+i+.5)-note.getMetrics().noteWidth/2));
      }
      voice.draw(context,stave);
      geometry.current={width,height,topLine:stave.getYForLine(0),xs:tickables.map(note=>note.getAbsoluteX())};
      const svg=sheet.querySelector("svg");
      svg?.setAttribute("viewBox",`0 0 ${width} ${height}`);
      svg?.setAttribute("aria-hidden","true");
      if(svg){svg.style.width="100%";svg.style.height="auto";svg.style.display="block";container.replaceChildren(svg)}
    }).catch(()=>{if(!cancelled)setFailed(true)});
    return()=>{cancelled=true};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[signature]);

  // Pointer position → the nearest note (by x) and the natural pitch under it (by y).
  const locate=(event:React.PointerEvent<HTMLDivElement>)=>{
    const g=geometry.current,svg=host.current?.querySelector("svg");
    if(!g||!svg)return null;
    const rect=svg.getBoundingClientRect(),scale=g.width/rect.width;
    const x=(event.clientX-rect.left)*scale,y=(event.clientY-rect.top)*scale;
    const index=g.xs.reduce((best,nx,i)=>Math.abs(nx-x)<Math.abs(g.xs[best]-x)?i:best,0);
    return {index,midi:midiOfStep(TOP_LINE_STEP-Math.round((y-g.topLine)/5))};
  };
  const drag=onDrag?{
    onPointerDown:(event:React.PointerEvent<HTMLDivElement>)=>{const hit=locate(event);if(!hit)return;dragging.current=hit.index;event.currentTarget.setPointerCapture(event.pointerId);onDrag(hit.index,hit.midi)},
    onPointerMove:(event:React.PointerEvent<HTMLDivElement>)=>{if(dragging.current===null)return;const hit=locate(event);if(hit)onDrag(dragging.current,hit.midi)},
    onPointerUp:()=>{dragging.current=null},
    onPointerCancel:()=>{dragging.current=null},
  }:{};

  // Drawn at 1.5× VexFlow's size (a 15px staff space), so a phone at arm's
  // length on a music stand can still read it.
  return <div className={`chromatic-staff${onDrag?" is-draggable":""}`} role="img" aria-label={label} style={{maxWidth:(90+Math.max(slots??0,notes.length)*58)*1.5}} {...drag}>
    <div ref={host}/>{failed&&<span>Notation unavailable</span>}
  </div>;
}
