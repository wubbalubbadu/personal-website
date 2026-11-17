"use client";

import { useEffect, useRef, useState } from "react";
import "../_kit/kit.css";
import "./spa.css";
import { useMedia } from "../_kit/hooks";
import { useLang } from "../_kit/lang";
import { COPY } from "./copy";
import type { ActionId, BodyStyle, FaceStyle, Hud, SpaApi, TimeOfDay, ViewMode } from "./game";

/**
 * Soak: a shared bathhouse you walk around in first person. The idea borrows
 * its structure from sansatemple.com (anonymous people, a few verbs, no chat)
 * and nothing else. Design notes and open decisions: docs/SPA-PROTOTYPE.md.
 */

const CROWDS = [3, 7, 12];

const ICONS: Record<ActionId, string> = {
  wave: "M8 12V6.5a1.5 1.5 0 0 1 3 0V11m0-5.5a1.5 1.5 0 0 1 3 0V11m0-3.5a1.5 1.5 0 0 1 3 0V14c0 4-2.5 7-6.5 7-3 0-5-2-6-4.5L4 13.5a1.4 1.4 0 0 1 2.5-1.2L8 14.5",
  sigh: "M7 4c-2 3 2 5 0 8m5-8c-2 3 2 5 0 8m5-8c-2 3 2 5 0 8M5 17h14M7 20.5h10",
  pour: "M4 5l9 9m-2.5 1.5a3.5 3.5 0 1 0 5-5zM17 18.5v.5m3-3v.5m-1 5v.5",
  fan: "M5 9h11v7H5zM5 12.5h11M19 7l2-1.5M19.5 12.5H22M19 18l2 1.5",
  dunk: "M12 3v9m-3.5-3.5L12 12l3.5-3.5M3 16c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0M3 20.5c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0",
  bucket: "M5 8h14l-1.6 11.5H6.6zM5 8c0-5 14-5 14 0M9 13.5v.5m3 2v.5m3-3v.5",
  egg: "M12 3.5c3.5 0 6.5 6 6.5 10a6.5 6.5 0 0 1-13 0c0-4 3-10 6.5-10zM9.5 10l1.5 1.5L12.5 10l1.5 1.5",
  milk: "M9.5 3h5v3.5l2 3V20a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1V9.5l2-3zM7.5 13h9",
  cucumbers: "M7.5 12a3.5 3.5 0 1 0 0-.01M16.5 12a3.5 3.5 0 1 0 0-.01M7.5 11.5v.5m9-.5v.5",
  nap: "M5 6h7l-7 8h7M14.5 12.5H19l-4.5 5.5H19",
  float: "M5 11.5h10m2.5 0a1.5 1.5 0 1 0 0-.01M3 16c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0M3 20.5c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0",
  getup: "M12 20V6m-5.5 5.5L12 6l5.5 5.5M5 3h14",
};

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/** What the sky should be for the visitor's own time of day. */
function clockTime(): TimeOfDay {
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  return h >= 5.5 && h < 16.5 ? "morning" : h >= 16.5 && h < 19.5 ? "dusk" : "night";
}

type Saved = { time: TimeOfDay | "auto"; crowd: number; face: FaceStyle; body: BodyStyle; view: ViewMode; muted: boolean };
const SAVE_KEY = "soak:settings";
/** A test tab (?solo) neither reads nor overwrites the real choices. */
const isSolo = () => new URLSearchParams(window.location.search).has("solo");
/** The choices from last time (this browser only). Empty on the server and on a first visit. */
function loadSaved(): Partial<Saved> {
  if (typeof window === "undefined" || isSolo()) return {};
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY) ?? "{}") as Partial<Saved>;
  } catch {
    return {};
  }
}

const START: Hud = { ready: false, zone: "path", name: "", people: 1, actions: [], on: [], busy: false, cucumbers: false, napping: false, under: false, first: false, left: false, heat: 0, steam: 0 };

