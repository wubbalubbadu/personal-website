"use client";

import {useMemo,useState} from "react";
import Link from "next/link";
import ScaleStudioPreview from "../../flute-studio/ScaleStudioPreview";
import MusicRow from "../../flute-studio/MusicRow";
import {openPracticeTool} from "../../flute-studio/PracticeAudio";
import {PracticeIcon} from "../../flute-studio/components/PracticeIcon";
import {ResourceIcon} from "../../flute-studio/components/ResourceIcon";
import {libraryShelf,tagName} from "../../../content/music-library";
import "./home-tool.css";

/**
 * Prototype: Home as the tool itself, not a tour of it.
 * Top: the three stand tools, one tap each (they open the real dock here).
 * Then the two things people want first, usable from Home: Scale Studio with
 * one-tap starts, and the Library with a working search. Everything else is
 * a quiet list, because the tabs already hold the full catalogue.
 */
const QUICK_SCALES=[
  {label:"C major",key:"C",type:"major"},
  {label:"G major",key:"G",type:"major"},
  {label:"F major",key:"F",type:"major"},
  {label:"D harmonic minor",key:"D",type:"harmonic"},
  {label:"Chromatic",key:"C",type:"chromatic"},
];
const scaleHref=(key:string,type:string)=>`/flute-studio/exercises/scales?key=${key}&type=${type}&back=/flute-studio`;
const SHELVES=[["Beginner","?shelf=beginner"],["Classical","?tag=classical"],["Etudes","?tag=etude"],["Excerpts","?tag=excerpt"]];
const PICKS=["johann-sebastian-bach-badinerie","christoph-willibald-gluck-dance-of-the-blessed-spirits","traditional-amazing-grace"];
const EXERCISES=[
  {title:"Long tones",meta:"Hold a note and watch your pitch",href:"/flute-studio/exercises/long-tones",icon:"tuner" as const},
  {title:"Breathing Lab",meta:"Guided breathing at a pace you set",href:"/flute-studio/breathing",icon:"loop" as const},
  {title:"All exercises",meta:"Your saved sets live here too",href:"/flute-studio/exercises",icon:"scale" as const},
];
const LEARN=[
  {title:"Theory lessons",meta:"Learn to read staff music",href:"/flute-studio/theory",icon:"theory"},
  {title:"Fingering chart",meta:"From low B up, with alternates",href:"/flute-studio/fingerings",icon:"fingerings"},
  {title:"Trill chart",meta:"Which keys move",href:"/flute-studio/trills",icon:"trills"},
  {title:"Body & embouchure",meta:"How the sound is made",href:"/flute-studio/embouchure",icon:"embouchure"},
] as const;

export default function HomeTool(){
  const [query,setQuery]=useState("");
  const results=useMemo(()=>{
    const q=query.trim().toLowerCase();
    if(!q)return PICKS.map(id=>libraryShelf.find(item=>item.id===id)).filter(item=>!!item);
    return libraryShelf.filter(item=>`${item.title} ${item.zhTitle??""} ${item.composer} ${item.tags.join(" ")}`.toLowerCase().includes(q)).slice(0,4);
  },[query]);
  const tagLabel=(tag:string)=>tagName(tag,false);

  // Same wrappers as the real Home, so the header offset and side padding match.
  return <main className="studio-shell"><section className="studio-main"><div className="home-content ht">
    {/* The stand tools sit first and stay small: one tap, no reading. */}
    <section className="ht-tools" aria-label="Tools">
      <button type="button" onClick={()=>openPracticeTool("tuner")}><PracticeIcon name="tuner"/><span>Tuner</span></button>
      <button type="button" onClick={()=>openPracticeTool("metronome")}><PracticeIcon name="metronome"/><span>Metronome</span></button>
      <button type="button" onClick={()=>openPracticeTool("drone")}><PracticeIcon name="drone"/><span>Drone</span></button>
      <Link href="/flute-studio/tools/tendency" className="ht-tools__test">Pitch tendency test</Link>
    </section>

    <div className="ht-feature">
      <section className="ht-panel ht-scales" aria-labelledby="ht-scales-title">
        <header><h2 id="ht-scales-title">Scale Studio</h2><Link href="/flute-studio/exercises/scales?back=/flute-studio">Build your own</Link></header>
        <div className="ht-scales__demo" aria-hidden="true"><ScaleStudioPreview zh={false}/></div>
        <p className="ht-label">Start with</p>
        <div className="ht-chips">{QUICK_SCALES.map(s=><Link key={s.label} href={scaleHref(s.key,s.type)}>{s.label}</Link>)}</div>
      </section>

      <section className="ht-panel ht-library" aria-labelledby="ht-library-title">
        <header><h2 id="ht-library-title">Library</h2><Link href="/flute-studio/music">See all {libraryShelf.length}</Link></header>
        <label className="library-find ht-find">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input type="search" placeholder="Find a piece or composer" value={query} onChange={e=>setQuery(e.target.value)} aria-label="Find a piece or composer"/>
        </label>
        <div className="ht-shelves">{SHELVES.map(([name,q])=><Link key={name} href={`/flute-studio/music${q}`}>{name}</Link>)}</div>
        <div className="ht-results">
          {results.length?results.map(item=><MusicRow key={item!.id} item={item!} tagLabel={tagLabel}/>):<p className="ht-empty">Nothing by that name yet.</p>}
        </div>
      </section>
    </div>

    <div className="ht-lists">
      <section aria-labelledby="ht-ex-title">
        <h2 id="ht-ex-title" className="ht-section">More exercises</h2>
        <ul className="ht-list">{EXERCISES.map(e=><li key={e.title}><Link href={e.href}><span className="ht-list__icon"><PracticeIcon name={e.icon}/></span><span><b>{e.title}</b><small>{e.meta}</small></span></Link></li>)}</ul>
      </section>
      <section aria-labelledby="ht-learn-title">
        <h2 id="ht-learn-title" className="ht-section">Learn and look up</h2>
        <ul className="ht-list">{LEARN.map(l=><li key={l.title}><Link href={l.href}><span className="ht-list__icon"><ResourceIcon name={l.icon}/></span><span><b>{l.title}</b><small>{l.meta}</small></span></Link></li>)}</ul>
      </section>
    </div>
  </div></section></main>;
}
