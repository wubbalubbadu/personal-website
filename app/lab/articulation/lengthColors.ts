import type {LengthWord} from "./engine";

/**
 * One colour per length word, used by the note blocks, the shape overlay and the legend so they always agree.
 * Inks from the studio's icon-tile tones (DESIGN.md), deepened enough to read as thin lines on white.
 */
export const LENGTH_COLOR: Record<LengthWord, string> = {
  slurred: "#5f8150",
  full: "#4f5962",
  detached: "#a07a3c",
  staccato: "#b06db8",
  staccatissimo: "#7a3f86",
};
