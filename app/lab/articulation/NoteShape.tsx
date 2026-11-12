"use client";
import {useMemo} from "react";
import type {Analysis, Note} from "./engine";
import {useWidth} from "./useWidth";

/**
 * One note, close up: its loudness from just before it starts to just after it ends, scaled to its own peak, with
 * the attack (10% to 90%) and the release shaded and timed, the held level dashed, and the pitch below in cents so
 * you can see it settle. This is the picture to compare when you change your tongue or your air.
 */
const TOP = 18, AMP_H = 150, PITCH_TOP = 190, PITCH_H = 56, HEIGHT = 268;
const BEFORE_MS = 40, AFTER_MS = 70;

export function NoteShape({analysis, note, zh}: {analysis: Analysis; note: Note; zh: boolean}) {
  const [box, width] = useWidth<HTMLDivElement>();
  const {envelopeAmp, envelopeHopMs: hopMs, frames} = analysis;
  const fromMs = Math.max(0, note.startMs - BEFORE_MS);
  const toMs = Math.min(analysis.durationMs, note.endMs + AFTER_MS);
  const x = (ms: number) => ((ms - fromMs) / (toMs - fromMs)) * width;

  const {path, line, peak} = useMemo(() => {
    let max = 0;
    // Scale to the note's own peak, found where the engine found it (not in the next note's bleed at a slur).
    for (let i = Math.floor(note.startMs / hopMs); i <= Math.ceil((note.startMs + note.peakAfterMs) / hopMs); i++) max = Math.max(max, envelopeAmp[i] ?? 0);
    const y = (amp: number) => TOP + AMP_H - Math.min(1.05, amp / (max || 1)) * AMP_H;
    let d = "", l = "";
    const first = Math.floor(fromMs / hopMs), last = Math.min(envelopeAmp.length - 1, Math.ceil(toMs / hopMs));
    for (let i = first; i <= last; i++) {
      const px = x(i * hopMs).toFixed(1), py = y(envelopeAmp[i]).toFixed(1);
      d += `${i === first ? "M" : "L"}${px} ${py}`;
    }
    l = d;
    d += `L${x(last * hopMs).toFixed(1)} ${TOP + AMP_H}L${x(first * hopMs).toFixed(1)} ${TOP + AMP_H}Z`;
    return {path: d, line: l, peak: max};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note, width, envelopeAmp, hopMs]);

  const cents = useMemo(() => {
    if (note.midi === null) return "";
    let d = "", pen = false;
    for (const frame of frames) {
      if (frame.at < fromMs || frame.at > toMs) continue;
      if (frame.midi === null) { pen = false; continue; }
      const c = Math.max(-60, Math.min(60, (frame.midi - note.midi) * 100));
      const py = PITCH_TOP + PITCH_H / 2 - (c / 60) * (PITCH_H / 2);
      d += `${pen ? "L" : "M"}${x(frame.at).toFixed(1)} ${py.toFixed(1)}`;
      pen = true;
    }
    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note, width, frames]);

  const {attackFrom, attackTo, releaseFrom, releaseTo, soundedTo} = note.marks;
  const heldY = TOP + AMP_H - note.sustainLevel * AMP_H;
  const ms = (value: number) => `${value} ${zh ? "毫秒" : "ms"}`;
  const label = (from: number, to: number, text: string, row: number) => {
    const centre = (x(from) + x(to)) / 2;
    const anchor = centre < 50 ? "start" : centre > width - 50 ? "end" : "middle";
    return <text className="artic-shape__mark" x={anchor === "start" ? Math.max(2, x(from)) : anchor === "end" ? Math.min(width - 2, x(to)) : centre} y={TOP - 6 + row * 12} textAnchor={anchor}>{text}</text>;
  };

  return <div ref={box} className="artic-shape">
    <svg width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`} role="img"
      aria-label={zh ? `音头 ${note.attackMs} 毫秒，结尾 ${note.releaseMs} 毫秒` : `Attack ${note.attackMs} ms, release ${note.releaseMs} ms`}>
      {note.attack !== "none" && <rect className="artic-shape__attack" x={x(attackFrom)} y={TOP} width={Math.max(1, x(attackTo) - x(attackFrom))} height={AMP_H}/>}
      {note.release !== "joined" && <rect className="artic-shape__release" x={x(releaseFrom)} y={TOP} width={Math.max(1, x(releaseTo) - x(releaseFrom))} height={AMP_H}/>}
      <line className="artic-shape__start" x1={x(note.startMs)} x2={x(note.startMs)} y1={TOP} y2={TOP + AMP_H}/>
      <line className="artic-shape__start" x1={x(note.endMs)} x2={x(note.endMs)} y1={TOP} y2={TOP + AMP_H}/>
      <line className="artic-shape__held" x1={x(attackTo)} x2={x(releaseFrom)} y1={heldY} y2={heldY}/>
      {peak > 0 && <path className="artic-shape__fill" d={path}/>}
      {peak > 0 && <path className="artic-shape__line" d={line}/>}
      <line className="artic-shape__sounded" x1={x(note.startMs)} x2={x(soundedTo)} y1={TOP + AMP_H + 8} y2={TOP + AMP_H + 8}/>
      <text className="artic-shape__mark" x={x(note.startMs)} y={TOP + AMP_H + 20}>{`${zh ? "响了" : "sounds"} ${ms(note.soundedMs)}${note.gapToNextMs ? ` / ${ms(note.gapToNextMs)}` : ""}`}</text>
      {note.attack !== "none" && label(attackFrom, attackTo, `${zh ? "音头" : "attack"} ${ms(note.attackMs)}`, 0)}
      {note.release !== "joined" && label(releaseFrom, releaseTo, `${zh ? "结尾" : "release"} ${ms(note.releaseMs)}`, 1)}

      <line className="artic-shape__zero" x1={0} x2={width} y1={PITCH_TOP + PITCH_H / 2} y2={PITCH_TOP + PITCH_H / 2}/>
      <text className="artic-shape__axis" x={2} y={PITCH_TOP + 9}>+60¢</text>
      <text className="artic-shape__axis" x={2} y={PITCH_TOP + PITCH_H - 2}>−60¢</text>
      {cents && <path className="artic-shape__cents" d={cents}/>}
      {note.settleMs !== null && <line className="artic-shape__settle" x1={x(note.startMs + note.settleMs)} x2={x(note.startMs + note.settleMs)} y1={PITCH_TOP} y2={PITCH_TOP + PITCH_H}/>}
    </svg>
  </div>;
}
