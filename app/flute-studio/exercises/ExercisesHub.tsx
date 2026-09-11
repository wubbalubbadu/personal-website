"use client";

import {useState} from "react";
import {useLanguage} from "../i18n/LanguageContext";
import "./exercises.css";

type Category = "technique" | "tone" | "breathing" | "articulation";
type Exercise = {
  title: string;
  detail: string;
  icon: string;
  tone: "cactus" | "pink" | "slate";
  category: Category;
  href?: string;
  action: string;
};

function ExerciseContent({exercise}:{exercise:Exercise}){
  return <>
    <span className={`exercise-hub__icon exercise-hub__icon--${exercise.tone}`} aria-hidden="true">{exercise.icon}</span>
    <span className="exercise-hub__copy">
      <strong>{exercise.title}</strong>
      <small>{exercise.detail}</small>
    </span>
    <span className={exercise.href?"exercise-hub__action":"exercise-hub__action exercise-hub__action--muted"}>{exercise.action}</span>
  </>;
}

export default function ExercisesHub(){
  const {t}=useLanguage();
  const [category,setCategory]=useState<Category|"all">("all");
  const categories:{key:Category|"all";label:string}[]=[
    {key:"all",label:t.exercises.categoryAll},
    {key:"technique",label:t.exercises.categoryTechnique},
    {key:"tone",label:t.exercises.categoryTone},
    {key:"breathing",label:t.exercises.categoryBreathing},
    {key:"articulation",label:t.exercises.categoryArticulation},
  ];
  const exercises:readonly Exercise[]=[
    {
      title:t.exercises.scaleStudioTitle,
      detail:t.exercises.scaleStudioDetail,
      icon:"◎",
      tone:"cactus",
      category:"technique",
      href:"/flute-studio/exercises/scales",
      action:"›",
    },
    {
      title:t.exercises.chromaticTitle,
      detail:t.exercises.chromaticDetail,
      icon:"♩",
      tone:"slate",
      category:"technique",
      action:t.exercises.comingSoon,
    },
    {
      title:t.exercises.longToneTitle,
      detail:t.exercises.longToneDetail,
      icon:"◌",
      tone:"pink",
      category:"tone",
      action:t.exercises.comingSoon,
    },
    {
      title:t.exercises.extendedTitle,
      detail:t.exercises.extendedDetail,
      icon:"≈",
      tone:"pink",
      category:"tone",
      action:t.exercises.comingSoon,
    },
    {
      title:t.exercises.breathingTitle,
      detail:t.exercises.breathingDetail,
      icon:"○",
      tone:"cactus",
      category:"breathing",
      href:"/flute-studio/embouchure",
      action:"›",
    },
    {
      title:t.exercises.articulationTitle,
      detail:t.exercises.articulationDetail,
      icon:"‥",
      tone:"slate",
      category:"articulation",
      action:t.exercises.comingSoon,
    },
  ];
  const shown=category==="all"?exercises:exercises.filter(exercise=>exercise.category===category);

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
          {categories.map(item=><button key={item.key} type="button" role="tab" aria-selected={category===item.key} className={category===item.key?"active":""} onClick={()=>setCategory(item.key)}>{item.label}</button>)}
        </div>

        <section className="exercise-hub__section" aria-label={t.exercises.title}>
          <div className="exercise-hub__list">
            {shown.map(exercise=>exercise.href?
              <a className="exercise-hub__row exercise-hub__row--available" href={exercise.href} key={exercise.title}>
                <ExerciseContent exercise={exercise}/>
              </a>:
              <article className="exercise-hub__row" key={exercise.title}>
                <ExerciseContent exercise={exercise}/>
              </article>
            )}
          </div>
        </section>
      </div>
    </main>;
}
