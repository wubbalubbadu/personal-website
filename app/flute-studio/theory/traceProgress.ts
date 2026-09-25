export type TracePoint={x:number;y:number};
export function traceSegment(samples:TracePoint[],from:TracePoint,to:TracePoint){
  const dx=to.x-from.x,dy=to.y-from.y,length=Math.hypot(dx,dy);
  const covered:number[]=[];
  samples.forEach((p,i)=>{
    const t=length?Math.max(0,Math.min(1,((p.x-from.x)*dx+(p.y-from.y)*dy)/(length*length))):0;
    if(Math.hypot(p.x-from.x-t*dx,p.y-from.y-t*dy)<=15)covered.push(i);
  });
  const steps=Math.max(1,Math.ceil(length/5));let near=0;
  for(let i=0;i<steps;i++){
    const t=(i+.5)/steps,x=from.x+dx*t,y=from.y+dy*t;
    if(samples.some(p=>Math.hypot(p.x-x,p.y-y)<=15))near++;
  }
  return {covered,length,matchedLength:length*near/steps};
}
export function traceComplete(covered:number,samples:number,matchedLength:number,totalLength:number){
  return samples>0&&covered/samples>=.6&&totalLength>=60&&matchedLength/totalLength>=.6;
}
