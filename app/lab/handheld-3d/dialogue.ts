// The cat's dialogue for the 3D handheld, shown as a hologram the console
// projects above itself (her pick, Nov 10; the on-screen versions are gone).
// The talk itself (pages, choices, typing) lives in Dialogue. Copy is the live landing's
// (Cat host + lib/answers + lib/projects).
import { INTENTS, type AnswerNode } from "../../lib/answers";
import { PROJECT_ROWS, type LinkItem, type ProjectRow } from "../_kit/links";
import { DESK, DESKTOP_LINE, ITEMS, LOOKS, QUESTIONS, SNACK_LINES, SNACK_MILESTONES, WALL, type ItemId } from "../_kit/studio";
import type { MascotMood, Outfit } from "../../components/ps1-mascot/engine";

/** The screen's design size; the power-on overlay lays out in these units. */
export const UI_W = 960;
export const UI_H = 540;

const INTRO =
  "Hi, I'm Haylie Wu! I'm a flutist and software engineer. I perform, teach, and build software for musicians. I studied computer science and flute at Northwestern, and I'm completing my master's in flute performance at New England Conservatory.";

const TOPICS = ["background", "flute", "projects"] as const;
type Topic = (typeof TOPICS)[number];
const ASK: Record<Topic, string> = {
  background: "Tell me about your software background.",
  flute: INTENTS.flute.ask,
  projects: INTENTS.projects.ask,
};
// The live answers point at a side panel this page doesn't have (same fixes as Cat host).
const FIXES: [string, string][] = [
  [" The full list is on the right, open any of them.", ""],
  ["There's competition footage and a few clips on the right, plus my ", "There's competition footage on YouTube"],
  // Cat host shows the résumé as a link after that; as plain text it needs its own words
  ["on YouTubemusic résumé", "on YouTube, plus my music résumé"],
];
const nodeText = (n: AnswerNode) =>
  n.kind === "text" ? n.value : n.kind === "rich" ? n.segments.map((s) => s.text).join("") : "";

