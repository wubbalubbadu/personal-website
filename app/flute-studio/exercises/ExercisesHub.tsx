"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import {exerciseCatalog,type ExerciseEntry} from "../../../content/exercise-catalog";
import {deleteScaleSet,describeSet,readScaleSets,scaleSetsEvent,type ScaleSet} from "./scales/saved-sets";
import {useLanguage} from "../i18n/LanguageContext";
import ScaleStudioPreview from "../ScaleStudioPreview";
import LongTonePreview from "../LongTonePreview";
import BreathingPreview from "../BreathingPreview";
import TallySticks from "../tricky-bits/TallySticks";
import {useTrickyBits} from "../lib/trickyBits";
import "../tricky-bits/tricky-bits.css";
import "../home-preview-cards.css";
import "../components/preview-grid.css";
import "./exercises.css";

/**
 * The Exercises tab: every exercise you can open, as the same animated cards
 * the home page uses, plus the Scale Studio sets you saved.
 *
 * Deliberately not a searchable list. There are only a few exercises and
 * each is an interactive tool, so a card that shows the tool working says
 * more than a row, and search, filters and "coming soon" rows were more
 * page than content. Unbuilt exercises stay in the catalog (href: null) and
 * appear once they ship.
 */

// The home page's tint for each card, so the same exercise looks the same on both pages.
const cardTint:Record<string,string>={"scale-studio":"preview-card--scales","long-tones":"preview-card--tones","breathing-lab":"preview-card--breathing"};

function Preview({id,zh}:{id:string;zh:boolean}){
  switch(id){
    case "scale-studio": return <ScaleStudioPreview zh={zh}/>;
    case "long-tones": return <LongTonePreview zh={zh}/>;
    case "breathing-lab": return <BreathingPreview zh={zh}/>;
    default: return null;
  }
}

export default function ExercisesHub(){
  const {t,lang}=useLanguage(),zh=lang==="zh",{bits}=useTrickyBits();
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

  const titleOf=(entry:ExerciseEntry)=>zh?entry.zhTitle:entry.title;
  const detailOf=(entry:ExerciseEntry)=>zh?entry.zhDetail:entry.detail;
  const available=exerciseCatalog.filter(entry=>entry.href);

  return <main className="exercise-hub">
    <div className="exercise-hub__content">
      <header className="exercise-hub__header" data-tab-title><div><h1>{t.exercises.title}</h1></div></header>

      {/* Your own saved sets first: what you built on purpose is more likely
          to be what you came back for than the general tools below. */}
      {sets.length>0&&<section className="exercise-hub__section exercise-hub__section--saved" aria-labelledby="exercise-hub-sets">
        <h2 className="exercise-hub__subtitle" id="exercise-hub-sets">{t.exercises.savedSets}</h2>
        <div className="exercise-hub__list">
          {/* A saved set is already saved, so its control is "forget it",
              not a star. */}
          {sets.map(set=><article key={set.id} className="exercise-hub__row exercise-hub__row--available exercise-hub__row--tagged">
            <Link className="exercise-hub__row-main" href={`/flute-studio/exercises/scales?set=${encodeURIComponent(set.id)}`}>
              <span className="exercise-hub__copy"><strong>{set.name}</strong><small>{describeSet(set.config,zh)}</small></span>
            </Link>
            <button type="button" className="exercise-hub__remove" aria-label={t.exercises.removeSet(set.name)} onClick={()=>deleteScaleSet(set.id)}>×</button>
          </article>)}
        </div>
      </section>}

      <section className="home-preview preview-grid preview-grid--three" aria-label={t.exercises.title}>
        {available.map(entry=>(
          <Link key={entry.id} href={entry.href!} className={`preview-card ${cardTint[entry.id]??""}`}>
            <div className="preview-card__stage"><Preview id={entry.id} zh={zh}/></div>
            <div className="preview-card__copy"><b>{titleOf(entry)}</b><small>{detailOf(entry)}</small></div>
          </Link>
        ))}
        {/* Tricky bits: the passages you saved from your pieces, to practise with a tally of repetitions. Not part of the
            exercise catalog (which also fills the Library), since it is your own bars rather than an exercise. */}
        <Link href="/flute-studio/tricky-bits" className="preview-card preview-card--tricky">
          <div className="preview-card__stage" aria-hidden="true">
            <div className="tricky-preview-card">
              <span className="tricky-preview-card__bars">{zh?"第 12–16 小节":"Bars 12–16"}</span>
              <TallySticks count={7}/>
            </div>
          </div>
          <div className="preview-card__copy"><b>{t.trickyBits.title}</b>
            <small>{bits.length?(zh?`${bits.length} 个保存的段落`:`${bits.length} saved ${bits.length===1?"passage":"passages"}`):(zh?"在乐谱里选几个小节保存，在这里反复练。":"Save a few bars from a piece, then practise them here.")}</small></div>
        </Link>
      </section>

    </div>
  </main>;
}
