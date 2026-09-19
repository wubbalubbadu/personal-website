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

  // Every group carries a heading, which is what stops them reading as
  // decoration: a page where only some sections are labelled looks like a
  // template, a page where all of them are looks like a contents.
  //
  // Three to a row throughout, and never one — a lone card stretched to
  // the full width reads as a banner rather than as one item among
  // several. Five resources means the second row holds two at the same
  // third-width as the first, which is the point: they keep their size
  // instead of expanding to fill the gap.
  return <div className="home-preview">
    <p className="home-preview__lede">An all-in-one flute practice space.</p>

    <h2 className="home-preview__group">Exercises</h2>
    <section className="home-preview-grid home-preview-grid--trio" aria-label="Exercises">
    <Link className="preview-card preview-card--scales" href="/flute-studio/exercises/scales">
      <div className="preview-card__stage">
        <div className="scales-preview" aria-hidden="true">
          <svg viewBox="0 0 240 160" role="presentation">
            <path className="scales-preview__slur" d="M36 123 C45 139 70 130 84 111 C70 125 49 132 36 123Z"/>
            {/* Staccato dots under the two notes that are tongued. The
                slur above already covers the pair that is slurred — adding
                a second arc drew the same phrase mark twice. */}
            <circle className="scales-preview__dot scales-preview__dot--3" cx="140" cy="102" r="3.5"/>
            <circle className="scales-preview__dot scales-preview__dot--4" cx="192" cy="90" r="3.5"/>
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
    <Link className="preview-card preview-card--tones" href="/flute-studio/exercises/long-tones">
      <div className="preview-card__stage">
        <div className="tones-preview" aria-hidden="true">
          <svg viewBox="0 0 240 160" role="presentation">
            <text className="tones-preview__pitch" x="26" y="87">A</text>
            <path className="tones-preview__guide" d="M62 48 H214 M62 112 H214"/>
            <path className="tones-preview__track" d="M62 80 H214"/>
            {/* Stroke width rides the sweep, so the held note swells and
                tapers — which is the thing a long tone actually trains. */}
            <path className="tones-preview__trace" pathLength="100" d="M62 80 H214"/>
            <circle className="tones-preview__cursor" cx="214" cy="80" r="6"/>
          </svg>
        </div>
      </div>
      <div className="preview-card__copy"><b>Long tones</b><small>Held notes and De la sonorité.</small></div>
    </Link>
    <Link className="preview-card preview-card--breathing" href="/flute-studio/breathing">
      <div className="preview-card__stage">
        {/* The marker rides its own element rather than the ring, so it can
            travel at a constant speed while the ring stays put. */}
        <div className="breathing-preview" aria-hidden="true"><i className="breathing-preview__ring"/><i className="breathing-preview__orbit"><b/></i></div>
      </div>
      <div className="preview-card__copy"><b>Breathing Lab</b><small>Guided breaths, your rhythm.</small></div>
    </Link>
    </section>

    <h2 className="home-preview__group">Resources</h2>
    <section className="home-preview-grid home-preview-grid--trio" aria-label="Resources">
    <Link className="preview-card preview-card--embouchure" href="/flute-studio/embouchure">
      <div className="preview-card__stage"><EmbouchureMiniPreview/></div>
      <div className="preview-card__copy"><b>{t.quickTools.embouchure}</b><small>{t.quickTools.embouchureDetail}</small></div>
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
    <Link className="preview-card preview-card--music" href="/flute-studio/music">
      <div className="preview-card__stage">
        <div className="music-preview" aria-hidden="true">
          {tracks.map((track,index)=><div className="music-preview__swatch" key={track.id} style={{"--i":index} as React.CSSProperties}><b>{track.title}</b><span>{track.composer}</span></div>)}
        </div>
      </div>
      <div className="preview-card__copy"><b>{t.quickTools.browseMusic}</b><small>{t.quickTools.browseMusicDetail}</small></div>
    </Link>

    <Link className="preview-card preview-card--fingerings" href="/flute-studio/fingerings">
      <div className="preview-card__stage">
        {/* Keys going down one after another — a fingering being taken,
            which is the one thing a fingering chart is about. The rod is
            drawn in segments BETWEEN the keys: a single line behind them
            showed through the open ones and read as a strike-through. */}
        <svg className="chart-preview chart-preview--keys" viewBox="0 0 220 84" role="presentation">
          {[0,1,2,3,4].map(gap=><line className="chart-preview__rod" key={gap} x1={38+gap*34} y1="42" x2={48+gap*34} y2="42"/>)}
          {[0,1,2,3,4,5].map(index=><g className="chart-preview__key" key={index} style={{"--i":index} as React.CSSProperties}>
            <circle className="chart-preview__key-ring" cx={26+index*34} cy="42" r="12"/>
            <circle className="chart-preview__key-fill" cx={26+index*34} cy="42" r="8.5"/>
          </g>)}
        </svg>
      </div>
      <div className="preview-card__copy"><b>Fingering chart</b><small>Low B to the altissimo, with alternates.</small></div>
    </Link>

    <Link className="preview-card preview-card--trills" href="/flute-studio/trills">
      <div className="preview-card__stage">
        {/* One notehead flicking between two pitches a step apart, which is
            what a trill is. Two stacked heads at this size merged into a
            blob; moving one says it far more clearly. */}
        <svg className="chart-preview chart-preview--trill" viewBox="0 0 220 84" role="presentation">
          {[0,1,2,3,4].map(line=><line className="chart-preview__line" key={line} x1="18" x2="202" y1={20+line*13} y2={20+line*13}/>)}
          <text className="chart-preview__tr" x="82" y="14">tr</text>
          <path className="chart-preview__wave" d="M104 10q8-9 16 0t16 0 16 0"/>
          <g className="chart-preview__note">
            <rect x="116" y="20" width="2" height="26"/>
            <ellipse cx="110" cy="46" rx="8" ry="6" transform="rotate(-20 110 46)"/>
          </g>
        </svg>
      </div>
      <div className="preview-card__copy"><b>Trill chart</b><small>Four octaves of trill fingerings.</small></div>
    </Link>
    </section>

  </div>;
}
