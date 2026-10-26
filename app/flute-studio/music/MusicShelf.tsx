"use client";

import Link from "next/link";
import {useEffect,useLayoutEffect,useRef,useState} from "react";
import {pieceTitle,tagName,type MusicItem} from "../../../content/music-library";
import {StatusButton} from "../components/StatusButton";
import {STATUSES,STATUS_LABELS,STATUS_TONES,setStatus,useStatusEntries,type MusicStatus} from "../lib/musicStatus";
import {useBookProgress} from "../lib/bookProgress";
import {tagTone,BEGINNER_TONE} from "../lib/tagTone";
import "./music-shelf.css";

const STORE_KEY="cookie:music-status:v1",STORE_EVENT="cookie:music-status";

/**
 * Your three lists side by side, like a calm board: Want to learn, Working on, Learned. Cards are the item card
 * (white, hairline, no lift). Moving a piece is the list button on its card, the same one as everywhere else; on a
 * wide screen a card can also be dragged to another column. Phones show one column at a time and swipe sideways,
 * with the next column peeking in. A piece that has just arrived on Learned gets a small sage ring and a tick.
 */
export default function MusicShelf({items,zh,focus,filtered}:{items:MusicItem[];zh:boolean;focus?:MusicStatus;filtered:boolean}){
  const entries=useStatusEntries();
  const byId=new Map(items.map(item=>[item.id,item]));
  // Most recently moved first, so what you just put on a list is at the top of it.
  const columns=Object.fromEntries(STATUSES.map(status=>[status,entries.filter(entry=>entry.status===status&&byId.has(entry.id)).map(entry=>byId.get(entry.id)!)])) as Record<MusicStatus,MusicItem[]>;
  const nothingListed=!entries.some(entry=>byId.has(entry.id));

  // What arrived on a list since the shelf opened, for a moment, so it can animate in. Read from the store's own
  // change event (not a render), comparing each entry's time with the last one seen.
  const [fresh,setFresh]=useState<Record<string,MusicStatus>>({});
  useEffect(()=>{
    const latest=()=>{try{return JSON.parse(localStorage.getItem(STORE_KEY)||"{}") as Record<string,{status:MusicStatus|null;at:number}>}catch{return {}}};
    let seen=Math.max(0,...Object.values(latest()).map(entry=>Number(entry?.at)||0));
    const timers:number[]=[];
    const onChange=()=>{
      const arrived:Record<string,MusicStatus>={};
      for(const [id,entry] of Object.entries(latest())){
        const at=Number(entry?.at)||0;
        if(at>seen&&entry.status)arrived[id]=entry.status;
        seen=Math.max(seen,at);
      }
      if(!Object.keys(arrived).length)return;
      setFresh(current=>({...current,...arrived}));
      timers.push(window.setTimeout(()=>setFresh(current=>{const next={...current};for(const id of Object.keys(arrived))if(next[id]===arrived[id])delete next[id];return next}),1600));
    };
    window.addEventListener(STORE_EVENT,onChange);
    return()=>{window.removeEventListener(STORE_EVENT,onChange);timers.forEach(clearTimeout)};
  },[]);

  // Opened from a list link (the rail's Want to learn, My Studio): on a phone, start on that column; on a wide
  // screen all three are in view, so the column just glows once.
  const board=useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{
    if(!focus)return;
    const column=board.current?.querySelector<HTMLElement>(`[data-status="${focus}"]`);
    if(column&&board.current)board.current.scrollLeft=column.offsetLeft-board.current.offsetLeft;
  },[focus]);

  // Dragging is a shortcut for a mouse or a pencil on a wide screen; the list button does the same job everywhere.
  const [dragging,setDragging]=useState<string|null>(null);
  const [over,setOver]=useState<MusicStatus|null>(null);
  const drop=(status:MusicStatus,event:React.DragEvent)=>{
    event.preventDefault();
    const id=event.dataTransfer.getData("text/x-cookie-piece")||dragging;
    setOver(null);setDragging(null);
    if(id&&columns[status].every(item=>item.id!==id))setStatus(id,status);
  };

  return <>
    {nothingListed&&!filtered&&<p className="music-shelf__hint">{zh?"在列表里点曲目旁的 +，它就会出现在这里。":"Tap + beside any piece in the List and it lands here."}</p>}
    <div className="music-shelf" ref={board}>
      {STATUSES.map(status=><section key={status} data-status={status}
        className={`music-shelf__column${over===status?" is-over":""}${focus===status?" is-focus":""}`}
        aria-label={STATUS_LABELS[status][zh?"zh":"en"]}
        onDragOver={event=>{if(!dragging)return;event.preventDefault();event.dataTransfer.dropEffect="move";if(over!==status)setOver(status)}}
        onDragLeave={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setOver(current=>current===status?null:current)}}
        onDrop={event=>drop(status,event)}>
        <h2 className="music-shelf__head"><i className="status-dot" data-tone={STATUS_TONES[status]} aria-hidden="true"/>{STATUS_LABELS[status][zh?"zh":"en"]}<span key={columns[status].length}>{columns[status].length}</span></h2>
        <div className="music-shelf__cards">
          {columns[status].map(item=><ShelfCard key={item.id} item={item} zh={zh} arrived={fresh[item.id]===status?status:undefined}
            dragging={dragging===item.id} onDrag={setDragging}/>)}
          {/* An empty column keeps a quiet outline, which is also where a dragged card can land. No words. */}
          {!columns[status].length&&<div className="music-shelf__empty" aria-hidden="true"/>}
        </div>
      </section>)}
    </div>
  </>;
}

