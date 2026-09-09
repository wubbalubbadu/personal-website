/**
 * Content model for the interactive learning log.
 *
 * A course is a tree: Course → Unit → Chapter → Slide → Block[].
 * The same tree feeds two projections:
 *   - Reader: every slide of a chapter rendered as a flowing <section>.
 *   - Slides: one slide on screen at a time, keyboard-navigable.
 *
 * Blocks are deliberately small and typed so a renderer can switch on `type`
 * without knowing anything about the subject matter.
 */

/** Lightweight inline markup is supported in every string field that renders as
 * prose: `**bold**`, `*italic*`, `` `code` ``, and `$math$` (styled, not layout
 * math). Newlines inside a `prose` block start a new paragraph. */
export type Rich = string;

export type Block =
  | { type: "prose"; text: Rich }
  | { type: "heading"; text: Rich; id?: string }
  | { type: "keypoints"; title?: Rich; items: Rich[]; tone?: "plain" | "result" | "warn" }
  | { type: "formula"; tex: string; caption?: Rich }
  | {
      type: "aside";
      variant: "analogy" | "note" | "intuition" | "aside";
      title?: Rich;
      text: Rich;
      /** Collapsed by default when true (long tangents). */
      folded?: boolean;
    }
  | {
      type: "discussion";
      title?: Rich;
      qa: { q: Rich; a: Rich[] }[];
    }
  | { type: "figure"; figure: FigureId; caption?: Rich }
  | { type: "widget"; widget: WidgetId; caption?: Rich }
  | {
      type: "quiz";
      prompt: Rich;
      choices: { text: Rich; correct?: boolean }[];
      explain?: Rich;
    };

/** Inline SVG diagrams drawn in `view/figures.tsx`. */
export type FigureId =
  | "analog-vs-digital"
  | "sample-hold"
  | "stft-framing"
  | "two-stage-pipeline"
  | "rate-distortion-triangle"
  | "melody-arc"
  | "bright-dark-axis"
  | "song-layers"
  | "vqvae-quantize"
  | "jukebox-cascade-flow"
  | "ldm-architecture"
  | "diffusion-chain"
  | "perceptual-vs-semantic"
  | "timing-conditioning"
  | "codec-vs-ldm"
  | "straight-through-estimator"
  | "vqvae2-hierarchy"
  | "rvq-residual"
  | "codebook-interleaving"
  | "musicgen-arch"
  | "gen-music-timeline"
  | "musiclm-stages"
  | "stable-audio-arch"
  | "next-token-dist"
  | "bengio-arch"
  | "rnn-unrolled"
  | "pos-enc-clock"
  | "skewing"
  | "voice-serialization"
  | "anticipation-interleave"
  | "remi-vs-midi"
  | "modality-spectrum"
  | "vertical-flatten"
  | "unified-arch"
  | "v2m-two-branch"
  | "v2m-three-levels";

/** Interactive demos in `widgets/`. */
export type WidgetId =
  | "sampling-aliasing"
  | "harmonic-stack"
  | "spectrogram"
  | "rate-distortion"
  | "tsr-calc"
  | "interval-ratios"
  | "scale-explorer"
  | "waveform-timbre"
  | "adsr"
  | "chord-functions"
  | "rhythm-grid"
  | "jukebox-cascade"
  | "guidance-scale"
  | "rtf-calc"
  | "vq-quantize"
  | "perplexity-lab"
  | "positional-encoding"
  | "perf-rnn-tokens";

export type Slide = {
  id: string;
  title: Rich;
  /** Optional one-line framing shown under the slide title. */
  lede?: Rich;
  blocks: Block[];
};

export type Chapter = {
  id: string;
  title: Rich;
  /** Shown in the chapter rail and on the chapter's title slide. */
  summary: Rich;
  slides: Slide[];
};

export type Unit = {
  id: string;
  title: Rich;
  blurb: Rich;
  chapters: Chapter[];
};

export type Course = {
  id: string;
  title: Rich;
  /** e.g. "CMU · Deep Learning for Music" */
  source: Rich;
  /** Short paragraph for the course landing card. */
  about: Rich;
  units: Unit[];
};

/** Flat handle to one slide, used for navigation and progress keys. */
export type SlideRef = {
  unit: Unit;
  chapter: Chapter;
  slide: Slide;
  /** 0-based index across the whole course. */
  index: number;
};

export function flattenSlides(course: Course): SlideRef[] {
  const out: SlideRef[] = [];
  for (const unit of course.units) {
    for (const chapter of unit.chapters) {
      for (const slide of chapter.slides) {
        out.push({ unit, chapter, slide, index: out.length });
      }
    }
  }
  return out;
}

export function progressKey(courseId: string, chapterId: string, slideId: string): string {
  return `ll:${courseId}:${chapterId}:${slideId}`;
}
