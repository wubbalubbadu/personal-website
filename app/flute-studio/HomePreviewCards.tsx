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
  // A scale drawn as an arch: up an octave and back down. The note heads
  // animate in sequence, so the card shows a run being *played* rather than
  // a static picture of one. 13 notes is the most that stays legible at
  // this size while still reading as a full octave there and back.
  const runNotes=Array.from({length:13},(_,i)=>{
    const degree=i<=6?i:12-i;
    return {x:20+i*14.5,y:68-degree*5,i};
  });

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

    <Link className="preview-card preview-card--scales" href="/flute-studio/exercises/scales">
      <div className="preview-card__stage">
        <div className="scales-preview" aria-hidden="true">
          <svg className="scales-preview__staff" viewBox="0 0 220 84" role="presentation">
            {[0,1,2,3,4].map(line=><line key={line} className="scales-preview__line" x1="6" x2="214" y1={28+line*10} y2={28+line*10}/>)}
            <path className="scales-preview__slur" d="M 20 76 Q 107 88 194 76"/>
            {runNotes.map(note=><g key={note.i} className="scales-preview__note" style={{"--i":note.i} as React.CSSProperties}>
              <line x1={note.x+4.6} y1={note.y-2} x2={note.x+4.6} y2={note.y-17}/>
              <ellipse cx={note.x} cy={note.y} rx="4.6" ry="3.5"/>
            </g>)}
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
