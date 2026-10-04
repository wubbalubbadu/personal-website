export type DynamicPoint={at:number;level:number};
export type DynamicMark={at:number;level?:number;wedge?:{until:number;to?:number;rising:boolean}};
/** Piecewise linear hairpins; ordinary dynamics hold until the next mark. */
export function dynamicTimeline(marks:DynamicMark[],floor:number,ceiling:number){
 const points:DynamicPoint[]=[{at:0,level:1}];
 let active:{start:number;until:number;from:number;to:number}|null=null,level=1;
 for(const mark of marks){
  if(active){
   if(mark.at>=active.until){points.push({at:active.until,level:active.to});level=active.to;active=null}
   else{level=active.from+(active.to-active.from)*(mark.at-active.start)/(active.until-active.start);active=null}
  }
  points.push({at:mark.at,level});
  if(mark.level!==undefined){level=mark.level;points.push({at:mark.at,level})}
  if(mark.wedge&&mark.wedge.until>mark.at){
   const to=mark.wedge.to??Math.max(floor,Math.min(ceiling,level*10**((mark.wedge.rising?5:-5)/20)));
   active={start:mark.at,until:mark.wedge.until,from:level,to};
  }
 }
 if(active)points.push({at:active.until,level:active.to});
 return points;
}
export function dynamicLevel(points:DynamicPoint[],at:number){
 let i=0;while(i+1<points.length&&points[i+1].at<=at)i++;
 const a=points[i],b=points[i+1];
 return b&&b.at>a.at?a.level+(b.level-a.level)*Math.max(0,(at-a.at)/(b.at-a.at)):a.level;
}
export function noteEnvelope(points:DynamicPoint[],start:number,end:number,unitsPerWhole:number){
 return [{at:0,level:dynamicLevel(points,start)},...points.filter(p=>p.at>start&&p.at<end).map(p=>({at:(p.at-start)*unitsPerWhole,level:p.level})),{at:(end-start)*unitsPerWhole,level:dynamicLevel(points,end)}];
}
