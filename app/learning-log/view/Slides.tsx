"use client";

import { useCallback, useEffect } from "react";
import type { Chapter } from "../content/types";
import { Blocks } from "./Block";
import { RichText } from "./rich";

export default function Slides({
  chapter,
  index,
  onIndex,
  isDone,
  onToggle,
  onExit,
}: {
  chapter: Chapter;
  index: number;
  onIndex: (i: number) => void;
  isDone: (slideId: string) => boolean;
  onToggle: (slideId: string) => void;
  onExit: () => void;
}) {
  const count = chapter.slides.length;
  const slide = chapter.slides[Math.min(index, count - 1)];
  const done = isDone(slide.id);

  const go = useCallback(
    (delta: number) => onIndex(Math.max(0, Math.min(count - 1, index + delta))),
    [count, index, onIndex],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight" || e.key === "l" || e.key === " ") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft" || e.key === "h") {
        e.preventDefault();
        go(-1);
      } else if (e.key === "Escape") {
        onExit();
      } else if (e.key.toLowerCase() === "f") {
        onToggle(slide.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onExit, onToggle, slide.id]);

  return (
    <div className="ll-slides">
      <div className="ll-slide-dots" aria-hidden="true">
        {chapter.slides.map((s, i) => (
          <i key={s.id} className={i === index ? "is-here" : isDone(s.id) ? "is-done" : ""} />
        ))}
      </div>

      <div className="ll-slide-card" key={slide.id}>
        <p className="ll-slide-card__kicker">
          <RichText>{chapter.title}</RichText> · {index + 1} / {count}
        </p>
        <h2 className="ll-slide-card__h"><RichText>{slide.title}</RichText></h2>
        {slide.lede ? <p className="ll-slide-card__lede"><RichText>{slide.lede}</RichText></p> : null}
        <Blocks blocks={slide.blocks} />
        <button
          type="button"
          className={`ll-understood${done ? " is-on" : ""}`}
          onClick={() => onToggle(slide.id)}
          aria-pressed={done}
        >
          <i aria-hidden="true">{done ? "✓" : ""}</i>
          {done ? "understood" : "mark understood  ·  f"}
        </button>
      </div>

      <div className="ll-slide-nav">
        <button type="button" onClick={() => go(-1)} disabled={index === 0}>← prev</button>
        <span className="ll-slide-nav__count">{index + 1} / {count}</span>
        {index === count - 1 ? (
          <button type="button" onClick={onExit}>done ✓</button>
        ) : (
          <button type="button" onClick={() => go(1)}>next →</button>
        )}
      </div>
    </div>
  );
}
