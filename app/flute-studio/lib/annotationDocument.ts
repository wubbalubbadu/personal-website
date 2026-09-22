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

/** Pressure affects the nib, while the saved sample locations remain untouched. */
export function penOutline(mark:InkMark){
  const points=mark.points;if(!points.length)return '';
  if(points.length===1){const a=points[0],r=(1+2.4*a.p)/2*mark.width/2.4;return `M${a.x-r},${a.y} a${r},${r} 0 1,0 ${r*2},0 a${r},${r} 0 1,0 ${-r*2},0`}
  const left:MarkPoint[]=[],right:MarkPoint[]=[];
  for(let i=0;i<points.length;i++){
    const p=points[i],a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)];
    const angle=Math.atan2(b.y-a.y,b.x-a.x),r=(1+2.4*p.p)/2*mark.width/2.4;
    left.push({...p,x:p.x-Math.sin(angle)*r,y:p.y+Math.cos(angle)*r});
    right.push({...p,x:p.x+Math.sin(angle)*r,y:p.y-Math.cos(angle)*r});
  }
  const outline=[...left,...right.reverse()];return `M${outline.map(p=>`${p.x},${p.y}`).join(' L')} Z`;
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
