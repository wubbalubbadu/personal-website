"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { COPY, CONTACT_LINKS, FLUTE_LINKS, opensNewTab, PROJECT_ROWS, type LinkItem, type Place } from "./links";

type SheetId = "flute" | "projects" | "contact";
const OpenCtx = createContext<(id: SheetId) => void>(() => {});

/** Wrap a lab page in this; any <PlaceLink> inside opens the right sheet. */
export function SheetHost({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<SheetId | null>(null);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const show = useCallback((id: SheetId) => setOpen(id), []);

  return (
    <OpenCtx.Provider value={show}>
      {children}
      {/* Backdrop click is a mouse nicety; keyboard users close with Esc (native <dialog>) or the × button. */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
      <dialog
        ref={ref}
        className="lab-sheet"
        onClose={() => setOpen(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(null);
        }}
        aria-labelledby="lab-sheet-title"
      >
        <div className="lab-sheet__inner">
          <header className="lab-sheet__head">
            <h2 id="lab-sheet-title">{open === "flute" ? "Flute" : open === "projects" ? "Projects" : "Say hi"}</h2>
            <button type="button" className="lab-sheet__close" onClick={() => setOpen(null)} aria-label="Close">
              ×
            </button>
          </header>
          {open === "flute" ? <LinkList items={FLUTE_LINKS} /> : null}
          {open === "contact" ? (
            <>
              <p className="lab-sheet__note">{COPY.contactLine}</p>
              <LinkList items={CONTACT_LINKS} />
            </>
          ) : null}
          {open === "projects" ? <ProjectList /> : null}
        </div>
      </dialog>
    </OpenCtx.Provider>
  );
}

export function LinkList({ items }: { items: LinkItem[] }) {
  return (
    <ul className="lab-links">
      {items.map((it) => {
        const ext = opensNewTab(it.href);
        return (
          <li key={it.href}>
            <a href={it.href} target={ext ? "_blank" : undefined} rel={ext ? "noreferrer" : undefined}>
              <span>{it.label}</span>
              {it.sub ? <small>{it.sub}</small> : null}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export function ProjectList() {
  return (
    <ul className="lab-projects">
      {PROJECT_ROWS.map((p) => (
        <li key={p.slug}>
          <div className="lab-projects__top">
            {p.href ? <a href={p.href}>{p.name}</a> : <b>{p.name}</b>}
            <small>
              {p.year} · {p.status}
            </small>
          </div>
          <p>{p.line}</p>
          {p.audio?.length ? (
            <div className="lab-projects__audio">
              {p.audio.map((a) => (
                <label key={a.src}>
                  <span>{a.label}</span>
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption -- instrumental */}
                  <audio controls preload="none" src={a.src} />
                </label>
              ))}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** A destination: a real link when the place has an href, else a button that opens its sheet. */
export function PlaceLink({
  place,
  className,
  children,
  ...rest
}: {
  place: Place;
  className?: string;
  children: ReactNode;
} & Record<`aria-${string}` | `data-${string}`, string | undefined>) {
  const open = useContext(OpenCtx);
  if (place.href) {
    return (
      <a href={place.href} className={className} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <button
      type="button"
      className={className}
      aria-haspopup="dialog"
      onClick={() => open(place.id as SheetId)}
      {...rest}
    >
      {children}
    </button>
  );
}

/** For SVG hotspots, which can't hold a <button>. */
export function useOpenSheet() {
  return useContext(OpenCtx);
}
