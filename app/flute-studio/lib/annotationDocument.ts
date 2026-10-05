export type MarkPoint = {x:number;y:number;p:number};
export type MarkAnchor={key:string;x:number;y:number;space:number};
export type MarkAttachment={anchor?:MarkAnchor;endAnchor?:MarkAnchor};
export type InkMark = MarkAttachment & {id:string;kind:'pen'|'highlighter'|'arrow';color:string;width:number;points:MarkPoint[]};
export type TextMark = MarkAttachment & {id:string;kind:'text'|'sticky';x:number;y:number;text:string;color:string};
export type Mark = InkMark | TextMark;
export type AnnotationDocument = {version:2;marks:Mark[];legacy?:{src:string;width:number;height:number}};
export const emptyAnnotations = ():AnnotationDocument => ({version:2,marks:[]});
export const isInk = (mark:Mark):mark is InkMark => 'points' in mark;

/** One history for every object. Immutable documents share unchanged strokes. */
export class AnnotationHistory {
  private past:AnnotationDocument[]=[];
  private future:AnnotationDocument[]=[];
  private mergeKey:string|null=null;
  private mergedAt=0;
  constructor(public current:AnnotationDocument=emptyAnnotations()){}
  get canUndo(){return this.past.length>0}
  get canRedo(){return this.future.length>0}
  commit(next:AnnotationDocument,key:string|null=null,now=Date.now()){
    if(next===this.current)return;
    if(!key||key!==this.mergeKey||now-this.mergedAt>900)this.past.push(this.current);
    this.current=next;this.future=[];this.mergeKey=key;this.mergedAt=now;
  }
  boundary(){this.mergeKey=null}
  undo(){const prev=this.past.pop();if(prev){this.future.push(this.current);this.current=prev}this.boundary();return this.current}
  redo(){const next=this.future.pop();if(next){this.past.push(this.current);this.current=next}this.boundary();return this.current}
}

/** Client coordinates and rendered bounds must use the same space, including CSS zoom. */
export function paperPoint(x:number,y:number,box:{left:number;top:number;width:number;height:number},w:number,h:number):MarkPoint{
  return {x:(x-box.left)*w/box.width,y:(y-box.top)*h/box.height,p:.5};
}
export function moveMark(mark:Mark,dx:number,dy:number):Mark{
  return isInk(mark)?{...mark,points:mark.points.map(p=>({...p,x:p.x+dx,y:p.y+dy}))}:{...mark,x:mark.x+dx,y:mark.y+dy};
}
export function nearSegment(p:MarkPoint,a:MarkPoint,b:MarkPoint,r:number){
  const dx=b.x-a.x,dy=b.y-a.y,d=dx*dx+dy*dy;
  const t=d?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/d)):0;
  return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)<=r;
}
export function hitsInk(mark:InkMark,p:MarkPoint,r=10){
  if(mark.kind==='arrow')return nearSegment(p,mark.points[0],mark.points.at(-1)!,r+mark.width/2);
  return mark.points.some((b,i)=>nearSegment(p,mark.points[Math.max(0,i-1)],b,r+mark.width/2));
}
export function markPath(mark:InkMark){
  const points=mark.points;if(!points.length)return '';
  const a=points[0],b=points.at(-1)!;
  if(mark.kind==='arrow'){
    if(Math.hypot(b.x-a.x,b.y-a.y)<6)return '';
    const angle=Math.atan2(b.y-a.y,b.x-a.x),head=12;
    return `M${a.x},${a.y} L${b.x},${b.y} M${b.x-head*Math.cos(angle-.45)},${b.y-head*Math.sin(angle-.45)} L${b.x},${b.y} L${b.x-head*Math.cos(angle+.45)},${b.y-head*Math.sin(angle+.45)}`;
  }
  return `M${a.x},${a.y} `+(points.length===1?`l.01,0`:points.slice(1).map(p=>`L${p.x},${p.y}`).join(' '));
}

/**
 * The samples a pen stroke is drawn from. The saved points are never touched: this only affects how the
 * stroke looks. Samples closer than a fraction of a unit (an iPad reports far more than the eye needs)
 * are dropped, then one light pass averages each point with its neighbours so hand and sensor jitter
 * does not show as jagged corners. The ends stay where the pen touched down and lifted.
 */
