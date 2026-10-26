"use client";

import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import {useLanguage} from "../../i18n/LanguageContext";
import {usePrivateMusic} from "../../lib/privateMusic";
import {musicLibrary as publicMusic,pieceTitle,type MusicItem} from "../../../../content/music-library";
import {useDeadlines} from "../../lib/deadlines";
import {deleteMockRun,drawExcerpts,mockPool,runClock,saveMockRun,useMockRuns,type MockExcerpt,type MockRun} from "../../lib/mockAuditions";
import FixedScoreViewer from "../../components/FixedScoreViewer";
import {ScoreViewer} from "../../components/ScoreViewer";
import BackChevron from "../../components/BackChevron";
import {PracticeIcon} from "../../components/PracticeIcon";
import {CheckIcon} from "../../components/HeaderIcons";
import {RecordingPlayback} from "../../components/RecordingPlayback";
import {micBlockedText} from "../../components/MicBlocked";
import {closeMic,openMic} from "../../lib/audioSession";
import "../../exercises/exercises.css";
import "../../music/books/book.css";
import "../../practice-recorder.css";
import "../practice-page.css";
import "./mock-audition.css";

/**
 * A mock audition from one deadline (?deadline=<id>). Setup: how many, the pause between excerpts, whether to record;
 * the studio draws a running order. Then each excerpt opens in the reader, one at a time, with a short "next up"
 * screen between them, and the end lists what you played and for how long. Everything stays on one page so a single
 * recording can run from the first note to the last.
 */
type Phase={step:"setup"}|{step:"ready";index:number;left:number}|{step:"play";index:number;since:number}|{step:"end"};
const PAUSES=[0,20,30];

/** One take for the whole run, the same way the reader's recorder makes one (nothing is uploaded). */
function useRunRecording(){
  const [take,setTake]=useState<{url:string;type:string;duration:number}|null>(null),[on,setOn]=useState(false),[blocked,setBlocked]=useState(false);
  const recorder=useRef<MediaRecorder|null>(null),stream=useRef<MediaStream|null>(null),chunks=useRef<Blob[]>([]),started=useRef(0);
  useEffect(()=>()=>{if(recorder.current?.state==="recording")recorder.current.stop();closeMic(stream.current)},[]);
  useEffect(()=>()=>{if(take)URL.revokeObjectURL(take.url)},[take]);
  async function start(){
    setTake(null);setBlocked(false);
    try{
      const media=await openMic();stream.current=media;chunks.current=[];
      const next=new MediaRecorder(media);
      next.ondataavailable=event=>{if(event.data.size)chunks.current.push(event.data)};
      next.onstop=()=>{setTake({url:URL.createObjectURL(new Blob(chunks.current,{type:next.mimeType})),type:next.mimeType,duration:(Date.now()-started.current)/1000});closeMic(media)};
      next.start();recorder.current=next;started.current=Date.now();setOn(true);
    }catch{closeMic(stream.current);stream.current=null;setBlocked(true)}
  }
  function stop(){if(recorder.current?.state==="recording")recorder.current.stop();setOn(false)}
  return {take,on,blocked,start,stop,since:started,discard:()=>setTake(null)};
}

