/** One run of text inside a `rich` node. `intent` makes it a clickable phrase
 * that asks that question; `href` makes it a normal link. */
export type RichSeg =
  | { text: string }
  | { text: string; intent: string }
  | { text: string; href: string };

export type AnswerNode =
  | { kind: "text"; value: string }
  | { kind: "rich"; segments: RichSeg[] }
  | { kind: "linkList"; items: { label: string; href: string; note?: string }[] };

export type CanvasSpec =
  | { kind: "resume" }
  | { kind: "timeline" }
  | { kind: "tech" }
  | { kind: "projects" }
  | { kind: "project"; slug: string }
  | { kind: "flute" };

export type Intent = {
  id: string;
  /** Terse label (used for keyboard hints / aria). */
  chip: string;
  /** Question phrasing — shown on the suggestion pill and as the visitor bubble. */
  ask: string;
  answer: AnswerNode[];
  /** If set, opens this in the side panel. */
  canvas?: CanvasSpec;
  /** If set, selecting this navigates here instead of answering in chat. */
  navigate?: string;
  followUps: string[];
};

export const GREETING: AnswerNode[] = [
  {
    kind: "rich",
    segments: [
      { text: "Hi! I'm Haylie Wu. I'm a " },
      { text: "software developer", intent: "experience" },
      { text: " and a " },
      { text: "flutist", intent: "flute" },
      { text: ". I studied computer science at Northwestern, and I'm now doing a master's in flute at New England Conservatory while I keep " },
      { text: "shipping software projects", intent: "projects" },
      { text: "." },
    ],
  },
  { kind: "text", value: "Ask me anything — here are some starting points." },
];

/** Suggestion pills, grouped, shown at the root of the conversation. */
export const CHIP_GROUPS: { label: string; ids: string[] }[] = [
  { label: "About me", ids: ["background", "experience", "resume"] },
  { label: "My work", ids: ["projects", "tech-stack"] },
  { label: "Ask me", ids: ["why-both", "flute", "looking-for", "contact"] },
];
export const ROOT_CHIPS = CHIP_GROUPS.flatMap((g) => g.ids);

