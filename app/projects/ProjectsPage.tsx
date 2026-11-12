"use client";

import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/silkscreen/400.css";
import "../lab/_kit/kit.css";
import "./projects.css";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { projects, type Project } from "../lib/projects";
import { opensNewTab } from "../lab/_kit/links";

/*
 * The full write-up behind the home page's laptop, styled like the home page's
 * speech bubbles: one card per project. A project with screens (Cookie Flute
 * Studio) gets the whole width: why I built it, the screen in the middle, and
 * its features as cards under it that switch the screen. The rest sit picture
 * (or audio) on the left, text on the right. The laptop bubble links to #slug.
 */

/** Some years in projects.ts use an en dash; never show one. */
const years = (y: string) => y.replace("–", " to ");

function Links({ p }: { p: Project }) {
  const links = p.links ?? (p.externalHref ? [{ label: `Open ${p.name}`, href: p.externalHref }] : []);
  if (!links.length) return null;
  return (
    <p className="pjx__links">
      {links.map((l) => {
        const ext = opensNewTab(l.href);
        return (
          <a key={l.href} href={l.href} target={ext ? "_blank" : undefined} rel={ext ? "noreferrer" : undefined}>
            {l.label} ›
          </a>
        );
      })}
    </p>
  );
}

function Featured({ p }: { p: Project }) {
  const groups = p.gallery ?? [];
  const [at, setAt] = useState(0);
  const group = groups[at];
  return (
    <li id={p.slug} className="pjx__card pjx__card--plain">
      <span className="pjx__tag">{years(p.year)}</span>
      <div className="pjx__media">
        <div className="pjx__shot">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={group?.src ?? p.image} alt={`${p.name}: ${group?.caption ?? "home"}`} />
        </div>
      </div>
      <div className="pjx__text">
        <h2>{p.name}</h2>
        {p.pitch ? <p className="pjx__lead">{p.pitch}</p> : null}
        <div className="pjx__tabs" role="group" aria-label={`${p.name} features`}>
          {groups.map((g, i) => (
            <button key={g.caption} type="button" aria-pressed={i === at} onClick={() => setAt(i)}>
              {g.caption}
            </button>
          ))}
        </div>
        {/* Every tab's bullets sit in the same cell, only the picked one visible, so the
            card is always as tall as the longest list and nothing jumps when you switch. */}
        <div className="pjx__panels" aria-live="polite">
          {groups.map((g, i) => (
            <ul key={g.caption} className="pjx__points" aria-hidden={i !== at} data-on={i === at}>
              {g.points.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          ))}
        </div>
        <Links p={p} />
      </div>
    </li>
  );
}

const clock = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

/** A plain play button, the piece's name and a thin progress line, instead of the browser's grey player. */
function Track({ label, src }: { label: string; src: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [length, setLength] = useState(0);
  /* The length can load before hydration, so the loadedmetadata event is missed: read it once on mount. */
  useEffect(() => {
    const d = audio.current?.duration;
    if (d && Number.isFinite(d)) setLength(d);
  }, []);
  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) {
      /* One piece at a time. */
      document.querySelectorAll<HTMLAudioElement>(".pjx__track audio").forEach((o) => o !== a && o.pause());
      void a.play();
    } else a.pause();
  };
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audio.current;
    if (!a || !length) return;
    const r = e.currentTarget.getBoundingClientRect();
    a.currentTime = ((e.clientX - r.left) / r.width) * length;
  };
  return (
    <div className="pjx__track">
      <button type="button" className="pjx__play" aria-label={`${playing ? "Pause" : "Play"} ${label}`} onClick={toggle}>
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          {playing ? <path d="M4 3h3v10H4zM9 3h3v10H9z" fill="currentColor" /> : <path d="M5 2.5v11l9-5.5z" fill="currentColor" />}
        </svg>
      </button>
      <div className="pjx__track-body">
        <div className="pjx__track-top">
          <span>{label}</span>
          <span className="pjx__time">{length ? `${clock(time)} / ${clock(length)}` : ""}</span>
        </div>
        <div className="pjx__bar" onClick={seek}>
          <i style={{ width: length ? `${(time / length) * 100}%` : 0 }} />
        </div>
      </div>
      {/* Instrumental, so there's nothing to caption. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audio}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onDurationChange={(e) => setLength(e.currentTarget.duration)}
      />
    </div>
  );
}

function Plain({ p }: { p: Project }) {
  const audio = p.audio ?? p.items?.flatMap((i) => i.audio ?? []) ?? [];
  return (
    <li id={p.slug} className="pjx__card pjx__card--plain">
      <span className="pjx__tag">{years(p.year)}</span>
      <div className="pjx__media">
        {p.cutout ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="pjx__cutout" src={p.cutout} alt={`${p.name} preview`} loading="lazy" />
        ) : p.image ? (
          <div className={`pjx__shot${p.imageFit === "contain" ? " pjx__shot--contain" : ""}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.image} alt={`${p.name} preview`} loading="lazy" />
          </div>
        ) : audio.length ? (
          <div className="pjx__audio">
            {audio.map((t) => (
              <Track key={t.src} label={t.label} src={t.src} />
            ))}
          </div>
        ) : null}
      </div>
      <div className="pjx__text">
        <h2>{p.name}</h2>
        {p.pitch ? <p className="pjx__lead">{p.pitch}</p> : p.preview ? <p className="pjx__lead">{p.preview}</p> : null}
        {p.does?.length ? (
          <>
            <h3>{p.labels?.does ?? "What it does"}</h3>
            <ul>
              {p.does.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </>
        ) : null}
        {p.how?.length ? (
          <>
            <h3>{p.labels?.how ?? "How it\u2019s built"}</h3>
            <ul>
              {p.how.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </>
        ) : null}
        <Links p={p} />
      </div>
    </li>
  );
}

export default function ProjectsPage() {
  return (
    <main className="lab pjx">
      <div className="pjx__inner">
        <Link className="pjx__home" href="/">
          ‹ Home
        </Link>
        <h1 className="pjx__title">Projects</h1>
        <ol className="pjx__list">
          {projects.map((p) => (p.gallery?.length ? <Featured key={p.slug} p={p} /> : <Plain key={p.slug} p={p} />))}
        </ol>
      </div>
    </main>
  );
}
