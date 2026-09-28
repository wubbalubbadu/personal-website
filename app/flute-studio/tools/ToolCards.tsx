"use client";

import {openPracticeTool} from "../PracticeAudio";
import {TunerPreview,MetronomePreview,DronePreview} from "../ToolPreviews";
import {useLanguage} from "../i18n/LanguageContext";
import "../home-preview-cards.css";
import "../components/preview-grid.css";
import "./tools.css";

/**
 * The three tool cards, shared by the Tools page and the home page. Each is
 * a button: a tool opens in the practice dock over the current page rather
 * than navigating anywhere.
 */
const TOOLS=["tuner","metronome","drone"] as const;

export default function ToolCards(){
  const {t,lang}=useLanguage(),zh=lang==="zh";
  const preview={tuner:<TunerPreview/>,metronome:<MetronomePreview/>,drone:<DronePreview/>};
  return <section className="home-preview preview-grid preview-grid--three" aria-label={zh?"工具":"Tools"}>
    {TOOLS.map(tool=><button key={tool} type="button" className={`preview-card preview-card--${tool}`} onClick={()=>openPracticeTool(tool)}>
      <div className="preview-card__stage">{preview[tool]}</div>
      <div className="preview-card__copy"><b>{t.quickTools[tool]}</b><small>{t.quickTools[`${tool}Detail` as const]}</small></div>
    </button>)}
  </section>;
}
