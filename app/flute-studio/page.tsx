"use client";

import {useEffect,useState} from "react";
import "./studio-home.css";

const initialPlan=["Warm up with long tones","Work measures 9–16","Finish with one slow run"];

export default function StudioHome(){
  const [done,setDone]=useState<boolean[]>([false,false,false]);
  const [compact,setCompact]=useState(false);
  const [welcome,setWelcome]=useState({date:"YOUR STUDIO",greeting:"Welcome back, Haylie."});
  useEffect(()=>{const saved=localStorage.getItem("cookie:practice-plan");if(saved)setDone(JSON.parse(saved));const today=new Date();setWelcome({date:today.toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"}),greeting:`Good ${today.getHours()<12?"morning":today.getHours()<18?"afternoon":"evening"}, Haylie.`})},[]);
  function check(index:number){const next=done.map((value,i)=>i===index?!value:value);setDone(next);localStorage.setItem("cookie:practice-plan",JSON.stringify(next))}
  return <main className="studio-shell"><aside className="studio-nav"><a href="/" className="studio-logo"><span>◒</span><b>Cookie</b><small>FLUTE STUDIO</small></a><nav><a className="active" href="/flute-studio"><i>⌂</i>Home</a><a href="/flute-studio/music"><i>♫</i>Music</a><a href="/flute-studio/exercises/scales"><i>◎</i>Exercises</a><a href="#practice"><i>✓</i>Practice</a></nav><div className="studio-profile"><span>HW</span><p><b>Haylie&apos;s studio</b><small>Flute · Teacher</small></p></div></aside>
    <section className="studio-main" onScroll={event=>setCompact(event.currentTarget.scrollTop>42)}>
      <header className={compact?"home-header compact":"home-header"}><div className="home-compact-nav"><span className="home-mark">◒</span><strong>Home</strong><a href="/flute-studio/music" aria-label="Search library">⌕</a></div><div className="home-large-title"><div><p>{welcome.date}</p><h1>{welcome.greeting}</h1></div><a className="header-library-link" href="/flute-studio/music">Browse library</a></div></header>
      <div className="home-content">
        <section className="studio-hero"><p>Loading your practice activity…</p></section>
        <div className="home-layout"><div className="studio-left">
          <section className="home-section recent-section"><header><div><h2>Continue practicing</h2><p>Pick up where you left off</p></div><a href="/flute-studio/music">See all</a></header><a className="continue-row" href="/flute-studio/music/mystery-of-love"><span className="continue-icon">♫</span><div><h3>Mystery of Love</h3><p>Sufjan Stevens · Repertoire · E minor</p></div><span className="continue-action">Open</span></a></section>
          <div className="saved-music-slot"/>
          <section className="home-section"><header><div><h2>Exercises</h2><p>Focused work for today</p></div><a href="/flute-studio/music?category=exercise">View exercises</a></header><div className="home-inset-list"><a href="/flute-studio/exercises/scales"><span className="exercise-symbol green">◎</span><div><b>Scale Studio</b><small>Choose key, range, and articulation</small></div><i>›</i></a><a href="/flute-studio/music?category=warm-up"><span className="exercise-symbol pink">◌</span><div><b>Long-tone Ladder</b><small>Tone · 8 minutes</small></div><i>›</i></a><a href="/flute-studio/music?category=exercise"><span className="exercise-symbol gray">♩</span><div><b>Chromatic Thirds</b><small>Technique · 12 minutes</small></div><i>›</i></a></div></section>
        </div><aside className="practice-panel" id="practice"><header><span>Today</span><b>{done.filter(Boolean).length} of {initialPlan.length}</b></header><h2>Practice plan</h2><p className="plan-intro">Keep the session small and specific.</p><div className="plan-list">{initialPlan.map((item,index)=><label key={item} className={done[index]?"done":""}><input type="checkbox" checked={done[index]} onChange={()=>check(index)}/><span>✓</span><b>{item}</b></label>)}</div><button>＋ Add an item</button><small>Saved on this device</small></aside></div>
      </div>
    </section>
  </main>
}
