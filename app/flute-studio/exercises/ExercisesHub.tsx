"use client";

import {useLanguage} from "../i18n/LanguageContext";
import "./exercises.css";

type Exercise={
  title:string;
  description:string;
  detail:string;
  icon:string;
  tone:"cactus"|"pink"|"slate";
  href?:string;
  action:string;
};

function ExerciseContent({exercise}:{exercise:Exercise}){
  return <>
    <span className={`exercise-hub__icon exercise-hub__icon--${exercise.tone}`} aria-hidden="true">{exercise.icon}</span>
    <span className="exercise-hub__copy">
      <strong>{exercise.title}</strong>
      <span>{exercise.description}</span>
      <small>{exercise.detail}</small>
    </span>
    <span className={exercise.href?"exercise-hub__action":"exercise-hub__action exercise-hub__action--muted"}>{exercise.action}</span>
  </>;
}

export default function ExercisesHub(){
  const {t}=useLanguage();
  const exercises:readonly Exercise[]=[
    {
      title:t.exercises.scaleStudioTitle,
      description:t.exercises.scaleStudioDescription,
      detail:t.exercises.scaleStudioDetail,
      icon:"◎",
      tone:"cactus",
      href:"/flute-studio/exercises/scales",
      action:"›",
    },
    {
      title:t.exercises.longToneTitle,
      description:t.exercises.longToneDescription,
      detail:t.exercises.longToneDetail,
      icon:"◌",
      tone:"pink",
      action:t.exercises.comingSoon,
    },
    {
      title:t.exercises.chromaticTitle,
      description:t.exercises.chromaticDescription,
      detail:t.exercises.chromaticDetail,
      icon:"♩",
      tone:"slate",
      action:t.exercises.comingSoon,
    },
  ];

  return <main className="exercise-hub">
      <div className="exercise-hub__content">
        <header className="exercise-hub__header">
          <p>{t.exercises.eyebrow}</p>
          <div>
            <h1>{t.exercises.title}</h1>
          </div>
          <p className="exercise-hub__intro">{t.exercises.intro}</p>
        </header>

        <section className="exercise-hub__section" aria-labelledby="exercise-focus-title">
          <div className="exercise-hub__section-heading">
            <div>
              <h2 id="exercise-focus-title">{t.exercises.chooseFocus}</h2>
              <p>{t.exercises.chooseFocusDetail}</p>
            </div>
          </div>
          <div className="exercise-hub__list">
            {exercises.map(exercise=>exercise.href?
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
