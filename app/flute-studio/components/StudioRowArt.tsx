/**
 * The little animated marks a studio row can wear instead of its generic
 * focus icon.
 *
 * Each draws the thing its exercise actually does — a slur arriving
 * between two notes, a run climbing and coming back — and only moves on
 * hover, so a list of them sitting still is calm rather than busy. They
 * sit inside the same rounded tile the generic icons use, so a row with
 * one still reads as one of the family.
 *
 * Shared by the Exercises hub and the Library on purpose: the Library
 * builds its list from the same exercise catalog (see music-library.ts),
 * so Scale Studio and Long tones are literally the same row in both places
 * and would look like two different things if only one of them animated.
 */
import "./studio-row-art.css";

/** One group of De la sonorité: two notes and the slur that joins them. */
export function LongToneArt() {
  return (
    <svg className="hub-art hub-art--tones" viewBox="0 0 44 34" aria-hidden="true" focusable="false">
      <line className="hub-art__staff" x1="3" y1="24" x2="41" y2="24" />
      <path className="hub-art__slur" d="M12 12 Q22 4 32 9" fill="none" />
      <g className="hub-art__note">
        <rect x="14.4" y="9" width="1.5" height="15" />
        <ellipse cx="11.5" cy="24" rx="3.8" ry="2.9" />
      </g>
      <g className="hub-art__note hub-art__note--second">
        <rect x="34.4" y="6" width="1.5" height="15" />
        <ellipse cx="31.5" cy="21" rx="3.8" ry="2.9" />
      </g>
    </svg>
  );
}

/** A scale as an arch: up and back down, the way the landing card draws it. */
export function ScaleArt() {
  const notes = Array.from({ length: 7 }, (_, i) => {
    const degree = i <= 3 ? i : 6 - i;
    return { x: 7 + i * 5.2, y: 25 - degree * 3.4, i };
  });
  return (
    <svg className="hub-art hub-art--scales" viewBox="0 0 44 34" aria-hidden="true" focusable="false">
      <line className="hub-art__staff" x1="3" y1="27" x2="41" y2="27" />
      {notes.map(note => (
        <g className="hub-art__note" key={note.i} style={{ "--i": note.i } as React.CSSProperties}>
          <rect x={note.x + 2.2} y={note.y - 9} width="1.3" height="9" />
          <ellipse cx={note.x} cy={note.y} rx="2.9" ry="2.2" />
        </g>
      ))}
    </svg>
  );
}

/**
 * The mark for a catalog id, if it has one. Everything else falls back to
 * its focus/category icon, so this stays a short list of the few tools
 * that earn a drawing of their own rather than a per-row art pipeline.
 */
export function artForId(id: string) {
  if (id === "long-tones") return <LongToneArt />;
  if (id === "scale-studio") return <ScaleArt />;
  return null;
}
