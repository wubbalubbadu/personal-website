"use client";

import { useEffect, useRef, useState } from "react";
import { NoteListener, type Note } from "./listener";
import { drawingFor, type Drawing } from "./mapping";
import "./raindrops.css";

type Shape = { note: Note; drawing: Drawing; x: number; y: number; bornAt: number; endedAt: number | null };
type Mode = "off" | "mic" | "recording";

const NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const noteName = (hz: number | null) => {
  if (!hz) return "–";
  const midi = Math.round(69 + 12 * Math.log2(hz / 440));
  return `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
};

export default function Raindrops() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const listenerRef = useRef<NoteListener | null>(null);
  const [mode, setMode] = useState<Mode>("off");
  const [showNumbers, setShowNumbers] = useState(false);
  const [micBlocked, setMicBlocked] = useState(false);
  const [recent, setRecent] = useState<Note[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const listener = new NoteListener();
    listenerRef.current = listener;
    const shapes = new Map<number, Shape>();

    const place = (note: Note) => {
      let shape = shapes.get(note.id);
      if (!shape) {
        const margin = 60;
        shape = {
          note,
          drawing: drawingFor(note),
          x: margin + Math.random() * (canvas.clientWidth - margin * 2),
          y: margin + Math.random() * (canvas.clientHeight - margin * 2),
          bornAt: performance.now(),
          endedAt: null,
        };
        shapes.set(note.id, shape);
      }
      shape.note = note;
      shape.drawing = drawingFor(note);
      return shape;
    };
    listener.onUpdate = (note) => place(note);
    listener.onEnd = (note) => {
      place(note).endedAt = performance.now();
      setRecent((list) => [note, ...list].slice(0, 8));
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let frame = 0;
    const draw = () => {
      listener.tick();
      const now = performance.now();
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      for (const [id, shape] of shapes) {
        const { drawing: d } = shape;
        const fadeIn = Math.min(1, (now - shape.bornAt) / Math.max(1, d.fadeInMs));
        const fadeOut = shape.endedAt === null ? 1 : 1 - (now - shape.endedAt) / Math.max(1, d.fadeOutMs);
        if (fadeOut <= 0) {
          shapes.delete(id);
          continue;
        }
        const alpha = Math.max(0, Math.min(1, d.opacity)) * fadeIn * fadeOut;
        const radius = Math.max(1, d.size);
        const solid = Math.max(0, Math.min(0.98, d.edge));
        const gradient = ctx.createRadialGradient(shape.x, shape.y, 0, shape.x, shape.y, radius);
        gradient.addColorStop(0, `hsla(${d.hue}, 70%, 70%, ${alpha})`);
        gradient.addColorStop(solid, `hsla(${d.hue}, 70%, 70%, ${alpha})`);
        gradient.addColorStop(1, `hsla(${d.hue}, 70%, 70%, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(shape.x, shape.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      listener.stop();
    };
  }, []);

  const startMic = async () => {
    try {
      await listenerRef.current!.useMic();
      setRecent([]);
      setMicBlocked(false);
      setMode("mic");
    } catch {
      setMicBlocked(true);
      setMode("off");
    }
  };

  const startRecording = async (file: File | undefined) => {
    if (!file) return;
    await listenerRef.current!.useRecording(file, () => setMode("off"));
    setRecent([]);
    setMode("recording");
  };

  const stop = () => {
    listenerRef.current!.stop();
    setMode("off");
  };

  return (
    <main className="drops">
      <canvas ref={canvasRef} className="drops__canvas" />
      <div className="drops__bar">
        {mode === "off" ? (
          <>
            <button type="button" onClick={startMic}>{micBlocked ? "Mic blocked" : "Mic"}</button>
            <button type="button" onClick={() => fileRef.current?.click()}>Recording</button>
          </>
        ) : (
          <button type="button" onClick={stop}>Stop</button>
        )}
        <button type="button" aria-pressed={showNumbers} onClick={() => setShowNumbers((on) => !on)}>
          123
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          hidden
          onChange={(event) => {
            startRecording(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>
      {showNumbers && (
        <table className="drops__numbers">
          <thead>
            <tr><th>pitch</th><th>vol</th><th>attack</th><th>length</th><th>ending</th></tr>
          </thead>
          <tbody>
            {recent.map((note) => (
              <tr key={note.id}>
                <td>{noteName(note.hz)}</td>
                <td>{Math.round(note.volume * 100)}</td>
                <td>{Math.round(note.attackMs)}</td>
                <td>{Math.round(note.lengthMs)}</td>
                <td>{Math.round(note.endingMs ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
