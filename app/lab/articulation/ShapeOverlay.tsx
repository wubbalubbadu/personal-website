"use client";
import {useMemo} from "react";
import type {Analysis, Note} from "./engine";
import {LENGTH_COLOR} from "./lengthColors";
import {useWidth} from "./useWidth";

/**
 * Every note's loudness shape on top of each other, lined up at the start and scaled to its own peak. Notes you meant
 * to play the same way should lie on top of each other; the ones that stray are the ones to listen to again.
 */
const TOP = 10, H = 170, HEIGHT = 204;

/** One note's loudness as a path, lined up at its start and scaled to its own peak. */
function notePath(analysis: Analysis, note: Note, spanMs: number, x: (ms: number) => number) {
  const {envelopeAmp, envelopeHopMs: hopMs} = analysis;
  let peak = 0;
  const from = Math.floor(note.startMs / hopMs), end = Math.ceil(note.endMs / hopMs);
  for (let i = from; i <= Math.ceil((note.startMs + note.peakAfterMs) / hopMs); i++) peak = Math.max(peak, envelopeAmp[i] ?? 0);
  let d = "";
  const first = Math.max(0, from - Math.round(20 / hopMs)), last = Math.min(envelopeAmp.length - 1, from + Math.round(spanMs / hopMs), end + Math.round(60 / hopMs));
  for (let i = first; i <= last; i++) {
    const y = TOP + H - Math.min(1.05, envelopeAmp[i] / (peak || 1)) * H;
    d += `${i === first ? "M" : "L"}${x((i - from) * hopMs).toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}

/** `reference`, when given, is drawn first as grey dashed lines: the matching notes of the take you compare against. */
export function ShapeOverlay({analysis, notes, selected, onSelect, zh, reference}: {
  analysis: Analysis; notes: Note[]; selected: number; onSelect: (index: number) => void; zh: boolean;
  reference?: {analysis: Analysis; notes: Note[]} | null;
}) {
  const [box, width] = useWidth<HTMLDivElement>();
  // Long enough for the longest sounding note plus its release, capped so short notes stay readable.
  // Set by this take's notes only, so a reference with long notes does not squeeze the ones you are looking at.
  const spanMs = Math.min(900, Math.max(250, ...notes.map(n => n.soundedMs + n.releaseMs + 40)));
  const x = (ms: number) => ((ms + 20) / (spanMs + 20)) * width;

  const lines = useMemo(() => notes.map(note => ({index: note.index, length: note.length, d: notePath(analysis, note, spanMs, x)})),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notes, analysis, width, spanMs]);
  const ghosts = useMemo(() => reference ? reference.notes.map(note => notePath(reference.analysis, note, spanMs, x)) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reference, width, spanMs]);

  const ticks = [0, 100, 200, 300, 400, 500, 600, 700, 800].filter(t => t <= spanMs);
  const chosen = lines.find(l => l.index === selected);

  return <div ref={box} className="artic-overlay">
    <svg width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`} role="img"
      aria-label={zh ? "所有音的形状叠在一起" : "Every note's shape, lined up at the start"}>
      <line className="artic-overlay__start" x1={x(0)} x2={x(0)} y1={TOP} y2={TOP + H}/>
      {ghosts.map((d, k) => <path key={`ghost-${k}`} className="artic-overlay__ghost" d={d}/>)}
      {lines.map(l => l.index !== selected && <path key={l.index} className="artic-overlay__line" d={l.d} style={{stroke: LENGTH_COLOR[l.length]}}
        onClick={() => onSelect(l.index)}/>)}
      {chosen && <path className="artic-overlay__line is-chosen" d={chosen.d}/>}
      {ticks.map(t => <g key={t}>
        <line className="artic-overlay__tick" x1={x(t)} x2={x(t)} y1={TOP + H} y2={TOP + H + 5}/>
        <text className="artic-overlay__time" x={x(t) + 2} y={TOP + H + 16}>{`${t}${t === 0 ? "" : zh ? "毫秒" : " ms"}`}</text>
      </g>)}
    </svg>
  </div>;
}
