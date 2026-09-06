"use client";

import { useLayoutEffect, useRef, useState } from "react";
import "../canvas.css";
import { CanvasTab } from "../lib/canvas";
import { resume } from "../lib/resume";
import FluteView from "./FluteView";
import ProjectsView from "./ProjectsView";
import ResumeView from "./ResumeView";
import TechView from "./TechView";
import TimelineView from "./TimelineView";

export default function Canvas({
  tabs,
  activeId,
  onSelect,
  onClose,
  onCollapse,
  onOpenProject,
}: {
  tabs: CanvasTab[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onCollapse: () => void;
  onOpenProject: (slug: string) => void;
}) {
  const active = tabs.find((t) => t.id === activeId) ?? tabs[tabs.length - 1];
  const tabsRef = useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const root = tabsRef.current;
    const sel = root?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (root && sel) {
      const box = sel.getBoundingClientRect();
      const base = root.getBoundingClientRect();
      setBar({ left: box.left - base.left + root.scrollLeft, width: box.width });
    }
  }, [active?.id, tabs.length]);

  return (
    <section className="canvas" aria-label="Detail panel">
      <div className="canvas-bar">
        <span className="canvas-nav" aria-hidden="true">
          ‹ ›
        </span>
        <span className="canvas-addr">
          <span className="canvas-addr__dot" aria-hidden="true" />
          https://{active ? active.url : "haylie.dev"}
        </span>
        <div className="canvas-actions">
          <a href={resume.pdf} target="_blank" rel="noreferrer">
            Résumé
          </a>
          <a href={`mailto:${resume.contact.email}`}>Email</a>
        </div>
      </div>

      <div className="canvas-tabs" role="tablist" ref={tabsRef}>
        {tabs.map((tab) => (
          <span key={tab.id} className={`canvas-tab${tab.id === active?.id ? " is-active" : ""}`}>
            <button type="button" role="tab" aria-selected={tab.id === active?.id} onClick={() => onSelect(tab.id)}>
              {tab.title}
            </button>
            <button
              type="button"
              className="canvas-tab-x"
              onClick={() => onClose(tab.id)}
              aria-label={`Close ${tab.title}`}
            >
              ×
            </button>
          </span>
        ))}
        <span className="canvas-tabs__underline" style={{ left: bar.left, width: bar.width }} aria-hidden="true" />
        <button type="button" className="canvas-collapse" onClick={onCollapse} aria-label="Close panel">
          ×
        </button>
      </div>

      {active ? (
        <div className="canvas-body" key={active.id}>
          {active.spec.kind === "resume" ? <ResumeView /> : null}
          {active.spec.kind === "timeline" ? <TimelineView /> : null}
          {active.spec.kind === "tech" ? <TechView /> : null}
          {active.spec.kind === "flute" ? <FluteView /> : null}
          {active.spec.kind === "projects" || active.spec.kind === "project" ? (
            <ProjectsView spec={active.spec} onOpenProject={onOpenProject} />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
