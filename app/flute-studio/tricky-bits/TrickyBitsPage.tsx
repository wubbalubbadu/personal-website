"use client";
import Link from "next/link";
import {useRouter,useSearchParams} from "next/navigation";
import {Suspense,useEffect,useMemo,useRef,useState} from "react";
import {musicLibrary as publicMusic,musicBooks} from "../../../content/music-library";
import {usePrivateMusic} from "../lib/privateMusic";
import {removeBit,useTrickyBits,type TrickyBit} from "../lib/trickyBits";
import {useLanguage} from "../i18n/LanguageContext";
import {PracticeIcon} from "../components/PracticeIcon";
import TrickyPreview from "./TrickyPreview";
import TrickyBitDialog from "./TrickyBitDialog";
import "../exercises/exercises.css";
import "./tricky-bits.css";

const pieceLink=(bit:TrickyBit,extra="")=>`/flute-studio/music/${bit.pieceId}?bars=${bit.from}-${bit.to}&from=tricky-bits&open=${encodeURIComponent(bit.id)}${extra}`;

function Page(){
  const {t}=useLanguage(),text=t.trickyBits;
  const {bits,tallies}=useTrickyBits();
  const privateMusic=usePrivateMusic();
  const router=useRouter(),params=useSearchParams();
  const [menu,setMenu]=useState<string|null>(null);
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

  return <main className="exercise-hub tricky-page">
    <div className="exercise-hub__content">
      <header className="exercise-hub__header"><div><h1>{text.title}</h1></div></header>
      {!ready?null:bits.length===0
        ?<p className="tricky-empty">{text.empty}</p>
        :groups.map(([pieceId,list])=>{
          const first=describe(list[0]);
          return <section key={pieceId} className="tricky-group">
            <h2>{first.title}{first.composer&&<small>{first.composer}</small>}</h2>
            <div className="tricky-grid">
              {list.map(bit=>{
                const piece=describe(bit),tempos=[...bit.tempos].sort((a,b)=>a-b),count=tallies[bit.id]??0;
                return <article key={bit.id} className="tricky-card">
                  <button type="button" className="tricky-card__open" onClick={()=>setOpenId(bit.id)} aria-label={`${first.title}, ${text.bars} ${bit.label}`}>
                    <div className="tricky-card__bars">{text.bars} {bit.label}</div>
                    {piece.scorePath
                      ?<TrickyPreview scorePath={piece.scorePath} from={bit.from} to={bit.to} label={`${first.title} ${text.bars} ${bit.label}`}/>
                      :<p className="tricky-card__note">{locked(piece,bit)?text.locked:text.missing}</p>}
                    <div className="tricky-card__meta">
                      <span>{tempos.length?`${tempos.at(-1)}${bit.goal?` → ${bit.goal}`:""}`:bit.goal?`${text.goal} ${bit.goal}`:""}</span>
                      <span>{count>0?`${count} ${text.reps}`:""}</span>
                    </div>
                  </button>
                  <button type="button" className="tricky-card__more has-tip" data-tip={text.more} aria-label={text.more} aria-expanded={menu===bit.id} onClick={()=>setMenu(menu===bit.id?null:bit.id)}><PracticeIcon name="more"/></button>
                  {menu===bit.id&&<div className="tricky-card__menu" role="menu">
                    <Link role="menuitem" href={pieceLink(bit)}>{text.openPiece}</Link>
                    <Link role="menuitem" href={pieceLink(bit,`&change=${encodeURIComponent(bit.id)}`)}>{text.changeBars}</Link>
                    <button type="button" role="menuitem" onClick={()=>{removeBit(bit.id);setMenu(null)}}>{text.remove}</button>
                  </div>}
                </article>;
              })}
            </div>
          </section>;
        })}
    </div>
    {open&&(()=>{const piece=describe(open);return <TrickyBitDialog key={open.id} bit={open} piece={{title:piece.title,scorePath:piece.scorePath,href:pieceLink(open)}} count={tallies[open.id]??0} position={ordered.indexOf(open)+1} total={ordered.length} onClose={()=>{setOpenId(null);if(wanted)router.replace("/flute-studio/tricky-bits")}} onStep={step}/>})()}
  </main>;
}

export default function TrickyBitsPage(){return <Suspense fallback={null}><Page/></Suspense>}
