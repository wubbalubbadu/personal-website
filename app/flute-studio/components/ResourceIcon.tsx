/**
 * The studio's tool and reference icons.
 *
 * These used to borrow the exercise-focus glyphs, which meant a fingering
 * chart wore the icon for "technique exercises" and a trill chart wore the
 * one for "articulation exercises" — categories they do not belong to. An
 * icon that means something else is worse than no icon, because it is read
 * as information.
 *
 * Each of these draws its own subject instead: the flute's keys, a trill
 * sign, an aperture, a route, a tuning needle, a metronome, a sustained
 * tone. Same 24px grid and stroke weight as StudioItemIcon so they sit in
 * the identical tile without looking like a different set.
 *
 * Shared by Resources and the home page's quick tools, which previously
 * drew the same seven things as text glyphs (⌁ ♩ ◉ ●○ ↟). One icon per
 * concept, everywhere — a fingering chart that looks like one thing on the
 * home page and another in Resources reads as two different features.
 */
export type ResourceIconName =
  | "fingerings"
  | "trills"
  | "embouchure"
  | "roadmap"
  | "tuner"
  | "metronome"
  | "drone"
  | "theory";

const paths: Record<ResourceIconName, React.ReactNode> = {
  theory: <><path d="M3 6h18M3 10h18M3 14h18M3 18h18" opacity=".45"/><ellipse cx="12" cy="14" rx="3" ry="2" fill="currentColor" stroke="none"/><path d="M15 14V4"/></>,
  // The instrument itself: a tube with keys, two of them pressed. This is
  // what a fingering chart is a picture of.
  fingerings: (
    <>
      <path d="M3 12h18" />
      <circle cx="7" cy="12" r="2.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="2.1" />
      <circle cx="17" cy="12" r="2.1" fill="currentColor" stroke="none" />
    </>
  ),
  // The trill sign exactly as it is written — the letters themselves, set
  // as text rather than traced in strokes, which is the only way "tr" stays
  // legible at 24px.
  trills: (
    <>
      <text
        x="2"
        y="14"
        fontSize="11"
        fontStyle="italic"
        fontWeight="700"
        fontFamily="Georgia, 'Times New Roman', serif"
        fill="currentColor"
        stroke="none"
      >
        tr
      </text>
      <path d="M13 12.5q1.3-2.2 2.6 0t2.6 0 2.6 0" />
    </>
  ),
  // A head in profile with the airstream leaving the lips — posture and
  // aperture, which is what the model is about.
  embouchure: (
    <>
      <path d="M8.5 4.5a5.5 5.5 0 0 1 4.2 9.1V20" />
      <path d="M8.5 4.5A5.5 5.5 0 0 0 5 14.2" />
      <path d="M13 11.5h2.5" />
      <path d="M17 9.5c1.8.6 3 1.2 4 2" />
    </>
  ),
  // A route with stops along it: where you are and what comes next.
  roadmap: (
    <>
      <path d="M4 19c3-1 3-6 6-7s5 2 8-1" />
      <circle cx="4" cy="19" r="1.9" fill="currentColor" stroke="none" />
      <circle cx="11" cy="12.5" r="1.7" />
      <circle cx="19" cy="10" r="1.9" />
    </>
  ),
  // A needle sitting at centre on a dial: in tune.
  tuner: (
    <>
      <path d="M3.5 16a9 9 0 0 1 17 0" />
      <path d="M12 16V7.5" />
      <circle cx="12" cy="17.5" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),
  // The instrument: a weighted case with its pendulum off to one side.
  metronome: (
    <>
      <path d="M9 3.5h6l3.5 17h-13z" />
      <path d="M5.5 15.5h13" />
      <path d="M15 6.5 10 15.5" />
    </>
  ),
  // One held pitch radiating outward — a drone is a note that does not stop.
  drone: (
    <>
      <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
      <path d="M7.4 8.2a6.4 6.4 0 0 0 0 7.6" />
      <path d="M16.6 8.2a6.4 6.4 0 0 1 0 7.6" />
      <path d="M4.3 5.4a10.4 10.4 0 0 0 0 13.2" />
      <path d="M19.7 5.4a10.4 10.4 0 0 1 0 13.2" />
    </>
  ),
};

export function ResourceIcon({ name, className }: { name: ResourceIconName; className: string }) {
  return (
    <span className={className} aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {paths[name]}
      </svg>
    </span>
  );
}
