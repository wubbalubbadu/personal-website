"use client";

import type { Chapter } from "../content/types";
import { Blocks } from "./Block";
import { RichText } from "./rich";

export default function Reader({
  chapter,
  isDone,
  onToggle,
}: {
  chapter: Chapter;
  isDone: (slideId: string) => boolean;
  onToggle: (slideId: string) => void;
}) {
  return (
    <article className="ll-reader">
      <h2 className="ll-reader__h"><RichText>{chapter.title}</RichText></h2>
      <p className="ll-reader__sum"><RichText>{chapter.summary}</RichText></p>

      {chapter.slides.map((slide) => {
        const done = isDone(slide.id);
        return (
          <section className="ll-slide-sec" key={slide.id} id={slide.id}>
            <h3><RichText>{slide.title}</RichText></h3>
            {slide.lede ? <p className="ll-slide-sec__lede"><RichText>{slide.lede}</RichText></p> : null}
            <Blocks blocks={slide.blocks} />
            <button
              type="button"
              className={`ll-understood${done ? " is-on" : ""}`}
              onClick={() => onToggle(slide.id)}
              aria-pressed={done}
            >
              <i aria-hidden="true">{done ? "✓" : ""}</i>
              {done ? "understood" : "mark understood"}
            </button>
          </section>
        );
      })}
    </article>
  );
}
