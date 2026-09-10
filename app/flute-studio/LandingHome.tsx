"use client";

import { musicLibrary, type MusicItem } from "../../content/music-library";
import { resources } from "./resources";
import { useLanguage } from "./i18n/LanguageContext";
import { useRecents, useSavedItems } from "./lib/storage";
import StudioPage from "./components/StudioPage";
import { ResourceList, ResourceRow } from "./components/ResourceList";
import "./landing.css";

const categorySymbol: Record<MusicItem["category"], string> = {
  exercise: "♩",
  repertoire: "♫",
  etude: "𝄞",
  method: "≋",
  "warm-up": "◌",
};

const toneForCategory: Record<MusicItem["category"], "sage" | "pink" | "slate" | "sand"> = {
  exercise: "pink",
  repertoire: "sage",
  etude: "slate",
  method: "slate",
  "warm-up": "sand",
};

function MusicRows({
  items,
  saved,
  onToggleSave,
}: {
  items: MusicItem[];
  saved: (id: string) => boolean;
  onToggleSave: (id: string) => void;
}) {
  return (
    <>
      {items.map((item) => (
        <ResourceRow
          key={item.id}
          title={item.title}
          desc={`${item.composer} · ${item.difficulty.replace(/-/g, " ")} · ${item.key}`}
          icon={categorySymbol[item.category]}
          tone={toneForCategory[item.category]}
          href={item.viewerPath ?? undefined}
          saved={saved(item.id)}
          onToggleSave={() => onToggleSave(item.id)}
        />
      ))}
    </>
  );
}

export default function LandingHome() {
  const { lang } = useLanguage();
  const saved = useSavedItems("music");
  const recents = useRecents("music", 4);

  const byId = (id: string) => musicLibrary.find((item) => item.id === id);
  const savedItems = saved.items.map(byId).filter((item): item is MusicItem => Boolean(item));
  const recentItems = recents.ids.map(byId).filter((item): item is MusicItem => Boolean(item));

  const openTool = (tool: "tuner" | "metronome" | "drone") =>
    window.dispatchEvent(new CustomEvent("cookie:open-practice-tools", { detail: { tool } }));

  const copy =
    lang === "zh"
      ? {
          intro: "读谱、做练习、还有一些实验性的小工具。选一个资源，或直接拿个节拍器。",
          resume: "继续上次",
          saved: "已收藏",
          resourcesHeading: "资源",
          tools: "随手工具",
          practice: "我的练习",
          practiceRowTitle: "计时器、流程与记录",
          practiceRow: "番茄钟、每日清单，以及过往练习",
          beta: "试验",
          fingerings: "指法表",
          tuner: "调音器",
          metronome: "节拍器",
          drone: "持续音",
        }
      : {
          intro:
            "Scores to read and annotate, drills with the tools built in, and a couple of experiments. Or just grab a tuner.",
          resume: "Pick up where you left off",
          saved: "Saved",
          resourcesHeading: "Resources",
          tools: "Quick tools",
          practice: "Your practice",
          practiceRowTitle: "Timer, routine & history",
          practiceRow: "Your Pomodoro sessions, daily checklist, and past practice",
          beta: "Beta",
          fingerings: "Fingering chart",
          tuner: "Tuner",
          metronome: "Metronome",
          drone: "Drone",
        };

  return (
    <StudioPage title={lang === "zh" ? "长笛工作室" : "Flute studio"} intro={copy.intro}>
      {recentItems.length > 0 && (
        <ResourceList heading={<h2>{copy.resume}</h2>}>
          <MusicRows items={recentItems} saved={saved.has} onToggleSave={saved.toggle} />
        </ResourceList>
      )}

      {savedItems.length > 0 && (
        <ResourceList heading={<h2>{copy.saved}</h2>}>
          <MusicRows items={savedItems} saved={saved.has} onToggleSave={saved.toggle} />
        </ResourceList>
      )}

      <ResourceList heading={<h2>{copy.resourcesHeading}</h2>}>
        {resources.map((resource) => (
          <ResourceRow
            key={resource.id}
            title={resource.name}
            desc={resource.blurb}
            icon={resource.icon}
            tone={resource.tone}
            href={resource.href}
            trailing={resource.status === "beta" ? <span className="resource-chip">{copy.beta}</span> : undefined}
          />
        ))}
      </ResourceList>

      <section className="landing-tools" aria-label={copy.tools}>
        <h2>{copy.tools}</h2>
        <div className="landing-tools__row">
          <button type="button" onClick={() => openTool("tuner")}>
            <span aria-hidden="true">⌁</span>
            {copy.tuner}
          </button>
          <button type="button" onClick={() => openTool("metronome")}>
            <span aria-hidden="true">♩</span>
            {copy.metronome}
          </button>
          <button type="button" onClick={() => openTool("drone")}>
            <span aria-hidden="true">◉</span>
            {copy.drone}
          </button>
          <a href="https://www.wfg.woodwind.org/flute/" target="_blank" rel="noreferrer">
            <span aria-hidden="true">●○</span>
            {copy.fingerings}
          </a>
        </div>
      </section>

      <ResourceList heading={<h2>{copy.practice}</h2>}>
        <ResourceRow
          title={copy.practiceRowTitle}
          desc={copy.practiceRow}
          icon="✓"
          tone="slate"
          href="/flute-studio/practice"
        />
      </ResourceList>
    </StudioPage>
  );
}
