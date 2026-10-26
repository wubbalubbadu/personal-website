"use client";

import "./mascot-lab.css";
import { useState } from "react";
import RehearsalRoom from "./RehearsalRoom";
import { PS1Mascot, type MascotCharacter, type MascotEffects, type MascotMood, type MascotScene } from "@/app/components/ps1-mascot";

const SCENES: { id: MascotScene; label: string }[] = [
  { id: "none", label: "Just them" },
  { id: "desk", label: "On the desk" },
  { id: "float", label: "Floating" },
  { id: "room", label: "Tiny room" },
];
const MOODS: { id: MascotMood; label: string }[] = [
  { id: "idle", label: "Idle" },
  { id: "eat", label: "Snack" },
  { id: "flute", label: "Flute" },
  { id: "sleep", label: "Nap" },
];
const CHARACTERS: { id: MascotCharacter; label: string }[] = [
  { id: "cookie", label: "Cookie" },
  { id: "cat", label: "Cat" },
];

const SAY_LINES = [
  "hi! welcome to my little corner of the internet.",
  "did you practice today? me neither. let's go!",
  "wait, is that a cookie??",
  "ni hao! wo shi xiao bing gan, hen gao xing ren shi ni!",
  "你好！我是小饼干。",
];

const CLEAN: MascotEffects = { snap: 0, affine: false, dither: false, colorBits: 8 };

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="ml-field">
      <span className="ml-label">{label}</span>
      <div className="ml-seg" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={o.id} type="button" role="radio" aria-checked={value === o.id} className={value === o.id ? "is-on" : ""} onClick={() => onChange(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function MascotLab() {
  const [character, setCharacter] = useState<MascotCharacter>("cookie");
  const [scene, setScene] = useState<MascotScene>("desk");
  const [mood, setMood] = useState<MascotMood>("idle");
  const [snap, setSnap] = useState(2);
  const [affine, setAffine] = useState(true);
  const [dither, setDither] = useState(true);
  const [colorBits, setColorBits] = useState(5);
  const [pixelHeight, setPixelHeight] = useState(180);
  const [fps, setFps] = useState(30);
  const [sound, setSound] = useState(false);
  const [still, setStill] = useState(false);
  const [say, setSay] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [stats, setStats] = useState<{ ms: number; fps: number } | null>(null);
  const effects: MascotEffects = { snap, affine, dither, colorBits };

  const [sayKey, setSayKey] = useState(0);
  const speak = (text: string) => {
    setSay(text);
    setSayKey((n) => n + 1);
  };

  return (
    <main className="ml">
      <div className="ml-inner">
        <header className="ml-head">
          <h1>Cookie, in 3D</h1>
          <p>
            A tiny friend drawn the way a PlayStation would have drawn it in 1997: few polygons, wobbly
            vertices, crunchy textures. Tap them to say hi, and move your pointer around to get their attention.
          </p>
          <a className="ml-jump" href="#rehearsal-room">Visit the new rehearsal room ↓</a>
        </header>

        <div className="ml-workbench">
        <section className="ml-stage" aria-label="Main mascot">
          <div className="ml-viewer">
            <PS1Mascot
              size="100%"
              character={character}
              scene={scene}
              mood={mood}
              effects={effects}
              pixelHeight={pixelHeight}
              fps={fps}
              sound={sound}
              still={still}
              say={say}
              sayKey={sayKey}
              aspect={scene === "none" ? 4 / 3 : undefined}
              bubble="inside"
              onStats={(ms, f) => setStats({ ms, fps: f })}
            />
          </div>
          <p className="ml-stats" aria-live="off">
            {still ? "Still frame" : stats ? `${stats.ms.toFixed(2)} ms per frame, ${Math.round(stats.fps)} fps` : "Warming up the oven"}
          </p>
        </section>

        <section className="ml-panel" aria-label="Controls">
          <Segmented label="Who" value={character} options={CHARACTERS} onChange={setCharacter} />
          <Segmented label="Where" value={scene} options={SCENES} onChange={setScene} />
          <Segmented label="Doing" value={mood} options={MOODS} onChange={setMood} />

          <div className="ml-field">
            <span className="ml-label">Voice</span>
            <div className="ml-row">
              <button type="button" className={`ml-chip ${sound ? "is-on" : ""}`} aria-pressed={sound} onClick={() => setSound((v) => !v)}>
                <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 8v4h3l4 3V5L6 8H3z" fill="currentColor" />
                  {sound ? <path d="M13 7.5a3.5 3.5 0 0 1 0 5M15.5 5a7 7 0 0 1 0 10" /> : <path d="M13.5 8l4 4M17.5 8l-4 4" />}
                </svg>
                {sound ? "Sound on" : "Sound off"}
              </button>
            </div>
            <div className="ml-lines">
              {SAY_LINES.map((line) => (
                <button key={line} type="button" className="ml-line" onClick={() => speak(line)}>
                  {line}
                </button>
              ))}
            </div>
            <form
              className="ml-say"
              onSubmit={(e) => {
                e.preventDefault();
                if (draft.trim()) speak(draft.trim());
              }}
            >
              <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Make them say something" aria-label="Line to say" maxLength={120} />
              <button type="submit" className="ml-chip">Say it</button>
            </form>
          </div>

          <div className="ml-field">
            <span className="ml-label">PS1 effects</span>
            <label className="ml-slider">
              <span>Wobble</span>
              <input type="range" min={0} max={6} step={0.5} value={snap} onChange={(e) => setSnap(+e.target.value)} />
              <output>{snap === 0 ? "off" : `${snap}px`}</output>
            </label>
            <label className="ml-slider">
              <span>Colour</span>
              <input type="range" min={2} max={8} step={1} value={colorBits} onChange={(e) => setColorBits(+e.target.value)} />
              <output>{colorBits === 8 ? "full" : `${colorBits} bit`}</output>
            </label>
            <label className="ml-slider">
              <span>Pixels</span>
              <input type="range" min={90} max={360} step={10} value={pixelHeight} onChange={(e) => setPixelHeight(+e.target.value)} />
              <output>{pixelHeight}p</output>
            </label>
            <label className="ml-slider">
              <span>Frame rate</span>
              <input type="range" min={10} max={60} step={5} value={fps} onChange={(e) => setFps(+e.target.value)} />
              <output>{fps}</output>
            </label>
            <div className="ml-row">
              <label className="ml-check"><input type="checkbox" checked={affine} onChange={(e) => setAffine(e.target.checked)} /> Warped textures</label>
              <label className="ml-check"><input type="checkbox" checked={dither} onChange={(e) => setDither(e.target.checked)} /> Dithering</label>
              <label className="ml-check"><input type="checkbox" checked={still} onChange={(e) => setStill(e.target.checked)} /> Still frame</label>
            </div>
          </div>
        </section>

        </div>

        <RehearsalRoom />

        <section className="ml-gallery" aria-label="Scene ideas">
          <h2>Three little sets</h2>
          <div className="ml-grid">
            <figure>
              <PS1Mascot size="100%" scene="desk" mood="eat" pixelHeight={160} lines={["*nom*", "these are the good ones."]} />
              <figcaption>Snack time on the desk, with a bowl of mini cookies in milk.</figcaption>
            </figure>
            <figure>
              <PS1Mascot size="100%" scene="float" mood="idle" pixelHeight={160} />
              <figcaption>Floating on a 1-bit dithered backdrop, like an old zine scan.</figcaption>
            </figure>
            <figure>
              <PS1Mascot size="100%" scene="room" mood="flute" character="cat" pixelHeight={160} />
              <figcaption>A tiny room where the cat practices flute by the window.</figcaption>
            </figure>
          </div>
        </section>

        <section className="ml-gallery" aria-label="Effects compared">
          <h2>With and without the PS1 look</h2>
          <div className="ml-grid ml-grid--two">
            <figure>
              <PS1Mascot size="100%" mood="idle" character={character} pixelHeight={150} />
              <figcaption>PS1 on: wobble, warped textures, 15-bit colour with dithering.</figcaption>
            </figure>
            <figure>
              <PS1Mascot size="100%" mood="idle" character={character} pixelHeight={150} effects={CLEAN} />
              <figcaption>Clean: same model and resolution, effects off.</figcaption>
            </figure>
          </div>
        </section>
      </div>
    </main>
  );
}
