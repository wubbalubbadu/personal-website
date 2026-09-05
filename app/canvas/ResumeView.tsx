"use client";

import { useState } from "react";
import { resume, resumeTechTags } from "../lib/resume";

export default function ResumeView() {
  const [filter, setFilter] = useState<string | null>(null);
  const [peek, setPeek] = useState<string | null>(null);

  const active = peek ?? filter;
  const roleDimmed = (tech: string[]) => (active ? !tech.includes(active) : false);

  return (
    <div className={`rz${active ? " rz--focus" : ""}`}>
      <header className="rz-top">
        <div>
          <h2>{resume.name}</h2>
          <p className="rz-tagline">{resume.tagline}</p>
        </div>
        <a className="rz-download" href={resume.pdf} target="_blank" rel="noreferrer">
          Download PDF
        </a>
      </header>

      <div className="rz-contact">
        <a href={`mailto:${resume.contact.email}`}>{resume.contact.email}</a>
        <span>{resume.contact.phone}</span>
        <a href={`https://${resume.contact.linkedin}`} target="_blank" rel="noreferrer">
          {resume.contact.linkedin}
        </a>
        <a href={`https://${resume.contact.github}`} target="_blank" rel="noreferrer">
          {resume.contact.github}
        </a>
      </div>

      <div className="rz-filters" role="group" aria-label="Filter by technology">
        {resumeTechTags.map((tag) => (
          <button
            type="button"
            key={tag}
            className={`rz-tag${filter === tag ? " is-on" : ""}`}
            aria-pressed={filter === tag}
            onClick={() => setFilter((f) => (f === tag ? null : tag))}
          >
            {tag}
          </button>
        ))}
        {filter ? (
          <button type="button" className="rz-clear" onClick={() => setFilter(null)}>
            Clear
          </button>
        ) : null}
      </div>

      <section className="rz-section">
        <span className="rz-label">Experience</span>
        {resume.experience.map((role) => (
          <article key={role.org} className={`rz-role${roleDimmed(role.tech) ? " is-dim" : ""}`}>
            <div className="rz-role-head">
              <strong>{role.role}</strong>
              <span className="rz-role-when">
                {role.start} – {role.end}
              </span>
            </div>
            <div className="rz-role-org">
              {role.org}
              {role.location ? <span className="rz-role-loc"> · {role.location}</span> : null}
            </div>
            <ul>
              {role.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
            <div className="rz-chiprow">
              {role.tech.map((tech) => (
                <span key={tech} className={`rz-chip${active === tech ? " is-hit" : ""}`}>
                  {tech}
                </span>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="rz-section">
        <span className="rz-label">Education</span>
        {resume.education.map((ed) => (
          <article key={ed.school} className="rz-role">
            <div className="rz-role-head">
              <strong>{ed.degree}</strong>
              <span className="rz-role-when">
                {ed.start} – {ed.end}
              </span>
            </div>
            <div className="rz-role-org">
              {ed.school}
              {ed.detail ? <span className="rz-role-loc"> · {ed.detail}</span> : null}
              {ed.gpa ? <span className="rz-role-loc"> · GPA {ed.gpa}</span> : null}
            </div>
          </article>
        ))}
      </section>

      <section className="rz-section">
        <span className="rz-label">Skills</span>
        {Object.entries(resume.skills).map(([group, items]) => (
          <div key={group} className="rz-skillrow">
            <span className="rz-skillgroup">{group}</span>
            <div className="rz-chiprow">
              {items.map((tech) => (
                <button
                  type="button"
                  key={tech}
                  className={`rz-chip rz-chip--btn${active === tech ? " is-hit" : ""}`}
                  onMouseEnter={() => setPeek(tech)}
                  onMouseLeave={() => setPeek(null)}
                  onFocus={() => setPeek(tech)}
                  onBlur={() => setPeek(null)}
                  onClick={() => setFilter((f) => (f === tech ? null : tech))}
                >
                  {tech}
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