/** Sentences packed into pages that fit the box. */
function paginate(text: string, size = 170) {
  const sentences = text.match(/[^.!?]+[.!?]+["')]*\s*|[^.!?]+$/g) ?? [text];
  const pages: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if (cur && (cur + s).length > size) {
      pages.push(cur.trim());
      cur = "";
    }
    cur += s;
  }
  if (cur.trim()) pages.push(cur.trim());
  return pages;
}

const answerText = (t: Topic) =>
  FIXES.reduce((s, [a, b]) => s.replace(a, b), INTENTS[t].answer.map(nodeText).filter(Boolean).join(" "));

/** The competition footage the live site already features (FluteView). */
export const CLIP_SRC = "https://www.youtube-nocookie.com/embed/ya3cFeMKD14?start=584&autoplay=1";

type Choice = { label: string; act: () => void };
/** What the dialogue is about right now. */
type Subject =
  | { kind: "hello" }
  | { kind: "topic"; topic: Topic }
  | { kind: "project"; row: ProjectRow; from?: ItemId }
  /** Browsing: one thing on screen is picked (it hops, the cat looks at it). */
  | { kind: "look"; id: ItemId }
  /** Inspecting it up close, or one of its questions (`q`). */
  | { kind: "item"; id: ItemId; text: string; q?: string };

/** What the scene does when the talk moves to a thing on screen. */
export type Stage = {
  focus(id: ItemId | null, close: boolean): void;
  mood(m: MascotMood): void;
  wear(outfit: Outfit[]): void;
  tune(): void;
};

/** The thing being looked at or inspected, if any. */
const itemOf = (s: Subject) => (s.kind === "look" || s.kind === "item" ? s.id : null);
const linkChoices = (links: LinkItem[] | undefined, go: (href: string) => void): Choice[] =>
  (links ?? []).map((l) => ({ label: l.sub && !l.label.includes("@") ? `${l.label} (${l.sub})` : l.label, act: () => go(l.href) }));

export class Dialogue {
  /** Characters per page that fit the hologram. */
  pageSize = 250;
  subject: Subject = { kind: "hello" };
  pages = paginate(INTRO);
  index = 0;
  shown = 0;
  cursor = 0;
  /** The hologram is playing the clip instead of talking. */
  clip = false;
  /** Bumped on every visible change, so renderers can skip unchanged frames. */
  version = 0;
  /** The scene listens for this (open a link). */
  onAction?: (a: { type: "open"; href: string }) => void;
  /** The scene's side of picking things: camera, moods, dress-up, the flute tune. */
  stage?: Stage;
  private eaten = 0;
  private outfit = -1;

  get title() {
    const s = this.subject;
    if (s.kind === "project") return s.row.name;
    if (s.kind === "look" || s.kind === "item") return ITEMS[s.id].name;
    return null;
  }
  get text() {
    return this.pages[this.index] ?? "";
  }
  get typing() {
    return this.shown < this.text.length;
  }
  get more() {
    return !this.typing && this.index < this.pages.length - 1;
  }
  get choosing() {
    return !this.clip && !this.typing && this.index === this.pages.length - 1;
  }
  get visible() {
    return this.text.slice(0, Math.floor(this.shown));
  }

  get choices(): Choice[] {
    const s = this.subject;
    const go = (href: string) => this.onAction?.({ type: "open", href });
    if (s.kind === "project") {
      const href = s.row.href ?? `/projects#${s.row.slug}`;
      return [
        { label: `Open ${s.row.name}`, act: () => go(href) },
        { label: "Back", act: () => (s.from ? this.showItem(s.from) : this.hello()) },
      ];
    }
    // picking a thing doesn't end the conversation: the questions stay under "Look closer"
    if (s.kind === "look")
      return [{ label: "Look closer", act: () => this.inspect(s.id) }, ...TOPICS.map((t) => ({ label: ASK[t], act: () => this.talk(t) }))];
    if (s.kind === "item") {
      const it = ITEMS[s.id];
      const back = { label: "Back", act: () => this.look(s.id) };
      const qs = QUESTIONS[s.id] ?? {};
      if (s.q) {
        const q = qs[s.q];
        return [
          ...(q.open ? [{ label: q.open.label, act: () => go(q.open!.href) }] : []),
          ...linkChoices(q.links, go),
          { label: "Ask something else", act: () => this.showItem(s.id) },
        ];
      }
      if (it.desktop) return [...PROJECT_ROWS.map((row) => ({ label: row.name, act: () => this.project(row, s.id) })), back];
      if (it.closet) return [{ label: "Try another look", act: () => this.inspect(s.id) }, back];
      if (it.snack) return [{ label: "One more", act: () => this.inspect(s.id) }, back];
      return [
        ...Object.entries(qs).map(([key, q]) => ({ label: q.ask, act: () => this.ask(s.id, key) })),
        ...(it.open ? [{ label: it.open.label, act: () => go(it.open!.href) }] : []),
        ...linkChoices(it.links, go),
        back,
      ];
    }
    const asks = TOPICS.map((t) => ({ label: ASK[t], act: () => this.talk(t) }));
    if (s.kind === "topic" && s.topic === "flute")
      return [{ label: "Watch competition footage", act: () => this.playClip() }, ...asks.filter((a) => a.label !== ASK.flute)];
    return asks;
  }
  /** Changes whenever the list of choices does. */
  get choiceKey() {
    return this.choices.map((c) => c.label).join("|");
  }

  tick(dt: number) {
    if (!this.typing) return;
    const before = Math.floor(this.shown);
    this.shown = Math.min(this.text.length, this.shown + dt * 55);
    if (Math.floor(this.shown) !== before) this.version++;
  }

  private textOf(s: Subject) {
    if (s.kind === "look") return ITEMS[s.id].react || ITEMS[s.id].body || ITEMS[s.id].name;
    if (s.kind === "item") return s.text;
    return s.kind === "hello" ? INTRO : s.kind === "topic" ? answerText(s.topic) : s.row.detail;
  }

  private show(s: Subject) {
    this.subject = s;
    this.clip = false;
    this.pages = paginate(this.textOf(s), this.pageSize);
    this.index = 0;
    this.shown = 0;
    this.cursor = 0;
    this.version++;
  }

  talk(t: Topic) {
    this.stage?.focus(null, false);
    this.stage?.mood("idle");
    this.show({ kind: "topic", topic: t });
  }
  project(row: ProjectRow, from?: ItemId) {
    this.show({ kind: "project", row, from });
  }
  hello(typed = true) {
    this.stage?.focus(null, false);
    this.stage?.mood("idle");
    this.show({ kind: "hello" });
    if (typed) this.shown = this.text.length;
  }

  /** Pick a thing on screen: it hops and the hologram says its line, already typed. */
  look(id: ItemId) {
    this.stage?.focus(id, false);
    this.stage?.mood("idle");
    this.show({ kind: "look", id });
    this.shown = this.text.length;
  }
  /** Look closer: the camera moves in and the cat does its thing (plays, eats, dresses up). */
  inspect(id: ItemId) {
    const it = ITEMS[id];
    this.stage?.focus(id, true);
    this.stage?.mood(it.mood ?? (it.plays ? "flute" : "idle"));
    if (it.plays) this.stage?.tune();
    let text = this.bodyOf(id);
    if (it.snack) {
      const lines = SNACK_MILESTONES[this.eaten + 1] ?? SNACK_LINES[this.eaten % SNACK_LINES.length];
      this.eaten += 1;
      text = lines.join(" ");
    }
    if (it.closet) {
      this.outfit = (this.outfit + 1) % LOOKS.length;
      this.stage?.wear(LOOKS[this.outfit].wear);
      text = LOOKS[this.outfit].line;
    }
    this.show({ kind: "item", id, text });
  }
  /** Back to a thing's own words and questions, without doing its action again. */
  showItem(id: ItemId) {
    this.stage?.focus(id, true);
    this.show({ kind: "item", id, text: this.bodyOf(id) });
  }
  ask(id: ItemId, key: string) {
    const q = QUESTIONS[id]?.[key];
    if (q) this.show({ kind: "item", id, text: q.say, q: key });
  }
  private bodyOf(id: ItemId) {
    const it = ITEMS[id];
    return it.desktop ? DESKTOP_LINE : it.topic ? answerText(it.topic) : it.body || it.react;
  }

  /** Left and right walk through everything on screen, desk then wall, starting
   *  next to the cat. Up and down stay with the conversation. */
  browse(dx: number) {
    const ring = [...DESK, ...WALL];
    const at = itemOf(this.subject);
    if (!at) {
      const mid = Math.floor(DESK.length / 2);
      this.look(DESK[dx < 0 ? mid - 1 : mid]);
      return;
    }
    const i = ring.indexOf(at);
    this.look(ring[(i + dx + ring.length) % ring.length]);
  }
  /** A tap on something on screen: the first picks it, a second looks closer. */
  tap(id: ItemId) {
    const s = this.subject;
    if (s.kind === "look" && s.id === id) this.inspect(id);
    else if (itemOf(s) !== id) this.look(id);
  }

  playClip() {
    this.clip = true;
    this.version++;
  }

  pick(i: number) {
    this.choices[i]?.act();
  }

  /** Returns true when the key meant something to the dialogue. */
  press(key: "up" | "down" | "a" | "b") {
    if (key === "b") {
      if (this.clip) {
        this.clip = false;
        this.version++;
      } else {
        const s = this.subject;
        if (s.kind === "item" && s.q) this.showItem(s.id);
        else if (s.kind === "item") this.look(s.id);
        else if (s.kind === "project" && s.from) this.showItem(s.from);
        else this.hello();
      }
      return true;
    }
    if (this.clip) return false;
    if (key === "a") {
      if (this.typing) this.shown = this.text.length;
      else if (this.more) {
        this.index++;
        this.shown = 0;
      } else if (this.choosing) {
        this.pick(this.cursor);
        return true;
      }
      this.version++;
      return true;
    }
    if (!this.choosing) return false;
    const n = this.choices.length;
    this.cursor = (this.cursor + (key === "down" ? 1 : n - 1)) % n;
    this.version++;
    return true;
  }
}

/** Builds (and rebuilds, when the list changes) the choice buttons in a menu. */
function choiceButtons(menu: HTMLElement, dlg: Dialogue) {
  let key = "";
  let buttons: HTMLButtonElement[] = [];
  return () => {
    if (dlg.choiceKey !== key) {
      key = dlg.choiceKey;
      menu.replaceChildren();
      buttons = dlg.choices.map((c, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.setAttribute("role", "menuitem");
        b.textContent = c.label;
        b.addEventListener("click", (e) => {
          e.stopPropagation();
          dlg.pick(i);
        });
        b.addEventListener("pointerenter", () => {
          dlg.cursor = i;
          dlg.version++;
        });
        menu.append(b);
        return b;
      });
    }
    buttons.forEach((b, i) => b.classList.toggle("is-cursor", i === dlg.cursor));
  };
}


// 2D projective mapping from a UI rectangle onto a quad on screen.
type M = number[];
const adj = (m: M): M => [
  m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4],
  m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5],
  m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3],
];
const mul = (a: M, b: M): M => {
  const c: M = [];
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      let s = 0;
      for (let k = 0; k < 3; k++) s += a[3 * i + k] * b[3 * k + j];
      c[3 * i + j] = s;
    }
  return c;
};
const mulv = (m: M, v: number[]) => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];
const basis = (p: number[][]) => {
  const m = [p[0][0], p[1][0], p[2][0], p[0][1], p[1][1], p[2][1], 1, 1, 1];
  const v = mulv(adj(m), [p[3][0], p[3][1], 1]);
  return mul(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]);
};
export function toMatrix3d(quad: number[][], w = UI_W, h = UI_H) {
  // corners TL TR BR BL, reordered the same way for both sides
  const src = [[0, 0], [w, 0], [w, h], [0, h]];
  const order = (q: number[][]) => [q[0], q[1], q[3], q[2]];
  const t = mul(basis(order(quad)), adj(basis(order(src))));
  for (let i = 0; i < 9; i++) t[i] /= t[8];
  return [t[0], t[3], 0, t[6], t[1], t[4], 0, t[7], 0, 0, 1, 0, t[2], t[5], 0, t[8]];
}


