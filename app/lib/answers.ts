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
      { text: "Hi, I'm Haylie. I'm a " },
      { text: "software engineer", intent: "experience" },
      { text: " with a background that combines computer science and high-level " },
      { text: "music performance", intent: "flute" },
      { text: "." },
    ],
  },
  {
    kind: "rich",
    segments: [
      {
        text: "I finished my computer science degree at Northwestern, then spent two years training intensively in flute performance at New England Conservatory. I've kept building software the whole time, and I'm passionate about ",
      },
      { text: "building", intent: "projects" },
      { text: " and " },
      { text: "learning new technologies", intent: "learning-log" },
      { text: "." },
    ],
  },
  { kind: "text", value: "Here are some starting points." },
];

/** Suggestion pills, grouped, shown at the root of the conversation. */
export const CHIP_GROUPS: { label: string; ids: string[] }[] = [
  { label: "About me", ids: ["background", "experience", "resume"] },
  { label: "My work", ids: ["projects", "tech-stack"] },
  { label: "Ask me", ids: ["flute", "contact"] },
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
          "Right now I'm building Cookie Flute Studio, a real-time practice platform for flutists, and a Learning Log that turns course notes into an interactive textbook you can click through. Before those, I shipped full-stack products that Northwestern students actually used: a campus marketplace and a social news app with over a thousand users. The full list is on the right, open any of them.",
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
          "Software and flute have run in parallel the whole way through, and I've kept both moving at the same time rather than trading one off for the other. The full picture is on the right.",
      },
    ],
    canvas: { kind: "timeline" },
    followUps: ["resume", "projects"],
  },

  resume: {
    id: "resume",
    chip: "Résumé",
    ask: "Can I see your résumé?",
    answer: [
      {
        kind: "rich",
        segments: [
          { text: "It's on the right. Filter it by any technology to see exactly where I used it, or open the " },
          { text: "PDF", href: "/haylie-wu-resume.pdf" },
          { text: "." },
        ],
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
          "I've spent several years working in software across pretty different environments. At MathWorks I worked in a large production codebase, where I shipped features, two of which went out in a public MATLAB release, and designed a parser-combinator system for structured Excel test data. At an early-stage startup I was the lead backend engineer, with broad ownership across the backend, deployment, performance, and onboarding. There I cut initial load time by about a third and ran a full database migration without breaking existing users.",
      },
      {
        kind: "text",
        value:
          "I also built developer- and user-facing tools for NetLogo Web at Northwestern's Center for Connected Learning, and did a research internship there on approximation algorithms for scheduling.",
      },
      {
        kind: "text",
        value:
          "After finishing undergrad at Northwestern University, I decided to spend two years training intensively in flute performance at New England Conservatory. It was a very intentional decision to take this window of my life to push my playing as far as I could. At the same time, I've continued building software, and I'm still shipping projects.",
      },
      {
        kind: "rich",
        segments: [
          { text: "If you want the detailed version, my " },
          { text: "résumé", intent: "resume" },
          { text: " is one click away." },
        ],
      },
    ],
    followUps: ["experience", "tech-stack", "resume"],
  },

  "tech-stack": {
    id: "tech-stack",
    chip: "Tech stack",
    ask: "What's your tech stack?",
    answer: [
      {
        kind: "text",
        value:
          "I'm strongest in TypeScript and Python, and I pick up whatever a project needs. I've shipped production code in JavaScript, Java, C++, and MATLAB too. Day to day it's React and Next.js on the frontend, Node, Flask, and Postgres on the backend, running on AWS. The full breakdown is on the right, and I get up to speed on a new stack fast.",
      },
    ],
    canvas: { kind: "tech" },
    followUps: ["projects", "resume"],
  },

  "cookie-flute-studio": {
    id: "cookie-flute-studio",
    chip: "Cookie Flute Studio",
    ask: "Tell me about Cookie Flute Studio.",
    answer: [{ kind: "text", value: "A real-time practice tool I'm building for flutists. Here's the rundown, and there's a link to open it." }],
    canvas: { kind: "project", slug: "cookie-flute-studio" },
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
    answer: [{ kind: "text", value: "An archived campus marketplace I built end to end. It's on the right." }],
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
          "I'm doing my master's in flute performance and music technology at New England Conservatory on a full scholarship, and I'm deep in the young-artist competition circuit. The last couple of years brought a prize at the Pappoutsakis Competition, a spot at the National Flute Association convention, and a summer at the Atlantic Music Festival. There's some playing on the right.",
      },
    ],
    canvas: { kind: "flute" },
    followUps: ["experience", "background"],
  },

  contact: {
    id: "contact",
    chip: "Contact",
    ask: "How do I get in touch?",
    answer: [
      { kind: "text", value: "Email's the best way to reach me, I actually check it." },
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
    followUps: ["resume"],
  },
};

/** Follow-up pills after an answer: this intent's `followUps`, then "menu". */
export function nextChips(intentId: string, asked: string[]): string[] {
  const intent = INTENTS[intentId];
  const followUps = intent ? intent.followUps.filter((id) => id !== intentId) : [];
  void asked;
  return [...followUps, "menu"];
}
