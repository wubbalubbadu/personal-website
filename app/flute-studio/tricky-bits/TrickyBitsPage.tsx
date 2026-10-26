"use client";
import Link from "next/link";
import {useRouter,useSearchParams} from "next/navigation";
import {Suspense,useEffect,useMemo,useRef,useState} from "react";
import {musicLibrary as publicMusic,musicBooks} from "../../../content/music-library";
import {usePrivateMusic} from "../lib/privateMusic";
import {activeBits,bitHref,removeBit,setBitDone,totalReps,useTrickyBits,type TrickyBit} from "../lib/trickyBits";
import {useLanguage} from "../i18n/LanguageContext";
import {PracticeIcon} from "../components/PracticeIcon";
import TrickyPreview from "./TrickyPreview";
import TrickyBitDialog from "./TrickyBitDialog";
import {BitPractice} from "./BitPractice";
import {usePracticeAudio} from "../PracticeAudio";
import "../exercises/exercises.css";
import "./tricky-bits.css";

/** The piece at these bars, selected, close-up open (lib/trickyBits.ts). */
const pieceLink=(bit:TrickyBit)=>bitHref(bit);

function Page(){
  const {t,lang}=useLanguage(),text=t.trickyBits,zh=lang==="zh";
  // Done passages leave the cards for the folded Done group at the bottom (kept, not deleted).
  const {bits:allBits,reps}=useTrickyBits(),bits=useMemo(()=>activeBits(allBits),[allBits]);
  const doneBits=allBits.filter(bit=>bit.done).sort((a,b)=>b.done!-a.done!);
  const audio=usePracticeAudio();
  // Cards (open one bit at a time) or one continuous page you play straight down. Remembered on this device.
  const [view,setViewState]=useState<"cards"|"continuous">("cards");
  useEffect(()=>{try{if(localStorage.getItem("cookie:tricky-bits:view")==="continuous")setViewState("continuous")}catch{/* cards */}},[]);// eslint-disable-line react-hooks/set-state-in-effect
  const setView=(next:"cards"|"continuous")=>{setViewState(next);setSettled(new Set());setWaitedEnough(false);try{localStorage.setItem("cookie:tricky-bits:view",next)}catch{/* this visit only */}};
  // On the continuous page the bits share one metronome; this is the bit it is following.
  const [metronomeFor,setMetronomeFor]=useState<string|null>(null);
  // Cards and the continuous page appear once every bit's music is drawn (or after 4s at most), rather than
  // showing empty boxes that grow one by one.
  const [settled,setSettled]=useState<Set<string>>(()=>new Set());
  const markSettled=(id:string)=>setSettled(prev=>prev.has(id)?prev:new Set(prev).add(id));
  const [waitedEnough,setWaitedEnough]=useState(false);
  useEffect(()=>{const timer=window.setTimeout(()=>setWaitedEnough(true),4000);return()=>window.clearTimeout(timer)},[view]);
  const privateMusic=usePrivateMusic();
  const router=useRouter(),params=useSearchParams();
  const [menu,setMenu]=useState<string|null>(null);
  // A Done row's trash asks once before deleting (COMPONENTS.md Trash).
  const [armed,setArmed]=useState<string|null>(null);
  useEffect(()=>{if(!armed)return;const timer=window.setTimeout(()=>setArmed(null),3000);return()=>window.clearTimeout(timer)},[armed]);
  const [openId,setOpenId]=useState<string|null>(null);
  const [ready,setReady]=useState(false);
  const wanted=params.get("open");
  // Saved bits come from localStorage, so the first paint (and the server) shows nothing rather than a false "empty".
  useEffect(()=>{const frame=requestAnimationFrame(()=>setReady(true));return()=>cancelAnimationFrame(frame)},[]);
  const deepLinked=useRef(false);
  useEffect(()=>{if(wanted&&!deepLinked.current&&bits.some(bit=>bit.id===wanted)){deepLinked.current=true;requestAnimationFrame(()=>setOpenId(wanted))}},[wanted,bits]);
  useEffect(()=>{
    if(!menu)return;
    const close=(event:PointerEvent)=>{if(!(event.target as HTMLElement).closest?.(".tricky-card__menu,.tricky-card__more"))setMenu(null)};
    window.addEventListener("pointerdown",close);return()=>window.removeEventListener("pointerdown",close);
  },[menu]);

  // Leaving the page stops a metronome the continuous view started (refs, so the cleanup sees the latest values).
  const leaving=useRef({metronomeFor,audio});
  useEffect(()=>{leaving.current={metronomeFor,audio}});
  useEffect(()=>()=>{const {metronomeFor:bitOn,audio:engine}=leaving.current;if(bitOn&&engine.metro)engine.toggleMetro()},[]);
  const library=useMemo(()=>[...publicMusic,...privateMusic.items],[privateMusic.items]);
  const describe=(bit:TrickyBit)=>{
    const item=library.find(entry=>entry.id===bit.pieceId);
    if(!item)return {title:bit.pieceId,composer:"",scorePath:null as string|null,state:"missing" as const};
    const book=item.book?musicBooks.find(entry=>entry.id===item.book!.id):undefined;
    return {title:book?`${book.title} ${item.title}`:item.title,composer:item.composer,scorePath:item.scorePath,state:"ok" as const};
  };
  // Grouped by piece, pieces in the order they were first saved.
  const groups=useMemo(()=>{
    const map=new Map<string,TrickyBit[]>();
    [...bits].sort((a,b)=>a.addedAt-b.addedAt).forEach(bit=>map.set(bit.pieceId,[...(map.get(bit.pieceId)??[]),bit]));
    return [...map.entries()];
  },[bits]);
  const ordered=groups.flatMap(([,list])=>list);
  const open=ordered.find(bit=>bit.id===openId);
  const step=(direction:-1|1)=>{if(!open||ordered.length<2)return;const index=ordered.indexOf(open);setOpenId(ordered[(index+direction+ordered.length)%ordered.length].id)};
  const locked=(piece:ReturnType<typeof describe>,bit:TrickyBit)=>piece.state==="missing"&&!privateMusic.unlocked&&!publicMusic.some(entry=>entry.id===bit.pieceId);

  const expected=bits.filter(bit=>describe(bit).scorePath).map(bit=>`${view==="cards"?"card":"sheet"}:${bit.id}`);
  const allSettled=waitedEnough||expected.every(key=>settled.has(key));
  return <main className="exercise-hub tricky-page">
    <div className="exercise-hub__content">
      <header className="exercise-hub__header tricky-page__header"><div><h1>{text.title}</h1></div>
        {bits.length>0&&<div className="view-switch" role="group" aria-label={zh?"显示方式":"View"}>
          <button type="button" aria-pressed={view==="cards"} onClick={()=>setView("cards")}>{zh?"卡片":"Cards"}</button>
          <button type="button" aria-pressed={view==="continuous"} onClick={()=>{setOpenId(null);setView("continuous")}}>{zh?"连续":"Continuous"}</button>
        </div>}
      </header>
      {!ready?null:bits.length===0
        ?(doneBits.length?null:<p className="tricky-empty">{text.empty}</p>)
        :<div className={allSettled?"tricky-body":"tricky-body is-waiting"} aria-busy={!allSettled}>{groups.map(([pieceId,list])=>{
          const first=describe(list[0]);
          return <section key={pieceId} className="tricky-group">
            <h2>{first.title}{first.composer&&<small>{first.composer}</small>}</h2>
            {view==="continuous"?<div className="tricky-sheet">{list.map(bit=>{const piece=describe(bit);return <article key={bit.id} className="tricky-sheet__bit">
              <header><b>{text.bars} {bit.label}</b><Link href={pieceLink(bit)}>{text.openPiece}</Link></header>
              {piece.scorePath
                ?<BitPractice bit={bit} reps={reps[bit.id]} scorePath={piece.scorePath} label={`${first.title} ${bit.label}`} zh={zh}
                  metronomeOn={metronomeFor===bit.id} onMetronome={on=>setMetronomeFor(on?bit.id:null)} onReady={()=>markSettled(`sheet:${bit.id}`)}/>
                :<p className="tricky-card__note">{locked(piece,bit)?text.locked:text.missing}</p>}
            </article>})}</div>:
            <div className="tricky-grid">
              {list.map(bit=>{
                const piece=describe(bit),tempos=[...bit.tempos].sort((a,b)=>a-b),count=totalReps(reps[bit.id]);
                return <article key={bit.id} className="tricky-card">
                  <button type="button" className="tricky-card__open" onClick={()=>setOpenId(bit.id)} aria-label={`${first.title}, ${text.bars} ${bit.label}`}>
                    <div className="tricky-card__bars">{text.bars} {bit.label}</div>
                    {piece.scorePath
                      ?<TrickyPreview scorePath={piece.scorePath} from={bit.from} to={bit.to} label={`${first.title} ${text.bars} ${bit.label}`} onSettled={()=>markSettled(`card:${bit.id}`)}/>
                      :<p className="tricky-card__note">{locked(piece,bit)?text.locked:text.missing}</p>}
                    <div className="tricky-card__meta">
                      <span>{tempos.length?`${tempos.at(-1)}${bit.goal?` → ${bit.goal}`:""}`:bit.goal?`${text.goal} ${bit.goal}`:""}</span>
                      <span>{count>0?`${count} ${text.reps}`:""}</span>
                    </div>
                  </button>
                  <button type="button" className="tricky-card__more has-tip" data-tip={text.more} aria-label={text.more} aria-expanded={menu===bit.id} onClick={()=>setMenu(menu===bit.id?null:bit.id)}><PracticeIcon name="more"/></button>
                  {menu===bit.id&&<div className="tricky-card__menu" role="menu">
                    <Link role="menuitem" href={pieceLink(bit)}>{text.openPiece}</Link>
                    <Link role="menuitem" href={bitHref(bit,{change:true})}>{text.changeBars}</Link>
                    <button type="button" role="menuitem" onClick={()=>{setBitDone(bit.id,true);setMenu(null)}}>{zh?"练好了":"Mark done"}</button>
                    <button type="button" role="menuitem" onClick={()=>{removeBit(bit.id);setMenu(null)}}>{text.remove}</button>
                  </div>}
                </article>;
              })}
            </div>}
          </section>;
        })}</div>}
      {ready&&doneBits.length>0&&<details className="tricky-done">
        <summary>{zh?`练好了 (${doneBits.length})`:`Done (${doneBits.length})`}</summary>
        <ul>{doneBits.map(bit=>{const piece=describe(bit);return <li key={bit.id}>
          <Link href={pieceLink(bit)}><b>{piece.title}</b> <small>{text.bars} {bit.label}</small></Link>
          <button type="button" className="text-action" onClick={()=>setBitDone(bit.id,false)}>{zh?"再练练":"Back to practising"}</button>
          <button type="button" className={armed===bit.id?"tricky-done__delete is-armed":"tricky-done__delete"}
            aria-label={armed===bit.id?(zh?`再点一下删除《${piece.title}》第 ${bit.label} 小节`:`Tap again to delete ${piece.title}, bars ${bit.label}`):(zh?`删除《${piece.title}》第 ${bit.label} 小节`:`Delete ${piece.title}, bars ${bit.label}`)}
            onClick={()=>{if(armed!==bit.id){setArmed(bit.id);return}removeBit(bit.id);setArmed(null)}}><PracticeIcon name="delete"/></button>
        </li>})}</ul>
      </details>}
    </div>
    {open&&(()=>{const piece=describe(open);return <TrickyBitDialog bit={open} reps={reps[open.id]} piece={{title:piece.title,scorePath:piece.scorePath,href:pieceLink(open)}} position={ordered.indexOf(open)+1} total={ordered.length} onClose={()=>{setOpenId(null);if(wanted)router.replace("/flute-studio/tricky-bits")}} onStep={step}/>})()}
  </main>;
}

export default function TrickyBitsPage(){return <Suspense fallback={null}><Page/></Suspense>}
