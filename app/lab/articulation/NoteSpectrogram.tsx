"use client";
import {useEffect, useMemo, useRef} from "react";
import {spectrogram, type Note} from "./engine";
import {useWidth} from "./useWidth";

/**
 * The chosen note's spectrogram, on the same time range as its close-up: time across, frequency up (to 6 kHz),
 * darker is louder. A clean flute tone is a stack of horizontal lines (the overtones); breath shows as haze between
 * them, and the tongue as a short vertical smear at the start.
 */
const HEIGHT = 170, MAX_HZ = 6000, FLOOR_DB = -72;
const BEFORE_MS = 40, AFTER_MS = 70, LONGEST_MS = 4000;
/** White, through the studio's lavender and plum, to ink. */
const STOPS: [number, number, number][] = [[255, 255, 255], [214, 201, 224], [150, 122, 170], [98, 86, 122], [41, 42, 51]];

function colour(t: number): [number, number, number] {
  const x = Math.max(0, Math.min(1, t)) * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(x)), f = x - i;
  const a = STOPS[i], b = STOPS[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

export function NoteSpectrogram({samples, sampleRate, durationMs, note, zh}: {samples: Float32Array; sampleRate: number; durationMs: number; note: Note; zh: boolean}) {
  const [box, width] = useWidth<HTMLDivElement>();
  const canvas = useRef<HTMLCanvasElement>(null);
  const fromMs = Math.max(0, note.startMs - BEFORE_MS);
  const toMs = Math.min(durationMs, note.endMs + AFTER_MS, fromMs + LONGEST_MS);
  const view = useMemo(() => spectrogram(samples, sampleRate, fromMs, toMs, MAX_HZ), [samples, sampleRate, fromMs, toMs]);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    // Draw the cells once at their own size, then let the browser scale them to the box.
    const cells = document.createElement("canvas");
    cells.width = view.columns;
    cells.height = view.rows;
    const context = cells.getContext("2d");
    if (!context) return;
    const image = context.createImageData(view.columns, view.rows);
    for (let c = 0; c < view.columns; c++) {
      for (let r = 0; r < view.rows; r++) {
        // A curve that keeps the quiet floor pale, so the overtones and real breath noise stand out.
        const [red, green, blue] = colour(Math.max(0, 1 - view.data[c * view.rows + r] / FLOOR_DB) ** 1.8);
        const k = ((view.rows - 1 - r) * view.columns + c) * 4; // low frequencies at the bottom
        image.data[k] = red; image.data[k + 1] = green; image.data[k + 2] = blue; image.data[k + 3] = 255;
      }
    }
    context.putImageData(image, 0, 0);
    const ratio = window.devicePixelRatio || 1;
    element.width = Math.round(width * ratio);
    element.height = Math.round(HEIGHT * ratio);
    const target = element.getContext("2d");
    if (!target) return;
    target.imageSmoothingEnabled = true;
    target.drawImage(cells, 0, 0, element.width, element.height);
  }, [view, width]);

  const span = toMs - fromMs;
  const x = (ms: number) => ((ms - fromMs) / span) * width;
  const y = (hz: number) => HEIGHT - (hz / MAX_HZ) * HEIGHT;

  return <div ref={box} className="artic-spectro">
    <canvas ref={canvas} style={{width, height: HEIGHT}} role="img"
      aria-label={zh ? "这个音的频谱图：横向是时间，纵向是频率，越深越响" : "This note's spectrogram: time across, frequency up, darker is louder"}/>
    <svg width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`} aria-hidden="true">
      {[1000, 2000, 3000, 4000, 5000].map(hz => <g key={hz}>
        <line className="artic-spectro__grid" x1={0} x2={8} y1={y(hz)} y2={y(hz)}/>
        <text className="artic-spectro__axis" x={10} y={y(hz) + 3.5}>{`${hz / 1000} kHz`}</text>
      </g>)}
      <line className="artic-spectro__edge" x1={x(note.startMs)} x2={x(note.startMs)} y1={0} y2={HEIGHT}/>
      {note.endMs <= toMs && <line className="artic-spectro__edge" x1={x(note.endMs)} x2={x(note.endMs)} y1={0} y2={HEIGHT}/>}
    </svg>
  </div>;
}
