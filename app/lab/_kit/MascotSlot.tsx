"use client";

import { PS1Mascot, type MascotCharacter, type MascotMood, type MascotScene } from "../../components/ps1-mascot";

/**
 * <MascotSlot/>: the PS1 mascot (app/components/ps1-mascot) sized for the lab
 * pages. The wrapper owns size and placement; the mascot fills it.
 *
 * Kept light for phones: three.js loads lazily inside PS1Mascot, the render
 * is a low-res canvas scaled up (pixelHeight follows the box size), and the
 * engine stops while the slot is off screen, the tab is hidden, or the
 * viewer prefers reduced motion. PS1Mascot renders its own button, so pass
 * onClick here rather than wrapping the slot in another button.
 */
export default function MascotSlot({
  size = 160,
  fill = false,
  aspect,
  pixelHeight,
  character = "cookie",
  mood = "idle",
  scene = "none",
  lines = [],
  onClick,
  className = "",
  label,
}: {
  /** Width in CSS px. Height follows the aspect. Ignored with `fill`. */
  size?: number;
  /** Fill the parent box instead (a handheld's screen, say); the parent sets the size. */
  fill?: boolean;
  /** Width / height. Square alone, 4:3 with a scene, unless given. */
  aspect?: number;
  /** Render height in pixels; lower is chunkier. Defaults from `size`. */
  pixelHeight?: number;
  character?: MascotCharacter;
  mood?: MascotMood;
  scene?: MascotScene;
  /** Lines the mascot says in its own bubble when tapped. Empty stays quiet. */
  lines?: string[];
  onClick?: () => void;
  className?: string;
  label?: string;
}) {
  const ratio = aspect ?? (scene === "none" ? 1 : 4 / 3);
  const height = Math.round(size / ratio);
  /* About one render pixel per 1.3 CSS pixels at phone sizes: crunchy, and cheap. */
  const renderHeight = pixelHeight ?? Math.round(Math.min(180, Math.max(72, height * 0.8)));
  return (
    <div
      className={`mascot-slot ${className}`}
      data-mascot-slot=""
      style={fill ? { width: "100%", height: "100%" } : { width: size, height }}
    >
      <PS1Mascot
        size="100%"
        aspect={ratio}
        character={character}
        mood={mood}
        scene={scene}
        pixelHeight={renderHeight}
        fps={24}
        lines={lines}
        bubble="above"
        onClick={onClick}
        label={label}
      />
    </div>
  );
}
