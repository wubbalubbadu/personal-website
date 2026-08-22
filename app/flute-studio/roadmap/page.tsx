"use client";

import {useState} from "react";
import {useLanguage} from "../i18n/LanguageContext";
import "./roadmap.css";

export default function TechniqueRoadmapPage(){
  const {t}=useLanguage();
  const {journey,groups}=t.roadmap;
  const [activeGroup,setActiveGroup]=useState(groups[0].id);
  const current=groups.find(group=>group.id===activeGroup)??groups[0];
  return <main className="roadmap-page"><div className="roadmap-page__content">
    <header className="roadmap-header"><p>{t.roadmap.eyebrow}</p><h1>{t.roadmap.title}</h1><p className="roadmap-header__intro">{t.roadmap.intro}</p></header>
    <section className="roadmap-journey" aria-labelledby="roadmap-journey-title">
      <header><p>{t.roadmap.bigPicture}</p><h2 id="roadmap-journey-title">{t.roadmap.bigPictureTitle}</h2></header>
      <ol>{journey.map(step=><li key={step.level}><div className="roadmap-journey__number">{step.level}</div><div className="roadmap-journey__copy"><h3>{step.title}</h3><p>{step.summary}</p><ul>{step.skills.map(skill=><li key={skill}>{skill}</li>)}</ul></div></li>)}</ol>
    </section>
    <section className="roadmap-explore" aria-labelledby="roadmap-explore-title">
      <header><p>{t.roadmap.exploreByArea}</p><h2 id="roadmap-explore-title">{t.roadmap.chooseFamily}</h2></header>
      <nav className="roadmap-path" aria-label={t.roadmap.areasAria}>{groups.map((group,index)=><button key={group.id} type="button" aria-pressed={activeGroup===group.id} className={`${activeGroup===group.id?"active ":""}${group.tone}`} onClick={()=>setActiveGroup(group.id)}><span>{index+1}</span><strong>{group.title}</strong></button>)}</nav>
      <section className={`roadmap-panel ${current.tone}`} aria-labelledby="roadmap-group-title"><header><div><p>{current.id==="extended"?t.roadmap.optionalExploration:t.roadmap.techniqueArea}</p><h2 id="roadmap-group-title">{current.title}</h2><span>{current.description}</span></div></header><div className="roadmap-skill-list">{current.skills.map(skill=><article className="roadmap-skill" key={skill.title}><small>{skill.stage}</small><h3>{skill.title}</h3><p>{skill.description}</p></article>)}</div></section>
    </section>
    <footer className="roadmap-sources"><p>{t.roadmap.sourcesText}</p><div><a href="https://www.nfaonline.org/resources-publications/publications/selected-flute-repertoire-and-studies---history" target="_blank" rel="noreferrer">{t.roadmap.nfaGuide}</a><a href="https://www.emiferguson.com/flutes-extendedtechniques" target="_blank" rel="noreferrer">{t.roadmap.extendedSource}</a></div></footer>
  </div></main>;
}
