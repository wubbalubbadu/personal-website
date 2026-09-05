export type ResumeRole = {
  org: string;
  role: string;
  location?: string;
  start: string;
  end: string;
  track: "software" | "music";
  tech: string[];
  bullets: string[];
};

export type ResumeEducation = {
  school: string;
  degree: string;
  detail?: string;
  start: string;
  end: string;
  gpa?: string;
};

export type Resume = {
  name: string;
  tagline: string;
  contact: { email: string; phone: string; linkedin: string; github: string };
  experience: ResumeRole[];
  education: ResumeEducation[];
  skills: Record<string, string[]>;
  pdf: string;
};

export const resume: Resume = {
  name: "Haylie Wu",
  tagline: "Software developer and flutist",
  contact: {
    email: "hayliewu0709@gmail.com",
    phone: "(669) 264-8245",
    linkedin: "linkedin.com/in/haylie-wu",
    github: "github.com/wubbalubbadu",
  },
  experience: [
    {
      org: "Cookie Flute Studio",
      role: "Creator",
      start: "2026",
      end: "Present",
      track: "software",
      tech: ["Next.js", "TypeScript", "Web Audio API", "MusicXML", "AWS"],
      bullets: [
        "Real-time score-following engine aligning autocorrelation pitch detection from live audio with parsed MusicXML for per-note intonation feedback.",
        "Full-stack practice platform: repertoire management, score annotation, practice tracking, serverless AWS pipeline (S3, Lambda, API Gateway, DynamoDB).",
        "Practice-insights engine that aggregates note-level pitch data across sessions to surface recurring problem passages.",
      ],
    },
    {
      org: "MathWorks",
      role: "Software Engineer Intern",
      start: "Jun 2023",
      end: "Sep 2023",
      track: "software",
      tech: ["JavaScript", "MATLAB", "C++", "Node.js", "Express", "MongoDB"],
      bullets: [
        "Designed a 2D parser-combinator architecture in Simulink that composes reusable parsers to validate tabular Excel test data, with multi-error handling and inline diagnostics.",
        "Built a centralized asynchronous initialization layer for the MATLAB test framework, cutting startup latency ~30% while improving testability.",
        "Shipped two full-stack features for MATLAB R2024a and an internal Node/Express/MongoDB bug-triage tool used in sprint planning.",
      ],
    },
    {
      org: "Northwestern Center for Connected Learning",
      role: "Software Engineer & Open Source Contributor",
      start: "Sep 2022",
      end: "Jun 2024",
      track: "software",
      tech: ["TypeScript", "Svelte", "CoffeeScript", "Ractive.js", "Jest"],
      bullets: [
        "Built and shipped a TypeScript NetLogo Web editor with CodeMirror 6, replacing the legacy CodeMirror 5 UI, with syntax highlighting and autocompletion.",
        "Developed an interactive drawing tool for creating and reusing custom agent shapes across simulation models.",
        "Contributed to ChatLogo, a GPT-4-powered in-editor assistant; automated testing, versioning, and deployment with GitHub Actions.",
      ],
    },
    {
      org: "SKUY",
      role: "Lead Backend Software Engineer",
      location: "Northwestern Garage startup, ~15 engineers",
      start: "May 2022",
      end: "Aug 2024",
      track: "software",
      tech: ["React Native", "Flask", "PostgreSQL", "Python", "Firebase", "Heroku"],
      bullets: [
        "Built and maintained the backend and several frontend features for a mobile social platform: Flask/PostgreSQL APIs and scraping pipelines powering a news feed for 1,000+ users.",
        "Redesigned pagination and lazy loading for feeds and profiles, cutting initial load time ~35%.",
        "Migrated data from PostgreSQL to Firebase with a transition path for existing users; owned Heroku/App Store releases and new-engineer onboarding.",
      ],
    },
    {
      org: "Northwestern Algorithm Design Research",
      role: "Research Intern, advised by Prof. Samir Khuller",
      start: "Jun 2022",
      end: "Sep 2022",
      track: "software",
      tech: ["Python", "Gurobi"],
      bullets: [
        "Developed and analyzed approximation algorithms for active-time scheduling on heterogeneous machines using dynamic programming and lazy-activation techniques.",
      ],
    },
  ],
  education: [
    {
      school: "New England Conservatory of Music",
      degree: "M.M. Flute Performance & Music Technology",
      detail: "Scholarship",
      start: "Aug 2025",
      end: "May 2027",
      gpa: "4.0",
    },
    {
      school: "Northwestern University",
      degree: "B.S. Computer Science and B.M. Flute Performance",
      start: "Sep 2021",
      end: "Jun 2025",
      gpa: "3.98",
    },
  ],
  skills: {
    Languages: ["Python", "TypeScript", "JavaScript", "Java", "C++", "SQL", "MATLAB"],
    Frontend: ["React", "Next.js", "React Native", "Svelte"],
    Backend: ["Node.js", "Express", "Flask", "PostgreSQL", "MongoDB", "Firebase"],
    "Cloud & tools": ["AWS", "Heroku", "Git", "GitHub Actions", "Gurobi"],
  },
  pdf: "/haylie-wu-resume.pdf",
};

export const resumeTechTags: string[] = Array.from(
  new Set(resume.experience.flatMap((role) => role.tech)),
).sort((a, b) => a.localeCompare(b));
