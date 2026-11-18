// What the NY trip page knows before you edit it: places worth going, the
// starting schedule, and the maths that turns real lat/lng into the toy map.
// Your schedule edits are saved in this browser and can be shared as a link.

// ---------------------------------------------------------------- map maths

/**
 * The toy map is drawn on Manhattan's street grid, which runs 29° east of true
 * north, so avenues are straight up and down. 1 map unit is 400 m (about five
 * blocks). Columbus Circle (59th St and 8th Ave) sits at x = -1.1, z = -6.
 * North is -z.
 */
const ORIGIN = { lat: 40.7681, lng: -73.9819, x: -1.1, z: -6 };
const GRID = (29 * Math.PI) / 180;
const M_PER_UNIT = 400;

export function toMap(lat: number, lng: number) {
  const e = (lng - ORIGIN.lng) * Math.cos((ORIGIN.lat * Math.PI) / 180) * 111320;
  const n = (lat - ORIGIN.lat) * 110540;
  return {
    x: ORIGIN.x + (e * Math.cos(GRID) - n * Math.sin(GRID)) / M_PER_UNIT,
    z: ORIGIN.z - (e * Math.sin(GRID) + n * Math.cos(GRID)) / M_PER_UNIT,
  };
}

/** Rough shoreline from the Battery up the east side to 125th St, back down the west side. */
export const SHORE: [number, number][] = [
  [40.7003, -74.015], [40.706, -74.003], [40.7075, -73.999], [40.71, -73.992], [40.711, -73.979],
  [40.718, -73.974], [40.73, -73.972], [40.736, -73.9745], [40.749, -73.968], [40.759, -73.958],
  [40.768, -73.952], [40.775, -73.943], [40.783, -73.942], [40.792, -73.937], [40.797, -73.929],
  [40.804, -73.931], [40.818, -73.96], [40.805, -73.97], [40.796, -73.978], [40.786, -73.986],
  [40.781, -73.989], [40.773, -73.995], [40.762, -74.003], [40.756, -74.008], [40.748, -74.01],
  [40.741, -74.01], [40.733, -74.011], [40.724, -74.012], [40.717, -74.014], [40.71, -74.018],
  [40.704, -74.018],
];

export const PARK_CORNERS = { sw: [40.7681, -73.9819], ne: [40.7968, -73.9497] } as const;
export const LIBERTY = [40.6892, -74.0445] as const;
/** Trains from Boston come under the East River around 32nd St into Penn Station. */
export const TUNNEL = [40.744, -73.971] as const;

// ---------------------------------------------------------------- places

export type Cat = "base" | "see" | "eat" | "shop" | "park";

export const CATS: { id: Cat | "all"; label: string; emoji: string }[] = [
  { id: "all", label: "All", emoji: "✨" },
  { id: "see", label: "See", emoji: "👀" },
  { id: "eat", label: "Eat", emoji: "🍜" },
  { id: "shop", label: "Shop", emoji: "🛍️" },
  { id: "park", label: "Outside", emoji: "🌳" },
];

export const CAT_COLOR: Record<Cat, string> = {
  base: "#ff7eb6",
  see: "#b28dff",
  eat: "#ff8a5b",
  shop: "#ffd23f",
  park: "#4cc38a",
};

export type Spot = {
  id: string;
  name: string;
  emoji: string;
  cat: Cat;
  lat: number;
  lng: number;
  area: string;
  blurb: string;
};

