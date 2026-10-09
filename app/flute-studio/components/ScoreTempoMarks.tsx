"use client";
import {useLayoutEffect,useState} from "react";
import {TempoPill} from "./TempoPill";
import {RepPill} from "./RepPill";
import type {RepItem} from "../lib/repLog";
export function ScoreTempoMarks({root,version,marks,onChange,onSound,soundingId,zh=false}:{root:HTMLDivElement|null;version:number;marks:{id:string;label:string;tempo:number;/** Count reps of this exercise beside its tempo (RepPill). */rep?:RepItem}[];zh?:boolean;onChange:(id:string,tempo:number)=>void;onSound:(id:string,tempo:number)=>void;soundingId:string|null}){
  // Carries the layout version the positions were measured against. Marks
  // are drawn only while that matches the CURRENT version: toggling them on
  // changes the system spacing, so the score re-engraves under them, and
  // anything still sitting at last layout's coordinates is simply wrong.
  // Better to show nothing for the frame it takes to re-measure — with the
  // fade-in below that reads as the marks arriving, not as them twitching.
  const [spots,setSpots]=useState<{version:number;placed:{id:string;x:number;y:number}[]}>({version:-1,placed:[]});
  // A string, not the array: `marks` is rebuilt on every render of the
  // page, so depending on it directly would re-measure forever.
  const signature=marks.map(m=>m.label).join("|");
  // Measuring the engraving is exactly the "read from an external system"
  // case an effect is for; the positions it finds have to land in state to
  // be rendered, so these setStates are the point rather than a cascade.
  useLayoutEffect(()=>{
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
      // With a rep pill beside it the pair is ~170px wide: near the right edge, slide it back so it stays on the page.
      const room=mark.rep?172:84;
      placed.push({id:mark.id,x:Math.max(0,Math.min(rect.left-rootBox.left,rootBox.width-room)),y:rect.top-rootBox.top-3});
    }
    setSpots({version,placed});
    // marks is intentionally excluded — `signature` stands in for it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[root,version,signature]);
  const byId=new Map(marks.map(m=>[m.id,m]));
  return <>{(spots.version===version?spots.placed:[]).map(spot=>{
    const mark=byId.get(spot.id);
    if(!mark)return null;
    // The same action as the metronome button on this exercise's Tempos row: take the tempo from here, and click.
    return <span key={spot.id} className="score-tempo-mark" style={{left:spot.x,top:spot.y}}>
      <TempoPill label={mark.label} tempo={mark.tempo} sounding={soundingId===spot.id} onSound={()=>onSound(spot.id,mark.tempo)} onChange={value=>onChange(spot.id,value)}/>
      {mark.rep&&<RepPill item={mark.rep} tempo={mark.tempo} zh={zh}/>}
    </span>;
  })}</>;
}
