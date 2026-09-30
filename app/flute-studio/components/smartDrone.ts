export type DroneChange={measure:number;pitch:string|null;at?:'last-note';event?:number};
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
