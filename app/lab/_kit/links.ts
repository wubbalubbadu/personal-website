/**
 * Copy and destinations shared by the three landing prototypes in app/lab.
 * Every visible string lives here so Haylie can approve them in one place.
 * Facts reuse the approved greeting in app/lib/answers.ts.
 */
import { projects } from "../../lib/projects";

export const COPY = {
  name: "Haylie Wu",
  hello: "Hi, I'm Haylie!",
  /** The who-she-is line. Has to make sense in 3 seconds from an Instagram tap. */
  who: "I'm doing my master's in flute performance at New England Conservatory. I have a computer science degree from Northwestern, and I build music software.",
  nowTitle: "What I'm up to",
  contactLine: "Email is the best way to reach me, I actually check it.",
};

export type Place = {
  id: "studio" | "log" | "flute" | "projects" | "contact";
  label: string;
  line: string;
  /** Longer plain description for detail views. */
  more: string;
  /** Last update, shown as the memory card's "last saved". Placeholder dates from git. */
  saved: string;
  /** Direct link. Places without one open a sheet instead. */
  href?: string;
  cta?: string;
};

export const PLACES: Place[] = [
  {
    id: "studio",
    label: "Cookie Flute Studio",
    line: "A practice app I'm building for flutists.",
    more: "A practice app for flutists that I'm building right now. It writes out any scale you want, listens to your long tones to check your tuning, and shows fingerings for every note. It runs in your browser, in English and Chinese.",
    saved: "10.19.26",
    href: "/flute-studio",
    cta: "Open Cookie Flute Studio",
  },
  {
    id: "log",
    label: "Learning Log",
    line: "My notes on AI and music, as an interactive textbook.",
    more: "Class notes on AI for music, rebuilt as an interactive textbook. Most pages have a little demo you can click and hear, from how sound is sampled to how music models write notes.",
    saved: "10.09.26",
    href: "/learning-log",
    cta: "Open the Learning Log",
  },
  {
    id: "flute",
    label: "Flute videos",
    line: "Performances and short clips I post.",
    more: "Competition footage, plus the short videos I post. Most are pieces I arrange and make my own backing tracks for.",
    saved: "09.10.26",
  },
  {
    id: "projects",
    label: "Projects",
    line: "Other software I've built.",
    more: "Apps I've built with friends and on my own, from a campus marketplace to a student news app.",
    saved: "09.19.26",
  },
  {
    id: "contact",
    label: "Say hi",
    line: "Email, links and my résumé.",
    more: "Email is the best way to reach me, I actually check it.",
    saved: "09.05.26",
  },
];

export const place = (id: Place["id"]) => PLACES.find((p) => p.id === id)!;

export type LinkItem = { label: string; sub?: string; href: string };

/** Copied from SOCIALS in app/canvas/FluteView.tsx (not exported there).
 * Move both to app/lib/socials.ts once a direction is picked. */
export const FLUTE_LINKS: LinkItem[] = [
  {
    label: "Competition footage",
    sub: "YouTube",
    href: "https://www.youtube.com/watch?v=ya3cFeMKD14&t=649s",
  },
  { label: "TikTok", sub: "@wubulubadudu", href: "https://www.tiktok.com/@wubulubadudu" },
  {
    label: "Douyin",
    sub: "抖音",
    href: "https://www.douyin.com/user/MS4wLjABAAAANmZhGUqfg9pD4Rt3zrGjNp2Zv9hmMoyigTUdx-7VOjI",
  },
  {
    label: "RedNote",
    sub: "小红书",
    href: "https://www.xiaohongshu.com/user/profile/5ff14b680000000001005c3f?xsec_token=AB_QdIGvTodBcRypHv1TDc158LFVM3a2yqUAjKjgVLHvU%3D&xsec_source=pc_search",
  },
  // The music résumé is deliberately not linked: Haylie doesn't want it online.
];

export const CONTACT_LINKS: LinkItem[] = [
  { label: "hayliewu0709@gmail.com", sub: "Email", href: "mailto:hayliewu0709@gmail.com" },
  { label: "LinkedIn", sub: "haylie-wu", href: "https://linkedin.com/in/haylie-wu" },
  { label: "GitHub", sub: "wubbalubbadu", href: "https://github.com/wubbalubbadu" },
  { label: "Résumé", sub: "PDF", href: "/haylie-wu-resume.pdf" },
];

/** Shorter lines for projects whose blurb in projects.ts has a dash or runs long. */
const PROJECT_LINES: Record<string, string> = {
  "cookie-flute-studio": "A practice studio for flutists. The sheet music is generated in the browser, not stored as files.",
};

export type ProjectRow = {
  slug: string;
  name: string;
  year: string;
  status: string;
  line: string;
  /** The longer description from projects.ts, for places with room to read it. */
  detail: string;
  image?: string;
  href?: string;
  audio?: { label: string; src: string }[];
};

export const PROJECT_ROWS: ProjectRow[] = projects.map((p) => ({
  slug: p.slug,
  name: p.name,
  year: p.year.replace("–", " to "),
  status: p.status,
  line: PROJECT_LINES[p.slug] ?? p.blurb,
  // Some details in projects.ts still use dashes; never show one.
  detail: p.detail.split("\n\n")[0].replace(/\s*[—–]\s*/g, ", "),
  image: p.image,
  href: p.externalHref ?? p.links?.[0]?.href,
  audio: p.audio ?? p.items?.flatMap((i) => i.audio ?? []),
}));

export const opensNewTab = (href: string) => href.startsWith("http") || /\.[a-z0-9]+$/i.test(href);
