"use client";

import { CanvasSpec } from "../lib/answers";
import { getProject, projects } from "../lib/projects";

function AudioTracks({ tracks }: { tracks: { label: string; src: string }[] }) {
  return (
    <div className="pj-audio">
      {tracks.map((track) => (
        <figure key={track.src} className="pj-audio-track">
          <figcaption>{track.label}</figcaption>
          {/* instrumental music, no captions track */}
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio controls preload="none" src={track.src}>
            <a href={track.src}>Download {track.label}</a>
          </audio>
        </figure>
      ))}
    </div>
  );
}

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
        <h2>{project.name}</h2>
        <p className="pj-detail-meta">
          {project.role} · {project.year} · {project.status}
        </p>
        {project.image ? (
          <div className="pj-shot">
            <img src={project.image} alt={`${project.name} preview`} loading="lazy" />
          </div>
        ) : null}
        {project.detail.split("\n\n").map((para, i) => (
          <p key={i} className="pj-body">
            {para}
          </p>
        ))}
        {project.audio?.length ? <AudioTracks tracks={project.audio} /> : null}
        {project.items?.length ? (
          <ul className="pj-items">
            {project.items.map((item) => (
              <li key={item.name} className="pj-sub">
                <p className="pj-sub-name">
                  {item.href ? (
                    <a href={item.href} target={item.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                      {item.name}
                    </a>
                  ) : (
                    item.name
                  )}
                </p>
                {item.blurb ? <p className="pj-sub-blurb">{item.blurb}</p> : null}
                {item.audio?.length ? <AudioTracks tracks={item.audio} /> : null}
                {item.tech?.length ? <p className="pj-sub-tech">{item.tech.join("  ·  ")}</p> : null}
              </li>
            ))}
          </ul>
        ) : null}
        <p className="pj-tech">{project.tech.join("  ·  ")}</p>
        {project.links?.length ? (
          <p className="pj-links">
            {project.links.map((link) => (
              <a key={link.href} href={link.href} target={link.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                {link.label}
              </a>
            ))}
          </p>
        ) : null}
        <button type="button" className="pj-back" onClick={() => onOpenProject("")}>
          ← All projects
        </button>
      </article>
    );
  }

  return (
    <ul className="pj-list">
      {projects.map((project) => {
        const inner = (
          <>
            <span className="pj-item-name">{project.name}</span>
            <span className="pj-item-blurb">{project.blurb}</span>
            <span className="pj-item-meta">
              {project.year} · {project.status} · {project.tech.join(", ")}
            </span>
          </>
        );
        return (
          <li key={project.slug} className="pj-item">
            {project.externalHref ? (
              <a className="pj-item-btn" href={project.externalHref}>
                {inner}
              </a>
            ) : (
              <button type="button" className="pj-item-btn" onClick={() => onOpenProject(project.slug)}>
                {inner}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
