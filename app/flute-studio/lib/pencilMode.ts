"use client";

/**
 * "Apple Pencil only" — the explicit version of palm rejection.
 *
 * The heuristic in the reader guesses: a pen seen a moment ago means any
 * touch is the hand, and a contact wider than a fingertip is a palm. Good
 * guesses, but guesses — and a drawing app that occasionally eats a stroke
 * is worse than one that never accepts the wrong contact. Every serious
 * iPad drawing app therefore offers a switch, and this is ours: with it on,
 * only a pen draws and touch is never ink, whatever it looks like.
 *
 * A module rather than context because the setting lives in the account
 * menu and is read in the reader, which are in different trees.
 */
import { useEffect, useState } from "react";

const KEY = "cookie:pencil-only:v1";
const EVENT = "cookie:pencil-only";

/**
 * Whether this device has a touch screen at all. A Mac reports 0 touch
 * points, an iPad (even one claiming to be a Mac) reports 5, so a pencil
 * setting means nothing where this is false.
 */
export function hasTouchScreen() {
  return typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;
}

export function pencilOnly() {
  // Without a touch screen there are no fingers to reject, and a value
  // carried over from an iPad must not switch a laptop's ink off.
  if (!hasTouchScreen()) return false;
  try {
    return localStorage.getItem(KEY) === "true";
  } catch {
    // Storage can be disabled; drawing with a finger is the safer default.
    return false;
  }
}

export function setPencilOnly(value: boolean) {
  try {
    localStorage.setItem(KEY, String(value));
  } catch {
    /* Storage may be disabled — the setting still applies for this session. */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: value }));
}

/** Reads the setting and follows it while the page is open. */
export function usePencilOnly() {
  const [only, setOnly] = useState(false);
  useEffect(() => {
    // Read after hydration: the server has no localStorage, and rendering
    // one value then another would mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOnly(pencilOnly());
    const onChange = (event: Event) => setOnly(hasTouchScreen() && (event as CustomEvent<boolean>).detail);
    // `storage` covers the same setting changed in another tab.
    const onStorage = (event: StorageEvent) => {
      if (event.key === KEY) setOnly(pencilOnly());
    };
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return only;
}

/** Read after hydration for the same reason as `usePencilOnly`. */
export function useTouchScreen() {
  const [touch, setTouch] = useState(false);
  // Device capability is unavailable during server rendering.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setTouch(hasTouchScreen()), []);
  return touch;
}
