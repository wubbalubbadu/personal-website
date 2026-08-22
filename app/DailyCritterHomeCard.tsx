"use client";

import { useEffect, useState } from "react";
import { animalForDate, getMissionState, todayKey } from "./daily-critter/lib/daily";
import type { Animal } from "./daily-critter/data/animals";

export default function DailyCritterHomeCard() {
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [doneCount, setDoneCount] = useState<number | null>(null);

  useEffect(() => {
    const key = todayKey();
    setAnimal(animalForDate(key));
    setDoneCount(getMissionState(key).filter(Boolean).length);
  }, []);

  return (
    <a className="project-card live" href="/daily-critter">
      <div className="project-mark sage">{animal ? animal.emoji : "🐾"}</div>
      <div className="project-copy">
        <small>04 · DAILY IDENTITY GAME</small>
        <h2>{animal ? `${animal.commonName} day` : "Today's critter"}</h2>
        <p>
          {animal === null
            ? "Loading today's animal…"
            : `${doneCount}/3 missions completed`}{" "}
          · grow your Critterdex.
        </p>
      </div>
      <span className="project-action">Open today&rsquo;s card <b>↗</b></span>
    </a>
  );
}
