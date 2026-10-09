"use client";
import {usePrivateMusic} from "../lib/privateMusic";

import Link from "next/link";
import {useEffect,useState,type ReactNode} from "react";
import {flushSync} from "react-dom";
import {useLanguage} from "../i18n/LanguageContext";
import {useTrickyBits} from "../lib/trickyBits";
import {readSessions,type PracticeSession} from "../practice-data";
import {useRecents} from "../lib/storage";
import {useStatusEntries,setStatus,STATUS_LABELS,STATUS_TONES} from "../lib/musicStatus";
import {readScaleSets,scaleSetsEvent,type ScaleSet} from "../exercises/scales/saved-sets";
import {daysUntil,useDeadlines,type Deadline} from "../lib/deadlines";
import {hasTag,pieceTitle} from "../../../content/music-library";
import {tagTone} from "../lib/tagTone";
import {DeadlineDialog} from "./DeadlineDialog";
import {repDay,repTotals,repsOnDay,useRepLog} from "../lib/repLog";
import "../components/status-button.css";
import "../components/tag-pill.css";
import {musicLibrary as publicMusic,libraryShelf as publicShelf} from "../../../content/music-library";
import {exerciseCatalog} from "../../../content/exercise-catalog";
import {PracticeCalendar} from "../PracticeCalendar";
import {PitchTendencies} from "./PitchTendencies";
import {type SuggestItem} from "./SuggestField";
import {PracticeCard,type RoutineItem} from "./PracticeCard";
import {PracticeIcon} from "../components/PracticeIcon";
import {deleteSession,restoreSession} from "../lib/practiceClock";
import "../home-preview-cards.css";
import "./practice-page.css";

const routineKey="cookie:practice-routine";
const dayMs=86400000;
const dateKey=(value:Date)=>value.toDateString();

/** Consecutive days up to today, and the longest run in the past year. */
function streaks(active:Set<string>,now:number){
  let current=0,cursor=new Date(now);
  while(active.has(dateKey(cursor))){current+=1;cursor=new Date(cursor.getTime()-dayMs)}
  let longest=0,run=0;
  for(let i=364;i>=0;i-=1){
    if(active.has(dateKey(new Date(now-i*dayMs)))){run+=1;longest=Math.max(longest,run)}
    else run=0;
  }
  return {current,longest};
}
/** `ref` is a library id when the step was picked rather than typed, so a
 *  routine step can link back to the thing it is asking you to play. */
type StudioListItem={id:string;title:string;composer:string;viewerPath:string|null};

function readRoutine():RoutineItem[]{try{const saved=JSON.parse(localStorage.getItem(routineKey)??"[]");return Array.isArray(saved)?saved:[]}catch{return []}}


