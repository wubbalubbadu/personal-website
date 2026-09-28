"use client";

import Link from "next/link";
import {openPracticeTool} from "../PracticeAudio";
import {TunerPreview,MetronomePreview,DronePreview,TendencyPreview} from "../ToolPreviews";
import {useLanguage} from "../i18n/LanguageContext";
import "../home-preview-cards.css";
import "../components/preview-grid.css";
import "./tools.css";

/**
 * The tool cards, shared by the Tools page and the home page. The first three
 * are buttons: they open in the practice dock over the current page. The
 * pitch tendency test is a page of its own, so it is a link.
 */
const TOOLS=["tuner","metronome","drone"] as const;

export default function ToolCards(){
  const {t,lang}=useLanguage(),zh=lang==="zh";
  const preview={tuner:<TunerPreview/>,metronome:<MetronomePreview/>,drone:<DronePreview/>};
  return <section className="home-preview preview-grid" aria-label={zh?"工具":"Tools"}>
    {TOOLS.map(tool=><button key={tool} type="button" className={`preview-card preview-card--${tool}`} onClick={()=>openPracticeTool(tool)}>
      <div className="preview-card__stage">{preview[tool]}</div>
      <div className="preview-card__copy"><b>{t.quickTools[tool]}</b><small>{t.quickTools[`${tool}Detail` as const]}</small></div>
    </button>)}
    <Link className="preview-card preview-card--tendency" href="/flute-studio/tools/tendency">
      <div className="preview-card__stage"><TendencyPreview/></div>
      <div className="preview-card__copy"><b>{zh?"音准倾向测试":"Pitch tendency test"}</b><small>{zh?"吹一遍半音阶，看看哪些音偏高或偏低。":"Play the chromatic scale and see which notes run sharp or flat."}</small></div>
    </Link>
  </section>;
}
