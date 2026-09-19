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
    tech: [
      "Next.js",
      "TypeScript",
      "MusicXML",
      "OpenSheetMusicDisplay",
      "Web Audio API",
      "three.js",
      "Cloudflare Workers",
    ],
    blurb:
      "A practice studio for flutists where the sheet music is generated, not stored — scales, long tones and fingering charts computed from a model and engraved in the browser.",
    detail:
      "Most practice apps ship sheet music as files. This one mostly doesn't have any. A scale, a long-tone exercise and a fingering chart are all the same kind of object — a rule about pitch — so the studio stores the rule and emits MusicXML on demand, then engraves it client-side with OpenSheetMusicDisplay. Changing the articulation pattern or the range re-generates the score rather than swapping a picture of one.\n\nThat decision is what makes the rest possible: every exercise is parameterised, nothing goes stale, and the same engine renders a twelve-key scale book, Moyse's De la sonorité and a four-octave trill chart. The work is mostly in the places where a general-purpose engraver and a practice tool disagree — pagination, enharmonic spelling, and what to do when a student's range doesn't match the book's.\n\nBuilt as a single Next.js app in TypeScript, deployed on Cloudflare Workers, fully bilingual (English/中文). Notation by OpenSheetMusicDisplay over VexFlow; audio, tuning and playback on the Web Audio API; the anatomy views in three.js.\n\nNext: score-following. The pitch tracker currently powers a standalone tuner; the work in progress is matching that live estimate against the engraved score note by note, so intonation feedback lands on the passage you actually played rather than as one number at the end — and an insights layer that aggregates it across sessions to surface the bars you keep missing.",
    links: [{ label: "Open Cookie Flute Studio", href: "/flute-studio" }],
    items: [
      {
        name: "A scale as data, not a file",
        blurb:
          "Each scale type is an interval set, a letter-class sequence, a chord and a reach — which generalises past seven notes per octave, so chromatic, whole-tone, diminished and augmented scales fall out of the same generator rather than needing hand-written exceptions. Accidentals are spelled by direction of travel (flats descending, sharps ascending) because a chromatic scale has no key signature to infer them from.",
        tech: ["MusicXML generation", "Enharmonic spelling"],
      },
      {
        name: "Engraving the browser wasn't designed for",
        blurb:
          "Page-turn mode measures the rendered systems and computes page offsets itself, since OSMD's own pagination assumes fixed paper. Line breaks are rebalanced by measuring how many notes the first system actually fits, then re-emitting the XML with explicit breaks — the naive pass wraps at one measure per line because the container hasn't been laid out at its real width yet.",
        tech: ["OpenSheetMusicDisplay", "VexFlow", "Layout measurement"],
      },
      {
        name: "Vector PDF export",
        blurb:
          "Downloading a book spins up a second OSMD instance off-screen, engraves at a fixed traditional staff size, and maps each A4 page 1:1 onto a PDF page — so the file carries the engraver's margins rather than the print stylesheet's. Output is vector, not screenshots, and flate compression takes a twelve-page book from 1.4 MB to 247 KB.",
        tech: ["svg2pdf", "jsPDF", "Off-screen rendering"],
      },
      {
        name: "Pitch tracking",
        blurb:
          "The tuner runs a difference-function pitch estimator over the Web Audio time-domain buffer, gated on RMS so room noise doesn't register, then median-filters the last few frames and requires consecutive agreeing frames before it commits to a note — with hysteresis, so a held pitch doesn't flicker between neighbours at the boundary.",
        tech: ["Web Audio API", "Autocorrelation", "Signal smoothing"],
      },
      {
        name: "One fingering dataset, two directions",
        blurb:
          "Fingerings are indexed both by sounding pitch and by key shape, so the chart runs backwards: press keys on the diagram and it tells you what sounds. The mechanically linked foot keys are declared once and applied to every fingering rather than typed out per note, which is exactly how the low notes and the altissimo had drifted apart in the hand-written table it replaced.",
        tech: ["Reverse indexing", "SVG diagrams"],
      },
      {
        name: "Annotation, playback and practice history",
        blurb:
          "Scores take canvas ink and draggable text notes; playback synthesises a flute tone per note with articulation-aware envelopes; a drone and metronome run from a shared audio context so they stay in step. Sessions are recorded and rolled up into a practice calendar that shows the shape of a month at a glance.",
        tech: ["Canvas", "Web Audio API", "localStorage"],
      },
    ],
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
