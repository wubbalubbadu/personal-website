"use client";

import {useEffect, useRef} from "react";
import {useLanguage} from "./i18n/LanguageContext";
import Link from "next/link";
import {musicLibrary} from "../../content/music-library";
import QuarterNote from "./theory/QuarterNote";
import EmbouchureMiniPreview from "./EmbouchureMiniPreview";
import "./home-preview-cards.css";

export default function HomePreviewCards(){
  const {t,lang}=useLanguage();
  const regions=t.roadmap.regions;
  const sentence=(text:string)=>/[.!?。！？]$/.test(text.trim())?text:`${text}${lang==="zh"?"。":"."}`;
  const tracks=musicLibrary.filter(item=>item.status==="published").slice(0,4);
  const previewRoot=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    const root=previewRoot.current;
    if(!root || !window.matchMedia("(hover: none) and (pointer: coarse)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const cards=Array.from(root.querySelectorAll<HTMLElement>(".preview-card"));
    const timers=new Set<ReturnType<typeof setTimeout>>();
    const observer=new IntersectionObserver(entries=>{
      entries
        .filter(entry=>entry.isIntersecting)
        .sort((a,b)=>cards.indexOf(a.target as HTMLElement)-cards.indexOf(b.target as HTMLElement))
        .forEach((entry,index)=>{
          const card=entry.target as HTMLElement;
          observer.unobserve(card);
          const startTimer=setTimeout(()=>{
            card.classList.add("is-touch-playing");
            const stopTimer=setTimeout(()=>card.classList.remove("is-touch-playing"),3600);
            timers.add(stopTimer);
          },index*140);
          timers.add(startTimer);
        });
    },{threshold:.58});

    cards.forEach(card=>observer.observe(card));
    return ()=>{
      observer.disconnect();
      timers.forEach(timer=>clearTimeout(timer));
      cards.forEach(card=>card.classList.remove("is-touch-playing"));
    };
  },[]);

  // Every group carries a heading, which is what stops them reading as
  // decoration: a page where only some sections are labelled looks like a
  // template, a page where all of them are looks like a contents.
  //
  // Cards keep a fixed column width and never stretch to fill a row: a lone
  // card stretched to the full width reads as a banner rather than as one
  // item among several. Resources run four across so the two reference
  // charts can sit on a row of their own at the same size.
  return <div className="home-preview" ref={previewRoot}>
    <p className="home-preview__lede">{lang==="zh"?"音阶、长音和真正的乐曲，还有一个边听边给反馈的麦克风。":"Scales, long tones and real music, plus a mic that listens while you play."}</p>

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
      <div className="preview-card__copy"><b>{t.quickTools.scaleStudio}</b><small>{sentence(t.quickTools.scaleStudioDetail)}</small></div>
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
      <div className="preview-card__copy"><b>Long tones</b><small>{lang==="zh"?"对着麦克风吹，看每个音准不准，结尾有没有往下掉。":"Play into the mic and see if each note is in tune, and whether it sags at the end."}</small></div>
    </Link>
    <Link className="preview-card preview-card--breathing" href="/flute-studio/breathing">
      <div className="preview-card__stage">
        {/* The marker rides its own element rather than the ring, so it can
            travel at a constant speed while the ring stays put. */}
        <div className="breathing-preview" aria-hidden="true"><i className="breathing-preview__ring"/><i className="breathing-preview__orbit"><b/></i></div>
      </div>
      <div className="preview-card__copy"><b>Breathing Lab</b><small>{lang==="zh"?"跟着引导呼吸，速度由你来定。":"Breathe along with the guide at a pace you set."}</small></div>
    </Link>
    </section>

    <h2 className="home-preview__group">Resources</h2>
    {/* Theory first: it is where a new player starts. The two reference charts
        sit on their own row under the four main resources. */}
    <section className="home-preview-grid home-preview-grid--quartet" aria-label="Resources">
    <Link className="preview-card preview-card--theory" href="/flute-studio/theory">
      <div className="preview-card__stage">
        <svg className="theory-preview" viewBox="0 0 240 150" aria-hidden="true">
          {[0,1,2,3,4].map(i=><line key={i} x1="25" x2="215" y1={42+i*16} y2={42+i*16}/>)}
          {[90,74,58,66].map((y,i)=><g className="theory-preview-note" key={i} style={{"--i":i} as React.CSSProperties}><g transform={`translate(${55+i*44} ${y}) scale(.6)`}><QuarterNote down={i>1}/></g><text x={55+i*44} y="135">{['G','B','D','C'][i]}</text></g>)}
        </svg>
      </div>
      <div className="preview-card__copy"><b>{lang==="zh"?"乐理课":"Theory lessons"}</b><small>{lang==="zh"?"动手学识谱和节奏的小课。":"Short hands-on lessons for reading notes and rhythm."}</small></div>
    </Link>
    <Link className="preview-card preview-card--embouchure" href="/flute-studio/embouchure">
      <div className="preview-card__stage"><EmbouchureMiniPreview/></div>
      <div className="preview-card__copy"><b>{t.quickTools.embouchure}</b><small>{sentence(t.quickTools.embouchureDetail)}</small></div>
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
      <div className="preview-card__copy"><b>{t.quickTools.roadmap}</b><small>{sentence(t.quickTools.roadmapDetail)}</small></div>
    </Link>
    <Link className="preview-card preview-card--music" href="/flute-studio/music">
      <div className="preview-card__stage">
        <div className="music-preview" aria-hidden="true">
          {tracks.map((track,index)=><div className="music-preview__swatch" key={track.id} style={{"--i":index} as React.CSSProperties}><b>{track.title}</b><span>{track.composer}</span></div>)}
        </div>
      </div>
      <div className="preview-card__copy"><b>{t.quickTools.browseMusic}</b><small>{sentence(t.quickTools.browseMusicDetail)}</small></div>
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
      <div className="preview-card__copy"><b>Fingering chart</b><small>{lang==="zh"?"从低音 B 到最高音，每个音都有替代指法。":"Every note from low B to the top, with alternate fingerings."}</small></div>
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
