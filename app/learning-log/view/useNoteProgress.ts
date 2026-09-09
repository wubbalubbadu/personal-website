"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Per-note "understood" flags, one localStorage store per note.
 *
 * Deliberately separate from the course's `useProgress`: standalone notes never
 * roll up into a single visible count, so this hook exposes only per-slide
 * `isDone` / `toggle` — no totals. `noteId` is expected to be stable for the
 * life of the caller (remount per note via a React `key`); every storage access
 * is guarded, since private windows and locked-down browsers throw.
 */
export function useNoteProgress(noteId: string) {
  const storeKey = `ll-note-progress:${noteId}`;
  const [done, setDone] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storeKey);
      if (raw) setDone(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* no storage — start empty */
    }
  }, [storeKey]);

  const toggle = useCallback(
    (slideId: string) => {
      setDone((prev) => {
        const next = new Set(prev);
        if (next.has(slideId)) next.delete(slideId);
        else next.add(slideId);
        try {
          localStorage.setItem(storeKey, JSON.stringify([...next]));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [storeKey],
  );

  const isDone = useCallback((slideId: string) => done.has(slideId), [done]);

  return { isDone, toggle };
}
