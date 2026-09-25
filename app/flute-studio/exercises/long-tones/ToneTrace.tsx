'use client';
import { useEffect, useRef } from 'react';
import { traceY } from '../../lib/toneTrace';
import { centsFromMidi } from '../../lib/pitch';
import { toneFinding, toneSummary, type ToneAttempt } from '../../lib/toneSession';

const W = 1000, H = 200;
/** Horizontal room per second: condensed enough that ~15s fit in the panel. Longer takes scroll; they never squeeze. */
const PX_PER_SECOND = 48;
/**
 * The timeline is a fixed window, like a tuner's trace, not stretched to fit
 * what was played: a 2s note fills the left of it and the line grows right.
 * It widens in 5s steps and always keeps at least 3s of empty room ahead,
 * so the newest point is never pinned against the edge.
 */
const MIN_WINDOW_MS = 15000, STEP_MS = 5000, AHEAD_MS = 3000;
const windowFor = (played: number) => Math.max(MIN_WINDOW_MS, Math.ceil((played + AHEAD_MS) / STEP_MS) * STEP_MS);
/** Every 10 cents gets a gridline, like a tuner; ±10 is the in-tune band. */
const GRID = [30, 20, 10, 0, -10, -20, -30];
/** The line is coloured by where it is at that moment, not by the note's overall grade. */
const band = (cents: number) => Math.abs(cents) <= 10 ? 'in' : Math.abs(cents) <= 20 ? 'near' : 'off';
/** Loudness as 0–1: about −50 dB (a whisper of breath) to −10 dB (full tone). */
const loudness = (rms: number) => Math.max(0, Math.min(1, (20 * Math.log10(Math.max(rms, 1e-6)) + 50) / 40));
/**
 * The first and last instants of a note are the slur or attack arriving and
 * the air stopping. They are real, but drawn they read as huge spikes at every
 * boundary, so the drawing skips them. The numbers already ignore them too.
 */
