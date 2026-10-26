"use client";

import type { MascotMood, MascotScene } from "../../components/ps1-mascot";
import MascotSlot from "../_kit/MascotSlot";

/**
 * The cat's handheld: a little game device on the page with the PS1 cat
 * living on its screen. Two takes share everything but the body:
 * "psp" is wide (16:9 screen, D-pad and four face buttons either side) and
 * "gb" is portrait (a squarer screen up top, D-pad and A / B below).
 *
 * The device's own buttons change what the cat is doing, and the scene goes
 * with it: hanging out or snacking on the desk, practising flute or napping
 * in the tiny room. The scenes and moods are the ones on /lab/mascot.
 */

export type Activity = {
  id: "desk" | "snack" | "flute" | "nap";
  scene: MascotScene;
  mood: MascotMood;
  /** Shown on the screen, in the pixel font. */
  lcd: string;
  /** For screen readers and tooltips. */
  label: string;
};

export const ACTIVITIES: Activity[] = [
  { id: "desk", scene: "desk", mood: "idle", lcd: "ON THE DESK", label: "On the desk" },
  { id: "snack", scene: "desk", mood: "eat", lcd: "SNACK TIME", label: "Snack time" },
  { id: "flute", scene: "room", mood: "flute", lcd: "FLUTE PRACTICE", label: "Flute practice" },
  { id: "nap", scene: "room", mood: "sleep", lcd: "NAP", label: "Nap" },
];

export type Device = "psp" | "gb";

/** PSP face buttons, one per activity, in the classic diamond. */
const FACE: { activity: Activity["id"]; glyph: string; pos: "top" | "right" | "bottom" | "left" }[] = [
  { activity: "flute", glyph: "△", pos: "top" },
  { activity: "snack", glyph: "○", pos: "right" },
  { activity: "desk", glyph: "✕", pos: "bottom" },
  { activity: "nap", glyph: "□", pos: "left" },
];

function DPad({ onPrev, onNext }: { onPrev: () => void; onNext: () => void }) {
  return (
    <div className="hh-dpad" role="group" aria-label="Change what the cat is doing">
      <span className="hh-dpad__up" aria-hidden="true" />
      <span className="hh-dpad__down" aria-hidden="true" />
      <button type="button" className="hh-dpad__left" onClick={onPrev} aria-label="Previous activity" title="Previous" />
      <button type="button" className="hh-dpad__right" onClick={onNext} aria-label="Next activity" title="Next" />
      <span className="hh-dpad__hub" aria-hidden="true" />
    </div>
  );
}

export function Handheld({
  device,
  activity,
  onPick,
  onPoke,
  pixelHeight,
}: {
  device: Device;
  activity: Activity;
  onPick: (id: Activity["id"]) => void;
  onPoke: () => void;
  pixelHeight: number;
}) {
  const i = ACTIVITIES.findIndex((a) => a.id === activity.id);
  const step = (d: number) => onPick(ACTIVITIES[(i + d + ACTIVITIES.length) % ACTIVITIES.length].id);

  const screen = (
    <div className="hh-bezel">
      <div className="hh-screen">
        <MascotSlot
          fill
          aspect={device === "psp" ? 16 / 9 : 10 / 9}
          pixelHeight={pixelHeight}
          character="cat"
          scene={activity.scene}
          mood={activity.mood}
          label="Haylie's cat. Tap to chat."
          onClick={onPoke}
        />
        <span className="hh-lcd" aria-live="polite">
          <span aria-hidden="true">◀ </span>
          {activity.lcd}
          <span aria-hidden="true"> ▶</span>
        </span>
      </div>
    </div>
  );

  if (device === "psp") {
    return (
      <div className="hh hh--psp">
        <div className="hh-side hh-side--left">
          <DPad onPrev={() => step(-1)} onNext={() => step(1)} />
        </div>
        <div className="hh-middle">
          {screen}
          <span className="hh-brand" aria-hidden="true">
            HAYLIE
          </span>
        </div>
        <div className="hh-side hh-side--right">
          <div className="hh-face" role="group" aria-label="What the cat is doing">
            {FACE.map((f) => {
              const a = ACTIVITIES.find((x) => x.id === f.activity)!;
              return (
                <button
                  key={f.activity}
                  type="button"
                  className={`hh-face__btn hh-face__btn--${f.pos}`}
                  aria-pressed={activity.id === a.id}
                  aria-label={a.label}
                  title={a.label}
                  onClick={() => onPick(a.id)}
                >
                  <span aria-hidden="true">{f.glyph}</span>
                </button>
              );
            })}
          </div>
        </div>
        <span className="hh-speaker hh-speaker--left" aria-hidden="true" />
        <span className="hh-speaker hh-speaker--right" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="hh hh--gb">
      <div className="hh-gb__top">
        <span className="hh-led" aria-hidden="true" />
        {screen}
        <span className="hh-brand" aria-hidden="true">
          HAYLIE WU
        </span>
      </div>
      <div className="hh-gb__controls">
        <DPad onPrev={() => step(-1)} onNext={() => step(1)} />
        <div className="hh-ab">
          <button type="button" className="hh-ab__btn hh-ab__btn--b" onClick={() => step(-1)} aria-label="Previous activity" title="Previous">
            <span aria-hidden="true">B</span>
          </button>
          <button type="button" className="hh-ab__btn hh-ab__btn--a" onClick={() => step(1)} aria-label="Next activity" title="Next">
            <span aria-hidden="true">A</span>
          </button>
        </div>
      </div>
      <span className="hh-grille" aria-hidden="true" />
    </div>
  );
}
