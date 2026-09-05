export type TimelineEvent = {
  id: string;
  track: "software" | "music";
  title: string;
  detail: string;
  start: number;
  end?: number;
  kind?: "role" | "education" | "milestone";
};

/** Time axis for the center spine. */
export const TIMELINE_RANGE = { from: 2021, to: 2027 } as const;

export const timelineEvents: TimelineEvent[] = [
  {
    id: "nu-cs",
    track: "software",
    title: "B.S. Computer Science, Northwestern",
    detail: "GPA 3.98.",
    start: 2021,
    end: 2025,
    kind: "education",
  },
  {
    id: "nu-flute",
    track: "music",
    title: "B.M. Flute Performance, Northwestern",
    detail: "Studied performance alongside computer science.",
    start: 2021,
    end: 2025,
    kind: "education",
  },
  {
    id: "algo-research",
    track: "software",
    title: "Algorithm Design research intern",
    detail: "Approximation algorithms for active-time scheduling, advised by Prof. Samir Khuller.",
    start: 2022,
    end: 2022,
    kind: "role",
  },
  {
    id: "skuy",
    track: "software",
    title: "SKUY — lead backend engineer",
    detail: "Northwestern Garage startup, ~15 engineers. Flask/PostgreSQL APIs, news feed for 1,000+ users.",
    start: 2022,
    end: 2024,
    kind: "role",
  },
  {
    id: "netlogo",
    track: "software",
    title: "NetLogo Web — software engineer & OSS",
    detail: "Northwestern Center for Connected Learning. TypeScript editor on CodeMirror 6.",
    start: 2022,
    end: 2024,
    kind: "role",
  },
  {
    id: "mathworks",
    track: "software",
    title: "MathWorks — software engineer intern",
    detail: "Parser-combinator architecture in Simulink; async init layer for the MATLAB test framework.",
    start: 2023,
    end: 2023,
    kind: "role",
  },
  {
    id: "cookie",
    track: "software",
    title: "Cookie Flute Studio",
    detail: "Real-time practice platform for flutists. Next.js, Web Audio API, MusicXML, serverless AWS.",
    start: 2026,
    kind: "role",
  },

  {
    id: "pivot-2024",
    track: "music",
    title: "Went all-in on flute",
    detail: "Chose intensive conservatory-track training and competitions to find my ceiling as a player.",
    start: 2024,
    kind: "milestone",
  },
  {
    id: "atlantic",
    track: "music",
    title: "Atlantic Music Festival",
    detail: "May–September 2024, on scholarship.",
    start: 2024,
    end: 2024,
    kind: "milestone",
  },
  {
    id: "social",
    track: "music",
    title: "Built a flute audience online",
    detail: "2025: started posting playing on TikTok and Douyin and grew a large following.",
    start: 2025,
    kind: "milestone",
  },
  {
    id: "nec",
    track: "music",
    title: "M.M. Flute Performance, New England Conservatory",
    detail: "Flute Performance & Music Technology, on scholarship. GPA 4.0.",
    start: 2025,
    end: 2027,
    kind: "education",
  },
  {
    id: "pappoutsakis",
    track: "music",
    title: "Pappoutsakis Flute Competition",
    detail: "2026: William H. Grass Memorial Prize (2nd prize).",
    start: 2026,
    kind: "milestone",
  },
  {
    id: "nfa",
    track: "music",
    title: "National Flute Association convention",
    detail: "Performed at the 2026 NFA convention.",
    start: 2026,
    kind: "milestone",
  },
];