export const INTENTS: Record<string, Intent> = {
  projects: {
    id: "projects",
    chip: "Projects",
    ask: "What have you built?",
    answer: [
      {
        kind: "text",
        value:
          "A mix of big and small — my current build, Cookie Flute Studio, a learning log I'm turning into an interactive textbook, and earlier full-stack work for Northwestern students. Open one on the right.",
      },
    ],
    canvas: { kind: "projects" },
    followUps: ["cookie-flute-studio", "learning-log", "market", "skuy"],
  },

  experience: {
    id: "experience",
    chip: "Timeline",
    ask: "Show me your timeline.",
    answer: [
      {
        kind: "text",
        value:
          "Two tracks running side by side since 2021 — software on one, flute on the other. It's on the right. I've never dropped either.",
      },
    ],
    canvas: { kind: "timeline" },
    followUps: ["resume", "why-both", "projects"],
  },

  resume: {
    id: "resume",
    chip: "Résumé",
    ask: "Can I see your résumé?",
    answer: [
      {
        kind: "text",
        value:
          "It's on the right — filter it by any technology to see where I used it, or grab the PDF.",
      },
    ],
    canvas: { kind: "resume" },
    followUps: ["experience", "tech-stack", "contact"],
  },

  background: {
    id: "background",
    chip: "Background",
    ask: "Tell me about your background.",
    answer: [
      {
        kind: "text",
        value:
          "I studied computer science at Northwestern. Along the way I interned as a software engineer at MathWorks, worked on NetLogo Web at Northwestern's Center for Connected Learning, and was lead backend engineer at SKUY, a student startup. I've kept building software since, and I'm now doing a master's at New England Conservatory alongside my dev work.",
      },
    ],
    followUps: ["experience", "tech-stack", "resume"],
  },

  "why-both": {
    id: "why-both",
    chip: "Why software and flute?",
    ask: "Why software and flute?",
    answer: [
      {
        kind: "text",
        value:
          "At the start of 2024 I decided to give intensive flute training everything I had — competitions, festivals, finding my ceiling as a player — without stopping software. Since then I've won competitions, entered New England Conservatory on scholarship, and kept shipping code. I want both, and I've built my life so I don't have to choose.",
      },
    ],
    followUps: ["experience", "flute", "background"],
  },

  "tech-stack": {
    id: "tech-stack",
    chip: "Tech stack",
    ask: "What's your tech stack?",
    answer: [
      {
        kind: "text",
        value:
          "The short version is on the right. Mostly TypeScript and Python — React and Next.js on the frontend, Node, Flask, and Postgres on the backend, deployed on AWS.",
      },
    ],
    canvas: { kind: "tech" },
    followUps: ["projects", "resume"],
  },

  "cookie-flute-studio": {
    id: "cookie-flute-studio",
    chip: "Cookie Flute Studio",
    ask: "Tell me about Cookie Flute Studio.",
    answer: [{ kind: "text", value: "It's easiest to just look. Opening it now." }],
    navigate: "/flute-studio",
    followUps: ["learning-log", "market", "skuy"],
  },

  "learning-log": {
    id: "learning-log",
    chip: "Learning Log",
    ask: "Tell me about the Learning Log.",
    answer: [{ kind: "text", value: "My class notes, rebuilt as an interactive textbook. Opening it now." }],
    navigate: "/learning-log",
    followUps: ["cookie-flute-studio", "market", "skuy"],
  },

  market: {
    id: "market",
    chip: "Market",
    ask: "Tell me about Market.",
    answer: [{ kind: "text", value: "An archived marketplace I built with Julia Chu. It's on the right." }],
    canvas: { kind: "project", slug: "market" },
    followUps: ["cookie-flute-studio", "learning-log", "skuy"],
  },

  skuy: {
    id: "skuy",
    chip: "SKUY",
    ask: "Tell me about SKUY.",
    answer: [{ kind: "text", value: "A student startup where I led the backend. Details on the right." }],
    canvas: { kind: "project", slug: "skuy" },
    followUps: ["cookie-flute-studio", "learning-log", "market"],
  },

  flute: {
    id: "flute",
    chip: "Flute & performance",
    ask: "Tell me about your flute playing.",
    answer: [
      {
        kind: "text",
        value:
          "I'm doing a master's in flute performance and music technology at New England Conservatory, on scholarship, preparing for young-artist competitions. Over the last two years I've won competitions and played festivals. Some playing is on the right.",
      },
    ],
    canvas: { kind: "flute" },
    followUps: ["experience", "why-both", "background"],
  },

  "looking-for": {
    id: "looking-for",
    chip: "What I'm looking for",
    ask: "What kind of role are you looking for?",
    answer: [
      {
        kind: "text",
        value:
          "A new-grad software engineering role where I can take on unfamiliar problems and grow quickly. I care about building interfaces people actually enjoy using, and I want to work with a team that cares about that too.",
      },
    ],
    followUps: ["resume", "projects", "contact"],
  },

  contact: {
    id: "contact",
    chip: "Contact",
    ask: "How do I get in touch?",
    answer: [
      { kind: "text", value: "Email is best — I check it." },
      {
        kind: "linkList",
        items: [
          { label: "hayliewu0709@gmail.com", href: "mailto:hayliewu0709@gmail.com" },
          { label: "(669) 264-8245", href: "tel:+16692648245" },
          { label: "linkedin.com/in/haylie-wu", href: "https://linkedin.com/in/haylie-wu" },
          { label: "github.com/wubbalubbadu", href: "https://github.com/wubbalubbadu" },
        ],
      },
    ],
    followUps: ["resume", "looking-for"],
  },
};

/** Follow-up pills after an answer: this intent's `followUps`, then "menu". */
export function nextChips(intentId: string, asked: string[]): string[] {
  const intent = INTENTS[intentId];
  const followUps = intent ? intent.followUps.filter((id) => id !== intentId) : [];
  void asked;
  return [...followUps, "menu"];
}
