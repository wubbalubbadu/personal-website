"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import {exerciseCatalog,exerciseFocuses,type ExerciseEntry,type ExerciseFocus} from "../../../content/exercise-catalog";
import {artForId} from "../components/StudioRowArt";
import {deleteScaleSet,describeSet,readScaleSets,scaleSetsEvent,type ScaleSet} from "./scales/saved-sets";
import {SaveButton} from "../components/SaveButton";
import {StudioItemIcon} from "../components/StudioItemIcon";
import {useSavedItems} from "../lib/storage";
import {useLanguage} from "../i18n/LanguageContext";
import "./exercises.css";

/**
 * Every row is a link plus its own save star, the same shape as the
 * Library's rows — so an exercise can be saved from wherever you meet it,
 * and the two lists read as one system. The old "›" chevron said nothing
 * the whole clickable row was not already saying.
 */
function Row({id,focus,title,detail,href,badge,featured,art,save,trailing}:{id?:string;focus:ExerciseFocus;title:string;detail:string;href?:string;badge?:string;featured?:boolean;art?:React.ReactNode;save?:{saved:boolean;onToggle:()=>void;label:string};trailing?:React.ReactNode}){
  const content=<>
    {/* A featured row may draw its own mark; everything else keeps the
        generic focus icon, so the list stays one family. */}
    {art
      ?<span className="studio-art-tile">{art}</span>
      :<StudioItemIcon kind={focus} className="exercise-hub__icon"/>}
    <span className="exercise-hub__copy"><strong>{title}</strong><small>{detail}</small></span>
    {badge&&<span className="exercise-hub__action exercise-hub__action--muted">{badge}</span>}
  </>;
  const classes=["exercise-hub__row"];
  if(href)classes.push("exercise-hub__row--available");
  if(featured)classes.push("exercise-hub__row--featured");
  if(id)classes.push(`exercise-hub__row--${id}`);
  return <article className={classes.join(" ")}>
    {href
      ?<Link className="exercise-hub__row-main" href={href}>{content}</Link>
      :<div className="exercise-hub__row-main exercise-hub__row-main--disabled">{content}</div>}
    {save&&<SaveButton saved={save.saved} onToggle={save.onToggle} label={save.label}/>}
    {trailing}
  </article>;
}

export default function ExercisesHub(){
  const {t,lang}=useLanguage(),zh=lang==="zh";
  const [focus,setFocus]=useState<ExerciseFocus|"all">("all");
  // The same store the Library saves into — an exercise starred here is
  // starred there, because it is the same item.
  const favorites=useSavedItems("music");
  // Sets saved in Scale Studio. Read after hydration — they live in
  // localStorage, which the server render has no view of.
  const [sets,setSets]=useState<ScaleSet[]>([]);
  useEffect(()=>{
    const sync=()=>setSets(readScaleSets());
    sync();
    window.addEventListener(scaleSetsEvent,sync);
    window.addEventListener("storage",sync);
    return()=>{window.removeEventListener(scaleSetsEvent,sync);window.removeEventListener("storage",sync)};
  },[]);

  const focusLabels:Record<ExerciseFocus,string>={
    technique:t.exercises.categoryTechnique,
    tone:t.exercises.categoryTone,
    breathing:t.exercises.categoryBreathing,
    articulation:t.exercises.categoryArticulation,
  };
  const tabs:{key:ExerciseFocus|"all";label:string}[]=[
    {key:"all",label:t.exercises.categoryAll},
    ...exerciseFocuses.map(value=>({key:value,label:focusLabels[value]})),
  ];

  const titleOf=(entry:ExerciseEntry)=>zh?entry.zhTitle:entry.title;
  const detailOf=(entry:ExerciseEntry)=>zh?entry.zhDetail:entry.detail;
  const shown=(focus==="all"?exerciseCatalog:exerciseCatalog.filter(entry=>entry.focus===focus))
    .slice()
    .sort((a,b)=>titleOf(a).localeCompare(titleOf(b),lang));
  // Saved sets are Scale Studio configurations, so they belong under
  // Technique — and they sit above the catalog, because a set you built on
  // purpose is more likely to be what you came here for than the generic
  // list underneath it.
  const showSets=(focus==="all"||focus==="technique")&&sets.length>0;

  return <main className="exercise-hub">
      <div className="exercise-hub__content">
        <header className="exercise-hub__header">
          <p>{t.exercises.eyebrow}</p>
          <div>
            <h1>{t.exercises.title}</h1>
          </div>
          <p className="exercise-hub__intro">{t.exercises.intro}</p>
        </header>

        <div className="exercise-hub__tabs" role="tablist" aria-label={t.exercises.title}>
          {tabs.map(item=><button key={item.key} type="button" role="tab" aria-selected={focus===item.key} className={focus===item.key?"active":""} onClick={()=>setFocus(item.key)}>{item.label}</button>)}
        </div>

        {showSets&&<section className="exercise-hub__section" aria-labelledby="exercise-hub-sets">
          <h2 className="exercise-hub__section-title" id="exercise-hub-sets">{t.exercises.savedSets}</h2>
          <div className="exercise-hub__list">
            {/* A saved set is already saved, so its control is "forget it",
                not a star — the star elsewhere means "add this to mine". */}
            {sets.map(set=><Row key={set.id}
              focus="technique"
              title={set.name}
              detail={describeSet(set.config,zh)}
              href={`/flute-studio/exercises/scales?set=${encodeURIComponent(set.id)}`}
              trailing={<button type="button" className="exercise-hub__remove" aria-label={t.exercises.removeSet(set.name)} onClick={()=>deleteScaleSet(set.id)}>×</button>}/>
            )}
          </div>
        </section>}

        <section className="exercise-hub__section" aria-labelledby="exercise-hub-all">
          {showSets&&<h2 className="exercise-hub__section-title" id="exercise-hub-all">{t.exercises.allExercises}</h2>}
          <div className="exercise-hub__list">
            {shown.map(entry=><Row key={entry.id}
              id={entry.id}
              focus={entry.focus}
              title={titleOf(entry)}
              detail={detailOf(entry)}
              href={entry.href??undefined}
              badge={entry.href?undefined:t.exercises.comingSoon}
              featured={entry.featured}
              art={artForId(entry.id)}
              save={{saved:favorites.has(entry.id),onToggle:()=>favorites.toggle(entry.id),label:favorites.has(entry.id)?t.musicRow.remove(titleOf(entry)):t.musicRow.save(titleOf(entry))}}/>
            )}
          </div>
        </section>
      </div>
    </main>;
}
