"use client";

import {useLanguage} from "./i18n/LanguageContext";
import "./daily-discovery.css";

function dayNumber(){const start=Date.UTC(2024,0,1);return Math.floor((Date.now()-start)/86400000)}

export default function DailyDiscovery(){
  const {t}=useLanguage();
  const day=dayNumber();
  const lesson=t.daily.theoryLessons[day%t.daily.theoryLessons.length];
  const exercise=t.daily.exercises[day%t.daily.exercises.length];

  return <div className="discovery-row">
    <div className="discovery-notes-fx" aria-hidden="true">
      <span>♪</span><span>♫</span><span>♩</span><span>♬</span><span>♪</span><span>♫</span>
    </div>
    <section className="discovery-card theory">
      <span className="discovery-card__icon" aria-hidden="true">𝄞</span>
      <div className="discovery-card__body">
        <p className="discovery-card__label">{t.daily.theoryLabel}</p>
        <strong>{lesson.title}</strong>
        <span>{lesson.text}</span>
      </div>
    </section>
    <section className="discovery-card exercise">
      <span className="discovery-card__icon" aria-hidden="true">◎</span>
      <div className="discovery-card__body">
        <p className="discovery-card__label">{t.daily.exerciseLabel}</p>
        <span className="discovery-card__exercise-text">{exercise.text}</span>
        {exercise.href&&<a className="discovery-card__cta" href={exercise.href}>{t.daily.tryIt}</a>}
      </div>
    </section>
  </div>;
}
