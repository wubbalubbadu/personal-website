"use client";

import {useEffect,useState} from "react";
import HomeQuickTools from "./HomeQuickTools";
import PracticeActivityHero from "./PracticeActivityHero";
import SavedMusicHome from "./SavedMusicHome";
import MusicRow from "./MusicRow";
import {musicLibrary} from "../../content/music-library";
import "./studio-home.css";

export default function StudioHome(){
  const [compact,setCompact]=useState(false);
  const [favorites,setFavorites]=useState<string[]>([]);
  const [welcome,setWelcome]=useState({date:"YOUR STUDIO",greeting:"Welcome back, Haylie."});
  useEffect(()=>{const today=new Date();setWelcome({date:today.toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"}),greeting:`Good ${today.getHours()<12?"morning":today.getHours()<18?"afternoon":"evening"}, Haylie.`});const update=()=>{const saved=localStorage.getItem("cookie:music-favorites");setFavorites(saved?JSON.parse(saved):[])};update();window.addEventListener("cookie:favorites-updated",update);return()=>window.removeEventListener("cookie:favorites-updated",update)},[]);
  function toggleMysteryFavorite(){const next=favorites.includes("mystery-of-love")?favorites.filter(id=>id!=="mystery-of-love"):[...favorites,"mystery-of-love"];setFavorites(next);localStorage.setItem("cookie:music-favorites",JSON.stringify(next));window.dispatchEvent(new Event("cookie:favorites-updated"))}
  const mystery=musicLibrary.find(item=>item.id==="mystery-of-love")!;
  return <main className="studio-shell">
    <section className="studio-main" onScroll={event=>setCompact(event.currentTarget.scrollTop>42)}>
      <header className={compact?"home-header compact":"home-header"}><div className="home-compact-nav"><span/><strong>Home</strong><span/></div><div className="home-large-title"><div><p>{welcome.date}</p><h1>{welcome.greeting}</h1></div></div></header>
      <div className="home-content">
        <section className="studio-hero"><PracticeActivityHero/></section>
        <HomeQuickTools/>
        <div className="home-layout"><div className="studio-left">
          <section className="home-section recent-section"><header><h2><a href="/flute-studio/music">Continue practicing <span aria-hidden="true">›</span></a></h2></header><div className="home-music-list"><MusicRow item={mystery} saved={favorites.includes(mystery.id)} onToggleSave={toggleMysteryFavorite} detail="Sufjan Stevens · Repertoire · E minor"/></div></section>
          <SavedMusicHome/>
          <section className="home-section"><header><h2><a href="/flute-studio/exercises">Exercises <span aria-hidden="true">›</span></a></h2></header><div className="home-inset-list"><a href="/flute-studio/exercises/scales"><span className="exercise-symbol green">◎</span><div><b>Scale Studio</b><small>Choose key, range, and articulation</small></div><i>›</i></a><a href="/flute-studio/exercises"><span className="exercise-symbol pink">◌</span><div><b>Long-tone Ladder</b><small>Tone · 8 minutes</small></div><i>›</i></a><a href="/flute-studio/exercises"><span className="exercise-symbol gray">♩</span><div><b>Chromatic Thirds</b><small>Technique · 12 minutes</small></div><i>›</i></a></div></section>
        </div></div>
      </div>
    </section>
  </main>
}
