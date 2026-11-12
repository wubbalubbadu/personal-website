"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import "../_kit/kit.css";
import "./cat-host.css";
import "./handheld.css";
import { SheetHost, useOpenSheet } from "../_kit/Sheets";
import { opensNewTab, PROJECT_ROWS, type ProjectRow } from "../_kit/links";
import { playFlute } from "../_kit/fluteTone";
import { useMedia, usePrefersReducedMotion } from "../_kit/hooks";
import { INTENTS, type AnswerNode, type RichSeg } from "../../lib/answers";
import { playStep, timeline, unlockAudio, VOICES, type MascotEngine, type MascotMood, type Outfit } from "../../components/ps1-mascot";
import { Console, type Device, type Pad } from "./Handheld";
import { paintPaper, paintProjectScreen } from "./ItemArt";
import { DESK, DESK_DOWN, DESK_UP, DESKTOP_LINE, ITEMS, LOOKS, QUESTIONS, ROOM, SNACK_LINES, SNACK_MILESTONES, TUNE, WALL, type ItemId, type Question } from "../_kit/studio";

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

/** The laptop browses the main projects, one at a time; the music and the
 *  OpenMusic patches live only on the projects page ("See all projects"). */
const APPS: ProjectRow[] = PROJECT_ROWS.filter((p) => p.slug !== "music-playground" && p.slug !== "openmusic");

/* ---- questions you can ask, answered from app/lib/answers.ts ---- */

const TOPICS = ["background", "flute", "projects"] as const;
type Topic = (typeof TOPICS)[number];
/** How each question reads here. The background answer is all software, so it says so;
 *  otherwise someone curious about her flute background would pick it and be confused. */
const TOPIC_ASK: Record<Topic, string> = {
  background: "Tell me about your software background.",
  flute: INTENTS.flute.ask,
  projects: INTENTS.projects.ask,
};

/** The live answers point at a side panel this page doesn't have. */
const FIXES: [string, string][] = [
  [" The full list is on the right, open any of them.", ""],
];
const fix = (t: string) => FIXES.reduce((s, [a, b]) => s.replace(a, b), t);

const INTENT_HREF: Record<string, string> = {
  resume: "/haylie-wu-resume.pdf",
  "learning-log": "/learning-log",
  "cookie-flute-studio": "/flute-studio",
};

const nodeText = (n: AnswerNode) =>
  n.kind === "text" ? n.value : n.kind === "rich" ? n.segments.map((s) => s.text).join("") : "";

/**
 * While the cat talks, it turns to what it's talking about: education looks at
 * the diploma (cap on), work looks at the résumé, things built at the laptop,
 * flute and audience at the flute. Flute answers check flute words first.
 */