// ---------------------------------------------------------------- hologram

export const HOLO_W = 1000;
export const HOLO_H = 480;

/** How the hologram looks: island speech bubbles in warm or cool light, or the first dark glass. */
export type HoloLook = "warm" | "cool" | "glass";

/** The dialogue as a hologram the console projects above itself. */
export function mountHolo(host: HTMLElement, dlg: Dialogue) {
  const root = document.createElement("div");
  root.className = "h3-holo";
  root.style.width = `${HOLO_W}px`;
  root.style.height = `${HOLO_H}px`;
  root.hidden = true;
  root.dataset.look = "warm";
  root.innerHTML = `
    <div class="h3-holo__panel">
      <span class="h3-holo__scan" aria-hidden="true"></span>
      <span class="h3-holo__name">HAYLIE</span>
      <b class="h3-holo__title"></b>
      <p class="h3-holo__text" aria-live="polite"></p>
      <span class="h3-holo__more" aria-hidden="true">▼</span>
      <div class="h3-holo__choices" role="menu"></div>
      <div class="h3-holo__clip"></div>
    </div>`;
  const panel = root.querySelector<HTMLElement>(".h3-holo__panel")!;
  const title = root.querySelector<HTMLElement>(".h3-holo__title")!;
  const text = root.querySelector<HTMLElement>(".h3-holo__text")!;
  const more = root.querySelector<HTMLElement>(".h3-holo__more")!;
  const menu = root.querySelector<HTMLElement>(".h3-holo__choices")!;
  const clip = root.querySelector<HTMLElement>(".h3-holo__clip")!;
  const syncChoices = choiceButtons(menu, dlg);
  panel.addEventListener("click", () => dlg.press("a"));
  host.append(root);

  const flicker = () => {
    panel.classList.remove("is-new");
    void panel.offsetWidth;
    panel.classList.add("is-new");
  };
  let seen = -1;
  let subject: unknown;
  let playing = false;
  return {
    update(quad: number[][]) {
      root.style.transform = `matrix3d(${toMatrix3d(quad, HOLO_W, HOLO_H).join(",")})`;
      if (dlg.version === seen) return;
      seen = dlg.version;
      // a new subject flickers the projection, like it is being re-sent
      if (subject !== undefined && subject !== dlg.subject) flicker();
      subject = dlg.subject;
      if (dlg.clip !== playing) {
        playing = dlg.clip;
        flicker();
        clip.replaceChildren();
        if (playing) {
          const f = document.createElement("iframe");
          f.src = CLIP_SRC;
          f.title = "Competition footage";
          f.allow = "autoplay; encrypted-media; picture-in-picture";
          f.allowFullscreen = true;
          clip.append(f);
        }
      }
      panel.classList.toggle("is-clip", playing);
      title.textContent = dlg.title ?? "";
      title.hidden = !dlg.title;
      text.textContent = dlg.visible;
      more.hidden = !dlg.more;
      menu.hidden = !dlg.choosing;
      menu.classList.toggle("is-many", dlg.choices.length > 4);
      syncChoices();
    },
    setLook(l: HoloLook) {
      root.dataset.look = l;
      flicker();
    },
    setVisible(v: boolean) {
      root.hidden = !v;
      if (v) {
        panel.classList.remove("is-on");
        void panel.offsetWidth;
        panel.classList.add("is-on");
      }
    },
    dispose() {
      root.remove();
    },
  };
}

