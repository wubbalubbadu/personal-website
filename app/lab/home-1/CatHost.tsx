"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "../_kit/kit.css";
import "./cat-host.css";
import "./handheld.css";
import { ACTIVITIES, Handheld, type Activity, type Device } from "./Handheld";
import PixelIcon from "../_kit/PixelIcon";
import ThemeToggle from "../_kit/ThemeToggle";
import { PlaceLink, SheetHost, useOpenSheet } from "../_kit/Sheets";
import { COPY, opensNewTab, PLACES, place } from "../_kit/links";
import { useMedia, usePrefersReducedMotion } from "../_kit/hooks";
import { INTENTS, type AnswerNode, type RichSeg } from "../../lib/answers";
import { playStep, timeline, unlockAudio, VOICES, type Voice } from "../../components/ps1-mascot";

/* ---- the cat's script ---- */

/** Topics the cat can answer, straight from the scripted answers in app/lib/answers.ts. */
const TOPICS = ["flute", "background", "projects", "contact"] as const;
type Topic = (typeof TOPICS)[number];

const CAT_HELLO = "Mrrp! I'm Haylie's cat. Ask me about her.";
const CAT_AGAIN = "Anything else? I have all day. I'm a cat.";

/** The live answers point at a side panel this page doesn't have; these
 * phrases are swapped so the reused copy still reads right here. */
const FIXES: [string, string][] = [
  [" The full list is on the right, open any of them.", ""],
  ["There's competition footage and a few clips on the right, plus my ", "There's competition footage on YouTube, plus my "],
];
const fix = (t: string) => FIXES.reduce((s, [a, b]) => s.replace(a, b), t);

/** Phrases that ask another question in the live chat become plain links here. */
const INTENT_HREF: Record<string, string> = {
  resume: "/haylie-wu-resume.pdf",
  "learning-log": "/learning-log",
  "cookie-flute-studio": "/flute-studio",
};

/** After an answer, a button that goes where the answer pointed. */
const FOLLOW: Partial<Record<Topic, { label: string; sheet: "flute" | "projects" }>> = {
  flute: { label: "Watch the videos", sheet: "flute" },
  projects: { label: "See the projects", sheet: "projects" },
};

/** The cat squeaks; Haylie's lines get a lower, softer babble so you can tell who's talking. */
const HAYLIE_VOICE: Voice = { pitch: 290, formant: 1.08, wobble: 0.05, length: 54, wave: "triangle", volume: 0.5 };

const nodeText = (n: AnswerNode) =>
  n.kind === "text" ? n.value : n.kind === "rich" ? n.segments.map((s) => s.text).join("") : "";

/** Shows the first `n` characters of a node, keeping links clickable once typed. */
function NodeBody({ node, n, onTopic }: { node: AnswerNode; n: number; onTopic: (t: Topic) => void }) {
  if (node.kind === "linkList") {
    return (
      <ul className="ch-box__links">
        {node.items.map((it) => {
          const ext = opensNewTab(it.href);
          return (
            <li key={it.href}>
              <a href={it.href} target={ext ? "_blank" : undefined} rel={ext ? "noreferrer" : undefined}>
                {it.label}
              </a>
            </li>
          );
        })}
      </ul>
    );
  }
  const segs: RichSeg[] = node.kind === "text" ? [{ text: fix(node.value) }] : node.segments.map((s) => ({ ...s, text: fix(s.text) }));
  const starts = segs.map((_, i) => segs.slice(0, i).reduce((sum, s) => sum + s.text.length, 0));
  return (
    <p>
      {segs.map((seg, i) => {
        const shown = seg.text.slice(0, Math.max(0, n - starts[i]));
        if (!shown) return null;
        if ("intent" in seg) {
          const href = INTENT_HREF[seg.intent];
          if (href) return <a key={i} href={href}>{shown}</a>;
          if ((TOPICS as readonly string[]).includes(seg.intent)) {
            return (
              <button key={i} type="button" className="ch-box__inlink" onClick={() => onTopic(seg.intent as Topic)}>
                {shown}
              </button>
            );
          }
          return <span key={i}>{shown}</span>;
        }
        if ("href" in seg) {
          const ext = opensNewTab(seg.href);
          return (
            <a key={i} href={seg.href} target={ext ? "_blank" : undefined} rel={ext ? "noreferrer" : undefined}>
              {shown}
            </a>
          );
        }
        return <span key={i}>{shown}</span>;
      })}
    </p>
  );
}

