"use client";

import { useEffect, useState } from "react";
import "./nope-jar.css";

type Item = { emoji: string; name: string; price: number; kcal: number };
type Entry = Item & { id: number; size: number };

// Rough guesses. Change these to what you really pay.
const FOOD: Item[] = [
  { emoji: "🧋", name: "Boba", price: 7, kcal: 400 },
  { emoji: "☕", name: "Fancy coffee", price: 6, kcal: 250 },
  { emoji: "🍪", name: "Cookie", price: 4, kcal: 300 },
  { emoji: "🍩", name: "Donut", price: 3, kcal: 300 },
  { emoji: "🍫", name: "Chocolate", price: 3, kcal: 230 },
  { emoji: "🍦", name: "Ice cream", price: 6, kcal: 350 },
  { emoji: "🍟", name: "Fries", price: 5, kcal: 400 },
  { emoji: "🍔", name: "Burger", price: 12, kcal: 700 },
  { emoji: "🍕", name: "Pizza", price: 10, kcal: 600 },
  { emoji: "🥡", name: "Takeout", price: 20, kcal: 900 },
];

const STUFF: Item[] = [
  { emoji: "📿", name: "Bracelet", price: 30, kcal: 0 },
  { emoji: "💍", name: "Ring", price: 40, kcal: 0 },
  { emoji: "👗", name: "Clothes", price: 45, kcal: 0 },
  { emoji: "👟", name: "Shoes", price: 80, kcal: 0 },
  { emoji: "👜", name: "Bag", price: 60, kcal: 0 },
  { emoji: "💄", name: "Makeup", price: 25, kcal: 0 },
  { emoji: "🧸", name: "Cute thing", price: 20, kcal: 0 },
  { emoji: "📚", name: "Book", price: 18, kcal: 0 },
  { emoji: "🎧", name: "Gadget", price: 70, kcal: 0 },
  { emoji: "📦", name: "Something else", price: 25, kcal: 0 },
];

const SIZES = [
  { label: "Small", size: 0.5 },
  { label: "Usual", size: 1 },
  { label: "Big", size: 2 },
];

const STORE_KEY = "nope-jar-v1";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const JAR_LIMIT = 48;

function load(): Entry[] {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function save(entries: Entry[]) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(entries));
  } catch {
    // Private windows can block storage. The jar still works until refresh.
  }
}

const money = (entries: Entry[]) => Math.round(entries.reduce((sum, e) => sum + e.price * e.size, 0));
const calories = (entries: Entry[]) => Math.round(entries.reduce((sum, e) => sum + e.kcal * e.size, 0));

export default function NopeJar() {
  const [entries, setEntries] = useState<Entry[]>([]);
  // Only the newest tap can be resized or undone, and only until the next tap.
  const [lastId, setLastId] = useState<number | null>(null);

  useEffect(() => {
    setEntries(load());
  }, []);

  const commit = (next: Entry[]) => {
    setEntries(next);
    save(next);
  };

  const skip = (item: Item) => {
    const id = Date.now();
    commit([...entries, { ...item, id, size: 1 }]);
    setLastId(id);
  };

  const resize = (size: number) => commit(entries.map((e) => (e.id === lastId ? { ...e, size } : e)));

  const undo = () => {
    commit(entries.filter((e) => e.id !== lastId));
    setLastId(null);
  };

  const last = entries.find((e) => e.id === lastId);
  const week = entries.filter((e) => e.id > Date.now() - WEEK_MS);

  const grid = (title: string, items: Item[]) => (
    <section className="nope__group">
      <h2>{title}</h2>
      <div className="nope__grid">
        {items.map((item) => (
          <button key={item.emoji} type="button" title={item.name} aria-label={`Skipped ${item.name}`} onClick={() => skip(item)}>
            {item.emoji}
          </button>
        ))}
      </div>
    </section>
  );

  return (
    <main className="nope">
      <header className="nope__header">
        <h1>Nope Jar</h1>
        <p>Wanted it, didn&apos;t get it? Tap it into the jar.</p>
      </header>

      <div className="nope__layout">
        <section className="nope__jar-side">
          <div className="nope__stats">
            <div><b>${money(week)}</b><span>kept this week</span></div>
            <div><b>{calories(week).toLocaleString()}</b><span>kcal skipped</span></div>
            <div><b>{week.length}</b><span>{week.length === 1 ? "nope" : "nopes"}</span></div>
          </div>

          <div className="nope__jar" aria-label={`Jar holding ${week.length} skipped items this week`}>
            {week.length === 0 && <p className="nope__empty">Your jar is empty. First nope goes here.</p>}
            {week.slice(-JAR_LIMIT).map((e) => (
              <span key={e.id} className={e.id === lastId ? "is-new" : undefined} style={{ rotate: `${(e.id % 31) - 15}deg` }}>
                {e.emoji}
              </span>
            ))}
          </div>

          <div className="nope__last" aria-live="polite">
            {last ? (
              <>
                <p>
                  <span aria-hidden="true">{last.emoji}</span> {last.name} skipped. ${Math.round(last.price * last.size)} kept
                  {last.kcal > 0 && `, ${Math.round(last.kcal * last.size)} kcal skipped`}.
                </p>
                <div className="nope__actions">
                  {SIZES.map((s) => (
                    <button key={s.label} type="button" aria-pressed={last.size === s.size} onClick={() => resize(s.size)}>
                      {s.label}
                    </button>
                  ))}
                  <button type="button" className="nope__undo" onClick={undo}>Undo</button>
                </div>
              </>
            ) : (
              <p className="nope__total">All time: ${money(entries)} kept, {calories(entries).toLocaleString()} kcal skipped</p>
            )}
          </div>
        </section>

        <div className="nope__pickers">
          {grid("Food", FOOD)}
          {grid("Stuff", STUFF)}
        </div>
      </div>
    </main>
  );
}
