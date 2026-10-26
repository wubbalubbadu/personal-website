"use client";

import { useEffect, useRef, useState } from "react";
import type { RehearsalEngine, RoomSettings } from "./rehearsal-engine";
import "./rehearsal-room.css";

const INITIAL: RoomSettings = { palette: "rose", evening: false, resting: false, angle: 0 };

export default function RehearsalRoom() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<RehearsalEngine | null>(null);
  const [settings, setSettings] = useState(INITIAL);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let room: RehearsalEngine | undefined;
    import("./rehearsal-engine").then(({ RehearsalEngine }) => {
      if (cancelled || !canvas.current) return;
      room = new RehearsalEngine(canvas.current);
      engine.current = room;
      setStatus("ready");
    }).catch(() => { if (!cancelled) setStatus("failed"); });
    return () => { cancelled = true; room?.dispose(); engine.current = null; };
  }, [retry]);

  useEffect(() => { engine.current?.update(settings); }, [settings, status]);

  return (
    <section className="rr" id="rehearsal-room" aria-labelledby="rr-title" data-palette={settings.palette}>
      <header className="rr-heading">
        <div><h2 id="rr-title">A room for a little music.</h2><p>A sunlit corner, a silver flute, and absolutely no hurry.</p></div>
        <span className="rr-stamp">A new little world</span>
      </header>
      <div className="rr-body">
        <div className="rr-scene">
          <canvas ref={canvas} role="img" aria-label={`A miniature ${settings.palette === "rose" ? "pink" : "blue"} music room in ${settings.evening ? "evening lamplight" : "daylight"}, with a white cat ${settings.resting ? "napping on the rug" : "holding a flute"}, an upright piano, sheet music, and plants.`} />
          {status !== "ready" && <div className="rr-loading" role="status">
            {status === "loading" ? "Setting out the sheet music…" : <><p>This room needs WebGL to open.</p><button type="button" onClick={() => { setStatus("loading"); setRetry(n => n + 1); }}>Try again</button></>}
          </div>}
          <p className="rr-caption" aria-live="polite">{settings.resting ? "A well-earned intermission." : settings.evening ? "Just one more phrase before bedtime." : "The afternoon is yours."}</p>
        </div>
        <div className="rr-controls">
          <fieldset><legend>Room color</legend><div className="rr-choices">
            <button type="button" aria-pressed={settings.palette === "rose"} onClick={() => setSettings(s => ({ ...s, palette: "rose" }))}><span className="rr-swatch rr-swatch--rose" />Rose</button>
            <button type="button" aria-pressed={settings.palette === "blue"} onClick={() => setSettings(s => ({ ...s, palette: "blue" }))}><span className="rr-swatch rr-swatch--blue" />Blue</button>
          </div></fieldset>
          <fieldset><legend>By the window</legend><div className="rr-choices">
            <button type="button" aria-pressed={!settings.evening} onClick={() => setSettings(s => ({ ...s, evening: false }))}>Daylight</button>
            <button type="button" aria-pressed={settings.evening} onClick={() => setSettings(s => ({ ...s, evening: true }))}>Evening</button>
          </div></fieldset>
          <fieldset><legend>A little moment</legend><div className="rr-choices">
            <button type="button" aria-pressed={!settings.resting} onClick={() => setSettings(s => ({ ...s, resting: false }))}>Practice</button>
            <button type="button" aria-pressed={settings.resting} onClick={() => setSettings(s => ({ ...s, resting: true }))}>Catnap</button>
          </div></fieldset>
          <label className="rr-angle">Look around<input type="range" min={-30} max={30} step={1} value={settings.angle} onChange={e => setSettings(s => ({ ...s, angle: Number(e.target.value) }))} /><span>Left <span>Right</span></span></label>
          <button className="rr-reset" type="button" onClick={() => setSettings(INITIAL)}>Reset room</button>
          <p className="rr-note">A quiet, sound-free scene. Make yourself at home.</p>
        </div>
      </div>
    </section>
  );
}
