"use client";

import {CloseButton} from "../components/CloseButton";
import {useEffect,useRef,useState} from "react";
import {useLanguage} from "../i18n/LanguageContext";
import "./roadmap.css";

const STORAGE_KEY="cookie:roadmap-learned";

export default function TechniqueRoadmapPage(){
  const {t}=useLanguage();
  const {regions}=t.roadmap;
  const [learned,setLearned]=useState<string[]>([]);
  const dialog=useRef<HTMLDivElement>(null);
  const [active,setActive]=useState<{region:string;skill:string}|null>(null);

  useEffect(()=>{
    // Restore the browser checklist after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");if(Array.isArray(saved))setLearned(saved);}catch{/* Keep the in-memory checklist if storage is unavailable. */}
  },[]);

  // Keep keyboard focus in the open detail and return it to the skill that opened it.
  useEffect(()=>{
    if(!active)return;
    const previous=document.activeElement as HTMLElement|null;
    const panel=dialog.current;
    panel?.querySelector<HTMLButtonElement>("button")?.focus();
    const key=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){event.preventDefault();setActive(null);return}
      if(event.key!=="Tab"||!panel)return;
      const buttons=[...panel.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")],first=buttons[0],last=buttons.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
    };
    document.addEventListener("keydown",key);
    return()=>{document.removeEventListener("keydown",key);if(previous?.isConnected)previous.focus()};
  },[active]);

  function toggle(id:string){
    setLearned(prev=>{
      const next=prev.includes(id)?prev.filter(x=>x!==id):[...prev,id];
      try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next));}catch{/* Keep the in-memory checklist if storage is unavailable. */}
      return next;
    });
  }

  const totalSkills=regions.reduce((sum,region)=>sum+region.skills.length,0);
  const activeRegion=active?regions.find(r=>r.id===active.region):null;
  const activeSkill=activeRegion?.skills.find(s=>s.id===active?.skill);

  return <main className="roadmap-page"><div className="roadmap-page__content">
    <header className="roadmap-header">
      <div><h1>{t.roadmap.title}</h1></div>
    </header>
    <div className="roadmap-progress"><div className="roadmap-progress__track"><span style={{width:totalSkills?`${Math.round(learned.length/totalSkills*100)}%`:"0%"}}/></div><small>{t.roadmap.learnedCount(learned.length,totalSkills)}</small></div>
    <div className="roadmap-map">
      {regions.map(region=>{
        const regionLearned=region.skills.filter(s=>learned.includes(s.id)).length;
        return <section key={region.id} className={`roadmap-region ${region.tone}`}>
          <header className="roadmap-region__header">
            <div><h2>{region.title}</h2><p>{region.description}</p></div>
            <span className="roadmap-region__count">{regionLearned}/{region.skills.length}</span>
          </header>
          <div className="roadmap-region__skills">
            {region.skills.map(skill=>{
              const isLearned=learned.includes(skill.id);
              return <button key={skill.id} type="button" className={isLearned?"roadmap-node learned":"roadmap-node"} onClick={()=>setActive({region:region.id,skill:skill.id})}>
                {isLearned&&<i className="roadmap-node__check" aria-hidden="true">✓</i>}
                <span>{skill.title}</span>
              </button>;
            })}
          </div>
        </section>;
      })}
    </div>
  </div>
  {activeSkill&&activeRegion&&<div className="roadmap-detail-backdrop" role="presentation" onClick={event=>{if(event.target===event.currentTarget)setActive(null)}}>
    <div ref={dialog} className={`roadmap-detail ${activeRegion.tone}`} role="dialog" aria-modal="true" aria-labelledby="roadmap-detail-title">
      <CloseButton className="roadmap-detail__close" label={t.roadmap.close} onClick={()=>setActive(null)}/>
      <p className="roadmap-detail__region">{activeRegion.title}</p>
      <h3 id="roadmap-detail-title">{activeSkill.title}</h3>
      <p>{activeSkill.description}</p>
      <button type="button" className={learned.includes(activeSkill.id)?"roadmap-detail__mark active":"roadmap-detail__mark"} onClick={()=>toggle(activeSkill.id)}>
        {learned.includes(activeSkill.id)?`✓ ${t.roadmap.markUnlearned}`:t.roadmap.markLearned}
      </button>
    </div>
  </div>}
  </main>;
}
