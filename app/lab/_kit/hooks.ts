"use client";

import { useEffect, useState } from "react";

/** True while the media query matches. False on the server and first paint. */
export function useMedia(query: string) {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return match;
}

export const usePrefersReducedMotion = () => useMedia("(prefers-reduced-motion: reduce)");
