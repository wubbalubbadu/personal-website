"use client";

import type { Course } from "../content/types";
import type { Note } from "../content/notes";
import type { ResearchMap } from "../content/research";
import { RichText } from "./rich";
import "../github.css";

/**
 * The Learning Log front page, set like a GitHub README: one plain document
 * with every course chapter, note and research map listed in it.
 */
export default function ContentsPage({
  course,
  notes,
  research,
  onChapter,
  onNote,
  onResearch,
}: {
  course: Course;
  notes: Note[];
  research: ResearchMap[];
  onChapter: (id: string) => void;
  onNote: (id: string) => void;
  onResearch: (id: string) => void;
}) {
  const others = [
    ...notes.map((n) => ({ id: n.id, title: n.title, summary: n.summary, open: () => onNote(n.id), label: "Read the note" })),
    ...research.map((r) => ({ id: r.id, title: r.title, summary: r.summary, open: () => onResearch(r.id), label: "Open the checklist" })),
  ];

  return (
    <div className="gh">
      <div className="gh-wrap">
        {/* A full page navigation intentionally leaves the learning log and its hash routing. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="gh-home" href="/">Haylie Wu</a>
        <article className="gh-md">
          <h1>Learning log</h1>

          <h2><RichText>{course.title}</RichText></h2>
          <p><RichText>{course.about}</RichText></p>
          {course.units.map((unit, i) => (
            <section key={unit.id}>
              <h3>
                {i + 1}. <RichText>{unit.title}</RichText>
              </h3>
              <ul>
                {unit.chapters.map((c) => (
                  <li key={c.id}>
                    <button type="button" className="gh-link" onClick={() => onChapter(c.id)}>
                      <RichText>{c.title}</RichText>
                    </button>
                    <span className="gh-sum">
                      <RichText>{c.summary}</RichText>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {others.map((log) => (
            <section key={log.id}>
              <h2>{log.title}</h2>
              <p><RichText>{log.summary}</RichText></p>
              <p>
                <button type="button" className="gh-link" onClick={log.open}>
                  {log.label}
                </button>
              </p>
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}