function inkSamples(points:MarkPoint[]):MarkPoint[]{
  const kept:MarkPoint[]=[];
  points.forEach((p,i)=>{const last=kept.at(-1);if(!last||i===points.length-1||Math.hypot(p.x-last.x,p.y-last.y)>=.7)kept.push(p)});
  if(kept.length<3)return kept;
  return kept.map((p,i)=>{
    if(i===0||i===kept.length-1)return p;
    const a=kept[i-1],b=kept[i+1];
    return {...p,x:(a.x+2*p.x+b.x)/4,y:(a.y+2*p.y+b.y)/4,p:(a.p+2*p.p+b.p)/4};
  });
}

/**
 * Pressure affects the nib, while the saved sample locations remain untouched. The outline is drawn with
 * curves through the smoothed samples (each edge passes through the midpoints of the polygon's sides)
 * and round caps, so the stroke has smooth edges at any zoom instead of a polygon's corners.
 */
export function penOutline(mark:InkMark){
  const raw=mark.points;if(!raw.length)return '';
  const radius=(p:MarkPoint)=>(1+2.4*p.p)/2*mark.width/2.4;
  if(raw.length===1){const a=raw[0],r=radius(a);return `M${a.x-r},${a.y} a${r},${r} 0 1,0 ${r*2},0 a${r},${r} 0 1,0 ${-r*2},0`}
  const points=inkSamples(raw);
  if(points.length<2){const a=points[0],r=radius(a);return `M${a.x-r},${a.y} a${r},${r} 0 1,0 ${r*2},0 a${r},${r} 0 1,0 ${-r*2},0`}
  const left:MarkPoint[]=[],right:MarkPoint[]=[];
  for(let i=0;i<points.length;i++){
    // The direction comes from points a step either side, so a single wobble does not swing the nib.
    const p=points[i],a=points[Math.max(0,i-2)],b=points[Math.min(points.length-1,i+2)];
    const angle=Math.atan2(b.y-a.y,b.x-a.x),r=radius(p);
    left.push({...p,x:p.x-Math.sin(angle)*r,y:p.y+Math.cos(angle)*r});
    right.push({...p,x:p.x+Math.sin(angle)*r,y:p.y-Math.cos(angle)*r});
  }
  const mid=(a:MarkPoint,b:MarkPoint)=>`${(a.x+b.x)/2},${(a.y+b.y)/2}`;
  /** An edge through the polygon's side midpoints, with each sample as the curve's control point. */
  const edge=(side:MarkPoint[])=>side.slice(1,-1).map((p,i)=>`Q${p.x},${p.y} ${mid(p,side[i+2])}`).join(' ');
  const rev=[...right].reverse();
  const first=points[0],last=points.at(-1)!,startR=radius(first),endR=radius(last);
  const l0=left[0],ln=left.at(-1)!,r0=right[0],rn=right.at(-1)!;
  const lHalf=left.length>2?` L${mid(left[0],left[1])}`:'';
  const rHalf=rev.length>2?` L${mid(rev[0],rev[1])}`:'';
  // Left edge forward, a round cap at the end, the right edge back, a round cap at the start.
  return `M${l0.x},${l0.y}${lHalf} ${edge(left)} L${ln.x},${ln.y} A${endR},${endR} 0 0 0 ${rn.x},${rn.y}${rHalf} ${edge(rev)} L${r0.x},${r0.y} A${startR},${startR} 0 0 0 ${l0.x},${l0.y} Z`;
}

/** Contacts rejected during writing stay rejected until their own pointerup. */
export class AnnotationContacts {
  pen:number|null=null;
  lastPen=-Infinity;
  blocked=new Set<number>();
  touches=new Map<number,{x:number;y:number;started:number}>();
  penDown(id:number,now:number){this.pen=id;this.lastPen=now;for(const id of this.touches.keys())this.blocked.add(id);this.touches.clear()}
  touchDown(id:number,x:number,y:number,width:number,height:number,now:number){
    if(this.pen!==null||now-this.lastPen<350||Math.max(width,height)>26){this.blocked.add(id);return false}
    this.touches.set(id,{x,y,started:now});return true;
  }
  up(id:number,now:number){if(this.pen===id){this.pen=null;this.lastPen=now}this.touches.delete(id);this.blocked.delete(id)}
  get pinchAllowed(){const t=[...this.touches.values()];return t.length===2&&Math.abs(t[0].started-t[1].started)<250}
}
