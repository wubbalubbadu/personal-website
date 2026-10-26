"use client";

import { useState } from "react";
import "../_kit/kit.css";
import "./memory-card.css";
import MascotSlot from "../_kit/MascotSlot";
import PixelIcon from "../_kit/PixelIcon";
import ThemeToggle from "../_kit/ThemeToggle";
import { useMedia } from "../_kit/hooks";
import { LinkList, ProjectList, SheetHost } from "../_kit/Sheets";
import { COPY, CONTACT_LINKS, FLUTE_LINKS, PLACES, type Place } from "../_kit/links";

/** What the cookie says when tapped, in its own little bubble. */
const OWNER_LINES = ["now saving...", "please don't pull out the memory card!", "all 5 saves are mine. well, hers."];

/** A PS1 card holds 15 blocks; each save here uses one. */
const CARD_BLOCKS = 15;

function Detail({ p }: { p: Place }) {
  return (
    <div className="mc-detail" id={`mc-detail-${p.id}`}>
      <p className="mc-detail__more">{p.more}</p>
      {p.href ? (
        <a className="mc-detail__go" href={p.href}>
          {p.cta} ›
        </a>
      ) : null}
      {p.id === "flute" ? <LinkList items={FLUTE_LINKS} /> : null}
      {p.id === "contact" ? <LinkList items={CONTACT_LINKS} /> : null}
      {p.id === "projects" ? <ProjectList /> : null}
    </div>
  );
}

export default function MemoryCard() {
  const wide = useMedia("(min-width: 900px)");
  const tablet = useMedia("(min-width: 600px)");
  /* Phone: nothing open, so all five saves fit on the first screen.
   * Wide: the first save is shown in the side panel. */
  const [picked, setPicked] = useState<Place["id"] | null>(null);
  const current = picked ?? (wide ? "studio" : null);
  const currentPlace = PLACES.find((p) => p.id === current);

  return (
    <main className="lab mc">
      <SheetHost>
        <header className="mc-top">
          <span className="mc-title">MEMORY CARD</span>
          <span className="mc-slot">SLOT 1</span>
          <ThemeToggle />
        </header>
        <div className="mc-grid">
          <section className="mc-left">
            <div className="mc-owner">
              {/* MascotSlot: the PS1 cookie as the card owner's icon */}
              <MascotSlot size={tablet ? 76 : 60} className="mc-owner__icon mascot-slot--bubble-left" lines={OWNER_LINES} label="Cookie, the card's owner. Tap to say hi." />
              <div>
                <h1>{COPY.hello}</h1>
                <p>{COPY.who}</p>
              </div>
            </div>
            <ul className="mc-saves">
              {PLACES.map((p) => {
                const on = current === p.id;
                return (
                  <li key={p.id} className={on ? "is-on" : undefined}>
                    <button
                      type="button"
                      className="mc-save"
                      aria-expanded={on}
                      aria-controls={`mc-detail-${p.id}`}
                      onClick={() => setPicked(on && !wide ? null : p.id)}
                    >
                      <span className="mc-save__icon">
                        <PixelIcon id={p.id} />
                      </span>
                      <span className="mc-save__text">
                        <b>{p.label}</b>
                        <span>{p.line}</span>
                      </span>
                      <span className="mc-save__meta">
                        <span>SAVED</span>
                        <span>{p.saved}</span>
                      </span>
                    </button>
                    {on && !wide ? <Detail p={p} /> : null}
                  </li>
                );
              })}
            </ul>
            <p className="mc-free">
              {CARD_BLOCKS - PLACES.length} BLOCKS FREE
            </p>
          </section>
          {wide && currentPlace ? (
            <section className="mc-right" aria-live="polite">
              <div className="mc-panel">
                <div className="mc-panel__head">
                  <span className="mc-save__icon mc-save__icon--big">
                    <PixelIcon id={currentPlace.id} />
                  </span>
                  <div>
                    <h2>{currentPlace.label}</h2>
                    <span className="mc-panel__saved">LAST SAVED {currentPlace.saved}</span>
                  </div>
                </div>
                <Detail p={currentPlace} />
              </div>
            </section>
          ) : null}
        </div>
      </SheetHost>
    </main>
  );
}
