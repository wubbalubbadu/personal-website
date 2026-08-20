"use client";

import {useEffect, useRef, useState} from "react";
import type {OpenSheetMusicDisplay as OSMDType} from "opensheetmusicdisplay";
import "./scales.css";

const tonics = ["C", "G", "D", "A", "E", "F", "B♭", "E♭", "A♭"] as const;
const tonicPc: Record<string, number> = {C: 0, G: 7, D: 2, A: 9, E: 4, F: 5, "B♭": 10, "E♭": 3, "A♭": 8};
const types = {
  major: [0, 2, 4, 5, 7, 9, 11],
  "natural minor": [0, 2, 3, 5, 7, 8, 10],
  "harmonic minor": [0, 2, 3, 5, 7, 8, 11],
  "melodic minor": [0, 2, 3, 5, 7, 9, 11],
} as const;

type ScaleType = keyof typeof types;
type Range = "one octave" | "two octaves" | "C4–C7" | "B3–D7";
type Articulation = "all tongued" | "all slurred" | "slur two" | "two tongued, two slurred";
type ScoreSource = "uploaded" | "generated";
type RenderStatus = "loading" | "ready" | "error";

function scaleMidis(tonic: string, type: ScaleType, range: Range) {
  const pc = tonicPc[tonic];
  const min = range === "B3–D7" ? 59 : 60;
  const max = range === "B3–D7" ? 98 : 96;
  const start = min + ((pc - min) % 12 + 12) % 12;
  const end = range === "one octave" ? start + 12 : range === "two octaves" ? start + 24 : max - ((max - pc) % 12 + 12) % 12;
  const up: number[] = [];

  for (let octave = start; octave <= end; octave += 12) {
    for (const interval of types[type]) {
      if (octave + interval <= end) up.push(octave + interval);
    }
  }

  if (up.at(-1) !== end) up.push(end);
  const down = [...up].slice(0, -1).reverse();

  if (type === "melodic minor") {
    return [...up, ...down.map((midi) => {
      const degree = (midi - pc + 120) % 12;
      return degree === 9 || degree === 11 ? midi - 1 : midi;
    })];
  }

  return [...up, ...down];
}

function xmlPitch(midi: number) {
  const names = [
    {s: "C", a: 0}, {s: "C", a: 1}, {s: "D", a: 0}, {s: "D", a: 1},
    {s: "E", a: 0}, {s: "F", a: 0}, {s: "F", a: 1}, {s: "G", a: 0},
    {s: "G", a: 1}, {s: "A", a: 0}, {s: "A", a: 1}, {s: "B", a: 0},
  ];
  const pitch = names[midi % 12];
  return `<pitch><step>${pitch.s}</step>${pitch.a ? `<alter>${pitch.a}</alter>` : ""}<octave>${Math.floor(midi / 12) - 1}</octave></pitch>`;
}

