"use client";

import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import type { MascotEngine, MascotMood, MascotScene } from "../../components/ps1-mascot";
import MascotSlot from "../_kit/MascotSlot";

/**
 * The cat's handheld, the page's centrepiece. Its screen is the cat's studio
 * (a desk under a wall) and nothing else, so the room stays clear; what the
 * cat says comes out of the speaker into a bubble below the console. The
 * page draws what goes over the scene (name tag, item card, laptop desktop);
 * this file is the device: body, screen and buttons.
 *
 * - "psp": wide; on a phone it stacks (screen on top, controls under it,
 *   like the PSP Go) so the screen can be big.
 * - "gb": portrait, screen on top, D-pad and A / B below.
 */

export type Device = "psp" | "gb";

export type Pad = {
  up: () => void;
  down: () => void;
  left: () => void;
  right: () => void;
  /** Inspect or open. */
  a: () => void;
  /** Back. */
  b: () => void;
  /** △: pet the cat. */
  pet: () => void;
  /** □: back to the hello. */
  home: () => void;
};

function DPad({ pad }: { pad: Pad }) {
  return (
    <div className="hh-dpad" role="group" aria-label="Look around">
      <button type="button" className="hh-dpad__up" onClick={pad.up} aria-label="Up: the wall" title="Up" />
      <button type="button" className="hh-dpad__left" onClick={pad.left} aria-label="Left" title="Left" />
      <span className="hh-dpad__hub" aria-hidden="true" />
      <button type="button" className="hh-dpad__right" onClick={pad.right} aria-label="Right" title="Right" />
      <button type="button" className="hh-dpad__down" onClick={pad.down} aria-label="Down: the desk" title="Down" />
    </div>
  );
}

export function Console({
  device,
  sceneAspect,
  pixelHeight,
  mood,
  scene,
  onEngine,
  onSceneTap,
  onSceneHover,
  overlay,
  pad,
  talking,
}: {
  device: Device;
  /** Width / height the scene renders at. The screen's own shape comes from CSS
   *  (4:3, or 16:9 on the wide PSP) so the first paint is already right. */
  sceneAspect: number;
  pixelHeight: number;
  mood: MascotMood;
  /** The desk-and-wall studio, or the living room. */
  scene: MascotScene;
  onEngine: (engine: MascotEngine | null) => void;
  /** A tap on the scene, 0..1 from the top left. */
  onSceneTap: (x: number, y: number) => void;
  onSceneHover: (x: number, y: number) => void;
  /** Drawn over the scene: name tag, laptop desktop, dialogue. */
  overlay: ReactNode;
  pad: Pad;
  /** Sound waves come out of the speaker while the cat is talking. */
  talking: boolean;
}) {
  const at = (e: ReactPointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height] as const;
  };
  return (
    // The PSP picks stacked or side-by-side in CSS by screen width, not here:
    // the server can't know the width, and guessing made desktops start as a phone.
    <div className={`hh hh--${device}${device === "gb" ? " hh--stacked" : ""}${talking ? " is-talking" : ""}`}>
      <div className="hh-top">
        {device === "gb" ? <span className="hh-led" aria-hidden="true" /> : null}
        <div className="hh-bezel">
          <div className="hh-screen">
            {/* Taps and hovers find the nearest glowing thing; the buttons and the
                list in the page cover keyboards and screen readers. */}
            <div
              className="hh-scene"
              onPointerUp={(e) => {
                if (e.pointerType === "mouse" && e.button !== 0) return;
                onSceneTap(...at(e));
              }}
              onPointerMove={(e) => {
                if (e.pointerType === "mouse") onSceneHover(...at(e));
              }}
              onPointerLeave={() => onSceneHover(-1, -1)}
            >
              <MascotSlot
                fill
                aspect={sceneAspect}
                pixelHeight={pixelHeight}
                character="cat"
                scene={scene}
                mood={mood}
                label="Haylie's cat"
                onEngine={onEngine}
              />
            </div>
            {overlay}
          </div>
        </div>
      </div>

      <div className="hh-ctl hh-ctl--left">
        <DPad pad={pad} />
      </div>

      <div className="hh-ctl hh-ctl--mid">
        <span className="hh-waves" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </div>

      <div className="hh-ctl hh-ctl--right">
        {device === "psp" ? (
          <div className="hh-face" role="group" aria-label="Buttons">
            <button type="button" className="hh-face__btn hh-face__btn--top" onClick={pad.pet} aria-label="Pet the cat" title="Pet the cat">
              <span aria-hidden="true">△</span>
            </button>
            <button type="button" className="hh-face__btn hh-face__btn--right" onClick={pad.b} aria-label="Back" title="Back">
              <span aria-hidden="true">○</span>
            </button>
            <button type="button" className="hh-face__btn hh-face__btn--bottom" onClick={pad.a} aria-label="Inspect" title="Inspect">
              <span aria-hidden="true">✕</span>
            </button>
            <button type="button" className="hh-face__btn hh-face__btn--left" onClick={pad.home} aria-label="Back to the hello" title="Back to the hello">
              <span aria-hidden="true">□</span>
            </button>
            <small className="hh-print hh-print--x" aria-hidden="true">INSPECT</small>
            <small className="hh-print hh-print--o" aria-hidden="true">BACK</small>
            <small className="hh-print hh-print--t" aria-hidden="true">PET</small>
            <small className="hh-print hh-print--s" aria-hidden="true">HOME</small>
          </div>
        ) : (
          <div className="hh-ab">
            <span className="hh-ab__key">
              <button type="button" className="hh-ab__btn hh-ab__btn--b" onClick={pad.b} aria-label="Back" title="Back">
                <span aria-hidden="true">B</span>
              </button>
              <small className="hh-print" aria-hidden="true">BACK</small>
            </span>
            <span className="hh-ab__key hh-ab__key--a">
              <button type="button" className="hh-ab__btn hh-ab__btn--a" onClick={pad.a} aria-label="Inspect" title="Inspect">
                <span aria-hidden="true">A</span>
              </button>
              <small className="hh-print" aria-hidden="true">INSPECT</small>
            </span>
          </div>
        )}
      </div>

      {device === "psp" ? (
        <>
          <span className="hh-speaker hh-speaker--left" aria-hidden="true" />
          <span className="hh-speaker hh-speaker--right" aria-hidden="true" />
        </>
      ) : (
        <span className="hh-grille" aria-hidden="true" />
      )}
    </div>
  );
}
