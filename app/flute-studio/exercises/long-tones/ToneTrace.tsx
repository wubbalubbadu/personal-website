"use client";

/**
 * The live pitch trace.
 *
 * The honest half of "sound analysis": hold a note and watch the line. A
 * flat line means a steady note, and that is a fact rather than a verdict —
 * no claim about whether the sound is good, only about whether the pitch
 * held still, which is measurable and which a student can act on.
 *
 * Everything shown here is derived from what the segmenter produced. This
 * file draws; it does not decide.
 */
import { useMemo } from "react";
import { centsFromMidi } from "../../lib/pitch";
import { summarise, type PlayedNote } from "../../lib/noteSegmenter";
import { usePitchStream } from "../../lib/usePitchStream";
import { noteName } from "./long-tone-score";
import "./tone-trace.css";

/** Cents shown top to bottom. A semitone is 100, so this is ±a quarter tone. */
const SPAN_CENTS = 50;
/** Inside this many cents reads as in tune to an audience. */
const TOLERANCE_CENTS = 10;
/** The trace window starts here and grows to fit a longer note. */
const BASE_WINDOW_MS = 12000;

const VIEW_W = 1000;
const VIEW_H = 220;

/** Cents to a y coordinate. Sharp is up, which is how players picture it. */
const yFor = (cents: number) =>
  VIEW_H / 2 - (Math.max(-SPAN_CENTS, Math.min(SPAN_CENTS, cents)) / SPAN_CENTS) * (VIEW_H / 2);

export function ToneTrace({ zh = false }: { zh?: boolean }) {
  const { status, live, notes, start, stop, reset } = usePitchStream();
  const listening = status === "listening" || status === "starting";

  // A long tone can outlast the window, and when it does the whole note
  // matters more than a constant scroll speed — running out of air shows up
  // as a sag in the last few seconds, which you cannot see if it has already
  // scrolled away.
  const held = live ? (live.frames.at(-1)!.at - live.startedAt) : 0;
  const windowMs = Math.max(BASE_WINDOW_MS, Math.ceil(held / 4000) * 4000);

  const path = useMemo(() => {
    if (!live || live.frames.length < 2) return "";
    const endAt = live.frames.at(-1)!.at;
    const startAt = Math.max(live.startedAt, endAt - windowMs);
    return live.frames
      .filter(frame => frame.at >= startAt)
      .map((frame, index) => {
        const x = ((frame.at - startAt) / windowMs) * VIEW_W;
        return `${index ? "L" : "M"}${x.toFixed(1)} ${yFor(centsFromMidi(frame.hz, live.midi)).toFixed(1)}`;
      })
      .join(" ");
  }, [live, windowMs]);

  const nowCents = live?.frames.length ? centsFromMidi(live.frames.at(-1)!.hz, live.midi) : null;
  const inTune = nowCents !== null && Math.abs(nowCents) <= TOLERANCE_CENTS;

  // Long enough to be a long tone rather than a stray blip while you settle.
  const holds = notes.filter(note => (note.endedAt ?? 0) - note.startedAt >= 1500).slice(-6).reverse();

  // Collapsed until there is something to look at: the panel is pinned over
  // the music, so an idle trace would cost the reader a third of its page
  // for an empty chart.
  const expanded = listening || holds.length > 0;

  return <section className={expanded ? "tone-trace is-open" : "tone-trace"}>
    <header className="tone-trace__head">
      <div className="tone-trace__label">
        <strong>{zh ? "音准轨迹" : "Pitch trace"}</strong>
        <small>{zh ? "平直即稳定 · 绿带 ±10 音分，全高 ±50" : "A flat line is a steady note · band ±10¢, full height ±50¢"}</small>
      </div>
      <div className="tone-trace__actions">
        {holds.length > 0 && !listening &&
          <button type="button" className="tone-trace__ghost" onClick={reset}>{zh ? "清除" : "Clear"}</button>}
        <button type="button" className={listening ? "tone-trace__listen is-on" : "tone-trace__listen"}
          onClick={() => (listening ? stop() : start())}>
          {listening ? (zh ? "停止" : "Stop") : (zh ? "开始" : "Start")}
        </button>
      </div>
    </header>

    {expanded && <div className="tone-trace__plot">
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none" role="img"
        aria-label={zh ? "音准轨迹图" : "Pitch over time"}>
        <rect className="tone-trace__band" x="0" y={yFor(TOLERANCE_CENTS)}
          width={VIEW_W} height={yFor(-TOLERANCE_CENTS) - yFor(TOLERANCE_CENTS)} />
        <line className="tone-trace__centre" x1="0" y1={VIEW_H / 2} x2={VIEW_W} y2={VIEW_H / 2} />
        {[25, -25].map(cents =>
          <line key={cents} className="tone-trace__grid" x1="0" y1={yFor(cents)} x2={VIEW_W} y2={yFor(cents)} />)}
        {path && <path className="tone-trace__line" d={path} />}
      </svg>

      {/* The reading sits outside the SVG: preserveAspectRatio "none"
          stretches the drawing to the panel, which would stretch any text
          drawn inside it too. */}
      {live && nowCents !== null
        ? <div className={inTune ? "tone-trace__reading is-in" : "tone-trace__reading"}>
            <b>{noteName(live.midi, false)}</b>
            <span>{nowCents > 0 ? "+" : nowCents < 0 ? "−" : ""}{Math.abs(nowCents).toFixed(0)}<i>¢</i></span>
            <small>{(held / 1000).toFixed(1)}s</small>
          </div>
        : <p className="tone-trace__hint">
            {status === "listening" ? (zh ? "吹一个长音" : "Play a note and hold it")
              : status === "starting" ? (zh ? "正在打开麦克风…" : "Opening the microphone…")
              : status === "denied" ? (zh ? "麦克风权限被拒绝" : "Microphone access was denied")
              : status === "unavailable" ? (zh ? "此浏览器不支持麦克风" : "This browser has no microphone input")
              : (zh ? "按“开始”，然后吹一个长音" : "Press Start, then hold a note")}
          </p>}
    </div>}

    {holds.length > 0 && <ol className="tone-trace__holds">
      {holds.map(note => <HoldRow key={note.startedAt} note={note} zh={zh} />)}
    </ol>}
  </section>;
}

/**
 * One finished note.
 *
 * Duration and drift, and nothing else. Drift is the long-tone question —
 * a note that starts in tune and sags a quarter tone as the air runs out is
 * the thing these exercises exist to fix, and it is invisible while you play
 * it because your ear follows the note down.
 */
function HoldRow({ note, zh }: { note: PlayedNote; zh?: boolean }) {
  const summary = summarise(note);
  const spread = summary.maxCents - summary.minCents;
  const steady = spread <= TOLERANCE_CENTS * 2;
  return <li className="tone-trace__hold">
    <b>{noteName(summary.midi, false)}</b>
    <span>{(summary.durationMs / 1000).toFixed(1)}s</span>
    <span className={steady ? "tone-trace__spread is-steady" : "tone-trace__spread"}>
      {zh ? "波动" : "spread"} {spread.toFixed(0)}¢
    </span>
    <span className="tone-trace__drift">
      {zh ? "漂移" : "drift"} {summary.driftCents > 0 ? "+" : summary.driftCents < 0 ? "−" : ""}
      {Math.abs(summary.driftCents).toFixed(0)}¢
    </span>
  </li>;
}
