"use client";

import { useEffect, useState } from "react";
import { ANIMALS } from "../data/animals";
import { getCritterdex } from "../lib/daily";

export default function CritterdexPage() {
  const [discovered, setDiscovered] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setDiscovered(getCritterdex());
    setMounted(true);
  }, []);

  const count = mounted ? discovered.length : 0;

  return (
    <main className="critter-page">
      <div className="critter-shell">
        <nav className="critter-nav">
          <a href="/daily-critter">← today&rsquo;s critter</a>
        </nav>

        <header className="critterdex-header">
          <h1>Critterdex</h1>
          <p>{count} / {ANIMALS.length} discovered</p>
        </header>

        <div className="critterdex-grid">
          {ANIMALS.map((animal) => {
            const found = mounted && discovered.includes(animal.id);
            return (
              <div key={animal.id} className={`dex-tile${found ? "" : " locked"}`}>
                <span className="tile-emoji">{found ? animal.emoji : "❔"}</span>
                <span className="tile-name">{found ? animal.commonName : "???"}</span>
                <span className="tile-rarity">{found ? animal.rarity : ""}</span>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
