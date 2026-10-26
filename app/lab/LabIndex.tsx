"use client";

import "./_kit/kit.css";
import "./lab-index.css";

const DIRECTIONS = [
  { href: "/lab/home-1", name: "Cat host, wide handheld", line: "The cat lives on a PSP style handheld beside the intro and links." },
  { href: "/lab/home-1b", name: "Cat host, portrait handheld", line: "The same page with a Game Boy style handheld." },
  { href: "/lab/home-2", name: "Memory card", line: "A PS1 memory card screen. Each save block is one thing I make." },
  { href: "/lab/home-3", name: "Staff of notes", line: "One line of music. Each note is a link, and it plays." },
];

export default function LabIndex() {
  return (
    <main className="lab lab-index">
      <p className="lab-index__eyebrow">Landing lab</p>
      <h1>Home page experiments</h1>
      <p className="lab-index__note">Prototypes only. The live home page is unchanged.</p>
      <ol>
        {DIRECTIONS.map((d) => (
          <li key={d.href}>
            <a href={d.href}>
              <b>{d.name} ›</b>
              <span>{d.line}</span>
            </a>
          </li>
        ))}
      </ol>
    </main>
  );
}
