export type Project = {
  slug: string;
  name: string;
  size: "flagship" | "standard" | "small";
  status: "Active" | "In progress" | "Archived";
  year: string;
  role: string;
  tech: string[];
  blurb: string;
  detail: string;
  image?: string;
  links?: { label: string; href: string }[];
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
      "It uses Next.js, TypeScript, the Web Audio API, MusicXML, and a serverless AWS backend (S3, Lambda, API Gateway, DynamoDB). A score-following engine matches live-audio pitch detection against parsed MusicXML for per-note intonation feedback. There's also repertoire management, score annotation, practice tracking, and an insights engine that surfaces recurring problem passages. It's still in active development.",
    externalHref: "/flute-studio",
  },
  {
    slug: "qr-tree",
    name: "QR Tree",
    size: "standard",
    status: "In progress",
    year: "2026",
    role: "Solo",
    tech: ["Three.js", "Canvas"],
    blurb: "Turns a scannable QR code into a rotatable 3D object and back.",
    detail:
      "It turns a scannable QR code into a blocky, Minecraft-style tree you can rotate in 3D, then collapses it back into a readable 2D code. The hard part is the constraint I'm still working through: making the transformation playful without destroying the information that keeps the code scannable.",
    image: "/portfolio/qr-tree.svg",
    externalHref: "/qr-tree",
  },
  {
    slug: "cat-structures",
    name: "Cat-emoji data structures",
    size: "small",
    status: "In progress",
    year: "2026",
    role: "Solo",
    tech: ["TypeScript", "SVG"],
    blurb: "Visualizes CS data structures with cat emojis 🐱. Stacks, queues, trees, graphs.",
    detail:
      "A small teaching toy: watch a stack, queue, linked list, or binary tree operate step by step, with each node drawn as a cat emoji. Push, pop, enqueue, traverse — the cats move so the operation is obvious.",
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
