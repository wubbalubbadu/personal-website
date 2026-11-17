"use client";

import DetailHeader from "../components/DetailHeader";
import {useEffect,useState} from "react";
import {useLanguage} from "../i18n/LanguageContext";
import "../music/books/book.css";
import "./roadmap.css";

const STORAGE_KEY="cookie:roadmap-learned";

export default function TechniqueRoadmapPage(){
  const {t}=useLanguage();
  const {regions}=t.roadmap;
  const [learned,setLearned]=useState<string[]>([]);

  useEffect(()=>{
    // Restore the browser checklist after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");if(Array.isArray(saved))setLearned(saved);}catch{/* Keep the in-memory checklist if storage is unavailable. */}
  },[]);

  function toggle(id:string){
    setLearned(prev=>{
      const next=prev.includes(id)?prev.filter(x=>x!==id):[...prev,id];
      try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next));}catch{/* Keep the in-memory checklist if storage is unavailable. */}
      return next;
    });
  }

  const totalSkills=regions.reduce((sum,region)=>sum+region.skills.length,0);

  // The Exercise book's rows (COMPONENTS.md): name, one grey line, a tick you set yourself. No boxes, no dialog.
  return <main className="roadmap-page"><div className="roadmap-page__content">
    <DetailHeader backHref="/flute-studio/resources" backLabel={t.nav.resources} title={t.roadmap.title} meta={t.roadmap.learnedCount(learned.length,totalSkills)}/>
    <div className="roadmap-map">
      {regions.map(region=>{
        const regionLearned=region.skills.filter(s=>learned.includes(s.id)).length;
        return <section key={region.id} className="roadmap-region" aria-labelledby={`roadmap-${region.id}`}>
          <header className="roadmap-region__header">
            <h2 id={`roadmap-${region.id}`}>{region.title}</h2>
            <span className="roadmap-region__count">{regionLearned}/{region.skills.length}</span>
          </header>
          <div className="book-page__list">
            {region.skills.map(skill=>{
              const known=learned.includes(skill.id);
              return <article key={skill.id} className={`book-row${known?" is-done":""}`}>
                <div className="book-row__main"><span className="book-row__copy"><strong>{skill.title}</strong><small>{skill.description}</small></span></div>
                <button type="button" className="book-row__done" aria-pressed={known} aria-label={`${known?t.roadmap.markUnlearned:t.roadmap.markLearned}: ${skill.title}`} onClick={()=>toggle(skill.id)}>
                  <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.5"/><path d="M6 10.3 8.6 13 14 7.3"/></svg>
                </button>
              </article>;
            })}
          </div>
        </section>;
      })}
    </div>
  </div></main>;
}
