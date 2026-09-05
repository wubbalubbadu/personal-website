"use client";

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

  return (
    <section className="canvas" aria-label="Detail panel">
      <div className="canvas-chrome">
        <button type="button" className="canvas-collapse" onClick={onCollapse} aria-label="Close panel">
          ×
        </button>
        <div className="canvas-tabs" role="tablist">
          {tabs.map((tab) => (
            <span key={tab.id} className={`canvas-tab${tab.id === active?.id ? " is-active" : ""}`}>
              <button type="button" role="tab" aria-selected={tab.id === active?.id} onClick={() => onSelect(tab.id)}>
                {tab.title}
              </button>
              <button type="button" className="canvas-tab-x" onClick={() => onClose(tab.id)} aria-label={`Close ${tab.title}`}>
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="canvas-actions">
          <a href={resume.pdf} target="_blank" rel="noreferrer">
            Résumé
          </a>
          <a href={`mailto:${resume.contact.email}`}>Email</a>
        </div>
      </div>

      {active ? (
        <>
          <div className="canvas-url">https://{active.url}</div>
          <div className="canvas-body" key={active.id}>
            {active.spec.kind === "resume" ? <ResumeView /> : null}
            {active.spec.kind === "timeline" ? <TimelineView /> : null}
            {active.spec.kind === "tech" ? <TechView /> : null}
            {active.spec.kind === "flute" ? <FluteView /> : null}
            {active.spec.kind === "projects" || active.spec.kind === "project" ? (
              <ProjectsView spec={active.spec} onOpenProject={onOpenProject} />
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}
