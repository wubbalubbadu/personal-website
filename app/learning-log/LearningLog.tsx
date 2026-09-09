"use client";

import "./learning-log.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { aiMusic } from "./content/ai-music";
import { notes, noteIds, getNote, type Note } from "./content/notes";
import type { Chapter } from "./content/types";
import { RichText } from "./view/rich";
import Reader from "./view/Reader";
import Slides from "./view/Slides";
import { useProgress } from "./view/useProgress";
import { useNoteProgress } from "./view/useNoteProgress";

type Mode = "read" | "slides";
type View = "index" | "course" | "note";

/**
 * Hash routing:
 *   ``                                        → the logs index
 *   `#course`                                 → the AI-for-Music course landing
 *   `#<noteId>` (optionally `#<noteId>/3`)    → a standalone note
 *   `#<chapterId>` (optionally `#<chapterId>/3`) → a chapter of the course
 */
function readHash(): { view: View; id: string | null; slide: number } {
  if (typeof window === "undefined") return { view: "index", id: null, slide: 0 };
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw) return { view: "index", id: null, slide: 0 };
  if (raw === "course") return { view: "course", id: null, slide: 0 };
  const [id, s] = raw.split("/");
  const slide = s ? Math.max(0, +s - 1) || 0 : 0;
  if (id && noteIds.has(id)) return { view: "note", id, slide };
  return { view: "course", id: id || null, slide };
}

