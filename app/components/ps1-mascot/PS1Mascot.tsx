"use client";

import "@fontsource/silkscreen/400.css";
import "./ps1-mascot.css";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { playStep, timeline, unlockAudio, VOICES, type Voice } from "./animalese";
import type { MascotCharacter, MascotEffects, MascotEngine, MascotMood, MascotScene } from "./engine";

export type { MascotCharacter, MascotEffects, MascotEngine, MascotMood, MascotScene, Voice };

export const DEFAULT_LINES: Record<MascotCharacter, string[]> = {
  cookie: [
    "hi! i'm cookie.",
    "*crunch crunch*",
    "want to play a duet?",
    "i practiced my long tones today!",
    "still warm from the oven.",
    "careful, i'm a little crumbly.",
  ],
  cat: [
    "oh! hello there.",
    "is that a cookie? can i have one?",
    "i only nap a little. like, ten times.",
    "my whiskers say it's snack o'clock.",
    "mrrp?",
  ],
};

const LABELS: Record<MascotCharacter, string> = {
  cookie: "Cookie, a little 3D cookie friend. Click to say hi.",
  cat: "A little white 3D cat. Click to say hi.",
};

export type PS1MascotProps = {
  /** CSS width of the mascot. Height follows `aspect`. */
  size?: number | string;
  /** Width / height. Defaults to 1 without a scene and 4/3 with one. */
  aspect?: number;
  /** Internal render height in pixels; lower is chunkier. */
  pixelHeight?: number;
  character?: MascotCharacter;
  mood?: MascotMood;
  scene?: MascotScene;
  effects?: Partial<MascotEffects>;
  /** Animalese voice for the speech bubble. Off by default (autoplay rules). */
  sound?: boolean;
  /** Override the character's voice (see VOICES in animalese.ts). */
  voice?: Voice;
  /** Text to say now. Changing it makes the cookie say the new text. */
  say?: string | null;
  /** Bump to say the same `say` text again. */
  sayKey?: number;
  /** Lines said in turn when clicked. Pass [] to stay quiet. */
  lines?: string[];
  bubble?: "above" | "inside";
  onClick?: () => void;
  /** Render rate cap. 30 feels right for the PS1 look. */
  fps?: number;
  /** Force a single still frame (also automatic with prefers-reduced-motion). */
  still?: boolean;
  /** Average render ms and real fps, reported once a second. */
  onStats?: (ms: number, fps: number) => void;
  /** The engine once it is built (null when it goes away), for pages that drive a set directly. */
  onEngine?: (engine: MascotEngine | null) => void;
  label?: string;
  className?: string;
  style?: CSSProperties;
};

