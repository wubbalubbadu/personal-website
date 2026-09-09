export type Project = {
  slug: string;
  name: string;
  size: "flagship" | "standard" | "small";
  status: "Active" | "In progress" | "Archived";
  year: string;
  role: string;
  tech: string[];
  blurb: string;
  /** Detail body. Blank lines (`\n\n`) split it into paragraphs. */
  detail: string;
  image?: string;
  links?: { label: string; href: string }[];
  /** Inline audio players shown in the detail view. */
  audio?: { label: string; src: string }[];
  /** Sub-projects listed inside the detail view (for collection cards). */
  items?: {
    name: string;
    blurb?: string;
    tech?: string[];
    audio?: { label: string; src: string }[];
    href?: string;
  }[];
  /** If set, selecting this project navigates here instead of opening a detail view. */
  externalHref?: string;
};

export const projects: Project[] = [
  {
    slug: "cookie-flute-studio",
    name: "Cookie Flute Studio",
    size: "flagship",
    status: "Active",
    year: "2026",
    role: "Solo design & development",
    tech: ["Next.js", "TypeScript", "Web Audio API", "MusicXML", "AWS"],
    blurb: "A real-time practice platform for flutists with score-following pitch feedback.",
    detail:
      "A practice tool for flutists that listens while you play. Its score-following engine matches live pitch detection against parsed MusicXML, so you get per-note intonation feedback in real time, not just one overall score at the end. Around that core there's repertoire management, in-app score annotation, and practice-session tracking.\n\nAn insights layer aggregates the per-note data across sessions to surface the passages you keep missing. Built with Next.js and TypeScript on the Web Audio API, with a serverless AWS backend (S3, Lambda, API Gateway, DynamoDB). Still in active development, with more practice tools on the way.",
    links: [{ label: "Open Cookie Flute Studio", href: "/flute-studio" }],
  },
  {
    slug: "learning-log",
    name: "Learning Log",
    size: "standard",
    status: "Active",
    year: "2026",
    role: "Solo",
    tech: ["Next.js", "TypeScript", "Web Audio API", "SVG"],
    blurb: "My class notes, rebuilt as an interactive textbook you can read or click through.",
    detail:
      "An experiment in what a textbook can be. I take lecture notes from a course and rebuild them as a two-mode guide — a flowing reader and a keyboard-driven slide deck over the same content model — with collapsible asides, self-check quizzes, and localStorage progress. The first entry is a CMU deep-learning-for-music course: digital-audio fundamentals with hand-built Web Audio demos (sampling and aliasing, additive synthesis, a live spectrogram), then the theory of latent generative models.",
    externalHref: "/learning-log",
  },
  {
    slug: "music-playground",
    name: "Music Playground",
    size: "small",
    status: "Active",
    year: "2025",
    role: "Solo",
    tech: ["Logic Pro", "EastWest", "Web Audio"],
    blurb: "Smaller music tools and sound experiments, with more to come.",
    detail: "A place for smaller music-related things I build or make.",
    items: [
      {
        name: "Orchestral mock-ups",
        blurb:
          "Classical pieces produced in Logic Pro from sampled instruments (EastWest libraries), mixed so they read as recordings rather than MIDI.",
        tech: ["Logic Pro", "EastWest"],
        audio: [
          { label: "Chopin", src: "/audio/chopin-mockup.mp3" },
          { label: "Stravinsky, Octet", src: "/audio/stravinsky-octet-mockup.mp3" },
        ],
      },
    ],
  },
  {
    slug: "market",
    name: "Market",
    size: "standard",
    status: "Archived",
    year: "2023",
    role: "Full-stack, with Julia Chu",
    tech: ["React", "Node.js", "PostgreSQL"],
    blurb: "A secondhand marketplace for Northwestern students.",
    detail:
      "A marketplace for Northwestern students to buy, sell, and request secondhand items. We worked across the whole thing: listings, search, accounts, image uploads, authentication, and the API behind them.",
    image: "/portfolio/market.png",
  },
  {
    slug: "skuy",
    name: "SKUY",
    size: "standard",
    status: "Archived",
    year: "2022–2024",
    role: "Lead backend engineer",
    tech: ["React Native", "Flask", "PostgreSQL", "Firebase"],
    blurb: "A mobile community and news app built around Northwestern student life.",
    detail:
      "Lead backend engineer on a student startup of about 15 engineers. I built APIs for communities and posts, scraping pipelines that fed a news feed for 1,000+ users, cut initial load about 35% with pagination and lazy loading, and ran a PostgreSQL to Firebase migration. I also owned deployment and onboarding.",
    image: "/portfolio/skuy.png",
  },
];

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}