export default function Spa() {
  const lang = useLang();
  const c = COPY[lang];
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<SpaApi | null>(null);
  const [hud, setHud] = useState<Hud>(START);
  const [entered, setEntered] = useState(false);
  const [muted, setMuted] = useState(() => loadSaved().muted ?? false);
  const [time, setTime] = useState<TimeOfDay | "auto">(() => loadSaved().time ?? "dusk");
  const [crowd, setCrowd] = useState(() => loadSaved().crowd ?? 1);
  const [face, setFace] = useState<FaceStyle>(() => loadSaved().face ?? "dots");
  const [body, setBody] = useState<BodyStyle>(() => loadSaved().body ?? "gumdrop");
  const [view, setView] = useState<ViewMode>(() => loadSaved().view ?? "third");
  const saved = useRef<Saved>({ time, crowd, face, body, view, muted });
  const [panel, setPanel] = useState(false);
  const [broken, setBroken] = useState(false);
  const [hint, setHint] = useState(true);
  const touch = useMedia("(hover: none)");
  const langRef = useRef(lang);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let dispose: (() => void) | undefined;
    let cancelled = false;
    void import("./game").then(({ mountSpa }) => {
      if (cancelled) return;
      try {
        const was = saved.current;
        const g = mountSpa(el, {
          lang: langRef.current,
          bots: CROWDS[was.crowd] ?? CROWDS[1],
          time: was.time === "auto" ? clockTime() : was.time,
          face: was.face,
          body: was.body,
          view: was.view,
          onHud: setHud,
          solo: isSolo(),
        });
        g.setMuted(was.muted);
        api.current = g;
        dispose = g.dispose;
      } catch {
        // no WebGL, or the graphics context could not be made
        setBroken(true);
      }
    });
    return () => {
      cancelled = true;
      api.current = null;
      dispose?.();
    };
  }, []);

  useEffect(() => {
    langRef.current = lang;
    api.current?.setLang(lang);
  }, [lang]);

  // remember the choices for next time
  useEffect(() => {
    saved.current = { time, crowd, face, body, view, muted };
    if (isSolo()) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(saved.current));
    } catch {
      // private mode: nothing is remembered, and that's fine
    }
  }, [time, crowd, face, body, view, muted]);

  // "My clock" keeps following the real time while the page stays open
  useEffect(() => {
    if (time !== "auto") return;
    const id = window.setInterval(() => api.current?.setTime(clockTime()), 60000);
    return () => window.clearInterval(id);
  }, [time]);

  // the walking hint goes away once you've clearly got it
  useEffect(() => {
    if (!entered) return;
    const id = window.setTimeout(() => setHint(false), 9000);
    return () => window.clearTimeout(id);
  }, [entered]);

  const heat = hud.heat;
  return (
    <main className="lab spa">
      <div className="spa-stage" ref={host} role="application" aria-label={c.stage} />

      {/* what your own body tells you: warmth at the edges, steam, water, sleep, cucumbers */}
      <div className="spa-feel" aria-hidden="true">
        <i className="spa-feel__warm" style={{ opacity: Math.max(0, heat) * 0.5 }} />
        <i className="spa-feel__cold" style={{ opacity: Math.max(0, -heat) * 0.6 }} />
        <i className="spa-feel__steam" style={{ opacity: hud.steam * 0.32 }} />
        <i className="spa-feel__under" style={{ opacity: hud.under && hud.first ? 1 : 0 }} />
        <i className="spa-feel__nap" style={{ opacity: hud.napping ? (hud.first ? 1 : 0.35) : 0 }} />
        <i className="spa-feel__cukes" style={{ opacity: hud.cucumbers && hud.first ? 1 : 0 }}>
          <b />
          <b />
        </i>
      </div>

      {entered && hud.ready && !hud.left && (
        <>
          <header className="spa-top">
            <div className="spa-pill spa-pill--place">
              <b>{c.title}</b>
              <span>{c.zones[hud.zone]}</span>
            </div>
            <div className="spa-top__right">
              <span className="spa-pill spa-pill--quiet">{c.here(hud.people)}</span>
              <button
                type="button"
                className="spa-pill spa-pill--icon"
                aria-label={muted ? c.soundOff : c.soundOn}
                title={muted ? c.soundOff : c.soundOn}
                aria-pressed={!muted}
                onClick={() => {
                  setMuted(!muted);
                  api.current?.setMuted(!muted);
                }}
              >
                <Icon d={muted ? "M4 9.5h3.5L12 6v12l-4.5-3.5H4zM16 9.5l5 5m0-5l-5 5" : "M4 9.5h3.5L12 6v12l-4.5-3.5H4zM15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"} />
              </button>
              <button type="button" className="spa-pill spa-pill--icon" aria-label={c.settings} title={c.settings} aria-expanded={panel} onClick={() => setPanel(!panel)}>
                <Icon d="M5 7h9m4 0h1M5 12h2m4 0h8M5 17h10m4 0h0M16 5v4M9 10v4M17 15v4" />
              </button>
            </div>
            {panel && (
              <div className="spa-panel">
                <div className="spa-panel__row">
                  <span>{c.time}</span>
                  {(["dusk", "night", "morning", "auto"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={time === t}
                      onClick={() => {
                        setTime(t);
                        api.current?.setTime(t === "auto" ? clockTime() : t);
                      }}
                    >
                      {c.times[t]}
                    </button>
                  ))}
                </div>
                <div className="spa-panel__row">
                  <span>{c.crowd}</span>
                  {CROWDS.map((n, i) => (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={crowd === i}
                      onClick={() => {
                        setCrowd(i);
                        api.current?.setBots(n);
                      }}
                    >
                      {c.crowds[i]}
                    </button>
                  ))}
                </div>
                <div className="spa-panel__row">
                  <span>{c.view}</span>
                  {(["third", "first"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      aria-pressed={view === v}
                      onClick={() => {
                        setView(v);
                        api.current?.setView(v);
                      }}
                    >
                      {c.views[v]}
                    </button>
                  ))}
                </div>
                <div className="spa-panel__row">
                  <span>{c.bodies}</span>
                  {(["gumdrop", "bean", "dumpling"] as const).map((b) => (
                    <button
                      key={b}
                      type="button"
                      aria-pressed={body === b}
                      onClick={() => {
                        setBody(b);
                        api.current?.setBody(b);
                      }}
                    >
                      {c.bodyNames[b]}
                    </button>
                  ))}
                </div>
                <div className="spa-panel__row">
                  <span>{c.faces}</span>
                  {(["dots", "sleepy", "goofy", "round"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      aria-pressed={face === f}
                      onClick={() => {
                        setFace(f);
                        api.current?.setFace(f);
                      }}
                    >
                      {c.faceNames[f]}
                    </button>
                  ))}
                </div>
                <p className="spa-panel__name">
                  {c.you} <b>{hud.name}</b>
                  <button type="button" onClick={() => api.current?.newLook()}>
                    {c.newLook}
                  </button>
                </p>
              </div>
            )}
          </header>

          {hint && !panel && <p className="spa-hint">{touch ? c.hintTouch : c.hintMouse}</p>}

          <nav className="spa-verbs" aria-label="Actions">
            {hud.actions.map((id, i) => (
              <button
                key={id}
                type="button"
                className={id === "getup" || id === "wave" ? "spa-verb spa-verb--plain" : "spa-verb"}
                aria-pressed={hud.on.includes(id) || undefined}
                disabled={hud.busy && id !== "getup"}
                onClick={() => {
                  setHint(false);
                  api.current?.act(id);
                }}
              >
                <Icon d={ICONS[id]} />
                <span>{c.actions[id]}</span>
                {!touch && (
                  <kbd aria-hidden="true">{id === "getup" ? "esc" : i + 1}</kbd>
                )}
              </button>
            ))}
          </nav>
        </>
      )}

      {(!entered || hud.left) && (
        <div className="spa-door">
          <div className="spa-door__card">
            <p className="spa-door__mark" aria-hidden="true">
              湯
            </p>
            <h1>{c.title}</h1>
            <p>{broken ? c.broken : hud.left ? c.bye : c.tagline}</p>
            {!broken && hud.ready && hud.people > 1 && <p className="spa-door__inside">{c.inside(hud.people - 1)}</p>}
            {!broken && (
              <button
                type="button"
                disabled={!hud.ready}
                onClick={() => {
                  setEntered(true);
                  api.current?.setMuted(muted);
                  api.current?.arrive();
                }}
              >
                {hud.left ? c.again : hud.ready ? c.enter : c.loading}
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
