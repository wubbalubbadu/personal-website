"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {STATUS_TONES,type MusicStatus} from "./lib/musicStatus";
import {daysUntil,type Deadline} from "./lib/deadlines";
import {readLeftOff,type LeftOff} from "./lib/readerActivity";
import {describeSet,readScaleSets,readSetPlays,scaleSetsEvent,warmUpSet,type ScaleSet} from "./exercises/scales/saved-sets";
import {pieceTitle,type MusicItem} from "../../content/music-library";
import type {RoutineItem} from "./practice-data";
import {bitHistoryKey,bitHref,type TrickyBit} from "./lib/trickyBits";
import {tempoPoints,useTempoHistory} from "./lib/tempoHistory";
import "./components/piece-chip.css";

/**
 * Home's Today card: what to pick up right now, one tap each. Rows only appear when they have something real:
 * - Where you left off: the last score you opened, at the bar (or printed page) you were on.
 * - Working on: one or two pieces from that list.
 * - Coming up: the nearest deadline.
 * - Warm-up today: one saved Scale Studio set, by rotation (the one played longest ago).
 * - Routine: how far through today's routine you are (it used to be its own Today card).
 * - Next passage: the tricky bit you have gone longest without, but only while the card has room (three rows or fewer).
 * With no rows at all the card is not drawn.
 */
