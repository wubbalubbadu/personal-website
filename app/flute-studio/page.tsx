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
        <ContinuePracticingRow/>
        <HomeQuickTools/>
        <HomePreviewCards/>
        <section className="studio-hero"><PracticeActivityHero/></section>
      </div>
    </section>
  </main>
}
