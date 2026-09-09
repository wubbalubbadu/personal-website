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
    case "vqvae-quantize":
      return <VqvaeQuantize />;
    case "jukebox-cascade-flow":
      return <JukeboxCascadeFlow />;
    case "ldm-architecture":
      return <LdmArchitecture />;
    case "diffusion-chain":
      return <DiffusionChain />;
    case "perceptual-vs-semantic":
      return <PerceptualVsSemantic />;
    case "timing-conditioning":
      return <TimingConditioning />;
    case "codec-vs-ldm":
      return <CodecVsLdm />;
    case "straight-through-estimator":
      return <StraightThroughEstimator />;
    case "vqvae2-hierarchy":
      return <Vqvae2Hierarchy />;
    case "rvq-residual":
      return <RvqResidual />;
    case "codebook-interleaving":
      return <CodebookInterleaving />;
    case "musicgen-arch":
      return <MusicgenArch />;
    case "gen-music-timeline":
      return <GenMusicTimeline />;
    case "musiclm-stages":
      return <MusiclmStages />;
    case "stable-audio-arch":
      return <StableAudioArch />;
    case "next-token-dist":
      return <NextTokenDist />;
    case "bengio-arch":
      return <BengioArch />;
    case "rnn-unrolled":
      return <RnnUnrolled />;
    case "pos-enc-clock":
      return <PosEncClock />;
    case "skewing":
      return <Skewing />;
    case "voice-serialization":
      return <VoiceSerialization />;
    case "anticipation-interleave":
      return <AnticipationInterleave />;
    case "remi-vs-midi":
      return <RemiVsMidi />;
    case "modality-spectrum":
      return <ModalitySpectrum />;
    case "vertical-flatten":
      return <VerticalFlatten />;
    case "unified-arch":
      return <UnifiedArch />;
    case "v2m-two-branch":
      return <V2mTwoBranch />;
    case "v2m-three-levels":
      return <V2mThreeLevels />;
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

/** Encoder → vector quantization against a codebook → decoder. One level. */
function VqvaeQuantize() {
  const w = 520;
  const box = (x: number, label: string) => (
    <g>
      <rect x={x} y={72} width="66" height="32" rx="7" fill="none" className="ll-fig-ink" strokeWidth="1.3" />
      <text x={x + 33} y={92} textAnchor="middle" className="ll-fig-label" style={{ fontWeight: 600 }}>{label}</text>
    </g>
  );
  const arrow = (x: number) => (
    <path d={`M${x},88 l14,0 m-5,-4 l5,4 l-5,4`} className="ll-fig-pine" fill="none" strokeWidth="1.5" />
  );
  const bars = (x: number, seed: number, quant: boolean) =>
    Array.from({ length: 8 }, (_, i) => {
      const h = quant ? 8 + ((i * 7 + seed) % 4) * 6 : 6 + ((i * 13 + seed) % 24);
      return <rect key={i} x={x + i * 7} y={88 - h / 2} width="5" height={h} rx="1" fill={i % 2 ? "var(--pine)" : "var(--amber)"} />;
    });
  return (
    <svg viewBox={`0 0 ${w} 150`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A waveform encoded to a latent, quantized against a codebook, then decoded">
      {/* codebook */}
      <text x="242" y="18" textAnchor="middle" className="ll-fig-label">codebook e&#8342; (K = 2048)</text>
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x={210 + i * 12} y={24} width="10" height="10" rx="2" fill={i % 3 ? "var(--pine)" : "var(--amber)"} opacity="0.85" />
      ))}
      <path d="M248,38 l0,26 m-4,-6 l4,6 l4,-6" className="ll-fig-ink" fill="none" strokeWidth="1.2" opacity="0.6" />

      <path d={wave(70, 88, 16, 3)} transform="translate(6 0)" className="ll-fig-pine" fill="none" strokeWidth="1.6" />
      {arrow(84)}
      {box(102, "E")}
      {arrow(170)}
      {bars(188, 3, false)}
      <text x="212" y="122" textAnchor="middle" className="ll-fig-label">h</text>
      {arrow(248)}
      {bars(266, 3, true)}
      <text x="290" y="122" textAnchor="middle" className="ll-fig-label">e_z</text>
      {arrow(326)}
      {box(344, "D")}
      {arrow(412)}
      <path d={wave(70, 88, 15, 3)} transform="translate(430 0)" className="ll-fig-pine" fill="none" strokeWidth="1.6" opacity="0.85" />
      <text x="464" y="120" textAnchor="middle" className="ll-fig-label">x̂</text>
    </svg>
  );
}