export default function PS1Mascot({
  size = 220,
  aspect,
  pixelHeight = 180,
  character = "cookie",
  mood = "idle",
  scene = "none",
  effects,
  sound = false,
  voice,
  say = null,
  sayKey = 0,
  lines,
  bubble,
  onClick,
  fps = 30,
  still = false,
  onStats,
  onEngine,
  label,
  className,
  style,
}: PS1MascotProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<MascotEngine | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [shown, setShown] = useState("");
  const [full, setFull] = useState("");
  const timers = useRef<number[]>([]);
  const lineIndex = useRef(0);
  const soundRef = useRef(sound);
  const statsRef = useRef(onStats);
  const voiceRef = useRef<Voice>(voice ?? VOICES[character]);
  const reducedRef = useRef(false);
  const said = lines ?? DEFAULT_LINES[character];

  const ratio = aspect ?? (scene === "none" ? 1 : 4 / 3);
  const placement = bubble ?? (scene === "none" ? "above" : "inside");
  const snap = effects?.snap ?? 2;
  const affine = effects?.affine ?? true;
  const dither = effects?.dither ?? true;
  const colorBits = effects?.colorBits ?? 5;

  useEffect(() => {
    soundRef.current = sound;
    statsRef.current = onStats;
    voiceRef.current = voice ?? VOICES[character];
    reducedRef.current = reducedMotion || still;
  }, [sound, onStats, voice, character, reducedMotion, still]);

  // Load three lazily and build the engine once.
  useEffect(() => {
    let cancelled = false;
    let engine: MascotEngine | null = null;
    import("./engine")
      .then(({ MascotEngine }) => {
        if (cancelled || !canvasRef.current) return;
        try {
          engine = new MascotEngine(canvasRef.current);
        } catch {
          setFailed(true);
          return;
        }
        engine.onStats = (ms, f) => statsRef.current?.(ms, f);
        engineRef.current = engine;
        setReady(true);
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      engine?.dispose();
      engineRef.current = null;
      // A remount (hot reload) builds a fresh engine with no scene or character;
      // flipping `ready` makes every setter below run again for it.
      setReady(false);
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    const id = requestAnimationFrame(sync);
    mq.addEventListener("change", sync);
    return () => {
      cancelAnimationFrame(id);
      mq.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setScene(scene);
  }, [ready, scene]);
  const onEngineRef = useRef(onEngine);
  useEffect(() => {
    onEngineRef.current = onEngine;
  }, [onEngine]);
  useEffect(() => {
    if (!ready) return;
    onEngineRef.current?.(engineRef.current);
    return () => onEngineRef.current?.(null);
  }, [ready]);
  useEffect(() => {
    engineRef.current?.setCharacter(character);
  }, [ready, character]);
  useEffect(() => {
    engineRef.current?.setMood(mood);
  }, [ready, mood]);
  useEffect(() => {
    engineRef.current?.setEffects({ snap, affine, dither, colorBits });
  }, [ready, snap, affine, dither, colorBits]);
  useEffect(() => {
    const h = Math.round(pixelHeight);
    engineRef.current?.setResolution(Math.round(h * ratio), h);
  }, [ready, pixelHeight, ratio]);
  useEffect(() => {
    engineRef.current?.setFps(fps);
  }, [ready, fps]);

  // Run only while on screen, in a visible tab, and motion is welcome.
  useEffect(() => {
    const engine = engineRef.current, root = rootRef.current;
    if (!engine || !root) return;
    const isStill = still || reducedMotion;
    engine.setStill(isStill);
    if (isStill) return;
    let inView = true;
    const sync = () => (inView && !document.hidden ? engine.start() : engine.stop());
    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    });
    io.observe(root);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      engine.stop();
    };
  }, [ready, still, reducedMotion]);

  // Head follows the pointer anywhere on the page.
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const move = (e: PointerEvent) => {
      const r = canvasRef.current?.getBoundingClientRect();
      if (!r) return;
      engine.setPointer(((e.clientX - (r.left + r.width / 2)) / Math.max(200, r.width)) * 1.6, ((r.top + r.height * 0.4 - e.clientY) / Math.max(200, r.height)) * 1.6);
    };
    const out = (e: PointerEvent) => {
      if (!e.relatedTarget) engine.setPointer(null);
    };
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerout", out);
    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerout", out);
    };
  }, [ready]);

  const speak = useCallback((text: string) => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
    const chars = Array.from(text);
    const steps = timeline(text);
    // With reduced motion the whole line appears at once; the voice still plays.
    const instant = reducedRef.current;
    later(() => {
      setFull(text);
      setShown(instant ? text : "");
    }, 0);
    for (const step of steps)
      later(() => {
        if (!instant) setShown(chars.slice(0, step.index + 1).join(""));
        if (soundRef.current) playStep(step, voiceRef.current);
      }, 30 + step.at);
    const at = 30 + (steps.at(-1)?.at ?? 0);
    later(() => {
      setShown("");
      setFull("");
    }, at + 1800 + text.length * 25);
  }, []);

  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  useEffect(() => {
    if (say) speak(say);
  }, [say, sayKey, speak]);

  const handleClick = () => {
    if (soundRef.current) unlockAudio();
    engineRef.current?.react();
    if (said.length) {
      speak(said[lineIndex.current % said.length]);
      lineIndex.current++;
    }
    onClick?.();
  };

  return (
    <div
      ref={rootRef}
      className={`ps1m ${failed ? "ps1m--failed" : ""} ${className ?? ""}`}
      style={{ width: typeof size === "number" ? `${size}px` : size, aspectRatio: String(ratio), ...style }}
    >
      <button type="button" className="ps1m-hit" aria-label={label ?? LABELS[character]} onClick={handleClick}>
        <canvas ref={canvasRef} className="ps1m-canvas" />
      </button>
      <div className={`ps1m-bubble ps1m-bubble--${placement}`} role="status" aria-live="polite" hidden={!full}>
        <span aria-hidden="true">{shown}</span>
        <span className="ps1m-sr">{full}</span>
      </div>
    </div>
  );
}
