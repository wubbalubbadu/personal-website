"use client";

import { useSyncExternalStore } from "react";

/**
 * The landing page's language: Chinese when the visitor's system is set to
 * Chinese, English otherwise. Simplified Chinese only, like Cookie Flute Studio.
 *
 * Order: ?lang=zh or ?lang=en in the address (handy for testing and for sharing
 * a Chinese link), then a choice already made in the studio (same storage key,
 * so picking English there keeps the home page English too), then the system.
 */
export type Lang = "en" | "zh";

const KEY = "cookie:language";

function read(): Lang {
  const q = new URLSearchParams(window.location.search).get("lang")?.toLowerCase();
  // zh is the code; cn and zh-cn are the ones people guess
  if (q === "zh" || q === "cn" || q === "zh-cn") return "zh";
  if (q === "en") return "en";
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "zh" || saved === "en") return saved;
  } catch {
    // private mode or blocked storage: fall through to the system language
  }
  return navigator.languages?.[0]?.toLowerCase().startsWith("zh") || navigator.language?.toLowerCase().startsWith("zh") ? "zh" : "en";
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("languagechange", onChange);
  window.addEventListener("cookie:language-updated", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("languagechange", onChange);
    window.removeEventListener("cookie:language-updated", onChange);
  };
}

/** English on the server (the page is prerendered), the real language in the browser. */
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, read, () => "en");
}
