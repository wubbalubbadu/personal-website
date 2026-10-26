"use client";

import type { CSSProperties, MouseEvent } from "react";
import "../_kit/kit.css";
import "./staff-of-notes.css";
import MascotSlot from "../_kit/MascotSlot";
import ThemeToggle from "../_kit/ThemeToggle";
import { playFlute } from "../_kit/fluteTone";
import { useMedia } from "../_kit/hooks";
import { SheetHost, useOpenSheet } from "../_kit/Sheets";
import { COPY, PLACES, type Place } from "../_kit/links";

/** One note per place: a G major arpeggio up, then a step down.
 * step = staff position counted from the bottom line (E4 = 0). */
const NOTES: { id: Place["id"]; step: number; freq: number; numeral: string }[] = [
  { id: "studio", step: 2, freq: 392.0, numeral: "I" },
  { id: "log", step: 4, freq: 493.88, numeral: "II" },
  { id: "flute", step: 6, freq: 587.33, numeral: "III" },
  { id: "projects", step: 9, freq: 783.99, numeral: "IV" },
  { id: "contact", step: 7, freq: 659.25, numeral: "V" },
];

/* staff geometry, in px inside .sn-staff */
const LINE_GAP = 12;
const BOTTOM = 84;
const yOf = (step: number) => BOTTOM - (step * LINE_GAP) / 2;

const canHover = () => typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;

/** Play the note, then go. Real links keep their href so long-press and
 * cmd-click still work; a plain click waits a beat so the note is heard. */
function useGo() {
  const open = useOpenSheet();
  return (e: MouseEvent, p: Place, freq: number) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    playFlute(freq);
    if (p.href) {
      const href = p.href;
      window.setTimeout(() => (window.location.href = href), 280);
    } else open(p.id as "flute" | "projects" | "contact");
  };
}

function Staff() {
  const go = useGo();
  return (
    <div className="sn-staff" role="group" aria-label="Places, as notes on a staff">
      <svg className="sn-lines" aria-hidden="true" preserveAspectRatio="none">
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={i} x1="0" x2="100%" y1={BOTTOM - i * LINE_GAP} y2={BOTTOM - i * LINE_GAP} />
        ))}
        <line className="sn-bar" x1="99.6%" x2="99.6%" y1={BOTTOM - 4 * LINE_GAP} y2={BOTTOM} />
      </svg>
      <span className="sn-clef" aria-hidden="true">
        𝄞
      </span>
      {NOTES.map((n, i) => {
        const p = PLACES.find((x) => x.id === n.id)!;
        const y = yOf(n.step);
        const up = n.step < 4;
        const style = { "--x": `${20 + i * 16}%`, "--y": `${y}px` } as CSSProperties;
        return (
          <a
            key={n.id}
            href={p.href ?? "#"}
            className="sn-note"
            style={style}
            aria-label={`${p.label}: ${p.line}`}
            onPointerEnter={() => canHover() && playFlute(n.freq, 0.5)}
            onClick={(e) => go(e, p, n.freq)}
          >
            <svg className="sn-glyph" viewBox="-12 -40 24 80" aria-hidden="true">
              {n.step >= 10 ? <line className="sn-ledger" x1="-11" x2="11" y1="0" y2="0" /> : null}
              <ellipse className="sn-head" cx="0" cy="0" rx="7.2" ry="5.2" transform="rotate(-22)" />
              {up ? <line className="sn-stem" x1="6.4" x2="6.4" y1="-2" y2="-34" /> : <line className="sn-stem" x1="-6.4" x2="-6.4" y1="2" y2="34" />}
            </svg>
            <span className="sn-label">{p.label}</span>
          </a>
        );
      })}
    </div>
  );
}

function Program() {
  const go = useGo();
  return (
    <ol className="sn-program">
      {NOTES.map((n) => {
        const p = PLACES.find((x) => x.id === n.id)!;
        return (
          <li key={n.id}>
            <a href={p.href ?? "#"} className="sn-item" onClick={(e) => go(e, p, n.freq)}>
              <i>{n.numeral}.</i>
              <span>
                <b>{p.label}</b> {p.line}
              </span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}

const CAT_LINES = ["i'm practicing my long tones.", "try the notes below!", "mrrp. that one was in tune."];

export default function StaffOfNotes() {
  const wide = useMedia("(min-width: 760px)");
  return (
    <main className="lab sn">
      <SheetHost>
        <header className="sn-top">
          <span className="sn-name">{COPY.name}</span>
          <ThemeToggle />
        </header>
        <div className="sn-body">
          <section className="sn-hero">
            <div>
              <h1>{COPY.hello}</h1>
              <p className="sn-who">{COPY.who}</p>
            </div>
            {/* MascotSlot: the PS1 cat, playing along */}
            <MascotSlot
              size={wide ? 120 : 72}
              character="cat"
              mood="flute"
              className="sn-mascot mascot-slot--bubble-right"
              lines={CAT_LINES}
              label="Haylie's cat, playing the flute. Tap to say hi."
            />
          </section>
          <h2 className="sn-h2">{COPY.nowTitle}</h2>
          <Staff />
          <p className="sn-hint">Tap a note to hear it and go there.</p>
          <Program />
        </div>
      </SheetHost>
    </main>
  );
}