type Focus = { item: ItemId; cap?: boolean; mood?: MascotMood };
const FOCUS_RULES: [RegExp, Focus][] = [
  [/MathWorks|startup|NetLogo|Connected Learning|internship/i, { item: "resume" }],
  [/degree|Northwestern|Conservatory|undergrad|master's/i, { item: "diploma", cap: true }],
  [/MathWorks|startup|backend|résumé|NetLogo|research|internship|codebase|software|load time|migration/i, { item: "resume" }],
  [/built|building|project|Cookie Flute Studio|Learning Log|marketplace|shipped/i, { item: "laptop" }],
  [/flute|competition|followers|audience|repertoire|classical/i, { item: "flute", mood: "flute" }],
];
function focusFor(text: string, topic: string): Focus | null {
  const rules = topic === "flute" ? [...FOCUS_RULES.slice(4), ...FOCUS_RULES.slice(0, 4)] : FOCUS_RULES;
  for (const [re, f] of rules) if (re.test(text)) return f;
  return null;
}

/** Long paragraphs split at sentences so each page fits the bubble. */
const PAGE_CHARS = 330;
/** A last page shorter than this joins the one before, so there's no lone sentence to click through. */
const MIN_PAGE = 110;
function paginate(nodes: AnswerNode[]): AnswerNode[] {
  return nodes.flatMap((node) => {
    if (node.kind !== "text" || fix(node.value).length <= PAGE_CHARS) return [node];
    const sentences = fix(node.value).match(/[^.!?]+[.!?]+\s*/g) ?? [node.value];
    const out: string[] = [];
    for (const s of sentences) {
      const prev = out[out.length - 1];
      if (prev !== undefined && (prev + s).length <= PAGE_CHARS) out[out.length - 1] = prev + s;
      else out.push(s);
    }
    const tail = out[out.length - 1];
    if (out.length > 1 && tail.trim().length < MIN_PAGE) out[out.length - 2] += out.pop();
    return out.map((value) => ({ kind: "text" as const, value: value.trim() }));
  });
}

/** A scripted answer ready for the bubble: no link lists, no music résumé
 * (Haylie doesn't want it online), long paragraphs paged. */
function answerPages(topic: "flute" | "background" | "projects"): AnswerNode[] {
  const nodes = INTENTS[topic].answer
    .filter((x) => x.kind !== "linkList")
    .map((x) =>
      x.kind === "rich" ? { ...x, segments: x.segments.filter((g) => !("href" in g && g.href.includes("music-resume"))) } : x,
    );
  return foldShort(paginate(nodes));
}

/** A short paragraph rides along with the page before it instead of getting a click of its own. */
function foldShort(nodes: AnswerNode[]): AnswerNode[] {
  const segs = (n: AnswerNode): RichSeg[] => (n.kind === "text" ? [{ text: n.value }] : n.kind === "rich" ? n.segments : []);
  return nodes.reduce<AnswerNode[]>((out, node) => {
    const prev = out[out.length - 1];
    if (prev && nodeText(node).length < MIN_PAGE && nodeText(prev).length + nodeText(node).length <= PAGE_CHARS + MIN_PAGE) {
      out[out.length - 1] = { kind: "rich", segments: [...segs(prev), { text: " " }, ...segs(node)] };
    } else out.push(node);
    return out;
  }, []);
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

/* Who she is first (flutist and software engineer), then what she does, then the schools. */
const INTRO =
  "Hi, I'm Haylie Wu! I'm a flutist and software engineer. I perform, teach, and build software for musicians. I studied computer science and flute at Northwestern, and I'm completing my master's in flute performance at New England Conservatory.";
/** Each app's bubble is a preview; /projects has the whole write-up. */
const appLine = (p: ProjectRow) => p.preview;
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
  /* Where the D-pad was, so backing out to the whole room keeps your place. */
  const lastRef = useRef<ItemId | null>(null);
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
  const [snackLines, setSnackLines] = useState(SNACK_LINES[0]);
  const eatenRef = useRef(0);
  /* Which of LOOKS she has on from the closet (-1: nothing). She keeps it on in the studio too. */
  const [look, setLook] = useState(-1);
  const lookRef = useRef(-1);
  const [page, setPage] = useState(0);
  /* Everything shows at once until something is typed: the hello reads on first paint. */
  const [n, setN] = useState(Infinity);
  const timers = useRef<number[]>([]);
  const cardTimer = useRef(0);

  const item = selected ? ITEMS[selected] : null;
  const questions = selected ? QUESTIONS[selected] : undefined;
  const question = asked && questions ? questions[asked] : null;
  const app = APPS[appIndex];

  /* What the bubble says, a page at a time. */
  const pages = useMemo<AnswerNode[]>(() => {
    if (mode === "topic") return answerPages(topic);
    if (mode === "app") return paginate([{ kind: "text", value: appLine(app) }]);
    if ((mode === "item" || mode === "desktop") && question) return paginate([{ kind: "text", value: question.say }]);
    if (mode === "desktop" && item) return [{ kind: "text", value: DESKTOP_LINE }];
    // A cookie's lines read as one little speech, not a click per sentence.
    if (mode === "item" && item?.snack) return [{ kind: "text", value: snackLines.join(" ") }];
    if (mode === "item" && item?.closet) return [{ kind: "text", value: LOOKS[Math.max(0, look)].line }];
    if (mode === "item" && item) return item.topic ? answerPages(item.topic) : [{ kind: "text", value: item.body }];
    return [{ kind: "text", value: INTRO }];
  }, [mode, topic, item, app, snackLines, look, question]);
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
    (value: string) => {
      stopTyping();
      if (reduced) {
        setN(Infinity);
        return;
      }
      setN(0);
      timers.current = timeline(value, 1.7).map((st) =>
        window.setTimeout(() => {
          setN(st.index + 1);
          if (soundRef.current) playStep(st, VOICES.cat);
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
      void paintPaper(c, id, () => stale).then((ok) => {
        if (ok && !stale) eng.setScreen(id, c);
      });
    }
    return () => {
      stale = true;
    };
  }, [ready, onLaptop, appIndex, closeUp]);

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
  const wearing = look >= 0 ? LOOKS[look].wear : [];
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
    const extra = look >= 0 ? LOOKS[look].wear : [];
    // The graduation cap sits where the beret does, so the cap wins while it's on.
    for (const o of DRESS_UP) engineRef.current?.wear(o, extra.includes(o) && !(o === "beret" && capOn));
  }, [ready, glassesOn, apronOn, look, capOn]);
  const focusMood = mode === "topic" ? focus?.mood : undefined;

  const hideCard = useCallback(() => {
    window.clearTimeout(cardTimer.current);
    setCardShown(false);
  }, []);

  const pick = useCallback((id: ItemId | null) => {
    hideCard();
    setMood("idle");
    setAsked(null);
    if (id) lastRef.current = id;
    setSelected(id);
    setMode(id ? "browse" : "intro");
    setPage(0);
    setN(Infinity);
    stopTyping();
  }, [hideCard]);

  const inspect = useCallback(
    (id: ItemId) => {
      const it = ITEMS[id];
      hideCard();
      setAsked(null);
      lastRef.current = id;
      setSelected(id);
      setMode(it.desktop ? "app" : "item");
      setPage(0);
      setMood(it.mood ?? (it.plays ? "flute" : "idle"));
      if (it.plays && soundRef.current) TUNE.forEach((f, i) => window.setTimeout(() => playFlute(f, 0.28), 300 + i * 260));
      let line = it.desktop ? fix(nodeText(paginate([{ kind: "text", value: appLine(APPS[appIndexRef.current]) }])[0])) : it.topic ? fix(nodeText(answerPages(it.topic)[0])) : it.body;
      if (it.snack) {
        const lines = SNACK_MILESTONES[eatenRef.current + 1] ?? SNACK_LINES[eatenRef.current % SNACK_LINES.length];
        line = lines.join(" ");
        eatenRef.current += 1;
        setEaten(eatenRef.current);
        setSnackLines(lines);
      }
      if (it.closet) {
        const next = (lookRef.current + 1) % LOOKS.length;
        lookRef.current = next;
        setLook(next);
        line = LOOKS[next].line;
      }
      typeOut(line);
      // Let the camera arrive, then show the graphic (or the laptop's desktop).
      cardTimer.current = window.setTimeout(() => setCardShown(true), reduced ? 0 : ZOOM_MS);
    },
    [typeOut, reduced, hideCard],
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
      typeOut(fix(nodeText(answerPages(t)[0])));
    },
    [typeOut, hideCard],
  );

  const askAbout = useCallback(
    (key: string, q: Question) => {
      setAsked(key);
      setPage(0);
      typeOut(fix(nodeText(paginate([{ kind: "text", value: q.say }])[0])));
    },
    [typeOut],
  );

  const showApp = useCallback(
    (i: number) => {
      appIndexRef.current = i;
      setAppIndex(i);
      setMode("app");
      setPage(0);
      const first = paginate([{ kind: "text", value: appLine(APPS[i]) }])[0];
      typeOut(fix(nodeText(first)));
    },
    [typeOut],
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
        { key: "next", label: "Next project" },
        ...(app.href ? [{ key: "open", label: `Open ${app.name}`, main: true }] : []),
        { key: "details", label: "Full details" },
        { key: "all", label: "See all projects" },
      ];
    if (dressing) return [{ key: "look", label: "Try another look?" }];
    const go: Option[] = [
      ...(extras?.open ? [{ key: "open", label: extras.open.label, href: extras.open.href, main: true }] : []),
      ...(extras?.links ?? []).map((l, i) => {
        const mail = l.href.startsWith("mailto:");
        return { key: `link${i}`, label: mail ? "Email me" : l.label, href: l.href, main: mail && !extras?.open };
      }),
    ];
    if (holding && questions)
      return [
        ...go,
        ...Object.entries(questions)
          .filter(([k]) => k !== asked)
          .map(([k, q]) => ({ key: k, label: q.ask })),
      ];
    if (mode === "item") return go;
    return TOPICS.filter((t) => !(mode === "topic" && t === topic)).map((t) => ({ key: t, label: TOPIC_ASK[t], topic: t }));
  }, [atProject, app, dressing, extras, holding, questions, asked, mode, topic]);
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
    [ask, askAbout, questions, dressing, inspect, atProject, app, dive, goTo, showApp],
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
      typeOut(fix(nodeText(pages[page + 1])));
      return;
    }
    if (mode === "intro" || mode === "topic") pick(DESK[0]);
    else if (mode === "browse" && selected) inspect(selected);
    else if (mode === "item" && options[cursor]) choose(options[cursor]);
    else if (mode === "desktop") showApp(appIndex);
    else if (mode === "app" && options[cursor]) choose(options[cursor]);
  }, [done, last, page, pages, mode, selected, options, cursor, choose, appIndex, pick, inspect, showApp, typeOut]);

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
      const at = selected ?? lastRef.current;
      const row = place === "room" ? ROOM : at && WALL.includes(at) ? WALL : DESK;
      const i = at ? row.indexOf(at) : -1;
      /* Nothing picked yet: start from the middle, where the cat is, so A takes the
       * nearest thing on her left and D the nearest on her right. */
      const mid = Math.floor(row.length / 2);
      pick(i < 0 ? row[d < 0 ? mid - 1 : mid] : row[(i + d + row.length) % row.length]);
    },
    [mode, selected, pick, place, showApp],
  );

  const row = useCallback(
    (to: ItemId[]) => {
      if (mode === "desktop" || mode === "app") return;
      const at = selected ?? lastRef.current;
      const from = at && WALL.includes(at) ? WALL : DESK;
      const i = at && from.includes(at) ? from.indexOf(at) : 0;
      pick(to[Math.min(Math.round((i / Math.max(1, from.length - 1)) * (to.length - 1)), to.length - 1)]);
    },
    [mode, selected, pick],
  );

  /* Down from the front of the desk goes to the living room; up from there comes back. */
  const moveTo = useCallback(
    (to: Place) => {
      pick(null);
      lastRef.current = null;
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
    greetTimer.current = window.setTimeout(() => typeOut(INTRO), 650);
  }, [mode, typeOut, reduced]);
  useEffect(() => () => window.clearTimeout(greetTimer.current), []);

  const pad: Pad = {
    // Up and down follow the desk's depth: wall, back of the desk, front of the
    // desk (letter, flute), then the living room.
    up: () => {
      if (place === "room") return moveTo("studio");
      const back = selected && DESK_UP[selected];
      if (back) pick(back);
      else row(WALL);
    },
    down: () => {
      if (place === "room") return;
      if (!selected || !DESK.includes(selected)) return row(DESK);
      const front = DESK_DOWN[selected];
      if (front) pick(front);
      else moveTo("room");
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
  const guide: GuideHint[] = !booted
    ? []
    : !done
      ? [["crs", "Skip"]]
      : !last
        ? [["crs", "Next"]]
        : mode === "intro" || mode === "topic"
          ? [["pad", "Look"], ["crs", "Select"], ["tri", "Pet"]]
          : mode === "browse"
            ? [["pad", "Move"], ["crs", "Open"], ["cir", "Back"]]
            : mode === "item"
              ? [["crs", "Choose"], ["cir", "Back"]]
              : [["pad", "Browse"], ["crs", "Choose"], ["cir", "Back"]];
  if (place === "room" && booted) guide.push(["sqr", "Desk"]);
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
      {tagId ? (
        <span ref={tagRef} className="hh-tag" aria-hidden="true">
          {ITEMS[tagId].name}
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
      {guide.length ? <ButtonGuide hints={guide} on={guideOn || close} /> : null}
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
            aria-label={sound ? "Mute the voice" : "Turn on the voice"}
            title={sound ? "Mute the voice (M)" : "Turn on the voice (M)"}
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
            {mode === "intro" || mode === "browse" ? <h1>{INTRO.slice(0, n)}</h1> : <p><NodeBody node={node} n={n} /></p>}
          </div>
          {done && last && mode === "app" && app.audio?.length ? <Tracks tracks={app.audio} /> : null}
          {done && last && mode === "desktop" && !question ? (
            <button type="button" className="ch-bubble__go" onClick={() => goTo("/projects")}>
              See all projects ›
            </button>
          ) : null}
          {done && !last ? (
            <button type="button" className="ch-bubble__next" onClick={a} aria-label="Next">
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
            <div className={`ch-you__choices${options.length > 4 ? " is-many" : ""}`} role="group" aria-label="Ask me">
              {options.map((o, i) => (
                <button
                  type="button"
                  key={o.key}
                  className={o.main ? "is-main" : o.href ? "is-go" : undefined}
                  data-cursor={cursor === i || undefined}
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
        <ul className="sr-only" aria-label="Things in the room">
          {(place === "room" ? ROOM : [...WALL, ...DESK]).map((id) => (
            <li key={id}>
              <button type="button" onClick={() => inspect(id)}>
                {ITEMS[id].name}
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
