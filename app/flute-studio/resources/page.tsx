"use client";

import {ResourceIcon,type ResourceIconName} from "../components/ResourceIcon";
import {openPracticeTool} from "../PracticeAudio";
import {useLanguage} from "../i18n/LanguageContext";
import "../exercises/exercises.css";

/**
 * Reference material, as opposed to things you do in a practice session.
 *
 * These pages existed already and were reachable only from the home page's
 * card grid, where a fingering chart sat at the same weight as Scale
 * Studio. They are not the same kind of thing: you open Scale Studio to
 * practise, and you open the fingering chart to look something up, usually
 * while doing something else. Giving them a tab of their own is what lets
 * the home page stop pretending every feature is equally important.
 *
 * The routes are unchanged. This is a way in, not a move — every existing
 * link and bookmark still works, and nothing had to be re-pathed.
 *
 * The tools belong here for the same reason: a tuner is something you
 * reach for while doing something else, never the thing you came to do.
 * They open the practice dock rather than navigating anywhere, so you keep
 * whatever page you were on — which is the whole point of a tool.
 */
type Resource = {
  key: string;
  href: string;
  en: string;
  zh: string;
  enDetail: string;
  zhDetail: string;
  icon: ResourceIconName;
};

const RESOURCES: readonly Resource[] = [
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

/** The dock's tools, which open in place rather than at a route of their own. */
const TOOLS = ["tuner", "metronome", "drone"] as const;

export default function ResourcesHub() {
  const { t, lang } = useLanguage();
  const zh = lang === "zh";

  return (
    <main className="exercise-hub">
      <div className="exercise-hub__content">
        <header className="exercise-hub__header">
          <p>{zh ? "资料" : "Reference"}</p>
          <div>
            <h1>{zh ? "资料" : "Resources"}</h1>
          </div>
          <p className="exercise-hub__intro">
            {zh
              ? "需要查阅的东西都在这里——指法、颤音、身体模型和技巧路线图。"
              : "The things you look up rather than practise — fingerings, trills, the body model and what to learn next."}
          </p>
        </header>

        <section className="exercise-hub__section" aria-labelledby="resources-reference">
          <h2 className="exercise-hub__section-title" id="resources-reference">{zh ? "查阅" : "Reference"}</h2>
          <div className="exercise-hub__list">
            {RESOURCES.map(resource => (
              <article className="exercise-hub__row exercise-hub__row--available" key={resource.key}>
                <a className="exercise-hub__row-main" href={resource.href}>
                  <ResourceIcon name={resource.icon} className="exercise-hub__icon" />
                  <span className="exercise-hub__copy">
                    <strong>{zh ? resource.zh : resource.en}</strong>
                    <small>{zh ? resource.zhDetail : resource.enDetail}</small>
                  </span>
                </a>
              </article>
            ))}
          </div>
        </section>

        <section className="exercise-hub__section" aria-labelledby="resources-tools">
          <h2 className="exercise-hub__section-title" id="resources-tools">{zh ? "工具" : "Tools"}</h2>
          <div className="exercise-hub__list">
            {TOOLS.map(tool => (
              <article className="exercise-hub__row exercise-hub__row--available" key={tool}>
                <button type="button" className="exercise-hub__row-main" onClick={() => openPracticeTool(tool)}>
                  <ResourceIcon name={tool} className="exercise-hub__icon" />
                  <span className="exercise-hub__copy">
                    <strong>{t.quickTools[tool]}</strong>
                    <small>{t.quickTools[`${tool}Detail` as const]}</small>
                  </span>
                </button>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
