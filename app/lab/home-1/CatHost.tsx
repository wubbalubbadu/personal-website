"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../_kit/kit.css";
import "./cat-host.css";
import "./handheld.css";
import { SheetHost, useOpenSheet } from "../_kit/Sheets";
import { CONTACT_LINKS, COPY, FLUTE_LINKS, opensNewTab, PROJECT_ROWS, type LinkItem, type ProjectRow } from "../_kit/links";
import { playFlute } from "../_kit/fluteTone";
import { useMedia, usePrefersReducedMotion } from "../_kit/hooks";
import { INTENTS, type AnswerNode, type RichSeg } from "../../lib/answers";
import { playStep, timeline, unlockAudio, VOICES, type MascotEngine, type MascotMood } from "../../components/ps1-mascot";
import { Console, type Device, type Pad } from "./Handheld";
import ItemArt, { LaptopArt, type ArtId } from "./ItemArt";

/*
 * Cat host: the page is the handheld, and its screen is the cat's studio.
 * Everything you can do glows: a wall (diploma, résumé, socials) above a desk
 * (laptop, letter, flute, iPad). Pick something with the D-pad, the keyboard
 * or a tap; inspecting zooms in and an item card slides up with the details.
 * What the cat says comes out of the speaker into a bubble below the
 * console, where you can also ask it questions. The hello is there from the
 * first paint.
 */

/* ---- what's in the room ---- */

type ItemId =
  | "diploma" | "resume" | "socials" | "laptop" | "letter" | "flute" | "ipad" | "cookies"
  // the living room
  | "stand" | "window" | "jar" | "cushion";

type Item = {
  name: string;
  /** What the cat says when you inspect it (in the bubble). */
  react: string;
  /** The item card's paragraph. Drafts for Haylie to edit. */
  body: string;
  open?: { label: string; href: string };
  links?: LinkItem[];
  /** Inspecting zooms into the laptop's screen and opens its desktop. */
  desktop?: boolean;
  /** The cat picks it up and plays. */
  plays?: boolean;
  /** What the cat does when you inspect it (eat, nap); `plays` means flute. */
  mood?: MascotMood;
  /** A snack: the cat eats one, the counter goes up, it says one of SNACK_LINES. */
  snack?: boolean;
  /** Inspecting runs this whole conversation from app/lib/answers.ts instead of `body`. */
  topic?: "flute" | "background" | "projects";
};

const ITEMS: Record<ItemId, Item> = {
  diploma: {
    name: "Diploma",
    react: "My diploma!",
    body: "I studied computer science and flute performance at Northwestern. Now I'm doing my master's in flute performance at New England Conservatory, and I've kept building software the whole time.",
  },
  resume: {
    name: "Résumé",
    react: "Everything's on here.",
    body: "My software résumé: features shipped at MathWorks, leading the backend at a startup, and tools and research at Northwestern.",
    open: { label: "Open my résumé", href: "/haylie-wu-resume.pdf" },
  },
  socials: {
    name: "Social media",
    react: "Come find me online!",
    body: "I share performances and short clips online, around 240k followers across TikTok, Douyin, WeChat Channels and RedNote.",
    links: FLUTE_LINKS.filter((l) => l.label !== "Competition footage"),
  },
  laptop: {
    name: "Laptop",
    react: "My projects live in here.",
    body: "",
    desktop: true,
  },
  letter: {
    name: "Letter",
    react: "Write to me!",
    body: COPY.contactLine,
    links: CONTACT_LINKS.filter((l) => l.label !== "Résumé"),
  },
  flute: {
    name: "Flute",
    react: "Let me play you something.",
    body: "Let me play you something first. Then ask me anything about the flute side of my life.",
    plays: true,
  },
  ipad: {
    name: "Cookie Flute Studio",
    react: "My practice app!",
    body: "Cookie Flute Studio is the practice app I'm building for flutists. It runs in your browser, in English and Chinese. Ask me anything about it.",
    open: { label: "Open Cookie Flute Studio", href: "/flute-studio" },
  },
  // The fun things: no links, the cat just does something. Drafts for Haylie.
  cookies: { name: "Cookies", react: "", body: "", snack: true, mood: "eat" },
  jar: { name: "Cookie jar", react: "", body: "", snack: true, mood: "eat" },
  cushion: { name: "Cushion", react: "", body: "Five more minutes.", mood: "sleep" },
  stand: { name: "Music stand", react: "", body: "Long tones first. Always.", plays: true },
  window: { name: "Window", react: "", body: "Good light for practising." },
};

