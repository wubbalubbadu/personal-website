export type AnswerNode =
  | { kind: "text"; value: string }
  | { kind: "linkList"; items: { label: string; href: string; note?: string }[] }
  | { kind: "video"; youtube: string; start?: number; caption?: string }
  | { kind: "image"; src: string; alt: string; href?: string };

export type Intent = {
  id: string;
  /** Label shown on the suggestion box. */
  chip: string;
  /** Text that appears as the visitor's bubble when the box is clicked. */
  ask: string;
  /** Haylie's scripted reply, rendered top to bottom. */
  answer: AnswerNode[];
  /** Candidate intent ids to surface after this answer (see nextChips). */
  followUps: string[];
};

export const GREETING: AnswerNode[] = [
  {
    kind: "text",
    value:
      "Hi! My name is Haylie Wu. I'm a software developer and a flutist. I'm passionate about technology and about building the best, most innovative user experiences. I studied computer science at Northwestern, and I'm now pursuing a master's in flute at New England Conservatory while I keep shipping software projects. Ask me anything below!",
  },
];

export const ROOT_CHIPS = [
  "background",
  "why-both",
  "tech-stack",
  "projects",
  "flute",
  "resume",
  "contact",
];

export const INTENTS: Record<string, Intent> = {
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
    followUps: ["why-both", "tech-stack", "resume"],
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
    followUps: ["flute", "background"],
  },

  "tech-stack": {
    id: "tech-stack",
    chip: "Tech stack",
    ask: "What's your tech stack?",
    answer: [
      {
        kind: "text",
        value:
          "Languages: Python, TypeScript/JavaScript, Java, C++, SQL, MATLAB. Frontend in React and Next.js, plus React Native for mobile. Backend in Node/Express, Flask, PostgreSQL, MongoDB, and Firebase. I've shipped on AWS (S3, Lambda, API Gateway, DynamoDB) and Heroku, with Git and GitHub Actions for CI/CD. Recent work leans into TypeScript, Next.js, and the Web Audio API.",
      },
    ],
    followUps: ["projects", "resume"],
  },

  projects: {
    id: "projects",
    chip: "Projects",
    ask: "What have you built?",
    answer: [
      {
        kind: "text",
        value:
          "Four to look at. Cookie Flute Studio is my current build, a real-time practice platform for flutists with score-following pitch feedback. QR Tree turns a scannable QR code into a rotatable 3D object and back. Market and SKUY are earlier full-stack work: a secondhand marketplace and a mobile community app, both for Northwestern students. More are on the way. Pick one below.",
      },
    ],
    followUps: ["cookie-flute-studio", "qr-tree", "market", "skuy"],
  },

  "cookie-flute-studio": {
    id: "cookie-flute-studio",
    chip: "Cookie Flute Studio",
    ask: "Tell me about Cookie Flute Studio.",
    answer: [
      {
        kind: "text",
        value:
          "My current build, designed and developed solo. It uses Next.js, TypeScript, the Web Audio API, MusicXML, and a serverless AWS backend (S3, Lambda, API Gateway, DynamoDB). A score-following engine matches live-audio pitch detection against parsed MusicXML for per-note intonation feedback. There's also repertoire management, score annotation, practice tracking, and an insights engine that surfaces recurring problem passages. It's still in active development.",
      },
      { kind: "linkList", items: [{ label: "Open Cookie Flute Studio", href: "/flute-studio" }] },
    ],
    followUps: ["qr-tree", "market", "skuy", "projects"],
  },

  "qr-tree": {
    id: "qr-tree",
    chip: "QR Tree",
    ask: "Tell me about QR Tree.",
    answer: [
      {
        kind: "text",
        value:
          "A solo experiment, in progress. It turns a scannable QR code into a blocky, Minecraft-style tree you can rotate in 3D, then collapses it back into a readable 2D code. The hard part is the constraint I'm still working through: making the transformation playful without destroying the information that keeps the code scannable.",
      },
      {
        kind: "image",
        src: "/portfolio/qr-tree.svg",
        alt: "Concept sketch of a QR code growing into a blocky tree",
      },
    ],
    followUps: ["cookie-flute-studio", "market", "skuy", "projects"],
  },

  market: {
    id: "market",
    chip: "Market",
    ask: "Tell me about Market.",
    answer: [
      {
        kind: "text",
        value:
          "Full-stack, built with Julia Chu. Archived. A marketplace for Northwestern students to buy, sell, and request secondhand items. We worked across the whole thing: listings, search, accounts, image uploads, authentication, and the API behind them.",
      },
      { kind: "image", src: "/portfolio/market.png", alt: "Market app interface" },
    ],
    followUps: ["cookie-flute-studio", "qr-tree", "skuy", "projects"],
  },

  skuy: {
    id: "skuy",
    chip: "SKUY",
    ask: "Tell me about SKUY.",
    answer: [
      {
        kind: "text",
        value:
          "Lead backend engineer on a student startup of about 15 engineers, from 2022 to 2024. React Native, Flask, PostgreSQL, Python, Firebase. It's a mobile community and news app built around Northwestern student life. I built APIs for communities and posts, scraping pipelines that fed a news feed for 1,000+ users, cut initial load about 35% with pagination and lazy loading, and ran a PostgreSQL to Firebase migration. I also owned deployment and onboarding.",
      },
      { kind: "image", src: "/portfolio/skuy.png", alt: "SKUY app interface" },
    ],
    followUps: ["cookie-flute-studio", "qr-tree", "market", "projects"],
  },

  flute: {
    id: "flute",
    chip: "Flute & performance",
    ask: "Tell me about your flute playing.",
    answer: [
      {
        kind: "text",
        value:
          "I'm doing a master's in flute performance and music technology at New England Conservatory, on scholarship, preparing for young-artist competitions. Over the last two years I've won competitions and played festivals. Competitions are where the practice goes: onto a stage, under pressure, where it can be heard.",
      },
      { kind: "video", youtube: "ya3cFeMKD14", start: 649, caption: "Competition performance" },
      { kind: "text", value: "I also post playing on TikTok and Douyin." },
      {
        kind: "linkList",
        items: [
          { label: "@wubulubadudu on TikTok", href: "https://www.tiktok.com/@wubulubadudu" },
          {
            label: "Douyin",
            href: "https://www.douyin.com/user/MS4wLjABAAAANmZhGUqfg9pD4Rt3zrGjNp2Zv9hmMoyigTUdx-7VOjI?from_tab_name=main",
          },
        ],
      },
    ],
    followUps: ["why-both", "background"],
  },

  resume: {
    id: "resume",
    chip: "Résumé",
    ask: "Can I see your résumé?",
    answer: [
      {
        kind: "text",
        value:
          "Here's my résumé. Short version: a B.S. in Computer Science from Northwestern, and now a master's in flute at New England Conservatory. Software engineering internships at MathWorks and Northwestern's Center for Connected Learning, and lead backend engineer at SKUY. Dates, tech, and detail are in the PDF.",
      },
      { kind: "linkList", items: [{ label: "Open résumé (PDF)", href: "/haylie-wu-resume.pdf" }] },
    ],
    followUps: ["background", "contact"],
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
    followUps: ["resume"],
  },
};

/**
 * TODO(haylie): pick the navigation model. This decides which suggestion boxes
 * appear after each answer, which sets how the whole page feels to move through.
 *
 * `intentId` — the answer that was just shown.
 * `asked`    — every intent id the visitor has already opened this session.
 * returns    — ordered intent ids for the chip row ("menu" = jump back to root).
 *
 * Three options to choose between:
 *
 *   1. Curated (current): show this answer's `followUps`, then "menu".
 *      Tight, guided, feels like a decision tree. Can feel narrow.
 *
 *   2. Full menu: always return ROOT_CHIPS (optionally minus `asked`).
 *      Nothing is ever more than one click away; less of a "conversation".
 *
 *   3. Curated + fill: `followUps` first, then top up from unused ROOT_CHIPS
 *      up to ~5 total, then "menu". A middle ground.
 *
 * Try each and keep the one that reads best.
 */
export function nextChips(intentId: string, asked: string[]): string[] {
  const intent = INTENTS[intentId];
  const followUps = intent ? intent.followUps.filter((id) => id !== intentId) : [];
  void asked;
  return [...followUps, "menu"];
}
