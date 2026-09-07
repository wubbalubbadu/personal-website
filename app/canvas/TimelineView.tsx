"use client";

import { useState } from "react";
import { timelineEvents } from "../lib/timeline";

const sorted = [...timelineEvents].sort((a, b) => a.start - b.start || (a.track === "software" ? -1 : 1));

export default function TimelineView({ onOpenProjects }: { onOpenProjects?: () => void }) {
  // Only the explicit track filter dims rows — hovering never does, so the text
  // stays readable while you scan it.
  const [track, setTrack] = useState<"software" | "music" | null>(null);

  return (
    <div className="tl">
      <div className="tl-heads">
        <button
          type="button"
          className={`tl-head tl-head--software${track === "software" ? " is-on" : ""}`}
          onClick={() => setTrack((t) => (t === "software" ? null : "software"))}
        >
          Software
        </button>
        <button
          type="button"
          className={`tl-head tl-head--music${track === "music" ? " is-on" : ""}`}
          onClick={() => setTrack((t) => (t === "music" ? null : "music"))}
        >
          Flute
        </button>
      </div>

      <div className="tl-track">
        {sorted.map((ev) => {
          const span = ev.end && ev.end !== ev.start ? `${ev.start}–${ev.end}` : `${ev.start}`;
          const dim = track !== null && track !== ev.track;
          const cls = `tl-row tl-row--${ev.track}${dim ? " is-dim" : ""}`;
          const inner = (
            <>
              <span className="tl-dot" aria-hidden="true" />
              <div className="tl-entry">
                <span className="tl-year">{span}</span>
                <strong className="tl-title">{ev.title}</strong>
                <span className="tl-detail">{ev.detail}</span>
              </div>
            </>
          );
          return ev.opensProjects && onOpenProjects ? (
            <button key={ev.id} type="button" className={`${cls} tl-row--link`} onClick={onOpenProjects}>
              {inner}
            </button>
          ) : (
            <div key={ev.id} className={cls}>
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
