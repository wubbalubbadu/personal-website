"use client";

import {useLanguage} from "./i18n/LanguageContext";
import HomePreviewCards from "./HomePreviewCards";
import ToolCards from "./tools/ToolCards";
import HomeStudioCards from "./HomeStudioCards";
import "./studio-home.css";

export default function StudioHome(){
  const {lang}=useLanguage(),zh=lang==="zh";
  return <main className="studio-shell">
    <section className="studio-main">
      <div className="home-content">
        {/* Every band on this page is labelled, including these two, so
            the headings read as a contents rather than as decoration on
            the few sections that happen to have one. The personal panels
            sit last: a first-time visitor should not open onto someone
            else's empty state. */}
        <HomePreviewCards/>

        <h2 className="home-preview__group">{zh?"工具":"Tools"}</h2>
        <ToolCards/>

        {/* Your studio at a glance (HomeStudioCards): today, what you're working on, your latest tricky bit, this
            week. Only cards with something in them; My Studio has the detail. */}
        <HomeStudioCards/>
      </div>
    </section>
  </main>
}
