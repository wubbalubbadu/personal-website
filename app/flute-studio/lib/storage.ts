"use client";

import { useCallback, useEffect, useState } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   A small typed layer over localStorage + a same-tab change event.

   Replaces the ad-hoc `cookie:*` string events scattered through the studio
   (cookie:favorites-updated, cookie:practice-updated, ...). One key → one hook,
   and every writer notifies every reader in the same tab.

   Legacy bridge: useSavedItems still fires and listens for
   `cookie:favorites-updated` so the un-migrated ScoreViewer / MusicLibrary /
   Home stay in sync during the transition.
   ───────────────────────────────────────────────────────────────────────────── */

const CHANGE_EVENT = "studio:store";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode / quota — the in-memory state still updated by the caller */
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { key } }));
}

/** useState that persists to localStorage and syncs across components + tabs. */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    const load = () => setValue(read(key, initial));
    load();
    const sync = (event: Event) => {
      const changed = (event as CustomEvent).detail?.key;
      if (event.type === "storage" || changed === undefined || changed === key) load();
    };
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
    // `initial` is intentionally not a dep — treat it as the first-render default only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = useCallback(
    (next: T) => {
      setValue(next);
      write(key, next);
    },
    [key],
  );

  return [value, set] as const;
}

/** Saved / favorited item ids for a namespace, e.g. useSavedItems("music"). */
export function useSavedItems(namespace: string) {
  const key = `cookie:${namespace}-favorites`;
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    const load = () => setItems(read<string[]>(key, []));
    load();
    window.addEventListener(CHANGE_EVENT, load);
    window.addEventListener("storage", load);
    window.addEventListener("cookie:favorites-updated", load); // legacy bridge
    return () => {
      window.removeEventListener(CHANGE_EVENT, load);
      window.removeEventListener("storage", load);
      window.removeEventListener("cookie:favorites-updated", load);
    };
  }, [key]);

  const toggle = useCallback(
    (id: string) => {
      const current = read<string[]>(key, []);
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      write(key, next);
      window.dispatchEvent(new Event("cookie:favorites-updated")); // legacy bridge
    },
    [key],
  );

  return { items, has: (id: string) => items.includes(id), toggle };
}

/**
 * Last-opened item ids for a namespace, most-recent first.
 *
 * The one behavioural knob on the landing page's "recent" strip lives in
 * `record()`. Current policy: re-opening an item bumps it back to the front,
 * and the list is hard-capped at `limit`. If you'd rather re-opens keep their
 * place, drop the `.filter(...)` in `record`.
 */
export function useRecents(namespace: string, limit = 6) {
  const key = `cookie:${namespace}-recents`;
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const load = () => setIds(read<string[]>(key, []).slice(0, limit));
    load();
    window.addEventListener(CHANGE_EVENT, load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener(CHANGE_EVENT, load);
      window.removeEventListener("storage", load);
    };
  }, [key, limit]);

  const record = useCallback(
    (id: string) => {
      const current = read<string[]>(key, []);
      const next = [id, ...current.filter((x) => x !== id)].slice(0, limit);
      write(key, next);
    },
    [key, limit],
  );

  return { ids, record };
}
