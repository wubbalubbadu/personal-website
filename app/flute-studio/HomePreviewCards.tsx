"use client";

import {useLanguage} from "./i18n/LanguageContext";
import Link from "next/link";
import {musicLibrary} from "../../content/music-library";
import EmbouchureMiniPreview from "./EmbouchureMiniPreview";
import "./home-preview-cards.css";

export default function HomePreviewCards(){
  const {t}=useLanguage();
  const journey=t.roadmap.journey;
  const tracks=musicLibrary.filter(item=>item.status==="published").slice(0,4);
  const exerciseRows=[
    {tone:"green",title:t.exercises.scaleStudioTitle},
    {tone:"pink",title:t.exercises.longToneTitle},
    {tone:"gray",title:t.exercises.chromaticTitle},
  ];

  return <section className="home-preview-grid" aria-label="Resources">
    <Link className="preview-card preview-card--embouchure" href="/flute-studio/embouchure">
      <div className="preview-card__stage"><EmbouchureMiniPreview/></div>
      <div className="preview-card__copy"><b>{t.quickTools.embouchure}</b><small>{t.quickTools.embouchureDetail}</small></div>
    </Link>

    <Link className="preview-card preview-card--roadmap" href="/flute-studio/roadmap">
      <div className="preview-card__stage">
        <ol className="roadmap-preview" aria-hidden="true">
          {journey.map((step,index)=><li key={step.level} style={{"--i":index} as React.CSSProperties}><span>{step.level}</span><em>{step.title}</em></li>)}
        </ol>
      </div>
      <div className="preview-card__copy"><b>{t.quickTools.roadmap}</b><small>{t.quickTools.roadmapDetail}</small></div>
    </Link>

    <Link className="preview-card preview-card--exercises" href="/flute-studio/exercises">
      <div className="preview-card__stage">
        <ul className="exercises-preview" aria-hidden="true">
          {exerciseRows.map((row,index)=><li key={row.title} style={{"--i":index} as React.CSSProperties}><i className={row.tone}/><span>{row.title}</span></li>)}
        </ul>
      </div>
      <div className="preview-card__copy"><b>{t.quickTools.exercises}</b><small>{t.quickTools.exercisesDetail}</small></div>
    </Link>

    <Link className="preview-card preview-card--music" href="/flute-studio/music">
      <div className="preview-card__stage">
        <div className="music-preview" aria-hidden="true">
          {tracks.map((track,index)=><div className="music-preview__swatch" key={track.id} style={{"--i":index} as React.CSSProperties}><b>{track.title}</b><span>{track.composer}</span></div>)}
        </div>
      </div>
      <div className="preview-card__copy"><b>{t.quickTools.browseMusic}</b><small>{t.quickTools.browseMusicDetail}</small></div>
    </Link>
  </section>;
}
