"use client";

import {useLanguage} from "./i18n/LanguageContext";
import Link from "next/link";
import {musicLibrary} from "../../content/music-library";
import EmbouchureMiniPreview from "./EmbouchureMiniPreview";
import "./home-preview-cards.css";

export default function HomePreviewCards(){
  const {t}=useLanguage();
  const regions=t.roadmap.regions;
  const tracks=musicLibrary.filter(item=>item.status==="published").slice(0,4);

  return <section className="home-preview-grid" aria-label="Resources">
    <Link className="preview-card preview-card--embouchure" href="/flute-studio/embouchure">
      <div className="preview-card__stage"><EmbouchureMiniPreview/></div>
      <div className="preview-card__copy"><b>{t.quickTools.embouchure}</b><small>{t.quickTools.embouchureDetail}</small></div>
    </Link>

    <Link className="preview-card preview-card--breathing" href="/flute-studio/breathing">
      <div className="preview-card__stage">
        {/* The marker rides its own element rather than the ring, so it can
            travel at a constant speed while the ring stays put. */}
        <div className="breathing-preview" aria-hidden="true"><i className="breathing-preview__ring"/><i className="breathing-preview__orbit"><b/></i></div>
      </div>
      <div className="preview-card__copy"><b>Breathing Lab</b><small>Guided breaths, your rhythm.</small></div>
    </Link>

    <Link className="preview-card preview-card--tones" href="/flute-studio/exercises/long-tones">
      <div className="preview-card__stage">
        <div className="tones-preview" aria-hidden="true">
          <svg viewBox="0 0 240 160" role="presentation">
            <text className="tones-preview__pitch" x="26" y="87">A</text>
            <path className="tones-preview__guide" d="M62 48 H214 M62 112 H214"/>
            <path className="tones-preview__track" d="M62 80 H214"/>
            <path className="tones-preview__trace" pathLength="100" d="M62 80 H214"/>
            <circle className="tones-preview__cursor" cx="214" cy="80" r="6"/>
          </svg>
        </div>
      </div>
      <div className="preview-card__copy"><b>Long tones</b><small>Held notes and De la sonorité.</small></div>
    </Link>

    <Link className="preview-card preview-card--scales" href="/flute-studio/exercises/scales">
      <div className="preview-card__stage">
        <div className="scales-preview" aria-hidden="true">
          <svg viewBox="0 0 240 160" role="presentation">
            <path className="scales-preview__slur" d="M36 123 C45 139 70 130 84 111 C70 125 49 132 36 123Z"/>
            {Array.from({length:4}, (_,i)=>{
              const x=36+i*52, y=110-i*12;
              return <g key={i} className={`scales-preview__note scales-preview__note--${i+1}`}>
                <ellipse cx={x} cy={y} rx="10" ry="7" transform={`rotate(-22 ${x} ${y})`}/>
                <path d={`M ${x+8} ${y-3} V ${y-42}`} fill="none" stroke="currentColor" strokeWidth="3"/>
              </g>;
            })}
          </svg>
        </div>
      </div>
      <div className="preview-card__copy"><b>{t.quickTools.scaleStudio}</b><small>{t.quickTools.scaleStudioDetail}</small></div>
    </Link>

    <Link className="preview-card preview-card--music" href="/flute-studio/music">
      <div className="preview-card__stage">
        <div className="music-preview" aria-hidden="true">
          {tracks.map((track,index)=><div className="music-preview__swatch" key={track.id} style={{"--i":index} as React.CSSProperties}><b>{track.title}</b><span>{track.composer}</span></div>)}
        </div>
      </div>
      <div className="preview-card__copy"><b>{t.quickTools.browseMusic}</b><small>{t.quickTools.browseMusicDetail}</small></div>
    </Link>
    <Link className="preview-card preview-card--roadmap" href="/flute-studio/roadmap">
      <div className="preview-card__stage">
        <ul className="roadmap-preview" aria-hidden="true">
          {/* Each region is a checkbox rather than a bullet: the roadmap is
              something you work through, and a list of coloured dots never
              said that. The first two sit ticked so the static card already
              reads as progress. */}
          {regions.map((region,index)=><li key={region.id} className={index<2?"is-done":""} style={{"--i":index} as React.CSSProperties}><i className={region.tone}><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.3 4.8 8.6 9.5 3.6"/></svg></i><span>{region.title}</span></li>)}
        </ul>
      </div>
      <div className="preview-card__copy"><b>{t.quickTools.roadmap}</b><small>{t.quickTools.roadmapDetail}</small></div>
    </Link>

  </section>;
}
