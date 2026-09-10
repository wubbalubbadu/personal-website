"use client";

import { useMemo, useState } from "react";
import { musicLibrary, type MusicItem } from "../../../content/music-library";
import { useLanguage } from "../i18n/LanguageContext";
import { useSavedItems } from "../lib/storage";
import StudioPage from "../components/StudioPage";
import { ResourceList, ResourceRow } from "../components/ResourceList";
import "./library.css";

const categorySymbol: Record<MusicItem["category"], string> = {
  exercise: "♩",
  repertoire: "♫",
  etude: "𝄞",
  method: "≋",
  "warm-up": "◌",
};
const categoryTone: Record<MusicItem["category"], "sage" | "pink" | "slate" | "sand"> = {
  exercise: "pink",
  repertoire: "sage",
  etude: "slate",
  method: "slate",
  "warm-up": "sand",
};

export default function MusicLibrary() {
  const { t, lang } = useLanguage();
  const saved = useSavedItems("music");
  const [query, setQuery] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);

  const items = useMemo(
    () =>
      musicLibrary.filter((item) => {
        if (savedOnly && !saved.items.includes(item.id)) return false;
        const haystack = `${item.title} ${item.composer} ${item.key} ${item.techniques.join(" ")}`.toLowerCase();
        return haystack.includes(query.trim().toLowerCase());
      }),
    [query, savedOnly, saved.items],
  );

  return (
    <StudioPage title={t.library.title} eyebrow={t.library.eyebrow} backHref="/flute-studio">
      <div className="library-controls">
        <label className="library-search">
          <span aria-hidden="true">⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.library.searchPlaceholder}
          />
        </label>
        <button
          type="button"
          className={savedOnly ? "library-saved-toggle is-on" : "library-saved-toggle"}
          aria-pressed={savedOnly}
          onClick={() => setSavedOnly((value) => !value)}
        >
          ★ {lang === "zh" ? "已收藏" : "Saved"}
        </button>
      </div>

      {items.length ? (
        <ResourceList>
          {items.map((item) => (
            <ResourceRow
              key={item.id}
              title={item.title}
              desc={`${item.composer} · ${item.difficulty.replace(/-/g, " ")} · ${item.key}`}
              icon={categorySymbol[item.category]}
              tone={categoryTone[item.category]}
              href={item.viewerPath ?? undefined}
              disabled={!item.viewerPath}
              saved={saved.has(item.id)}
              onToggleSave={() => saved.toggle(item.id)}
              trailing={
                item.viewerPath ? undefined : (
                  <span className="resource-chip">{lang === "zh" ? "即将推出" : "Soon"}</span>
                )
              }
            />
          ))}
        </ResourceList>
      ) : (
        <p className="library-empty">
          {savedOnly ? t.library.noSavedMusic : t.library.noMatchingMusic}
        </p>
      )}
    </StudioPage>
  );
}