/**
 * Some things open their own questions when you inspect them, the way the hello
 * offers background, flute and projects. Drafts for Haylie's tone pass: facts
 * only from what she has approved, app/lib/projects.ts, and her teaching.
 */
type Question = { ask: string; say: string; open?: { label: string; href: string }; links?: LinkItem[] };
const QUESTIONS: Partial<Record<ItemId, Record<string, Question>>> = {
  flute: {
    now: {
      ask: "What are you working on right now?",
      say: "I'm doing my master's in flute performance at New England Conservatory on a scholarship, and I compete on the young-artist circuit. Next up, I'm recording études and putting them on YouTube.",
      open: { label: "Watch a competition round", href: FLUTE_LINKS[0].href },
    },
    training: {
      ask: "What's your training?",
      say: "I did a flute performance degree at Northwestern alongside computer science. Now I'm doing my master's in flute performance at New England Conservatory.",
    },
    teach: {
      ask: "Do you teach?",
      say: "Yes! I teach students from middle school through high school, and adult amateurs too. If you'd like lessons, write to me.",
      open: { label: "Ask about lessons", href: "mailto:hayliewu0709@gmail.com?subject=Flute%20lessons" },
    },
    online: {
      ask: "Where can I hear you play?",
      say: "Online, mostly. Around 240k people follow along on TikTok, Douyin, WeChat Channels and RedNote. Most of it is repertoire I arrange and produce my own accompaniment tracks for, to make classical music feel approachable to people who don't already listen to it.",
      links: FLUTE_LINKS.filter((l) => l.label !== "Competition footage"),
    },
  },
  laptop: {
    proud: {
      ask: "What are you proudest of?",
      say: "Cookie Flute Studio. Most practice apps store sheet music as image files. Mine stores the rule behind a scale, writes the notation itself and draws it in your browser. Change the key or the range and you get a fresh score, so one engine makes a twelve-key scale book, long tones and a four-octave trill chart.",
      open: { label: "Open Cookie Flute Studio", href: "/flute-studio" },
    },
    hard: {
      ask: "What was the hardest problem?",
      say: "Getting the sheet music to lay out properly. The notation library I use assumes printed paper, so on a phone it put one bar per line. Now I measure how many notes actually fit on the first line, then rewrite the music with line breaks in the right places. Page turns work the same way: I measure the drawn lines and work out each page myself.",
    },
    log: {
      ask: "What's Learning Log?",
      say: "My class notes, rebuilt as an interactive textbook you can read or click through like slides. The first one is a CMU course on deep learning for music, with demos you can play with: hear aliasing happen, build a sound from sine waves, watch a live spectrogram.",
      open: { label: "Open Learning Log", href: "/learning-log" },
    },
    before: {
      ask: "What did you build before?",
      say: "I was the lead backend engineer on SKUY, a student startup with about 15 engineers. I built its APIs and the scraping pipelines behind a news feed for 1,000+ users, cut first load by about 35%, and moved the database from PostgreSQL to Firebase.",
    },
    how: {
      ask: "What do you build with?",
      say: "Cookie Flute Studio is one Next.js app in TypeScript, designed and coded by me. The notation is engraved with OpenSheetMusicDisplay, the sound comes from the Web Audio API, the 3D is three.js, and it runs on Cloudflare Workers.",
    },
  },
  ipad: {
    what: {
      ask: "What does it do?",
      say: "Say you're working on long tones. Pick the note and the range, and it writes the exercise out for you. Turn on the drone, play, and watch your pitch line up with it, or not. Scales, études and fingering charts work the same way.",
    },
    different: {
      ask: "What makes it different?",
      say: "Most practice apps store sheet music as files. Mine mostly doesn't. It keeps the rule behind a scale or exercise and writes the music on the spot, so change the range or articulation and you get a fresh score.",
    },
  },
};

/** The graphic shown when you inspect each thing (the flute has the cat playing instead). */
const ART: Partial<Record<ItemId, ArtId>> = {
  letter: "letter",
  diploma: "diploma",
  resume: "resume",
  socials: "socials",
  ipad: "ipad",
};


