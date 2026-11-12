"use client";

import { useCallback, useEffect, useState } from "react";
import type { Project, ResearchMap } from "../content/research";
import "../github.css";

type Marks = { checked: string[]; pinned: string[]; answers: Record<string, string> };
const EMPTY: Marks = { checked: [], pinned: [], answers: {} };

/** Checks, pinned gaps and my answers, one localStorage store per map. Every access is guarded. */
function useMarks(mapId: string) {
  const key = `ll-research:${mapId}`;
  const [marks, setMarks] = useState<Marks>(EMPTY);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      // Restore browser marks after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setMarks({ ...EMPTY, ...(JSON.parse(raw) as Partial<Marks>) });
    } catch {
      /* no storage, start empty */
    }
  }, [key]);

  const update = useCallback(
    (change: (m: Marks) => Marks) => {
      setMarks((prev) => {
        const next = change(prev);
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [key],
  );

  const flip = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  return {
    isChecked: (id: string) => marks.checked.includes(id),
    toggleCheck: (id: string) => update((m) => ({ ...m, checked: flip(m.checked, id) })),
    isPinned: (id: string) => marks.pinned.includes(id),
    togglePin: (id: string) => update((m) => ({ ...m, pinned: flip(m.pinned, id) })),
  };
}

const BROWSER = { yes: "browser", partly: "browser, partly", no: "" };

export default function ResearchView({ map, onExit }: { map: ResearchMap; onExit: () => void }) {
  const marks = useMarks(map.id);
  const [hideChecked, setHideChecked] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const byId = new Map(map.areas.flatMap((a) => a.projects).map((p) => [p.id, p]));

  const row = (p: Project) => {
    const done = marks.isChecked(p.id);
    if (hideChecked && done) return null;
    const meta = [p.licenseLabel, BROWSER[p.browser], p.activity].filter(Boolean).join(" · ");
    return (
      <li key={p.id} className={`gh-task${done ? " is-done" : ""}`}>
        <input
          type="checkbox"
          checked={done}
          aria-label={`${p.name} checked`}
          onChange={() => marks.toggleCheck(p.id)}
        />
        <div>
          <a href={p.href} target="_blank" rel="noreferrer">{p.name}</a>: {p.what}
          <div className={`gh-meta${p.license === "copyleft" ? " is-copyleft" : ""}`}>
            {meta}
            {p.note ? (
              <button type="button" className="gh-link" aria-expanded={open === p.id} onClick={() => setOpen(open === p.id ? null : p.id)}>
                {open === p.id ? "Hide note" : "Note"}
              </button>
            ) : null}
          </div>
          {p.note && open === p.id ? <blockquote>{p.note}</blockquote> : null}
        </div>
      </li>
    );
  };

  return (
    <div className="gh">
      <div className="gh-wrap">
        <button type="button" className="gh-home gh-link" onClick={onExit}>
          Learning log
        </button>
        <article className="gh-md">
          <h1>{map.title}</h1>
          <p className="gh-meta">
            {map.date}
            <button type="button" className="gh-link" onClick={() => setHideChecked((h) => !h)}>
              {hideChecked ? "Show checked" : "Hide checked"}
            </button>
          </p>
          <p>{map.start}</p>

          {map.areas.map((area) => (
            <section key={area.id}>
              <h2>{area.title}</h2>
              <p>{area.teaches}</p>
              <ul className="gh-tasks">{area.projects.map(row)}</ul>
            </section>
          ))}

          <h2>Start with</h2>
          <ol>
            {map.picks.map((pick) => (
              <li key={pick.ids.join("+")}>
                {pick.ids.map((id, i) => {
                  const p = byId.get(id);
                  return p ? (
                    <span key={id}>
                      {i ? " and " : ""}
                      <a href={p.href} target="_blank" rel="noreferrer">{p.name}</a>
                    </span>
                  ) : null;
                })}
                : {pick.why}
              </li>
            ))}
          </ol>

          <h2>Nobody has built</h2>
          <ul className="gh-tasks">
            {map.gaps.map((g) => {
              const pinned = marks.isPinned(g.id);
              return (
                <li key={g.id} className="gh-task">
                  <button
                    type="button"
                    className={`gh-star${pinned ? " is-on" : ""}`}
                    aria-pressed={pinned}
                    aria-label={pinned ? `Unstar ${g.title}` : `Star ${g.title} as one I might build`}
                    title={pinned ? "Unstar" : "I might build this"}
                    onClick={() => marks.togglePin(g.id)}
                  >
                    {pinned ? "★" : "☆"}
                  </button>
                  <div>
                    <strong>{g.title}.</strong> {g.detail}
                  </div>
                </li>
              );
            })}
          </ul>
        </article>
      </div>
    </div>
  );
}