// ---------------------------------------------------------------- the power-on screen

/** A tuner on the console's screen: the needle swings in and settles on A. */
export type BootStyle = "chime" | "tuner";

const BOOT_HTML: Record<BootStyle, string> = {
  chime: `
    <p class="h3-boot__logo" aria-label="Haylie">${[..."haylie"].map((c, i) => `<span style="--i:${i}">${c}</span>`).join("")}</p>
    <p class="h3-boot__sub">flute and code</p>`,
  tuner: `
    <div class="h3-boot__dial" aria-hidden="true">
      <span class="h3-boot__mark h3-boot__mark--flat">♭</span>
      <span class="h3-boot__mark h3-boot__mark--mid"></span>
      <span class="h3-boot__mark h3-boot__mark--sharp">♯</span>
      <span class="h3-boot__needle"></span>
    </div>
    <p class="h3-boot__note">A</p>
    <p class="h3-boot__line">tuning to 442</p>`,
};

/**
 * The power-on, drawn over the console's screen. "chime": the screen comes on
 * like an old tube, the name drops in letter by letter, a little arpeggio, and
 * an iris opens onto the room. "tuner": a needle settles on A.
 */
export function mountBoot(host: HTMLElement) {
  const root = document.createElement("div");
  root.className = "h3-boot";
  root.style.width = `${UI_W}px`;
  root.style.height = `${UI_H}px`;
  root.hidden = true;
  let style: BootStyle = "chime";
  const fill = () => {
    root.dataset.style = style;
    root.innerHTML = BOOT_HTML[style];
  };
  fill();
  host.append(root);
  return {
    update(quad: number[][]) {
      root.style.transform = `matrix3d(${toMatrix3d(quad).join(",")})`;
    },
    setStyle(s: BootStyle) {
      style = s;
      fill();
    },
    /** 0 starting, 1 arrived (in tune, or the chime), 2 leaving, 3 gone. */
    setPhase(p: number) {
      root.hidden = p >= 3;
      root.classList.toggle("is-ok", p >= 1);
      root.classList.toggle("is-out", p >= 2);
      const line = root.querySelector<HTMLElement>(".h3-boot__line");
      if (line) line.textContent = p >= 1 ? "in tune" : "tuning to 442";
      if (p === 0) {
        root.classList.remove("is-run");
        void root.offsetWidth;
        root.classList.add("is-run");
      }
    },
    dispose() {
      root.remove();
    },
  };
}
