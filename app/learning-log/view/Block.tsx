"use client";

import { useState } from "react";
import type { Block } from "../content/types";
import { Prose, RichText } from "./rich";
import { Math } from "./math";
import { Figure } from "./figures";
import SamplingAliasing from "../widgets/SamplingAliasing";
import HarmonicStack from "../widgets/HarmonicStack";
import Spectrogram from "../widgets/Spectrogram";
import RateDistortion from "../widgets/RateDistortion";
import TsrCalc from "../widgets/TsrCalc";
import IntervalRatios from "../widgets/IntervalRatios";
import ScaleExplorer from "../widgets/ScaleExplorer";
import WaveformTimbre from "../widgets/WaveformTimbre";
import Adsr from "../widgets/Adsr";
import ChordFunctions from "../widgets/ChordFunctions";
import RhythmGrid from "../widgets/RhythmGrid";
import JukeboxCascade from "../widgets/JukeboxCascade";
import GuidanceScale from "../widgets/GuidanceScale";
import RtfCalc from "../widgets/RtfCalc";
import VqQuantize from "../widgets/VqQuantize";
import PerplexityLab from "../widgets/PerplexityLab";
import PositionalEncoding from "../widgets/PositionalEncoding";
import PerfRnnTokens from "../widgets/PerfRnnTokens";
import type { WidgetId } from "../content/types";

export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="ll-body">
      {blocks.map((b, i) => (
        <BlockView key={i} block={b} />
      ))}
    </div>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "prose":
      return <div><Prose text={block.text} /></div>;

    case "heading":
      return <p className="ll-heading" id={block.id}><RichText>{block.text}</RichText></p>;

    case "keypoints":
      return (
        <div className={`ll-keypoints t-${block.tone ?? "plain"}`}>
          {block.title ? <p className="ll-keypoints__t"><RichText>{block.title}</RichText></p> : null}
          <ul>
            {block.items.map((it, i) => (
              <li key={i}><RichText>{it}</RichText></li>
            ))}
          </ul>
        </div>
      );

    case "formula":
      return (
        <div className="ll-formula">
          <div className="ll-formula__tex"><Math tex={block.tex} display /></div>
          {block.caption ? <div className="ll-formula__cap"><RichText>{block.caption}</RichText></div> : null}
        </div>
      );

    case "aside":
      return <Aside block={block} />;

    case "discussion":
      return <Discussion block={block} />;

    case "figure":
      return (
        <figure className="ll-figure">
          <Figure id={block.figure} />
          {block.caption ? <figcaption><RichText>{block.caption}</RichText></figcaption> : null}
        </figure>
      );

    case "widget":
      return (
        <div>
          <Widget id={block.widget} />
          {block.caption ? <p className="ll-widget__cap"><RichText>{block.caption}</RichText></p> : null}
        </div>
      );

    case "quiz":
      return <Quiz block={block} />;
  }
}

function Aside({ block }: { block: Extract<Block, { type: "aside" }> }) {
  const [folded, setFolded] = useState(!!block.folded);
  const label = block.variant === "analogy" ? "ANALOGY" : block.variant === "intuition" ? "INTUITION" : block.variant === "note" ? "NOTE" : "ASIDE";
  return (
    <div className={`ll-aside v-${block.variant}`} data-folded={folded}>
      <button type="button" className="ll-aside__toggle" onClick={() => setFolded((v) => !v)} aria-expanded={!folded}>
        <span className="ll-aside__t">
          {block.title ? <RichText>{block.title}</RichText> : label}
          <span className="ll-aside__chev" aria-hidden="true">›</span>
        </span>
      </button>
      <div className="ll-aside__body"><RichText>{block.text}</RichText></div>
    </div>
  );
}

function Discussion({ block }: { block: Extract<Block, { type: "discussion" }> }) {
  const [open, setOpen] = useState<Set<number>>(() => new Set([0]));
  const toggle = (i: number) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  return (
    <div className="ll-discussion">
      <p className="ll-discussion__t">{block.title ? <RichText>{block.title}</RichText> : "CLASS DISCUSSION"}</p>
      {block.qa.map((qa, i) => (
        <div className="ll-qa" key={i}>
          <button type="button" className="ll-qa__q" onClick={() => toggle(i)} aria-expanded={open.has(i)}>
            <RichText>{qa.q}</RichText>
          </button>
          {open.has(i) ? (
            <ul className="ll-qa__a">
              {qa.a.map((a, j) => (
                <li key={j}><RichText>{a}</RichText></li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function Quiz({ block }: { block: Extract<Block, { type: "quiz" }> }) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  return (
    <div className="ll-quiz">
      <p className="ll-quiz__p"><RichText>{block.prompt}</RichText></p>
      <div className="ll-quiz__choices">
        {block.choices.map((c, i) => {
          const cls = !answered
            ? ""
            : c.correct
              ? " is-correct"
              : i === picked
                ? " is-wrong"
                : "";
          return (
            <button
              key={i}
              type="button"
              className={`ll-quiz__choice${cls}`}
              onClick={() => setPicked(i)}
              disabled={answered}
            >
              <RichText>{c.text}</RichText>
            </button>
          );
        })}
      </div>
      {answered && block.explain ? (
        <p className="ll-quiz__explain"><RichText>{block.explain}</RichText></p>
      ) : null}
    </div>
  );
}

function Widget({ id }: { id: WidgetId }) {
  switch (id) {
    case "sampling-aliasing":
      return <SamplingAliasing />;
    case "harmonic-stack":
      return <HarmonicStack />;
    case "spectrogram":
      return <Spectrogram />;
    case "rate-distortion":
      return <RateDistortion />;
    case "tsr-calc":
      return <TsrCalc />;
    case "interval-ratios":
      return <IntervalRatios />;
    case "scale-explorer":
      return <ScaleExplorer />;
    case "waveform-timbre":
      return <WaveformTimbre />;
    case "adsr":
      return <Adsr />;
    case "chord-functions":
      return <ChordFunctions />;
    case "rhythm-grid":
      return <RhythmGrid />;
    case "jukebox-cascade":
      return <JukeboxCascade />;
    case "guidance-scale":
      return <GuidanceScale />;
    case "rtf-calc":
      return <RtfCalc />;
    case "vq-quantize":
      return <VqQuantize />;
    case "perplexity-lab":
      return <PerplexityLab />;
    case "positional-encoding":
      return <PositionalEncoding />;
    case "perf-rnn-tokens":
      return <PerfRnnTokens />;
  }
}
