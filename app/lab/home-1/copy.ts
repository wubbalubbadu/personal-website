/**
 * Everything the cat's room says, in the visitor's language. English comes from
 * studio.ts, links.ts and app/lib/answers.ts; Chinese from _kit/zh.ts, laid
 * over the English so anything not translated falls back instead of going blank.
 */
import { INTENTS, type AnswerNode, type RichSeg } from "../../lib/answers";
import { PROJECT_ROWS, type ProjectRow } from "../_kit/links";
import { DESKTOP_LINE, ITEMS, LOOKS, QUESTIONS, SNACK_LINES, SNACK_MILESTONES, type Item, type ItemId, type Question } from "../_kit/studio";
import type { Lang } from "../_kit/lang";
import { ZH } from "../_kit/zh";

export const TOPICS = ["background", "flute", "projects"] as const;
export type Topic = (typeof TOPICS)[number];

/** The live answers point at a side panel this page doesn't have. */
const FIXES: [string, string][] = [[" The full list is on the right, open any of them.", ""]];
export const fix = (t: string) => FIXES.reduce((s, [a, b]) => s.replace(a, b), t);

export const nodeText = (n: AnswerNode) =>
  n.kind === "text" ? n.value : n.kind === "rich" ? n.segments.map((s) => s.text).join("") : "";

/** The laptop browses the main projects, one at a time; the music and the
 *  OpenMusic patches live only on the projects page ("See all projects"). */
const APPS_EN: ProjectRow[] = PROJECT_ROWS.filter((p) => p.slug !== "music-playground" && p.slug !== "openmusic");

/* Who she is first (flutist and software engineer), then what she does, then the schools. */
const INTRO_EN =
  "Hi, I'm Haylie Wu! I'm a flutist and software engineer. I perform, teach, and build software for musicians. I studied computer science and flute at Northwestern, and I'm completing my master's in flute performance at New England Conservatory.";

const UI_EN = {
  nextProject: "Next project",
  open: (name: string) => `Open ${name}`,
  details: "Full details",
  allProjects: "See all projects",
  anotherLook: "Try another look?",
  emailMe: "Email me",
  seeAll: "See all projects ›",
  next: "Next",
  mute: "Mute the voice",
  unmute: "Turn on the voice",
  askMe: "Ask me",
  things: "Things in the room",
  letterCard: "Write to me!",
  watchOnTikTok: "Not playing? Watch on TikTok ›",
  guide: {} as Record<string, string>,
};

/**
 * Long paragraphs split at sentences so each page fits the bubble. A Chinese
 * character is about twice as wide as a Latin letter, so pages hold half as many.
 * A last page shorter than `min` joins the one before, so there's no lone
 * sentence to click through; a short paragraph rides along with the page before it.
 */
function pager(zh: boolean) {
  const max = zh ? 150 : 330;
  const min = zh ? 50 : 110;
  const paginate = (nodes: AnswerNode[]): AnswerNode[] =>
    nodes.flatMap((node) => {
      if (node.kind !== "text" || fix(node.value).length <= max) return [node];
      const sentences = fix(node.value).match(/[^.!?。！？]+[.!?。！？]+\s*/g) ?? [node.value];
      const out: string[] = [];
      for (const s of sentences) {
        const prev = out[out.length - 1];
        if (prev !== undefined && (prev + s).length <= max) out[out.length - 1] = prev + s;
        else out.push(s);
      }
      const tail = out[out.length - 1];
      if (out.length > 1 && tail.trim().length < min) out[out.length - 2] += out.pop();
      return out.map((value) => ({ kind: "text" as const, value: value.trim() }));
    });
  const foldShort = (nodes: AnswerNode[]): AnswerNode[] => {
    const segs = (n: AnswerNode): RichSeg[] => (n.kind === "text" ? [{ text: n.value }] : n.kind === "rich" ? n.segments : []);
    return nodes.reduce<AnswerNode[]>((out, node) => {
      const prev = out[out.length - 1];
      if (prev && nodeText(node).length < min && nodeText(prev).length + nodeText(node).length <= max + min) {
        out[out.length - 1] = { kind: "rich", segments: [...segs(prev), { text: zh ? "" : " " }, ...segs(node)] };
      } else out.push(node);
      return out;
    }, []);
  };
  /** A scripted answer ready for the bubble: no link lists, no music résumé
   * (Haylie doesn't want it online), long paragraphs paged. */
  const answerPages = (topic: Topic): AnswerNode[] => {
    const nodes: AnswerNode[] = zh
      ? ZH.answers[topic].map((value) => ({ kind: "text", value }))
      : INTENTS[topic].answer
          .filter((x) => x.kind !== "linkList")
          .map((x) =>
            x.kind === "rich" ? { ...x, segments: x.segments.filter((g) => !("href" in g && g.href.includes("music-resume"))) } : x,
          );
    return foldShort(paginate(nodes));
  };
  return { paginate, answerPages };
}

