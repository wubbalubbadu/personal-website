"use client";

import "./learning-log.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { aiMusic } from "./content/ai-music";
import type { Chapter } from "./content/types";
import { RichText } from "./view/rich";
import Reader from "./view/Reader";
import Slides from "./view/Slides";
import { useProgress } from "./view/useProgress";

type Mode = "read" | "slides";

/** `#chapterId` (optionally `#chapterId/3` for a slide) deep-links a chapter. */
function readHash(): { chapterId: string | null; slide: number } {
  if (typeof window === "undefined") return { chapterId: null, slide: 0 };
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw) return { chapterId: null, slide: 0 };
  const [chapterId, s] = raw.split("/");
  return { chapterId: chapterId || null, slide: s ? Math.max(0, +s - 1) || 0 : 0 };
}

export default function LearningLog() {
  const course = aiMusic;
  const progress = useProgress(course);

  const [openId, setOpenId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("slides");
  const [slideIdx, setSlideIdx] = useState(0);

  // hydrate from the URL hash, then keep it in sync
  useEffect(() => {
    const apply = () => {
      const { chapterId, slide } = readHash();
      setOpenId(chapterId);
      setSlideIdx(slide);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  const chapter: Chapter | null = useMemo(() => {
    if (!openId) return null;
    for (const u of course.units) {
      const c = u.chapters.find((c) => c.id === openId);
      if (c) return c;
    }
    return null;
  }, [course, openId]);

  const unitOf = useMemo(
    () => (openId ? course.units.find((u) => u.chapters.some((c) => c.id === openId)) ?? null : null),
    [course, openId],
  );

  const openChapter = useCallback((id: string, slide = 0) => {
    setOpenId(id);
    setSlideIdx(slide);
    window.history.replaceState(null, "", `#${id}`);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  const exitChapter = useCallback(() => {
    setOpenId(null);
    window.history.replaceState(null, "", window.location.pathname);
    window.scrollTo({ top: 0 });
  }, []);

  const setIdx = useCallback(
    (i: number) => {
      setSlideIdx(i);
      if (openId) window.history.replaceState(null, "", `#${openId}/${i + 1}`);
    },
    [openId],
  );

  return (
    <div className="ll">
      <header className="ll-top">
        <a className="ll-back" href="/">← Haylie Wu</a>
        <span className="ll-top__crumb">
          <b>Learning log</b>
          {chapter ? (
            <>
              <span aria-hidden="true">/</span>
              <span className="ll-top__unit">{unitOf ? <RichText>{unitOf.title}</RichText> : null}</span>
              <span aria-hidden="true">/</span>
              <b><RichText>{chapter.title}</RichText></b>
            </>
          ) : null}
        </span>
        <span className="ll-top__spacer" />
        {chapter ? (
          <div className="ll-modes" role="tablist" aria-label="View mode">
            <button type="button" className={mode === "read" ? "is-on" : ""} onClick={() => setMode("read")} role="tab" aria-selected={mode === "read"}>
              Read
            </button>
            <button type="button" className={mode === "slides" ? "is-on" : ""} onClick={() => setMode("slides")} role="tab" aria-selected={mode === "slides"}>
              Slides
            </button>
          </div>
        ) : null}
        <span className="ll-progress-chip">
          {progress.count}/{progress.total} understood
        </span>
      </header>

      {!chapter ? (
        <Landing onOpen={(id) => openChapter(id)} progress={progress} />
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

function Landing({
  onOpen,
  progress,
}: {
  onOpen: (id: string) => void;
  progress: ReturnType<typeof useProgress>;
}) {
  const course = aiMusic;
  return (
    <main className="ll-landing">
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
