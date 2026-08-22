"use client";

import {useLanguage} from "../i18n/LanguageContext";
import "./settings.css";

export default function SettingsPage(){
  const {t}=useLanguage();
  return <main className="settings-page">
    <header className="settings-header">
      <p>{t.nav.settings}</p>
      <h1>{t.settings.title}</h1>
    </header>

    <section className="settings-group">
      <p className="settings-group-label">{t.settings.general}</p>
      <div className="settings-list">
        <a className="settings-row" href="/flute-studio/settings/language">
          <span className="settings-row-icon" aria-hidden="true">文</span>
          <span className="settings-row-label">{t.settings.language}</span>
          <span className="settings-row-value">{t.settings.languageValue}</span>
          <span className="settings-row-chevron" aria-hidden="true">›</span>
        </a>
      </div>
    </section>

    <section className="settings-group">
      <p className="settings-group-label">{t.settings.about}</p>
      <div className="settings-list">
        <div className="settings-row settings-about-row">
          <span className="settings-about-name">{t.settings.aboutApp}</span>
          <span className="settings-about-version">{t.settings.aboutVersion}</span>
        </div>
      </div>
    </section>
  </main>;
}
