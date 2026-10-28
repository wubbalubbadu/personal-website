import type { Place } from "./links";

/* 12x12 pixel icons, one per place, in the spirit of PS1 save icons.
 * Each row is 12 characters; "." is empty. */
export const PALETTE: Record<string, string> = {
  k: "#2b1420",
  w: "#ffffff",
  b: "#e8a85e",
  c: "#5a2e18",
  p: "#ff6eac",
  d: "#3b2b4a",
  y: "#ffd25a",
  s: "#cfc6d6",
};

export const ICONS: Record<Place["id"], string[]> = {
  studio: [
    "....kkkk....",
    "..kkbbbbkk..",
    ".kbbcbbbbbk.",
    ".kbbbbbcbbk.",
    "kbbcbbbbbbbk",
    "kbbbbbcbbbbk",
    "kbcbbbbbbcbk",
    "kbbbbcbbbbbk",
    ".kbbbbbbcbk.",
    ".kbcbbbbbbk.",
    "..kkbbbbkk..",
    "....kkkk....",
  ],
  log: [
    "..kkkkkkkkk.",
    ".kkppppppppk",
    "k.kpwwwwwwpk",
    ".kkppppppppk",
    "k.kpwwwwwppk",
    ".kkppppppppk",
    "k.kpwwwwwwpk",
    ".kkppppppppk",
    "k.kpwwwwpppk",
    ".kkppppppppk",
    "..kkkkkkkkk.",
    "............",
  ],
  flute: [
    "............",
    ".kkkkkkkkkk.",
    "kppppppppppk",
    "kpppwppppppk",
    "kpppwwpppppk",
    "kpppwwwppppk",
    "kpppwwwwpppk",
    "kpppwwwppppk",
    "kpppwwpppppk",
    "kpppwppppppk",
    ".kkkkkkkkkk.",
    "...kk..kk...",
  ],
  projects: [
    "............",
    "..kkkkkkkk..",
    "..kddddddk..",
    "..kdyyyddk..",
    "..kddyyydk..",
    "..kdyydddk..",
    "..kddddddk..",
    "..kkkkkkkk..",
    ".kssssssssk.",
    "kssssssssssk",
    "kkkkkkkkkkkk",
    "............",
  ],
  contact: [
    "............",
    "............",
    "kkkkkkkkkkkk",
    "kwkwwwwwwkwk",
    "kwwkwwwwkwwk",
    "kwwwkwwkwwwk",
    "kwwwwkkwwwwk",
    "kwwwwwwwpwpk",
    "kwwwwwwwpppk",
    "kwwwwwwwwpwk",
    "kkkkkkkkkkkk",
    "............",
  ],
};

export default function PixelIcon({ id, className }: { id: Place["id"]; className?: string }) {
  const rows = ICONS[id];
  return (
    <svg className={className} viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden="true">
      {rows.flatMap((row, y) =>
        [...row].map((ch, x) =>
          ch === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={PALETTE[ch]} />,
        ),
      )}
    </svg>
  );
}
