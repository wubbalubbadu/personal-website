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
    // what the hello's "Tell me about your flute playing" says (her pick: it
    // reads better than the short line above, which stays as a fallback)
    topic: "flute",
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
export type Question = {
  ask: string;
  say: string;
  open?: { label: string; href: string };
  links?: LinkItem[];
  /** Plays on the console's own screen while she talks about it (an embed URL). */
  video?: string;
  /** Several short videos instead, one at a time, with "Next video" to step on. */
  videos?: Clip[];
};

/** One of her TikToks for the console, with its numbers as they stood on
 *  `COUNTS_ON` (TikTok's player shows none, and its site can't be read live). */
export type Clip = { src: string; title: string; likes: number; plays: number; href?: string };
/** A TikTok link as its embeddable player (TikTok's own, it plays inline),
 *  without its caption and "original sound" lines (her call: the console's
 *  own strip names the song). */
const tiktokEmbed = (url: string) => {
  const id = url.match(/video\/(\d+)/)?.[1];
  return id ? `https://www.tiktok.com/player/v1/${id}?autoplay=1&music_info=0&description=0&rel=0` : "";
};
const tiktok = (href: string, title: string, likes: number, plays: number): Clip => ({ src: tiktokEmbed(href), href, title, likes, plays });
/** When the counts below were copied from TikTok. Refresh them now and then. */
export const COUNTS_ON = "Nov 12, 2026";
/**
 * The short videos the social media poster plays ("Show me some of your
 * videos!"), in her order (Day 1, I Need U, XO); left and right step through
 * them. Add one with
 * its TikTok link, a title, and the likes and plays from its page.
 */
export const TIKTOK_PICKS: Clip[] = [
  tiktok("https://www.tiktok.com/@wubulubadudu/video/7549605355471260941", "Red Velvet · Day 1", 32500, 169400),
  tiktok("https://www.tiktok.com/@wubulubadudu/video/7538083046537317646", "BTS · I Need U", 185700, 701100),
  tiktok("https://www.tiktok.com/@wubulubadudu/video/7500666071444196651", "ENHYPEN · XO", 296400, 1300000),
];

/** The competition round, as an embed that starts at 9:44, the Papoutsakis (her pick). */
const COMPETITION_VIDEO = "https://www.youtube-nocookie.com/embed/ya3cFeMKD14?start=584&autoplay=1&playsinline=1&rel=0";
export const QUESTIONS: Partial<Record<ItemId, Record<string, Question>>> = {
  // Two questions, each with something to show for it, instead of four thin
  // ones (her note: too many choices, not enough in each). Teaching folds into
  // what she's doing now; the socials ride along with hearing her play.
  flute: {
    listen: {
      ask: "Can I hear you play?",
      say: "Here's a round from a competition, playing on the screen. Most of what I post is shorter: pieces I arrange and make my own backing tracks for, for around 240k people on TikTok, Douyin, WeChat Channels and RedNote.",
      video: COMPETITION_VIDEO,
      links: FLUTE_LINKS.filter((l) => l.label !== "Competition footage"),
    },
    now: {
      ask: "What are you working on now?",
      // her call: no button out to a mail app, just the address to write to
      say: "My master's in flute performance at New England Conservatory, on a scholarship, and competitions on the young-artist circuit. Next I'm recording études for YouTube. I teach too, from middle schoolers to adult amateurs. For lessons, email me at hayliewu0709@gmail.com.",
    },
  },
  socials: {
    videos: {
      ask: "Show me some of your videos!",
      say: "Here's one, playing on the screen. I arrange each piece and make the backing track myself, then film it. There are more on my pages.",
      videos: TIKTOK_PICKS,
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

/** Up looks at the wall, down at the desk, down again the living room; left
 *  and right move along a row and stop at its ends. The desk is one row, left
 *  to right as it reads on screen (her call: two rows with up and down between
 *  them was too hard to guess): laptop, letter, Learning Log, then the cat,
 *  then the flute and the cookies. */
export const WALL: ItemId[] = ["diploma", "resume", "socials"];
export const DESK: ItemId[] = ["laptop", "letter", "book", "flute", "cookies"];
/** The living room, one row, left to right. */
export const ROOM: ItemId[] = ["closet", "stand", "window", "cushion", "jar"];

export const DESKTOP_LINE =
  "Six things I've built live in here: my flute practice app, my Learning Log, two apps from college, my music production, and my OpenMusic patches.";
/** The little tune the cat plays when you pick up the flute. */
export const TUNE = [587.33, 659.25, 739.99, 783.99, 880, 783.99];