function ShelfCard({item,zh,arrived,dragging,onDrag}:{item:MusicItem;zh:boolean;arrived?:MusicStatus;dragging:boolean;onDrag:(id:string|null)=>void}){
  const exercise=item.exercise;
  const title=exercise&&zh?exercise.zhTitle:pieceTitle(item,zh);
  const detail=exercise?(zh?exercise.zhDetail:exercise.detail):item.composer;
  // One tag says what kind of music it is; the row in the List view carries the rest.
  const tag=item.tags[0];
  const tone=tag?tagTone(tag):item.beginner?BEGINNER_TONE:undefined;
  const kind=tag?tagName(tag,zh):item.beginner?(zh?"入门":"Beginner"):undefined;
  const className=`music-shelf__card${arrived?" is-arrived":""}${arrived==="learned"?" is-learned-now":""}${dragging?" is-dragging":""}`;
  const body=<>
    <b>{title}</b>
    {detail&&<small>{detail}</small>}
    <span className="music-shelf__meta">
      {kind&&<span className="music-shelf__kind" data-tone={tone}><i aria-hidden="true"/>{kind}</span>}
      {item.bookCount?<BookProgress id={item.id} count={item.bookCount} zh={zh}/>:null}
    </span>
  </>;
  return <article className={className} draggable={!!item.viewerPath}
    onDragStart={event=>{event.dataTransfer.setData("text/x-cookie-piece",item.id);event.dataTransfer.effectAllowed="move";onDrag(item.id)}}
    onDragEnd={()=>onDrag(null)}>
    {item.viewerPath?<Link className="music-shelf__main" href={item.viewerPath} draggable={false}>{body}</Link>:<span className="music-shelf__main">{body}</span>}
    <StatusButton id={item.id} zh={zh} compact/>
    {arrived==="learned"&&<svg className="music-shelf__tick" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11"/><path d="m7.5 12.4 3 3 6-6.6"/></svg>}
  </article>;
}

/** A book's numbers you have marked done, as a thin bar and "4 of 15". */
function BookProgress({id,count,zh}:{id:string;count:number;zh:boolean}){
  const done=Math.min(count,useBookProgress(id).done.length);
  return <span className="music-shelf__book" aria-label={zh?`已完成 ${done}/${count}`:`${done} of ${count} done`}>
    <span className="music-shelf__bar"><i style={{width:`${done/count*100}%`}}/></span>
    <span aria-hidden="true">{zh?`${done}/${count}`:`${done} of ${count}`}</span>
  </span>;
}
