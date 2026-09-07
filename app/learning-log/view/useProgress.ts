"use client";

import { useCallback, useEffect, useState } from "react";
import type { Course } from "../content/types";
import { flattenSlides, progressKey } from "../content/types";

/**
 * "Understood" flags per slide, persisted to localStorage. Every read/write is
 * guarded — private windows and locked-down browsers throw on access.
 */
export function useProgress(course: Course) {
  const storeKey = `ll-progress:${course.id}`;
  const [done, setDone] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storeKey);
      if (raw) setDone(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* no storage — start empty */
    }
  }, [storeKey]);

  const persist = useCallback(
    (next: Set<string>) => {
      try {
        localStorage.setItem(storeKey, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
    },
    [storeKey],
  );

  const toggle = useCallback(
    (chapterId: string, slideId: string) => {
      setDone((prev) => {
        const key = progressKey(course.id, chapterId, slideId);
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        persist(next);
        return next;
      });
    },
    [course.id, persist],
  );

  const isDone = useCallback(
    (chapterId: string, slideId: string) => done.has(progressKey(course.id, chapterId, slideId)),
    [done, course.id],
  );

  const chapterProgress = useCallback(
    (chapterId: string) => {
      const slides = flattenSlides(course).filter((s) => s.chapter.id === chapterId);
      const n = slides.filter((s) => done.has(progressKey(course.id, chapterId, s.slide.id))).length;
      return { done: n, total: slides.length };
    },
    [course, done],
  );

  const total = flattenSlides(course).length;

  return { count: done.size, total, toggle, isDone, chapterProgress };
}
