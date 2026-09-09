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
    kind: "text",
    value:
      "I've spent several years working in software across pretty different environments. At MathWorks, I worked in a large production codebase, where I shipped features and designed a parser-combinator system for structured Excel test data. I was also hired as a software engineer at Northwestern's Center for Connected Learning, where I worked on NetLogo Web and built developer- and user-facing tools, including a new CodeMirror-based editor. And at an early-stage startup, I was the lead backend engineer, so I had much broader ownership across the backend, deployment, performance, and onboarding. At Northwestern, I was also a research intern working on approximation algorithms for scheduling.",
  },
  {
    kind: "rich",
    segments: [
      {
        text: "After finishing undergrad at Northwestern University, I decided to spend two years training intensively in flute performance while studying music technology at New England Conservatory. It was a very intentional decision to take this window of my life to push my playing as far as I could. At the same time, I've continued building software, I'm still shipping projects, and I'm now ",
      },
      { text: "looking to return to software engineering full-time", intent: "looking-for" },
      { text: "." },
    ],
  },
  { kind: "text", value: "Ask me anything, or start with one of these." },
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
    followUps: ["resume", "why-both", "projects"],
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
          "I did a double degree at Northwestern in computer science and flute performance, and I'm now at New England Conservatory on scholarship for a master's in flute performance and music technology. Carrying both at once has been the theme of everything I do.",
      },
      {
        kind: "text",
        value:
          "My first real engineering role was leading the backend at SKUY, a student startup that grew to around fifteen engineers. I built the Flask and PostgreSQL APIs and the scraping pipelines behind a news feed that served more than a thousand students, cut initial load time by about a third by reworking pagination and lazy loading, and ran a full PostgreSQL to Firebase migration with a path that didn't break existing users. I also owned releases and onboarded new engineers.",
      },
      {
        kind: "text",
        value:
          "At MathWorks I designed a 2D parser-combinator architecture in Simulink that composes reusable parsers to validate messy Excel test data, with multi-error handling and inline diagnostics, and rebuilt the MATLAB test framework's initialization as a centralized async layer that cut startup latency by roughly 30%. Two of my features shipped in a public MATLAB release.",
      },
      {
        kind: "text",
        value:
          "For almost two years I worked on NetLogo Web at Northwestern's Center for Connected Learning, where I shipped a new TypeScript code editor on CodeMirror 6 to replace the legacy one, built a drawing tool for custom simulation shapes, and contributed to an in-editor GPT-4 assistant, with the whole test and deploy pipeline automated through GitHub Actions. Before that I did a research internship on approximation algorithms for scheduling, advised by Prof. Samir Khuller.",
      },
      {
        kind: "text",
        value:
          "These days most of my building goes into Cookie Flute Studio, a real-time practice platform for flutists. Its score-following engine lines up live pitch detection with the sheet music for per-note intonation feedback, and an insights layer aggregates that across sessions to surface the passages you keep missing.",
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

  "why-both": {
    id: "why-both",
    chip: "Why software and flute?",
    ask: "Why software and flute?",
    answer: [
      {
        kind: "text",
        value:
          "Because I genuinely love both, and I got tired of being told to pick one. In early 2024 I decided to find out how far my playing could actually go, so I went all in on training, competitions, and festivals. It paid off: I placed at the Pappoutsakis Competition, got into New England Conservatory on a full scholarship, and performed at the National Flute Association convention. And I never put the code down, I was shipping features the whole time.",
      },
      {
        kind: "text",
        value:
          "Software isn't a side thing for me. I'm building toward a software engineering career, I lean toward backend and full-stack work, and I stay on top of new tools and frameworks as they come out. Music happens to be the domain I know best, so a lot of my projects live near it, but the engineering is the point. The two feed each other more than people expect, and I've set my life up so the answer to \"software or flute\" can just be yes.",
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
    answer: [{ kind: "text", value: "Easiest to just show you. Opening it now." }],
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
