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
    enDetail: "Interactive tutorial for reading music.",
    zhDetail: "学习识谱的互动教程。", icon: "theory",
  },
  {
    key: "fingerings",
    href: "/flute-studio/fingerings",
    en: "Fingering chart",
    zh: "指法表",
    enDetail: "Every note from low B up through the altissimo, with alternates",
    zhDetail: "从低音 B 到超高音区的所有指法，含替代指法",
    icon: "fingerings",
  },
  {
    key: "trills",
    href: "/flute-studio/trills",
    en: "Trill chart",
    zh: "颤音指法表",
    enDetail: "Four octaves of trill fingerings",
    zhDetail: "四个八度的颤音指法",
    icon: "trills",
  },
  {
    key: "embouchure",
    href: "/flute-studio/embouchure",
    en: "Body & embouchure",
    zh: "身体与嘴型",
    enDetail: "An interactive model of posture, air and the aperture",
    zhDetail: "姿势、气息与风口的交互模型",
    icon: "embouchure",
  },
  {
    key: "roadmap",
    href: "/flute-studio/roadmap",
    en: "Technique roadmap",
    zh: "技巧路线图",
    enDetail: "What to work on next, and what it builds on",
    zhDetail: "接下来该练什么，以及它以什么为基础",
    icon: "roadmap",
  },
];
