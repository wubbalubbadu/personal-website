// What's in the cat's room and what she says about each thing, shared by the
// Cat host (lab/home-1) and the 3D handheld (the home page). Drafts for Haylie.
import { CONTACT_LINKS, COPY, FLUTE_LINKS, type LinkItem } from "./links";
import { getProject } from "../../lib/projects";
import type { MascotMood, Outfit } from "../../components/ps1-mascot";

/* ---- what's in the room ---- */

export type ItemId =
  | "diploma" | "resume" | "socials" | "laptop" | "book" | "letter" | "flute" | "ipad" | "cookies"
  // the living room
  | "closet" | "stand" | "window" | "jar" | "cushion";

export type Item = {
  name: string;
  /** What the cat says when you inspect it (in the bubble). */
  react: string;
  /** The item card's paragraph. Drafts for Haylie to edit. */
  body: string;
  open?: { label: string; href: string };
  links?: LinkItem[];
  /** Inspecting zooms into the laptop's screen and opens its desktop. */
  desktop?: boolean;
  /** The cat picks it up and plays. */
  plays?: boolean;
  /** What the cat does when you inspect it (eat, nap); `plays` means flute. */
  mood?: MascotMood;
  /** A snack: the cat eats one, the counter goes up, it says one of SNACK_LINES. */
  snack?: boolean;
  /** The dress-up closet: each inspect puts on the next of LOOKS. */
  closet?: boolean;
  /** Inspecting runs this whole conversation from app/lib/answers.ts instead of `body`. */
  topic?: "flute" | "background" | "projects";
};

export const ITEMS: Record<ItemId, Item> = {
  diploma: {
    name: "Diploma",
    react: "My diploma!",
    body: "I studied computer science and flute performance at Northwestern. Now I'm doing my master's in flute performance at New England Conservatory, and I've kept building software the whole time.",
  },
  resume: {
    name: "Résumé",
    react: "Everything's on here.",
    body: "My software résumé: features shipped at MathWorks, leading the backend at a startup, and tools and research at Northwestern.",
    open: { label: "Open my résumé", href: "/haylie-wu-resume.pdf" },
  },
  socials: {
    name: "Social media",
    react: "Come find me online!",
    body: "I share performances and short clips online, around 240k followers across TikTok, Douyin, WeChat Channels and RedNote.",
    links: FLUTE_LINKS.filter((l) => l.label !== "Competition footage"),
  },
  laptop: {
    name: "Laptop",
    react: "My projects live in here.",
    body: "",
    desktop: true,
  },
  // The Learning Log has its own book on the desk, and stays on the laptop too.
  book: {
    name: "Learning Log",
    react: "My study notes!",
    body: getProject("learning-log")?.preview ?? "",
    open: { label: "Open the Learning Log", href: "/learning-log" },
  },
  letter: {
    name: "Letter",
    react: "Write to me!",
    // the address itself, so you can read it without opening mail
    body: `${COPY.contactLine} It's ${COPY.email}.`,
    links: CONTACT_LINKS.filter((l) => l.label !== "Résumé"),
  },
  flute: {
    name: "Flute",
    react: "Let me play you something.",
    body: "I'm doing my master's in flute performance at New England Conservatory. I compete, teach, and share performances online.",
    plays: true,
  },
  ipad: {
    name: "Cookie Flute Studio",
    react: "My practice app!",
    body: "Cookie Flute Studio is the practice app I'm building for flutists. It runs in your browser, in English and Chinese.",
    open: { label: "Open Cookie Flute Studio", href: "/flute-studio" },
  },
  // The fun things: no links, the cat just does something. Drafts for Haylie.
  cookies: { name: "Cookies", react: "", body: "", snack: true, mood: "eat" },
  jar: { name: "Cookie jar", react: "", body: "", snack: true, mood: "eat" },
  closet: { name: "Closet", react: "", body: "", closet: true },
  cushion: { name: "Cushion", react: "", body: "Five more minutes.", mood: "sleep" },
  stand: { name: "Music stand", react: "", body: "Long tones first. Always.", plays: true },
  window: { name: "Window", react: "", body: "Good light for practising." },
};

/**
 * Some things open their own questions when you inspect them, the way the hello
 * offers background, flute and projects. Drafts for Haylie's tone pass: facts
 * only from what she has approved, app/lib/projects.ts, and her teaching.
 */