export default function MockAuditionPage(){
  const {lang}=useLanguage(),zh=lang==="zh";
  const privateMusic=usePrivateMusic();
  const library:MusicItem[]=[...publicMusic,...privateMusic.items];
  const deadlines=useDeadlines(),runs=useMockRuns();
  // The deadline comes from the address, read after hydration (localStorage and the query are both client-only).
  const [deadlineId,setDeadlineId]=useState<string|null>(null);
  useEffect(()=>{requestAnimationFrame(()=>setDeadlineId(new URLSearchParams(window.location.search).get("deadline")??""))},[]);
  const deadline=deadlines.find(item=>item.id===deadlineId);
  const pool=deadline?mockPool(deadline.pieces,library):[];
  const earlier=runs.filter(run=>run.deadlineId===deadlineId);

  // Setup choices and the drawn order: unset until the deadline is known, then sized like your last run of it.
  const [setup,setSetup]=useState<{count:number;pause:number;order:MockExcerpt[]}|null>(null),[record,setRecord]=useState(false);
  const [run,setRun]=useState<MockRun|null>(null),[phase,setPhase]=useState<Phase>({step:"setup"});
  const recording=useRunRecording();
  useEffect(()=>{
    if(setup||!deadline||!pool.length)return;
    const last=earlier[0],count=last?Math.min(last.items.length,pool.length):Math.min(3,pool.length);
    // A random draw is not a render-time value, so it is made once here after the stores have been read.
    setSetup({count,pause:last?last.pause:20,order:drawExcerpts(pool,count)});
  // pool and earlier are rebuilt every render; their contents only matter once, before the first draw.
  },[setup,deadline,pool.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const count=setup?.count??3,pause=setup?.pause??20,order=setup?.order??[];
  const setPause=(value:number)=>setSetup(current=>current&&{...current,pause:value});
  const setOrder=(next:MockExcerpt[])=>setSetup(current=>current&&{...current,order:next});

  const itemOf=(excerpt:MockExcerpt)=>library.find(entry=>entry.id===excerpt.piece);
  const label=(excerpt:MockExcerpt)=>{
    const item=itemOf(excerpt);
    if(!item)return {title:excerpt.piece,passage:"",composer:""};
    const passage=item.excerpt?.passages?.find(entry=>entry.id===excerpt.passage);
    return {title:pieceTitle(item,zh),passage:passage?(zh?passage.zhLabel??passage.label:passage.label):item.excerpt?(zh?item.excerpt.zhPassage??item.excerpt.passage:item.excerpt.passage):"",composer:item.composer};
  };
  const choices=[...Array.from({length:Math.min(pool.length-1,5)},(_,i)=>i+1),pool.length];
  const choose=(size:number)=>setSetup(current=>current&&{...current,count:size,order:drawExcerpts(pool,size)});

  // Saved as it goes, so leaving halfway still keeps what you played.
  function store(next:Omit<MockRun,"at">){setRun(saveMockRun(next))}
  function begin(){
    if(!deadline||!order.length)return;
    if(record)void recording.start();
    store({id:crypto.randomUUID(),deadlineId:deadline.id,deadlineName:deadline.name,startedAt:Date.now(),pause,items:order});
    setPhase(pause?{step:"ready",index:0,left:pause}:{step:"play",index:0,since:Date.now()});
  }
  function next(){
    if(!run||phase.step!=="play")return;
    const items=run.items.map((item,i)=>i===phase.index?{...item,seconds:Math.round((Date.now()-phase.since)/1000)}:item);
    const last=phase.index>=items.length-1;
    store({...run,items,...(last?{endedAt:Date.now()}:{})});
    if(last){recording.stop();setPhase({step:"end"});return}
    setPhase(run.pause?{step:"ready",index:phase.index+1,left:run.pause}:{step:"play",index:phase.index+1,since:Date.now()});
  }
  // The walk to the next stand: counts down, or one tap when you are ready sooner.
  useEffect(()=>{
    if(phase.step!=="ready")return;
    if(phase.left<=0){setPhase({step:"play",index:phase.index,since:Date.now()});return}
    const timer=window.setTimeout(()=>setPhase({...phase,left:phase.left-1}),1000);
    return()=>window.clearTimeout(timer);
  },[phase]);
  // The recording's clock, shown in the reader's top bar while the run is being recorded.
  const [,tick]=useState(0);
  useEffect(()=>{if(!recording.on)return;const id=window.setInterval(()=>tick(n=>n+1),1000);return()=>window.clearInterval(id)},[recording.on]);
  function saveTake(){
    const take=recording.take;if(!take)return;
    const day=new Date(run?.startedAt??Date.now()),pad=(n:number)=>String(n).padStart(2,"0");
    const ext=take.type.includes("mp4")?"m4a":take.type.includes("ogg")?"ogg":"webm";
    const link=document.createElement("a");link.href=take.url;
    link.download=`mock-audition-${day.getFullYear()}-${pad(day.getMonth()+1)}-${pad(day.getDate())}-${pad(day.getHours())}${pad(day.getMinutes())}.${ext}`;
    link.click();
  }

  const text=zh
    ?{title:"模拟考试",back:"我的练习室",howMany:"几首",all:"全部",pause:"每首之间",off:"不停",record:"录下整场",noRecord:"不录",order:"出场顺序",shuffle:"重新抽",start:"开始",nextUp:"下一首",ready:"准备好了",stop:"结束",next:"下一首",finish:"完成",leave:"离开模拟考试",done:(n:number,time:string)=>`完成：${n} 首，用时 ${time}`,note:"给自己留一句话",again:"再来一次",earlier:"之前的模拟",stopped:(n:number)=>`在第 ${n} 首停下`,delete:"删除",save:"存到设备",discard:"删除录音",never:"录音不会上传。",gone:"找不到这个截止日期。",empty:"这个截止日期里还没有可以读谱的曲目。",seconds:"秒"}
    :{title:"Mock audition",back:"My Studio",howMany:"How many",all:"All",pause:"Between excerpts",off:"Straight on",record:"Record the run",noRecord:"No recording",order:"Running order",shuffle:"Shuffle again",start:"Start",nextUp:"Next up",ready:"I’m ready",stop:"End run",next:"Next excerpt",finish:"Finish",leave:"Leave the mock audition",done:(n:number,time:string)=>`Done: ${n} ${n===1?"excerpt":"excerpts"} in ${time}`,note:"A note to yourself",again:"Run it again",earlier:"Earlier runs",stopped:(n:number)=>`Stopped after ${n}`,delete:"Delete",save:"Save to device",discard:"Delete recording",never:"Recordings are never uploaded.",seconds:"s",gone:"This deadline isn’t here any more.",empty:"Nothing on this deadline has music to read yet."};

  const runningOrder=(items:MockExcerpt[],current?:number)=><ol className="mock-order">
    {items.map((excerpt,i)=>{const name=label(excerpt);return <li key={`${excerpt.piece}:${excerpt.passage??""}`} data-state={current===undefined?undefined:i<current?"done":i===current?"now":undefined}>
      <span className="mock-order__number">{i+1}</span>
      <span className="mock-order__name"><b>{name.title}</b>{name.passage&&<span>{name.passage}</span>}<small>{name.composer}</small></span>
      {excerpt.seconds!==undefined&&<span className="mock-order__time">{runClock(excerpt.seconds,zh)}</span>}
    </li>})}
  </ol>;

  // Playing: the reader itself, one excerpt at a time. Its own Record button gives way to the run's.
  if(run&&phase.step==="play"){
    const excerpt=run.items[phase.index],item=itemOf(excerpt),last=phase.index===run.items.length-1;
    const actions=<span className="book-stepper mock-stepper">
      {recording.on&&<button type="button" className="mock-stepper__rec has-tip" data-tip={zh?"停止录音":"Stop recording"} aria-label={zh?"停止录音":"Stop recording"} onClick={recording.stop}><i aria-hidden="true"/>{(()=>{const whole=Math.floor((Date.now()-recording.since.current)/1000);return `${Math.floor(whole/60)}:${String(whole%60).padStart(2,"0")}`})()}</button>}
      <span className="book-stepper__label" aria-label={zh?`第 ${phase.index+1} 首，共 ${run.items.length} 首`:`Excerpt ${phase.index+1} of ${run.items.length}`}>{phase.index+1} / {run.items.length}</span>
      {/* Mic refused: the reader's notice pill, once, on the first excerpt; the run carries on without a recording. */}
      {recording.blocked&&phase.index===0&&<span className="drone-hint" role="status">{micBlockedText(zh)}</span>}
      <button type="button" className="book-stepper__arrow mock-stepper__next has-tip" data-tip={last?text.finish:text.next} aria-label={last?text.finish:text.next} onClick={next}>{last?<CheckIcon/>:<PracticeIcon name="next"/>}</button>
    </span>;
    const back={href:"/flute-studio/practice",label:text.leave};
    return <div className="mock-run">
      {!item?null:item.excerpt
        ?<FixedScoreViewer key={`${item.id}:${excerpt.passage??""}`} item={item} passage={excerpt.passage} back={back} headerActions={actions}/>
        :<ScoreViewer key={item.id} config={{title:pieceTitle(item,zh),composer:item.composer,asset:item.scorePath!,id:item.id,backHref:back.href,backLabel:text.back,...(item.defaultTempo?{defaultTempo:item.defaultTempo}:{})}} headerActions={()=>actions}/>}
    </div>;
  }

  // Between excerpts: what is next, the countdown, and the list so far.
  if(run&&phase.step==="ready"){
    const name=label(run.items[phase.index]);
    return <main className="mock-stage" aria-live="polite">
      <div className="mock-stage__inner">
        <p className="mock-stage__eyebrow">{text.nextUp} · {phase.index+1} / {run.items.length}</p>
        <h1>{name.title}</h1>
        {name.passage&&<p className="mock-stage__passage">{name.passage}</p>}
        <p className="mock-stage__count" aria-label={zh?`还有 ${phase.left} 秒`:`${phase.left} seconds`}>{phase.left}</p>
        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
        <button type="button" className="mock-button" autoFocus onClick={()=>setPhase({step:"play",index:phase.index,since:Date.now()})}>{text.ready}</button>
        {runningOrder(run.items,phase.index)}
        {recording.blocked&&<p className="mock-meta" role="status">{micBlockedText(zh)}</p>}
        <button type="button" className="text-action" onClick={()=>{store({...run,endedAt:Date.now()});recording.stop();setPhase({step:"end"})}}>{text.stop}</button>
      </div>
    </main>;
  }

  const header=(title:string,meta?:string)=><>
    <Link className="book-page__back" href="/flute-studio/practice" aria-label={text.back}><BackChevron/></Link>
    <header className="exercise-hub__header book-page__header"><div><h1>{title}</h1>{meta&&<p className="mock-meta">{meta}</p>}</div></header>
  </>;
  const deadlineMeta=deadline?`${deadline.name} · ${new Date(...(deadline.date.split("-").map(Number).map((n,i)=>i===1?n-1:n) as [number,number,number])).toLocaleDateString(zh?"zh-CN":undefined,{month:"long",day:"numeric"})}`:undefined;

  // The end: what was played, how long each took, one optional line per excerpt. No grades.
  if(run&&phase.step==="end"){
    const played=run.items.filter(item=>item.seconds!==undefined);
    const total=Math.round(((run.endedAt??Date.now())-run.startedAt)/1000);
    return <main className="exercise-hub mock-page"><div className="exercise-hub__content">
      {header(text.title,run.deadlineName)}
      <section className="deadline-card mock-card">
        <h2 className="mock-card__title">{text.done(played.length,runClock(total,zh))}</h2>
        <ol className="mock-order mock-order--notes">{run.items.map((excerpt,i)=>{const name=label(excerpt);return <li key={`${excerpt.piece}:${excerpt.passage??""}`} data-state={excerpt.seconds===undefined?"skipped":undefined}>
          <span className="mock-order__number">{i+1}</span>
          <span className="mock-order__name"><b>{name.title}</b>{name.passage&&<span>{name.passage}</span>}
            {excerpt.seconds!==undefined&&<input className="mock-note" defaultValue={excerpt.note??""} maxLength={140} placeholder={text.note} aria-label={`${text.note}: ${name.title}`}
              onBlur={event=>{const note=event.target.value.trim();if(note===(excerpt.note??""))return;store({...run,items:run.items.map((item,j)=>j===i?{...item,note:note||undefined}:item)})}}/>}
          </span>
          {excerpt.seconds!==undefined&&<span className="mock-order__time">{runClock(excerpt.seconds,zh)}</span>}
        </li>})}</ol>
        {recording.take&&<div className="mock-take">
          <RecordingPlayback key={recording.take.url} src={recording.take.url} duration={recording.take.duration} zh={zh}/>
          <div className="recorder-actions">
            <button type="button" className="recorder-delete" onClick={recording.discard}>{text.discard}</button>
            <button type="button" className="recorder-save" onClick={saveTake}>{text.save}</button>
          </div>
          <small className="recorder-note">{text.never}</small>
        </div>}
      </section>
      <div className="mock-actions">
        <button type="button" className="mock-button" onClick={()=>{recording.discard();setRun(null);setOrder(drawExcerpts(pool,count));setPhase({step:"setup"})}} disabled={!pool.length}>{text.again}</button>
        <Link className="text-action" href="/flute-studio/practice">{text.back}</Link>
      </div>
    </div></main>;
  }

  // Setup.
  if(deadlineId===null)return <main className="exercise-hub mock-page"/>;
  if(!deadline||!pool.length)return <main className="exercise-hub mock-page"><div className="exercise-hub__content">
    {header(text.title,deadlineMeta)}<p className="mock-meta">{deadline?text.empty:text.gone}</p>
  </div></main>;
  return <main className="exercise-hub mock-page"><div className="exercise-hub__content">
    {header(text.title,deadlineMeta)}
    <div className="mock-settings">
      <div className="mock-setting"><span>{text.howMany}</span>
        <div className="view-switch" role="group" aria-label={text.howMany}>{choices.map(size=><button key={size} type="button" aria-pressed={Math.min(count,pool.length)===size} onClick={()=>choose(size)}>{size===pool.length&&pool.length>1?`${text.all} ${size}`:size}</button>)}</div>
      </div>
      <div className="mock-setting"><span>{text.pause}</span>
        <div className="view-switch" role="group" aria-label={text.pause}>{PAUSES.map(value=><button key={value} type="button" aria-pressed={pause===value} onClick={()=>setPause(value)}>{value?`${value} ${text.seconds}`:text.off}</button>)}</div>
      </div>
      <div className="mock-setting"><span>{text.record}</span>
        <div className="view-switch" role="group" aria-label={text.record}><button type="button" aria-pressed={!record} onClick={()=>setRecord(false)}>{text.noRecord}</button><button type="button" aria-pressed={record} onClick={()=>setRecord(true)}>{zh?"录音":"Record"}</button></div>
      </div>
    </div>
    <section className="deadline-card mock-card" aria-labelledby="mock-order-title">
      <div className="deadline-card__head"><h2 id="mock-order-title" className="mock-card__title">{text.order}</h2>{pool.length>1&&<button type="button" className="text-action" onClick={()=>setOrder(drawExcerpts(pool,count))}>{text.shuffle}</button>}</div>
      {runningOrder(order)}
    </section>
    {recording.blocked&&<p className="mock-meta" role="status">{micBlockedText(zh)}</p>}
    <div className="mock-actions"><button type="button" className="mock-button" onClick={begin} disabled={!order.length}>{text.start}</button></div>
    {earlier.length>0&&<section className="mock-earlier" aria-labelledby="mock-earlier-title">
      <h2 className="home-preview__group shelf__title" id="mock-earlier-title">{text.earlier}<small>{earlier.length}</small></h2>
      {earlier.map(past=>{const played=past.items.filter(item=>item.seconds!==undefined);return <article className="deadline-card mock-card" key={past.id}>
        <div className="deadline-card__head">
          <span className="mock-card__when">{new Date(past.startedAt).toLocaleDateString(zh?"zh-CN":undefined,{month:"short",day:"numeric"})} · {past.endedAt&&played.length===past.items.length?runClock((past.endedAt-past.startedAt)/1000,zh):text.stopped(played.length)}</span>
          <button type="button" className="mock-card__delete has-tip" data-tip={text.delete} aria-label={text.delete} onClick={()=>deleteMockRun(past.id)}><PracticeIcon name="delete"/></button>
        </div>
        <ol className="mock-order mock-order--past">{past.items.map((excerpt,i)=>{const name=label(excerpt);return <li key={`${excerpt.piece}:${excerpt.passage??""}`} data-state={excerpt.seconds===undefined?"skipped":undefined}>
          <span className="mock-order__number">{i+1}</span>
          <span className="mock-order__name"><b>{name.title}</b>{name.passage&&<span>{name.passage}</span>}{excerpt.note&&<em>{excerpt.note}</em>}</span>
          {excerpt.seconds!==undefined&&<span className="mock-order__time">{runClock(excerpt.seconds,zh)}</span>}
        </li>})}</ol>
      </article>})}
    </section>}
  </div></main>;
}
