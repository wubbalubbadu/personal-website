"use client";

import { useState } from "react";
import { FluteDiagram } from "../components/FluteDiagram";
import { StaffNote } from "../components/StaffNote";
import { useLanguage } from "../i18n/LanguageContext";
import { REGISTERS, fluteFingerings, midiForPitch, registerForMidi, type NoteFingerings } from "../../../content/fingerings/flute";
import "./fingerings.css";

/**
 * The fingering chart.
 *
 * Grouped by acoustic register rather than presented as one 41-note strip:
 * the registers are how a flutist already thinks about the instrument, and
 * the third octave in particular uses completely different (harmonic)
 * fingerings, so running them together implies a continuity that is not
 * there.
 *
 * The selected note puts its stave, its name and its diagram on one row,
 * so the thing you are reading and the thing you are playing are never
 * more than an eye movement apart.
 *
 * Alternates are behind a row of buttons rather than listed all at once —
 * a beginner needs one B♭, not three.
 */
function registerOf(note: NoteFingerings) {
  return registerForMidi(midiForPitch(note.pitch));
}

export default function FingeringChart() {
  const { lang } = useLanguage();
  const zh = lang === "zh";
  const [pitch, setPitch] = useState("C4");
  const [variant, setVariant] = useState(0);

  const note = fluteFingerings.find(n => n.pitch === pitch) ?? fluteFingerings[0];
  const fingering = note.fingerings[Math.min(variant, note.fingerings.length - 1)];
  const octaveDigit = note.pitch.replace(/\D/g, "");
  const select = (next: string) => {
    setPitch(next);
    setVariant(0);
  };

  return (
    <main className="fingering-chart">
      <div className="fingering-chart__content">
        <header className="fingering-chart__header">
          <p>{zh ? "练习工具" : "Practice tools"}</p>
          <h1>{zh ? "指法表" : "Fingering chart"}</h1>
          <p className="fingering-chart__intro">
            {zh
              ? "长笛的基本指法，从低音 B 到超高音区。填黑表示按下，空心表示放开。"
              : "Standard fingerings from low B up through the altissimo. Filled means closed, hollow means open."}
          </p>
        </header>

        <section className="fingering-chart__now" aria-live="polite">
          <div className="fingering-chart__stave">
            <StaffNote midi={midiForPitch(note.pitch)} spelling={note.names[0]} />
          </div>
          <div className="fingering-chart__detail">
            <h2>
              {note.names.join(" / ")}
              <sub>{octaveDigit}</sub>
            </h2>
            {note.fingerings.length > 1 && (
              <div className="fingering-chart__variants" role="group" aria-label={zh ? "其他指法" : "Other fingerings"}>
                {note.fingerings.map((option, index) => (
                  <button
                    key={option.label ?? index}
                    type="button"
                    className={index === variant ? "selected" : ""}
                    aria-pressed={index === variant}
                    onClick={() => setVariant(index)}
                  >
                    {option.label ?? (zh ? "标准" : "Standard")}
                  </button>
                ))}
              </div>
            )}
            {(zh ? fingering.zhUse : fingering.use) && <p className="fingering-chart__use">{zh ? fingering.zhUse : fingering.use}</p>}
            {fingering.requires === "b-foot" && (
              <p className="fingering-chart__requires">{zh ? "需要 B 尾管" : "Needs a B foot"}</p>
            )}
          </div>
          <FluteDiagram pressed={fingering.keys} className="fingering-chart__diagram" />
        </section>

        {REGISTERS.map(register => {
          const notes = fluteFingerings.filter(n => registerOf(n).id === register.id);
          if (!notes.length) return null;
          return (
            <section className="fingering-chart__register" key={register.id}>
              <h3>{zh ? register.zh : register.en}</h3>
              <div className="fingering-chart__notes">
                {notes.map(n => (
                  <button
                    key={n.pitch}
                    type="button"
                    className={n.pitch === note.pitch ? "selected" : ""}
                    aria-pressed={n.pitch === note.pitch}
                    onClick={() => select(n.pitch)}
                  >
                    {n.names[0]}
                    <sub>{n.pitch.replace(/\D/g, "")}</sub>
                  </button>
                ))}
              </div>
            </section>
          );
        })}

        <p className="fingering-chart__note">
          {zh
            ? "超高音区的指法因人而异、因乐器而异，这里只收录了有明确主指法的音。"
            : "Altissimo fingerings vary by player and instrument; only the notes with one clear primary fingering are listed."}
        </p>
      </div>
    </main>
  );
}
