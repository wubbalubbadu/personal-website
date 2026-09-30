"use client";
import {useEffect,useState} from "react";
import {PracticeIcon} from "./PracticeIcon";
export function ScoreTempoMarks({root,version,marks,onChange,onSound,soundingId}:{root:HTMLDivElement|null;version:number;marks:{id:string;label:string;tempo:number}[];onChange:(id:string,tempo:number)=>void;onSound:(id:string,tempo:number)=>void;soundingId:string|null}){
  // Carries the layout version the positions were measured against. Marks
  // are drawn only while that matches the CURRENT version: toggling them on
  // changes the system spacing, so the score re-engraves under them, and
  // anything still sitting at last layout's coordinates is simply wrong.
  // Better to show nothing for the frame it takes to re-measure — with the
  // fade-in below that reads as the marks arriving, not as them twitching.
  const [spots,setSpots]=useState<{version:number;placed:{id:string;x:number;y:number}[]}>({version:-1,placed:[]});
  const [draft,setDraft]=useState<{id:string;value:string}|null>(null);
  // A string, not the array: `marks` is rebuilt on every render of the
  // page, so depending on it directly would re-measure forever.
  const signature=marks.map(m=>m.label).join("|");
  // Measuring the engraving is exactly the "read from an external system"
  // case an effect is for; the positions it finds have to land in state to
  // be rendered, so these setStates are the point rather than a cascade.
  useEffect(()=>{
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if(!root){setSpots({version,placed:[]});return}
    const rootBox=root.getBoundingClientRect();
    // OSMD draws each words-direction twice at the same spot; keep one.
    const labels:{text:string;rect:DOMRect}[]=[];
    for(const node of root.querySelectorAll<SVGGElement>(".vf-text")){
      const text=node.textContent?.trim();
      if(!text)continue;
      const rect=node.getBoundingClientRect();
      const previous=labels[labels.length-1];
      if(previous&&previous.text===text&&Math.abs(previous.rect.left-rect.left)<1&&Math.abs(previous.rect.top-rect.top)<1)continue;
      labels.push({text,rect});
    }
    let cursor=0;
    const placed:{id:string;x:number;y:number}[]=[];
    for(const mark of marks){
      const index=labels.findIndex((label,i)=>i>=cursor&&label.text===mark.label);
      if(index<0)continue;
      cursor=index+1;
      const rect=labels[index].rect;
      // Sat beside the name to begin with, which put it right where a high
      // note's ledger lines reach up. Its own lane directly above the name
      // is the one band in a block that nothing engraved occupies.
      placed.push({id:mark.id,x:rect.left-rootBox.left,y:rect.top-rootBox.top-3});
    }
    setSpots({version,placed});
    // marks is intentionally excluded — `signature` stands in for it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[root,version,signature]);
  const byId=new Map(marks.map(m=>[m.id,m]));
  const commit=(id:string,value:number)=>onChange(id,Math.max(40,Math.min(220,Math.round(value))));
  return <>{(spots.version===version?spots.placed:[]).map(spot=>{
    const mark=byId.get(spot.id);
    if(!mark)return null;
    const sounding=soundingId===spot.id;
    return <span className={sounding?"score-tempo-mark is-sounding":"score-tempo-mark"} style={{left:spot.x,top:spot.y}} key={spot.id}>
      {/* The same action the metronome button on this exercise's Tempos row
          performs: take the tempo from here, and click. A number printed on
          the page that you can also hear is the whole point of putting it
          there. */}
      <button type="button" className="score-tempo-mark__sound" aria-pressed={sounding} aria-label={sounding?`${mark.label}: stop metronome`:`${mark.label}: metronome at ${mark.tempo}`} onClick={()=>onSound(spot.id,mark.tempo)}><PracticeIcon name="metronome"/></button>
      {/* One BPM a click, not five: on the page you are nudging a tempo you
          already have, not dialling one in from scratch. */}
      <button type="button" className="score-tempo-mark__step" aria-label={`${mark.label}: 1 BPM slower`} disabled={mark.tempo<=40} onClick={()=>commit(spot.id,mark.tempo-1)}>−</button>
      <label className="score-tempo-mark__value"><input type="number" min={40} max={220} aria-label={`${mark.label}: practice tempo in BPM`}
        value={draft?.id===spot.id?draft.value:mark.tempo}
        onChange={e=>setDraft({id:spot.id,value:e.target.value})}
        onBlur={()=>{if(draft?.id!==spot.id)return;const next=Number(draft.value);const valid=Number.isFinite(next)&&draft.value.trim()!=="";setDraft(null);if(valid)commit(spot.id,next)}}
        onKeyDown={e=>{if(e.key==="Enter")e.currentTarget.blur()}}/></label>
      <button type="button" className="score-tempo-mark__step" aria-label={`${mark.label}: 1 BPM faster`} disabled={mark.tempo>=220} onClick={()=>commit(spot.id,mark.tempo+1)}>+</button>
    </span>;
  })}</>;
}