export default function LearningLog() {
  const course = aiMusic;
  const progress = useProgress(course);

  const [view, setView] = useState<View>("index");
  const [openId, setOpenId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("slides");
  const [slideIdx, setSlideIdx] = useState(0);

  useEffect(() => {
    const apply = () => {
      const h = readHash();
      setView(h.view);
      setOpenId(h.id);
      setSlideIdx(h.slide);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  const chapter: Chapter | null = useMemo(() => {
    if (view !== "course" || !openId) return null;
    for (const u of course.units) {
      const c = u.chapters.find((c) => c.id === openId);
      if (c) return c;
    }
    return null;
  }, [course, view, openId]);

  const note = useMemo(() => (view === "note" && openId ? getNote(openId) ?? null : null), [view, openId]);

  const unitOf = useMemo(
    () => (chapter ? course.units.find((u) => u.chapters.some((c) => c.id === chapter.id)) ?? null : null),
    [course, chapter],
  );

  const nav = useCallback((hash: string, nextView: View, nextId: string | null = null) => {
    setView(nextView);
    setOpenId(nextId);
    setSlideIdx(0);
    window.history.replaceState(null, "", hash || window.location.pathname);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  const goIndex = useCallback(() => nav("", "index"), [nav]);
  const goCourse = useCallback(() => nav("#course", "course"), [nav]);
  const openChapter = useCallback((id: string) => nav(`#${id}`, "course", id), [nav]);
  const exitChapter = useCallback(() => nav("#course", "course"), [nav]);
  const openNote = useCallback((id: string) => nav(`#${id}`, "note", id), [nav]);

  const setIdx = useCallback(
    (i: number) => {
      setSlideIdx(i);
      if (openId) window.history.replaceState(null, "", `#${openId}/${i + 1}`);
    },
    [openId],
  );

  const reading = chapter ?? note;

  return (
    <div className="ll">
      <header className="ll-top">
        <a className="ll-back" href="/">← Haylie Wu</a>
        <span className="ll-top__crumb">
          <button type="button" className="ll-crumb-btn" onClick={goIndex}>
            Learning log
          </button>
          {view === "course" && !chapter ? (
            <>
              <span aria-hidden="true">/</span>
              <b>AI for Music</b>
            </>
          ) : null}
          {chapter ? (
            <>
              <span aria-hidden="true">/</span>
              <button type="button" className="ll-crumb-btn" onClick={goCourse}>
                AI for Music
              </button>
              <span aria-hidden="true">/</span>
              <span className="ll-top__unit">{unitOf ? <RichText>{unitOf.title}</RichText> : null}</span>
              <span aria-hidden="true">/</span>
              <b><RichText>{chapter.title}</RichText></b>
            </>
          ) : null}
          {note ? (
            <>
              <span aria-hidden="true">/</span>
              <b>{note.title}</b>
            </>
          ) : null}
        </span>
        <span className="ll-top__spacer" />
        {reading ? (
          <div className="ll-modes" role="tablist" aria-label="View mode">
            <button type="button" className={mode === "read" ? "is-on" : ""} onClick={() => setMode("read")} role="tab" aria-selected={mode === "read"}>
              Read
            </button>
            <button type="button" className={mode === "slides" ? "is-on" : ""} onClick={() => setMode("slides")} role="tab" aria-selected={mode === "slides"}>
              Slides
            </button>
          </div>
        ) : null}
        {note?.source ? (
          <a className="ll-note-src" href={note.source.href} target="_blank" rel="noreferrer">
            {note.source.label} ↗
          </a>
        ) : null}
        {chapter ? (
          <span className="ll-progress-chip">
            {progress.count}/{progress.total} understood
          </span>
        ) : null}
      </header>

      {view === "index" ? (
        <LogsIndex onCourse={goCourse} onNote={openNote} />
      ) : note ? (
        <NoteView key={note.id} note={note} mode={mode} index={slideIdx} onIndex={setIdx} onExit={goIndex} />
      ) : view === "note" ? (
        <LogsIndex onCourse={goCourse} onNote={openNote} />
      ) : !chapter ? (
        <Landing onOpen={openChapter} onBack={goIndex} progress={progress} />
      ) : mode === "read" ? (
        <Reader
          chapter={chapter}
          isDone={(sid) => progress.isDone(chapter.id, sid)}
          onToggle={(sid) => progress.toggle(chapter.id, sid)}
        />
      ) : (
        <Slides
          chapter={chapter}
          index={slideIdx}
          onIndex={setIdx}
          isDone={(sid) => progress.isDone(chapter.id, sid)}
          onToggle={(sid) => progress.toggle(chapter.id, sid)}
          onExit={exitChapter}
        />
      )}
    </div>
  );
}

/** One standalone note. Keyed by `note.id` in the parent so its progress hook
 *  remounts (and reloads from localStorage) when you switch notes. */
function NoteView({
  note,
  mode,
  index,
  onIndex,
  onExit,
}: {
  note: Note;
  mode: Mode;
  index: number;
  onIndex: (i: number) => void;
  onExit: () => void;
}) {
  const prog = useNoteProgress(note.id);
  return mode === "read" ? (
    <Reader chapter={note} isDone={prog.isDone} onToggle={prog.toggle} />
  ) : (
    <Slides
      chapter={note}
      index={index}
      onIndex={onIndex}
      isDone={prog.isDone}
      onToggle={prog.toggle}
      onExit={onExit}
    />
  );
}

function LogsIndex({ onCourse, onNote }: { onCourse: () => void; onNote: (id: string) => void }) {
  return (
    <main className="ll-landing">
      <p className="ll-eyebrow">LEARNING LOG</p>
      <h1>What I&rsquo;ve been learning</h1>
      <p className="ll-landing__about">
        Notes I keep while working through a course or reading a paper, rebuilt as something you can click around in
        rather than scroll past. More gets added as I go.
      </p>
      <ul className="ll-logs">
        <li>
          <button type="button" className="ll-log-card" onClick={onCourse}>
            <span className="ll-log-card__title">
              AI for Music
              <small>Course</small>
            </span>
            <span className="ll-log-card__sum">
              A CMU deep-learning-for-music course, rebuilt as an interactive textbook: music theory, digital audio,
              latent generation, then symbolic music models.
            </span>
          </button>
        </li>
        {notes.map((n) => (
          <li key={n.id}>
            <button type="button" className="ll-log-card" onClick={() => onNote(n.id)}>
              <span className="ll-log-card__title">
                {n.title}
                <small>{n.kind}</small>
              </span>
              <span className="ll-log-card__sum">{n.summary}</span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}

function Landing({
  onOpen,
  onBack,
  progress,
}: {
  onOpen: (id: string) => void;
  onBack: () => void;
  progress: ReturnType<typeof useProgress>;
}) {
  const course = aiMusic;
  return (
    <main className="ll-landing">
      <button type="button" className="ll-log-back" onClick={onBack}>
        ← All logs
      </button>
      <p className="ll-eyebrow">LEARNING LOG</p>
      <h1><RichText>{course.title}</RichText></h1>
      <p className="ll-landing__src"><RichText>{course.source}</RichText></p>
      <p className="ll-landing__about"><RichText>{course.about}</RichText></p>

      {course.units.map((unit, ui) => (
        <section className="ll-unit" key={unit.id}>
          <div className="ll-unit__head">
            <span className="ll-unit__n">UNIT {ui + 1}</span>
            <h2><RichText>{unit.title}</RichText></h2>
          </div>
          <p className="ll-unit__blurb"><RichText>{unit.blurb}</RichText></p>
          <ul className="ll-chapters">
            {unit.chapters.map((c) => {
              const p = progress.chapterProgress(c.id);
              const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
              return (
                <li key={c.id}>
                  <button type="button" className="ll-chapter-card" onClick={() => onOpen(c.id)}>
                    <span className="ll-chapter-card__title">
                      <RichText>{c.title}</RichText>
                      <small>{c.slides.length} slides{p.done ? ` · ${p.done} done` : ""}</small>
                    </span>
                    <span className="ll-chapter-card__sum"><RichText>{c.summary}</RichText></span>
                    <span className="ll-chapter-card__bar"><i style={{ width: `${pct}%` }} /></span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </main>
  );
}
