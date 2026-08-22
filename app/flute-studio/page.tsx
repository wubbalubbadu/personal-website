"use client";

import {useEffect,useState} from "react";
import DailyDiscovery from "./DailyDiscovery";
import HomeQuickTools from "./HomeQuickTools";
import PracticeActivityHero from "./PracticeActivityHero";
import SavedMusicHome from "./SavedMusicHome";
import MusicRow from "./MusicRow";
import {musicLibrary} from "../../content/music-library";
import {useLanguage} from "./i18n/LanguageContext";
import "./studio-home.css";

export default function StudioHome(){
  const {t}=useLanguage();
  const [favorites,setFavorites]=useState<string[]>([]);
  useEffect(()=>{const update=()=>{const saved=localStorage.getItem("cookie:music-favorites");setFavorites(saved?JSON.parse(saved):[])};update();window.addEventListener("cookie:favorites-updated",update);return()=>window.removeEventListener("cookie:favorites-updated",update)},[]);
  function toggleMysteryFavorite(){const next=favorites.includes("mystery-of-love")?favorites.filter(id=>id!=="mystery-of-love"):[...favorites,"mystery-of-love"];setFavorites(next);localStorage.setItem("cookie:music-favorites",JSON.stringify(next));window.dispatchEvent(new Event("cookie:favorites-updated"))}
  const mystery=musicLibrary.find(item=>item.id==="mystery-of-love")!;
  return <main className="studio-shell">
    <section className="studio-main">
      <div className="home-content">
        <DailyDiscovery/>
        <HomeQuickTools/>
        <section className="studio-hero"><PracticeActivityHero/></section>
        <div className="home-layout"><div className="studio-left">
          <section className="home-section recent-section"><header><h2><a href="/flute-studio/music">{t.home.continuePracticing} <span aria-hidden="true">›</span></a></h2></header><div className="home-music-list"><MusicRow item={mystery} saved={favorites.includes(mystery.id)} onToggleSave={toggleMysteryFavorite} detail={t.home.mysteryDetail}/></div></section>
          <SavedMusicHome/>
          <section className="home-section"><header><h2><a href="/flute-studio/exercises">{t.home.exercisesLink} <span aria-hidden="true">›</span></a></h2></header><div className="home-inset-list"><a href="/flute-studio/exercises/scales"><span className="exercise-symbol green">◎</span><div><b>{t.home.scaleStudioTitle}</b><small>{t.home.scaleStudioDetail}</small></div><i>›</i></a><a href="/flute-studio/exercises"><span className="exercise-symbol pink">◌</span><div><b>{t.home.longToneTitle}</b><small>{t.home.longToneDetail}</small></div><i>›</i></a><a href="/flute-studio/exercises"><span className="exercise-symbol gray">♩</span><div><b>{t.home.chromaticTitle}</b><small>{t.home.chromaticDetail}</small></div><i>›</i></a></div></section>
        </div></div>
      </div>
    </section>
  </main>
}
