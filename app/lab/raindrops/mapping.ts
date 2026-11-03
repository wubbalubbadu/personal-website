import type { Note } from "./listener";

/** How one shape looks. The canvas draws whatever this says. */
export type Drawing = {
  /** Radius in CSS pixels. */
  size: number;
  /** 0 to 1. */
  opacity: number;
  /** 0 to 360 on the color wheel: 0 red, 120 green, 240 blue. */
  hue: number;
  /** 0 is a soft blur, 1 is a crisp disc. */
  edge: number;
  /** How long the shape takes to appear. */
  fadeInMs: number;
  /** How long it lingers after the note ends. */
  fadeOutMs: number;
};

/**
 * Called every frame while a note sounds, and once more when it ends.
 *
 * While it sounds, `note.lengthMs` is still growing and `note.endingMs` is
 * null: the page cannot know yet how long the note will be. Once it ends,
 * `endingMs` arrives and the shape starts to fade.
 *
 * Typical flute values: attackMs 5 to 60, lengthMs 80 to 3000,
 * endingMs 5 to 400, hz about 260 (C4) to 2100 (C7).
 */
export function drawingFor(note: Note): Drawing {
  // TODO(you): turn the five qualities into a look.
  return { size: 40, opacity: 0.8, hue: 200, edge: 0.5, fadeInMs: 80, fadeOutMs: 1200 };
}
