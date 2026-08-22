"use client";

import { useEffect, useState } from "react";
import {
  animalForDate,
  addToCritterdex,
  currentStreak,
  getMissionState,
  markDateCompleted,
  setMissionState,
  todayKey,
} from "./lib/daily";
import type { Animal } from "./data/animals";
import CritterVision from "./CritterVision";

export default function DailyCritterPage() {
  const [dateKey, setDateKey] = useState<string | null>(null);
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [missions, setMissions] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [streak, setStreak] = useState(0);
  const [justCompleted, setJustCompleted] = useState(false);

  useEffect(() => {
    const key = todayKey();
    setDateKey(key);
    setAnimal(animalForDate(key));
    setMissions(getMissionState(key));
    setStreak(currentStreak());
  }, []);

  if (!animal || !dateKey) {
    return (
      <main className="critter-page">
        <div className="critter-shell">
          <nav className="critter-nav">
            <a href="/">← cookie</a>
          </nav>
          <p style={{ color: "#807d73", fontSize: 13 }}>Finding today&rsquo;s critter…</p>
        </div>
      </main>
    );
  }

  const allDone = missions.every(Boolean);

  function toggleMission(index: number) {
    const next = [...missions] as [boolean, boolean, boolean];
    next[index] = !next[index];
    setMissions(next);
    setMissionState(dateKey!, next);
    if (next.every(Boolean)) {
      addToCritterdex(animal!.id);
      markDateCompleted(dateKey!);
      setJustCompleted(true);
      setStreak(currentStreak());
    }
  }

  return (
    <main className="critter-page">
      <div className="critter-shell">
        <nav className="critter-nav">
          <a href="/">← cookie</a>
          {streak > 0 && (
            <span className="critter-streak">
              🔥 <b>{streak}</b> day streak
            </span>
          )}
        </nav>

        <section className={`critter-card rarity-${animal.rarity}`}>
          <span className={`rarity-badge ${animal.rarity}`}>
            {animal.rarity === "rare" ? "✨ Rare encounter" : animal.rarity}
          </span>
          <p className="critter-eyebrow">TODAY YOU ARE A</p>
          <div className="critter-emoji">{animal.emoji}</div>
          <h1 className="critter-name">{animal.commonName}</h1>
          <p className="critter-latin">{animal.scientificName}</p>
          <p className="critter-region">{animal.region}</p>

          <ul className="critter-facts">
            {animal.facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>

          <div className="critter-missions">
            <h2>Today&rsquo;s missions</h2>
            <ul className="mission-list">
              {animal.missions.map((mission, i) => (
                <li key={mission}>
                  <button
                    type="button"
                    className={`mission-item${missions[i] ? " done" : ""}`}
                    aria-pressed={missions[i]}
                    onClick={() => toggleMission(i)}
                  >
                    <span className="mission-check">{missions[i] ? "✓" : ""}</span>
                    <span className="mission-text">{mission}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {allDone && (
            <div className="critter-complete">
              <p>You survived as a {animal.commonName.toLowerCase()}!</p>
              <span>{justCompleted ? "+1 discovered · " : ""}Added to your Critterdex</span>
            </div>
          )}

          <CritterVision name={animal.commonName} note={animal.visionNote} filter={animal.visionFilter} />
        </section>

        <a className="critter-dex-link" href="/daily-critter/critterdex">
          View your Critterdex →
        </a>
      </div>
    </main>
  );
}
