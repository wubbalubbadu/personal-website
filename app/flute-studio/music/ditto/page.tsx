"use client";

import { ScoreViewer, type ScoreViewerConfig } from "../../components/ScoreViewer";
import metadata from "../../../../content/ditto/metadata.json";

// No pitches/events/measureStarts here — ScoreViewer derives them straight
// from the loaded score (see deriveScoreEvents.ts). defaultTempo comes from
// metadata.json so it stays a one-place edit rather than a second hardcoded
// copy here that could quietly drift out of sync with it.
const dittoConfig: ScoreViewerConfig = {
  title: "Ditto",
  composer: "NewJeans",
  asset: "/music/ditto/score.mxl",
  pdfPath: "/music/ditto/score.pdf",
  defaultTempo: metadata.defaultTempo,
  id: "ditto",
  backHref: "/flute-studio/music",
};

export default function DittoPage() { return <ScoreViewer config={dittoConfig} />; }
