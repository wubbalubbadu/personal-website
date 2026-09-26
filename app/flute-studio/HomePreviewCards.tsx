"use client";

import {useLanguage} from "./i18n/LanguageContext";
import Link from "next/link";
import ScaleStudioPreview from "./ScaleStudioPreview";
import LongTonePreview from "./LongTonePreview";
import MusicPreview from "./MusicPreview";
import BreathingPreview from "./BreathingPreview";
import {TheoryPreview,EmbouchurePreview,FingeringPreview,TrillPreview,RoadmapPreview} from "./LearnPreviews";
import "./home-preview-cards.css";

const warmScoreReader=()=>{void import("opensheetmusicdisplay")};

export default function HomePreviewCards(){
  const {t,lang}=useLanguage();
  const regions=t.roadmap.regions;
  const sentence=(text:string)=>/[.!?。！？]$/.test(text.trim())?text:`${text}${lang==="zh"?"。":"."}`;


  // Every group carries a heading, which is what stops them reading as
  // decoration: a page where only some sections are labelled looks like a
  // template, a page where all of them are looks like a contents.
  //
  // Cards keep a fixed column width and never stretch to fill a row: a lone
  // card stretched to the full width reads as a banner rather than as one
  // item among several. Resources run four across so the two reference
  // charts can sit on a row of their own at the same size.
  return <div className="home-preview">

    <h2 className="home-preview__group">{lang==="zh"?"练习":"Practice"}</h2>
    {/* Two across, so each card has room to act out what the tool does. */}
    <section className="home-preview-grid home-preview-grid--duo" aria-label="Practice">
    <Link className="preview-card preview-card--scales" href="/flute-studio/exercises/scales" onPointerEnter={warmScoreReader} onFocus={warmScoreReader}>
      <div className="preview-card__stage">
        <ScaleStudioPreview zh={lang==="zh"}/>
      </div>
      <div className="preview-card__copy"><b>{t.quickTools.scaleStudio}</b><small>{lang==="zh"?"任何调、任何音域、任何演奏法、任何练习型。做出你自己的音阶书，还会记住你的速度。":"Any key, any range, any articulation, any pattern. Build your own scale book, and it remembers your tempos."}</small></div>
    </Link>
    <Link className="preview-card preview-card--tones" href="/flute-studio/exercises/long-tones" onPointerEnter={warmScoreReader} onFocus={warmScoreReader}>
      <div className="preview-card__stage">
        <LongTonePreview zh={lang==="zh"}/>
      </div>
      <div className="preview-card__copy"><b>Long tones</b><small>{lang==="zh"?"实时音准检测：吹着长音就能看到每个音准不准，哪里往下掉。":"Real-time pitch detection: see each note\u2019s tuning while you hold it, and where it sags."}</small></div>
    </Link>
    <Link className="preview-card preview-card--music" href="/flute-studio/music">
      <div className="preview-card__stage">
        <MusicPreview zh={lang==="zh"}/>
      </div>
      <div className="preview-card__copy"><b>{t.quickTools.browseMusic}</b><small>{lang==="zh"?"会动的乐谱，不只是 PDF，练习工具和智能显示都已内置。":"Interactive scores, not PDFs, with practice tools and smart displays built in."}</small></div>
    </Link>
    <Link className="preview-card preview-card--breathing" href="/flute-studio/breathing">
      <div className="preview-card__stage"><BreathingPreview zh={lang==="zh"}/></div>
      <div className="preview-card__copy"><b>Breathing Lab</b><small>{lang==="zh"?"跟着引导呼吸，速度由你来定。":"Breathe along with the guide at a pace you set."}</small></div>
    </Link>
    </section>

    <h2 className="home-preview__group">{lang==="zh"?"学习":"Learn"}</h2>
    {/* Theory first: it is where a new player starts. */}
    <section className="home-preview-grid home-preview-grid--trio" aria-label="Learn">
    <Link className="preview-card preview-card--theory" href="/flute-studio/theory">
      <div className="preview-card__stage"><TheoryPreview zh={lang==="zh"}/></div>
      <div className="preview-card__copy"><b>{lang==="zh"?"乐理课":"Theory lessons"}</b><small>{lang==="zh"?"像小游戏一样的互动乐理课。":"Hands-on theory lessons that play like little games."}</small></div>
    </Link>
    <Link className="preview-card preview-card--embouchure" href="/flute-studio/embouchure">
      <div className="preview-card__stage"><EmbouchurePreview/></div>
      <div className="preview-card__copy"><b>{t.quickTools.embouchure}</b><small>{sentence(t.quickTools.embouchureDetail)}</small></div>
    </Link>
    <Link className="preview-card preview-card--roadmap" href="/flute-studio/roadmap">
      <div className="preview-card__stage"><RoadmapPreview regions={regions}/></div>
      <div className="preview-card__copy"><b>{t.quickTools.roadmap}</b><small>{sentence(t.quickTools.roadmapDetail)}</small></div>
    </Link>




    <Link className="preview-card preview-card--fingerings" href="/flute-studio/fingerings">
      <div className="preview-card__stage"><FingeringPreview/></div>
      <div className="preview-card__copy"><b>Fingering chart</b><small>{lang==="zh"?"从低音 B 到最高音，每个音都有替代指法。":"Every note from low B to the top, with alternate fingerings."}</small></div>
    </Link>

    <Link className="preview-card preview-card--trills" href="/flute-studio/trills">
      <div className="preview-card__stage"><TrillPreview/></div>
      <div className="preview-card__copy"><b>Trill chart</b><small>Four octaves of trill fingerings.</small></div>
    </Link>

    </section>

  </div>;
}