const ATTACK_MS = 60, RELEASE_MS = 100;
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(Math.round(n))}`;
const endOf = (a: ToneAttempt) => a.endedAt ?? a.frames.at(-1)?.at ?? a.startedAt;

/**
 * One take of one group: every note in it, side by side, each measured
 * against its own written pitch. Labels are HTML over the plot, not SVG
 * text, because the plot stretches to fit and would stretch the letters.
 */
export function ToneTrace({attempts, selectedId=null, onSelect, zh=false}: {attempts: ToneAttempt[]; selectedId?: number|null; onSelect?: (attemptId: number) => void; zh?: boolean}) {
  const scroll = useRef<HTMLDivElement>(null);
  const first = attempts[0]?.startedAt ?? 0;
  const played = attempts.length ? endOf(attempts.at(-1)!) - first : 0;
  const total = windowFor(played);
  const pct = (at: number) => (at - first) / total * 100;
  const segments = attempts.map((a, i) => ({ a, start: pct(a.startedAt), end: i < attempts.length - 1 ? pct(attempts[i + 1].startedAt) : pct(first + played) }));
  // Keep the selected note in view; with nothing selected, follow the newest sound.
  const selected = segments.find(s => s.a.id === selectedId);
  const liveEnd = attempts.length ? endOf(attempts.at(-1)!) : 0;
  const focus = selected ? (selected.start + selected.end) / 200 : null;
  useEffect(() => {
    const el = scroll.current;
    if (!el) return;
    // Following the live note keeps it three-quarters across, with room ahead.
    el.scrollLeft = (focus ?? played / total) * el.scrollWidth - el.clientWidth * (focus === null ? .75 : .5);
  }, [focus, liveEnd, played, total]);
  if (!attempts.length) return <p className="tone-analysis-empty">{zh ? '吹奏后，这一组的音准会显示在这里。' : 'Play this group and its pitch will show here.'}</p>;
  const seconds = total / 1000;
  const step = seconds > 30 ? 5 : 2;
  const ticks = Array.from({length: Math.floor(seconds / step) + 1}, (_, i) => i * step);
  return <section className="tone-analysis" aria-label={zh ? '音准分析' : 'Pitch analysis'}>
    <div className="tone-plot-frame">
      <div className="tone-axis" aria-hidden="true">{GRID.map(c => <span key={c} className={c === 0 ? 'is-zero' : ''} style={{top: `${traceY(c) / 2}%`}}>{c > 0 ? `+${c}` : c < 0 ? `−${-c}` : '0'}</span>)}</div>
      <div className="tone-plot-scroll" ref={scroll}>
        <div className="tone-plot-canvas" style={{minWidth: `${Math.round(seconds * PX_PER_SECOND)}px`}}>
          <div className="tone-segment-labels">{segments.map(({a, start, end}) =>
            <button key={a.id} className={a.id === selectedId ? 'is-selected' : ''} style={{left: `${start}%`, width: `${end - start}%`}} onClick={() => onSelect?.(a.id)}>{a.target.pitch}</button>)}</div>
          <svg className="tone-plot" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={zh ? '横轴为秒，纵轴为相对谱面音高的音分' : 'Cents from the written pitch over time'}>
            {selected && <rect x={selected.start * W / 100} y="0" width={(selected.end - selected.start) * W / 100} height={H} className="tone-plot-selected"/>}
            <rect x="0" y={traceY(10)} width={W} height={traceY(-10) - traceY(10)} className="tone-plot-band"/>
            {GRID.map(c => <line key={c} x1="0" x2={W} y1={traceY(c)} y2={traceY(c)} className={c === 0 ? 'tone-plot-zero' : 'tone-plot-grid'}/>)}
            {segments.slice(1).map(({a, start}) => <line key={a.id} x1={start * W / 100} x2={start * W / 100} y1="0" y2={H} className="tone-plot-divider"/>)}
            {(() => {
              // One continuous trace across the whole group. Each note is still
              // measured against its own written pitch; the messy instants at a
              // boundary are skipped and the line bridges straight across them,
              // so a slur reads as one line, not separate pieces. Only a real
              // breath (or a detection gap within a note) breaks it.
              type Point = {at: number; cents: number; rms: number; note: number};
              const points: Point[] = attempts.flatMap((a, note) => {
                const end = endOf(a);
                return a.frames.filter(f => f.at - a.startedAt >= ATTACK_MS && end - f.at >= RELEASE_MS)
                  .map(f => ({at: f.at, cents: centsFromMidi(f.hz, a.target.midi), rms: f.rms ?? 0, note}));
              });
              const runs: Point[][] = [];
              points.forEach((p, i) => {
                const prev = points[i - 1];
                const broken = !prev || p.at - prev.at > (p.note === prev.note ? 140 : 450);
                if (broken) runs.push([p]); else runs.at(-1)!.push(p);
              });
              const x = (at: number) => (pct(at) * W / 100).toFixed(2);
              const h = (p: Point) => loudness(p.rms) * 46;
              const envelope = runs.filter(r => r.length > 1).map(r =>
                'M' + r.map(p => `${x(p.at)},${(H / 2 - h(p)).toFixed(1)}`).join(' L') + ' L' + [...r].reverse().map(p => `${x(p.at)},${(H / 2 + h(p)).toFixed(1)}`).join(' L') + 'Z');
              // Pitch, split into pieces by colour; each piece starts where the previous one ended.
              const pieces: {cls: string; d: string}[] = [];
              for (const r of runs) {
                let current: {cls: string; points: string[]} | null = null, last = '';
                for (const p of r) {
                  const cls = band(p.cents), point = `${x(p.at)},${traceY(p.cents).toFixed(2)}`;
                  if (!current || current.cls !== cls) { if (current) pieces.push({cls: current.cls, d: 'M' + current.points.join(' L')}); current = {cls, points: last ? [last] : []}; }
                  current.points.push(point); last = point;
                }
                if (current) pieces.push({cls: current.cls, d: 'M' + current.points.join(' L')});
              }
              return <>
                {envelope.map((d, i) => <path key={`v${i}`} d={d} className="tone-plot-volume"/>)}
                {pieces.map((p, i) => <path key={i} d={p.d} className={`tone-plot-line is-${p.cls}`}/>)}
              </>;
            })()}
          </svg>
          <div className="tone-time-axis" aria-hidden="true">{ticks.map(t => <span key={t} style={{left: `${t / seconds * 100}%`}}>{t}s</span>)}</div>
        </div>
      </div>
    </div>
    <div className="tone-note-cards">{attempts.map(a => {
      const f = toneFinding(a, zh), s = toneSummary(a);
      return <button key={a.id} className={`tone-note-card grade-${f.grade} ${a.id === selectedId ? 'is-selected' : ''}`} onClick={() => onSelect?.(a.id)}>
        <span className="tone-note-card-head"><b>{a.target.pitch}</b><span>{(s.duration / 1000).toFixed(1)}s</span></span>
        <strong>{f.text}</strong>
        {s.reliable && <small>{zh ? '中心' : 'Center'} {signed(s.center)}¢ · {zh ? '结尾' : 'Ending'} {signed(s.drift)}¢</small>}
      </button>;
    })}</div>
  </section>;
}
