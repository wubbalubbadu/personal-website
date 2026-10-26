"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { FluteDiagram } from "../components/FluteDiagram";
import { StaffNote } from "../components/StaffNote";
import { useLanguage } from "../i18n/LanguageContext";
import { REGISTERS, fluteFingerings, midiForPitch, registerForMidi, type NoteFingerings } from "../../../content/fingerings/flute";
import { trillPitches } from "../../../content/fingerings/trills";
import { NotePicker, PitchName, StepButton, nearestSameName, staffBoxStyle, staffStep } from "./NotePicker";
import "./fingerings.css";

/**
 * The fingering chart.
 *
 * One note at a time, large: its staff, its name and its fingering, with any
 * alternates as choices under the name. Under that, an octave switch and that
 * octave's notes. The octaves are the flute's registers (split at E, see
 * REGISTERS) rather than a 41-note strip, since the third octave uses
 * different, harmonic fingerings.
 *
 * Alternates are one choice at a time: a beginner needs one B♭, not three.
 */
const registerOf = (note: NoteFingerings) => registerForMidi(midiForPitch(note.pitch));
const writtenStep = (note: NoteFingerings) => staffStep(`${note.names[0][0]}${note.pitch.slice(-1)}`);
const SHORT: Record<string, [string, string]> = {
  first: ["First", "第一"],
  second: ["Second", "第二"],
  third: ["Third", "第三"],
  altissimo: ["Altissimo", "超高"],
};

export default function FingeringChart() {
  const { lang } = useLanguage();
  const zh = lang === "zh";
  const params = useSearchParams();
  const requested = params.get("note");
  const [selectedPitch, setPitch] = useState<string | null>(null);
  const pitch = selectedPitch ?? (fluteFingerings.some(n => n.pitch === requested) ? requested! : "C4");
  const [variant, setVariant] = useState(0);

  const index = Math.max(0, fluteFingerings.findIndex(n => n.pitch === pitch));
  const note = fluteFingerings[index];
  const fingering = note.fingerings[Math.min(variant, note.fingerings.length - 1)];
  const activeRegister = registerOf(note).id;
  const octaveNotes = fluteFingerings.filter(n => registerOf(n).id === activeRegister);
  // Size the staff for the whole octave, so the arrows never make it jump.
  const highest = Math.max(...octaveNotes.map(writtenStep));
  const midi = midiForPitch(note.pitch);
  const trillBase = trillPitches.find(p => midiForPitch(p) === midi);

  const select = (next: string) => {
    setPitch(next);
    setVariant(0);
  };
  // Another octave shows the same note there (C♯ stays C♯), or the octave's lowest note.
  const pickOctave = (id: string) => {
    const notes = fluteFingerings.filter(n => registerOf(n).id === id);
    select(nearestSameName(notes.map(n => n.pitch), note.pitch));
  };
  const step = (by: number) => {
    const next = fluteFingerings[index + by];
    return next ? () => select(next.pitch) : undefined;
  };
  const use = zh ? fingering.zhUse : fingering.use;

  return (
    <main className="fingering-chart">
      <div className="fingering-chart__content">
        <header className="fingering-chart__header">
          <h1>{zh ? "指法表" : "Fingering chart"}</h1>
        </header>

        <section className="chart-now fingering-chart__now" aria-live="polite">
          <div className="chart-now__music">
            <StepButton direction="previous" onClick={step(-1)} zh={zh} />
            <div className="chart-staff" style={staffBoxStyle(highest)}>
              <StaffNote midi={midi} spelling={note.names[0]} width={400} />
            </div>
            <StepButton direction="next" onClick={step(1)} zh={zh} />
          </div>
          <div className="chart-now__detail">
            <h2>
              {note.names.join(" / ")}
              <sub>{note.pitch.slice(-1)}</sub>
            </h2>
            {note.fingerings.length > 1 && (
              <div className="chart-choices" role="group" aria-label={zh ? "其他指法" : "Other fingerings"}>
                {note.fingerings.map((option, i) => (
                  <button key={option.label ?? i} type="button" aria-pressed={i === variant} onClick={() => setVariant(i)}>
                    {(zh ? option.zhLabel : option.label) ?? (zh ? "标准" : "Standard")}
                  </button>
                ))}
              </div>
            )}
            {use && <p className="chart-now__use">{use}</p>}
            {fingering.requires === "b-foot" && <p className="chart-now__requires">{zh ? "需要 B 尾管" : "Needs a B foot"}</p>}
          </div>
          <FluteDiagram pressed={fingering.keys} className="chart-now__diagram" />
          {trillBase && (
            <Link className="chart-now__sibling" href={`/flute-studio/trills?note=${encodeURIComponent(trillBase)}`}>
              {zh ? <>从 <PitchName value={trillBase} /> 开始的颤音</> : <>Trills from <PitchName value={trillBase} /></>}
            </Link>
          )}
        </section>

        <NotePicker
          zh={zh}
          octaves={REGISTERS.filter(r => fluteFingerings.some(n => registerOf(n).id === r.id)).map(r => ({
            id: r.id,
            label: SHORT[r.id][zh ? 1 : 0],
            title: zh ? r.zh : r.en,
          }))}
          octave={activeRegister}
          onOctave={pickOctave}
          notes={octaveNotes.map(n => ({ pitch: n.pitch, label: <PitchName value={`${n.names[0]}${n.pitch.slice(-1)}`} /> }))}
          selected={note.pitch}
          onSelect={select}
        />

        {activeRegister === "altissimo" && (
          <p className="chart-footnote">
            {zh
              ? "超高音区的指法因人而异、因乐器而异，这里只收录了有明确主指法的音。"
              : "Altissimo fingerings vary by player and instrument; only the notes with one clear primary fingering are listed."}
          </p>
        )}
      </div>
    </main>
  );
}
