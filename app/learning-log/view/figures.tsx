import type { ReactNode } from "react";
import type { FigureId } from "../content/types";

/** Static inline diagrams. Colours come from the .ll token set via CSS classes. */
export function Figure({ id }: { id: FigureId }): ReactNode {
  switch (id) {
    case "analog-vs-digital":
      return <AnalogVsDigital />;
    case "sample-hold":
      return <SampleHold />;
    case "stft-framing":
      return <StftFraming />;
    case "two-stage-pipeline":
      return <TwoStagePipeline />;
    case "rate-distortion-triangle":
      return <RateDistortionTriangle />;
    case "melody-arc":
      return <MelodyArc />;
    case "bright-dark-axis":
      return <BrightDarkAxis />;
    case "song-layers":
      return <SongLayers />;
  }
}

const wave = (w: number, mid: number, amp: number, cycles: number, n = 120) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const x = (i / n) * w;
    const y = mid - amp * Math.sin((i / n) * cycles * 2 * Math.PI);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

function AnalogVsDigital() {
  const w = 520;
  return (
    <svg viewBox={`0 0 ${w} 200`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A smooth analog wave above; the same wave as discrete samples below">
      <line x1="10" y1="55" x2={w - 10} y2="55" className="ll-fig-ink" strokeWidth="1" opacity="0.25" />
      <path d={wave(w - 20, 55, 30, 2.5)} transform="translate(10 0)" className="ll-fig-pine" fill="none" strokeWidth="2" />
      <text x="12" y="20" className="ll-fig-label">continuous x(t) — analog</text>

      <line x1="10" y1="150" x2={w - 10} y2="150" className="ll-fig-ink" strokeWidth="1" opacity="0.25" />
      <text x="12" y="115" className="ll-fig-label">x[n] — sampled &amp; quantized</text>
      {Array.from({ length: 22 }, (_, i) => {
        const x = 14 + (i / 21) * (w - 28);
        const raw = 150 - 30 * Math.sin((i / 21) * 2.5 * 2 * Math.PI);
        const q = 150 + Math.round((raw - 150) / 12) * 12;
        return (
          <g key={i}>
            <line x1={x} y1="150" x2={x} y2={q} className="ll-fig-ink" strokeWidth="1" opacity="0.4" />
            <circle cx={x} cy={q} r="3" className="ll-fig-amber" />
          </g>
        );
      })}
    </svg>
  );
}

function SampleHold() {
  const w = 520;
  return (
    <svg viewBox={`0 0 ${w} 180`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A sine wave with sample points and the gaps between them">
      <line x1="10" y1="90" x2={w - 10} y2="90" className="ll-fig-ink" strokeWidth="1" opacity="0.25" />
      <path d={wave(w - 20, 90, 55, 3)} transform="translate(10 0)" className="ll-fig-pine" fill="none" strokeWidth="2" />
      {Array.from({ length: 13 }, (_, i) => {
        const x = 14 + (i / 12) * (w - 28);
        const y = 90 - 55 * Math.sin(((x - 10) / (w - 20)) * 3 * 2 * Math.PI);
        return <circle key={i} cx={x} cy={y} r="4" className="ll-fig-amber" />;
      })}
      <text x="12" y="168" className="ll-fig-label">← 1/f&#8347; between samples · everything in the gap is discarded →</text>
    </svg>
  );
}

function StftFraming() {
  const w = 520;
  const frames = [0, 70, 140, 210, 280];
  return (
    <svg viewBox={`0 0 ${w} 190`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Overlapping analysis frames stepping along a waveform">
      <path d={wave(w - 20, 60, 26, 7)} transform="translate(10 0)" className="ll-fig-pine" fill="none" strokeWidth="1.5" opacity="0.9" />
      {frames.map((fx, i) => (
        <g key={i}>
          <rect x={12 + fx} y="24" width="150" height="72" rx="4" fill="none" className="ll-fig-ink" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.55" />
          <line x1={12 + fx} y1="120" x2={12 + fx + 150} y2="120" className="ll-fig-amber" strokeWidth="0" />
          <rect x={12 + fx} y="118" width="150" height="10" rx="2" className="ll-fig-amber" opacity={0.25 + i * 0.12} />
          <text x={12 + fx} y="150" className="ll-fig-label">frame[{i}]</text>
        </g>
      ))}
      <text x="12" y="180" className="ll-fig-label">hop N&#8341; → each frame becomes one spectrogram column via DFT</text>
    </svg>
  );
}

function TwoStagePipeline() {
  const w = 520;
  const box = (x: number, y: number, label: string, sub?: string) => (
    <g>
      <rect x={x} y={y} width="92" height="44" rx="7" fill="none" className="ll-fig-ink" strokeWidth="1.3" />
      <text x={x + 46} y={sub ? y + 20 : y + 27} textAnchor="middle" className="ll-fig-label" style={{ fontWeight: 600 }}>{label}</text>
      {sub ? <text x={x + 46} y={y + 33} textAnchor="middle" className="ll-fig-label">{sub}</text> : null}
    </g>
  );
  const arrow = (x: number, y: number) => (
    <path d={`M${x},${y} l16,0 m-5,-4 l5,4 l-5,4`} className="ll-fig-pine" fill="none" strokeWidth="1.5" />
  );
  return (
    <svg viewBox={`0 0 ${w} 220`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Two-stage latent generation pipeline">
      <text x="14" y="18" className="ll-fig-label" style={{ fill: "var(--amber)" }}>STAGE 1 — train the codec</text>
      {box(14, 30, "x")}
      {arrow(108, 52)}
      {box(126, 30, "encoder")}
      {arrow(220, 52)}
      {box(238, 30, "z", "latent")}
      {arrow(332, 52)}
      {box(350, 30, "decoder")}
      {arrow(444, 52)}
      {box(462, 30, "x̂")}

      <text x="14" y="112" className="ll-fig-label" style={{ fill: "var(--amber)" }}>STAGE 2 — sample</text>
      {box(14, 124, "generator", "AR / diff")}
      {arrow(108, 146)}
      {box(126, 124, "z̃")}
      {arrow(220, 146)}
      {box(238, 124, "decoder")}
      {arrow(332, 146)}
      {box(350, 124, "output")}
      <text x="14" y="200" className="ll-fig-label">encoder frozen in stage 2a · generator + decoder frozen in stage 2b</text>
    </svg>
  );
}

function MelodyArc() {
  const w = 520;
  const stage = (x: number, label: string, sub: string, fill: string) => (
    <g>
      <rect x={x} y={40} width="140" height="52" rx="9" fill={fill} opacity="0.16" stroke={fill} strokeWidth="1.2" />
      <text x={x + 70} y={64} textAnchor="middle" className="ll-fig-label" style={{ fontWeight: 600, fill }}>{label}</text>
      <text x={x + 70} y={80} textAnchor="middle" className="ll-fig-label">{sub}</text>
    </g>
  );
  return (
    <svg viewBox={`0 0 ${w} 150`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Expose, develop, resolve">
      {stage(20, "Expose", "state a motive", "var(--pine)")}
      {stage(190, "Develop", "make variations", "var(--amber)")}
      {stage(360, "Resolve", "liquidation", "var(--warn)")}
      <path d="M162,66 l26,0 m-6,-4 l6,4 l-6,4" className="ll-fig-ink" fill="none" strokeWidth="1.4" />
      <path d="M332,66 l26,0 m-6,-4 l6,4 l-6,4" className="ll-fig-ink" fill="none" strokeWidth="1.4" />
      <path d="M40,120 q120,-30 220,0 t220,0" className="ll-fig-pine" fill="none" strokeWidth="1.5" opacity="0.6" />
      <text x={w / 2} y={140} textAnchor="middle" className="ll-fig-label">one melodic line</text>
    </svg>
  );
}

function BrightDarkAxis() {
  const w = 520;
  return (
    <svg viewBox={`0 0 ${w} 120`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A bright to dark axis with classical major and minor as points and modern pop spanning the middle">
      <line x1="40" y1="46" x2={w - 40} y2="46" className="ll-fig-ink" strokeWidth="1.4" />
      <text x="24" y="50" className="ll-fig-label" style={{ fontWeight: 600 }}>bright</text>
      <text x={w - 20} y="50" textAnchor="end" className="ll-fig-label" style={{ fontWeight: 600 }}>dark</text>
      <circle cx="110" cy="46" r="5" className="ll-fig-amber" />
      <text x="110" y="34" textAnchor="middle" className="ll-fig-label">classical major</text>
      <circle cx={w - 110} cy="46" r="5" fill="var(--pine)" />
      <text x={w - 110} y="34" textAnchor="middle" className="ll-fig-label">classical minor</text>
      <rect x="150" y="70" width={w - 300} height="16" rx="8" fill="var(--pine-wash)" stroke="var(--rule)" />
      <text x={w / 2} y="104" textAnchor="middle" className="ll-fig-label">modern pop spreads across the middle</text>
    </svg>
  );
}

function SongLayers() {
  const w = 520;
  const row = (y: number, label: string, accent = false) => (
    <g>
      <rect x="20" y={y} width={w - 40} height="30" rx="7" fill={accent ? "var(--pine)" : "var(--card)"} opacity={accent ? 0.16 : 1} stroke={accent ? "var(--pine)" : "var(--rule)"} strokeWidth="1.1" />
      <text x="34" y={y + 19} className="ll-fig-label" style={{ fontWeight: accent ? 600 : 400 }}>{label}</text>
    </g>
  );
  return (
    <svg viewBox={`0 0 ${w} 176`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Melody on top, then upper part, bass, and drums as accompaniment">
      {row(12, "melody", true)}
      {row(50, "upper part")}
      {row(88, "bass")}
      {row(126, "drums")}
      <text x={w - 20} y={104} textAnchor="end" className="ll-fig-label" transform={`rotate(90 ${w - 20} 104)`}>accompaniment</text>
    </svg>
  );
}

function RateDistortionTriangle() {
  return (
    <svg viewBox="0 0 520 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Rate, distortion and modelability at the corners of a triangle">
      <polygon points="260,30 60,200 460,200" fill="none" className="ll-fig-ink" strokeWidth="1.4" />
      <circle cx="260" cy="30" r="4" className="ll-fig-amber" />
      <circle cx="60" cy="200" r="4" className="ll-fig-amber" />
      <circle cx="460" cy="200" r="4" className="ll-fig-amber" />
      <text x="260" y="20" textAnchor="middle" className="ll-fig-label" style={{ fontWeight: 600 }}>RATE</text>
      <text x="52" y="220" textAnchor="middle" className="ll-fig-label" style={{ fontWeight: 600 }}>DISTORTION</text>
      <text x="468" y="220" textAnchor="middle" className="ll-fig-label" style={{ fontWeight: 600 }}>MODELABILITY</text>
      <text x="260" y="130" textAnchor="middle" className="ll-fig-label">pick any point —</text>
      <text x="260" y="146" textAnchor="middle" className="ll-fig-label">you cannot win all three</text>
    </svg>
  );
}
