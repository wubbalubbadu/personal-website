"use client";

import HomePreviewCards from "./HomePreviewCards";
import HomeQuickTools from "./HomeQuickTools";
import PracticeActivityHero from "./PracticeActivityHero";
import ContinuePracticingRow from "./ContinuePracticingCard";
import "./studio-home.css";

export default function StudioHome(){
  return <main className="studio-shell">
    <section className="studio-main">
      <div className="home-content">
        {/* Tools first. The personal row sits below them, after the preview
            cards (the roadmap is the last of those) and just before the
            practice stats — the two personal panels belong together, and a
            first-time visitor should not open onto someone else's empty
            state. */}
        <HomeQuickTools/>
        <HomePreviewCards/>
        <ContinuePracticingRow/>
        <section className="studio-hero"><PracticeActivityHero/></section>
      </div>
    </section>
  </main>
}