export function HomeTodayCard({zh,now,library,recentIds,statuses,deadlines,routine,passages=[]}:{
  zh:boolean;now:number;library:MusicItem[];recentIds:string[];statuses:{id:string;status:MusicStatus}[];deadlines:Deadline[];
  routine:{steps:RoutineItem[];done:number;today:string};
  /** Tricky bits you are still working on (not done). */
  passages?:TrickyBit[];
}){
  const history=useTempoHistory();
  const [spots,setSpots]=useState<LeftOff[]>([]),[warmUp,setWarmUp]=useState<ScaleSet|null>(null);
  useEffect(()=>{
    const load=()=>{const all=readScaleSets();setWarmUp(warmUpSet(all,readSetPlays()));setSpots(readLeftOff())};
    load();
    window.addEventListener(scaleSetsEvent,load);window.addEventListener("storage",load);
    return()=>{window.removeEventListener(scaleSetsEvent,load);window.removeEventListener("storage",load)};
  },[]);

  // An excerpt passage's XML is stored as "piece:passage"; the piece is what you open.
  const itemFor=(id:string)=>library.find(entry=>entry.id===id)??library.find(entry=>id.startsWith(`${entry.id}:`));
  const label={leftOff:zh?"上次停在":"Where you left off",working:zh?"正在练":"Working on",coming:zh?"即将到来":"Coming up",warmUp:zh?"今天的热身":"Warm-up today",routine:zh?"练习清单":"Routine"};

  // Where you left off: the newest recent that is a score you can open.
  const last=recentIds.map(id=>({id,item:itemFor(id)})).find(row=>row.item?.viewerPath&&row.item.status==="published");
  const spot=last&&spots.find(entry=>entry.id===last.id);
  const passage=last?.item?.excerpt?.passages?.find(entry=>entry.id===(spot?.passage??last.id.split(":")[1]));
  const leftOffHref=last&&(()=>{
    const query=new URLSearchParams();
    if(passage)query.set("passage",passage.id);
    if(spot?.page&&spot.page>1)query.set("page",String(spot.page));
    if(spot?.bar&&spot.bar>1&&!last.item!.excerpt)query.set("resume",String(spot.bar));
    const search=query.toString();
    return `${last.item!.viewerPath}${search?`?${search}`:""}`;
  })();
  const where=[passage?(zh?passage.zhLabel??passage.label:passage.label):null,
    spot?.bar&&spot.bar>1&&!last?.item?.excerpt?(zh?`第 ${spot.bar} 小节`:`bar ${spot.bar}`):null,
    spot?.page&&spot.page>1?(zh?`第 ${spot.page} 页`:`page ${spot.page}`):null].filter(Boolean).join(" · ");

  // Working on: two pieces, not the one already offered above.
  const working=statuses.filter(entry=>entry.status==="working"&&entry.id!==last?.item?.id)
    .map(entry=>itemFor(entry.id)).filter((item):item is MusicItem=>!!item?.viewerPath);
  const next=deadlines.find(item=>daysUntil(item.date,now)>=0);
  const when=(date:string)=>{const days=daysUntil(date,now);if(days===0)return zh?"今天":"Today";if(days===1)return zh?"明天":"Tomorrow";if(days<15)return zh?`${days} 天后`:`in ${days} days`;const [y,m,d]=date.split("-").map(Number);return new Date(y,m-1,d).toLocaleDateString(zh?"zh-CN":undefined,{month:"short",day:"numeric"})};
  const {steps,done,today}=routine,nextStep=steps.find(step=>step.doneOn!==today);

  const rows=[
    last&&leftOffHref&&<li key="left-off"><span className="card-label">{label.leftOff}</span>
      <Link className="today-card__main" href={leftOffHref}><b>{pieceTitle(last.item!,zh)}</b>{where&&<small>{where}</small>}</Link>
      <Link className="today-card__action" href={leftOffHref} tabIndex={-1} aria-hidden="true">{zh?"继续":"Continue"}</Link></li>,
    working.length>0&&<li key="working"><span className="card-label">{label.working}</span>
      <span className="today-card__chips">{working.slice(0,2).map(item=><Link key={item.id} className="piece-chip" href={item.viewerPath!}><i className="status-dot" data-tone={STATUS_TONES.working} aria-hidden="true"/>{pieceTitle(item,zh)}</Link>)}
        {working.length>2&&<Link className="today-card__more" href="/flute-studio/practice#working-on">{zh?`还有 ${working.length-2} 首`:`${working.length-2} more`}</Link>}</span></li>,
    next&&<li key="coming"><span className="card-label">{label.coming}</span>
      <Link className="today-card__main" href="/flute-studio/practice#coming-up"><b>{next.name}</b><small>{zh?`${next.pieces.length} 首曲子`:`${next.pieces.length} ${next.pieces.length===1?"piece":"pieces"}`}</small></Link>
      <span className="tag-pill" data-tone="sand">{when(next.date)}</span></li>,
    warmUp&&<li key="warm-up"><span className="card-label">{label.warmUp}</span>
      <Link className="today-card__main" href={`/flute-studio/exercises/scales?set=${encodeURIComponent(warmUp.id)}`}><b>{warmUp.name}</b><small>{describeSet(warmUp.config,zh)}</small></Link>
      <Link className="today-card__action" href={`/flute-studio/exercises/scales?set=${encodeURIComponent(warmUp.id)}`} tabIndex={-1} aria-hidden="true">{zh?"开始":"Start"}</Link></li>,
    steps.length>0&&<li key="routine"><span className="card-label">{label.routine}</span>
      <Link className="today-card__main" href="/flute-studio/practice#today"><b>{nextStep?nextStep.text:(zh?"都完成了":"All done")}</b><small>{zh?`${done} / ${steps.length} 项`:`${done} of ${steps.length} done`}</small></Link></li>,
  ].filter(Boolean);
  // Next passage: never practised first (oldest saved), then the one whose last practised day is furthest back.
  const lastDay=(bit:TrickyBit)=>tempoPoints(history[bitHistoryKey(bit)]).at(-1)?.day??"";
  const nextBit=[...passages].sort((a,b)=>lastDay(a).localeCompare(lastDay(b))||a.addedAt-b.addedAt)[0];
  const passageItem=nextBit&&itemFor(nextBit.pieceId);
  if(nextBit&&passageItem&&rows.length<=3){
    const book=passageItem.book&&library.find(entry=>entry.id===passageItem.book!.id);
    const href=bitHref(nextBit);
    rows.push(<li key="passage"><span className="card-label">{zh?"下一段难点":"Next passage"}</span>
      <Link className="today-card__main" href={href}><b>{book?`${book.title} ${passageItem.title}`:pieceTitle(passageItem,zh)}</b><small>{zh?`第 ${nextBit.label} 小节`:`Bars ${nextBit.label}`}{passages.length>1?(zh?` · 共 ${passages.length} 段`:` · ${passages.length} in all`):""}</small></Link>
      <Link className="today-card__action" href={href} tabIndex={-1} aria-hidden="true">{zh?"去练":"Practise"}</Link></li>);
  }
  if(!rows.length)return null;
  return <section className="today-card" aria-labelledby="today-card-title">
    <h3 id="today-card-title" className="today-card__title">{zh?"今天":"Today"}</h3>
    <ul className="today-card__rows">{rows}</ul>
  </section>;
}
