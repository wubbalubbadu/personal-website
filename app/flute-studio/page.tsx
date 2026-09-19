"use client";

import HomePreviewCards from "./HomePreviewCards";
import HomeQuickTools from "./HomeQuickTools";
import ContinuePracticingRow from "./ContinuePracticingCard";
import HomeCalendarRow from "./HomeCalendarRow";
import "./studio-home.css";

export default function StudioHome(){
  return <main className="studio-shell">
    <section className="studio-main">
      <div className="home-content">
        {/* Every band on this page is labelled, including these two, so
            the headings read as a contents rather than as decoration on
            the few sections that happen to have one. The personal panels
            sit last: a first-time visitor should not open onto someone
            else's empty state. */}
        <HomePreviewCards/>

        <h2 className="home-preview__group">Tools</h2>
        <HomeQuickTools/>

        {/* The way back in, plus the month at a glance. This is the SAME
            calendar component My Studio uses — the two used to be separate
            implementations in different visual languages. */}
        <h2 className="home-preview__group">Practice tracker</h2>
        <ContinuePracticingRow/>
        <HomeCalendarRow/>
      </div>
    </section>
  </main>
}