/** Jukebox Stage-2: top prior, two upsamplers, only the bottom codes decoded. */
function JukeboxCascadeFlow() {
  const w = 520;
  const stage = (y: number, label: string) => (
    <g>
      <rect x={150} y={y} width={220} height={30} rx="7" fill="var(--pine-wash)" stroke="var(--pine)" strokeWidth="1.2" />
      <text x={260} y={y + 19} textAnchor="middle" className="ll-fig-label" style={{ fontWeight: 600 }}>{label}</text>
    </g>
  );
  const down = (y: number, tag: string, faded = false) => (
    <g opacity={faded ? 0.5 : 1}>
      <path d={`M260,${y} l0,20 m-4,-6 l4,6 l4,-6`} className="ll-fig-ink" fill="none" strokeWidth="1.3" />
      <text x={274} y={y + 14} className="ll-fig-label">{tag}</text>
    </g>
  );
  return (
    <svg viewBox={`0 0 ${w} 250`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Top prior feeds a middle upsampler, then a bottom upsampler, then the decoder">
      {stage(14, "Top prior  P_T(z_T)")}
      {down(44, "z_T  ·  345 Hz  ·  discarded", true)}
      {stage(78, "Middle upsampler  P_M(z_M | z_T)")}
      {down(108, "z_M  ·  1378 Hz  ·  discarded", true)}
      {stage(142, "Bottom upsampler  P_B(z_B | z_M, z_T)")}
      {down(172, "z_B  ·  5512 Hz  ·  kept")}
      {stage(206, "VQ-VAE decoder  →  audio")}
    </svg>
  );
}

/** Latent diffusion: pixel space in/out, all diffusion in the latent, conditions via cross-attention. */
function LdmArchitecture() {
  const w = 520;
  return (
    <svg viewBox={`0 0 ${w} 232`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Encoder and decoder in pixel space, a denoising U-Net loop in latent space, a conditioning encoder feeding cross-attention">
      {/* pixel space */}
      <rect x={12} y={20} width={90} height={192} rx="9" fill="none" className="ll-fig-ink" strokeWidth="1.2" opacity="0.55" />
      <text x={57} y={38} textAnchor="middle" className="ll-fig-label" style={{ fontWeight: 600 }}>pixel space</text>
      <rect x={30} y={54} width={54} height="26" rx="6" fill="none" className="ll-fig-pine" strokeWidth="1.3" />
      <text x={57} y={71} textAnchor="middle" className="ll-fig-label">x → E</text>
      <rect x={30} y={150} width={54} height="26" rx="6" fill="none" className="ll-fig-pine" strokeWidth="1.3" />
      <text x={57} y={167} textAnchor="middle" className="ll-fig-label">D → x̃</text>

      {/* latent space */}
      <rect x={120} y={20} width={250} height={192} rx="9" fill="var(--pine-wash)" stroke="var(--pine)" strokeWidth="1.2" />
      <text x={245} y={38} textAnchor="middle" className="ll-fig-label" style={{ fontWeight: 600 }}>latent space — diffusion</text>
      <rect x={150} y={70} width={190} height={100} rx="8" fill="none" className="ll-fig-ink" strokeWidth="1.3" />
      <text x={245} y={108} textAnchor="middle" className="ll-fig-label" style={{ fontWeight: 600 }}>denoising U-Net ε&#952;</text>
      <text x={245} y={126} textAnchor="middle" className="ll-fig-label">z&#8348; → z&#8348;&#8331;&#8321;</text>
      <ellipse cx={245} cy={148} rx={30} ry={15} fill="none" stroke="var(--amber)" strokeWidth="1.4" strokeDasharray="4 3" />
      <path d="M275,148 l-7,-4 l0,8 z" fill="var(--amber)" />
      <text x={245} y={190} textAnchor="middle" className="ll-fig-label">× (T − 1) steps</text>
      <line x1={102} y1={67} x2={150} y2={90} className="ll-fig-ink" strokeWidth="1.1" opacity="0.5" />
      <line x1={150} y1={150} x2={102} y2={163} className="ll-fig-ink" strokeWidth="1.1" opacity="0.5" />

      {/* conditioning */}
      <rect x={388} y={20} width={120} height={192} rx="9" fill="none" className="ll-fig-ink" strokeWidth="1.2" opacity="0.55" />
      <text x={448} y={38} textAnchor="middle" className="ll-fig-label" style={{ fontWeight: 600 }}>conditioning</text>
      {["text", "layout", "image"].map((t, i) => (
        <g key={t}>
          <rect x={404} y={54 + i * 30} width={88} height="22" rx="5" fill="none" className="ll-fig-ink" strokeWidth="1.1" />
          <text x={448} y={69 + i * 30} textAnchor="middle" className="ll-fig-label">{t}</text>
        </g>
      ))}
      <rect x={410} y={150} width={76} height="26" rx="6" fill="none" stroke="var(--amber)" strokeWidth="1.4" />
      <text x={448} y={167} textAnchor="middle" className="ll-fig-label" style={{ fontWeight: 600 }}>&#964;&#952;</text>
      <path d="M408,158 l-66,-34 m9,0 l-9,0 l4,7" stroke="var(--amber)" fill="none" strokeWidth="1.3" />
      <text x={330} y={208} textAnchor="middle" className="ll-fig-label">cross-attention: Q from U-Net, K/V from &#964;&#952;(y)</text>
    </svg>
  );
}

/** Forward noising left to right, reverse denoising right to left. */
function DiffusionChain() {
  const w = 520;
  const n = 6;
  const step = (w - 60) / (n - 1);
  return (
    <svg viewBox={`0 0 ${w} 150`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A clean image degraded to noise step by step, and the reverse denoising path">
      {Array.from({ length: n }, (_, i) => {
        const x = 30 + i * step;
        const noise = i / (n - 1);
        const sub = i === n - 1 ? "ₜ" : ["₀", "₁", "₂", "₃", "₄", "₅"][i];
        return (
          <g key={i}>
            <rect x={x - 16} y={54} width={32} height={32} rx="4" fill="var(--pine)" opacity={0.22 * (1 - noise) + 0.04} stroke="var(--pine)" strokeWidth="1.1" />
            {Array.from({ length: Math.round(noise * 10) }, (_, k) => (
              <circle key={k} cx={x - 12 + ((k * 7) % 24)} cy={58 + ((k * 11) % 24)} r="1.4" className="ll-fig-amber" />
            ))}
            <text x={x} y={104} textAnchor="middle" className="ll-fig-label">x{sub}</text>
          </g>
        );
      })}
      <path d={`M46,40 L${30 + (n - 1) * step - 14},40 m-6,-4 l6,4 l-6,4`} className="ll-fig-ink" fill="none" strokeWidth="1.3" />
      <text x={w / 2} y={30} textAnchor="middle" className="ll-fig-label">forward q — add noise →</text>
      <path d={`M${30 + (n - 1) * step - 14},120 L46,120 m6,-4 l-6,4 l6,4`} stroke="var(--amber)" fill="none" strokeWidth="1.3" />
      <text x={w / 2} y={140} textAnchor="middle" className="ll-fig-label">← reverse p&#952; — predict &amp; remove noise</text>
    </svg>
  );
}

/** Distortion vs rate: steep semantic region on the left, flat perceptual tail on the right. */
function PerceptualVsSemantic() {
  const w = 520;
  const h = 200;
  const pad = 34;
  const px = (v: number) => pad + v * (w - 2 * pad);
  const py = (v: number) => h - pad - v * (h - 2 * pad);
  // distortion as a function of rate cut: near-vertical then long flat tail
  const dist = (r: number) => Math.min(1, 0.06 / (r + 0.06));
  let d = "";
  for (let i = 0; i <= 64; i++) {
    const r = i / 64;
    d += `${i === 0 ? "M" : "L"}${px(r).toFixed(1)},${py(dist(r)).toFixed(1)} `;
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A distortion versus rate curve, steep on the left, flat on the right">
      <rect x={px(0.28)} y={pad} width={px(1) - px(0.28)} height={h - 2 * pad} fill="var(--pine-wash)" />
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} className="ll-fig-ink" strokeWidth="1" opacity="0.3" />
      <line x1={pad} y1={pad} x2={pad} y2={h - pad} className="ll-fig-ink" strokeWidth="1" opacity="0.3" />
      <path d={d} className="ll-fig-pine" fill="none" strokeWidth="2" />
      <line x1={px(0.28)} y1={pad} x2={px(0.28)} y2={h - pad} stroke="var(--amber)" strokeWidth="1.4" strokeDasharray="4 3" />
      <text x={px(0.14)} y={pad + 14} textAnchor="middle" className="ll-fig-label" style={{ fontWeight: 600 }}>semantic</text>
      <text x={px(0.14)} y={pad + 28} textAnchor="middle" className="ll-fig-label">(steep)</text>
      <text x={px(0.62)} y={pad + 14} textAnchor="middle" className="ll-fig-label" style={{ fontWeight: 600 }}>perceptual compression</text>
      <text x={px(0.62)} y={pad + 28} textAnchor="middle" className="ll-fig-label">(flat — cheap bits, little distortion)</text>
      <text x={px(0.28)} y={h - pad + 16} textAnchor="middle" className="ll-fig-label">autoencoder cut</text>
      <text x={pad - 8} y={pad - 8} className="ll-fig-label">distortion (RMSE)</text>
      <text x={w - pad} y={h - pad + 16} textAnchor="end" className="ll-fig-label">rate cut →</text>
    </svg>
  );
}

/** Stable Audio timing embeddings — audio longer than / shorter than the window. */
function TimingConditioning() {
  const w = 520;
  const panel = (ox: number, padded: boolean) => {
    const winL = ox + 14;
    const winR = ox + 228;
    const fileR = padded ? ox + 176 : winR;
    return (
      <g>
        {/* training window bracket */}
        <path d={`M${winL},30 l0,-8 l${winR - winL},0 l0,8`} className="ll-fig-ink" fill="none" strokeWidth="1.2" />
        <text x={(winL + winR) / 2} y={16} textAnchor="middle" className="ll-fig-label">training window (95 s)</text>
        {/* full audio file */}
        <rect x={winL} y={38} width={fileR - winL} height={30} rx="3" fill="var(--amber)" opacity="0.28" stroke="var(--amber)" strokeWidth="1.1" />
        <text x={(winL + fileR) / 2} y={57} textAnchor="middle" className="ll-fig-label">full audio file</text>
        {padded ? (
          <>
            <rect x={fileR} y={38} width={winR - fileR} height={30} rx="3" fill="none" stroke="var(--ink)" strokeWidth="1" strokeDasharray="3 2" opacity="0.5" />
            <text x={(fileR + winR) / 2} y={57} textAnchor="middle" className="ll-fig-label" style={{ fontSize: 9 }}>silence</text>
          </>
        ) : null}
        {/* ticks */}
        <line x1={winL} y1={68} x2={winL} y2={84} className="ll-fig-ink" strokeWidth="1" />
        <text x={winL} y={96} textAnchor="start" className="ll-fig-label" style={{ fontSize: 9 }}>seconds_start</text>
        <line x1={fileR} y1={68} x2={fileR} y2={84} className="ll-fig-ink" strokeWidth="1" />
        <text x={fileR} y={96} textAnchor="end" className="ll-fig-label" style={{ fontSize: 9 }}>seconds_total</text>
      </g>
    );
  };
  return (
    <svg viewBox={`0 0 ${w} 112`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Left: audio longer than the training window is cropped. Right: shorter audio is padded with silence.">
      {panel(8, false)}
      {panel(272, true)}
    </svg>
  );
}

/** LDM continuous autoencoder vs codec-LM discrete autoencoder. */
function CodecVsLdm() {
  const w = 520;
  const box = (x: number, y: number, label: string, wide = 34) => (
    <g>
      <rect x={x} y={y} width={wide} height="26" rx="6" fill="none" className="ll-fig-ink" strokeWidth="1.2" />
      <text x={x + wide / 2} y={y + 17} textAnchor="middle" className="ll-fig-label" style={{ fontWeight: 600 }}>{label}</text>
    </g>
  );
  const arr = (x: number, y: number, len = 16) => (
    <path d={`M${x},${y} l${len},0 m-5,-4 l5,4 l-5,4`} className="ll-fig-pine" fill="none" strokeWidth="1.4" />
  );
  const tag = (x: number, y: number, t: string) => (
    <text x={x} y={y} textAnchor="middle" className="ll-fig-label" style={{ fontSize: 9 }}>{t}</text>
  );
  return (
    <svg viewBox={`0 0 ${w} 176`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="LDM autoencoder has a continuous latent; the codec-LM autoencoder adds a quantize step against a codebook">
      {/* LDM row */}
      <text x={10} y={20} className="ll-fig-label" style={{ fontWeight: 600, fill: "var(--amber)" }}>LATENT DIFFUSION — continuous latent</text>
      <path d={wave(30, 42, 12, 3)} transform="translate(10 0)" className="ll-fig-pine" fill="none" strokeWidth="1.5" />
      {arr(44, 42)} {box(62, 29, "E")}
      {arr(98, 42)} {tag(132, 38, "latent z")} <rect x={110} y={34} width={44} height={16} rx="2" fill="var(--pine)" opacity="0.22" />
      {arr(156, 42)} {box(174, 29, "D")}
      {arr(210, 42)}
      <path d={wave(30, 42, 12, 3)} transform="translate(226 0)" className="ll-fig-pine" fill="none" strokeWidth="1.5" opacity="0.8" />

      {/* Codec row */}
      <text x={10} y={98} className="ll-fig-label" style={{ fontWeight: 600, fill: "var(--amber)" }}>CODEC LM — discrete tokens</text>
      <path d={wave(30, 122, 12, 3)} transform="translate(10 0)" className="ll-fig-pine" fill="none" strokeWidth="1.5" />
      {arr(44, 122)} {box(62, 109, "E")}
      {arr(98, 122)} {box(116, 109, "Q")}
      {arr(150, 122)}
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={168 + i * 11} y={114} width="8" height="16" rx="2" fill={i % 2 ? "var(--pine)" : "var(--amber)"} />
      ))}
      {tag(196, 146, "tokens  v ∈ Vₙ")}
      {arr(228, 122, 14)} {box(244, 109, "Q⁻¹", 26)}
      {arr(272, 122, 12)} {box(286, 109, "D")}
      <text x={330} y={126} className="ll-fig-label" style={{ fontSize: 10 }}>Vₙ = {"{"}0, 1, …, 2ᴺ − 1{"}"}</text>
    </svg>
  );
}

/** Straight-through estimator: forward quantize, backward copies the gradient past it. */
function StraightThroughEstimator() {
  const w = 520;
  const box = (x: number, label: string) => (
    <g>
      <rect x={x} y={54} width={70} height={30} rx="7" fill="none" className="ll-fig-ink" strokeWidth="1.3" />
      <text x={x + 35} y={73} textAnchor="middle" className="ll-fig-label" style={{ fontWeight: 600 }}>{label}</text>
    </g>
  );
  return (
    <svg viewBox={`0 0 ${w} 158`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Forward path quantizes the encoder output; the backward path copies the decoder gradient straight onto the encoder output, skipping the quantizer">
      {box(24, "zₑ")}
      <path d="M96,69 l40,0 m-6,-4 l6,4 l-6,4" className="ll-fig-pine" fill="none" strokeWidth="1.5" />
      {box(140, "quantize")}
      <path d="M212,69 l40,0 m-6,-4 l6,4 l-6,4" className="ll-fig-pine" fill="none" strokeWidth="1.5" />
      {box(256, "z_q")}
      <path d="M328,69 l40,0 m-6,-4 l6,4 l-6,4" className="ll-fig-pine" fill="none" strokeWidth="1.5" />
      {box(372, "decoder")}
      <text x={300} y={40} textAnchor="middle" className="ll-fig-label" style={{ fill: "var(--pine)" }}>forward →</text>

      {/* backward: from z_q area, arc back over the quantizer to z_e */}
      <path d="M291,92 C 250,124 100,124 59,92" stroke="var(--amber)" fill="none" strokeWidth="1.6" strokeDasharray="5 3" />
      <path d="M59,92 l7,3 l-1,-8 z" fill="var(--amber)" />
      <text x={175} y={148} textAnchor="middle" className="ll-fig-label" style={{ fill: "var(--amber)" }}>← backward: copy the gradient at z_q onto zₑ</text>
    </svg>
  );
}

/** VQ-VAE-2: bottom + top encoders, two codebooks, top-down decode. */
function Vqvae2Hierarchy() {
  const w = 520;
  const box = (x: number, y: number, label: string, ww = 58) => (
    <g>
      <rect x={x} y={y} width={ww} height={26} rx="6" fill="none" className="ll-fig-ink" strokeWidth="1.2" />
      <text x={x + ww / 2} y={y + 17} textAnchor="middle" className="ll-fig-label" style={{ fontWeight: 600 }}>{label}</text>
    </g>
  );
  const arr = (d: string) => <path d={d} className="ll-fig-pine" fill="none" strokeWidth="1.4" />;
  return (
    <svg viewBox={`0 0 ${w} 200`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Image into a bottom encoder, then a top encoder; separate codebooks quantize each level; the decoder runs top-down">
      <text x={10} y={16} className="ll-fig-label" style={{ fontWeight: 600, fill: "var(--amber)" }}>ENCODE  (bottom-up)</text>
      {box(14, 28, "x", 30)}
      {arr("M46,41 l20,0 m-5,-4 l5,4 l-5,4")}
      {box(70, 28, "E_bottom")}
      {arr("M130,41 l20,0 m-5,-4 l5,4 l-5,4")}
      <text x={168} y={44} className="ll-fig-label" style={{ fontSize: 9 }}>h_b</text>
      {arr("M188,41 l20,0 m-5,-4 l5,4 l-5,4")}
      {box(212, 28, "E_top")}
      {arr("M272,41 l18,0 m-5,-4 l5,4 l-5,4")}
      <text x={310} y={44} className="ll-fig-label" style={{ fontSize: 9 }}>h_top</text>

      {/* codebooks */}
      {box(212, 78, "Q_top → z_top", 96)}
      {box(70, 78, "Q_bottom → z_bottom", 120)}
      <path d="M240,54 l0,22 m-4,-6 l4,6 l4,-6" className="ll-fig-pine" fill="none" strokeWidth="1.3" />
      <path d="M120,54 l0,22 m-4,-6 l4,6 l4,-6" className="ll-fig-pine" fill="none" strokeWidth="1.3" />

      <text x={10} y={128} className="ll-fig-label" style={{ fontWeight: 600, fill: "var(--amber)" }}>DECODE  (top-down)</text>
      {box(212, 138, "D_top(z_top)", 96)}
      <path d="M212,151 C 150,151 150,151 130,151" stroke="var(--amber)" fill="none" strokeWidth="1.5" />
      <path d="M130,151 l7,3 l-1,-8 z" fill="var(--amber)" />
      {box(60, 138, "D_bottom(z_bottom, ·)", 128)}
      {arr("M60,151 l-18,0 m5,-4 l-5,4 l5,4")}
      {box(8, 138, "x̂", 28)}
    </svg>
  );
}

/** Residual vector quantization: each codebook quantizes what the last one left. */
function RvqResidual() {
  const w = 520;
  const q = (x: number, label: string) => (
    <g>
      <rect x={x} y={40} width={54} height={26} rx="6" fill="none" className="ll-fig-ink" strokeWidth="1.2" />
      <text x={x + 27} y={57} textAnchor="middle" className="ll-fig-label" style={{ fontWeight: 600 }}>{label}</text>
    </g>
  );
  const code = (x: number, label: string) => (
    <g>
      <rect x={x} y={104} width={40} height={20} rx="4" fill="var(--pine)" opacity="0.22" stroke="var(--pine)" strokeWidth="1" />
      <text x={x + 20} y={118} textAnchor="middle" className="ll-fig-label" style={{ fontSize: 10 }}>{label}</text>
    </g>
  );
  return (
    <svg viewBox={`0 0 ${w} 160`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="z goes to codebook 1; the residual goes to codebook 2; its residual to codebook 3; the code embeddings sum back to approximate z">
      <text x={12} y={54} className="ll-fig-label" style={{ fontSize: 11 }}>z →</text>
      {q(34, "Q₁")} {q(184, "Q₂")} {q(334, "Q₃")}
      {/* residual arrows */}
      <path d="M88,53 l96,0 m-6,-4 l6,4 l-6,4" className="ll-fig-pine" fill="none" strokeWidth="1.4" />
      <text x={136} y={44} textAnchor="middle" className="ll-fig-label" style={{ fontSize: 9 }}>r₁ = z − emb(c₁)</text>
      <path d="M238,53 l96,0 m-6,-4 l6,4 l-6,4" className="ll-fig-pine" fill="none" strokeWidth="1.4" />
      <text x={286} y={44} textAnchor="middle" className="ll-fig-label" style={{ fontSize: 9 }}>r₂</text>
      <path d="M388,53 l40,0 m-6,-4 l6,4 l-6,4" className="ll-fig-pine" fill="none" strokeWidth="1.4" />
      <text x={444} y={57} className="ll-fig-label" style={{ fontSize: 9 }}>r₃ …</text>
      {/* codes out */}
      <path d="M61,66 l0,36 m-4,-6 l4,6 l4,-6" stroke="var(--amber)" fill="none" strokeWidth="1.2" />
      <path d="M211,66 l0,36 m-4,-6 l4,6 l4,-6" stroke="var(--amber)" fill="none" strokeWidth="1.2" />
      <path d="M361,66 l0,36 m-4,-6 l4,6 l4,-6" stroke="var(--amber)" fill="none" strokeWidth="1.2" />
      {code(41, "c₁")} {code(191, "c₂")} {code(341, "c₃")}
      <text x={w / 2} y={150} textAnchor="middle" className="ll-fig-label">emb(c₁) + emb(c₂) + emb(c₃) + …  ≈  z</text>
    </svg>
  );
}

/** Three ways to serialise a T×K token grid: flattening, parallel, delay. */
function CodebookInterleaving() {
  const w = 520;
  const K = 4;
  const T = 5;
  const cell = 20;
  const panel = (ox: number, title: string, order: (t: number, k: number) => number | string, note: string) => (
    <g>
      <text x={ox + (T * cell) / 2} y={14} textAnchor="middle" className="ll-fig-label" style={{ fontWeight: 600 }}>{title}</text>
      {Array.from({ length: K }, (_, k) =>
        Array.from({ length: T }, (_, t) => {
          const v = order(t, k);
          return (
            <g key={`${t}-${k}`}>
              <rect x={ox + t * cell} y={22 + k * cell} width={cell - 2} height={cell - 2} rx="2" fill="var(--pine)" opacity={typeof v === "number" ? 0.08 + Math.min(0.32, v / 20) : 0.05} stroke="var(--rule)" strokeWidth="0.75" />
              <text x={ox + t * cell + cell / 2 - 1} y={22 + k * cell + cell / 2 + 3} textAnchor="middle" className="ll-fig-label" style={{ fontSize: 8 }}>{v}</text>
            </g>
          );
        }),
      )}
      <text x={ox + (T * cell) / 2} y={40 + K * cell} textAnchor="middle" className="ll-fig-label" style={{ fontSize: 9 }}>{note}</text>
    </g>
  );
  return (
    <svg viewBox={`0 0 ${w} 150`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Flattening emits every codebook of a frame before the next frame; parallel emits a whole frame at once; delay shifts each codebook one step later">
      {panel(24, "flattening", (t, k) => t * K + k + 1, "exact · length ×K")}
      {panel(212, "parallel", (t) => t + 1, "fast · wrong deps")}
      {panel(392, "delay", (t, k) => t + k + 1, "shifted · N+K−1")}
    </svg>
  );
}

/** MusicGen: EnCodec tokens through a decoder-only Transformer, text/melody conditioning. */
function MusicgenArch() {
  const w = 520;
  const box = (x: number, y: number, label: string, ww = 66, hh = 30) => (
    <g>
      <rect x={x} y={y} width={ww} height={hh} rx="7" fill="none" className="ll-fig-ink" strokeWidth="1.2" />
      <text x={x + ww / 2} y={y + hh / 2 + 4} textAnchor="middle" className="ll-fig-label" style={{ fontWeight: 600, fontSize: 10 }}>{label}</text>
    </g>
  );
  const arr = (x: number, y: number, len = 14) => (
    <path d={`M${x},${y} l${len},0 m-5,-4 l5,4 l-5,4`} className="ll-fig-pine" fill="none" strokeWidth="1.4" />
  );
  return (
    <svg viewBox={`0 0 ${w} 176`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Audio to EnCodec plus delay pattern to token streams to a decoder-only Transformer to token streams, shifted back and decoded to audio; text and melody condition it by cross-attention">
      {box(8, 24, "audio in", 54)}
      {arr(62, 39)}
      {box(78, 24, "EnCodec + delay", 92)}
      {arr(170, 39)}
      {box(186, 24, "token streams", 82)}
      {arr(268, 39)}
      {box(284, 18, "decoder-only Transformer", 150, 42)}
      {arr(434, 39)}
      {box(450, 24, "shift + decode", 62, 30)}
      <path d="M481,54 l0,18 m-4,-6 l4,6 l4,-6" className="ll-fig-pine" fill="none" strokeWidth="1.3" />
      {box(450, 72, "audio out", 62)}

      {/* conditioning */}
      <rect x={284} y={104} width={150} height={56} rx="8" fill="none" className="ll-fig-ink" strokeWidth="1" strokeDasharray="4 3" opacity="0.6" />
      <text x={359} y={118} textAnchor="middle" className="ll-fig-label" style={{ fontSize: 9 }}>conditioning (T5 encoder)</text>
      {box(294, 124, "text", 60, 24)}
      {box(364, 124, "melody?", 60, 24)}
      <path d="M359,104 l0,-42 m-4,6 l4,-6 l4,6" stroke="var(--amber)" fill="none" strokeWidth="1.4" />
      <text x={366} y={90} className="ll-fig-label" style={{ fontSize: 9, fill: "var(--amber)" }}>cross-attn</text>
    </svg>
  );
}

/** The historical arc of generative music. */
function GenMusicTimeline() {
  const w = 520;
  const eras = [
    { x: 58, t: "1700s", l: "musical dice games" },
    { x: 158, t: "1950s", l: "Markov models" },
    { x: 258, t: "early 2000s", l: "LSTMs" },
    { x: 356, t: "late 2010s", l: "Transformers" },
    { x: 452, t: "early 2020s", l: "diffusion" },
  ];
  return (
    <svg viewBox={`0 0 ${w} 120`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Generative music from dice games to Markov models to LSTMs to Transformers to diffusion">
      <line x1={30} y1={60} x2={w - 14} y2={60} className="ll-fig-ink" strokeWidth="1.3" />
      <path d={`M${w - 16},60 l-8,-4 l0,8 z`} className="ll-fig-amber" />
      {eras.map((e, i) => (
        <g key={e.t}>
          <circle cx={e.x} cy={60} r={4} fill={i === eras.length - 1 ? "var(--amber)" : "var(--pine)"} />
          <line x1={e.x} y1={60} x2={e.x} y2={i % 2 ? 40 : 80} className="ll-fig-ink" strokeWidth="1" opacity="0.4" />
          <text x={e.x} y={i % 2 ? 34 : 94} textAnchor="middle" className="ll-fig-label" style={{ fontWeight: 600 }}>{e.t}</text>
          <text x={e.x} y={i % 2 ? 22 : 106} textAnchor="middle" className="ll-fig-label" style={{ fontSize: 9 }}>{e.l}</text>
        </g>
      ))}
    </svg>
  );
}

/** MusicLM: three token types feeding a staged generator. */
function MusiclmStages() {
  const w = 520;
  const box = (x: number, y: number, label: string, ww: number, hh = 26, accent = false) => (
    <g>
      <rect x={x} y={y} width={ww} height={hh} rx="6" fill="none" stroke={accent ? "var(--pine)" : "var(--ink)"} strokeWidth={accent ? 1.5 : 1.2} />
      <text x={x + ww / 2} y={y + hh / 2 + 4} textAnchor="middle" className="ll-fig-label" style={{ fontWeight: 600, fontSize: 9.5 }}>{label}</text>
    </g>
  );
  const down = (x: number, y: number) => (
    <path d={`M${x},${y} l0,12 m-4,-5 l4,5 l4,-5`} className="ll-fig-pine" fill="none" strokeWidth="1.3" />
  );
  return (
    <svg viewBox={`0 0 ${w} 244`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="MuLan tokens drive semantic modelling into semantic tokens, then acoustic modelling into acoustic tokens, then a SoundStream decoder to audio">
      {/* token sources, left */}
      <text x={12} y={16} className="ll-fig-label" style={{ fontWeight: 600, fill: "var(--amber)" }}>TOKEN SOURCES</text>
      {box(12, 26, "MuLan (audio + text) → RVQ", 180)}
      {box(12, 60, "w2v-BERT layer → k-means", 180)}
      {box(12, 94, "SoundStream enc → RVQ", 180)}
      <text x={16} y={126} className="ll-fig-label" style={{ fontSize: 8.5 }}>→ MuLan / semantic / acoustic tokens</text>

      {/* staged chain, right */}
      <text x={250} y={16} className="ll-fig-label" style={{ fontWeight: 600, fill: "var(--amber)" }}>STAGED GENERATION</text>
      {box(250, 24, "MuLan tokens", 200)}
      {down(350, 50)}
      {box(250, 66, "semantic modelling", 200, 24, true)}
      {down(350, 90)}
      {box(250, 104, "semantic tokens", 200)}
      {down(350, 130)}
      {box(250, 146, "acoustic modelling", 200, 24, true)}
      {down(350, 170)}
      {box(250, 184, "acoustic tokens", 200)}
      {down(350, 210)}
      {box(250, 222, "SoundStream decoder → audio", 200)}
      <line x1={210} y1={130} x2={250} y2={130} className="ll-fig-ink" strokeWidth="1" strokeDasharray="3 2" opacity="0.4" />
    </svg>
  );
}

/** Stable Audio Figure 1 — frozen CLAP + timing embedders into a diffusion U-Net + VAE decoder. */
function StableAudioArch() {
  const w = 520;
  const box = (x: number, y: number, label: string, ww: number, tint: "frozen" | "learn" | "signal") => {
    const fill = tint === "signal" ? "var(--amber)" : tint === "learn" ? "var(--pine)" : "none";
    return (
      <g>
        <rect x={x} y={y} width={ww} height={28} rx="6" fill={fill} opacity={tint === "frozen" ? 1 : 0.22} className="ll-fig-ink" strokeWidth="1.2" />
        <rect x={x} y={y} width={ww} height={28} rx="6" fill="none" stroke={tint === "signal" ? "var(--amber)" : tint === "learn" ? "var(--pine)" : "var(--ink)"} strokeWidth="1.2" />
        <text x={x + ww / 2} y={y + 18} textAnchor="middle" className="ll-fig-label" style={{ fontWeight: 600, fontSize: 9.5 }}>{label}</text>
      </g>
    );
  };
  const arr = (x: number, y: number, len = 14) => (
    <path d={`M${x},${y} l${len},0 m-5,-4 l5,4 l-5,4`} className="ll-fig-pine" fill="none" strokeWidth="1.3" />
  );
  return (
    <svg viewBox={`0 0 ${w} 172`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Prompt through a frozen CLAP text encoder plus seconds_start and seconds_total embedders feed prompt and timing features into a diffusion U-Net, then a VAE decoder outputs audio">
      {box(10, 20, "prompt", 54, "signal")}
      {arr(64, 34)}
      {box(80, 18, "CLAP text encoder", 96, "frozen")}
      {arr(176, 34)}
      {box(192, 20, "prompt feats", 74, "signal")}

      {box(10, 74, "seconds_start", 74, "signal")}
      {box(10, 110, "seconds_total", 74, "signal")}
      {box(96, 74, "start embedder", 80, "learn")}
      {box(96, 110, "total embedder", 80, "learn")}
      {box(192, 92, "timing feats", 74, "signal")}
      <path d="M176,88 l14,6 m-6,-4 l6,4 l-7,2" className="ll-fig-pine" fill="none" strokeWidth="1.3" />
      <path d="M176,124 l14,-20 m-7,2 l7,-2 l0,7" className="ll-fig-pine" fill="none" strokeWidth="1.3" />

      {box(286, 30, "noise", 44, "signal")}
      {box(286, 66, "diffusion U-Net", 96, "learn")}
      <path d="M266,34 l20,20 m-6,-3 l6,3 l-2,-6" className="ll-fig-pine" fill="none" strokeWidth="1.3" />
      <path d="M266,100 l20,-15 m-7,1 l7,-1 l-1,7" className="ll-fig-pine" fill="none" strokeWidth="1.3" />
      <path d="M330,44 l0,22 m-4,-6 l4,6 l4,-6" className="ll-fig-pine" fill="none" strokeWidth="1.3" />
      {arr(382, 80)}
      {box(398, 66, "latents", 46, "signal")}
      <path d="M444,80 l10,0 m-4,-4 l4,4 l-4,4" className="ll-fig-pine" fill="none" strokeWidth="1.3" />
      {box(454, 66, "VAE dec", 56, "frozen")}
      <path d="M482,94 l0,20 m-4,-6 l4,6 l4,-6" className="ll-fig-pine" fill="none" strokeWidth="1.3" />
      {box(448, 116, "audio out", 62, "signal")}

      <text x={10} y={158} className="ll-fig-label" style={{ fontSize: 8.5 }}>outline: frozen (blue) · fill: learned (green) · amber: signals of interest</text>
    </svg>
  );
}

/** A next-token distribution over the vocabulary. */
function NextTokenDist() {
  const w = 520;
  const rows = [
    { t: "books", p: 0.2 },
    { t: "minds", p: 0.1 },
    { t: "doors", p: 0.05 },
    { t: "exams", p: 0.03 },
    { t: "giraffe", p: 0.000001 },
  ];
  const bx = 190;
  const bw = 260;
  return (
    <svg viewBox={`0 0 ${w} 168`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A probability distribution over next-token candidates: books 0.2, minds 0.1, giraffe near zero">
      <text x={16} y={30} className="ll-fig-label" style={{ fontWeight: 600 }}>&quot;The students opened their ___&quot;</text>
      <text x={16} y={46} className="ll-fig-label" style={{ fontSize: 9 }}>P(next token | context) over all |V| tokens, sums to 1</text>
      {rows.map((r, i) => {
        const y = 62 + i * 20;
        return (
          <g key={r.t}>
            <text x={bx - 8} y={y + 10} textAnchor="end" className="ll-fig-label">{r.t}</text>
            <rect x={bx} y={y} width={Math.max(2, r.p * bw)} height={12} rx="2" fill={i === rows.length - 1 ? "var(--amber)" : "var(--pine)"} opacity={i === rows.length - 1 ? 1 : 0.7} />
            <text x={bx + Math.max(2, r.p * bw) + 6} y={y + 10} className="ll-fig-label" style={{ fontSize: 9 }}>{r.p < 0.001 ? "~1e-6" : r.p.toFixed(2)}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** The Bengio 2003 neural probabilistic language model. */
function BengioArch() {
  const w = 520;
  const idx = [
    { x: 70, l: "w(i-n+1)" },
    { x: 210, l: "w(i-2)" },
    { x: 350, l: "w(i-1)" },
  ];
  return (
    <svg viewBox={`0 0 ${w} 258`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Context word indices look up feature vectors in C, concatenate, pass through a tanh hidden layer, then an output layer and softmax over the vocabulary">
      {/* index inputs */}
      {idx.map((c, i) => (
        <g key={i}>
          <rect x={c.x - 26} y={228} width={52} height={20} rx="3" fill="none" className="ll-fig-ink" strokeWidth="1.1" />
          <text x={c.x} y={242} textAnchor="middle" className="ll-fig-label" style={{ fontSize: 9 }}>{c.l}</text>
          <path d={`M${c.x},228 l0,-24`} className="ll-fig-ink" strokeWidth="1" strokeDasharray="3 2" opacity="0.5" />
          <rect x={c.x - 30} y={176} width={60} height={26} rx="3" fill="var(--pine)" opacity="0.2" stroke="var(--pine)" strokeWidth="1" />
          <text x={c.x} y={193} textAnchor="middle" className="ll-fig-label" style={{ fontSize: 9 }}>C( &#183; )</text>
          <path d={`M${c.x},176 l${(w / 2 - c.x) * 0.5},-24`} className="ll-fig-pine" fill="none" strokeWidth="1" opacity="0.5" />
        </g>
      ))}
      <text x={w - 14} y={192} textAnchor="end" className="ll-fig-label" style={{ fontSize: 9 }}>table lookup in C ( |V| &#215; m )</text>

      {/* concat x */}
      <rect x={150} y={128} width={220} height={22} rx="3" fill="var(--pine)" opacity="0.16" stroke="var(--pine)" strokeWidth="1" />
      <text x={260} y={143} textAnchor="middle" className="ll-fig-label" style={{ fontSize: 9 }}>x = concat of the C vectors   ( (n-1)m )</text>
      <path d="M260,128 l0,-20 m-4,6 l4,-6 l4,6" className="ll-fig-pine" fill="none" strokeWidth="1.2" />

      {/* hidden */}
      <rect x={170} y={82} width={180} height={24} rx="6" fill="none" className="ll-fig-ink" strokeWidth="1.3" />
      <text x={260} y={98} textAnchor="middle" className="ll-fig-label" style={{ fontWeight: 600, fontSize: 10 }}>h = tanh(d + Hx)</text>
      <path d="M260,82 l0,-18 m-4,6 l4,-6 l4,6" className="ll-fig-pine" fill="none" strokeWidth="1.2" />

      {/* output + softmax */}
      <rect x={150} y={40} width={220} height={24} rx="6" fill="none" className="ll-fig-ink" strokeWidth="1.3" />
      <text x={260} y={56} textAnchor="middle" className="ll-fig-label" style={{ fontWeight: 600, fontSize: 10 }}>y = b + Wx + Uh   (logits)</text>
      <path d="M150,139 C 92,120 92,60 150,52" stroke="var(--amber)" fill="none" strokeWidth="1.4" strokeDasharray="5 3" />
      <path d="M150,52 l-8,1 l4,6 z" fill="var(--amber)" />
      <text x={80} y={98} className="ll-fig-label" style={{ fontSize: 8.5, fill: "var(--amber)" }}>Wx: optional</text>
      <text x={80} y={110} className="ll-fig-label" style={{ fontSize: 8.5, fill: "var(--amber)" }}>direct link</text>

      <path d="M260,40 l0,-16 m-4,6 l4,-6 l4,6" className="ll-fig-pine" fill="none" strokeWidth="1.2" />
      <text x={260} y={18} textAnchor="middle" className="ll-fig-label" style={{ fontWeight: 600 }}>softmax  →  P(w(i) | context)</text>
      <text x={382} y={54} className="ll-fig-label" style={{ fontSize: 9 }}>U: h &#215; |V|</text>
    </svg>
  );
}

/** N-gram lookup, a recurrent cell with a self-loop, and the same cell unrolled. */
function RnnUnrolled() {
  const w = 520;
  const stack = (ox: number, title: string, loop: boolean) => (
    <g>
      <text x={ox + 33} y={16} textAnchor="middle" className="ll-fig-label" style={{ fontWeight: 600 }}>{title}</text>
      {["lookup", "transform", "predict"].map((t, i) => (
        <g key={t}>
          <rect x={ox} y={26 + i * 34} width={66} height={24} rx="5" fill="none" className="ll-fig-ink" strokeWidth="1.2" />
          <text x={ox + 33} y={42 + i * 34} textAnchor="middle" className="ll-fig-label" style={{ fontSize: 9 }}>{t}</text>
          {i < 2 ? <path d={`M${ox + 33},${50 + i * 34} l0,10 m-3,-4 l3,4 l3,-4`} className="ll-fig-pine" fill="none" strokeWidth="1.2" /> : null}
        </g>
      ))}
      {loop ? (
        <path d={`M${ox + 66},${72} C ${ox + 96},${72} ${ox + 96},${38} ${ox + 66},${38}`} stroke="var(--amber)" fill="none" strokeWidth="1.4" />
      ) : null}
    </g>
  );
  return (
    <svg viewBox={`0 0 ${w} 180`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="An n-gram lookup stack, a recurrent cell with a feedback loop, and the recurrent cell unrolled across time steps">
      {stack(14, "N-gram", false)}
      {stack(120, "Recurrent", true)}
      <text x={370} y={16} textAnchor="middle" className="ll-fig-label" style={{ fontWeight: 600 }}>Recurrent (unrolled)</text>
      {["I", "hate", "this", "movie"].map((tok, i) => {
        const x = 250 + i * 62;
        return (
          <g key={i}>
            <text x={x + 20} y={44} textAnchor="middle" className="ll-fig-label" style={{ fontSize: 9 }}>{tok}</text>
            <path d={`M${x + 20},48 l0,10 m-3,-4 l3,4 l3,-4`} className="ll-fig-pine" fill="none" strokeWidth="1.1" />
            <rect x={x} y={60} width={40} height={22} rx="5" fill="none" className="ll-fig-ink" strokeWidth="1.2" />
            <text x={x + 20} y={75} textAnchor="middle" className="ll-fig-label" style={{ fontSize: 9 }}>RNN</text>
            {i < 3 ? <path d={`M${x + 40},71 l22,0 m-5,-4 l5,4 l-5,4`} className="ll-fig-pine" fill="none" strokeWidth="1.1" /> : null}
            <path d={`M${x + 20},82 l0,12 m-3,-4 l3,4 l3,-4`} className="ll-fig-pine" fill="none" strokeWidth="1.1" />
            <text x={x + 20} y={106} textAnchor="middle" className="ll-fig-label" style={{ fontSize: 9 }}>predict</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Positional encoding as clock hands: three periods, one unique combination. */
function PosEncClock() {
  const w = 520;
  const cx = 110;
  const cy = 90;
  const hand = (angleDeg: number, len: number, color: string, wide: number) => {
    const a = ((angleDeg - 90) * Math.PI) / 180;
    return <line x1={cx} y1={cy} x2={cx + len * Math.cos(a)} y2={cy + len * Math.sin(a)} stroke={color} strokeWidth={wide} strokeLinecap="round" />;
  };
  return (
    <svg viewBox={`0 0 ${w} 180`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A clock with three hands at three periods, analogous to positional encoding sine waves at three frequencies">
      <circle cx={cx} cy={cy} r={62} fill="none" className="ll-fig-ink" strokeWidth="1.3" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = ((i * 30 - 90) * Math.PI) / 180;
        return <line key={i} x1={cx + 56 * Math.cos(a)} y1={cy + 56 * Math.sin(a)} x2={cx + 62 * Math.cos(a)} y2={cy + 62 * Math.sin(a)} className="ll-fig-ink" strokeWidth="1" opacity="0.5" />;
      })}
      {hand(300, 30, "var(--ink)", 2.4)}
      {hand(120, 44, "var(--pine)", 1.8)}
      {hand(210, 56, "var(--amber)", 1.2)}
      <circle cx={cx} cy={cy} r={3} className="ll-fig-amber" />

      <text x={210} y={44} className="ll-fig-label" style={{ fontWeight: 600 }}>three periods = three frequencies</text>
      <g>
        <line x1={210} y1={64} x2={234} y2={64} stroke="var(--ink)" strokeWidth="2.4" />
        <text x={242} y={68} className="ll-fig-label" style={{ fontSize: 10 }}>hour hand — slow — coarse position</text>
      </g>
      <g>
        <line x1={210} y1={86} x2={234} y2={86} stroke="var(--pine)" strokeWidth="1.8" />
        <text x={242} y={90} className="ll-fig-label" style={{ fontSize: 10 }}>minute hand — medium</text>
      </g>
      <g>
        <line x1={210} y1={108} x2={234} y2={108} stroke="var(--amber)" strokeWidth="1.2" />
        <text x={242} y={112} className="ll-fig-label" style={{ fontSize: 10 }}>second hand — fast — fine position</text>
      </g>
      <text x={210} y={140} className="ll-fig-label" style={{ fontSize: 9 }}>every instant is a unique combination of the three</text>
    </svg>
  );
}

/** Music Transformer skewing: pad a zero column, reshape, slice. */
function Skewing() {
  const w = 520;
  const cell = 15;
  const L = 5;
  const grid = (ox: number, cols: number, title: string, fill: (r: number, c: number) => number) => (
    <g>
      <text x={ox + (cols * cell) / 2} y={14} textAnchor="middle" className="ll-fig-label" style={{ fontWeight: 600 }}>{title}</text>
      {Array.from({ length: L }, (_, r) =>
        Array.from({ length: cols }, (_, c) => (
          <rect
            key={`${r}-${c}`}
            x={ox + c * cell}
            y={22 + r * cell}
            width={cell - 1.5}
            height={cell - 1.5}
            rx="1.5"
            fill={fill(r, c) === 1 ? "var(--pine)" : fill(r, c) === 2 ? "var(--amber)" : "none"}
            opacity={fill(r, c) ? 0.5 : 1}
            stroke="var(--rule)"
            strokeWidth="0.75"
          />
        )),
      )}
    </g>
  );
  return (
    <svg viewBox={`0 0 ${w} 118`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Skewing: a diagonal band of relative distances is padded, reshaped, and sliced into the query-key grid">
      {grid(24, L, "QEᵀ (diagonal)", (r, c) => (c >= r ? 2 : 0))}
      <path d="M118,64 l16,0 m-5,-4 l5,4 l-5,4" className="ll-fig-pine" fill="none" strokeWidth="1.3" />
      {grid(150, L + 1, "pad + reshape", (r, c) => (c === 0 ? 1 : c - 1 >= r - 1 ? 2 : 0))}
      <path d="M258,64 l16,0 m-5,-4 l5,4 l-5,4" className="ll-fig-pine" fill="none" strokeWidth="1.3" />
      {grid(290, L, "slice → Sʳᵉˡ", () => 2)}
      <text x={400} y={64} className="ll-fig-label" style={{ fontSize: 9 }}>no (L, L, D) tensor</text>
      <text x={400} y={78} className="ll-fig-label" style={{ fontSize: 9 }}>O(L²D) → O(LD)</text>
    </svg>
  );
}

/** SATB voices: flattening (column by column) vs delay (staggered). */
function VoiceSerialization() {
  const w = 520;
  const cell = 22;
  const T = 5;
  const voices = ["S", "A", "T", "B"];
  const panel = (ox: number, title: string, val: (t: number, v: number) => string, note: string) => (
    <g>
      <text x={ox + (T * cell) / 2} y={14} textAnchor="middle" className="ll-fig-label" style={{ fontWeight: 600 }}>{title}</text>
      {voices.map((vn, v) => (
        <text key={vn} x={ox - 8} y={26 + v * cell + 14} textAnchor="end" className="ll-fig-label" style={{ fontSize: 9 }}>{vn}</text>
      ))}
      {voices.map((_, v) =>
        Array.from({ length: T }, (_, t) => {
          const s = val(t, v);
          return (
            <g key={`${t}-${v}`}>
              <rect x={ox + t * cell} y={26 + v * cell} width={cell - 2} height={cell - 2} rx="2" fill={s === "∅" ? "none" : "var(--pine)"} opacity={s === "∅" ? 1 : 0.14} stroke="var(--rule)" strokeWidth="0.75" />
              <text x={ox + t * cell + cell / 2 - 1} y={26 + v * cell + cell / 2 + 3} textAnchor="middle" className="ll-fig-label" style={{ fontSize: 8 }}>{s}</text>
            </g>
          );
        }),
      )}
      <text x={ox + (T * cell) / 2} y={40 + voices.length * cell} textAnchor="middle" className="ll-fig-label" style={{ fontSize: 9 }}>{note}</text>
    </g>
  );
  return (
    <svg viewBox={`0 0 ${w} 150`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Flattening emits all four voices per timestep; delay shifts each voice one step later so each stays continuous">
      {panel(40, "flattening", (t, v) => String(t * 4 + v + 1), "emit order, column by column")}
      {panel(300, "delay", (t, v) => (t - v >= 0 ? String(t - v + 1) : "∅"), "each voice a continuous stream")}
    </svg>
  );
}

/** Anticipation: a control token spliced in delta seconds before it fires. */
function AnticipationInterleave() {
  const w = 520;
  const y = 60;
  const sk = 400;
  const delta = 120;
  return (
    <svg viewBox={`0 0 ${w} 108`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A control token for time s_k is inserted delta seconds earlier, right after the first event at or past s_k minus delta">
      <line x1={20} y1={y} x2={w - 16} y2={y} className="ll-fig-ink" strokeWidth="1.2" />
      <path d={`M${w - 16},${y} l-8,-4 l0,8 z`} className="ll-fig-amber" />
      {[60, 130, 200, 270, 330, 440].map((x, i) => (
        <circle key={i} cx={x} cy={y} r={4} className="ll-fig-pine" />
      ))}
      <text x={40} y={y + 20} className="ll-fig-label" style={{ fontSize: 9 }}>events</text>

      {/* fire time */}
      <line x1={sk} y1={y - 22} x2={sk} y2={y + 8} stroke="var(--amber)" strokeWidth="1.3" strokeDasharray="3 2" />
      <text x={sk} y={y - 26} textAnchor="middle" className="ll-fig-label" style={{ fontSize: 9 }}>sₖ (fires)</text>

      {/* insertion point */}
      <rect x={sk - delta - 10} y={y - 30} width={20} height={16} rx="3" fill="none" stroke="var(--amber)" strokeWidth="1.3" />
      <text x={sk - delta} y={y - 18} textAnchor="middle" className="ll-fig-label" style={{ fontSize: 8 }}>uₖ</text>
      <path d={`M${sk - delta},${y - 14} l0,10 m-3,-4 l3,4 l3,-4`} stroke="var(--amber)" fill="none" strokeWidth="1.2" />

      <path d={`M${sk - 4},${y + 20} l${-delta + 8},0 m6,-4 l-6,4 l6,4`} stroke="var(--amber)" fill="none" strokeWidth="1.2" />
      <text x={sk - delta / 2} y={y + 34} textAnchor="middle" className="ll-fig-label" style={{ fontSize: 9, fill: "var(--amber)" }}>anticipation interval δ</text>
    </svg>
  );
}

/** MIDI-like event vocab vs REMI's beat-aware vocab. */
function RemiVsMidi() {
  const w = 520;
  const row = (y: number, left: string, right: string, changed: boolean) => (
    <g>
      <rect x={16} y={y} width={210} height={26} rx="5" fill="none" className="ll-fig-ink" strokeWidth="1.1" opacity="0.7" />
      <text x={121} y={y + 17} textAnchor="middle" className="ll-fig-label" style={{ fontSize: 9.5 }}>{left}</text>
      <path d={`M232,${y + 13} l24,0 m-6,-4 l6,4 l-6,4`} className="ll-fig-pine" fill="none" strokeWidth="1.2" />
      <rect x={262} y={y} width={244} height={26} rx="5" fill={changed ? "var(--pine)" : "none"} opacity={changed ? 0.12 : 1} stroke={changed ? "var(--pine)" : "var(--ink)"} strokeWidth="1.1" />
      <text x={384} y={y + 17} textAnchor="middle" className="ll-fig-label" style={{ fontSize: 9.5, fontWeight: changed ? 600 : 400 }}>{right}</text>
    </g>
  );
  return (
    <svg viewBox={`0 0 ${w} 196`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="REMI keeps Note-On, replaces Note-Off with Note Duration, Time-Shift with Bar plus Position, and adds Tempo and Chord events">
      <text x={121} y={14} textAnchor="middle" className="ll-fig-label" style={{ fontWeight: 600, fill: "var(--amber)" }}>MIDI-LIKE</text>
      <text x={384} y={14} textAnchor="middle" className="ll-fig-label" style={{ fontWeight: 600, fill: "var(--amber)" }}>REMI</text>
      {row(22, "Note-On (0–127)", "Note-On (unchanged)", false)}
      {row(56, "Note-Off (0–127)", "Note Duration (1–64 · 32nds)", true)}
      {row(90, "Time-Shift (10–1000 ms)", "Bar + Position (k / 16)", true)}
      {row(124, "—", "Tempo Class + Tempo Value", true)}
      {row(158, "—", "Chord (12 roots × 5 qualities)", true)}
    </svg>
  );
}

/** The four music modalities and the MIR task on each link. */
function ModalitySpectrum() {
  const w = 520;
  const mods = ["Score Image", "Notation", "MIDI", "Audio"];
  const links = ["OMR", "perf. model", "AMT"];
  const bw = 104;
  const gap = (w - 24 - mods.length * bw) / (mods.length - 1);
  return (
    <svg viewBox={`0 0 ${w} 112`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Score image, notation, MIDI and audio in a row, with OMR, performance modelling and AMT labelling the links between them">
      {mods.map((m, i) => {
        const x = 12 + i * (bw + gap);
        return (
          <g key={m}>
            <rect x={x} y={40} width={bw} height={30} rx="7" fill="none" className="ll-fig-ink" strokeWidth="1.3" />
            <text x={x + bw / 2} y={59} textAnchor="middle" className="ll-fig-label" style={{ fontWeight: 600, fontSize: 10 }}>{m}</text>
            {i < mods.length - 1 ? (
              <g>
                <path d={`M${x + bw + 4},55 l${gap - 8},0`} stroke="var(--amber)" fill="none" strokeWidth="1.3" />
                <path d={`M${x + bw + gap - 4},55 l-6,-3 l0,6 z`} fill="var(--amber)" />
                <path d={`M${x + bw + 4},55 l6,-3 l0,6 z`} fill="var(--amber)" />
                <text x={x + bw + gap / 2} y={22} textAnchor="middle" className="ll-fig-label" style={{ fontSize: 8 }}>{links[i]}</text>
              </g>
            ) : null}
          </g>
        );
      })}
      <text x={w / 2} y={96} textAnchor="middle" className="ll-fig-label" style={{ fontSize: 9 }}>continuous on a modal spectrum · MIDI → Audio is synthesis</text>
    </svg>
  );
}

/** Score-image patches: row-major flattening vs vertical-first. */
function VerticalFlatten() {
  const w = 520;
  const R = 4;
  const C = 6;
  const cell = 20;
  const panel = (ox: number, title: string, order: (r: number, c: number) => number, note: string) => (
    <g>
      <text x={ox + (C * cell) / 2} y={14} textAnchor="middle" className="ll-fig-label" style={{ fontWeight: 600 }}>{title}</text>
      {Array.from({ length: R }, (_, r) =>
        Array.from({ length: C }, (_, c) => (
          <g key={`${r}-${c}`}>
            <rect x={ox + c * cell} y={22 + r * cell} width={cell - 2} height={cell - 2} rx="2" fill="var(--pine)" opacity={0.06 + 0.03 * order(r, c)} stroke="var(--rule)" strokeWidth="0.75" />
            <text x={ox + c * cell + cell / 2 - 1} y={22 + r * cell + cell / 2 + 3} textAnchor="middle" className="ll-fig-label" style={{ fontSize: 8 }}>{order(r, c)}</text>
          </g>
        )),
      )}
      <text x={ox + (C * cell) / 2} y={38 + R * cell} textAnchor="middle" className="ll-fig-label" style={{ fontSize: 9 }}>{note}</text>
    </g>
  );
  return (
    <svg viewBox={`0 0 ${w} 140`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Row-major flattening reads left to right then down; vertical-first reads top to bottom then across, matching how a staff system is read">
      {panel(40, "row-major", (r, c) => r * C + c + 1, "left → right, then down")}
      {panel(320, "vertical-first", (r, c) => c * R + r + 1, "top → bottom, then across")}
    </svg>
  );
}

/** The two-direction unified translation model. */
function UnifiedArch() {
  const w = 520;
  const lane = (oy: number, dir: string, src: string, tgt: string) => (
    <g>
      <text x={12} y={oy + 4} className="ll-fig-label" style={{ fontWeight: 600, fill: "var(--amber)" }}>{dir}</text>
      {[
        [40, src],
        [130, "encoder"],
        [222, "decoder"],
        [314, "sub-decoder"],
        [420, tgt],
      ].map(([x, label], i) => (
        <g key={i}>
          <rect x={x as number} y={oy + 12} width={i === 3 ? 82 : 76} height={26} rx="6" fill="none" stroke={i === 3 ? "var(--pine)" : "var(--ink)"} strokeWidth="1.2" />
          <text x={(x as number) + (i === 3 ? 41 : 38)} y={oy + 29} textAnchor="middle" className="ll-fig-label" style={{ fontSize: 9, fontWeight: 600 }}>{label as string}</text>
        </g>
      ))}
      {[116, 208, 300, 406].map((x, i) => (
        <path key={i} d={`M${x},${oy + 25} l${i === 3 ? 12 : 14},0 m-5,-4 l5,4 l-5,4`} className="ll-fig-pine" fill="none" strokeWidth="1.2" />
      ))}
    </g>
  );
  return (
    <svg viewBox={`0 0 ${w} 130`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Two identical encoder-decoder transformers: an image-to-audio direction and an audio-to-image direction, each with a sub-decoder for multi-codebook output">
      {lane(14, "I2A", "image", "audio")}
      {lane(74, "A2I", "audio", "image")}
    </svg>
  );
}

/** VidMusician: one video, a slow semantic stream and a fast rhythm stream,
 *  injected into a frozen MusicGen at two different attention sites. */
function V2mTwoBranch() {
  const w = 560;
  const box = (x: number, y: number, label: string, ww: number, hh = 30) => (
    <g>
      <rect x={x} y={y} width={ww} height={hh} rx="6" fill="none" className="ll-fig-ink" strokeWidth="1.2" />
      <text x={x + ww / 2} y={y + hh / 2 + 3.5} textAnchor="middle" className="ll-fig-label" style={{ fontSize: 9, fontWeight: 600 }}>{label}</text>
    </g>
  );
  const arr = (x: number, y: number, len: number) => (
    <path d={`M${x},${y} l${len},0 m-5,-4 l5,4 l-5,4`} className="ll-fig-pine" fill="none" strokeWidth="1.3" />
  );
  return (
    <svg viewBox={`0 0 ${w} 202`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Video splits into a 1 fps CLIP CLS stream through T5 plus LoRA that cross-attends into a frozen MusicGen, and a 25 fps CLIP patch stream turned into a 1 minus cosine similarity signal that enters via in-attention; MusicGen outputs audio">
      {box(8, 82, "video", 52, 34)}

      {/* split bus */}
      <path d="M60,99 h13 M73,45 V153 M73,45 h15 M73,153 h15" className="ll-fig-pine" fill="none" strokeWidth="1.3" />

      {/* semantic branch */}
      <text x={90} y={20} className="ll-fig-label" style={{ fontSize: 8.5, fontWeight: 700, fill: "var(--amber)", letterSpacing: "0.08em" }}>SEMANTIC · SLOW</text>
      {box(90, 30, "1 fps · CLIP [CLS]", 120)}
      {arr(210, 45, 16)}
      {box(228, 30, "T5 + LoRA", 78)}
      {arr(306, 45, 66)}
      <text x={339} y={40} textAnchor="middle" className="ll-fig-label" style={{ fontSize: 8, fill: "var(--amber)" }}>cross-attn</text>

      {/* rhythm branch */}
      {box(90, 138, "25 fps · CLIP patches", 120)}
      {arr(210, 153, 16)}
      {box(228, 138, "1 − cos sim", 78)}
      {arr(306, 153, 66)}
      <text x={339} y={172} textAnchor="middle" className="ll-fig-label" style={{ fontSize: 8, fill: "var(--amber)" }}>in-attn</text>
      <text x={90} y={198} className="ll-fig-label" style={{ fontSize: 8.5, fontWeight: 700, fill: "var(--amber)", letterSpacing: "0.08em" }}>RHYTHM · FRAME-RATE</text>

      {/* frozen backbone */}
      <rect x={372} y={24} width={122} height={154} rx="8" fill="none" className="ll-fig-ink" strokeWidth="1.4" strokeDasharray="5 3" />
      <text x={433} y={96} textAnchor="middle" className="ll-fig-label" style={{ fontSize: 11, fontWeight: 700 }}>MusicGen</text>
      <text x={433} y={112} textAnchor="middle" className="ll-fig-label" style={{ fontSize: 8.5 }}>frozen</text>

      {arr(496, 101, 12)}
      {box(514, 84, "audio", 40, 34)}
    </svg>
  );
}

/** VeM: the three-level video parse, each level feeding the same latent music
 *  diffusion model. */
function V2mThreeLevels() {
  const w = 540;
  const row = (ry: number, tag: string, input: string, attr: string) => (
    <g>
      <text x={6} y={ry + 27} className="ll-fig-label" style={{ fontSize: 8, fontWeight: 700, fill: "var(--amber)", letterSpacing: "0.06em" }}>{tag}</text>
      <rect x={70} y={ry + 5} width={196} height={34} rx="6" fill="none" className="ll-fig-ink" strokeWidth="1.2" />
      <text x={168} y={ry + 26} textAnchor="middle" className="ll-fig-label" style={{ fontSize: 9, fontWeight: 600 }}>{input}</text>
      <path d={`M266,${ry + 22} l16,0 m-5,-4 l5,4 l-5,4`} className="ll-fig-pine" fill="none" strokeWidth="1.3" />
      <rect x={288} y={ry + 5} width={150} height={34} rx="6" fill="none" className="ll-fig-ink" strokeWidth="1.2" />
      <text x={363} y={ry + 26} textAnchor="middle" className="ll-fig-label" style={{ fontSize: 9, fontWeight: 600 }}>{attr}</text>
      <path d={`M438,${ry + 22} l14,0 m-5,-4 l5,4 l-5,4`} className="ll-fig-pine" fill="none" strokeWidth="1.3" />
    </g>
  );
  return (
    <svg viewBox={`0 0 ${w} 222`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three parse levels feed one latent music diffusion model: global caption and emotion tags set theme and instrumentation, per-shot caption timing and MAViL set section and local mood, transition intersect beat sets accents on the cuts; the diffusion model outputs audio">
      {row(16, "GLOBAL", "caption + emotion tags", "theme + instrumentation")}
      {row(78, "STORYBOARD", "per-shot caption, timing, MAViL", "section + local mood")}
      {row(140, "FRAME", "transition ∩ beat", "accents on the cuts")}

      <rect x={452} y={21} width={80} height={162} rx="8" fill="none" className="ll-fig-ink" strokeWidth="1.4" />
      <text x={492} y={102} textAnchor="middle" className="ll-fig-label" style={{ fontSize: 9.5, fontWeight: 700 }} transform="rotate(-90 492 102)">latent music diffusion</text>

      <path d="M492,183 l0,14 m-4,-5 l4,5 l4,-5" className="ll-fig-pine" fill="none" strokeWidth="1.3" />
      <rect x={462} y={197} width={60} height={22} rx="6" fill="none" className="ll-fig-ink" strokeWidth="1.2" />
      <text x={492} y={211} textAnchor="middle" className="ll-fig-label" style={{ fontSize: 9, fontWeight: 600 }}>audio</text>
    </svg>
  );
}
