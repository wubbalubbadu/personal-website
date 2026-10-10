export type DroneChange={measure:number;pitch:string|null;displayPitch?:string;at?:'last-note';event?:number};
/** Resolve change points against written events, including changes inside a bar. */
export function droneEvents(changes:DroneChange[],events:{p:string|null;d:number}[],measureStarts:number[]){
  const points=changes.map(change=>{
    let index=change.event??measureStarts[change.measure-1]??events.length;
    if(change.at==='last-note'){
      const end=measureStarts[change.measure]??events.length;
      for(let i=end-1;i>=index;i--)if(events[i].p){index=i;break}
    }
    return {index,pitch:change.pitch};
  }).sort((a,b)=>a.index-b.index);
  let point=0,pitch:string|null=null;
  return events.map((_,index)=>{while(point<points.length&&points[point].index<=index)pitch=points[point++].pitch;return pitch});
}

/** Both the count-in clicks and the first tonic share this audio clock. */
export function droneCountIn(clockStart:number,beatSeconds:number,beatsPerBar:number,enabled:boolean,scaleBeats?:number){
  const beats=enabled?(scaleBeats??beatsPerBar*2):0;
  const duration=beats*beatSeconds;
  return {beats,duration,start:clockStart+duration};
}

/**
 * An auto drone for any piece without a hand-set one: in each bar, the pitch held longest in total (every
 * occurrence added up, any octave), sounded at the lowest octave it is written in that bar. An even tie goes
 * to the one that comes first; a bar of only rests is silent. The scheduler joins bars that land on the same
 * pitch into one held note, so the drone only moves when the music does.
 */
export function longestPitchChanges(pitches:(string|null)[],events:{d:number}[],measureStarts:number[]):DroneChange[]{
  return measureStarts.map((start,bar)=>{
    const end=measureStarts[bar+1]??events.length;
    // Insertion order is first appearance, so keeping the earlier one on a tie is just "only replace when longer".
    const totals=new Map<string,{length:number;octave:number}>();
    for(let i=start;i<end;i++){
      const match=pitches[i]?.match(/^([A-G][♯♭]?)(\d)$/),length=events[i]?.d??0;
      if(!match||!(length>0))continue;
      const seen=totals.get(match[1]);
      if(seen){seen.length+=length;seen.octave=Math.min(seen.octave,Number(match[2]))}
      else totals.set(match[1],{length,octave:Number(match[2])});
    }
    let best:string|null=null,longest=0;
    totals.forEach((total,name)=>{if(total.length>longest+1e-9){longest=total.length;best=`${name}${total.octave}`}});
    return {measure:bar+1,pitch:best};
  });
}

/** The piece's hand-set drone when it has one, otherwise the longest-held pitch of each bar. */
export function droneChangesOf(authored:DroneChange[]|undefined,seq:{pitches:(string|null)[];events:{d:number}[];measureStarts:number[]}){
  return authored??longestPitchChanges(seq.pitches,seq.events,seq.measureStarts);
}
