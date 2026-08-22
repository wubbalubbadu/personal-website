import { ANIMALS, type Animal, type Rarity } from "../data/animals";

const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 0.6,
  uncommon: 0.3,
  rare: 0.1,
};

function hashString(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function todayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function animalForDate(dateKey: string): Animal {
  const rng = mulberry32(hashString(dateKey));
  const tierRoll = rng();
  let tier: Rarity = "common";
  if (tierRoll > RARITY_WEIGHTS.common + RARITY_WEIGHTS.uncommon) tier = "rare";
  else if (tierRoll > RARITY_WEIGHTS.common) tier = "uncommon";
  const pool = ANIMALS.filter((a) => a.rarity === tier);
  const pick = Math.floor(rng() * pool.length);
  return pool[Math.min(pick, pool.length - 1)];
}

const MISSIONS_PREFIX = "critter:missions:";
const CRITTERDEX_KEY = "critter:dex";
const COMPLETED_DATES_KEY = "critter:completedDates";

export function getMissionState(dateKey: string): [boolean, boolean, boolean] {
  if (typeof window === "undefined") return [false, false, false];
  try {
    const raw = window.localStorage.getItem(MISSIONS_PREFIX + dateKey);
    if (!raw) return [false, false, false];
    const parsed = JSON.parse(raw);
    return [!!parsed[0], !!parsed[1], !!parsed[2]];
  } catch {
    return [false, false, false];
  }
}

export function setMissionState(dateKey: string, state: [boolean, boolean, boolean]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MISSIONS_PREFIX + dateKey, JSON.stringify(state));
}

export function getCritterdex(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CRITTERDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToCritterdex(id: string) {
  if (typeof window === "undefined") return;
  const dex = new Set(getCritterdex());
  dex.add(id);
  window.localStorage.setItem(CRITTERDEX_KEY, JSON.stringify([...dex]));
}

function getCompletedDates(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(COMPLETED_DATES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function markDateCompleted(dateKey: string) {
  if (typeof window === "undefined") return;
  const dates = new Set(getCompletedDates());
  dates.add(dateKey);
  window.localStorage.setItem(COMPLETED_DATES_KEY, JSON.stringify([...dates]));
}

export function currentStreak(): number {
  const dates = new Set(getCompletedDates());
  const cursor = new Date();
  let streak = 0;
  if (!dates.has(todayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (dates.has(todayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