// Hours, prices and seasonal openings are not checked. Look before you go.
export const SPOTS: Spot[] = [
  { id: "hotel", name: "Residence Inn", emoji: "🛏️", cat: "base", lat: 40.7643, lng: -73.9823, area: "Midtown", blurb: "Home base. 1717 Broadway at 54th St (check your confirmation). Central Park is five blocks up." },
  { id: "penn", name: "Penn Station", emoji: "🚆", cat: "base", lat: 40.7506, lng: -73.9935, area: "Midtown", blurb: "Where trains from Boston come in. The 1 train goes up to 50th St, near the hotel." },

  { id: "times", name: "Times Square", emoji: "✨", cat: "see", lat: 40.758, lng: -73.9855, area: "Midtown", blurb: "Ten minutes from the hotel. Best after dark, then leave before your ears give up." },
  { id: "rock", name: "Rockefeller Center", emoji: "🎄", cat: "see", lat: 40.7587, lng: -73.9787, area: "Midtown", blurb: "The big tree usually goes up in mid November and gets lit in early December, so you may see it before the lights. The rink is right below." },
  { id: "windows", name: "Fifth Ave windows", emoji: "🪟", cat: "see", lat: 40.758, lng: -73.9772, area: "Midtown", blurb: "The department store holiday windows are usually up by Thanksgiving. Saks is across from the tree." },
  { id: "moma", name: "MoMA", emoji: "🖼️", cat: "see", lat: 40.7614, lng: -73.9776, area: "Midtown", blurb: "On 53rd St, a short walk from the hotel. Starry Night lives here." },
  { id: "carnegie", name: "Carnegie Hall", emoji: "🎻", cat: "see", lat: 40.7651, lng: -73.9799, area: "Midtown", blurb: "Two blocks away. Worth a look at what's on that weekend." },
  { id: "topofrock", name: "Top of the Rock", emoji: "🌆", cat: "see", lat: 40.7593, lng: -73.9794, area: "Midtown", blurb: "The view with the Empire State in it. Sunset slots sell out." },
  { id: "empire", name: "Empire State", emoji: "🏙️", cat: "see", lat: 40.7484, lng: -73.9857, area: "Midtown", blurb: "34th St and 5th Ave. Pretty from the street too." },
  { id: "grand", name: "Grand Central", emoji: "⭐", cat: "see", lat: 40.7527, lng: -73.9772, area: "Midtown", blurb: "Look up at the star ceiling in the main hall. Try the whispering gallery by the Oyster Bar." },
  { id: "bryant", name: "Bryant Park Winter Village", emoji: "⛸️", cat: "shop", lat: 40.7536, lng: -73.9832, area: "Midtown", blurb: "Holiday market stalls and a free skating rink, usually open from late October." },
  { id: "met", name: "The Met", emoji: "🏛️", cat: "see", lat: 40.7794, lng: -73.9632, area: "Upper East Side", blurb: "A nice walk across the park. The rooftop and the Temple of Dendur." },
  { id: "highline", name: "The High Line", emoji: "🌿", cat: "park", lat: 40.748, lng: -74.0048, area: "Chelsea", blurb: "A park on an old train track. Walk it south toward Chelsea Market." },
  { id: "chelsea", name: "Chelsea Market", emoji: "🧁", cat: "eat", lat: 40.7424, lng: -74.006, area: "Chelsea", blurb: "An indoor food hall. Easy when nobody can decide." },

  { id: "cpsouth", name: "Central Park, south end", emoji: "🌳", cat: "park", lat: 40.7681, lng: -73.9785, area: "Central Park", blurb: "Enter at Columbus Circle or 6th Ave. Late November is the last of the fall leaves." },
  { id: "bethesda", name: "Bethesda Terrace", emoji: "⛲", cat: "park", lat: 40.774, lng: -73.9708, area: "Central Park", blurb: "The fountain and the tiled arcade underneath. Often a musician playing." },
  { id: "bow", name: "Bow Bridge", emoji: "🌉", cat: "park", lat: 40.7756, lng: -73.9719, area: "Central Park", blurb: "The classic bridge photo, two minutes from Bethesda." },
  { id: "wollman", name: "Wollman Rink", emoji: "⛸️", cat: "park", lat: 40.7681, lng: -73.9743, area: "Central Park", blurb: "Skating with the skyline behind you. Usually open by late fall." },

  { id: "soho", name: "SoHo, Greene St", emoji: "🛍️", cat: "shop", lat: 40.7235, lng: -74.002, area: "SoHo", blurb: "Cast iron buildings and cobblestones. Shops along Prince, Spring and Broadway. Subway: N, Q, R or W to Prince St." },
  { id: "washsq", name: "Washington Square Park", emoji: "🎺", cat: "park", lat: 40.7308, lng: -73.9973, area: "Village", blurb: "The arch, street performers, chess players. A short walk up from SoHo." },
  { id: "mulberry", name: "Little Italy, Mulberry St", emoji: "🇮🇹", cat: "see", lat: 40.7193, lng: -73.9973, area: "Little Italy", blurb: "One short street, very cute, pick a cannoli." },
  { id: "chinatown", name: "Chinatown, Mott St", emoji: "🏮", cat: "see", lat: 40.7158, lng: -73.997, area: "Chinatown", blurb: "Bakeries, dumplings, little shops. Just below SoHo past Canal St." },
  { id: "bridge", name: "Brooklyn Bridge walk", emoji: "🌉", cat: "park", lat: 40.7116, lng: -74.0042, area: "Downtown", blurb: "Walk out from City Hall to the middle and turn around for the view." },
  { id: "ferry", name: "Staten Island Ferry", emoji: "⛴️", cat: "see", lat: 40.7013, lng: -74.0132, area: "Downtown", blurb: "Free, and it sails right past the Statue of Liberty." },

  { id: "balthazar", name: "Balthazar", emoji: "🥐", cat: "eat", lat: 40.7226, lng: -73.9981, area: "SoHo", blurb: "French brasserie, a classic SoHo dinner. Book ahead." },
  { id: "ansel", name: "Dominique Ansel Bakery", emoji: "🍰", cat: "eat", lat: 40.7253, lng: -74.003, area: "SoHo", blurb: "Pastry. Go early, lines get long." },
  { id: "princepizza", name: "Prince Street Pizza", emoji: "🍕", cat: "eat", lat: 40.7231, lng: -73.9945, area: "Nolita", blurb: "Square slices, good for eating while walking." },
  { id: "raouls", name: "Raoul's", emoji: "🥩", cat: "eat", lat: 40.7266, lng: -74.0024, area: "SoHo", blurb: "Cosy bistro, known for the steak au poivre." },
  { id: "joes", name: "Joe's Shanghai", emoji: "🥟", cat: "eat", lat: 40.7146, lng: -73.9977, area: "Chinatown", blurb: "Soup dumplings, on Pell St." },
  { id: "nomwah", name: "Nom Wah Tea Parlor", emoji: "🫖", cat: "eat", lat: 40.7144, lng: -73.9982, area: "Chinatown", blurb: "Old school dim sum on Doyers St. Good for Sunday lunch." },
];

