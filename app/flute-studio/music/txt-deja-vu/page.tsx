"use client";

import { ScoreViewer, type ScoreViewerConfig } from "../../components/ScoreViewer";

// No pitches/events/measureStarts here — ScoreViewer derives them straight
// from the loaded score (see deriveScoreEvents.ts). First real test of that.
const dejaVuConfig: ScoreViewerConfig = {
  title: "Deja Vu",
  composer: "TOMORROW X TOGETHER",
  asset: "/music/txt-deja-vu/score.mxl",
  pdfPath: "/music/txt-deja-vu/score.pdf",
  id: "txt-deja-vu",
  backHref: "/flute-studio/music",
};

export default function DejaVuPage() { return <ScoreViewer config={dejaVuConfig} />; }
