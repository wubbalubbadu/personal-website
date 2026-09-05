"use client";

import { CanvasSpec } from "../lib/answers";
import { getProject, projects } from "../lib/projects";

export default function ProjectsView({
  spec,
  onOpenProject,
}: {
  spec: Extract<CanvasSpec, { kind: "projects" } | { kind: "project" }>;
  onOpenProject: (slug: string) => void;
}) {
  if (spec.kind === "project") {
    const project = getProject(spec.slug);
    if (!project) return <div className="pj-empty">Project not found.</div>;
    return (
      <article className="pj-detail">
        <div className="pj-detail-head">
          <h2>{project.name}</h2>
          <span className={`pj-status pj-status--${project.status.replace(/\s+/g, "-").toLowerCase()}`}>{project.status}</span>
        </div>
        <dl className="pj-meta">
          <div>
            <dt>Role</dt>
            <dd>{project.role}</dd>
          </div>
          <div>
            <dt>Year</dt>
            <dd>{project.year}</dd>
          </div>
        </dl>
        {project.image ? (
          <div className="pj-shot">
            <img src={project.image} alt={`${project.name} preview`} loading="lazy" />
          </div>
        ) : null}
        <p className="pj-body">{project.detail}</p>
        <div className="pj-chiprow">
          {project.tech.map((tech) => (
            <span key={tech} className="pj-chip">
              {tech}
            </span>
          ))}
        </div>
        {project.links?.length ? (
          <div className="pj-links">
            {project.links.map((link) => (
              <a key={link.href} href={link.href} target={link.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                {link.label}
              </a>
            ))}
          </div>
        ) : null}
        <button type="button" className="pj-back" onClick={() => onOpenProject("")}>
          All projects
        </button>
      </article>
    );
  }

  return (
    <div className="pj-gallery">
      {projects.map((project) => (
        <button type="button" key={project.slug} className={`pj-card pj-card--${project.size}`} onClick={() => onOpenProject(project.slug)}>
          {project.image ? (
            <span className="pj-card-shot" style={{ backgroundImage: `url(${project.image})` }} />
          ) : (
            <span className="pj-card-shot pj-card-shot--blank">{project.name.slice(0, 1)}</span>
          )}
          <span className="pj-card-body">
            <span className="pj-card-title">
              {project.name}
              <span className={`pj-status pj-status--${project.status.replace(/\s+/g, "-").toLowerCase()}`}>{project.status}</span>
            </span>
            <span className="pj-card-blurb">{project.blurb}</span>
            <span className="pj-chiprow">
              {project.tech.slice(0, 4).map((tech) => (
                <span key={tech} className="pj-chip">
                  {tech}
                </span>
              ))}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
