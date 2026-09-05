"use client";

import { useState } from "react";
import { timelineEvents } from "../lib/timeline";

const sorted = [...timelineEvents].sort((a, b) => a.start - b.start || (a.track === "software" ? -1 : 1));

export default function TimelineView() {
  const [hover, setHover] = useState<string | null>(null);
  const [track, setTrack] = useState<"software" | "music" | null>(null);

  const dim = (id: string, evTrack: "software" | "music") => {
    if (track) return track !== evTrack;
    if (hover) return hover !== id;
    return false;
  };

  return (
    <div className="tl">
      <div className="tl-heads">
        <button
          type="button"
          className={`tl-head tl-head--software${track === "software" ? " is-on" : ""}`}
          onMouseEnter={() => setTrack("software")}
          onMouseLeave={() => setTrack(null)}
          onFocus={() => setTrack("software")}
          onBlur={() => setTrack(null)}
        >
          Software
        </button>
        <span className="tl-head-spacer" />
        <button
          type="button"
          className={`tl-head tl-head--music${track === "music" ? " is-on" : ""}`}
          onMouseEnter={() => setTrack("music")}
          onMouseLeave={() => setTrack(null)}
          onFocus={() => setTrack("music")}
          onBlur={() => setTrack(null)}
        >
          Flute
        </button>
      </div>

      <div className="tl-track">
        {sorted.map((ev) => {
          if (ev.kind === "milestone" && ev.id === "pivot-2024") {
            return (
              <div key={ev.id} className="tl-pivot">
                <span className="tl-pivot-year">Early 2024</span>
                <p>
                  <strong>{ev.title}.</strong> {ev.detail}
                </p>
              </div>
            );
          }
          const span = ev.end && ev.end !== ev.start ? `${ev.start}–${ev.end}` : `${ev.start}`;
          return (
            <div
              key={ev.id}
              className={`tl-row tl-row--${ev.track}${dim(ev.id, ev.track) ? " is-dim" : ""}`}
              onMouseEnter={() => setHover(ev.id)}
              onMouseLeave={() => setHover(null)}
            >
              <div className="tl-node">
                <span className="tl-dot" />
                <span className="tl-year">{span}</span>
              </div>
              <div className="tl-card">
                <span className="tl-kind">{ev.kind === "education" ? "Education" : ev.kind === "role" ? "Work" : "Milestone"}</span>
                <strong>{ev.title}</strong>
                <p>{ev.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
