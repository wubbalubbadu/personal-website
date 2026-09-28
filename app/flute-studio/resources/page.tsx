"use client";

import Link from "next/link";
import {LEARN_PAGES} from "../learn-pages";
import {TheoryPreview,EmbouchurePreview,FingeringPreview,TrillPreview,RoadmapPreview} from "../LearnPreviews";
import "../home-preview-cards.css";
import "../components/preview-grid.css";
import {useLanguage} from "../i18n/LanguageContext";
import "../exercises/exercises.css";

/**
 * Reference material, as opposed to things you do in a practice session.
 *
 * These pages existed already and were reachable only from the home page's
 * card grid, where a fingering chart sat at the same weight as Scale
 * Studio. They are not the same kind of thing: you open Scale Studio to
 * practise, and you open the fingering chart to look something up, usually
 * while doing something else. Giving them a tab of their own is what lets
 * the home page stop pretending every feature is equally important.
 *
 * The routes are unchanged. This is a way in, not a move — every existing
 * link and bookmark still works, and nothing had to be re-pathed.

 */
export default function ResourcesHub() {
  const { t, lang } = useLanguage();
  const zh = lang === "zh";
  const sentence=(text:string)=>/[.!?。！？]$/.test(text.trim())?text:`${text}${zh?"。":"."}`;
  const preview=(key:string)=>{
    switch(key){
      case "theory": return <TheoryPreview zh={zh}/>;
      case "fingerings": return <FingeringPreview/>;
      case "trills": return <TrillPreview/>;
      case "embouchure": return <EmbouchurePreview/>;
      case "roadmap": return <RoadmapPreview regions={t.roadmap.regions}/>;
      default: return null;
    }
  };

  return (
    <main className="exercise-hub">
      <div className="exercise-hub__content">
        <header className="exercise-hub__header" data-tab-title>
          <div>
            <h1>{zh ? "学习" : "Learn"}</h1>
          </div>
        </header>

        {/* The same animated cards as the home page, so each page shows what
            it does before you open it. Theory lessons comes first: it is
            where a new player starts. */}
        <section className="home-preview preview-grid" aria-label={zh ? "学习" : "Learn"}>
          {LEARN_PAGES.map(page => (
            <Link key={page.key} href={page.href} className={`preview-card preview-card--${page.key}`}>
              <div className="preview-card__stage">{preview(page.key)}</div>
              <div className="preview-card__copy"><b>{zh ? page.zh : page.en}</b><small>{sentence(zh ? page.zhDetail : page.enDetail)}</small></div>
            </Link>
          ))}
        </section>

      </div>
    </main>
  );
}