/** What the cat says with each cookie, in turn. */
const SNACK_LINES: string[][] = [
  ["Crunch. Okay, just one.", "Long tones make me hungry. Nobody warns you about that.", "Fine. One more, for focus."],
  ["Don't tell my teacher.", "Crumbs in the flute keys mean a whole cleaning session.", "Worth it, though."],
  ["Practice break! Five minutes.", "Maybe ten.", "Okay, a cookie and then a nap. That's the plan."],
  ["Still warm. Someone loves me.", "Want one? I'll save you the biggest one.", "...I ate the biggest one. Sorry."],
  ["Fuel for long tones.", "Breath support starts in the stomach, so this counts as practice.", "That's my story and I'm sticking to it."],
  ["These are the good ones.", "Sugar cookies. Cat safe, flute safe, crumb heavy.", "Don't look at the desk."],
];
/** What she says on the nth cookie instead, when the count gets silly. */
const SNACK_MILESTONES: Record<number, string[]> = {
  5: ["That's five.", "I'm cutting myself off.", "(I'm not.)"],
  10: ["Ten cookies.", "This is now a cookie recital.", "Please hold your applause until the end."],
  20: ["Twenty?!", "You're a bad influence.", "Thank you."],
};

/** Up looks at the wall, down at the desk; left and right move along a row. */
const WALL: ItemId[] = ["diploma", "resume", "socials"];
const DESK: ItemId[] = ["laptop", "letter", "flute", "ipad", "cookies"];
/** The living room, one row, left to right. */
const ROOM: ItemId[] = ["stand", "window", "cushion", "jar"];
type Place = "studio" | "room";

/** The laptop's desktop: every project, Cookie Flute Studio included. */
const APPS: ProjectRow[] = PROJECT_ROWS;

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
  ["There's competition footage and a few clips on the right, plus my ", "There's competition footage on YouTube"],
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

/* Who she is first (flutist and software engineer), then what she does, then the schools. */
const INTRO =
  "Hi, I'm Haylie Wu! I'm a flutist and software engineer. I perform, teach, and build software for musicians. I studied computer science and flute at Northwestern, and I'm completing my master's in flute performance at New England Conservatory.";
const DESKTOP_LINE = "My projects live in here. Tap one to open it, or ask me something.";
/** A short tune for when the cat picks up the flute. */
const TUNE = [587.33, 659.25, 739.99, 783.99, 880, 783.99];
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

function LinkPills({ links }: { links: LinkItem[] }) {
  return (
    <div className="ch-bubble__links">
      {links.map((l) => {
        const ext = opensNewTab(l.href);
        return (
          <a key={l.href} href={l.href} target={ext ? "_blank" : undefined} rel={ext ? "noreferrer" : undefined}>
            {l.label}
          </a>
        );
      })}
    </div>
  );
}

