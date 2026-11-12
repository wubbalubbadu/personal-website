"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import "../_kit/kit.css";
import "./cat-host.css";
import "./handheld.css";
import { SheetHost, useOpenSheet } from "../_kit/Sheets";
import { opensNewTab, type ProjectRow } from "../_kit/links";
import { playFlute } from "../_kit/fluteTone";
import { useMedia, usePrefersReducedMotion } from "../_kit/hooks";
import type { AnswerNode, RichSeg } from "../../lib/answers";
import { useLang } from "../_kit/lang";
import { copyFor, fix, nodeText, TOPICS, type Topic } from "./copy";
import { playStep, timeline, unlockAudio, VOICES, type MascotEngine, type MascotMood, type Outfit } from "../../components/ps1-mascot";
import { Console, type Device, type Pad } from "./Handheld";
import { paintPaper, paintProjectScreen } from "./ItemArt";
import { DESK, ROOM, TUNE, WALL, type ItemId, type Question } from "../_kit/studio";

/*
 * Cat host: the page is the handheld, and its screen is the cat's studio.
 * Everything you can do glows: a wall (diploma, résumé, socials) above a desk
 * (laptop, letter, flute, iPad). Pick something with the D-pad, the keyboard
 * or a tap; inspecting zooms in and an item card slides up with the details.
 * What the cat says comes out of the speaker into a bubble below the
 * console, where you can also ask it questions. The hello is there from the
 * first paint.
 */

/** Inspecting these flies the camera square onto the real thing in the room
 *  (like the laptop) and renders sharp while you're there. */
const CLOSE_UP = new Set<ItemId>(["diploma", "resume", "socials", "letter"]);

const DRESS_UP: Outfit[] = ["bow", "beret"];

type Place = "studio" | "room";

const INTENT_HREF: Record<string, string> = {
  resume: "/haylie-wu-resume.pdf",
  "learning-log": "/learning-log",
  "cookie-flute-studio": "/flute-studio",
};

/**
 * While the cat talks, it turns to what it's talking about: education looks at
 * the diploma (cap on), work looks at the résumé, things built at the laptop,
 * flute and audience at the flute. Flute answers check flute words first.
 */
