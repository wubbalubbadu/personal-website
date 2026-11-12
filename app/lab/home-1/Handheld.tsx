"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import type { MascotEngine, MascotMood, MascotScene } from "../../components/ps1-mascot";
import MascotSlot from "../_kit/MascotSlot";
import { useMedia } from "../_kit/hooks";

/** The tall console's sizes in mm (they match LAYOUTS.tall in console3d,
 *  kept here so the page doesn't load three just to measure). */
const TALL_VIEW_W = 120;
const TALL_VIEW_H = 126;
const TALL_SCREEN_W = 100;
const TALL_SCREEN_H = 75;
/** How much wider, or on a narrow phone taller, (mm) the tall console gets to
 *  fill a box of availW x availH
 *  px: near-square on phones, wider on wider screens, until the
 *  screen is about 16:9 (any wider and the room's desk edges show). Steps of 6mm,
 *  so a small resize doesn't rebuild it. */
function tallStretch(availW: number, availH: number): [w: number, h: number] {
  if (availH <= 0 || availW <= 0) return [0, 0];
  const r = availW / availH;
  if (r >= TALL_VIEW_W / TALL_VIEW_H) {
    const viewW = Math.min(TALL_VIEW_W * 1.25, (availW / availH) * TALL_VIEW_H);
    return [Math.floor((viewW - TALL_VIEW_W) / 6) * 6, 0];
  }
  // a phone: the console is as wide as the phone already, so it grows taller
  // (the screen up to a little taller than square) instead of leaving the bottom empty
  const viewH = Math.min(TALL_VIEW_H + 36, TALL_VIEW_W / r);
  return [0, Math.floor((viewH - TALL_VIEW_H) / 6) * 6];
}
import { unlockAudio } from "../../components/ps1-mascot/animalese";
import type { Key3D } from "./console3d";

/**
 * The cat's handheld, the page's centrepiece. Its screen is the cat's studio
 * (a desk under a wall) and nothing else, so the room stays clear; what the
 * cat says comes out of the speaker into a bubble below the console. The
 * page draws what goes over the scene (name tag, item card, laptop desktop);
 * this file is the device: body, screen and buttons.
 *
 * - "psp": wide; on a phone it stacks (screen on top, controls under it,
 *   like the PSP Go) so the screen can be big.
 * - "gb": portrait, screen on top, D-pad and A / B below.
 *
 * From 760px in landscape (portrait iPads get the phone layout) the PSP is drawn as a real 3D object (console3d.ts, three.js);
 * the screen stays this same HTML, bent onto the 3D screen every frame, and
 * the HTML buttons stay for keyboards and screen readers.
 */

export type Device = "psp" | "gb";

export type Pad = {
  up: () => void;
  down: () => void;
  left: () => void;
  right: () => void;
  /** Inspect or open. */
  a: () => void;
  /** Back. */
  b: () => void;
  /** △: pet the cat. */
  pet: () => void;
  /** □: back to the hello. */
  home: () => void;
};

const BOOT_NAME = "hayliewu.com";

