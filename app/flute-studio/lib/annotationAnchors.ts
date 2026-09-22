import {isInk,type Mark,type MarkAnchor,type MarkPoint} from './annotationDocument';

export type AnchorSpot=MarkAnchor & {system:string;kind:'note'|'system'};
export type AnnotationLayout=Map<string,AnchorSpot>;

/** Read only after engraving. All locations share the input layer's paper units. */
export function annotationLayout(root:Element,surface:HTMLElement):AnnotationLayout{
  const rect=surface.getBoundingClientRect(),sx=surface.clientWidth/rect.width,sy=surface.clientHeight/rect.height;
  const result:AnnotationLayout=new Map();
  const within=new Map<string,number>();
  const systems=new Map<string,string>();
  for(const node of root.querySelectorAll<SVGGElement>('.vf-stavenote[data-event]')){
    const head=node.querySelector('.vf-notehead path')??node.querySelector('.vf-notehead');if(!head)continue;
    const box=head.getBoundingClientRect();if(!box.width)continue;
    const measure=node.closest('.vf-measure');
    const lines=measure?[...measure.querySelectorAll(':scope > path')].map(p=>p.getBoundingClientRect()).filter(b=>b.width>30&&b.height<2):[];
    const tops=[...new Set(lines.map(b=>Math.round(b.top*10)/10))].sort((a,b)=>a-b);
    const space=tops.length>=2?(tops[1]-tops[0])*sy:Math.max(4,box.height*sy);
    const staffTop=tops[0]??box.top;
    const page=node.closest('svg');
    const pageIndex=[...root.querySelectorAll('svg')].indexOf(page as SVGSVGElement);
    const row=`${pageIndex}:${Math.round(staffTop*sy)}`;
    const measureId=node.dataset.measure??'0',ordinal=within.get(measureId)??0;within.set(measureId,ordinal+1);
    // Pitch guards against attaching to a different note after the music changes.
    const key=`note:${measureId}:${ordinal}:${node.dataset.pitch??''}`;
    if(!systems.has(row))systems.set(row,key);
    const system=systems.get(row)!;
    const spot:AnchorSpot={key,x:(box.left+box.width/2-rect.left)*sx,y:(box.top+box.height/2-rect.top)*sy,space,system,kind:'note'};
    result.set(key,spot);
    // Each note supplies a stable reference to its current staff. A comment
    // follows that passage even when it is no longer on the third visual line.
    const systemKey=`staff:${key}`;
    result.set(systemKey,{...spot,key:systemKey,y:(staffTop-rect.top)*sy,kind:'system'});
  }
  return result;
}
function distance(a:{x:number;y:number},b:{x:number;y:number}){return Math.hypot(a.x-b.x,a.y-b.y)}
function nearest(p:{x:number;y:number},layout:AnnotationLayout,kind:AnchorSpot['kind']){
  return [...layout.values()].filter(s=>s.kind===kind).sort((a,b)=>distance(a,p)-distance(b,p))[0];
}
export function attachMark(mark:Mark,layout:AnnotationLayout):Mark{
  const {anchor:_old,endAnchor:_end,...plain}=mark;void _old;void _end;
  if(!layout.size)return plain as Mark;
  let reference:{x:number;y:number};
  if(isInk(mark)){
    if(!mark.points.length)return mark;
    if(mark.kind==='arrow')reference=mark.points.at(-1)!;
    else{
      const xs=mark.points.map(p=>p.x),ys=mark.points.map(p=>p.y);
      reference={x:(Math.min(...xs)+Math.max(...xs))/2,y:(Math.min(...ys)+Math.max(...ys))/2};
    }
  }else reference=mark;
  const note=nearest(reference,layout,'note');
  const anchor=note&&distance(note,reference)<=Math.max(46,note.space*6)?note:nearest(reference,layout,'system');
  if(!anchor)return plain as Mark;
  const attached={...plain,anchor} as Mark;
  if(isInk(mark)&&mark.kind!=='arrow'&&mark.points.length>1){
    const a=mark.points[0],b=mark.points.at(-1)!;
    const first=nearest(a,layout,'note'),last=nearest(b,layout,'note');
    if(first&&last&&first.key!==last.key&&first.system===last.system&&Math.abs(a.x-b.x)>Math.max(60,first.space*8)
      &&distance(a,first)<first.space*7&&distance(b,last)<last.space*7){
      return {...attached,anchor:first,endAnchor:last};
    }
  }
  return attached;
}

/** Projection never edits the document/history. Missing targets stay recoverable. */
export function placeMark(mark:Mark,layout:AnnotationLayout):Mark|null{
  const anchor=mark.anchor;if(!anchor)return mark;
  const current=layout.get(anchor.key);if(!current)return null;
  const scale=current.space/Math.max(1,anchor.space);
  const end=mark.endAnchor,nowEnd=end?layout.get(end.key):undefined;
  if(end&&!nowEnd)return null;
  const project=(p:MarkPoint):MarkPoint=>{
    if(end&&nowEnd&&Math.abs(end.x-anchor.x)>1&&nowEnd.system===current.system){
      const t=(p.x-anchor.x)/(end.x-anchor.x);
      const originalBase=anchor.y+t*(end.y-anchor.y),base=current.y+t*(nowEnd.y-current.y);
      return {...p,x:current.x+t*(nowEnd.x-current.x),y:base+(p.y-originalBase)*scale};
    }
    // If a hand-drawn span wraps systems, keep its shape with the first
    // target; never stretch it diagonally across unrelated staves.
    return {...p,x:current.x+(p.x-anchor.x)*scale,y:current.y+(p.y-anchor.y)*scale};
  };
  if(isInk(mark))return {...mark,width:mark.width*scale,points:mark.points.map(project)};
  return {...mark,...project({x:mark.x,y:mark.y,p:.5})};
}
