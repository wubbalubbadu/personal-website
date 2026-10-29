"use client";

import {useEffect,useState} from "react";
import ScaleStudioPreview from "../../flute-studio/ScaleStudioPreview";
import LongTonePreview from "../../flute-studio/LongTonePreview";
import MusicPreview from "../../flute-studio/MusicPreview";
import BreathingPreview from "../../flute-studio/BreathingPreview";
import "../../flute-studio/home-preview-cards.css";
import "./home-index.css";

/**
 * Prototype: the home page as the contents page of a method book.
 * No cards. Practice is a numbered list in a book face; one music stand on
 * the right plays the demo of whichever row you point at, and turns to the
 * next row by itself when you leave it alone. On a phone the stand goes away
 * and each row carries its own demo.
 */
const PRACTICE=[
  {id:"scales",title:"Scale Studio",copy:"Unlike a printed scale book, build any scale any way you like.",href:"/flute-studio/exercises/scales?back=/flute-studio",Demo:ScaleStudioPreview},
  {id:"tones",title:"Long tones",copy:"We track your pitch and record your tendencies.",href:"/flute-studio/exercises/long-tones",Demo:LongTonePreview},
  {id:"music",title:"Browse music",copy:"Learn music with interactive sheet music and all kinds of tools.",href:"/flute-studio/music",Demo:MusicPreview},
  {id:"breathing",title:"Breathing Lab",copy:"Guided breathing at a pace you set.",href:"/flute-studio/breathing",Demo:BreathingPreview},
];
const LEARN=[
  {title:"Theory lessons",note:"start here",href:"/flute-studio/theory"},
  {title:"Fingering chart",note:"from low B up",href:"/flute-studio/fingerings"},
  {title:"Trill chart",note:"four octaves",href:"/flute-studio/trills"},
  {title:"Body & embouchure",note:"how the sound is made",href:"/flute-studio/embouchure"},
  {title:"Technique roadmap",note:"what to work on next",href:"/flute-studio/roadmap"},
];
const TOOLS=[
  {title:"Tuner",href:"/flute-studio/tools"},
  {title:"Metronome",href:"/flute-studio/tools"},
  {title:"Drone",href:"/flute-studio/tools"},
  {title:"Pitch tendency test",href:"/flute-studio/tools/tendency"},
];
const TABS=[["Library","/music"],["Exercises","/exercises"],["Learn","/resources"],["My Studio","/practice"]];
const TURN_MS=8000;

export default function HomeIndex(){
  const [active,setActive]=useState(0),[held,setHeld]=useState(false),[still,setStill]=useState(false),[date,setDate]=useState("");

  // Rendered on the client only, so the server's clock can't disagree.
  useEffect(()=>{
    setDate(new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"}));
    setStill(matchMedia("(prefers-reduced-motion: reduce)").matches);
  },[]);
  // The stand turns its own page unless you are pointing at a row.
  useEffect(()=>{
    if(held||still)return;
    const id=setTimeout(()=>setActive(i=>(i+1)%PRACTICE.length),TURN_MS);
    return ()=>clearTimeout(id);
  },[active,held,still]);

  const shown=PRACTICE[active],Demo=shown.Demo;
  return <main className="chi">
    <div className="chi-labbar"><span>Lab prototype</span><a href="/flute-studio">Current home ›</a><a href="/lab/studio-home-study">Codex study ›</a></div>

    <header className="chi-top">
      <a className="chi-brand" href="/flute-studio"><span className="chi-cookie" aria-hidden="true"><i/><i/><i/></span>Cookie Flute Studio</a>
      <nav aria-label="Studio">{TABS.map(([name,path])=><a key={name} href={`/flute-studio${path}`}>{name}</a>)}</nav>
    </header>

    <div className="chi-page">
      <section className="chi-hello">
        <p className="chi-date">{date||" "}</p>
        <h1>Welcome to the studio.</h1>
        <p className="chi-lede">Warm up with scales and long tones, then play some real music. The charts are here whenever you need to look something up.</p>
      </section>

      <section className="chi-practice" aria-labelledby="chi-practice-title">
        <h2 id="chi-practice-title" className="chi-section">Practice</h2>
        <div className="chi-practice__grid">
          <ol className="chi-contents" onMouseLeave={()=>setHeld(false)}>
            {PRACTICE.map((p,i)=><li key={p.id} className="chi-row" data-active={i===active} data-held={held}>
              <a href={p.href} onMouseEnter={()=>{setActive(i);setHeld(true)}} onFocus={()=>{setActive(i);setHeld(true)}} onBlur={()=>setHeld(false)}>
                <span className="chi-row__num">{String(i+1).padStart(2,"0")}</span>
                <span className="chi-row__text"><b>{p.title}</b><small>{p.copy}</small></span>
                <span className="chi-row__go" aria-hidden="true">›</span>
              </a>
              {/* Restarts with each turn, so it reads as time left on this page. */}
              {!still&&i===active&&<span key={`${active}-${held}`} className="chi-row__timer" style={{animationDuration:`${TURN_MS}ms`}} aria-hidden="true"/>}
              <div className="chi-row__demo" aria-hidden="true"><p.Demo zh={false}/></div>
            </li>)}
          </ol>

          <figure className="chi-stand" aria-hidden="true">
            <div className="chi-stand__art" key={shown.id}><Demo zh={false}/></div>
            <figcaption><span>{shown.title}</span><a href={shown.href} tabIndex={-1}>Open ›</a></figcaption>
          </figure>
        </div>
      </section>

      <div className="chi-lower">
        <section aria-labelledby="chi-learn-title">
          <h2 id="chi-learn-title" className="chi-section">Learn &amp; look up</h2>
          <ul className="chi-index">{LEARN.map(l=><li key={l.title}><a href={l.href}><b>{l.title}</b><span className="chi-leader" aria-hidden="true"/><small>{l.note}</small></a></li>)}</ul>
        </section>
        <section aria-labelledby="chi-tools-title">
          <h2 id="chi-tools-title" className="chi-section">At the stand</h2>
          <p className="chi-tools-note">For when the music is already open.</p>
          <div className="chi-tools">{TOOLS.map(t=><a key={t.title} href={t.href}>{t.title}</a>)}</div>
        </section>
      </div>
    </div>
  </main>;
}
