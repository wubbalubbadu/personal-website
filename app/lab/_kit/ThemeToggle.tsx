"use client";

import { useCallback, useEffect, useState } from "react";

/** Same contract as useTheme() in app/ChatPanel.tsx: the choice lives in
 * localStorage.theme and on <html data-theme>, and app/layout.tsx applies it
 * before paint, so the lab pages and the live home share one setting. */
export default function ThemeToggle({ className = "lab-theme" }: { className?: string }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      const stored = window.localStorage.getItem("theme");
      setIsDark(stored === "dark" || (stored !== "light" && mq.matches));
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const toggle = useCallback(() => {
    const next = !isDark;
    document.documentElement.dataset.theme = next ? "dark" : "light";
    window.localStorage.setItem("theme", next ? "dark" : "light");
    setIsDark(next);
  }, [isDark]);

  const label = isDark ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button type="button" className={className} onClick={toggle} aria-label={label} title={label}>
      {isDark ? "☀" : "☾"}
    </button>
  );
}

/** Bumps whenever the effective theme changes, for canvases that bake colours in. */
export function useThemeTick() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", bump);
    const obs = new MutationObserver(bump);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      mq.removeEventListener("change", bump);
      obs.disconnect();
    };
  }, []);
  return tick;
}
