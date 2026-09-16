"use client";

import { fluteBody, fluteKeys, type FluteKey, type FluteKeyId } from "../../../content/fingerings/keys";
import "./flute-diagram.css";

/**
 * A flute fingering diagram in the conventional printed-chart layout.
 *
 * The studio's old display was a row of equal dots with letters underneath:
 * it told you how many things were pressed but not which, so you had to
 * decode it rather than read it. This uses the vocabulary every flute chart
 * already shares — one row of key shapes, filled for closed and hollow for
 * open, with the thumb pair beneath the left hand — so anyone who has seen
 * a fingering chart can read it with no legend.
 *
 * Line-like keys (the levers) are drawn as two stacked strokes: a dark one
 * for the outline and a lighter one on top for the hollow. Flipping the
 * inner stroke dark is what fills them, which is the only way to get the
 * hollow-versus-solid reading on a shape that is a path rather than a
 * closed outline.
 *
 * `interactive` turns every key into a button, which is what reverse lookup
 * (press keys, find the note) is built on. Left off, this is inert artwork
 * and stays out of the tab order.
 */
export function FluteDiagram({
  pressed,
  interactive = false,
  onToggle,
  hasBFoot = true,
  className = "",
}: {
  pressed: ReadonlySet<FluteKeyId> | readonly FluteKeyId[];
  interactive?: boolean;
  onToggle?: (key: FluteKeyId) => void;
  hasBFoot?: boolean;
  className?: string;
}) {
  const down = pressed instanceof Set ? pressed : new Set(pressed as readonly FluteKeyId[]);
  // A key that is not on your instrument is noise, not information, so the
  // B-foot touches are omitted rather than greyed out.
  const keys = fluteKeys.filter(
    key =>
      (!key.requires || (key.requires === "b-foot" && hasBFoot)) &&
      // The side lever appears on the one fingering that uses it, nowhere
      // else — see `onlyWhenPressed`.
      (!key.onlyWhenPressed || down.has(key.id)),
  );

  return (
    <svg
      className={`flute-diagram ${interactive ? "is-interactive" : ""} ${className}`}
      viewBox={`0 0 ${fluteBody.width} ${fluteBody.height}`}
      role={interactive ? "group" : "img"}
      aria-label={interactive ? "Flute keys" : "Flute fingering"}
    >
      {keys.map(key => (
        <g
          key={key.id}
          className={`flute-key flute-key--${key.shape} ${down.has(key.id) ? "is-down" : ""}`}
          // Spread as a block rather than a set of conditional attributes:
          // a bare tabIndex on a group with no role reads as a focusable
          // non-interactive element, which it never is here.
          {...(interactive
            ? {
                role: "button" as const,
                tabIndex: 0,
                "aria-pressed": down.has(key.id),
                "aria-label": key.label,
                onClick: () => onToggle?.(key.id),
                onKeyDown: (event: React.KeyboardEvent) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onToggle?.(key.id);
                  }
                },
              }
            : {})}
        >
          <title>{key.label}</title>
          {keyShape(key)}
        </g>
      ))}
    </svg>
  );
}

function keyShape({ shape, x, y, r, ry }: FluteKey) {
  const h = ry ?? r;
  switch (shape) {
    case "ring":
      return <circle cx={x} cy={y} r={r} />;
    case "oval":
      // The trill touches: taller than wide, sitting below the ring line.
      return <ellipse cx={x} cy={y} rx={r} ry={h} />;
    case "pill":
      // A lever: an upright stadium. Fully rounded, so it reads as a
      // touchpiece rather than a button.
      return <rect x={x - r} y={y - h} width={r * 2} height={h * 2} rx={r} />;
    case "bar":
      // A foot or thumb touch: a flat stadium.
      return <rect x={x - r} y={y - h / 2} width={r * 2} height={h} rx={h / 2} />;
  }
}

/** Small inline form for tooltips and list rows. */
export function FluteDiagramMini({ pressed, hasBFoot }: { pressed: readonly FluteKeyId[]; hasBFoot?: boolean }) {
  return <FluteDiagram pressed={pressed} hasBFoot={hasBFoot} className="flute-diagram--mini" />;
}