export default function PracticePage(){
  const privateMusic=usePrivateMusic();
  const libraryShelf=[...publicShelf,...privateMusic.items];
  const musicLibrary=[...publicMusic,...privateMusic.items];
  const {t,lang}=useLanguage(),zh=lang==="zh",{bits:trickyBits}=useTrickyBits();
  const [routine,setRoutine]=useState<RoutineItem[]>([]);
  // The calendar day whose sessions show.
  const [day,setDay]=useState<string|null>(null),[removed,setRemoved]=useState<PracticeSession|null>(null);
  const [sessions,setSessions]=useState<PracticeSession[]>([]);
  // Captured once on mount rather than read during render: "today" is a
  // clock read, and rendering has to be pure for the same input.
  const [now,setNow]=useState(0);
  // Both already exist and are already written to — the score viewer records
  // every piece it opens, and the star control writes favourites. Nothing
  // was reading them back anywhere you could actually browse.
  const {ids:recentIds}=useRecents("music",8);
  const listEntries=useStatusEntries();
  const deadlines=useDeadlines();
  // The deadline being edited: null is closed, "new" is a new one.
  const [editing,setEditing]=useState<Deadline|"new"|null>(null);
  // Which of the lower shelves (Want to learn, Learned, Recently opened) are open.
  // Each section shows one row (up to ROW cards); "Show all" opens the rest. Nothing folds to a bare heading.
  const ROW=5;
  const [showAll,setShowAll]=useState<Record<string,boolean>>({});
  const moreToggle=(key:string,count:number)=>count>ROW&&<button type="button" className="text-action" aria-expanded={!!showAll[key]} onClick={()=>setShowAll(all=>({...all,[key]:!all[key]}))}>{showAll[key]?(zh?"收起":"Show fewer"):(zh?`全部 ${count} 个`:`Show all ${count}`)}</button>;
  const firstRow=<T,>(key:string,list:T[])=>showAll[key]?list:list.slice(0,ROW);
  // Saved Scale Studio sets can be Fundamentals items ("Thirds in D", not just "Scale Studio").
  const [scaleSets,setScaleSets]=useState<ScaleSet[]>([]);
  useEffect(()=>{
    const sync=()=>setScaleSets(readScaleSets());
    sync();
    window.addEventListener(scaleSetsEvent,sync);window.addEventListener("storage",sync);
    return()=>{window.removeEventListener(scaleSetsEvent,sync);window.removeEventListener("storage",sync)};
  },[]);

  useEffect(()=>{
    // Routine and sessions both live in localStorage, which is not readable
    // during SSR — so they are read once after hydration rather than as
    // initial state, which is what this rule is warning about.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRoutine(readRoutine());
    const update=()=>setSessions(readSessions());
    update();
    window.addEventListener("cookie:practice-updated",update);
    return()=>window.removeEventListener("cookie:practice-updated",update);
  },[]);

  function saveRoutine(next:RoutineItem[]){setRoutine(next);localStorage.setItem(routineKey,JSON.stringify(next))}


  const itemTypeLabels:Record<PracticeSession["itemType"],string>={repertoire:t.library.repertoire,exercise:t.library.exercise,etude:t.library.etude,method:t.library.method,"warm-up":t.library.warmup,focus:t.pomodoro.focus};
  // The same numbers the landing page used to show. They belong here —
  // this is the page about your practice — and they are rendered as a
  // quiet row rather than four oversized figures.
  const minutesOn=(match:(key:string)=>boolean)=>Math.round(
    sessions.filter(session=>match(dateKey(new Date(session.startedAt))))
      .reduce((total,session)=>total+session.durationSeconds,0)/60);
  const today=dateKey(new Date(now));
  const weekKeys=new Set(Array.from({length:7},(_,i)=>dateKey(new Date(now-i*dayMs))));
  const run=streaks(new Set(sessions.map(session=>dateKey(new Date(session.startedAt)))),now);
  const stats=[
    {label:zh?"今天":"Today",value:minutesOn(key=>key===today),unit:zh?"分钟":"min"},
    {label:zh?"本周":"This week",value:minutesOn(key=>weekKeys.has(key)),unit:zh?"分钟":"min"},
    {label:zh?"连续":"Streak",value:run.current,unit:zh?"天":run.current===1?"day":"days"},
    {label:zh?"最长":"Best",value:run.longest,unit:zh?"天":run.longest===1?"day":"days"},
  ];
  // Ids are all the stores keep, so titles come from the library — which
  // already contains the exercises as well as the pieces.
  const exerciseItems:StudioListItem[]=exerciseCatalog.map(item=>({id:item.id,title:zh?item.zhTitle:item.title,composer:zh?"练习":"Exercise",viewerPath:item.href}));
  const byId=new Map<string,StudioListItem>([...musicLibrary,...libraryShelf.filter(item=>item.bookCount)].map(item=>[item.id,{...item,title:pieceTitle(item,zh)}] as [string,StudioListItem]).concat(exerciseItems.map(item=>[item.id,item])));
  const recentItems=recentIds.map(id=>byId.get(id)).filter((item):item is StudioListItem=>!!item);
  // Your lists in the order you would pick up from: working on, want to learn, learned.
  const listItems=(["working","want","learned"] as const)
    .flatMap(status=>listEntries.filter(entry=>entry.status===status).map(entry=>({entry,item:byId.get(entry.id)})))
    .filter((row):row is {entry:typeof listEntries[number];item:StudioListItem}=>!!row.item);

  const findable:SuggestItem[]=[...exerciseItems,...musicLibrary,...scaleSets.map(set=>({id:`scale-set:${set.id}`,title:set.name,composer:zh?"音阶工作室":"Scale Studio"}))];
  // Private pieces on a list resolve once the access code has unlocked them; until then say so rather than look empty.
  const restoring=privateMusic.loading&&listEntries.some(entry=>!byId.has(entry.id));
  const statusLabel=(status:"working"|"want"|"learned")=>zh?STATUS_LABELS[status].zh:({working:"Working on",want:"Want to learn",learned:"Learned"})[status];
  /** When you last logged practice on it (a book counts its numbered pieces). Plain words, no colour: a piece you are
   *  sure of does not need playing every day, so this is information, not a warning. */
  const lastPractised=(id:string)=>{
    const times=sessions.filter(session=>session.itemId===id||session.itemId.startsWith(`${id}-no-`)).map(session=>new Date(session.startedAt).getTime());
    if(!times.length||!now)return null;
    const days=Math.floor((new Date(today).getTime()-new Date(dateKey(new Date(Math.max(...times)))).getTime())/dayMs);
    if(days<=0)return zh?"今天练过":"Practised today";
    if(days===1)return zh?"昨天练过":"Practised yesterday";
    if(days<14)return zh?`${days} 天前练过`:`Practised ${days} days ago`;
    return zh?`${Math.round(days/7)} 周前练过`:`Practised ${Math.round(days/7)} weeks ago`;
  };
  const workingRows=listItems.filter(row=>row.entry.status==="working");
  // Tricky bits by piece, pieces in the order you first saved a bit from them, bars in order inside each.
  const trickyGroups=[...trickyBits.reduce((map,bit)=>map.set(bit.pieceId,[...(map.get(bit.pieceId)??[]),bit]),new Map<string,typeof trickyBits>())]
    .map(([pieceId,bits])=>[pieceId,[...bits].sort((a,b)=>a.from-b.from)] as const)
    .sort((a,b)=>Math.min(...a[1].map(bit=>bit.addedAt))-Math.min(...b[1].map(bit=>bit.addedAt)));
  /** A shelf under Working on, with its own heading. Only there when it has something in it; the quieter ones fold. */
  /** The fold button that is a shelf's heading: its name, its count, a chevron. */
  /** A section's heading: its name and how many are in it. */
  const shelfHeading=(label:string,count:number,id?:string)=><h2 className="home-preview__group shelf__title" id={id}>{label}<small>{count}</small></h2>;
  /** A section's way out to its full page, beside the heading (the heading itself folds, so it can't be the link). */
  const sectionLink=(href:string,label:string)=><Link className="section-head__action" href={href}>{label}</Link>;
  const shelf=(key:string,label:string,count:number,cards:ReactNode[],link?:ReactNode)=>{
    if(!count)return null;
    return <section id={`shelf-${key}`} className="shelf" key={key} aria-label={label}>
      <div className="section-head">{shelfHeading(label,count)}<span className="section-head__actions">{moreToggle(key,count)}{link}</span></div>
      <ul className="working__grid">{firstRow(key,cards as ReactNode[])}</ul>
    </section>;
  };
  // The three reference lists as stacks; one opens at a time. The browser animates the change (view transitions) where
  // it can: the top card glides into the grid and the rest fan out; elsewhere it simply switches.
  const stackLists=[
    {key:"want",label:statusLabel("want"),href:"/flute-studio/music?list=want",items:listItems.filter(row=>row.entry.status==="want").map(row=>row.item)},
    {key:"learned",label:statusLabel("learned"),href:"/flute-studio/music?list=learned",items:listItems.filter(row=>row.entry.status==="learned").map(row=>row.item)},
    {key:"recent",label:zh?"最近打开":"Recently opened",href:null as string|null,items:recentItems.slice(0,10)},
  ];
  const [openStack,setOpenStack]=useState<string|null>(null);
  const openStackList=stackLists.find(list=>list.key===openStack&&list.items.length)??null;
  const cardName=(list:string,id:string)=>`stack-${list}-${id}`.replace(/[^a-zA-Z0-9-]/g,"-");
  const toggleStack=(key:string)=>{
    const change=()=>flushSync(()=>setOpenStack(current=>current===key?null:key));
    const start=(document as Document&{startViewTransition?:(update:()=>void)=>unknown}).startViewTransition;
    if(start&&!matchMedia("(prefers-reduced-motion: reduce)").matches)start.call(document,change);else change();
  };
  // Deadlines still ahead (today counts), soonest first; the rest fold away under Past.
  const upcoming=now?deadlines.filter(item=>daysUntil(item.date,now)>=0):[];
  const past=now?deadlines.filter(item=>daysUntil(item.date,now)<0).reverse():[];
  const whenLabel=(date:string)=>{
    const days=daysUntil(date,now);
    if(days===0)return zh?"今天":"Today";
    if(days===1)return zh?"明天":"Tomorrow";
    if(days>0&&days<15)return zh?`${days} 天后`:`in ${days} days`;
    const [y,m,d]=date.split("-").map(Number);
    return new Date(y,m-1,d).toLocaleDateString(zh?"zh-CN":undefined,{month:"short",day:"numeric"});
  };
  // A deadline's piece shows which list it is on, with the same dot as everywhere else (no dot: on no list).
  const statusOf=new Map(listEntries.map(entry=>[entry.id,entry.status]));
  const statusDot=(id:string)=>{const status=statusOf.get(id);return status?<i className="status-dot" data-tone={STATUS_TONES[status]} aria-label={statusLabel(status)}/>:<i className="status-dot status-dot--none" aria-hidden="true"/>};
  const deadlinePieces:SuggestItem[]=musicLibrary.filter(item=>!hasTag(item,"exercise")).map(item=>({id:item.id,title:item.title,composer:item.composer}));
  const deadlineCard=(deadline:Deadline)=><article className="deadline-card" key={deadline.id}>
    <div className="deadline-card__head">
      <button type="button" className="deadline-card__name" onClick={()=>setEditing(deadline)} aria-label={zh?`编辑 ${deadline.name}`:`Edit ${deadline.name}`}>{deadline.name}</button>
      <span className="deadline-card__when">{whenLabel(deadline.date)}</span>
    </div>
    {deadline.pieces.length>0&&<ul className="deadline-card__pieces">
      {deadline.pieces.map(id=>{const item=byId.get(id);return item&&<li key={id}>
        {item.viewerPath?<Link className="piece-chip" href={item.viewerPath}>{statusDot(id)}{item.title}</Link>:<span className="piece-chip">{statusDot(id)}{item.title}</span>}
      </li>})}
    </ul>}
  </article>;
  // Only the kinds worth telling apart get a pill: an exercise, an etude, an orchestral excerpt. Repertoire gets none.
  const kindOf=(id:string)=>{
    if(exerciseItems.some(entry=>entry.id===id))return "exercise";
    const entry=[...musicLibrary,...libraryShelf].find(candidate=>candidate.id===id);
    return entry?(["exercise","etude","excerpt"] as const).find(kind=>hasTag(entry,kind))??null:null;
  };
  const KIND_LABELS={exercise:{en:"Exercise",zh:"练习"},etude:{en:"Etude",zh:"练习曲"},excerpt:{en:"Excerpt",zh:"乐队选段"}};
  const workingCard=(item:StudioListItem)=>{
    const forDeadline=upcoming.find(deadline=>deadline.pieces.includes(item.id)),kind=kindOf(item.id);
    const meta=lastPractised(item.id)??"";
    const body=<><b>{item.title}</b><small>{item.composer}</small>{meta&&<small className="working-card__meta">{meta}</small>}
      {(kind||forDeadline)&&<span className="working-card__pills">
        {kind&&<span className="tag-pill" data-tone={tagTone(kind)}>{zh?KIND_LABELS[kind].zh:KIND_LABELS[kind].en}</span>}
        {forDeadline&&<span className="tag-pill" data-tone="sand">{forDeadline.name}</span>}
      </span>}</>;
    return <li key={item.id} className="working-card">
      {item.viewerPath?<Link href={item.viewerPath}>{body}</Link>:<span className="is-disabled">{body}</span>}
      <button type="button" className="working-card__remove"
        aria-label={zh?`把 ${item.title} 移出正在练`:`Take ${item.title} off Working on`} onClick={()=>setStatus(item.id,null)}><PracticeIcon name="delete"/></button>
    </li>;
  };
  // The day picked on the calendar (today until you pick another) and what was practised then.
  const shownDay=day??(now?today:null);
  const daySessions=shownDay?sessions.filter(session=>dateKey(new Date(session.startedAt))===shownDay):[];
  const dayMinutes=Math.round(daySessions.reduce((sum,session)=>sum+session.durationSeconds,0)/60);
  // Repetitions you counted (Scale Studio, tricky bits): that day's, and every day added up.
  const repLog=useRepLog();
  const dayReps=shownDay?repsOnDay(repLog,repDay(new Date(shownDay).getTime())):[];
  const allTallies=repTotals(repLog),mostPractised=showAll.tallies?allTallies:allTallies.slice(0,ROW);
  // Where your time goes, from every logged session: by kind of practice. Free practice on the clock, and anything
  // not tied to a piece or exercise, is "Other".
  const TIME_KINDS=[
    {key:"scales",en:"Scales",zh:"音阶",tone:"blue"},{key:"exercise",en:"Exercises",zh:"练习",tone:"sage"},
    {key:"repertoire",en:"Repertoire",zh:"曲目",tone:"lavender"},{key:"etude",en:"Etudes",zh:"练习曲",tone:"sand"},
    {key:"other",en:"Other",zh:"其他",tone:"grey"},
  ] as const;
  const kindOfSession=(session:PracticeSession)=>/^scale/.test(session.itemId)?"scales":session.itemType==="exercise"||session.itemType==="warm-up"?"exercise":session.itemType==="repertoire"?"repertoire":session.itemType==="etude"||session.itemType==="method"?"etude":"other";
  const totalSeconds=sessions.reduce((sum,session)=>sum+session.durationSeconds,0);
  const timeByKind=TIME_KINDS.map(kind=>({...kind,seconds:sessions.filter(session=>kindOfSession(session)===kind.key).reduce((sum,session)=>sum+session.durationSeconds,0)})).filter(kind=>kind.seconds>0);
  const averageMinutes=sessions.length?Math.round(totalSeconds/sessions.length/60):0,longestMinutes=Math.round(Math.max(0,...sessions.map(session=>session.durationSeconds))/60);
  const hoursText=totalSeconds>=3600?(zh?`${(totalSeconds/3600).toFixed(1)} 小时`:`${(totalSeconds/3600).toFixed(1)} h`):(zh?`${Math.round(totalSeconds/60)} 分钟`:`${Math.round(totalSeconds/60)} min`);
  const atTempos=(reps:Record<string,number>)=>Object.entries(reps).filter(([,count])=>count>0).sort((a,b)=>Number(a[0])-Number(b[0])).map(([tempo,count])=>zh?`${tempo} 速度 ${count} 次`:`${count} at ${tempo}`).join(" · ");

  // Adding a deadline sits with the music it is for: beside Coming up, or beside Working on before there is one.
  const addDeadline=<button type="button" className="section-head__action" onClick={()=>setEditing("new")}>{zh?"+ 截止日期":"+ Deadline"}</button>;
  return <main className="practice-page">
    <div className="practice-page__content">
      <header className="practice-page__header" data-tab-title>
        <h1>{t.practicePage.title}</h1>
      </header>

      {/* Two labelled bands: getting a practice going (timer, routine, your music), then what the practice shows. */}
      <PracticeCard routine={routine} zh={zh} findable={findable} onRoutine={saveRoutine}
        lookup={id=>{const item=byId.get(id);return item?{viewerPath:item.viewerPath,isExercise:exerciseItems.some(entry=>entry.id===id)}:undefined}}
        labels={{title:zh?"今天的练习":"Today’s practice",start:t.pomodoro.start,pause:t.pomodoro.pause,resume:t.pomodoro.resume,markDone:t.practicePage.markStepDone,remove:t.practicePage.removeStep,addAria:t.practicePage.routineAddAria}}/>
      {/* Coming up: only there when a deadline is. Each piece is a pill straight into its score. */}
      {upcoming.length>0&&<section id="coming-up" className="deadlines" aria-label={zh?"即将到来":"Coming up"}>
        <div className="section-head">{shelfHeading(zh?"即将到来":"Coming up",upcoming.length)}{addDeadline}</div>
        {upcoming.map(deadlineCard)}
      </section>}
      {past.length>0&&<details className="deadlines deadlines--past">
        <summary>{zh?`已过去 (${past.length})`:`Past (${past.length})`}</summary>
        {past.map(deadlineCard)}
      </details>}
      {editing&&<DeadlineDialog deadline={editing==="new"?null:editing} pieces={deadlinePieces} zh={zh}
        statuses={Object.fromEntries(listEntries.map(entry=>[entry.id,entry.status]))} onClose={()=>setEditing(null)}/>}
      {/* Working on: what is on your plate, as cards. Only there when something is; Edit takes things off. */}
      {workingRows.length>0&&<section id="working-on" className="working" aria-labelledby="working-title">
        <div className="section-head">{shelfHeading(statusLabel("working"),workingRows.length,"working-title")}<span className="section-head__actions">{moreToggle("working",workingRows.length)}{!upcoming.length&&addDeadline}{sectionLink("/flute-studio/music?list=working",zh?"在曲库中查看":"See in Library")}</span></div>
        <ul className="working__grid">{firstRow("working",workingRows).map(({item})=>workingCard(item))}</ul>
      </section>}
      {restoring&&<p className="practice-card__empty">{zh?"正在恢复曲目…":"Restoring your music…"}</p>}
      {/* Tricky bits stay open (they are practice); the lists fold, each only there when it has something in it. */}
      {shelf("tricky",t.trickyBits.title,trickyBits.length,trickyGroups.map(([pieceId,bits])=><li key={pieceId} className="working-card tricky-group-card">
        <div><b>{musicLibrary.find(entry=>entry.id===pieceId)?.title??(privateMusic.unlocked||privateMusic.loading?pieceId:(zh?"私人乐谱（未解锁）":"Private piece (locked)"))}</b>
          <ul>{bits.map(bit=><li key={bit.id}><Link href={`/flute-studio/tricky-bits?open=${encodeURIComponent(bit.id)}`}>{t.trickyBits.bars} {bit.label}{bit.tempos.length?<small> · {Math.max(...bit.tempos)}</small>:null}</Link></li>)}</ul>
        </div>
      </li>),sectionLink("/flute-studio/tricky-bits",zh?"打开难点练习":"Open Tricky bits"))}
      {/* The lists you look things up in, as three stacks in one row (like Dock stacks): the top card shows, the
          title opens the full list, and tapping the stack fans its cards out below. */}
      {stackLists.some(list=>list.items.length)&&<>
        <div className="list-stacks">{stackLists.filter(list=>list.items.length).map(list=>{
          const open=openStack===list.key,top=list.items[0];
          return <section className={open?"list-stack is-open":"list-stack"} key={list.key} aria-label={list.label}>
            <h2 className="list-stack__title">{list.href?<Link href={list.href}>{list.label}</Link>:list.label}<small>{list.items.length}</small></h2>
            <button type="button" className={list.items.length>1?"list-stack__pile has-more":"list-stack__pile"} aria-expanded={open} aria-controls="list-stack-open"
              aria-label={open?(zh?`收起${list.label}`:`Close ${list.label}`):(zh?`展开${list.label}`:`Open ${list.label}`)} onClick={()=>toggleStack(list.key)}>
              <span className="list-stack__card" style={open?undefined:{viewTransitionName:cardName(list.key,top.id)}}><b>{top.title}</b><small>{top.composer}</small></span>
            </button>
          </section>;
        })}</div>
        {openStackList&&<ul className="working__grid list-stack__open" id="list-stack-open">{openStackList.items.map(item=><li key={item.id} className="working-card" style={{viewTransitionName:cardName(openStackList.key,item.id)}}>
          {item.viewerPath?<Link href={item.viewerPath}><b>{item.title}</b><small>{item.composer}</small></Link>:<span className="is-disabled"><b>{item.title}</b><small>{item.composer}</small></span>}
        </li>)}</ul>}
      </>}

      <h2 className="home-preview__group" id="insights">{zh?"练习洞察":"Practice insights"}</h2>
      {/* The month, coloured by minutes practised; pick a day to see what you played. This replaces the long history list. */}
      <section className="studio-month" aria-label={zh?"练习日历":"Practice calendar"}>
        <PracticeCalendar sessions={sessions} selected={shownDay} onSelect={setDay} legend>
          {/* The running totals belong with the month they summarise. */}
          <ul className="stats-row">
            {stats.map(stat=><li key={stat.label}>
              <b>{stat.value}<span>{stat.unit}</span></b>
              <small>{stat.label}</small>
            </li>)}
          </ul>
        </PracticeCalendar>
        <section className="practice-card studio-day" aria-labelledby="day-title">
          <div className="practice-card__heading">
            <h2 id="day-title">{shownDay?new Date(shownDay).toLocaleDateString(zh?"zh-CN":undefined,{weekday:"long",month:"long",day:"numeric"}):""}</h2>
            {daySessions.length>0&&<span className="studio-day__total">{t.practicePage.minutesTotal(dayMinutes)}</span>}
          </div>
          {removed&&<p className="studio-day__undo">{zh?`已删除“${removed.title}”。`:`Deleted “${removed.title}”.`} <button type="button" onClick={()=>{restoreSession(removed);setRemoved(null)}}>{zh?"撤销":"Undo"}</button></p>}
          {daySessions.length
            ?<ul className="studio-day__list">{daySessions.map(session=><li key={session.id}>
              <span className="history-day__title">{session.title}</span>
              <span className="history-day__meta">{itemTypeLabels[session.itemType]} · {Math.max(1,Math.round(session.durationSeconds/60))} {zh?"分钟":"min"}</span>
              {/* Logged by mistake? Take it out; Undo brings it back. */}
              <button type="button" className="studio-day__delete has-tip" data-tip={zh?"删除":"Delete"} aria-label={zh?`删除 ${session.title}`:`Delete ${session.title}`}
                onClick={()=>{setRemoved(session);deleteSession(session.id)}}><PracticeIcon name="delete"/></button>
              {session.reflection?.trim()&&<p className="history-day__note">{session.reflection.trim()}</p>}
            </li>)}</ul>
            :!dayReps.length&&<p className="practice-card__empty">{zh?"这天没有练习记录。":"No practice logged this day."}</p>}
          {dayReps.length>0&&<div className="studio-day__reps">
            <h3>{zh?"重复次数":"Repetitions"}</h3>
            <ul>{dayReps.map(row=><li key={row.key}><span className="history-day__title">{row.title}</span><span className="history-day__meta">{atTempos(row.reps)}</span><b>{row.total}</b></li>)}</ul>
          </div>}
        </section>
      </section>
      {/* Like a year-in-music list: what you have repeated most, all days added up. Only once there is something to show. */}
      {(timeByKind.length>0||allTallies.length>0)&&<div className="insight-cards">
      {timeByKind.length>0&&<section className="practice-card time-split" aria-labelledby="time-split-title">
        <h2 id="time-split-title">{zh?"时间都花在哪":"Where your time goes"}</h2>
        <div className="time-split__bar" role="img" aria-label={timeByKind.map(kind=>`${zh?kind.zh:kind.en} ${Math.round(kind.seconds/totalSeconds*100)}%`).join(", ")}>
          {timeByKind.map(kind=><i key={kind.key} data-tone={kind.tone} style={{flexGrow:kind.seconds}}/>)}
        </div>
        <ul className="time-split__legend">{timeByKind.map(kind=><li key={kind.key}><i data-tone={kind.tone} aria-hidden="true"/>{zh?kind.zh:kind.en}<b>{Math.round(kind.seconds/totalSeconds*100)}%</b></li>)}</ul>
        <p className="time-split__stats">{[zh?`平均每次 ${averageMinutes} 分钟`:`Average session ${averageMinutes} min`,zh?`最长 ${longestMinutes} 分钟`:`Longest ${longestMinutes} min`,zh?`共 ${hoursText}`:`${hoursText} in all`].join(" · ")}</p>
      </section>}
      {mostPractised.length>0&&<section className="practice-card most-practised" aria-labelledby="most-practised-title">
        <div className="section-head"><h2 id="most-practised-title">{zh?"练得最多":"Most practised"}</h2>{moreToggle("tallies",allTallies.length)}</div>
        <ol>{mostPractised.map((row,i)=><li key={row.key}><span className="most-practised__rank">{i+1}</span><span className="most-practised__title">{row.title}</span><b>{row.total}<small>{zh?" 次":row.total===1?" time":" times"}</small></b></li>)}</ol>
      </section>}
      </div>}
      <PitchTendencies zh={zh}/>
    </div>
  </main>;
}