type Focus = { item: ItemId; cap?: boolean; mood?: MascotMood };
const FOCUS_RULES: [RegExp, Focus][] = [
  [/MathWorks|startup|NetLogo|Connected Learning|internship|创业|实习/i, { item: "resume" }],
  [/degree|Northwestern|Conservatory|undergrad|master's|学位|西北大学|音乐学院|本科|硕士/i, { item: "diploma", cap: true }],
  [/MathWorks|startup|backend|résumé|NetLogo|research|internship|codebase|software|load time|migration|后端|简历|研究|代码库|软件|加载|迁移/i, { item: "resume" }],
  [/built|building|project|Cookie Flute Studio|Learning Log|marketplace|shipped|项目|长笛工作室|二手市场|全栈/i, { item: "laptop" }],
  [/flute|competition|followers|audience|repertoire|classical|长笛|比赛|粉丝|观众|曲子|古典/i, { item: "flute", mood: "flute" }],
];
function focusFor(text: string, topic: string): Focus | null {
  const rules = topic === "flute" ? [...FOCUS_RULES.slice(4), ...FOCUS_RULES.slice(0, 4)] : FOCUS_RULES;
  for (const [re, f] of rules) if (re.test(text)) return f;
  return null;
}

/** Shows the first `n` characters of a node, keeping links clickable once typed. */
function NodeBody({ node, n }: { node: AnswerNode; n: number }) {
  if (node.kind === "linkList") return null;
  const segs: RichSeg[] = node.kind === "text" ? [{ text: fix(node.value) }] : node.segments.map((s) => ({ ...s, text: fix(s.text) }));
  const starts = segs.map((_, i) => segs.slice(0, i).reduce((sum, s) => sum + s.text.length, 0));
  return (
    <>
      {segs.map((seg, i) => {
        const shown = seg.text.slice(0, Math.max(0, n - starts[i]));
        if (!shown) return null;
        const href = "href" in seg ? seg.href : "intent" in seg ? INTENT_HREF[seg.intent] : undefined;
        if (href) {
          const ext = opensNewTab(href);
          return (
            <a key={i} href={href} target={ext ? "_blank" : undefined} rel={ext ? "noreferrer" : undefined}>
              {shown}
            </a>
          );
        }
        return <span key={i}>{shown}</span>;
      })}
    </>
  );
}

type Mode = "intro" | "browse" | "topic" | "item" | "desktop" | "app";

/** One line of the button guide: which button, and what it does now. */
type GuideHint = ["crs" | "cir" | "tri" | "sqr" | "pad", string];
const GUIDE_GLYPH: Record<GuideHint[0], string> = { crs: "✕", cir: "○", tri: "△", sqr: "□", pad: "✚" };
const GUIDE_NAME: Record<GuideHint[0], string> = { crs: "Cross", cir: "Circle", tri: "Triangle", sqr: "Square", pad: "D-pad" };
function ButtonGuide({ hints, on }: { hints: GuideHint[]; on: boolean }) {
  return (
    <div className={`hh-guide${on ? " is-on" : ""}`} aria-hidden="true">
      {hints.map(([k, label]) => (
        <span key={k} className="hh-guide__item" title={GUIDE_NAME[k]}>
          <i className={`hh-guide__btn hh-guide__btn--${k}`}>{GUIDE_GLYPH[k]}</i>
          {label}
        </span>
      ))}
    </div>
  );
}

const detailsHref = (p: ProjectRow) => `/projects#${p.slug}`;
/** A short tune for when the cat picks up the flute. */
/** How long the camera takes to move in before the item card slides up. */
const ZOOM_MS = 650;

/** A pixel arrow off the edge of the table: down to the living room, up back to the desk. */
function ExitArrow() {
  return (
    <svg viewBox="0 0 9 8" width="27" height="24" shapeRendering="crispEdges" aria-hidden="true">
      <path d="M2 0h5v3h2v1h-1v1h-1v1h-1v1h-1v1h-1v-1h-1v-1h-1v-1h-1v-1h-1v-1h2z" fill="#3a2a20" />
      <path d="M3 1h3v3h1v1h-1v1h-1v1h-1v-1h-1v-1h-1v-1h1z" fill="#fff8ea" />
    </svg>
  );
}

/** A little pixel cookie for the snack counter. */
function CookieIcon() {
  return (
    <svg viewBox="0 0 8 8" width="13" height="13" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="2" y="0" width="4" height="8" fill="#3a2a20" />
      <rect x="0" y="2" width="8" height="4" fill="#3a2a20" />
      <rect x="1" y="1" width="6" height="6" fill="#3a2a20" />
      <rect x="2" y="1" width="4" height="6" fill="#e0a85a" />
      <rect x="1" y="2" width="6" height="4" fill="#e0a85a" />
      <rect x="2" y="2" width="1" height="1" fill="#5a2e18" />
      <rect x="5" y="3" width="1" height="1" fill="#5a2e18" />
      <rect x="3" y="5" width="1" height="1" fill="#5a2e18" />
    </svg>
  );
}

function SpeakerIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
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

/** Play buttons for a project's audio (the orchestral mock-ups), one at a time. */
function Tracks({ tracks }: { tracks: { label: string; src: string }[] }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  useEffect(() => () => audio.current?.pause(), []);
  const toggle = (src: string) => {
    if (playing === src) {
      audio.current?.pause();
      setPlaying(null);
      return;
    }
    audio.current?.pause();
    const el = new Audio(src);
    el.onended = () => setPlaying(null);
    audio.current = el;
    void el.play();
    setPlaying(src);
  };
  return (
    <div className="ch-bubble__links">
      {tracks.map((t) => (
        <button type="button" key={t.src} className="ch-bubble__track" aria-pressed={playing === t.src} onClick={() => toggle(t.src)}>
          {playing === t.src ? "❚❚" : "▶"} {t.label}
        </button>
      ))}
    </div>
  );
}

function CatHostInner({ device }: { device: Device }) {
  const reduced = usePrefersReducedMotion();
  /* Chinese when the visitor's system is in Chinese (see _kit/lang.ts). */
  const lang = useLang();
  const C = useMemo(() => copyFor(lang), [lang]);
  const APPS = C.apps;
  // so the browser picks Chinese glyphs (and screen readers the right voice)
  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  }, [lang]);
  const wide = useMedia("(min-width: 760px) and (min-height: 560px) and (orientation: landscape)");
  // the console lies on a desk by default; ?flat shows the old upright one (false on the server, read once in the browser)
  const desk = useSyncExternalStore(
    noSubscribe,
    () => !new URLSearchParams(window.location.search).has("flat"),
    () => false,
  );
  const [booted, setBooted] = useState(false);
  const openSheet = useOpenSheet();

  const engineRef = useRef<MascotEngine | null>(null);
  const [ready, setReady] = useState(false);
  /* She looks straight at you through the boot and the first 5 seconds after
     it (the hello), and only then starts following the cursor. */
  const bootedAtRef = useRef(0);
  const onEngine = useCallback((e: MascotEngine | null) => {
    engineRef.current = e;
    setReady(Boolean(e));
    if (e) e.holdGaze(bootedAtRef.current ? Math.max(0, bootedAtRef.current + 5000 - performance.now()) : Infinity);
  }, []);

  /* ---- sound: on by default, heard from the first tap or key (browsers need one) ---- */
  const [sound, setSound] = useState(true);
  const soundRef = useRef(true);
  useEffect(() => {
    const first = () => unlockAudio();
    document.addEventListener("pointerdown", first, { once: true, capture: true });
    document.addEventListener("keydown", first, { once: true, capture: true });
    return () => {
      document.removeEventListener("pointerdown", first, { capture: true });
      document.removeEventListener("keydown", first, { capture: true });
    };
  }, []);
  const toggleSound = useCallback(() => {
    const next = !soundRef.current;
    if (next) unlockAudio();
    soundRef.current = next;
    setSound(next);
  }, []);

  /* ---- state ---- */
  const [mode, setMode] = useState<Mode>("intro");
  const [selected, setSelected] = useState<ItemId | null>(null);
  const [hovered, setHovered] = useState<ItemId | null>(null);
  const [topic, setTopic] = useState<Topic>("background");
  /* The question you asked about the thing you're inspecting. */
  const [asked, setAsked] = useState<string | null>(null);
  /* A tap on empty space while she's answering pulls the camera back out; the
     answer keeps going, she just stops turning to things until the next question. */
  const [unfocused, setUnfocused] = useState(false);
  const [appIndex, setAppIndex] = useState(0);
  const [, setCardShown] = useState(false);
  const appIndexRef = useRef(0);
  /* Late at night (the visitor's own clock, 11pm to 6am) she's napping when you
     arrive; a pet wakes her. */
  const [mood, setMood] = useState<MascotMood>(() => {
    if (typeof window === "undefined") return "idle";
    const hour = new Date().getHours();
    return hour >= 23 || hour < 6 ? "sleep" : "idle";
  });
  /* Desk and wall, or the living room. */
  const [place, setPlace] = useState<Place>("studio");
  /* Cookies eaten this visit, and what the cat said about the last one. */
  const [eaten, setEaten] = useState(0);
  const [snackLines, setSnackLines] = useState(C.snackLines[0]);
  const eatenRef = useRef(0);
  /* Which of LOOKS she has on from the closet (-1: nothing). She keeps it on in the studio too. */
  const [look, setLook] = useState(-1);
  const lookRef = useRef(-1);
  const [page, setPage] = useState(0);
  /* Everything shows at once until something is typed: the hello reads on first paint. */
  const [n, setN] = useState(Infinity);
  const timers = useRef<number[]>([]);
  const cardTimer = useRef(0);

  const item = selected ? C.items[selected] : null;
  const questions = selected ? C.questions[selected] : undefined;
  const question = asked && questions ? questions[asked] : null;
  /* What plays on the console's screen for this question: its one video, or
     one of its short videos ("Next video" steps along). */
  const [clipIndex, setClipIndex] = useState(0);
  const clips = question?.videos;
  const clip = clips?.length ? clips[clipIndex % clips.length] : null;
  const videoSrc = clip?.src ?? question?.video ?? null;
  /* TikTok refuses some visitors ("embed request rejected": bots, some
     browsers) and its player then shows a bare "Server error". Its player says
     when it's ready; if that hasn't come 6 s in, a link out shows under it. */
  const [readySrc, setReadySrc] = useState<string | null>(null);
  const [slowSrc, setSlowSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!clip) return;
    const src = clip.src;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== "https://www.tiktok.com") return;
      let d: unknown = e.data;
      if (typeof d === "string") {
        try {
          d = JSON.parse(d);
        } catch {
          return;
        }
      }
      const m = d as { "x-tiktok-player"?: boolean; type?: string } | null;
      if (m?.["x-tiktok-player"] && (m.type === "onPlayerReady" || m.type === "onStateChange")) setReadySrc(src);
    };
    window.addEventListener("message", onMessage);
    const slow = window.setTimeout(() => setSlowSrc(src), 6000);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(slow);
    };
  }, [clip]);
  const clipStuck = Boolean(clip && slowSrc === clip.src && readySrc !== clip.src);
  const app = APPS[appIndex];

  /* What the bubble says, a page at a time. */
  const pages = useMemo<AnswerNode[]>(() => {
    if (mode === "topic") return C.answerPages(topic);
    if (mode === "app") return C.paginate([{ kind: "text", value: app.preview }]);
    if ((mode === "item" || mode === "desktop") && question) return C.paginate([{ kind: "text", value: question.say }]);
    if (mode === "desktop" && item) return [{ kind: "text", value: C.desktopLine }];
    // A cookie's lines read as one little speech, not a click per sentence.
    if (mode === "item" && item?.snack) return [{ kind: "text", value: C.join(snackLines) }];
    if (mode === "item" && item?.closet) return [{ kind: "text", value: C.looks[Math.max(0, look)].line }];
    if (mode === "item" && item) return item.topic ? C.answerPages(item.topic) : [{ kind: "text", value: item.body }];
    return [{ kind: "text", value: C.intro }];
  }, [mode, topic, item, app, snackLines, look, question, C]);
  const node = pages[Math.min(page, pages.length - 1)];
  const text = fix(nodeText(node));
  const done = n >= text.length;
  const last = page >= pages.length - 1;

  const stopTyping = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };
  useEffect(
    () => () => {
      stopTyping();
      window.clearTimeout(cardTimer.current);
    },
    [],
  );

  /** Type a line out on the Animalese timeline, so letters and blips stay in step. */
  const typeOut = useCallback(
    (value: string, quiet = false) => {
      stopTyping();
      if (reduced) {
        setN(Infinity);
        return;
      }
      setN(0);
      timers.current = timeline(value, 1.7).map((st) =>
        window.setTimeout(() => {
          setN(st.index + 1);
          if (soundRef.current && !quiet) playStep(st, VOICES.cat);
          // her mouth moves with each letter she says, sound on or off
          if (st.vowel) engineRef.current?.speak();
        }, 60 + st.at),
      );
    },
    [reduced],
  );

  /* From across the room the laptop shows its plain pixel screen, like the
     diploma does (her call: the tiny project picture was just confusing
     pixels); the project, with dots for browsing, comes on as you fly in. */
  const screenCanvas = useRef<{ laptop?: HTMLCanvasElement; diploma?: HTMLCanvasElement; resume?: HTMLCanvasElement; letter?: HTMLCanvasElement }>({});
  // From the moment the camera starts flying in, not when it lands: switching to
  // the sharp render and the real picture at the very end read as a jolt.
  const onLaptop = mode === "app" && selected === "laptop";
  const closeUp = mode === "item" && selected && CLOSE_UP.has(selected) ? selected : null;
  useEffect(() => {
    const eng = engineRef.current;
    if (!ready || !eng) return;
    let stale = false;
    const paint = (id: "laptop", on: boolean, app: ProjectRow | undefined, w: number, h: number, opts = {}) => {
      if (!on || !app) {
        eng.setScreen(id, null);
        return;
      }
      const c = (screenCanvas.current[id] ??= Object.assign(document.createElement("canvas"), { width: w, height: h }));
      void paintProjectScreen(c, app, { ...opts, stale: () => stale }).then(() => {
        if (!stale) eng.setScreen(id, c);
      });
    };
    paint("laptop", onLaptop, APPS[appIndex], 480, 300, { index: appIndex, count: APPS.length });
    // the diploma and the résumé page, sharp, only while you're looking at them
    for (const [id, w, h] of [["diploma", 570, 420], ["resume", 780, 1060], ["letter", 740, 500]] as const) {
      if (closeUp !== id) {
        eng.setScreen(id, null);
        continue;
      }
      const c = (screenCanvas.current[id] ??= Object.assign(document.createElement("canvas"), { width: w, height: h }));
      void paintPaper(c, id, () => stale, C.ui.letterCard).then((ok) => {
        if (ok && !stale) eng.setScreen(id, c);
      });
    }
    return () => {
      stale = true;
    };
  }, [ready, onLaptop, appIndex, closeUp, APPS, C]);

  /* The engine follows: camera eases toward the pick (right up to it when inspecting). */
  const close = mode === "item" || mode === "desktop" || mode === "app";
  /* While answering a question, the cat looks at what the current page is about. */
  const focus = mode === "topic" && !unfocused ? focusFor(text, topic) : null;
  const looking = selected ?? focus?.item ?? null;
  useEffect(() => {
    if (ready) engineRef.current?.select(looking, close);
  }, [ready, looking, close]);
  /* Dress-up: on as soon as you hover or pick the thing, so you see it before the
     camera zooms in (and away from her). */
  const near = (...ids: ItemId[]) => ids.some((id) => id === selected || id === hovered);
  const wearing = look >= 0 ? C.looks[look].wear : [];
  const capOn = (mode === "topic" && Boolean(focus?.cap)) || near("diploma") || wearing.includes("cap");
  useEffect(() => {
    if (ready) engineRef.current?.setCap(capOn);
  }, [ready, capOn]);
  /* Glasses on at the laptop, an apron for cookies, plus whatever the closet put on. */
  const glassesOn = mode === "desktop" || mode === "app" || focus?.item === "laptop" || near("laptop") || wearing.includes("glasses");
  const apronOn = mood === "eat" || near("cookies", "jar") || wearing.includes("apron");
  useEffect(() => {
    if (!ready) return;
    engineRef.current?.wear("glasses", glassesOn);
    engineRef.current?.wear("apron", apronOn);
    const extra = look >= 0 ? C.looks[look].wear : [];
    // The graduation cap sits where the beret does, so the cap wins while it's on.
    for (const o of DRESS_UP) engineRef.current?.wear(o, extra.includes(o) && !(o === "beret" && capOn));
  }, [ready, glassesOn, apronOn, look, capOn, C.looks]);
  const focusMood = mode === "topic" ? focus?.mood : undefined;

  const hideCard = useCallback(() => {
    window.clearTimeout(cardTimer.current);
    setCardShown(false);
  }, []);

  const pick = useCallback((id: ItemId | null) => {
    hideCard();
    setMood("idle");
    setAsked(null);
    setSelected(id);
    setMode(id ? "browse" : "intro");
    setPage(0);
    setN(Infinity);
    stopTyping();
  }, [hideCard]);

  const inspect = useCallback(
    (id: ItemId) => {
      const it = C.items[id];
      hideCard();
      setAsked(null);
      setSelected(id);
      setMode(it.desktop ? "app" : "item");
      setPage(0);
      setMood(it.mood ?? (it.plays ? "flute" : "idle"));
      if (it.plays && soundRef.current) TUNE.forEach((f, i) => window.setTimeout(() => playFlute(f, 0.28), 300 + i * 260));
      let line = it.desktop ? fix(nodeText(C.paginate([{ kind: "text", value: APPS[appIndexRef.current].preview }])[0])) : it.topic ? fix(nodeText(C.answerPages(it.topic)[0])) : it.body;
      if (it.snack) {
        const lines = C.snackMilestones[eatenRef.current + 1] ?? C.snackLines[eatenRef.current % C.snackLines.length];
        line = C.join(lines);
        eatenRef.current += 1;
        setEaten(eatenRef.current);
        setSnackLines(lines);
      }
      if (it.closet) {
        const next = (lookRef.current + 1) % C.looks.length;
        lookRef.current = next;
        setLook(next);
        line = C.looks[next].line;
      }
      typeOut(line);
      // Let the camera arrive, then show the graphic (or the laptop's desktop).
      cardTimer.current = window.setTimeout(() => setCardShown(true), reduced ? 0 : ZOOM_MS);
    },
    [typeOut, reduced, hideCard, APPS, C],
  );

  const ask = useCallback(
    (t: Topic) => {
      hideCard();
      setSelected(null);
      setAsked(null);
      setTopic(t);
      setUnfocused(false);
      setMode("topic");
      setPage(0);
      setMood("idle");
      typeOut(fix(nodeText(C.answerPages(t)[0])));
    },
    [typeOut, hideCard, C],
  );

  const askAbout = useCallback(
    (key: string, q: Question) => {
      setAsked(key);
      setPage(0);
      // no blips over a video: it has its own sound
      typeOut(fix(nodeText(C.paginate([{ kind: "text", value: q.say }])[0])), Boolean(q.video || q.videos));
    },
    [typeOut, C],
  );

  const showApp = useCallback(
    (i: number) => {
      appIndexRef.current = i;
      setAppIndex(i);
      setMode("app");
      setPage(0);
      const first = C.paginate([{ kind: "text", value: APPS[i].preview }])[0];
      typeOut(fix(nodeText(first)));
    },
    [typeOut, APPS, C],
  );

  const goTo = useCallback(
    (href: string | undefined) => {
      if (!href) openSheet("projects");
      else if (opensNewTab(href)) window.open(href, "_blank", "noreferrer");
      else window.location.href = href;
    },
    [openSheet],
  );

  /* Opening a project dives into it, like stepping into the screen: the whole
     stage zooms toward the console's screen and fades, then the page changes.
     (A project that opens in a new tab just opens; so does reduced motion.) */
  const stageRef = useRef<HTMLDivElement>(null);
  const [diving, setDiving] = useState(false);
  const dive = useCallback(
    (href: string | undefined) => {
      const stage = stageRef.current;
      const scr = stage?.querySelector(".hh-screen");
      if (!href || reduced || opensNewTab(href) || !stage || !scr) {
        goTo(href);
        return;
      }
      const sr = stage.getBoundingClientRect();
      const r = scr.getBoundingClientRect();
      stage.style.setProperty("--dive-x", `${r.left + r.width / 2 - sr.left}px`);
      stage.style.setProperty("--dive-y", `${r.top + r.height / 2 - sr.top}px`);
      setDiving(true);
      window.setTimeout(() => goTo(href), 650);
    },
    [reduced, goTo],
  );
  // coming back with the browser's Back button: the page may be restored as it was
  useEffect(() => {
    const back = () => setDiving(false);
    window.addEventListener("pageshow", back);
    return () => window.removeEventListener("pageshow", back);
  }, []);

  /* RPG choices: the questions, in their own little window under the dialogue. */
  /* Inspecting something that has its own questions (the flute, the laptop, the iPad). */
  const holding = (mode === "item" || mode === "desktop") && Boolean(questions);
  /* At the closet the one choice is the next outfit. */
  const dressing = mode === "item" && selected === "closet";
  /* Looking at a project on the laptop: its actions are your choices. */
  const atProject = mode === "app";
  /* The thing's own links (open the résumé, write to me, the socials, a
     question's video) are your choices too, not buttons in her bubble. */
  const extras = question ?? (mode === "item" ? item : null);
  /* Each choice is a question about the thing in hand, one of the hello's topics,
     or somewhere to go. `main` is the one you most likely came for: highlighted,
     and where the pointer starts. */
  type Option = { key: string; label: string; topic?: Topic; href?: string; main?: boolean };
  const options = useMemo<Option[]>(() => {
    if (atProject)
      return [
        // so the laptop never feels stuck on one project (the D-pad does this too)
        { key: "next", label: C.ui.nextProject },
        ...(app.href ? [{ key: "open", label: C.ui.open(app.name), main: true }] : []),
        { key: "details", label: C.ui.details },
        { key: "all", label: C.ui.allProjects },
      ];
    if (dressing) return [{ key: "look", label: C.ui.anotherLook }];
    const go: Option[] = [
      ...(extras?.open ? [{ key: "open", label: extras.open.label, href: extras.open.href, main: true }] : []),
      ...(extras?.links ?? []).map((l, i) => {
        const mail = l.href.startsWith("mailto:");
        return { key: `link${i}`, label: mail ? C.ui.emailMe : l.label, href: l.href, main: mail && !extras?.open };
      }),
    ];
    if (holding && questions)
      return [
        // a question that plays videos comes first and is the default: on the
        // social media poster that's what you came for, not leaving for TikTok
        ...Object.entries(questions)
          .filter(([k, q]) => k !== asked && q.videos)
          .map(([k, q]) => ({ key: k, label: q.ask, main: true })),
        ...go,
        ...Object.entries(questions)
          .filter(([k, q]) => k !== asked && !q.videos)
          .map(([k, q]) => ({ key: k, label: q.ask })),
      ];
    if (mode === "item") return go;
    return TOPICS.filter((t) => !(mode === "topic" && t === topic)).map((t) => ({ key: t, label: C.topicAsk[t], topic: t }));
  }, [atProject, app, dressing, extras, holding, questions, asked, mode, topic, C]);
  const showChoices =
    done && last && (mode === "intro" || mode === "topic" || holding || dressing || atProject || (mode === "item" && options.length > 0));
  const choose = useCallback(
    (o: Option) => {
      if (atProject) {
        if (o.key === "open") dive(app.href);
        else if (o.key === "next") showApp((appIndexRef.current + 1) % APPS.length);
        else goTo(o.key === "details" ? detailsHref(app) : "/projects");
      } else if (o.href) goTo(o.href);
      else if (o.key === "look" && dressing) inspect("closet");
      else if (o.topic) ask(o.topic);
      else if (questions?.[o.key]) askAbout(o.key, questions[o.key]);
    },
    [ask, askAbout, questions, dressing, inspect, atProject, app, dive, goTo, showApp, APPS.length],
  );
  const [choice, setChoice] = useState(0);
  const cursor = Math.min(choice, options.length - 1);
  /* The pointer starts on the main choice (on a project that's "Open", even
     though "Next project" sits above it), fresh for each thing and question. */
  const recIndex = Math.max(0, options.findIndex((o) => o.main));
  const choiceKey = `${mode}:${selected}:${asked}:${app.slug}`;
  const [prevRec, setPrevRec] = useState(choiceKey);
  if (prevRec !== choiceKey) {
    setPrevRec(choiceKey);
    setChoice(recIndex);
  }

  /* ---- the buttons ---- */
  const a = useCallback(() => {
    if (!done) {
      stopTyping();
      setN(Infinity);
      return;
    }
    if (!last) {
      setPage(page + 1);
      typeOut(fix(nodeText(pages[page + 1])), Boolean(videoSrc));
      return;
    }
    // with questions up, ✕ asks the highlighted one (what the guide says it does)
    if ((mode === "intro" || mode === "topic") && showChoices && options[cursor]) choose(options[cursor]);
    else if (mode === "intro" || mode === "topic") pick(DESK[0]);
    else if (mode === "browse" && selected) inspect(selected);
    // a video playing: ✕ stays out of it (tap a choice to leave for a link)
    else if (mode === "item" && videoSrc) return;
    else if (mode === "item" && options[cursor]) choose(options[cursor]);
    else if (mode === "desktop") showApp(appIndex);
    else if (mode === "app" && options[cursor]) choose(options[cursor]);
  }, [done, last, page, pages, mode, selected, options, cursor, choose, appIndex, pick, inspect, showApp, typeOut, videoSrc, showChoices]);

  const b = useCallback(() => {
    // Back zooms all the way out to the whole room (from a project on the
    // laptop too), so the view never stays parked on the thing; the D-pad
    // still remembers where you were.
    pick(null);
  }, [pick]);

  const step = useCallback(
    (d: number) => {
      if (mode === "desktop" || mode === "app") {
        showApp((appIndexRef.current + d + APPS.length) % APPS.length);
        return;
      }
      // watching her short videos: left and right go through them
      if (mode === "item" && clips && clips.length > 1) {
        setClipIndex((i) => (i + d + clips.length) % clips.length);
        return;
      }
      // Nothing picked (the whole room, or after Back): always start from the cat,
      // never from wherever you were before (her call: left must mean "the thing
      // left of the cat" every time).
      const at = selected;
      const row = place === "room" ? ROOM : at && WALL.includes(at) ? WALL : DESK;
      const i = at ? row.indexOf(at) : -1;
      /* Nothing picked yet: start from the cat, so left takes the nearest thing on
       * her left (the notebook) and right the nearest on her right (the flute). */
      if (i < 0) {
        if (place === "room") pick(row[Math.floor(row.length / 2) - (d < 0 ? 1 : 0)]);
        else pick(d < 0 ? "book" : "flute");
        return;
      }
      // the ends of a row are the ends: no wrapping round to the other side
      const next = i + d;
      if (next >= 0 && next < row.length) pick(row[next]);
    },
    [mode, selected, pick, place, showApp, APPS.length, clips],
  );

  const row = useCallback(
    (to: ItemId[]) => {
      if (mode === "desktop" || mode === "app") return;
      // from the cat (nothing picked): the middle of the row you're moving to
      const at = selected;
      if (!at) return pick(to[Math.floor(to.length / 2)]);
      const from = WALL.includes(at) ? WALL : DESK;
      const i = from.includes(at) ? from.indexOf(at) : 0;
      pick(to[Math.min(Math.round((i / Math.max(1, from.length - 1)) * (to.length - 1)), to.length - 1)]);
    },
    [mode, selected, pick],
  );

  /* Down from the front of the desk goes to the living room; up from there comes back. */
  const moveTo = useCallback(
    (to: Place) => {
      pick(null);
      setPlace(to);
    },
    [pick],
  );

  /* The D-pad always looks around; questions are tapped, or 1 2 3 on a keyboard. */
  const wakeTimer = useRef(0);
  const petCat = useCallback(() => {
    engineRef.current?.react();
    // Asleep, the pet startles her awake (the engine picks that); then she's up.
    if (mood === "sleep" && mode !== "item") {
      window.clearTimeout(wakeTimer.current);
      wakeTimer.current = window.setTimeout(() => setMood("idle"), 700);
    }
  }, [mood, mode]);
  useEffect(() => () => window.clearTimeout(wakeTimer.current), []);

  /* Wide screens: once the console has booted, the hologram comes on and the cat
     greets you like a game opening: a happy face, then the hello types itself out. */
  const greetTimer = useRef(0);
  const onBooted = useCallback(() => {
    setBooted(true);
    bootedAtRef.current = performance.now();
    engineRef.current?.holdGaze(5000);
    // a game opening: she waves hello, then says it
    engineRef.current?.wave(2.6);
    if (mode !== "intro" || reduced) return;
    // the bubble comes on empty, then she says hello
    setN(0);
    window.clearTimeout(greetTimer.current);
    greetTimer.current = window.setTimeout(() => typeOut(C.intro), 650);
  }, [mode, typeOut, reduced, C.intro]);
  useEffect(() => () => window.clearTimeout(greetTimer.current), []);

  const pad: Pad = {
    // Up and down go between rows: the wall, the desk, then the living room.
    up: () => {
      if (place === "room") return moveTo("studio");
      if (!selected || !WALL.includes(selected)) row(WALL);
    },
    down: () => {
      if (place === "room") return;
      if (!selected || WALL.includes(selected)) return row(DESK);
      moveTo("room");
    },
    left: () => step(-1),
    right: () => step(1),
    a,
    b,
    pet: petCat,
    home: () => (place === "room" ? moveTo("studio") : pick(null)),
  };
  const padRef = useRef(pad);
  const choicesRef = useRef({ open: showChoices, options, choose });
  useEffect(() => {
    padRef.current = pad;
    choicesRef.current = { open: showChoices, options, choose };
  });

  /* Keyboard: WASD or arrows to look around, Enter or Space to inspect, Esc to go back. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.querySelector("dialog[open]")) return;
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      const onControl = el && (el.tagName === "BUTTON" || el.tagName === "A");
      const p = padRef.current;
      const map: Record<string, () => void> = {
        ArrowUp: p.up, w: p.up, W: p.up,
        ArrowDown: p.down, s: p.down, S: p.down,
        ArrowLeft: p.left, a: p.left, A: p.left,
        ArrowRight: p.right, d: p.right, D: p.right,
        Escape: p.b, m: toggleSound, M: toggleSound,
        p: p.pet, P: p.pet,
      };
      // 1 2 3: ask the questions in the reply bubble.
      const q = choicesRef.current;
      if (q.open && /^[1-9]$/.test(e.key) && q.options[Number(e.key) - 1]) {
        e.preventDefault();
        q.choose(q.options[Number(e.key) - 1]);
        return;
      }
      if (!onControl) {
        map.Enter = p.a;
        map[" "] = p.a;
      }
      const fn = map[e.key];
      if (fn) {
        e.preventDefault();
        fn();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleSound]);

  /* ---- the name tag follows the thing as the camera moves ---- */
  const tagRef = useRef<HTMLSpanElement>(null);
  const tagId: ItemId | null = close ? null : (hovered ?? looking);
  useEffect(() => {
    if (!ready || !tagId) return;
    let raf = 0;
    const tick = () => {
      const p = engineRef.current?.anchor(tagId);
      const el = tagRef.current;
      if (p && el) {
        el.style.left = `${p.x * 100}%`;
        el.style.top = `${p.y * 100}%`;
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [ready, tagId]);

  const onSceneTap = useCallback(
    (x: number, y: number) => {
      // Zoomed in: a tap anywhere on the screen zooms back out, so it never feels locked.
      if (close) {
        b();
        return;
      }
      // A tap on the cat herself is a pet.
      if (engineRef.current?.hitCharacter(x, y)) {
        petCat();
        return;
      }
      const id = engineRef.current?.pick(x, y) as ItemId | null | undefined;
      if (id) {
        inspect(id);
      }
      // A tap on nothing while looking at something steps back to the whole room.
      else if (mode === "browse") pick(null);
      else if (mode === "topic") setUnfocused(true);
    },
    [inspect, close, b, mode, pick, petCat],
  );
  const onSceneHover = useCallback((x: number, y: number) => {
    const id = x < 0 ? null : ((engineRef.current?.pick(x, y) as ItemId | null | undefined) ?? null);
    engineRef.current?.hover(id);
    setHovered((h) => (h === id ? h : id));
  }, []);

  /* The controls under the console, drawn like a game's button prompts: a key
     cap then the verb, only the ones that work right now. */

  /* ---- drawn over the scene ---- */
  /* The button guide in the screen's corner (like a game's "✕ Select ○ Back"):
     only the buttons that do something right now. It fades in when they
     change and out again after a few seconds, so it never sits in the way. */
  /* Worked out from what each button really does right now (a()/b()/step()),
     so a hint never promises something the button doesn't do. ✕ on a list of
     choices takes the highlighted one, so its verb says where that goes: a
     question is Ask, a PDF is Open PDF, mail is Email, another site is Visit,
     a page on this site is Go. While a video plays ✕ does nothing (her call:
     Back, and Next video for the short ones, are all you need there). */
  const watching = mode === "item" && Boolean(videoSrc);
  const verbFor = (o: Option): string => {
    if (o.topic || questions?.[o.key]) return "Ask";
    if (o.key === "next") return "Next project";
    if (o.key === "look") return "Try it on";
    if (o.key === "details") return "Details";
    if (o.key === "all") return "All projects";
    const href = o.href ?? (o.key === "open" ? app.href : undefined);
    if (!href) return "Open";
    if (href.startsWith("mailto:")) return "Email";
    if (/\.pdf($|[?#])/i.test(href)) return "Open PDF";
    if (/^https?:/.test(href)) return "Visit";
    return "Go";
  };
  const chosen = showChoices && !watching ? options[cursor] : undefined;
  const crsVerb = chosen ? verbFor(chosen) : null;
  const guide: GuideHint[] = [];
  if (booted) {
    if (!done) guide.push(["crs", "Skip"]);
    else if (!last) guide.push(["crs", "Next"]);
    else if (mode === "intro" || mode === "topic") {
      guide.push(["pad", "Look"]);
      if (crsVerb) guide.push(["crs", crsVerb]);
      guide.push(["tri", "Pet"]);
      if (mode === "topic") guide.push(["cir", "Back"]);
    } else if (mode === "browse") guide.push(["pad", "Move"], ["crs", "Zoom in"], ["cir", "Back"]);
    else if (mode === "item") {
      if (watching) {
        if (clips && clips.length > 1) guide.push(["pad", "Next video"]);
      } else {
        guide.push(["pad", "Move"]);
        if (crsVerb) guide.push(["crs", crsVerb]);
      }
      guide.push(["cir", "Back"]);
    } else if (mode === "desktop") guide.push(["pad", "Browse"], ["crs", "Open"], ["cir", "Back"]);
    else {
      guide.push(["pad", "Browse"]);
      if (crsVerb) guide.push(["crs", crsVerb]);
      guide.push(["cir", "Back"]);
    }
    if (place === "room") guide.push(["sqr", "Desk"]);
  }
  const guideKey = guide.map((g) => g.join(" ")).join(" · ");
  const [guideOn, setGuideOn] = useState(false);
  useEffect(() => {
    if (!guideKey) return;
    const show = window.setTimeout(() => setGuideOn(true), 0);
    // zoomed in on something, it stays, so the way back is always there
    const hide = window.setTimeout(() => setGuideOn(false), 4500);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [guideKey]);

  const overlay = (
    <>
      {/* A question with a video plays it right on the console's screen; Back closes it. */}
      {videoSrc && question ? (
        <iframe
          key={`video:${videoSrc}`}
          className="hh-video"
          src={videoSrc}
          title={clip?.title ?? question.ask}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      ) : null}
      {clipStuck && clip?.href ? (
        <a className="hh-clip-out" href={clip.href} target="_blank" rel="noreferrer">
          {C.ui.watchOnTikTok}
        </a>
      ) : null}
      {/* TikTok's player shows no numbers, so the console does (as of COUNTS_ON). */}
      {clip ? (
        <span key={`clip:${clip.src}`} className="hh-clip" aria-label={`${clip.title}: ${clip.likes} likes, ${clip.plays} plays`}>
          <b>{clip.title}</b>
          <span>♥ {C.count(clip.likes)}</span>
          <span>▶ {C.count(clip.plays)}</span>
        </span>
      ) : null}
      {tagId ? (
        <span ref={tagRef} className="hh-tag" aria-hidden="true">
          {C.items[tagId].name}
        </span>
      ) : null}


      {/* Only when you're at the table, not while looking up at the wall. */}
      {!close && !(selected && WALL.includes(selected)) ? (
        <button
          type="button"
          className={`hh-exit hh-exit--${place === "room" ? "up" : "down"}`}
          onClick={() => moveTo(place === "room" ? "studio" : "room")}
          aria-label={place === "room" ? "Back to the desk" : "Go to the living room"}
          title={place === "room" ? "Back to the desk" : "To the living room"}
        >
          <ExitArrow />
        </button>
      ) : null}
      {/* Leaning in on a thing (browse) counts as zoomed too: the way back stays shown. */}
      {guide.length ? <ButtonGuide hints={guide.map(([k, v]) => [k, C.ui.guide[v] ?? v])} on={guideOn || close || mode === "browse"} /> : null}
      {eaten > 0 ? (
        <span className="hh-count" role="img" aria-label={`${eaten} cookies eaten`} title="Cookies the cat has eaten">
          <CookieIcon />×{eaten}
        </span>
      ) : null}

    </>
  );

  return (
    <>
      {/* On wide screens the bubbles are a hologram that comes on after the console boots. */}
      <div ref={stageRef} className={`ch-stage${booted ? " is-booted" : ""}${desk ? " is-desk" : ""}${diving ? " is-diving" : ""}`}>
        <Console
          device={device}
          sceneAspect={device === "psp" && wide ? 16 / 9 : 4 / 3}
          // sharper while you read a screen up close; the PS1 crunch everywhere else
          pixelHeight={onLaptop || closeUp ? 540 : device === "psp" ? 300 : 200}
          mood={focusMood ?? mood}
          scene={place}
          onEngine={onEngine}
          onSceneTap={onSceneTap}
          onSceneHover={onSceneHover}
          overlay={overlay}
          pad={pad}
          talking={!done}
          onBooted={onBooted}
        />

        {/* Both bubbles; a plain pass-through box, except in the ?desk prototype,
            where it becomes a hologram standing on the desk. */}
        <div className="ch-holo">
        {/* What the cat says comes out of the speaker, into this bubble. */}
        {/* Tapping the bubble is a shortcut for A; keyboard users have the device buttons and keys. */}
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <div
          className="ch-bubble"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a,button")) return;
            if (!done || !last) a();
          }}
        >
          <span className="ch-bubble__name">HAYLIE</span>
          <button
            type="button"
            className={`ch-bubble__voice${sound ? " is-on" : ""}`}
            onClick={toggleSound}
            aria-pressed={sound}
            aria-label={sound ? C.ui.mute : C.ui.unmute}
            title={`${sound ? C.ui.mute : C.ui.unmute} (M)`}
          >
            <SpeakerIcon on={sound} />
          </button>
          <div className="ch-bubble__text" aria-live="polite">
            {mode === "item" && item ? <b className="ch-bubble__title">{item.name}</b> : null}
            {mode === "app" ? (
              <b className="ch-bubble__title">
                {app.name} <small>{`${app.year} · ${app.status}`}</small>
              </b>
            ) : null}
            {mode === "intro" || mode === "browse" ? <h1>{C.intro.slice(0, n)}</h1> : <p><NodeBody node={node} n={n} /></p>}
          </div>
          {done && last && mode === "app" && app.audio?.length ? <Tracks tracks={app.audio} /> : null}
          {done && last && mode === "desktop" && !question ? (
            <button type="button" className="ch-bubble__go" onClick={() => goTo("/projects")}>
              {C.ui.seeAll}
            </button>
          ) : null}
          {done && !last ? (
            <button type="button" className="ch-bubble__next" onClick={a} aria-label={C.ui.next}>
              ▼
            </button>
          ) : null}
        </div>

        {/* The visitor's side of the conversation: a reply bubble from the other
            direction. Only while there's something to pick: once you've asked,
            it gets out of the way so her answer has the room. */}
        {showChoices ? (
          <div className="ch-you">
            <span className="ch-you__name">YOU</span>
            <div className={`ch-you__choices${options.length > 4 ? " is-many" : ""}`} role="group" aria-label={C.ui.askMe}>
              {options.map((o, i) => (
                <button
                  type="button"
                  key={o.key}
                  className={o.main ? "is-main" : o.href ? "is-go" : undefined}
                  // no highlight while a video plays: ✕ doesn't pick then
                  data-cursor={(!watching && cursor === i) || undefined}
                  onPointerEnter={() => setChoice(i)}
                  onFocus={() => setChoice(i)}
                  onClick={() => choose(o)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        </div>

        {/* The same things as plain buttons, for screen readers and anyone who prefers a list. */}
        <ul className="sr-only" aria-label={C.ui.things}>
          {(place === "room" ? ROOM : [...WALL, ...DESK]).map((id) => (
            <li key={id}>
              <button type="button" onClick={() => inspect(id)}>
                {C.items[id].name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

const noSubscribe = () => () => {};

export default function CatHost({ device = "psp" }: { device?: Device }) {
  return (
    <main className={`lab ch ch--${device}`}>
      <SheetHost>
        <CatHostInner device={device} />
      </SheetHost>
    </main>
  );
}
