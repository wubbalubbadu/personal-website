"use client";

import { useEffect, useRef, useState } from "react";
import "../_kit/kit.css";
import "./handheld-3d.css";
import type { BootStyle, HoloLook } from "./dialogue";
import type { ClickKind } from "./scene";

/**
 * A study for the landing: Haylie's own handheld as a real 3D object instead
 * of a CSS shape. What sadok.mx gets right, taken as techniques (his Game Boy
 * is a licensed CC-BY scan; this is our own console, modelled in code):
 *   - real geometry: a bevelled shell, a rocking D-pad, domed face buttons
 *   - physical materials lit by an environment, so plastic catches light
 *   - every button is its own mesh that sinks on press and springs back
 *   - a click sound per press, and the whole device leans toward the pointer
 * The cat's studio is drawn onto the screen from the existing mascot engine.
 * The dialogue is a hologram the console projects, and asking about flute
 * plays a clip in it. This is the home page (Nov 10). The lab route passes
 * `tries` to show the look, power-on and click toggles still to be picked.
 */
export default function Handheld3D({ tries = false }: { tries?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{
    powerOn(sound?: boolean): void;
    setLook(l: HoloLook): void;
    setBoot(b: BootStyle): void;
    setClick(k: ClickKind): void;
  } | null>(null);
  const [boot, setBoot] = useState<BootStyle>("chime");
  const [clickKind, setClickKind] = useState<ClickKind>("pop");
  const [look, setLook] = useState<HoloLook>("warm");

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let dispose: (() => void) | undefined;
    let cancelled = false;
    void import("./scene").then(({ mountHandheld }) => {
      if (cancelled) return;
      const h = mountHandheld(el);
      api.current = h;
      dispose = h.dispose;
    });
    return () => {
      cancelled = true;
      api.current = null;
      dispose?.();
    };
  }, []);

  return (
    <main className="lab h3">
      {tries && (
        <>
          <nav className="h3-pick h3-pick--try" aria-label="Try">
            {(["warm", "cool", "glass"] as const).map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={look === l}
                onClick={() => {
                  setLook(l);
                  api.current?.setLook(l);
                }}
              >
                {l === "warm"
                  ? "Island warm"
                  : l === "cool"
                    ? "Island cool"
                    : "Dark glass"}
              </button>
            ))}
          </nav>
          <nav
            className="h3-pick h3-pick--sound"
            aria-label="Power on and clicks"
          >
            {(["chime", "tuner"] as const).map((b) => (
              <button
                key={b}
                type="button"
                aria-pressed={boot === b}
                onClick={() => {
                  setBoot(b);
                  api.current?.setBoot(b);
                }}
              >
                {b === "chime" ? "Power on: chime" : "Power on: tuner"}
              </button>
            ))}
            {(["pop", "tick", "wood"] as const).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={clickKind === k}
                onClick={() => {
                  setClickKind(k);
                  api.current?.setClick(k);
                }}
              >
                {k === "pop"
                  ? "Click: pop"
                  : k === "tick"
                    ? "Click: tick"
                    : "Click: wood"}
              </button>
            ))}
          </nav>
        </>
      )}
      <div className="h3-stage" ref={host} />
      <p className="h3-help">
        <kbd>W</kbd> <kbd>S</kbd> choose, <kbd>Enter</kbd> next,{" "}
        <kbd>A</kbd> <kbd>D</kbd> pick things on screen (or click them),{" "}
        <kbd>Backspace</kbd> back, <kbd>Space</kbd> pets the cat.
      </p>
    </main>
  );
}
