export type ResourceStatus = "live" | "beta";
export type ResourceTone = "sage" | "pink" | "slate" | "sand";

export type StudioResource = {
  id: string;
  name: string;
  blurb: string;
  href: string;
  icon: string;
  tone: ResourceTone;
  status: ResourceStatus;
  /** Also surface in the top header, not only the landing directory. */
  nav?: boolean;
};

/* ─────────────────────────────────────────────────────────────────────────────
   Every BUILT resource, in the order users should see it.

   The landing directory and the header both render from this list, so reordering
   here is reordering the site. Nothing speculative goes in — a resource earns a
   row when it ships. `status: "beta"` marks a shipped-but-rough one.
   ───────────────────────────────────────────────────────────────────────────── */
export const resources: StudioResource[] = [
  {
    id: "music",
    name: "Music Library",
    blurb: "Scores to read, annotate, and play along with.",
    href: "/flute-studio/music",
    icon: "♫",
    tone: "sage",
    status: "live",
    nav: true,
  },
  {
    id: "exercises",
    name: "Exercises",
    blurb: "Scales, long tones, and studies with the tools built in.",
    href: "/flute-studio/exercises",
    icon: "◎",
    tone: "pink",
    status: "live",
    nav: true,
  },
  {
    id: "roadmap",
    name: "Technique Roadmap",
    blurb: "A map of what to learn on the flute, and roughly when.",
    href: "/flute-studio/roadmap",
    icon: "↗",
    tone: "slate",
    status: "live",
  },
  {
    id: "simulation",
    name: "Simulation",
    blurb: "A cutaway model of the embouchure, air, and tongue across the range.",
    href: "/flute-studio/embouchure",
    icon: "◍",
    tone: "sand",
    status: "beta",
  },
];

export const navResources = () => resources.filter((resource) => resource.nav);