function Dialogue({
  pokeRef,
  onTopicChange,
}: {
  pokeRef: React.MutableRefObject<() => void>;
  onTopicChange: (t: Topic | null) => void;
}) {
  const reduced = usePrefersReducedMotion();
  const openSheet = useOpenSheet();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [asked, setAsked] = useState<Topic[]>([]);
  const [page, setPage] = useState(0);
  const [n, setN] = useState(0);
  const [sound, setSound] = useState(false);
  const soundRef = useRef(false);
  const timers = useRef<number[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  const pages: AnswerNode[] = topic
    ? INTENTS[topic].answer
    : [{ kind: "text", value: asked.length ? CAT_AGAIN : CAT_HELLO }];
  const node = pages[page];
  const text = node.kind === "linkList" ? "" : fix(nodeText(node));
  const full = text.length;
  const done = reduced || n >= full;
  const last = page === pages.length - 1;

  const stopTyping = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };

  /* Type the line out on the Animalese timeline, so letters and blips stay in
   * step. Haylie's long answers run a bit faster than the cat's lines. */
  useEffect(() => {
    if (reduced || !text) return;
    const voice = topic ? HAYLIE_VOICE : VOICES.cat;
    timers.current = timeline(text, topic ? 1.8 : 1.2).map((st) =>
      window.setTimeout(() => {
        setN(st.index + 1);
        if (soundRef.current) playStep(st, voice);
      }, 80 + st.at),
    );
    return stopTyping;
  }, [text, topic, reduced]);

  const toggleSound = () => {
    const next = !sound;
    if (next) unlockAudio();
    soundRef.current = next;
    setSound(next);
  };

  const ask = useCallback(
    (t: Topic) => {
      setTopic(t);
      onTopicChange(t);
      setAsked((a) => (a.includes(t) ? a : [...a, t]));
      setPage(0);
      setN(0);
    },
    [onTopicChange],
  );

  /** Tap the box: finish typing, then turn the page, then hand back to the cat. */
  const advance = useCallback(() => {
    if (!done) {
      stopTyping();
      setN(full);
      return;
    }
    if (!last) {
      setPage((p) => p + 1);
      setN(0);
    }
  }, [done, full, last]);

  useEffect(() => {
    pokeRef.current = () => {
      boxRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });
      if (topic && last && done) {
        setTopic(null);
        onTopicChange(null);
        setPage(0);
        setN(0);
      } else advance();
    };
  }, [pokeRef, advance, topic, last, done, reduced, onTopicChange]);

  const follow = topic && last && done ? FOLLOW[topic] : undefined;
  const choices = TOPICS.filter((t) => t !== topic);

  return (
    <div className="ch-talk" ref={boxRef}>
      {/* Tapping the box is a shortcut; keyboard users have the ▼ button and the choices. */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
      <div
        className="ch-box"
        role="group"
        aria-label="Chat with the cat"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a,button")) return;
          advance();
        }}
      >
        <span className="ch-box__name">{topic ? "HAYLIE" : "CAT"}</span>
        <button
          type="button"
          className={`ch-box__voice${sound ? " is-on" : ""}`}
          onClick={toggleSound}
          aria-pressed={sound}
          aria-label={sound ? "Mute the voices" : "Turn on the voices"}
          title={sound ? "Mute the voices" : "Turn on the voices"}
        >
          <SpeakerIcon on={sound} />
        </button>
        <div className="ch-box__text" aria-live="polite">
          <NodeBody node={node} n={reduced ? Infinity : n} onTopic={ask} />
        </div>
        {!last && done ? (
          <button type="button" className="ch-box__next" onClick={advance} aria-label="Next">
            ▼
          </button>
        ) : null}
      </div>
      {last && done ? (
        <div className="ch-choices" aria-label="Ask something">
          {follow ? (
            <button type="button" className="ch-choice ch-choice--go" onClick={() => openSheet(follow.sheet)}>
              {follow.label} ›
            </button>
          ) : null}
          {choices.map((t) => (
            <button type="button" key={t} className="ch-choice" onClick={() => ask(t)}>
              {INTENTS[t].ask}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SpeakerIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
      <path d="M3 7.5h3.2L10.5 4v12L6.2 12.5H3z" fill="currentColor" />
      {on ? (
        <>
          <path d="M13 7.2a4 4 0 0 1 0 5.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M15.2 5a7 7 0 0 1 0 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </>
      ) : (
        <path d="M13.5 8l4 4m0-4l-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      )}
    </svg>
  );
}

/** How long each activity lasts before the cat moves on by itself. */
const ACTIVITY_MS = 12000;

export default function CatHost({ device = "psp" }: { device?: Device }) {
  /* One handheld on the page, so only one WebGL cat: placed by the intro on a
   * phone, above the dialogue on a wide screen. */
  const wide = useMedia("(min-width: 900px)");
  const reduced = usePrefersReducedMotion();
  const pokeRef = useRef<() => void>(() => {});
  const [activityId, setActivityId] = useState<Activity["id"]>("desk");
  /* Once the visitor picks, the cat stays put; until then it drifts through its day. */
  const [picked, setPicked] = useState(false);
  const activity = ACTIVITIES.find((a) => a.id === activityId)!;
  const pick = useCallback((id: Activity["id"]) => {
    setPicked(true);
    setActivityId(id);
  }, []);
  useEffect(() => {
    if (picked || reduced) return;
    const t = window.setTimeout(() => {
      const i = ACTIVITIES.findIndex((a) => a.id === activityId);
      setActivityId(ACTIVITIES[(i + 1) % ACTIVITIES.length].id);
    }, ACTIVITY_MS);
    return () => window.clearTimeout(t);
  }, [activityId, picked, reduced]);
  /* The cat picks up its flute while Haylie talks about flute. */
  const onTopicChange = useCallback((t: Topic | null) => {
    if (t === "flute") pick("flute");
  }, [pick]);
  const main = PLACES.filter((p) => p.id === "studio" || p.id === "log" || p.id === "flute");

  const handheld = (
    <Handheld
      device={device}
      activity={activity}
      onPick={pick}
      onPoke={() => pokeRef.current()}
      pixelHeight={device === "psp" ? (wide ? 136 : 96) : wide ? 120 : 80}
    />
  );

  return (
    <main className={`lab ch ch--${device}`}>
      <SheetHost>
        <header className="ch-top">
          <span className="ch-name">{COPY.name}</span>
          <ThemeToggle />
        </header>
        <div className="ch-grid">
          <section className="ch-info">
            <div className="ch-hero">
              <div className="ch-hello">
                <h1>{COPY.hello}</h1>
                <p className="ch-who">{COPY.who}</p>
              </div>
              {!wide && device === "gb" ? handheld : null}
            </div>
            {!wide && device === "psp" ? handheld : null}
            <h2 className="ch-h2">{COPY.nowTitle}</h2>
            <ul className="ch-now">
              {main.map((p) => (
                <li key={p.id}>
                  <PlaceLink place={p} className="ch-row">
                    <PixelIcon id={p.id} className="ch-row__icon" />
                    <span className="ch-row__text">
                      <b>{p.label}</b>
                      <span>{p.line}</span>
                    </span>
                    <span className="ch-row__go" aria-hidden="true">
                      ›
                    </span>
                  </PlaceLink>
                </li>
              ))}
            </ul>
            <div className="ch-more">
              <PlaceLink place={place("projects")} className="ch-pill">
                <PixelIcon id="projects" className="ch-pill__icon" />
                Projects
              </PlaceLink>
              <PlaceLink place={place("contact")} className="ch-pill">
                <PixelIcon id="contact" className="ch-pill__icon" />
                Say hi
              </PlaceLink>
            </div>
          </section>
          <aside className="ch-side">
            {wide ? handheld : null}
            <Dialogue pokeRef={pokeRef} onTopicChange={onTopicChange} />
          </aside>
        </div>
      </SheetHost>
    </main>
  );
}
