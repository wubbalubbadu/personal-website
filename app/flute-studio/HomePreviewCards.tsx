"use client";

import {useLanguage} from "./i18n/LanguageContext";
import Link from "next/link";
import ScaleStudioPreview from "./ScaleStudioPreview";
import LongTonePreview from "./LongTonePreview";
import MusicPreview from "./MusicPreview";
import BreathingPreview from "./BreathingPreview";
import {TheoryPreview,EmbouchurePreview,FingeringPreview,TrillPreview,RoadmapPreview} from "./LearnPreviews";
import "./home-preview-cards.css";
import "./components/preview-grid.css";

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
    <section className="home-preview-grid home-preview-grid--duo" aria-label={lang==="zh"?"练习":"Practice"}>
    <Link className="preview-card preview-card--scales" href="/flute-studio/exercises/scales?back=/flute-studio" onPointerEnter={warmScoreReader} onFocus={warmScoreReader}>
      <div className="preview-card__stage">
        <ScaleStudioPreview zh={lang==="zh"}/>
      </div>
      <div className="preview-card__copy"><b>{t.quickTools.scaleStudio}</b><small>{lang==="zh"?"不用照着音阶书练，音阶随你搭配。":"Unlike a printed scale book, build any scale any way you like."}</small></div>
    </Link>
    <Link className="preview-card preview-card--tones" href="/flute-studio/exercises/long-tones" onPointerEnter={warmScoreReader} onFocus={warmScoreReader}>
      <div className="preview-card__stage">
        <LongTonePreview zh={lang==="zh"}/>
      </div>
      <div className="preview-card__copy"><b>{lang==="zh"?"长音":"Long tones"}</b><small>{lang==="zh"?"实时看音准，记录你的音准倾向。":"We track your pitch and record your tendencies."}</small></div>
    </Link>
    <Link className="preview-card preview-card--music" href="/flute-studio/music">
      <div className="preview-card__stage">
        <MusicPreview zh={lang==="zh"}/>
      </div>
      <div className="preview-card__copy"><b>{t.quickTools.browseMusic}</b><small>{lang==="zh"?"用互动乐谱和各种小工具学曲子。":"Learn music with interactive sheet music and all kinds of tools."}</small></div>
    </Link>
    <Link className="preview-card preview-card--breathing" href="/flute-studio/breathing">
      <div className="preview-card__stage"><BreathingPreview zh={lang==="zh"}/></div>
      <div className="preview-card__copy"><b>{lang==="zh"?"呼吸实验室":"Breathing Lab"}</b><small>{lang==="zh"?"跟着引导练呼吸，快慢自己定。":"Guided breathing at a pace you set."}</small></div>
    </Link>
    </section>

    <h2 className="home-preview__group">{lang==="zh"?"学习":"Learn"}</h2>
    {/* Theory first: it is where a new player starts. */}
    <section className="preview-grid" aria-label={lang==="zh"?"学习":"Learn"}>
    <Link className="preview-card preview-card--theory" href="/flute-studio/theory">
      <div className="preview-card__stage"><TheoryPreview zh={lang==="zh"}/></div>
      <div className="preview-card__copy"><b>{lang==="zh"?"乐理课":"Theory lessons"}</b><small>{lang==="zh"?"通过小游戏学看五线谱。":"Learn to read staff music through little games."}</small></div>
    </Link>
    <Link className="preview-card preview-card--fingerings" href="/flute-studio/fingerings">
      <div className="preview-card__stage"><FingeringPreview/></div>
      <div className="preview-card__copy"><b>{lang==="zh"?"指法表":"Fingering chart"}</b><small>{lang==="zh"?"全音域指法，附替代指法。":"Every fingering from low B up, with alternates."}</small></div>
    </Link>
    <Link className="preview-card preview-card--trills" href="/flute-studio/trills">
      <div className="preview-card__stage"><TrillPreview/></div>
      <div className="preview-card__copy"><b>{lang==="zh"?"颤音指法表":"Trill chart"}</b><small>{lang==="zh"?"四个八度的颤音指法，标出要动的键。":"Trill fingerings for four octaves, with the moving keys shown."}</small></div>
    </Link>
    <Link className="preview-card preview-card--embouchure" href="/flute-studio/embouchure">
      <div className="preview-card__stage"><EmbouchurePreview/></div>
      <div className="preview-card__copy"><b>{t.quickTools.embouchure}</b><small>{sentence(t.quickTools.embouchureDetail)}</small></div>
    </Link>
    <Link className="preview-card preview-card--roadmap" href="/flute-studio/roadmap">
      <div className="preview-card__stage"><RoadmapPreview regions={regions}/></div>
      <div className="preview-card__copy"><b>{t.quickTools.roadmap}</b><small>{sentence(t.quickTools.roadmapDetail)}</small></div>
    </Link>

    </section>

  </div>;
}