export const SPOT = Object.fromEntries(SPOTS.map((s) => [s.id, s])) as Record<string, Spot>;

// ---------------------------------------------------------------- getting around

/** Metres between two points, straight line. */
export function metres(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(s));
}

export type HowToGo = { mode: "walk" | "subway"; minutes: number; line: string };

/**
 * Walk or subway, and roughly how long. Streets add about 30% to the straight
 * line, people walk about 80 m a minute, and a subway trip costs ~10 minutes of
 * stairs and waiting plus about 2 minutes per kilometre.
 */
export function howToGo(m: number): HowToGo {
  const walk = Math.max(1, Math.round((m * 1.3) / 80));
  const subway = Math.round(10 + (m / 1000) * 2.2);
  // Walk anything up to 20 minutes, or whenever the subway barely saves time.
  if (walk <= 20 || walk - subway < 8) return { mode: "walk", minutes: walk, line: `${walk} min walk` };
  return { mode: "subway", minutes: subway, line: `about ${subway} min by subway` };
}

export function directionsUrl(s: Spot, mode: "walk" | "subway") {
  return `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}&travelmode=${mode === "walk" ? "walking" : "transit"}`;
}

// ---------------------------------------------------------------- schedule

export type Stop = {
  id: string;
  day: 1 | 2;
  /** 24 hour "HH:MM", so plain string sorting is time sorting. */
  time: string;
  title: string;
  spotId?: string;
  note?: string;
  done?: boolean;
};

