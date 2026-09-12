"use client";

import { ScoreViewer, type ScoreViewerConfig } from "../../components/ScoreViewer";
import metadata from "../../../../content/gold-dust/metadata.json";

// No pitches/events/measureStarts here — ScoreViewer derives them straight
// from the loaded score (see deriveScoreEvents.ts). defaultTempo comes from
// metadata.json so it stays a one-place edit rather than a second hardcoded
// copy here that could quietly drift out of sync with it.
const goldDustConfig: ScoreViewerConfig = {
  title: "Gold Dust",
  composer: "NCT 127",
  asset: "/music/gold-dust/score.mxl",
  pdfPath: "/music/gold-dust/score.pdf",
  defaultTempo: metadata.defaultTempo,
  id: "gold-dust",
  backHref: "/flute-studio/music",
};

export default function GoldDustPage() { return <ScoreViewer config={goldDustConfig} />; }
