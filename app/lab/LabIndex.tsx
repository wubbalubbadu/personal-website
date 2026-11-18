"use client";

import "./_kit/kit.css";
import "./lab-index.css";

const DIRECTIONS = [
  { href: "/lab/home-1", name: "Cat host, wide handheld", line: "The cat lives on a PSP style handheld beside the intro and links." },
  { href: "/lab/handheld-3d", name: "3D handheld study", line: "The handheld as a real 3D object: rocking D-pad, domed buttons that sink and click, the cat live on its screen." },
  { href: "/lab/landing-texture", name: "Cat host, craft passes", line: "Three looks on the live handheld: retouched plastic, resting on a desk, and powering on by tuning to A." },
];

const TOYS = [
  { href: "/lab/ny-trip", name: "NY trip, Nov 28 to 29", line: "Boston to Manhattan for two days: a little 3D map, the plan for each day, and a list of places to eat in SoHo." },
];

export default function LabIndex() {
  return (
    <main className="lab lab-index">
      <p className="lab-index__eyebrow">Landing lab</p>
      <h1>Home page experiments</h1>
      <p className="lab-index__note">Prototypes only. The live home page is unchanged.</p>
      <ol>
        {DIRECTIONS.map((d) => (
          <li key={d.href}>
            <a href={d.href}>
              <b>{d.name} ›</b>
              <span>{d.line}</span>
            </a>
          </li>
        ))}
      </ol>
      <p className="lab-index__eyebrow lab-index__eyebrow--gap">Just for fun</p>
      <ol>
        {TOYS.map((d) => (
          <li key={d.href}>
            <a href={d.href}>
              <b>{d.name} ›</b>
              <span>{d.line}</span>
            </a>
          </li>
        ))}
      </ol>
    </main>
  );
}
