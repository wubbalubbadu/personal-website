"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Pin, SceneApi } from "./scene";
import {
  CAT_COLOR,
  CATS,
  DAYS,
  SEED,
  SPOT,
  SPOTS,
  TRIP_START,
  byTime,
  directionsUrl,
  howToGo,
  loadTrip,
  metres,
  niceTime,
  saveTrip,
  tripDay,
  tripFromHash,
  tripToHash,
  uid,
  upNext,
  type Cat,
  type Spot,
  type Stop,
  type TripState,
} from "./trip";
import "./ny-trip.css";

type Tab = "plan" | "around";
type LatLng = { lat: number; lng: number };

const IN_MANHATTAN = (p: LatLng) => p.lat > 40.68 && p.lat < 40.83 && p.lng > -74.05 && p.lng < -73.9;

export default function NyTrip() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const api = useRef<SceneApi | null>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const labelEls = useRef(new Map<string, HTMLElement>());

  const [trip, setTrip] = useState<TripState>(SEED);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>("plan");
  const [day, setDay] = useState<1 | 2>(1);
  const [cat, setCat] = useState<Cat | "all">("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [you, setYou] = useState<LatLng | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [snow, setSnow] = useState(false);
  const [adding, setAdding] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [sceneReady, setSceneReady] = useState(false);

  // ---- load: a shared link wins (after asking), else this phone's copy
  useEffect(() => {
    const shared = tripFromHash(window.location.hash);
    let s = loadTrip();
    if (shared && window.confirm("Open the plan from this link? It replaces the plan saved on this phone.")) {
      s = shared;
      saveTrip(s);
    }
    if (shared) history.replaceState(null, "", window.location.pathname);
    // reading localStorage has to wait until after hydration
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTrip(s);
    setDay(tripDay(new Date()) ?? 1);
    setLoaded(true);
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (loaded) saveTrip(trip);
  }, [trip, loaded]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  // ---- three.js, loaded lazily
  useEffect(() => {
    let alive = true;
    let mounted: SceneApi | null = null;
    import("./scene").then(({ mountScene }) => {
      if (!alive || !canvasRef.current) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      mounted = mountScene(canvasRef.current, { reduced });
      api.current = mounted;
      for (const [id, el] of labelEls.current) mounted.bindLabel(id, el);
      setSceneReady(true);
      mounted.playArrival();
    });
    return () => {
      alive = false;
      mounted?.dispose();
      api.current = null;
    };
  }, []);
  const bind = useCallback(
    (id: string) => (el: HTMLElement | null) => {
      if (el) labelEls.current.set(id, el);
      else labelEls.current.delete(id);
      api.current?.bindLabel(id, el);
    },
    [],
  );

  // ---- what's on the map
  const dayStops = useMemo(() => trip.stops.filter((s) => s.day === day).sort(byTime), [trip.stops, day]);
  const origin: LatLng & { label: string } = you ? { ...you, label: "you" } : { ...SPOT.hotel, label: "the hotel" };

  const nearby = useMemo(
    () =>
      SPOTS.filter((s) => s.cat !== "base" && (cat === "all" || s.cat === cat))
        .map((s) => ({ s, m: metres(origin, s) }))
        .sort((a, b) => a.m - b.m),
    [cat, origin.lat, origin.lng], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const pinSpots: Spot[] = useMemo(() => {
    const ids = new Set<string>(["hotel"]);
    if (tab === "plan") dayStops.forEach((s) => s.spotId && ids.add(s.spotId));
    else nearby.forEach(({ s }) => ids.add(s.id));
    if (selected) ids.add(selected);
    return [...ids].map((id) => SPOT[id]).filter(Boolean);
  }, [tab, dayStops, nearby, selected]);

  useEffect(() => {
    if (!sceneReady) return;
    const pins: Pin[] = pinSpots.map((s) => ({ id: s.id, lat: s.lat, lng: s.lng, color: CAT_COLOR[s.cat], small: s.cat === "eat" }));
    api.current?.setPins(pins);
  }, [pinSpots, sceneReady]);

  useEffect(() => {
    api.current?.setYou(you);
  }, [you, sceneReady]);

  useEffect(() => {
    api.current?.setSnow(snow);
  }, [snow, sceneReady]);

  function select(id: string | null) {
    setSelected(id);
    if (id) sheetRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    api.current?.focus(id);
  }

  // ---- schedule edits
  const update = (id: string, patch: Partial<Stop>) =>
    setTrip((t) => ({ ...t, stops: t.stops.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  const remove = (id: string) => setTrip((t) => ({ ...t, stops: t.stops.filter((s) => s.id !== id) }));
  const add = (stop: Omit<Stop, "id">) => setTrip((t) => ({ ...t, stops: [...t.stops, { ...stop, id: uid() }] }));

  function addSpotTo(d: 1 | 2, s: Spot) {
    const last = trip.stops.filter((x) => x.day === d).sort(byTime).at(-1);
    const h = last ? Math.min(Number(last.time.slice(0, 2)) + 1, 23) : 12;
    add({ day: d, time: `${String(h).padStart(2, "0")}:00`, title: s.name, spotId: s.id });
    setToast(`Added ${s.name} to ${DAYS[d - 1].short} at ${niceTime(`${h}:00`)}. Change the time in Plan.`);
  }

  async function share() {
    const url = window.location.origin + window.location.pathname + tripToHash(trip);
    try {
      if (navigator.share) await navigator.share({ title: "Our NY plan", url });
      else {
        await navigator.clipboard.writeText(url);
        setToast("Link copied. Send it to your friend and the plan opens on her phone.");
      }
    } catch {
      // share sheet closed, nothing to do
    }
  }

  function locate() {
    if (!navigator.geolocation) return setToast("This browser can't find your location.");
    setToast("Looking for you…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const at = { lat: p.coords.latitude, lng: p.coords.longitude };
        if (IN_MANHATTAN(at)) {
          setYou(at);
          setTab("around");
          setToast("Found you! Here's what's close.");
        } else {
          setYou(null);
          setToast("You're not in Manhattan yet, so this shows what's near the hotel.");
        }
      },
      () => setToast("Couldn't get your location. Check the location permission."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  // ---- the companions' speech bubble
  const next = upNext(trip.stops, now);
  const sel = selected ? SPOT[selected] : null;
  const bubble = (() => {
    if (sel) {
      const go = howToGo(metres(origin, sel));
      return sel.id === "hotel" && !you ? "Home sweet hotel. Everything is measured from here." : `${sel.name} is ${go.line} from ${origin.label}.`;
    }
    const today = tripDay(now);
    if (now < TRIP_START) {
      const sleeps = Math.ceil((TRIP_START.getTime() - now.getTime()) / 86_400_000);
      return `${sleeps} sleep${sleeps === 1 ? "" : "s"} until New York! First up: ${next ? `${next.title}, ${niceTime(next.time)}` : "packing"}.`;
    }
    if (today && next) {
      const prev = [...trip.stops].sort(byTime).filter((s) => s.done || byTime(s, next) < 0).at(-1);
      const from = you ?? (prev?.spotId ? SPOT[prev.spotId] : SPOT.hotel);
      const to = next.spotId ? SPOT[next.spotId] : null;
      return `Up next at ${niceTime(next.time)}: ${next.title}.${to ? ` It's ${howToGo(metres(from, to)).line}.` : ""}`;
    }
    if (today) return "That's everything on the plan. Free time!";
    return "Hope New York was fun. Same time next year?";
  })();

  return (
    <main className="nyt">
      <section className="nyt-map" aria-label="Map of Manhattan">
        <canvas ref={canvasRef} className="nyt-canvas" />
        <div className="nyt-labels">
          {pinSpots.map((s) => (
            <button
              key={s.id}
              ref={bind(s.id)}
              type="button"
              className={`nyt-pin${selected === s.id ? " is-on" : ""}${s.cat === "eat" ? " is-small" : ""}`}
              style={{ "--pin": CAT_COLOR[s.cat] } as React.CSSProperties}
              onClick={() => select(selected === s.id ? null : s.id)}
            >
              <span aria-hidden>{s.emoji}</span>
              {(selected === s.id || s.cat === "base") && <b>{s.name}</b>}
              <span className="nyt-sr">{s.name}</span>
            </button>
          ))}
          {you && (
            <span ref={bind("you")} className="nyt-pin is-you">
              <b>You</b>
            </span>
          )}
        </div>

        <header className="nyt-top">
          <div className="nyt-title">
            <span className="nyt-title__big">NYC trip</span>
            <span>Nov 28 and 29</span>
          </div>
          <div className="nyt-tools">
            <button type="button" className="nyt-round" onClick={() => setSnow((v) => !v)} aria-pressed={snow} title="Snow">
              ❄️
            </button>
            <button type="button" className="nyt-round" onClick={() => api.current?.playArrival()} title="Replay the train in">
              🚆
            </button>
            <button type="button" className="nyt-round" onClick={() => select(null)} title="See the whole island">
              🗺️
            </button>
          </div>
        </header>

      </section>

      <section className="nyt-sheet" ref={sheetRef}>
        {sel && (
          <SpotCard
            spot={sel}
            from={origin}
            onClose={() => select(null)}
            onAdd={(d) => addSpotTo(d, sel)}
            onPick={(id) => select(id)}
          />
        )}
        {!sel && (
          <div className="nyt-buddy">
            <Buddies />
            <p className="nyt-bubble">{bubble}</p>
          </div>
        )}

        <div className="nyt-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "plan"} onClick={() => setTab("plan")}>
            📅 Plan
          </button>
          <button type="button" role="tab" aria-selected={tab === "around"} onClick={() => setTab("around")}>
            🧭 Around us
          </button>
        </div>

        {tab === "plan" ? (
          <div className="nyt-plan">
            <div className="nyt-days">
              {DAYS.map((d) => (
                <button key={d.day} type="button" aria-pressed={day === d.day} onClick={() => setDay(d.day)}>
                  <b>{d.short}</b> {d.label.split(", ")[1]}
                </button>
              ))}
            </div>
            <ol className="nyt-stops">
              {dayStops.map((s, i) => {
                const spot = s.spotId ? SPOT[s.spotId] : null;
                const prevSpot = dayStops[i - 1]?.spotId ? SPOT[dayStops[i - 1].spotId!] : null;
                const leg = spot && prevSpot && spot !== prevSpot ? howToGo(metres(prevSpot, spot)) : null;
                return (
                  <li key={s.id} className={s.done ? "is-done" : ""}>
                    {leg && (
                      <p className="nyt-leg">
                        {leg.mode === "walk" ? "🚶" : "🚇"} {leg.line}
                      </p>
                    )}
                    <div className={`nyt-stop${next?.id === s.id ? " is-next" : ""}`}>
                      <button
                        type="button"
                        className="nyt-check"
                        aria-pressed={!!s.done}
                        aria-label={s.done ? "Mark not done" : "Mark done"}
                        onClick={() => update(s.id, { done: !s.done })}
                      >
                        {s.done ? "✓" : ""}
                      </button>
                      <input
                        type="time"
                        className="nyt-time"
                        value={s.time}
                        onChange={(e) => e.target.value && update(s.id, { time: e.target.value })}
                        aria-label="Time"
                      />
                      <button type="button" className="nyt-stop__main" onClick={() => spot && select(spot.id)} disabled={!spot}>
                        <b>
                          {spot && <span aria-hidden>{spot.emoji} </span>}
                          {s.title}
                        </b>
                        {s.note && <span>{s.note}</span>}
                      </button>
                      <button type="button" className="nyt-trash" aria-label={`Remove ${s.title}`} onClick={() => remove(s.id)}>
                        <TrashIcon />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
            {adding ? (
              <AddStop
                day={day}
                onDone={(s) => {
                  if (s) add(s);
                  setAdding(false);
                }}
              />
            ) : (
              <button type="button" className="nyt-btn nyt-btn--wide" onClick={() => setAdding(true)}>
                ＋ Add a stop
              </button>
            )}
            <div className="nyt-row">
              <button type="button" className="nyt-btn" onClick={share}>
                💌 Send plan to friend
              </button>
              <button
                type="button"
                className="nyt-link"
                onClick={() => window.confirm("Go back to the starting plan? Your changes will be lost.") && setTrip(structuredClone(SEED))}
              >
                Start over
              </button>
            </div>
          </div>
        ) : (
          <div className="nyt-around">
            <div className="nyt-from">
              <span>
                Closest to <b>{origin.label === "you" ? "where you are" : "the hotel"}</b>
              </span>
              {you ? (
                <button type="button" className="nyt-link" onClick={() => setYou(null)}>
                  Use the hotel
                </button>
              ) : (
                <button type="button" className="nyt-btn nyt-btn--small" onClick={locate}>
                  📍 Where are we?
                </button>
              )}
            </div>
            <div className="nyt-chips">
              {CATS.map((c) => (
                <button key={c.id} type="button" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
            <ul className="nyt-list">
              {nearby.map(({ s, m }) => {
                const go = howToGo(m);
                return (
                  <li key={s.id}>
                    <button type="button" className={selected === s.id ? "is-on" : ""} onClick={() => select(s.id)}>
                      <span className="nyt-list__emoji" style={{ background: CAT_COLOR[s.cat] }} aria-hidden>
                        {s.emoji}
                      </span>
                      <span className="nyt-list__text">
                        <b>{s.name}</b>
                        <span>
                          {s.area} · {go.mode === "walk" ? "🚶" : "🚇"} {go.line}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="nyt-fine">Hours and seasonal openings aren&apos;t checked, so look before you go.</p>
          </div>
        )}
      </section>

      {toast && (
        <p className="nyt-toast" role="status">
          {toast}
        </p>
      )}
    </main>
  );
}

// ---------------------------------------------------------------- pieces

function SpotCard({
  spot,
  from,
  onClose,
  onAdd,
  onPick,
}: {
  spot: Spot;
  from: LatLng & { label: string };
  onClose: () => void;
  onAdd: (d: 1 | 2) => void;
  onPick: (id: string) => void;
}) {
  const go = howToGo(metres(from, spot));
  const close3 = SPOTS.filter((s) => s.id !== spot.id && s.cat !== "base")
    .map((s) => ({ s, m: metres(spot, s) }))
    .sort((a, b) => a.m - b.m)
    .slice(0, 3);
  return (
    <article className="nyt-card">
      <button type="button" className="nyt-card__x" aria-label="Close" onClick={onClose}>
        ×
      </button>
      <h2>
        <span aria-hidden>{spot.emoji}</span> {spot.name}
      </h2>
      <p className="nyt-card__meta">
        {spot.area} · {go.mode === "walk" ? "🚶" : "🚇"} {go.line} from {from.label}
      </p>
      <p>{spot.blurb}</p>
      <div className="nyt-row">
        <a className="nyt-btn nyt-btn--small" href={directionsUrl(spot, "walk")} target="_blank" rel="noreferrer">
          🚶 Walk
        </a>
        <a className="nyt-btn nyt-btn--small" href={directionsUrl(spot, "subway")} target="_blank" rel="noreferrer">
          🚇 Subway
        </a>
        {spot.cat !== "base" && (
          <>
            <button type="button" className="nyt-btn nyt-btn--small nyt-btn--soft" onClick={() => onAdd(1)}>
              ＋ Sat
            </button>
            <button type="button" className="nyt-btn nyt-btn--small nyt-btn--soft" onClick={() => onAdd(2)}>
              ＋ Sun
            </button>
          </>
        )}
      </div>
      <p className="nyt-card__near">
        Close by:{" "}
        {close3.map(({ s, m }, i) => (
          <span key={s.id}>
            {i > 0 && ", "}
            <button type="button" className="nyt-link" onClick={() => onPick(s.id)}>
              {s.emoji} {s.name}
            </button>{" "}
            ({howToGo(m).minutes} min)
          </span>
        ))}
      </p>
    </article>
  );
}

function AddStop({ day, onDone }: { day: 1 | 2; onDone: (s: Omit<Stop, "id"> | null) => void }) {
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("12:00");
  const [spotId, setSpotId] = useState("");
  return (
    <form
      className="nyt-add"
      onSubmit={(e) => {
        e.preventDefault();
        const name = title.trim() || (spotId ? SPOT[spotId].name : "");
        if (!name) return;
        onDone({ day, time, title: name, spotId: spotId || undefined });
      }}
    >
      <input className="nyt-input" placeholder="What are we doing?" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="nyt-row">
        <input type="time" className="nyt-input nyt-input--time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Time" />
        <select className="nyt-input" value={spotId} onChange={(e) => setSpotId(e.target.value)} aria-label="Place">
          <option value="">No place on the map</option>
          {SPOTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.emoji} {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="nyt-row">
        <button type="submit" className="nyt-btn">
          Add to {DAYS[day - 1].short}
        </button>
        <button type="button" className="nyt-link" onClick={() => onDone(null)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

/** The two of you, as the little bean people from the map. */
function Buddies() {
  const one = (x: number, coat: string, hat: string, pom: string) => (
    <g transform={`translate(${x} 0)`}>
      <rect x="-13" y="30" width="26" height="30" rx="13" fill={coat} stroke="#2b1d2e" strokeWidth="2.5" />
      <circle cx="0" cy="24" r="13" fill="#ffe0c7" stroke="#2b1d2e" strokeWidth="2.5" />
      <path d="M-13 22a13 13 0 0 1 26 0z" fill={hat} stroke="#2b1d2e" strokeWidth="2.5" />
      <circle cx="0" cy="8" r="4" fill={pom} stroke="#2b1d2e" strokeWidth="2" />
      <circle cx="-4.5" cy="26" r="1.8" fill="#2b1d2e" />
      <circle cx="4.5" cy="26" r="1.8" fill="#2b1d2e" />
      <ellipse cx="-8" cy="30" rx="2.6" ry="1.6" fill="#ff9bb8" />
      <ellipse cx="8" cy="30" rx="2.6" ry="1.6" fill="#ff9bb8" />
      <rect x="-12" y="36" width="24" height="5" rx="2.5" fill={pom} stroke="#2b1d2e" strokeWidth="2" />
    </g>
  );
  return (
    <svg className="nyt-buddies" viewBox="0 0 64 62" aria-hidden>
      {one(18, "#ff7eb6", "#ffffff", "#fff06a")}
      {one(46, "#6fb6ff", "#3b3350", "#ff6a6a")}
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden>
      <path d="M4 6h12M8 6V4h4v2M6 6l1 10h6l1-10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
