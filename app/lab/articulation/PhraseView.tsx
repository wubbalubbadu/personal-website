"use client";
import {useEffect, useMemo, useRef} from "react";
import {noteName, type Analysis} from "./engine";
import {LENGTH_COLOR} from "./lengthColors";
import {shapeWord} from "./words";
import {useWidth} from "./useWidth";

/**
 * The whole take in one picture, lane by lane:
 * - phrases: a bracket per phrase (notes between breaths) with its loudness shape in words,
 * - loudness: the ~3 ms envelope in grey, and each phrase's loudness line (through each note's peak) in dark,
 * - pitch: every pitch reading as a short dash, with each note's pitch as a solid line and its name,
 * - tone: brightness as a line (higher is brighter, scaled to this take) over breath noise as a shaded area,
 * - notes: a block per note, solid for the time it really sounds, faint for the rest of its time until the next
 *   note, so staccato reads as short solid blocks with long faint tails,
 * - time: seconds.
 * Wider than the screen for long takes; it scrolls sideways and keeps the chosen note in view.
 */
const PHRASE_TOP = 4, LOUD_TOP = 34, LOUD_H = 130, PITCH_TOP = 178, PITCH_H = 74, TONE_TOP = 264, TONE_H = 40, NOTE_TOP = 316, NOTE_H = 20, AXIS_TOP = 346, HEIGHT = 366;
const MIN_PX_PER_SECOND = 120;