export type Copy = ReturnType<typeof copyFor>;

export function copyFor(lang: Lang) {
  const zh = lang === "zh";
  const { paginate, answerPages } = pager(zh);
  const base = {
    lang,
    paginate,
    answerPages,
    /** A count the way TikTok writes it: 296.4K, 1.3M; 29.6万 in Chinese. */
    count: (n: number) => {
      const short = (v: number, unit: string) => `${Number(v.toFixed(1))}${unit}`;
      if (zh) return n >= 1e8 ? short(n / 1e8, "亿") : n >= 1e4 ? short(n / 1e4, "万") : String(n);
      return n >= 1e6 ? short(n / 1e6, "M") : n >= 1e3 ? short(n / 1e3, "K") : String(n);
    },
    /** Chinese runs sentences together with no space between them. */
    join: (lines: string[]) => lines.join(zh ? "" : " "),
  };
  if (!zh)
    return {
      ...base,
      intro: INTRO_EN,
      /** The background answer is all software, so it says so; otherwise someone
       *  curious about her flute background would pick it and be confused. */
      topicAsk: { background: "Tell me about your software background.", flute: INTENTS.flute.ask, projects: INTENTS.projects.ask } as Record<Topic, string>,
      items: ITEMS,
      questions: QUESTIONS,
      snackLines: SNACK_LINES,
      snackMilestones: SNACK_MILESTONES,
      looks: LOOKS,
      desktopLine: DESKTOP_LINE,
      apps: APPS_EN,
      ui: UI_EN,
    };

  const items = Object.fromEntries(
    (Object.keys(ITEMS) as ItemId[]).map((id) => {
      const en = ITEMS[id];
      const t: { name: string; react: string; body: string; open?: string } = ZH.items[id];
      const item: Item = { ...en, name: t.name, react: t.react, body: t.body || en.body };
      if (en.open && t.open) item.open = { ...en.open, label: t.open };
      return [id, item];
    }),
  ) as Record<ItemId, Item>;
  const questions = Object.fromEntries(
    Object.entries(QUESTIONS).map(([id, set]) => [
      id,
      Object.fromEntries(
        Object.entries(set ?? {}).map(([key, en]) => {
          const t = (ZH.questions as Record<string, Record<string, { ask: string; say: string; open?: string; href?: string }>>)[id]?.[key];
          if (!t) return [key, en];
          const q: Question = { ...en, ask: t.ask, say: t.say };
          if (en.open && t.open) q.open = { label: t.open, href: t.href ?? en.open.href };
          return [key, q];
        }),
      ),
    ]),
  ) as typeof QUESTIONS;

  return {
    ...base,
    intro: ZH.intro,
    topicAsk: ZH.topicAsk as Record<Topic, string>,
    items,
    questions,
    snackLines: ZH.snackLines,
    snackMilestones: ZH.snackMilestones,
    looks: LOOKS.map((l, i) => ({ ...l, line: ZH.looks[i] ?? l.line })),
    desktopLine: ZH.desktopLine,
    apps: APPS_EN.map((p) => {
      const t = ZH.projects[p.slug];
      return {
        ...p,
        name: t?.name ?? p.name,
        preview: t?.preview ?? p.preview,
        status: ZH.status[p.status] ?? p.status,
        year: p.year.replace(" to ", ZH.yearTo),
      };
    }),
    ui: ZH.ui,
  };
}
