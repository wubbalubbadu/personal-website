'use client';
import {memo,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {PracticeIcon} from './PracticeIcon';
import {usePencilOnly} from '../lib/pencilMode';
import {AnnotationContacts,AnnotationHistory,emptyAnnotations,hitsInk,isInk,markPath,moveMark,paperPoint,penOutline,type AnnotationDocument,type InkMark,type Mark,type MarkPoint,type TextMark} from '../lib/annotationDocument';
import '../annotation-layer.css';
import {annotationLayout,attachMark,placeMark,type AnnotationLayout} from '../lib/annotationAnchors';

type Tool=InkMark['kind']|'eraser'|'text'|'sticky'|'select';
function ToolIcon({tool}:{tool:Tool}){return <PracticeIcon name={tool==='pen'?'markup':tool}/>}
type Props={id:string;active:boolean;layoutReady:boolean;layoutVersion:number;toolbar:HTMLElement|null;zh:boolean;onClose:()=>void;onZoom:(value:number,x:number,y:number)=>void;zoom:number};
const Shape=memo(function Shape({mark}:{mark:InkMark}){
  return <path data-mark-id={mark.id} d={mark.kind==='pen'?penOutline(mark):markPath(mark)} fill={mark.kind==='pen'?mark.color:'none'} stroke={mark.kind==='pen'?'none':mark.color} strokeWidth={mark.width} strokeLinecap="round" strokeLinejoin="round" opacity={mark.kind==='highlighter'?.3:1}/>;
});

export function AnnotationLayer({id,active,layoutReady,layoutVersion,toolbar,zh,onClose,onZoom,zoom}:Props){
  const only=usePencilOnly();
  const [tool,setTool]=useState<Tool>('pen'),[color,setColor]=useState('#e52e31');
  const [doc,setDoc]=useState<AnnotationDocument>(emptyAnnotations);
  const [selected,setSelected]=useState<string|null>(null),[editing,setEditing]=useState<string|null>(null);
  const [storageError,setStorageError]=useState(false),[ready,setReady]=useState(false);
  const [historyState,setHistoryState]=useState({canUndo:false,canRedo:false});
  const dirty=useRef(false);
  const history=useRef(new AnnotationHistory()),layer=useRef<HTMLDivElement>(null),livePath=useRef<SVGPathElement>(null);
  const [layout,setLayout]=useState<AnnotationLayout>(new Map());
  const layoutRef=useRef<AnnotationLayout>(new Map());
  const docRef=useRef(doc),saveTimer=useRef(0),frame=useRef(0),contacts=useRef(new AnnotationContacts());
  const draft=useRef<InkMark|null>(null),drag=useRef<{id:number;start:MarkPoint;mark:Mark;moved:boolean}|null>(null);
  const eraseBase=useRef<AnnotationDocument|null>(null),pointer=useRef<number|null>(null);
  const gesture=useRef<{distance:number;zoom:number}|null>(null);
  const touchStart=useRef(new Map<number,{x:number;y:number;moved:boolean}>());
  const liveConfig=useRef({active,only,tool,zoom,onZoom,color});
  useEffect(()=>{liveConfig.current={active,only,tool,zoom,onZoom,color}},[active,only,tool,zoom,onZoom,color]);
  function persist(){
    if(pointer.current!==null){saveTimer.current=window.setTimeout(persist,350);return}
    try{localStorage.setItem(`cookie:${id}:annotations:v2`,JSON.stringify(docRef.current));setStorageError(false)}catch{setStorageError(true)}
  }
  function publish(next:AnnotationDocument){docRef.current=next;setDoc(next);setHistoryState({canUndo:history.current.canUndo,canRedo:history.current.canRedo})}
  function commit(next:AnnotationDocument,key:string|null=null){history.current.commit(next,key);dirty.current=true;publish(next);window.clearTimeout(saveTimer.current);saveTimer.current=window.setTimeout(persist,350)}
  // Hydration reads browser-only storage once per score, preserving the legacy keys.
  /* eslint-disable react-hooks/set-state-in-effect */
  useLayoutEffect(()=>{
    const surface=layer.current,score=surface?.parentElement?.querySelector('.osmd-score');
    if(!surface||!score||!layoutReady)return;
    const next=annotationLayout(score,surface);layoutRef.current=next;setLayout(next);
  },[layoutReady,layoutVersion]);
  useEffect(()=>{
    if(!layoutReady)return;
    let loaded=emptyAnnotations();
    try{
      const value=JSON.parse(localStorage.getItem(`cookie:${id}:annotations:v2`)||'null');
      if(value?.version===2&&Array.isArray(value.marks))loaded=value;
      else{
        const notes=JSON.parse(localStorage.getItem(`cookie:${id}:notes`)||'[]');
        loaded.marks=Array.isArray(notes)?notes.filter(n=>n&&(n.kind==='text'||n.kind==='sticky')).map(n=>({...n,color:'#292a33'})):[];
        const src=localStorage.getItem(`cookie:${id}:ink`);
        const paper=layer.current?.parentElement;
        if(src)loaded.legacy={src,width:paper?.clientWidth||900,height:paper?.scrollHeight||1200};
      }
    }catch{setStorageError(true);return}
    loaded={...loaded,marks:loaded.marks.map(mark=>mark.anchor?mark:attachMark(mark,layoutRef.current))};
    history.current=new AnnotationHistory(loaded);publish(loaded);setReady(true);
    const flush=()=>{window.clearTimeout(saveTimer.current);if(!dirty.current)return;try{localStorage.setItem(`cookie:${id}:annotations:v2`,JSON.stringify(docRef.current))}catch{/* Keep the original legacy keys intact. */}};
    const hidden=()=>{if(document.hidden)flush()};
    window.addEventListener('pagehide',flush);document.addEventListener('visibilitychange',hidden);
    return()=>{flush();cancelAnimationFrame(frame.current);window.removeEventListener('pagehide',flush);document.removeEventListener('visibilitychange',hidden)};
  },[id,layoutReady]);
  useEffect(()=>{if(!active){setEditing(null);setSelected(null);history.current.boundary();contacts.current.pen=null;contacts.current.touches.clear();contacts.current.blocked.clear()}},[active]);
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(()=>{
    if(!editing)return;
    layer.current?.querySelector<HTMLTextAreaElement>('textarea')?.focus();
  },[editing]);
  function point(e:{clientX:number;clientY:number;pressure?:number}){
    const root=layer.current!,r=root.getBoundingClientRect();
    return {...paperPoint(e.clientX,e.clientY,r,root.clientWidth,root.clientHeight),p:e.pressure||.5};
  }
  function resetPreview(){if(livePath.current)livePath.current.setAttribute('d','')}
  function preview(){
    cancelAnimationFrame(frame.current);
    frame.current=requestAnimationFrame(()=>{if(draft.current&&livePath.current)livePath.current.setAttribute('d',draft.current.kind==='pen'?penOutline(draft.current):markPath(draft.current))});
  }
  function markAt(p:MarkPoint,target:EventTarget|null){
    const element=target instanceof Element?target.closest<HTMLElement>('[data-mark-id]'):null;
    const placed=docRef.current.marks.map(m=>placeMark(m,layoutRef.current)).filter((m):m is Mark=>m!==null);
    return placed.find(m=>m.id===element?.dataset.markId)??[...placed].reverse().find(m=>isInk(m)&&hitsInk(m,p));
  }
  function endEditing(){setEditing(null);history.current.boundary()}
  function choose(next:Tool){endEditing();setSelected(null);setTool(next)}
  function down(e:React.PointerEvent<HTMLDivElement>){
    if(!active||!ready||!layoutReady)return;
    if(e.pointerType==='touch'&&(only||tool==='select'||tool==='text'||tool==='sticky'||contacts.current.blocked.has(e.pointerId)))return;
    if((e.target as Element).closest('textarea,button'))return;
    e.preventDefault();e.stopPropagation();
    if(only&&e.pointerType!=='pen'&&tool!=='select'&&tool!=='text'&&tool!=='sticky')return;
    if(e.pointerType==='pen')contacts.current.penDown(e.pointerId,e.timeStamp);
    if(pointer.current!==null)return;
    endEditing();const p=point(e);pointer.current=e.pointerId;
    e.currentTarget.focus({preventScroll:true});
    e.currentTarget.dataset.drawing='true';
    e.currentTarget.setPointerCapture(e.pointerId);
    if(tool==='text'||tool==='sticky'){
      const existing=markAt(p,e.target);
      if(existing&&!isInk(existing)){setSelected(existing.id);setEditing(existing.id);setTool('select');return}
      const mark:TextMark={id:crypto.randomUUID(),kind:tool,x:p.x,y:p.y,text:'',color:tool==='text'?color:'#292a33'};
      commit({...docRef.current,marks:[...docRef.current.marks,attachMark(mark,layoutRef.current)]});setSelected(mark.id);setEditing(mark.id);setTool('select');
    }else if(tool==='select'){
      const mark=markAt(p,e.target);setSelected(mark?.id??null);
      if(mark)drag.current={id:e.pointerId,start:p,mark,moved:false};
    }else if(tool==='eraser'){
      eraseBase.current=docRef.current;erase(p);
    }else{
      const mark:InkMark={id:crypto.randomUUID(),kind:tool,color,width:tool==='highlighter'?18:tool==='arrow'?3:2.4,points:[p]};
      draft.current=mark;
      if(livePath.current){livePath.current.setAttribute('fill',mark.kind==='pen'?mark.color:'none');livePath.current.setAttribute('stroke',mark.kind==='pen'?'none':mark.color);livePath.current.setAttribute('stroke-width',String(mark.width));livePath.current.setAttribute('opacity',mark.kind==='highlighter'?'.3':'1');livePath.current.setAttribute('d',mark.kind==='pen'?penOutline(mark):markPath(mark))}
    }
  }
  function erase(p:MarkPoint){const current=docRef.current;const marks=current.marks.filter(m=>{const placed=placeMark(m,layoutRef.current);return !placed||!isInk(placed)||!hitsInk(placed,p,13)});if(marks.length!==current.marks.length)publish({...current,marks})}
  function move(e:React.PointerEvent<HTMLDivElement>){
    if(e.pointerId!==pointer.current)return;
    e.preventDefault();const p=point(e);
    if(draft.current){
      const samples=e.nativeEvent.getCoalescedEvents?.()||[];
      const points=(samples.length?samples:[e.nativeEvent]).map(point);
      draft.current.points.push(...points);preview();
    }else if(eraseBase.current)erase(p);
    else if(drag.current){
      const {mark,start}=drag.current;
      if(!drag.current.moved&&Math.hypot(p.x-start.x,p.y-start.y)<3)return;
      drag.current.moved=true;
      const moved=moveMark(mark,p.x-start.x,p.y-start.y);
      const {anchor:unused,endAnchor:unusedEnd,...plain}=moved;void unused;void unusedEnd;
      publish({...docRef.current,marks:docRef.current.marks.map(m=>m.id===mark.id?plain as Mark:m)});
    }
  }
  function up(e:React.PointerEvent<HTMLDivElement>){
    contacts.current.up(e.pointerId,e.timeStamp);
    if(e.pointerId!==pointer.current)return;
    const cancelled=e.type==='pointercancel';
    pointer.current=null;cancelAnimationFrame(frame.current);
    delete e.currentTarget.dataset.drawing;
    if(draft.current){
      if(!cancelled){draft.current.points.push(point(e));if(draft.current.kind!=='arrow'||markPath(draft.current))commit({...docRef.current,marks:[...docRef.current.marks,attachMark(draft.current,layoutRef.current)]})}
      draft.current=null;resetPreview();
    }else if(drag.current||eraseBase.current){
      if(cancelled)publish(history.current.current);
      else if(drag.current){if(drag.current.moved){const movedId=drag.current.mark.id;commit({...docRef.current,marks:docRef.current.marks.map(m=>m.id===movedId?attachMark(m,layoutRef.current):m)})}else if(!isInk(drag.current.mark))setEditing(drag.current.mark.id)}
      else commit(docRef.current);
    }
    drag.current=null;eraseBase.current=null;
  }
  // One controller owns page touches in markup. Native scroll/pinch cannot
  // take a contact away mid-stroke, and rejected palms stay rejected until up.
  useEffect(()=>{
    const el=layer.current,scroller=el?.closest<HTMLElement>('.score-scroll');if(!el||!scroller)return;
    const state=contacts.current;
    function touchDown(e:globalThis.PointerEvent){
      if(!liveConfig.current.active)return;
      if(e.pointerType==='pen'){
        if(pointer.current!==null&&state.touches.has(pointer.current)){draft.current=null;resetPreview();publish(history.current.current);pointer.current=null;eraseBase.current=null}
        state.penDown(e.pointerId,e.timeStamp);gesture.current=null;return;
      }
      if(e.pointerType!=='touch'||(e.target as Element).closest('textarea,button'))return;
      e.preventDefault();
      const accepted=state.touchDown(e.pointerId,e.clientX,e.clientY,e.width,e.height,e.timeStamp);
      if(!accepted){e.stopPropagation();return}
      const config=liveConfig.current;
      if(!config.only&&config.tool!=='select'&&config.tool!=='text'&&config.tool!=='sticky')return;
      e.stopPropagation();
      touchStart.current.set(e.pointerId,{x:e.clientX,y:e.clientY,moved:false});
      try{el!.setPointerCapture(e.pointerId)}catch{/* Pointer may already be cancelled. */}
      if(state.pinchAllowed){const [a,b]=[...state.touches.values()];gesture.current={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom:liveConfig.current.zoom}}
    }
    function touchMove(e:globalThis.PointerEvent){
      if(!liveConfig.current.active||e.pointerType!=='touch')return;
      if(e.pointerId===pointer.current)return;
      const old=state.touches.get(e.pointerId);if(!old)return;
      e.preventDefault();e.stopPropagation();
      const start=touchStart.current.get(e.pointerId);if(start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>5)start.moved=true;
      const dx=e.clientX-old.x,dy=e.clientY-old.y;
      state.touches.set(e.pointerId,{...old,x:e.clientX,y:e.clientY});
      if(state.touches.size===1){scroller!.scrollLeft-=dx;scroller!.scrollTop-=dy}
      else if(state.pinchAllowed&&gesture.current){
        const [a,b]=[...state.touches.values()];
        liveConfig.current.onZoom(gesture.current.zoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,gesture.current.distance),(a.x+b.x)/2,(a.y+b.y)/2);
      }
    }
    function touchUp(e:globalThis.PointerEvent){
      if(e.pointerType!=='touch')return;
      const start=touchStart.current.get(e.pointerId),accepted=state.touches.has(e.pointerId);
      if(liveConfig.current.active&&accepted&&start&&!start.moved&&state.touches.size===1&&e.type!=='pointercancel'){
        const p=point(e),config=liveConfig.current;
        if(config.tool==='select'){const target=document.elementFromPoint(e.clientX,e.clientY),mark=markAt(p,target);setSelected(mark?.id??null);setEditing(mark&&!isInk(mark)?mark.id:null);el!.focus({preventScroll:true})}
        else if(config.tool==='text'||config.tool==='sticky'){
          const existing=markAt(p,document.elementFromPoint(e.clientX,e.clientY));
          if(existing&&!isInk(existing)){setSelected(existing.id);setEditing(existing.id);setTool('select');state.up(e.pointerId,e.timeStamp);touchStart.current.delete(e.pointerId);gesture.current=null;return}
          const mark:TextMark={id:crypto.randomUUID(),kind:config.tool,x:p.x,y:p.y,text:'',color:config.tool==='text'?config.color:'#292a33'};
          commit({...docRef.current,marks:[...docRef.current.marks,attachMark(mark,layoutRef.current)]});setSelected(mark.id);setEditing(mark.id);setTool('select');
        }
      }
      state.up(e.pointerId,e.timeStamp);touchStart.current.delete(e.pointerId);gesture.current=null;
    }
    function prevent(e:Event){if(liveConfig.current.active&&!(e.target as Element).closest('textarea,button'))e.preventDefault()}
    el.addEventListener('pointerdown',touchDown,{capture:true,passive:false});el.addEventListener('pointermove',touchMove,{capture:true,passive:false});el.addEventListener('pointerup',touchUp,true);el.addEventListener('pointercancel',touchUp,true);
    el.addEventListener('touchstart',prevent,{passive:false});el.addEventListener('touchmove',prevent,{passive:false});el.addEventListener('contextmenu',prevent);el.addEventListener('selectstart',prevent);
    return()=>{el.removeEventListener('pointerdown',touchDown,true);el.removeEventListener('pointermove',touchMove,true);el.removeEventListener('pointerup',touchUp,true);el.removeEventListener('pointercancel',touchUp,true);el.removeEventListener('touchstart',prevent);el.removeEventListener('touchmove',prevent);el.removeEventListener('contextmenu',prevent);el.removeEventListener('selectstart',prevent)};
    // The component is keyed by score ID; gesture handlers read live config and document refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  function travel(direction:'undo'|'redo'){endEditing();setSelected(null);dirty.current=true;publish(history.current[direction]());window.clearTimeout(saveTimer.current);saveTimer.current=window.setTimeout(persist,350)}
  function remove(){if(selected){commit({...docRef.current,marks:docRef.current.marks.filter(m=>m.id!==selected)});setSelected(null);endEditing()}}
  function keys(e:React.KeyboardEvent){
    if(!active)return;
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.stopPropagation();travel(e.shiftKey?'redo':'undo')}
    if(e.key==='Escape'){endEditing();setSelected(null)}
    if((e.key==='Delete'||e.key==='Backspace')&&!(e.target instanceof HTMLTextAreaElement)){e.preventDefault();remove()}
  }
  const placedMarks=doc.marks.map(mark=>placeMark(mark,layout)).filter((mark):mark is Mark=>mark!==null);
  const selectedMark=placedMarks.find(m=>m.id===selected);
  const tools:[Tool,string][]=[['pen',zh?'笔':'Pen'],['highlighter',zh?'荧光笔':'Highlight'],['arrow',zh?'箭头':'Arrow'],['eraser',zh?'笔画橡皮':'Stroke eraser'],['text',zh?'文字':'Text'],['sticky',zh?'便签':'Sticky'],['select',zh?'选择':'Select']];
  return <>
    {active&&toolbar&&createPortal(<div className="markup-row-surface annotation-toolbar" role="toolbar" aria-label={zh?'批注工具':'Annotation tools'} onKeyDown={keys}>
      {tools.map(([value,label])=><button key={value} className={`markup-icon has-tip ${tool===value?'chosen':''}`} data-tip={label} aria-label={label} aria-pressed={tool===value} onClick={()=>choose(value)}><ToolIcon tool={value}/></button>)}
      <span className="divider"/>
      <span className="annotation-colors">{['#e52e31','#2379c5','#2f9e4c','#222222','#f0ce38'].map(c=><button key={c} style={{'--ink-color':c} as React.CSSProperties} aria-label={`${zh?'颜色':'Color'} ${c}`} aria-pressed={color===c} onClick={()=>setColor(c)}/>)}</span>
      <span className="divider"/>
      <button className="markup-icon history-control has-tip" aria-label={zh?'撤销':'Undo'} data-tip={zh?'撤销':'Undo'} disabled={!historyState.canUndo} onClick={()=>travel('undo')}><PracticeIcon name="undo"/></button><button className="markup-icon history-control has-tip" aria-label={zh?'重做':'Redo'} data-tip={zh?'重做':'Redo'} disabled={!historyState.canRedo} onClick={()=>travel('redo')}><PracticeIcon name="redo"/></button>
      <button className="markup-icon history-control has-tip" aria-label={zh?'清除批注':'Clear'} data-tip={zh?'清除批注':'Clear'} disabled={!doc.marks.length&&!doc.legacy} onClick={()=>{endEditing();setSelected(null);commit(emptyAnnotations())}}><svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 6h12M8 6V4.5a1 1 0 011-1h2a1 1 0 011 1V6M6 6l.6 10.2a1 1 0 001 .8h4.8a1 1 0 001-.8L14 6 M8.5 9v5M11.5 9v5"/></svg></button>
      <button className="markup-close" aria-label={zh?'关闭批注':'Close markup'} onClick={()=>{endEditing();onClose()}}>{zh?'关闭':'Close'}</button>
      {storageError&&<span role="status">{zh?'无法保存。请保持页面打开。':'Could not save. Keep this page open.'}</span>}
    </div>,toolbar)}
    {/* A keyboard-enabled drawing application contains its own text editor. */}
    {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
    <div ref={layer} role="application" aria-label={zh?'乐谱批注':'Score annotations'} tabIndex={active?0:-1} className={`annotation-layer ${active?'is-active':''} tool-${tool}`} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onDoubleClick={e=>{if(active&&tool==='select'){const mark=markAt(point(e),e.target);if(mark&&!isInk(mark))setEditing(mark.id)}}} onKeyDown={keys}>
      {/* Legacy ink is a local data URL, not a network image. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {doc.legacy&&<img draggable={false} className="annotation-legacy" src={doc.legacy.src} alt="" style={{width:doc.legacy.width,height:doc.legacy.height}}/>}
      <svg className="annotation-ink" aria-hidden="true">{placedMarks.filter(isInk).map(mark=><Shape key={mark.id} mark={mark}/>)}<path ref={livePath} fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
      {selectedMark&&isInk(selectedMark)&&active&&<svg className="annotation-selection" aria-hidden="true"><path d={markPath(selectedMark)} fill="none" stroke="#57799d" strokeWidth={selectedMark.width+6} strokeOpacity=".25"/></svg>}
      {placedMarks.filter((m):m is TextMark=>!isInk(m)).map(mark=><div key={mark.id} data-mark-id={mark.id} className={`annotation-text ${mark.kind} ${active&&selected===mark.id?'is-selected':''}`} style={{left:mark.x,top:mark.y,color:mark.color}}>
        {editing===mark.id&&active?<textarea aria-label={mark.kind==='sticky'?'Sticky note':'Annotation text'} value={mark.text} rows={Math.max(1,mark.text.split('\n').length)} style={{width:`${Math.min(28,Math.max(2,...mark.text.split('\n').map(s=>s.length+1)))}ch`}} onBlur={endEditing} onChange={e=>{const text=e.target.value;commit({...docRef.current,marks:docRef.current.marks.map(m=>m.id===mark.id?{...m,text}:m)},`typing:${mark.id}`);e.target.style.height='auto';e.target.style.height=`${e.target.scrollHeight}px`}}/>:<span>{mark.text||' '}</span>}
      </div>)}
    </div>
  </>;
}
