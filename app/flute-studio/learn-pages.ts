import type {ResourceIconName} from "./components/ResourceIcon";

/**
 * The Learn tab's pages. Shared by the Learn page and the desktop rail,
 * which lists them when it is open.
 */
export type LearnPage = {
  key: string;
  href: string;
  en: string;
  zh: string;
  enDetail: string;
  zhDetail: string;
  icon: ResourceIconName;
};

export const LEARN_PAGES: readonly LearnPage[] = [
  {
    key: "theory", href: "/flute-studio/theory", en: "Theory lessons", zh: "乐理课",
    enDetail: "Learn to read staff music through little games.",
    zhDetail: "通过小游戏学看五线谱。", icon: "theory",
  },
  {
    key: "rhythm-drills", href: "/flute-studio/rhythm-drills", en: "Rhythm drills", zh: "节奏训练",
    enDetail: "Tap rhythms that keep getting harder, with real bars from the Library.",
    zhDetail: "越点越难的节奏，还有曲库里的真实小节。", icon: "rhythm",
  },
  {
    key: "fingerings",
    href: "/flute-studio/fingerings",
    en: "Fingering chart",
    zh: "指法表",
    enDetail: "Every fingering from low B up, with alternates.",
    zhDetail: "全音域指法，附替代指法。",
    icon: "fingerings",
  },
  {
    key: "trills",
    href: "/flute-studio/trills",
    en: "Trill chart",
    zh: "颤音指法表",
    enDetail: "Trill fingerings for four octaves, with the moving keys shown.",
    zhDetail: "四个八度的颤音指法，标出要动的键。",
    icon: "trills",
  },
  {
    key: "embouchure",
    href: "/flute-studio/embouchure",
    en: "Body & embouchure",
    zh: "身体与嘴型",
    enDetail: "A 3D look at posture, air and the lips, from low notes to high.",
    zhDetail: "用 3D 模型看姿势、气息和嘴型。",
    icon: "embouchure",
  },
  {
    key: "roadmap",
    href: "/flute-studio/roadmap",
    en: "Technique roadmap",
    zh: "技巧路线图",
    enDetail: "Every flute skill on one map, and what each one builds on.",
    zhDetail: "所有长笛技巧一张图，先学什么一目了然。",
    icon: "roadmap",
  },
];
