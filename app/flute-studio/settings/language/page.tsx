"use client";

import {useLanguage} from "../../i18n/LanguageContext";
import "../settings.css";

export default function LanguageSettingsPage(){
  const {t,lang,setLang}=useLanguage();
  return <main className="settings-page">
    <a className="settings-back" href="/flute-studio/settings">‹ {t.settings.back}</a>
    <header className="settings-header">
      <h1>{t.settings.languageSectionTitle}</h1>
    </header>

    <section className="settings-group">
      <div className="settings-list">
        <button type="button" className="settings-row" onClick={()=>setLang("en")}>
          <span className="settings-row-label">{t.settings.english}</span>
          {lang==="en"&&<span className="settings-row-check" aria-hidden="true">✓</span>}
        </button>
        <button type="button" className="settings-row" onClick={()=>setLang("zh")}>
          <span className="settings-row-label">{t.settings.chinese}</span>
          {lang==="zh"&&<span className="settings-row-check" aria-hidden="true">✓</span>}
        </button>
      </div>
      <p className="settings-footnote">{t.settings.languageFooter}</p>
    </section>
  </main>;
}