function scoreXml(tonic: string, type: ScaleType, range: Range, articulation: Articulation) {
  const notes = scaleMidis(tonic, type, range);
  const measures: string[] = [];

  for (let measure = 0; measure < Math.ceil(notes.length / 8); measure++) {
    const chunk = notes.slice(measure * 8, measure * 8 + 8);
    const body = chunk.map((midi, indexInMeasure) => {
      const index = measure * 8 + indexInMeasure;
      const last = index === notes.length - 1;
      const pairStart = index % 2 === 0;
      let notation = "";

      if (articulation === "all slurred" && (index === 0 || last)) {
        notation = `<notations><slur type="${index === 0 ? "start" : "stop"}" number="1"/></notations>`;
      }
      if (articulation === "slur two") {
        notation = `<notations><slur type="${pairStart ? "start" : "stop"}" number="1"/></notations>`;
      }
      if (articulation === "two tongued, two slurred" && index % 4 >= 2) {
        notation = `<notations><slur type="${index % 4 === 2 ? "start" : "stop"}" number="1"/></notations>`;
      }

      return `<note>${xmlPitch(midi)}<duration>1</duration><voice>1</voice><type>eighth</type>${notation}</note>`;
    }).join("");

    measures.push(`<measure number="${measure + 1}">${measure === 0 ? `<attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>` : ""}${body}</measure>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="3.1"><work><work-title>${tonic} ${type} scale</work-title></work><part-list><score-part id="P1"><part-name>Flute</part-name></score-part></part-list><part id="P1">${measures.join("")}</part></score-partwise>`;
}

export default function ScaleStudio() {
  const scoreRoot = useRef<HTMLDivElement>(null);
  const osmd = useRef<OSMDType | null>(null);
  const renderRequest = useRef(0);
  const [source, setSource] = useState<ScoreSource>("uploaded");
  const [tonic, setTonic] = useState("C");
  const [type, setType] = useState<ScaleType>("major");
  const [range, setRange] = useState<Range>("one octave");
  const [articulation, setArticulation] = useState<Articulation>("all tongued");
  const [engineReady, setEngineReady] = useState(false);
  const [renderStatus, setRenderStatus] = useState<RenderStatus>("loading");

  useEffect(() => {
    let active = true;

    import("opensheetmusicdisplay").then(({OpenSheetMusicDisplay}) => {
      if (!active || !scoreRoot.current) return;
      osmd.current = new OpenSheetMusicDisplay(scoreRoot.current, {
        backend: "svg",
        autoResize: true,
        drawTitle: false,
        drawingParameters: "compacttight",
      });
      setEngineReady(true);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!engineReady || !osmd.current) return;
    const display = osmd.current;
    const requestId = ++renderRequest.current;
    let cancelled = false;

    async function renderScore() {
      setRenderStatus("loading");

      try {
        if (source === "uploaded") {
          await display.load("/scales-flute.mxl", "C and G major scales");
        } else {
          await display.load(scoreXml(tonic, type, range, articulation));
        }

        if (cancelled || requestId !== renderRequest.current) return;
        display.zoom = source === "uploaded" ? 0.92 : 0.88;
        display.EngravingRules.MinimumDistanceBetweenSystems = source === "uploaded" ? 14 : 12;
        display.render();
        setRenderStatus("ready");
      } catch (error) {
        if (cancelled || requestId !== renderRequest.current) return;
        console.error("Unable to render scale score", error);
        setRenderStatus("error");
      }
    }

    void renderScore();
    return () => {
      cancelled = true;
    };
  }, [engineReady, source, tonic, type, range, articulation]);

  const uploaded = source === "uploaded";
  const title = uploaded ? "C major and G major" : `${tonic} ${type}`;
  const description = uploaded ? "Two-octave scales from your MusicXML file" : `${range} · ${articulation}`;

  return (
    <main className="scale-shell">
      <section className="scale-main">
        <header className="scale-page-header">
          <div>
            <p>EXERCISE PORTAL</p>
            <h1>Scale Studio</h1>
            <span>Read an uploaded scale sheet or build a custom practice scale.</span>
          </div>
        </header>

        <section className="scale-source-panel" aria-labelledby="score-source-heading">
          <div className="scale-source-copy">
            <p id="score-source-heading">Score source</p>
            <span>Switching sources keeps the same engraved viewer.</span>
          </div>
          <div className="scale-source-switch" role="group" aria-label="Score source">
            <button type="button" aria-pressed={uploaded} className={uploaded ? "active" : ""} onClick={() => setSource("uploaded")}>
              Uploaded score
            </button>
            <button type="button" aria-pressed={!uploaded} className={!uploaded ? "active" : ""} onClick={() => setSource("generated")}>
              Generated scale
            </button>
          </div>
        </section>

        {!uploaded && (
          <div className="scale-controls">
            <label>
              Key
              <select value={tonic} onChange={(event) => setTonic(event.target.value)}>
                {tonics.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label>
              Scale type
              <select value={type} onChange={(event) => setType(event.target.value as ScaleType)}>
                {Object.keys(types).map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label>
              Range
              <select value={range} onChange={(event) => setRange(event.target.value as Range)}>
                {["one octave", "two octaves", "C4–C7", "B3–D7"].map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label>
              Articulation
              <select value={articulation} onChange={(event) => setArticulation(event.target.value as Articulation)}>
                {["all tongued", "all slurred", "slur two", "two tongued, two slurred"].map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
          </div>
        )}

        <section className="scale-paper" aria-busy={renderStatus === "loading"}>
          <div className="scale-title">
            <p>{uploaded ? "UPLOADED MUSICXML" : "GENERATED FLUTE SCALE"}</p>
            <h2>{title}</h2>
            <span>{description}</span>
            {uploaded && (
              <div className="scale-score-facts" aria-label="Score details">
                <span>C major</span>
                <span>G major</span>
                <span>8 measures</span>
                <span>Flute</span>
              </div>
            )}
          </div>

          <div className={`scale-render-state ${renderStatus}`} role="status" aria-live="polite">
            {renderStatus === "loading" && "Engraving score…"}
            {renderStatus === "error" && "The MusicXML score could not be rendered. Try switching sources and back again."}
          </div>
          <div ref={scoreRoot} className="scale-score" />
        </section>
      </section>
    </main>
  );
}