function CatHostInner({ device }: { device: Device }) {
  const reduced = usePrefersReducedMotion();
  const wide = useMedia("(min-width: 760px)");
  const touch = useMedia("(hover: none)");
  const openSheet = useOpenSheet();

  const engineRef = useRef<MascotEngine | null>(null);
  const [ready, setReady] = useState(false);
  const onEngine = useCallback((e: MascotEngine | null) => {
    engineRef.current = e;
    setReady(Boolean(e));
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
  const [cardShown, setCardShown] = useState(false);
  /* One visit in five, and at night, she's napping when you arrive; a pet wakes her. */
  const [mood, setMood] = useState<MascotMood>(() => {
    if (typeof window === "undefined") return "idle";
    const hour = new Date().getHours();
    return hour >= 22 || hour < 6 || Math.random() < 0.2 ? "sleep" : "idle";
  });
  /* Desk and wall, or the living room. */
  const [place, setPlace] = useState<Place>("studio");
  /* Cookies eaten this visit, and what the cat said about the last one. */
  const [eaten, setEaten] = useState(0);
  const [snackLines, setSnackLines] = useState(SNACK_LINES[0]);
  const eatenRef = useRef(0);
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
    // Projects with a link get their one line; the rest get their real description, paged.
    if (mode === "app") return paginate([{ kind: "text", value: app.href ? app.line : app.detail }]);
    if ((mode === "item" || mode === "desktop") && question) return paginate([{ kind: "text", value: question.say }]);
    if (mode === "desktop" && item) return [{ kind: "text", value: DESKTOP_LINE }];
    // A cookie's lines read as one little speech, not a click per sentence.
    if (mode === "item" && item?.snack) return [{ kind: "text", value: snackLines.join(" ") }];
    if (mode === "item" && item) return item.topic ? answerPages(item.topic) : [{ kind: "text", value: item.body }];
    return [{ kind: "text", value: INTRO }];
  }, [mode, topic, item, app, snackLines, question]);
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
        }, 60 + st.at),
      );
    },
    [reduced],
  );

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
  const capOn = (mode === "topic" && Boolean(focus?.cap)) || near("diploma");
  useEffect(() => {
    if (ready) engineRef.current?.setCap(capOn);
  }, [ready, capOn]);
  /* Glasses on at the laptop, an apron for cookies. */
  const glassesOn = mode === "desktop" || mode === "app" || focus?.item === "laptop" || near("laptop");
  const apronOn = mood === "eat" || near("cookies", "jar");
  useEffect(() => {
    if (!ready) return;
    engineRef.current?.wear("glasses", glassesOn);
    engineRef.current?.wear("apron", apronOn);
  }, [ready, glassesOn, apronOn]);
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
      setMode(it.desktop ? "desktop" : "item");
      setPage(0);
      setMood(it.mood ?? (it.plays ? "flute" : "idle"));
      if (it.plays && soundRef.current) TUNE.forEach((f, i) => window.setTimeout(() => playFlute(f, 0.28), 300 + i * 260));
      let line = it.desktop ? DESKTOP_LINE : it.topic ? fix(nodeText(answerPages(it.topic)[0])) : it.body;
      if (it.snack) {
        const lines = SNACK_MILESTONES[eatenRef.current + 1] ?? SNACK_LINES[eatenRef.current % SNACK_LINES.length];
        line = lines.join(" ");
        eatenRef.current += 1;
        setEaten(eatenRef.current);
        setSnackLines(lines);
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
      setAppIndex(i);
      setMode("app");
      setPage(0);
      const first = paginate([{ kind: "text", value: APPS[i].href ? APPS[i].line : APPS[i].detail }])[0];
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

  /* RPG choices: the questions, in their own little window under the dialogue. */
  /* Inspecting something that has its own questions (the flute, the laptop, the iPad). */
  const holding = (mode === "item" || mode === "desktop") && Boolean(questions);
  const showChoices = done && last && (mode === "intro" || mode === "topic" || holding);
  /* Each choice is a question about the thing in hand, or one of the hello's topics. */
  type Option = { key: string; label: string; topic?: Topic };
  const options = useMemo<Option[]>(
    () =>
      holding && questions
        ? Object.entries(questions)
            .filter(([k]) => k !== asked)
            .map(([k, q]) => ({ key: k, label: q.ask }))
        : TOPICS.filter((t) => !(mode === "topic" && t === topic)).map((t) => ({ key: t, label: TOPIC_ASK[t], topic: t })),
    [holding, questions, asked, mode, topic],
  );
  const choose = useCallback(
    (o: Option) => {
      if (o.topic) ask(o.topic);
      else if (questions?.[o.key]) askAbout(o.key, questions[o.key]);
    },
    [ask, askAbout, questions],
  );
  /* The button and links under the answer: the flute question's, or the item's. */
  const extras = question ?? (mode === "item" ? item : null);
  const [choice, setChoice] = useState(0);
  const cursor = Math.min(choice, options.length - 1);

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
    else if (mode === "item" && questions && !asked && options[cursor]) choose(options[cursor]);
    else if (mode === "item" && extras) {
      if (extras.open) goTo(extras.open.href);
      else if (extras.links?.[0]) goTo(extras.links[0].href);
    } else if (mode === "desktop") showApp(appIndex);
    else if (mode === "app") goTo(app.href);
  }, [done, last, page, pages, mode, selected, extras, questions, asked, options, cursor, choose, app, appIndex, pick, inspect, showApp, goTo, typeOut]);

  const b = useCallback(() => {
    if (mode === "app") setMode("desktop");
    // Everything else zooms all the way back to the whole room, so the view never
    // stays parked on the thing; the D-pad still remembers where you were.
    else pick(null);
  }, [mode, pick]);

  const step = useCallback(
    (d: number) => {
      if (mode === "desktop" || mode === "app") {
        setAppIndex((i) => (i + d + APPS.length) % APPS.length);
        return;
      }
      const at = selected ?? lastRef.current;
      const row = place === "room" ? ROOM : at && WALL.includes(at) ? WALL : DESK;
      const i = at ? row.indexOf(at) : -1;
      pick(row[(i + d + row.length) % row.length]);
    },
    [mode, selected, pick, place],
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

  /* Down from the desk goes to the living room; up from there comes back. */
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

  const pad: Pad = {
    up: () => (place === "room" ? moveTo("studio") : row(WALL)),
    down: () => (place === "room" ? undefined : selected && DESK.includes(selected) ? moveTo("room") : row(DESK)),
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
  const hint: [string, string][] = [
    ...(close ? [] : [["WASD", "MOVE"] as [string, string]]),
    ...(mode === "browse" ? [["ENTER", "INSPECT"] as [string, string]] : []),
    ...(showChoices ? [[`1-${options.length}`, "ASK"] as [string, string]] : []),
    close ? ["ESC", "BACK"] : ["P", "PET"],
  ];

  /* ---- drawn over the scene ---- */
  const overlay = (
    <>
      {tagId ? (
        <span ref={tagRef} className="hh-tag" aria-hidden="true">
          {ITEMS[tagId].name}
        </span>
      ) : null}

      {mode === "item" && selected && selected in ART && cardShown ? <ItemArt id={ART[selected]!} onBack={b} /> : null}

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
      {eaten > 0 ? (
        <span className="hh-count" role="img" aria-label={`${eaten} cookies eaten`} title="Cookies the cat has eaten">
          <CookieIcon />×{eaten}
        </span>
      ) : null}

      {(mode === "desktop" || mode === "app") && cardShown ? (
        <LaptopArt apps={APPS} index={appIndex} open={mode === "app"} onPick={showApp} onBack={b} />
      ) : null}
    </>
  );

  return (
    <>
      <div className="ch-stage">
        <Console
          device={device}
          sceneAspect={device === "psp" && wide ? 16 / 9 : 4 / 3}
          pixelHeight={wide ? 200 : 150}
          mood={focusMood ?? mood}
          scene={place}
          onEngine={onEngine}
          onSceneTap={onSceneTap}
          onSceneHover={onSceneHover}
          overlay={overlay}
          pad={pad}
          talking={!done}
        />

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
          {done && last && extras?.open ? (
            <button type="button" className="ch-bubble__go" onClick={() => goTo(extras.open!.href)}>
              {extras.open.label} ›
            </button>
          ) : null}
          {done && last && extras?.links ? <LinkPills links={extras.links} /> : null}
          {done && last && mode === "app" && app.href ? (
            <button type="button" className="ch-bubble__go" onClick={() => goTo(app.href)}>
              Open {app.name} ›
            </button>
          ) : null}
          {done && last && mode === "app" && app.audio?.length ? <Tracks tracks={app.audio} /> : null}
          {done && !last ? (
            <button type="button" className="ch-bubble__next" onClick={a} aria-label="Next">
              ▼
            </button>
          ) : null}
        </div>

        {/* The visitor's side of the conversation: a reply bubble from the other
            direction. It offers the questions, then keeps the one you asked. */}
        {showChoices || mode === "topic" || question ? (
          <div className="ch-you">
            <span className="ch-you__name">YOU</span>
            {showChoices ? (
              <div className="ch-you__choices" role="group" aria-label="Ask me">
                {options.map((o, i) => (
                  <button
                    type="button"
                    key={o.key}
                    data-cursor={cursor === i || undefined}
                    onPointerEnter={() => setChoice(i)}
                    onFocus={() => setChoice(i)}
                    onClick={() => choose(o)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            ) : (
              <p className="ch-you__said">{question ? question.ask : TOPIC_ASK[topic]}</p>
            )}
          </div>
        ) : null}


        {/* Key prompts are for keyboards; on a touchscreen the glow and the buttons say enough. */}
        {touch ? null : (
          <p className="ch-hint" aria-hidden="true">
            {hint.map(([key, verb]) => (
              <span key={verb}>
                <kbd>{key}</kbd>
                {verb}
              </span>
            ))}
          </p>
        )}

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

export default function CatHost({ device = "psp" }: { device?: Device }) {
  return (
    <main className={`lab ch ch--${device}`}>
      <SheetHost>
        <CatHostInner device={device} />
      </SheetHost>
    </main>
  );
}