export type TripState = { v: 2; stops: Stop[] };

export const DAYS = [
  { day: 1 as const, date: new Date(2026, 10, 28), short: "Sat", label: "Saturday, Nov 28" },
  { day: 2 as const, date: new Date(2026, 10, 29), short: "Sun", label: "Sunday, Nov 29" },
];
export const TRIP_START = DAYS[0].date;

export const SEED: TripState = {
  v: 2,
  stops: [
    { id: "s1", day: 1, time: "08:00", title: "Leave Boston from the Pru", note: "Back Bay Station is a short walk from the Prudential. Some buses leave from South Station instead, check your ticket." },
    { id: "s2", day: 1, time: "12:30", title: "Arrive in Manhattan", spotId: "penn" },
    { id: "s3", day: 1, time: "13:15", title: "Drop bags at the hotel", spotId: "hotel", note: "Check in is usually mid afternoon. The front desk can hold bags." },
    { id: "s4", day: 1, time: "14:30", title: "Wander SoHo", spotId: "soho" },
    { id: "s5", day: 1, time: "16:30", title: "Little Italy and Chinatown snacks", spotId: "mulberry" },
    { id: "s6", day: 1, time: "19:00", title: "Dinner", spotId: "balthazar", note: "Or any pick from Around us." },
    { id: "s7", day: 1, time: "21:30", title: "Times Square lights on the way back", spotId: "times" },
    { id: "s8", day: 2, time: "09:30", title: "Breakfast", spotId: "hotel" },
    { id: "s9", day: 2, time: "10:30", title: "Central Park walk", spotId: "bethesda", note: "Bethesda Terrace, then Bow Bridge." },
    { id: "s10", day: 2, time: "12:00", title: "Check out", spotId: "hotel", note: "Confirm the time, it may be 11." },
    { id: "s11", day: 2, time: "12:45", title: "Tree and the Fifth Ave windows", spotId: "rock" },
    { id: "s12", day: 2, time: "14:00", title: "Lunch", spotId: "chelsea" },
    { id: "s13", day: 2, time: "16:00", title: "Head home", spotId: "penn", note: "The Sunday after Thanksgiving is one of the busiest travel days of the year. Book early, get there early." },
  ],
};

const KEY = "ny-trip-2026";

export function loadTrip(): TripState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as TripState;
      if (s && s.v === 2) return s;
    }
  } catch {
    // private window or blocked storage: start from the seed
  }
  return structuredClone(SEED);
}

export function saveTrip(s: TripState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // the page still works for this visit
  }
}

/** The schedule packed into a URL hash, so your friend gets the same plan. */
export function tripToHash(s: TripState) {
  const bytes = new TextEncoder().encode(JSON.stringify(s));
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return "#plan=" + btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function tripFromHash(hash: string): TripState | null {
  const m = hash.match(/plan=([\w-]+)/);
  if (!m) return null;
  try {
    const bin = atob(m[1].replace(/-/g, "+").replace(/_/g, "/"));
    const s = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))) as TripState;
    return s && s.v === 2 && Array.isArray(s.stops) ? s : null;
  } catch {
    return null;
  }
}

export const uid = () => Math.random().toString(36).slice(2, 9);

export function niceTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

export const byTime = (a: Stop, b: Stop) => a.day - b.day || a.time.localeCompare(b.time);

/** Today's trip day (1 or 2), or null when it isn't Nov 28 or 29. */
export function tripDay(now: Date): 1 | 2 | null {
  return DAYS.find((d) => d.date.toDateString() === now.toDateString())?.day ?? null;
}

/** First unfinished stop from now on. Before the trip that's the very first stop. */
export function upNext(stops: Stop[], now: Date): Stop | undefined {
  const sorted = [...stops].sort(byTime);
  const today = tripDay(now);
  if (!today) return now < TRIP_START ? sorted[0] : undefined;
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return sorted.find((s) => !s.done && (s.day > today || (s.day === today && s.time >= hhmm)));
}