export type Question = { ask: string; say: string; open?: { label: string; href: string }; links?: LinkItem[] };
export const QUESTIONS: Partial<Record<ItemId, Record<string, Question>>> = {
  flute: {
    now: {
      ask: "What are you working on right now?",
      say: "I'm doing my master's in flute performance at New England Conservatory on a scholarship, and I compete on the young-artist circuit. Next up, I'm recording études and putting them on YouTube.",
      open: { label: "Watch a competition round", href: FLUTE_LINKS[0].href },
    },
    training: {
      ask: "What's your training?",
      say: "I did a flute performance degree at Northwestern alongside computer science. Now I'm doing my master's in flute performance at New England Conservatory.",
    },
    teach: {
      ask: "Do you teach?",
      say: "Yes! I teach students from middle school through high school, and adult amateurs too. If you'd like lessons, write to me.",
      open: { label: "Ask about lessons", href: "mailto:hayliewu0709@gmail.com?subject=Flute%20lessons" },
    },
    online: {
      ask: "Where can I hear you play?",
      say: "Online, mostly. Around 240k people follow along on TikTok, Douyin, WeChat Channels and RedNote. Most of it is repertoire I arrange and produce my own accompaniment tracks for, to make classical music feel approachable to people who don't already listen to it.",
      links: FLUTE_LINKS.filter((l) => l.label !== "Competition footage"),
    },
  },
  laptop: {
    proud: {
      ask: "What are you proudest of?",
      say: "Cookie Flute Studio. Most practice apps store sheet music as image files. Mine stores the rule behind a scale, writes the notation itself and draws it in your browser. Change the key or the range and you get a fresh score, so one engine makes a twelve-key scale book, long tones and a four-octave trill chart.",
      open: { label: "Open Cookie Flute Studio", href: "/flute-studio" },
    },
    hard: {
      ask: "What was the hardest problem?",
      say: "Getting the sheet music to lay out properly. The notation library I use assumes printed paper, so on a phone it put one bar per line. Now I measure how many notes actually fit on the first line, then rewrite the music with line breaks in the right places. Page turns work the same way: I measure the drawn lines and work out each page myself.",
    },
    log: {
      ask: "What's Learning Log?",
      say: "My class notes, rebuilt as an interactive textbook you can read or click through like slides. The first one is a CMU course on deep learning for music, with demos you can play with: hear aliasing happen, build a sound from sine waves, watch a live spectrogram.",
      open: { label: "Open Learning Log", href: "/learning-log" },
    },
    before: {
      ask: "What did you build before?",
      say: "I was the lead backend engineer on SKUY, a student startup with about 15 engineers. I built its APIs and the scraping pipelines behind a news feed for 1,000+ users, cut first load by about 35%, and moved the database from PostgreSQL to Firebase.",
    },
    how: {
      ask: "What do you build with?",
      say: "Cookie Flute Studio is one Next.js app in TypeScript, designed and coded by me. The notation is engraved with OpenSheetMusicDisplay, the sound comes from the Web Audio API, the 3D is three.js, and it runs on Cloudflare Workers.",
    },
  },
  ipad: {
    what: {
      ask: "What does it do?",
      say: "Say you're working on long tones. Pick the note and the range, and it writes the exercise out for you. Turn on the drone, play, and watch your pitch line up with it, or not. Scales, études and fingering charts work the same way.",
    },
    different: {
      ask: "What makes it different?",
      say: "Most practice apps store sheet music as files. Mine mostly doesn't. It keeps the rule behind a scale or exercise and writes the music on the spot, so change the range or articulation and you get a fresh score.",
    },
  },
};


/** What the cat says with each cookie, in turn. */
export const SNACK_LINES: string[][] = [
  ["Crunch. Okay, just one.", "Long tones make me hungry. Nobody warns you about that.", "Fine. One more, for focus."],
  ["Don't tell my teacher.", "Crumbs in the flute keys mean a whole cleaning session.", "Worth it, though."],
  ["Practice break! Five minutes.", "Maybe ten.", "Okay, a cookie and then a nap. That's the plan."],
  ["Still warm. Someone loves me.", "Want one? I'll save you the biggest one.", "...I ate the biggest one. Sorry."],
  ["Fuel for long tones.", "Breath support starts in the stomach, so this counts as practice.", "That's my story and I'm sticking to it."],
  ["These are the good ones.", "Sugar cookies. Cat safe, flute safe, crumb heavy.", "Don't look at the desk."],
];
/** What she says on the nth cookie instead, when the count gets silly. */
export const SNACK_MILESTONES: Record<number, string[]> = {
  5: ["That's five.", "I'm cutting myself off.", "(I'm not.)"],
  10: ["Ten cookies.", "This is now a cookie recital.", "Please hold your applause until the end."],
  20: ["Twenty?!", "You're a bad influence.", "Thank you."],
};

/** The closet's looks, in turn, and what she says in each. Drafts for Haylie. */
export const LOOKS: { wear: Outfit[]; line: string }[] = [
  { wear: ["beret"], line: "A beret! Very artist. I'd paint you something, but my paws only know scales." },
  { wear: ["bow"], line: "My recital bow. Please hold your applause until the end of the piece." },
  { wear: ["glasses"], line: "Reading glasses. I look like I know what a Fourier transform is. I do, a little." },
  { wear: ["cap"], line: "The graduation cap again. I earned it, I'm wearing it." },
  { wear: ["apron"], line: "Apron on. Baker by day, flutist by night." },
  { wear: ["beret", "bow", "glasses", "apron"], line: "Everything at once. This is called fashion." },
  { wear: [], line: "Just me. Honestly, still the best look." },
];

/** Up looks at the wall, down at the desk; left and right move along a row. */
export const WALL: ItemId[] = ["diploma", "resume", "socials"];
export const DESK: ItemId[] = ["laptop", "letter", "book", "flute", "cookies"];
/** The desk has depth: up and down step between the back of it and the front.
 *  Down from the front goes to the living room; up from the back goes to the wall. */
export const DESK_DOWN: Partial<Record<ItemId, ItemId>> = { laptop: "letter", book: "letter", cookies: "flute" };
export const DESK_UP: Partial<Record<ItemId, ItemId>> = { letter: "laptop", flute: "cookies" };
/** The living room, one row, left to right. */
export const ROOM: ItemId[] = ["closet", "stand", "window", "cushion", "jar"];

export const DESKTOP_LINE =
  "Six things I've built live in here: my flute practice app, my Learning Log, two apps from college, my music production, and my OpenMusic patches.";
/** The little tune the cat plays when you pick up the flute. */
export const TUNE = [587.33, 659.25, 739.99, 783.99, 880, 783.99];