export function PhraseView({analysis, selected, onSelect, zh}: {analysis: Analysis; selected: number; onSelect: (index: number) => void; zh: boolean}) {
  const [box, boxWidth] = useWidth<HTMLDivElement>();
  const scroller = useRef<HTMLDivElement>(null);
  const {durationMs, envelopeDb, envelopeHopMs, frames, notes, phrases, gateDb, topDb} = analysis;
  const width = Math.max(boxWidth, Math.ceil((durationMs / 1000) * MIN_PX_PER_SECOND));
  const pxPerMs = width / durationMs;
  const x = (ms: number) => ms * pxPerMs;

  const low = gateDb - 8, high = topDb + 1;
  const loudY = (db: number) => LOUD_TOP + LOUD_H - (Math.max(0, Math.min(1, (db - low) / (high - low))) * LOUD_H);

  const pitched = notes.filter(n => n.midi !== null).map(n => n.midi as number);
  const lowMidi = (pitched.length ? Math.min(...pitched) : 60) - 1.5, highMidi = (pitched.length ? Math.max(...pitched) : 84) + 1.5;
  const pitchY = (midi: number) => PITCH_TOP + PITCH_H - ((midi - lowMidi) / (highMidi - lowMidi)) * PITCH_H;

  // The envelope, one column per pixel (the loudest step in each), as a filled area.
  const envelopePath = useMemo(() => {
    const columns = Math.max(1, Math.round(width));
    const perColumn = envelopeDb.length / columns;
    let path = `M0 ${LOUD_TOP + LOUD_H}`;
    for (let c = 0; c < columns; c++) {
      let peak = -Infinity;
      for (let i = Math.floor(c * perColumn); i < Math.min(envelopeDb.length, Math.floor((c + 1) * perColumn) + 1); i++) peak = Math.max(peak, envelopeDb[i]);
      path += ` L${c} ${loudY(peak).toFixed(1)}`;
    }
    return `${path} L${columns} ${LOUD_TOP + LOUD_H} Z`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envelopeDb, width, gateDb, topDb]);

  const pitchPath = useMemo(() => {
    let path = "";
    for (const frame of frames) {
      if (frame.midi === null || frame.midi < lowMidi || frame.midi > highMidi) continue;
      path += `M${x(frame.at).toFixed(1)} ${pitchY(frame.midi).toFixed(1)}h1.6`;
    }
    return path;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frames, width, lowMidi, highMidi]);

  // Tone colour, one column per few pixels: brightness (centroid relative to pitch) as a line, scaled between this
  // take's dullest and brightest moments, and the breath share as an area. Only where there is a steady tone.
  const tone = useMemo(() => {
    const step = 3, columns = Math.ceil(width / step);
    const bright = new Float64Array(columns), breath = new Float64Array(columns), counts = new Uint16Array(columns);
    const all: number[] = [];
    for (const frame of frames) {
      if (frame.hz === null || frame.noise === null) continue;
      const level = envelopeDb[Math.min(envelopeDb.length - 1, Math.round(frame.at / envelopeHopMs))];
      if (level <= gateDb + 6) continue;
      const c = Math.min(columns - 1, Math.floor(x(frame.at) / step)), value = frame.centroid / frame.hz;
      bright[c] += value; breath[c] += frame.noise; counts[c]++;
      all.push(value);
    }
    all.sort((a, b) => a - b);
    const lo = all[Math.floor(all.length * 0.05)] ?? 1, hi = all[Math.floor(all.length * 0.95)] ?? 2;
    const brightY = (v: number) => TONE_TOP + TONE_H - Math.max(0, Math.min(1, (v - lo) / Math.max(0.05, hi - lo))) * TONE_H;
    const breathY = (v: number) => TONE_TOP + TONE_H - Math.min(1, v / 0.4) * TONE_H;
    let line = "", area = "", pen = false, run: string[] = [], runStart = 0;
    const closeArea = (end: number) => {
      if (run.length) area += `M${runStart} ${TONE_TOP + TONE_H}${run.join("")}L${end} ${TONE_TOP + TONE_H}Z`;
      run = [];
    };
    // Average a few neighbouring columns (within the same stretch of tone) so the line shows the trend, not jitter.
    const around = (values: Float64Array, c: number) => {
      let sum = 0, count = 0;
      for (let k = c; k >= Math.max(0, c - 3) && counts[k]; k--) { sum += values[k]; count += counts[k]; }
      for (let k = c + 1; k <= Math.min(columns - 1, c + 3) && counts[k]; k++) { sum += values[k]; count += counts[k]; }
      return sum / count;
    };
    for (let c = 0; c < columns; c++) {
      if (!counts[c]) { pen = false; closeArea(c * step); continue; }
      const px = c * step + step / 2;
      line += `${pen ? "L" : "M"}${px.toFixed(1)} ${brightY(around(bright, c)).toFixed(1)}`;
      if (!run.length) runStart = px;
      run.push(`L${px.toFixed(1)} ${breathY(around(breath, c)).toFixed(1)}`);
      pen = true;
    }
    closeArea(columns * step);
    return {line, area};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frames, width, envelopeDb, gateDb]);

  // Keep the chosen note in view when it changes (arrow keys, the phrase list, the close-up's arrows).
  useEffect(() => {
    const note = notes[selected], element = scroller.current;
    if (!note || !element) return;
    const left = x(note.startMs), right = x(note.endMs);
    if (left < element.scrollLeft + 24 || right > element.scrollLeft + element.clientWidth - 24) {
      element.scrollTo({left: Math.max(0, left - element.clientWidth / 3), behavior: "smooth"});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, width]);

  function pick(event: React.MouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const ms = ((event.clientX - rect.left) / rect.width) * durationMs;
    let best = 0, distance = Infinity;
    for (const note of notes) {
      if (ms >= note.startMs && ms < note.endMs) { best = note.index; distance = 0; break; }
      const d = Math.min(Math.abs(ms - note.startMs), Math.abs(ms - note.endMs));
      if (d < distance) { distance = d; best = note.index; }
    }
    if (notes.length) onSelect(best);
  }

  const chosen = notes[selected];
  const seconds = Math.floor(durationMs / 1000);
  const tickEvery = pxPerMs * 1000 < 60 ? 5 : 1;

  return <div ref={box} className="artic-phrase">
    <div ref={scroller} className="artic-phrase__scroll">
      <svg width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`} onClick={pick} role="img"
        aria-label={zh ? "整段演奏的音量、音高和音符" : "Loudness, pitch and notes across the take"}>
        {chosen && <rect className="artic-phrase__chosen" x={x(chosen.startMs)} y={0} width={Math.max(2, x(chosen.endMs) - x(chosen.startMs))} height={AXIS_TOP}/>}

        {/* Lane labels */}
        <text className="artic-phrase__lane" x={4} y={LOUD_TOP + 11}>{zh ? "音量" : "Loudness"}</text>
        <text className="artic-phrase__lane" x={4} y={PITCH_TOP + 11}>{zh ? "音高" : "Pitch"}</text>

        {/* Phrases */}
        {phrases.map(phrase => {
          const left = x(phrase.startMs), right = x(phrase.endMs);
          return <g key={phrase.index}>
            <path className="artic-phrase__bracket" d={`M${left + 1} ${PHRASE_TOP + 20}v-6H${right - 1}v6`}/>
            {right - left > 70 && <text className="artic-phrase__phrase" x={left + 4} y={PHRASE_TOP + 9}>{`${zh ? "乐句" : "Phrase"} ${phrase.index + 1} · ${shapeWord(phrase.shape, zh)}`}</text>}
          </g>;
        })}

        {/* Loudness */}
        <path className="artic-phrase__envelope" d={envelopePath}/>
        {phrases.map(phrase => {
          const d = phrase.contour.map((point, k) => `${k ? "L" : "M"}${x(point.at).toFixed(1)} ${loudY(point.db + topDb).toFixed(1)}`).join("");
          return <g key={phrase.index}>
            <path className="artic-phrase__contour" d={d}/>
            {phrase.contour.length < 60 && phrase.contour.map((point, k) => <circle key={k} className="artic-phrase__peak" cx={x(point.at)} cy={loudY(point.db + topDb)} r={2.2}/>)}
          </g>;
        })}

        {/* Pitch */}
        <path className="artic-phrase__pitch" d={pitchPath}/>
        {notes.map(note => note.midi !== null && <g key={note.index}>
          <line className="artic-phrase__note-pitch" x1={x(note.startMs)} x2={Math.max(x(note.startMs) + 2, x(note.marks.soundedTo))} y1={pitchY(note.midi)} y2={pitchY(note.midi)}/>
          {x(note.endMs) - x(note.startMs) > 26 && <text className="artic-phrase__name" x={x(note.startMs)} y={pitchY(note.midi) - 5}>{noteName(note.midi)}</text>}
        </g>)}

        {/* Tone */}
        <text className="artic-phrase__lane" x={4} y={TONE_TOP + 9}>{zh ? "音色" : "Tone"}</text>
        <path className="artic-phrase__breath" d={tone.area}/>
        <path className="artic-phrase__bright" d={tone.line}/>

        {/* Notes: solid while sounding, faint until the next note */}
        {notes.map(note => <g key={note.index} className={note.index === selected ? "artic-phrase__block is-chosen" : "artic-phrase__block"} style={{color: LENGTH_COLOR[note.length]}}>
          <rect x={x(note.startMs)} y={NOTE_TOP} width={Math.max(1, x(note.endMs) - x(note.startMs))} height={NOTE_H} rx={3} className="artic-phrase__rest"/>
          <rect x={x(note.startMs)} y={NOTE_TOP} width={Math.max(2, x(note.marks.soundedTo) - x(note.startMs))} height={NOTE_H} rx={3} className="artic-phrase__sound"/>
        </g>)}

        {/* Time */}
        {Array.from({length: Math.floor(seconds / tickEvery) + 1}, (_, k) => k * tickEvery).map(s => <g key={s}>
          <line className="artic-phrase__tick" x1={x(s * 1000)} x2={x(s * 1000)} y1={AXIS_TOP} y2={AXIS_TOP + 5}/>
          <text className="artic-phrase__time" x={x(s * 1000) + 3} y={AXIS_TOP + 15}>{`${s}s`}</text>
        </g>)}
      </svg>
    </div>
    <p className="artic-sr">{zh ? `每一步 ${envelopeHopMs.toFixed(1)} 毫秒` : `One loudness step every ${envelopeHopMs.toFixed(1)} ms`}</p>
  </div>;
}
