/**
 * How the practice tools sound, for the whole studio: the metronome's click and accent, the drone's voice, and the
 * pitch everything is tuned to (A = 438 to 446). One small store, read by the audio code directly (bookClick,
 * droneVoice, lib/pitch.ts) so every page agrees without passing settings around.
 *
 * Stored under a "cookie" key, so it travels in device transfer codes like the rest of the studio's data.
 */

export const TOOL_SOUNDS_KEY = "cookie:tool-sounds:v1";

export type ClickSound = "beep" | "woodblock" | "tick" | "voice";
/** How an accented beat differs: the same sound higher, a bell, or the same sound just louder. */
export type AccentSound = "higher" | "bell" | "louder";
export type DroneSound = "sine" | "organ" | "flute" | "cello";
/** A second note under or over the drone: a pure fifth above, or the octave below. */
export type DroneAdd = "none" | "fifth" | "octave";

export type ToolSounds = {
  click: ClickSound;
  /** Normal clicks and subdivision ticks, 0 to 1. */
  clickVolume: number;
  accent: AccentSound;
  /** Accented clicks, 0 to 1. */
  accentVolume: number;
  drone: DroneSound;
  droneAdd: DroneAdd;
  /** Concert A in Hz. Tuner, pitch tracking, drones and playback all use it. */
  a4: number;
};

export const A4_MIN = 438;
export const A4_MAX = 446;

export const DEFAULT_TOOL_SOUNDS: ToolSounds = {
  click: "beep",
  clickVolume: 0.8,
  accent: "higher",
  accentVolume: 0.8,
  drone: "sine",
  droneAdd: "none",
  a4: 440,
};

const CLICKS: ClickSound[] = ["beep", "woodblock", "tick", "voice"];
const ACCENTS: AccentSound[] = ["higher", "bell", "louder"];
const DRONES: DroneSound[] = ["sine", "organ", "flute", "cello"];
const ADDS: DroneAdd[] = ["none", "fifth", "octave"];

const pick = <T,>(list: readonly T[], value: unknown, fallback: T) => (list.includes(value as T) ? (value as T) : fallback);
const unit = (value: unknown, fallback: number) => (typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback);

/** Anything stored (or arriving in a transfer code) is checked, so a bad value can never reach the audio code. */
export function readToolSounds(raw: string | null): ToolSounds {
  let value: Record<string, unknown> = {};
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === "object") value = parsed;
  } catch {
    /* Fall back to the defaults. */
  }
  const d = DEFAULT_TOOL_SOUNDS;
  const a4 = typeof value.a4 === "number" && Number.isFinite(value.a4) ? Math.round(Math.max(A4_MIN, Math.min(A4_MAX, value.a4))) : d.a4;
  return {
    click: pick(CLICKS, value.click, d.click),
    clickVolume: unit(value.clickVolume, d.clickVolume),
    accent: pick(ACCENTS, value.accent, d.accent),
    accentVolume: unit(value.accentVolume, d.accentVolume),
    drone: pick(DRONES, value.drone, d.drone),
    droneAdd: pick(ADDS, value.droneAdd, d.droneAdd),
    a4,
  };
}

let current: ToolSounds | null = null;
const listeners = new Set<() => void>();

export function getToolSounds(): ToolSounds {
  if (current) return current;
  if (typeof window === "undefined") return DEFAULT_TOOL_SOUNDS;
  try {
    current = readToolSounds(localStorage.getItem(TOOL_SOUNDS_KEY));
  } catch {
    current = DEFAULT_TOOL_SOUNDS;
  }
  return current;
}

export function setToolSounds(patch: Partial<ToolSounds>) {
  current = readToolSounds(JSON.stringify({ ...getToolSounds(), ...patch }));
  try {
    localStorage.setItem(TOOL_SOUNDS_KEY, JSON.stringify(current));
  } catch {
    /* Keep this visit's choice when storage is unavailable. */
  }
  listeners.forEach((fn) => fn());
}

export function subscribeToolSounds(fn: () => void) {
  listeners.add(fn);
  // Another tab changed it.
  const storage = (event: StorageEvent) => {
    if (event.key !== TOOL_SOUNDS_KEY) return;
    current = null;
    fn();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", storage);
  return () => {
    listeners.delete(fn);
    if (typeof window !== "undefined") window.removeEventListener("storage", storage);
  };
}

/** Concert A for every pitch calculation in the studio. */
export const referenceA = () => getToolSounds().a4;
