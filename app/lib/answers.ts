export type AnswerNode =
  | { kind: "text"; value: string }
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
  /** Label shown on the suggestion box. */
  chip: string;
  /** Text that appears as the visitor's bubble when the box is clicked. */
  ask: string;
  /** Haylie's scripted reply in the chat. Short when there's a canvas. */
  answer: AnswerNode[];
  /** If set, opens this artifact in the canvas panel. */
  canvas?: CanvasSpec;
  /** Candidate intent ids to surface after this answer. */
  followUps: string[];
};

export const GREETING: AnswerNode[] = [
  {
    kind: "text",
    value:
      "Hi! My name is Haylie Wu. I'm a software developer and a flutist. I'm passionate about technology and about building the best, most innovative user experiences. I studied computer science at Northwestern, and I'm now pursuing a master's in flute at New England Conservatory while I keep shipping software projects. Ask me anything below!",
  },
];

/** Big buttons on the home screen. */
export const PRIMARY_CHIPS = ["projects", "experience", "resume"];
/** Small chips under them. */
export const SECONDARY_CHIPS = ["background", "why-both", "tech-stack", "flute", "looking-for", "contact"];
export const ROOT_CHIPS = [...PRIMARY_CHIPS, ...SECONDARY_CHIPS];

export const INTENTS: Record<string, Intent> = {
  projects: {
    id: "projects",
    chip: "Projects",
    ask: "What have you built?",
    answer: [
      {
        kind: "text",
        value:
          "A mix of big and small. Cookie Flute Studio is my current build, plus experiments like a 3D QR code and a cat-emoji data-structure visualizer, and earlier full-stack work for Northwestern students. Open one on the right.",
      },
    ],
    canvas: { kind: "projects" },
    followUps: ["cookie-flute-studio", "qr-tree", "cat-structures", "market", "skuy"],
  },

  experience: {
    id: "experience",
    chip: "Timeline",
    ask: "Show me your timeline.",
    answer: [
      {
        kind: "text",
        value:
          "Here's how the two tracks have run side by side since 2021. Software on the left, flute on the right. Early 2024 is where I doubled down on playing.",
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
          "It's on the right. Filter it by any technology to see where I used it, or download the PDF.",
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
          "I studied computer science at Northwestern. Along the way I interned as a software engineer at MathWorks, worked on NetLogo Web at Northwestern's Center for Connected Learning, and was lead backend engineer at SKUY, a student startup. I've kept building software since then, and I'm now doing a master's at New England Conservatory while continuing my dev work.",
      },
    ],
    followUps: ["experience", "tech-stack", "resume"],
  },

  "why-both": {
    id: "why-both",
    chip: "Why software and flute?",
    ask: "Why are you doing both software and flute?",
    answer: [
      {
        kind: "text",
        value:
          "At the start of 2024 I made a deliberate choice. I wanted to give intensive flute training everything I had, do competitions, and find out how good my playing could get. Since then I've won competitions, entered New England Conservatory on scholarship, and played festivals. But I never stopped building software or sharpening my skills. I want both, and I've built my life so I don't have to choose.",
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
          "The short version is on the right. I work mostly in TypeScript and Python, React and Next.js on the frontend, Node, Flask, and Postgres on the backend, deployed on AWS.",
      },
    ],
    canvas: { kind: "tech" },
    followUps: ["projects", "resume"],
  },

  "cookie-flute-studio": {
    id: "cookie-flute-studio",
    chip: "Cookie Flute Studio",
    ask: "Tell me about Cookie Flute Studio.",
    answer: [{ kind: "text", value: "My current build. Details and a link are on the right." }],
    canvas: { kind: "project", slug: "cookie-flute-studio" },
    followUps: ["qr-tree", "cat-structures", "market", "skuy"],
  },

  "qr-tree": {
    id: "qr-tree",
    chip: "QR Tree",
    ask: "Tell me about QR Tree.",
    answer: [{ kind: "text", value: "A 3D QR code experiment, in progress. It's on the right." }],
    canvas: { kind: "project", slug: "qr-tree" },
    followUps: ["cookie-flute-studio", "cat-structures", "market", "skuy"],
  },

  "cat-structures": {
    id: "cat-structures",
    chip: "Cat-emoji data structures",
    ask: "Tell me about the cat-emoji data structures.",
    answer: [{ kind: "text", value: "A small teaching toy. Take a look on the right." }],
    canvas: { kind: "project", slug: "cat-structures" },
    followUps: ["cookie-flute-studio", "qr-tree", "market", "skuy"],
  },

  market: {
    id: "market",
    chip: "Market",
    ask: "Tell me about Market.",
    answer: [{ kind: "text", value: "An archived marketplace I built with Julia Chu. It's on the right." }],
    canvas: { kind: "project", slug: "market" },
    followUps: ["cookie-flute-studio", "qr-tree", "cat-structures", "skuy"],
  },

  skuy: {
    id: "skuy",
    chip: "SKUY",
    ask: "Tell me about SKUY.",
    answer: [{ kind: "text", value: "A student startup where I led the backend. Details on the right." }],
    canvas: { kind: "project", slug: "skuy" },
    followUps: ["cookie-flute-studio", "qr-tree", "cat-structures", "market"],
  },

  flute: {
    id: "flute",
    chip: "Flute & performance",
    ask: "Tell me about your flute playing.",
    answer: [
      {
        kind: "text",
        value:
          "I'm doing a master's in flute performance and music technology at New England Conservatory, on scholarship, preparing for young-artist competitions. Over the last two years I've won competitions and played festivals. A performance is on the right.",
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
          "I'm looking for a new-grad software engineering role where I can take on unfamiliar problems and grow quickly. I care about building interfaces people actually enjoy using, and I want to work with a team that cares about that too.",
      },
    ],
    followUps: ["resume", "projects", "contact"],
  },

  contact: {
    id: "contact",
    chip: "Contact",
    ask: "How do I get in touch?",
    answer: [
      { kind: "text", value: "The best way to reach me is email. I check it." },
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

/**
 * TODO(haylie): pick the navigation model for the follow-up chips.
 *
 *   1. Curated (current): this answer's `followUps`, then "menu".
 *   2. Full menu: always ROOT_CHIPS.
 *   3. Curated + fill: followUps, then top up from unused ROOT_CHIPS to ~5.
 */
export function nextChips(intentId: string, asked: string[]): string[] {
  const intent = INTENTS[intentId];
  const followUps = intent ? intent.followUps.filter((id) => id !== intentId) : [];
  void asked;
  return [...followUps, "menu"];
}
