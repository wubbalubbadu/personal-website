"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import CatHost from "../home-1/CatHost";
import { playFlute } from "../_kit/fluteTone";
import { usePrefersReducedMotion } from "../_kit/hooks";
import "./landing-texture.css";

/**
 * Three craft passes over the live Cat host, without touching its files:
 * everything here is CSS scoped under .lt--a / .lt--b / .lt--c, plus a boot
 * screen portalled into the console's screen for C.
 *   A  retouched plastic: grain, edge light, worn thumb spots, glass, real shadow
 *   B  A, and the page becomes the desk the console rests on
 *   C  A, and the console powers on by tuning to A before the cat appears
 */

type Look = "base" | "a" | "b" | "c";

const LOOKS: { id: Look; name: string }[] = [
  { id: "base", name: "Now" },
  { id: "a", name: "A  Retouched" },
  { id: "b", name: "B  On a desk" },
  { id: "c", name: "C  Power on" },
];

function readLook(): Look {
  if (typeof window === "undefined") return "a";
  const q = new URLSearchParams(window.location.search).get("look");
  return q === "base" || q === "b" || q === "c" ? q : "a";
}

/** The power-on: a tuner needle swings in from flat and settles on A. */
// Keyed by run, so each power-on mounts fresh. It only mounts after hydration
// (booting starts in an effect), so the console's screen is already there.
function Boot({ onDone }: { onDone: () => void }) {
  const [screen] = useState(() => document.querySelector<HTMLElement>(".lt .hh-screen"));
  const [phase, setPhase] = useState<"tune" | "ok" | "out">("tune");

  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase("ok"), 1500);
    const t2 = window.setTimeout(() => setPhase("out"), 2300);
    const t3 = window.setTimeout(onDone, 2800);
    return () => [t1, t2, t3].forEach(window.clearTimeout);
  }, [onDone]);

  if (!screen) return null;
  return createPortal(
    <div className={`lt-boot is-${phase}`} aria-hidden="true">
      <div className="lt-boot__dial">
        <span className="lt-boot__tick lt-boot__tick--flat">♭</span>
        <span className="lt-boot__tick lt-boot__tick--mid" />
        <span className="lt-boot__tick lt-boot__tick--sharp">♯</span>
        <span className="lt-boot__needle" />
      </div>
      <p className="lt-boot__note">A</p>
      <p className="lt-boot__line">{phase === "tune" ? "tuning to 442" : "in tune"}</p>
    </div>,
    screen,
  );
}

export default function LandingTexture() {
  const [look, setLook] = useState<Look>("a");
  const [bootRun, setBootRun] = useState(0);
  const [booting, setBooting] = useState(false);
  const reduced = usePrefersReducedMotion();

  // The look lives in the URL, which the server can't read; pick it up after hydration.
  useEffect(() => {
    const l = readLook();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLook(l);
    if (l === "c") setBooting(true);
  }, []);
  const endBoot = useCallback(() => setBooting(false), []);

  const pick = (l: Look) => {
    setLook(l);
    const u = new URL(window.location.href);
    u.searchParams.set("look", l);
    window.history.replaceState(null, "", u);
    if (l === "c") replay(false);
  };

  // Sound only on a real click: the page can't play audio before one anyway.
  const replay = (withSound: boolean) => {
    setBootRun((n) => n + 1);
    setBooting(true);
    if (withSound) window.setTimeout(() => playFlute(442, 1.1), 1300);
  };

  return (
    <div className={`lt lt--${look}${look === "c" && booting && !reduced ? " is-booting" : ""}`}>
      <nav className="lt-pick" aria-label="Look">
        {LOOKS.map((l) => (
          <button key={l.id} type="button" aria-pressed={look === l.id} onClick={() => pick(l.id)}>
            {l.name}
          </button>
        ))}
        {look === "c" ? (
          <button type="button" className="lt-pick__again" onClick={() => replay(true)}>
            Power on again
          </button>
        ) : null}
      </nav>

      {look === "b" ? (
        <div className="lt-desk" aria-hidden="true">
          <span className="lt-desk__sheet" />
          <span className="lt-desk__pencil" />
          <span className="lt-desk__mug" />
        </div>
      ) : null}

      <CatHost />

      {look === "c" && booting && !reduced ? <Boot key={bootRun} onDone={endBoot} /> : null}
    </div>
  );
}