/** The boot's start chime: two soft square-wave notes, a fifth apart. */
function chime() {
  const ctx = unlockAudio();
  if (!ctx) return;
  const now = ctx.currentTime + 0.03;
  [784, 1175].forEach((f, i) => {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = f;
    const t = now + i * 0.11;
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(0.06, t + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    osc.connect(amp).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  });
}

/**
 * The power-on, over the 3D console's screen: it warms up like an old tube,
 * the site's name drops in, pixel by pixel, then waits on PRESS START. The
 * press is the gesture browsers need before any sound, so it chimes, the name
 * waves, the boot screen fades out in a few hard steps, and the hologram boots
 * (onDone) with the cat's voice already allowed.
 */
function Boot({ onDone, onKey }: { onDone: () => void; onKey?: (key: string) => void }) {
  // 0 dropping in, 1 waiting for a press, 2 the wave, 3 fading out, 4 gone
  // (it only mounts in the browser, once the 3D console is on, so window is there)
  const [phase, setPhase] = useState(() => (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 4 : 0));
  const done = useRef(onDone);
  const onKeyRef = useRef(onKey);
  useEffect(() => {
    done.current = onDone;
    onKeyRef.current = onKey;
  });
  useEffect(() => {
    if (phase >= 4) {
      done.current();
      return;
    }
    const timers: number[] = [];
    const kinds = ["pointerdown", "pointerup", "click", "keydown"];
    // Boot stays mounted (it renders nothing once gone), so the cleanup below
    // never runs on its own: let go of the page the moment the boot is over
    const release = () => kinds.forEach((k) => window.removeEventListener(k, swallow, true));
    let pressed = false;
    let arrived = false;
    let chimed = false;
    // sound never stops the boot: an iPhone's audio can throw, and the press
    // was already used up, so it froze on PRESS START
    const ring = () => {
      chimed = true;
      try {
        chime();
      } catch {
        /* no chime, still boots */
      }
    };
    const go = () => {
      setPhase(2);
      timers.push(
        window.setTimeout(() => setPhase(3), 600),
        window.setTimeout(() => {
          release();
          setPhase(4);
          done.current();
        }, 1200),
      );
    };
    // until the boot is gone, a press only starts it: nothing behind it reacts
    const swallow = (e: Event) => {
      // a press on the 3D console goes through, so its button still moves
      // (the console ignores what it means until the boot is done)
      const onConsole = (e.target as Element | null)?.closest?.(".hh-3d");
      if (!onConsole) e.stopPropagation();
      if (e.type === "keydown") onKeyRef.current?.((e as KeyboardEvent).key);
      if (e.type === "keydown") e.preventDefault();
      // iPhone Safari lets sound start on the finger lifting (or the click),
      // not on touching down: unlock there, and chime then if touching down
      // couldn't
      if (e.type === "pointerup" || e.type === "click") {
        unlockAudio();
        if (pressed && !chimed) ring();
        return;
      }
      if ((e as KeyboardEvent).repeat || pressed) return;
      pressed = true;
      if (arrived) go();
      // a key (or a browser that allows it on touching down) chimes right away
      if (e.type === "keydown" || unlockAudio()?.state === "running") ring();
    };
    kinds.forEach((k) => window.addEventListener(k, swallow, true));
    timers.push(
      window.setTimeout(() => {
        arrived = true;
        if (pressed) go();
        else setPhase(1);
      }, 1750),
    );
    return () => {
      timers.forEach((x) => window.clearTimeout(x));
      release();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the timeline runs once, from mount
  }, []);
  if (phase >= 4) return null;
  return (
    <div className={`hh-boot${phase === 1 ? " is-in" : ""}${phase >= 2 ? " is-ok" : ""}${phase >= 3 ? " is-out" : ""}`} aria-hidden="true">
      <p className="hh-boot__logo">
        {[...BOOT_NAME].map((c, i) => (
          <span key={i} style={{ "--i": i } as React.CSSProperties}>
            {c}
          </span>
        ))}
      </p>
      <p className={`hh-boot__start${phase === 1 ? " is-on" : ""}`}>PRESS START</p>
    </div>
  );
}

function DPad({ pad }: { pad: Pad }) {
  return (
    <div className="hh-dpad" role="group" aria-label="Look around">
      <button type="button" className="hh-dpad__up" onClick={pad.up} aria-label="Up: the wall" title="Up" />
      <button type="button" className="hh-dpad__left" onClick={pad.left} aria-label="Left" title="Left" />
      <span className="hh-dpad__hub" aria-hidden="true" />
      <button type="button" className="hh-dpad__right" onClick={pad.right} aria-label="Right" title="Right" />
      <button type="button" className="hh-dpad__down" onClick={pad.down} aria-label="Down: the desk" title="Down" />
    </div>
  );
}

export function Console({
  device,
  sceneAspect,
  pixelHeight,
  mood,
  scene,
  onEngine,
  onSceneTap,
  onSceneHover,
  overlay,
  pad,
  talking,
  onBooted,
}: {
  device: Device;
  /** Width / height the scene renders at. The screen's own shape comes from CSS
   *  (4:3, or 16:9 on the wide PSP) so the first paint is already right. */
  sceneAspect: number;
  pixelHeight: number;
  mood: MascotMood;
  /** The desk-and-wall studio, or the living room. */
  scene: MascotScene;
  onEngine: (engine: MascotEngine | null) => void;
  /** A tap on the scene, 0..1 from the top left. */
  onSceneTap: (x: number, y: number) => void;
  onSceneHover: (x: number, y: number) => void;
  /** Drawn over the scene: name tag, laptop desktop, dialogue. */
  overlay: ReactNode;
  pad: Pad;
  /** Sound waves come out of the speaker while the cat is talking. */
  talking: boolean;
  /** The 3D console finished its power-on: the hologram can come on. */
  onBooted?: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const padRef = useRef(pad);
  useEffect(() => {
    padRef.current = pad;
  });
  // 3D everywhere now: the wide console on desktops and landscape iPads, the
  // tall one on phones and portrait iPads (her call: bring 3D to the phone)
  const wide = useMedia("(min-width: 760px) and (min-height: 560px) and (orientation: landscape)");
  const three = device === "psp";
  // the tall console widens to fill a wider screen instead of staying square
  // (her call): extra mm of width, from the room the stage leaves it
  const [stretch, setStretch] = useState(0);
  const [grow, setGrow] = useState(0);
  // the console waits for this, so a phone builds it once at its real shape
  // (building it, then rebuilding it a moment later, froze the boot on an iPhone)
  const [measured, setMeasured] = useState(false);
  useEffect(() => {
    if (!three || wide) return;
    const stage = host.current?.closest<HTMLElement>(".ch-stage");
    const calc = () => {
      const room = stage ? parseFloat(getComputedStyle(stage).getPropertyValue("--holo-room")) || 0 : 0;
      // a phone is always full width (Safari's bars made the height-based
      // size come out narrow), with a screen a bit squarer than 4:3: square
      // only added wall above and below (her call)
      const [w, h] = window.innerWidth < 600 ? [0, 6] : tallStretch(window.innerWidth - 8, window.innerHeight - room - 8);
      setStretch(w);
      setGrow(h);
      setMeasured(true);
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [three, wide]);
  const bootedRef = useRef(false);
  // the 3D console has drawn: only then does the screen show and the boot start
  const [ready, setReady] = useState(false);
  const lensRef = useRef<(on: boolean) => void>(() => {});
  const keyAnimRef = useRef<(key: string) => void>(() => {});
  const booted = () => {
    bootedRef.current = true;
    lensRef.current(true);
    onBooted?.();
  };
  useEffect(() => {
    const el = host.current;
    const scr = screenRef.current;
    if (!three || !el || !scr) return;
    if (!wide && !measured) return;
    let api: { press(k: Key3D): void; setLens(on: boolean): void; dispose(): void } | undefined;
    let cancelled = false;
    // the HTML pad already acts on keys (CatHost); here the 3D buttons just move with them
    const KEYS: Record<string, Key3D> = {
      arrowup: "up", w: "up", arrowdown: "down", s: "down", arrowleft: "left", a: "left", arrowright: "right", d: "right",
      escape: "cir", p: "tri", enter: "crs", " ": "crs",
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(t.tagName) && (e.key === "Enter" || e.key === " ")) return;
      const k = KEYS[e.key.toLowerCase()];
      if (k) api?.press(k);
    };
    void import("./console3d").then(({ mountConsole3D }) => {
      if (cancelled) return;
      // the desk layout (CatHost sets is-desk unless ?flat, at every size): the
      // console leans back on a desk with the hologram lying in front of it
      const stage = el.closest<HTMLElement>(".ch-stage");
      const holo = stage?.querySelector<HTMLElement>(".ch-holo");
      const desk = stage?.classList.contains("is-desk") && holo ? { stage, holo } : undefined;
      // read the shape now, not from `wide` (it starts false until the media query runs)
      const shape = window.matchMedia("(min-width: 760px) and (min-height: 560px) and (orientation: landscape)").matches ? "wide" : "tall";
      api = mountConsole3D(
        el,
        scr,
        (k) => {
          if (!bootedRef.current) return; // still booting: the button moves, nothing happens
          const p = padRef.current;
          ({ up: p.up, down: p.down, left: p.left, right: p.right, crs: p.a, cir: p.b, tri: p.pet, sqr: p.home })[k]();
        },
        desk,
        shape,
        shape === "tall" ? stretch : 0,
        shape === "tall" ? grow : 0,
      );
      // start the boot only once the console has drawn its first frame: that
      // frame compiles the lighting and shadows, which on an iPhone held up
      // the page for a moment and froze the name halfway through dropping in
      const shown = api;
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (cancelled) return;
          el.classList.add("is-on");
          setReady(true);
          if (bootedRef.current) shown.setLens(true);
        }),
      );
    });
    lensRef.current = (on) => api?.setLens(on);
    keyAnimRef.current = (key) => {
      const k = KEYS[key.toLowerCase()];
      if (k) api?.press(k);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
      el.classList.remove("is-on");
      api?.dispose();
    };
  }, [three, wide, stretch, grow, measured]);

  const at = (e: ReactPointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height] as const;
  };
  return (
    // The PSP picks stacked or side-by-side in CSS by screen width, not here:
    // the server can't know the width, and guessing made desktops start as a phone.
    <div className={`hh hh--${device}${device === "gb" ? " hh--stacked" : ""}${talking ? " is-talking" : ""}${three ? " is-3d" : ""}${three && !wide ? " is-tall" : ""}${three && ready ? " is-3d-ready" : ""}`}
      style={three && !wide ? ({ "--tall-vw": TALL_VIEW_W + stretch, "--tall-vh": TALL_VIEW_H + grow } as CSSProperties) : undefined}
    >
      {/* the 3D console draws here on wide screens (always rendered, so the screen never remounts) */}
      <div className="hh-3d" ref={host} aria-hidden="true" />
      <div className="hh-top">
        {device === "gb" ? <span className="hh-led" aria-hidden="true" /> : null}
        <div className="hh-bezel">
          <div className="hh-screen" ref={screenRef}>
            {/* Taps and hovers find the nearest glowing thing; the buttons and the
                list in the page cover keyboards and screen readers. */}
            <div
              className="hh-scene"
              onPointerUp={(e) => {
                if (e.pointerType === "mouse" && e.button !== 0) return;
                // A click focuses the cat's own button, and Enter would then pet her
                // instead of inspecting; let go of it (Tab still reaches it).
                const f = document.activeElement;
                if (f instanceof HTMLElement && e.currentTarget.contains(f)) f.blur();
                onSceneTap(...at(e));
              }}
              onPointerMove={(e) => {
                if (e.pointerType === "mouse") onSceneHover(...at(e));
              }}
              onPointerLeave={() => onSceneHover(-1, -1)}
            >
              <MascotSlot
                fill
                aspect={three && !wide ? (TALL_SCREEN_W + stretch) / (TALL_SCREEN_H + grow) : sceneAspect}
                pixelHeight={pixelHeight}
                character="cat"
                scene={scene}
                mood={mood}
                label="Haylie's cat"
                onEngine={onEngine}
              />
            </div>
            {overlay}
            {three && ready ? <Boot onDone={booted} onKey={(key) => keyAnimRef.current(key)} /> : null}
          </div>
        </div>
      </div>

      <div className="hh-ctl hh-ctl--left">
        <DPad pad={pad} />
      </div>

      <div className="hh-ctl hh-ctl--mid">
        <span className="hh-waves" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </div>

      <div className="hh-ctl hh-ctl--right">
        {device === "psp" ? (
          <div className="hh-face" role="group" aria-label="Buttons">
            <button type="button" className="hh-face__btn hh-face__btn--top" onClick={pad.pet} aria-label="Pet the cat" title="Pet the cat">
              <span aria-hidden="true">△</span>
            </button>
            <button type="button" className="hh-face__btn hh-face__btn--right" onClick={pad.b} aria-label="Back" title="Back">
              <span aria-hidden="true">○</span>
            </button>
            <button type="button" className="hh-face__btn hh-face__btn--bottom" onClick={pad.a} aria-label="Inspect" title="Inspect">
              <span aria-hidden="true">✕</span>
            </button>
            <button type="button" className="hh-face__btn hh-face__btn--left" onClick={pad.home} aria-label="Back to the hello" title="Back to the hello">
              <span aria-hidden="true">□</span>
            </button>
            <small className="hh-print hh-print--x" aria-hidden="true">INSPECT</small>
            <small className="hh-print hh-print--o" aria-hidden="true">BACK</small>
            <small className="hh-print hh-print--t" aria-hidden="true">PET</small>
            <small className="hh-print hh-print--s" aria-hidden="true">HOME</small>
          </div>
        ) : (
          <div className="hh-ab">
            <span className="hh-ab__key">
              <button type="button" className="hh-ab__btn hh-ab__btn--b" onClick={pad.b} aria-label="Back" title="Back">
                <span aria-hidden="true">B</span>
              </button>
              <small className="hh-print" aria-hidden="true">BACK</small>
            </span>
            <span className="hh-ab__key hh-ab__key--a">
              <button type="button" className="hh-ab__btn hh-ab__btn--a" onClick={pad.a} aria-label="Inspect" title="Inspect">
                <span aria-hidden="true">A</span>
              </button>
              <small className="hh-print" aria-hidden="true">INSPECT</small>
            </span>
          </div>
        )}
      </div>

      {device === "psp" ? (
        <>
          <span className="hh-speaker hh-speaker--left" aria-hidden="true" />
          <span className="hh-speaker hh-speaker--right" aria-hidden="true" />
        </>
      ) : (
        <span className="hh-grille" aria-hidden="true" />
      )}
    </div>
  );
}
