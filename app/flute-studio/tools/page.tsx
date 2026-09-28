"use client";

import ToolCards from "./ToolCards";
import {useLanguage} from "../i18n/LanguageContext";
import "../exercises/exercises.css";

/** Tools: things that run while you play, opened in the practice dock. */
export default function ToolsPage(){
  const {lang}=useLanguage(),zh=lang==="zh";
  return <main className="exercise-hub">
    <div className="exercise-hub__content">
      <header className="exercise-hub__header"><div><h1>{zh?"工具":"Tools"}</h1></div></header>
      <ToolCards/>
    </div>
  </main>;
}
