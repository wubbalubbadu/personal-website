"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {MicBlocked} from "../../flute-studio/components/MicBlocked";
import {PracticeIcon} from "../../flute-studio/components/PracticeIcon";
import {RecordingPlayback} from "../../flute-studio/components/RecordingPlayback";
import {usePracticeAudio} from "../../flute-studio/PracticeAudio";
import {closeMic, openMic} from "../../flute-studio/lib/audioSession";
import {referenceA} from "../../flute-studio/lib/toolSounds";
import {useLanguage} from "../../flute-studio/i18n/LanguageContext";
import {
  analyzeSteps, exportable, noteName, toMono, type Analysis, type Note,
  ATTACK_CUTOFFS, BREATH_MS, DIP_RISE_DB, ENVELOPE_HOP_MS, LENGTH_CUTOFFS, RELEASE_CUTOFFS, SLUR_STEADY_MS,
} from "./engine";
import {LENGTH_COLOR} from "./lengthColors";
import {summarize, type TakeSummary} from "./compare";
import {NoteShape} from "./NoteShape";
import {NoteSpectrogram} from "./NoteSpectrogram";
import {PhraseView} from "./PhraseView";
import {ShapeOverlay} from "./ShapeOverlay";
import {LENGTH_ORDER, attackWord, lengthMeans, lengthWord, meaning, releaseWord, shapeWord, startWord} from "./words";

/**
 * See your articulation: record a phrase (or open a recording), and see its shape.
 *
 * The phrase first (where it grows, peaks and fades; where you breathed), then any note close up (attack, length,
 * release, pitch settling, tone), then every note's shape laid on top of the others so the inconsistent ones stand
 * out. Analysis happens on this device; nothing is uploaded.
 */
const MAX_SECONDS = 90;

type Take = {url: string; duration: number; buffer: AudioBuffer; name: string; samples: Float32Array};
type Phase = "ready" | "recording" | "decoding" | "analyzing" | "done";

export default function ArticulationTool() {
  const {lang} = useLanguage(), zh = lang === "zh";
  const {getAudio} = usePracticeAudio();
  const [phase, setPhase] = useState<Phase>("ready");
  const [take, setTake] = useState<Take | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [selected, setSelected] = useState(0);
  const [problem, setProblem] = useState<"mic" | "decode" | "empty" | null>(null);
  const [overlayScope, setOverlayScope] = useState<"phrase" | "all">("phrase");
  /** A take kept to compare against (a teacher's demonstration, yesterday's try). Lives until the page closes. */
  const [reference, setReference] = useState<{analysis: Analysis; name: string} | null>(null);

  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const playing = useRef<AudioBufferSourceNode | null>(null);
  const run = useRef(0);

  useEffect(() => () => { closeMic(stream.current); playing.current?.stop(); }, []);
  useEffect(() => () => { if (take) URL.revokeObjectURL(take.url); }, [take]);

  /** Decodes any audio the browser can read, then analyses it a slice at a time so the page stays responsive. */
  const analyse = useCallback(async (blob: Blob, name: string) => {
    const id = ++run.current;
    setPhase("decoding"); setProblem(null); setAnalysis(null); setProgress(0);
    let buffer: AudioBuffer;
    try {
      const context = new OfflineAudioContext(1, 1, 44100);
      buffer = await context.decodeAudioData(await blob.arrayBuffer());
    } catch {
      setPhase(take ? "done" : "ready"); setProblem("decode");
      return;
    }
    const seconds = Math.min(buffer.duration, MAX_SECONDS);
    const channels = Array.from({length: buffer.numberOfChannels}, (_, c) => buffer.getChannelData(c).subarray(0, Math.floor(seconds * buffer.sampleRate)));
    const samples = toMono(channels);
    setTake({url: URL.createObjectURL(blob), duration: seconds, buffer, name, samples});
    setPhase("analyzing");
    const steps = analyzeSteps(samples, buffer.sampleRate, referenceA());
    for (;;) {
      const next = steps.next();
      if (run.current !== id) return; // a newer take replaced this one
      if (next.done) {
        setAnalysis(next.value);
        setSelected(0);
        setPhase("done");
        if (!next.value.notes.length) setProblem("empty");
        return;
      }
      setProgress(next.value.fraction);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }, [take]);

  async function startRecording() {
    setProblem(null);
    try {
      const media = await openMic();
      stream.current = media;
      chunks.current = [];
      const next = new MediaRecorder(media);
      next.ondataavailable = event => { if (event.data.size) chunks.current.push(event.data); };
      next.onstop = () => {
        closeMic(media);
        stream.current = null;
        const blob = new Blob(chunks.current, {type: next.mimeType});
        void analyse(blob, zh ? "刚才的录音" : "This take");
      };
      next.start();
      recorder.current = next;
      startedAt.current = Date.now();
      setElapsed(0);
      setPhase("recording");
    } catch {
      closeMic(stream.current);
      stream.current = null;
      setProblem("mic");
    }
  }
  function stopRecording() { recorder.current?.stop(); recorder.current = null; }

  useEffect(() => {
    if (phase !== "recording") return;
    const id = setInterval(() => {
      const seconds = (Date.now() - startedAt.current) / 1000;
      setElapsed(Math.floor(seconds));
      if (seconds >= MAX_SECONDS) stopRecording();
    }, 250);
    return () => clearInterval(id);
  }, [phase]);

  /** Plays part of the take through the studio's audio engine. */
  function play(fromMs: number, toMs: number) {
    if (!take) return;
    playing.current?.stop();
    const audio = getAudio();
    void audio.resume();
    const source = audio.createBufferSource();
    source.buffer = take.buffer;
    source.connect(audio.destination);
    source.start(0, Math.max(0, fromMs / 1000), Math.max(0.05, (toMs - fromMs) / 1000));
    playing.current = source;
  }

  const notes = useMemo(() => analysis?.notes ?? [], [analysis]);
  const note: Note | undefined = notes[selected];
  const phrase = note && analysis ? analysis.phrases.find(p => p.index === note.phrase) : undefined;
  const overlayNotes = overlayScope === "phrase" && phrase ? notes.filter(n => n.phrase === phrase.index) : notes;

  // Arrow keys step through the notes while the results are on screen (not while typing anywhere).
  useEffect(() => {
    if (!notes.length) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (event.key === "ArrowRight") { setSelected(i => Math.min(notes.length - 1, i + 1)); event.preventDefault(); }
      if (event.key === "ArrowLeft") { setSelected(i => Math.max(0, i - 1)); event.preventDefault(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [notes.length]);

  const typical = useMemo(() => {
    const values = (key: "brightness" | "breathiness") => notes.map(n => n[key]).filter((v): v is number => v !== null).sort((a, b) => a - b);
    const quartiles = (list: number[]) => list.length >= 4 ? [list[Math.floor(list.length / 4)], list[Math.floor((3 * list.length) / 4)]] : null;
    return {brightness: quartiles(values("brightness")), breathiness: quartiles(values("breathiness"))};
  }, [notes]);

  function saveNumbers() {
    if (!analysis) return;
    const blob = new Blob([JSON.stringify(exportable(analysis), null, 2)], {type: "application/json"});
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const now = new Date(), pad = (n: number) => String(n).padStart(2, "0");
    link.download = `articulation-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  const ms = (value: number) => `${value} ${zh ? "毫秒" : "ms"}`;
  const time = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;
  const busy = phase === "decoding" || phase === "analyzing";

  return <main className="exercise-hub artic">
    <div className="exercise-hub__content">
      <header className="exercise-hub__header"><div>
        <h1>{zh ? "看见你的演奏" : "See your articulation"}</h1>
        <p className="artic__lead">{zh ? "录一句，看看它的形状：乐句怎么起伏，每个音怎么开始、响多久、怎么结束。" : "Record a phrase and see its shape: how the phrase rises and falls, and how each note starts, how long it sounds, and how it ends."}</p>
      </div></header>

      <section className="artic__input practice-card">
        <div className="artic__buttons">
          {phase === "recording"
            ? <button type="button" className="artic__action is-recording" onClick={stopRecording}><span className="artic__stop" aria-hidden="true"/>{zh ? `停止 ${time}` : `Stop ${time}`}</button>
            : <button type="button" className="artic__action is-main" disabled={busy} onClick={() => void startRecording()}><PracticeIcon name="record"/>{take ? (zh ? "再录一段" : "Record again") : (zh ? "录音" : "Record")}</button>}
          <button type="button" className="artic__action" disabled={busy || phase === "recording"} onClick={() => fileInput.current?.click()}>{zh ? "打开录音文件" : "Open a recording"}</button>
          <input ref={fileInput} type="file" accept="audio/*,.wav,.m4a,.mp3,.webm,.ogg,.aiff,.flac" hidden onChange={event => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void analyse(file, file.name);
          }}/>
        </div>
        {phase === "recording" && <p className="artic__status">{zh ? `正在录音，最长 ${MAX_SECONDS} 秒。吹完按停止。` : `Recording, up to ${MAX_SECONDS} seconds. Press Stop when you finish.`}</p>}
        {busy && <div className="artic__progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
          <span>{phase === "decoding" ? (zh ? "读取录音…" : "Reading the recording…") : (zh ? "分析中…" : "Listening closely…")}</span>
          <i><b style={{width: `${Math.round((phase === "decoding" ? 0.04 : progress) * 100)}%`}}/></i>
        </div>}
        {problem === "mic" && <p className="artic__problem"><MicBlocked zh={zh}/></p>}
        {problem === "decode" && <p className="artic__problem">{zh ? "这个文件打不开。试试 WAV、M4A 或 MP3。" : "That file could not be read. Try a WAV, M4A or MP3."}</p>}
        {problem === "empty" && <p className="artic__problem">{zh ? "没有听到音。离麦克风近一点，或者吹响一点再试。" : "No notes were heard. Try closer to the microphone, or a little louder."}</p>}
        {take && phase === "done" && <div className="artic__take">
          <RecordingPlayback key={take.url} src={take.url} duration={take.duration} zh={zh}/>
          <small>{take.name}{take.buffer.duration > MAX_SECONDS ? (zh ? ` · 只分析前 ${MAX_SECONDS} 秒` : ` · first ${MAX_SECONDS} seconds analysed`) : ""}</small>
        </div>}
        {analysis && phase === "done" && notes.length > 0 && <div className="artic__reference">
          {reference && reference.analysis !== analysis && <span>{zh ? `对比参考：${reference.name}` : `Comparing with: ${reference.name}`}</span>}
          {reference?.analysis === analysis
            ? <span>{zh ? "这段是参考。再录一段或打开另一个录音来对比。" : "This take is the reference. Record or open another take to compare."}</span>
            : <button type="button" className="artic__action is-small" onClick={() => setReference({analysis, name: take?.name ?? ""})}>{reference ? (zh ? "改用这段做参考" : "Use this take as the reference") : (zh ? "留作参考，用来对比" : "Keep as a reference to compare")}</button>}
          {reference && <button type="button" className="text-action" onClick={() => setReference(null)}>{zh ? "清除参考" : "Clear reference"}</button>}
        </div>}
        <small className="artic__privacy">{zh ? "分析在你的设备上完成，录音不会上传。" : "Analysed on this device. Recordings are never uploaded."}</small>
      </section>

      {!analysis && phase !== "recording" && !busy && <section className="artic__ideas">
        <h2 className="artic__heading">{zh ? "可以先试试" : "Things to try"}</h2>
        <ol>
          <li>{zh ? "同一个音：四个断奏，再四个极短断奏。看下面的音符块怎么变短。" : "One note: four staccato, then four staccatissimo. Watch the solid blocks get shorter."}</li>
          <li>{zh ? "一个长音，最后慢慢收掉；再一个，突然停住。比较结尾。" : "A long tone that tapers away, then one that stops suddenly. Compare the endings."}</li>
          <li>{zh ? "用舌头吐四个连音（legato tonguing），再把同样的音连奏。看音开始的方式。" : "Four legato-tongued notes, then the same notes slurred. Compare how the notes start."}</li>
          <li>{zh ? "德彪西《西林克斯》的第一句。看乐句的形状。" : "The first phrase of Debussy's Syrinx. Look at the phrase's shape."}</li>
        </ol>
      </section>}

      {analysis && notes.length > 0 && <>
        <section className="artic__section">
          <div className="artic__section-head">
            <h2 className="artic__heading">{zh ? "整段" : "The whole take"}</h2>
            <div className="artic__legend">{LENGTH_ORDER.filter(word => notes.some(n => n.length === word)).map(word =>
              <span key={word}><i style={{background: LENGTH_COLOR[word]}}/>{lengthWord(word, zh)}</span>)}</div>
          </div>
          <PhraseView analysis={analysis} selected={selected} onSelect={setSelected} zh={zh}/>
          <p className="artic__hint">{zh ? "音色一栏：褐色线是明亮度（越高越亮，按这段录音自己的范围），粉色区域是气声。" : "Tone lane: the brown line is brightness (higher is brighter, scaled to this take), the pink area is breath noise."}</p>
          <p className="artic__hint">{zh ? "下面的音符块：实心是真正响的时间，浅色是到下一个音之前的空隙。点一个音看细节，或用 ← → 键。" : "Note blocks: solid is how long the note really sounds, faint is the rest of its time until the next note. Click a note for the close-up, or use the ← → keys."}</p>
          <div className="artic__phrases">{analysis.phrases.map(p => {
            const first = notes[p.notes[0]];
            return <button type="button" key={p.index} className={note?.phrase === p.index ? "artic__phrase is-chosen" : "artic__phrase"} onClick={() => setSelected(first.index)}>
              <b>{`${zh ? "乐句" : "Phrase"} ${p.index + 1}`}</b>
              <span>{shapeWord(p.shape, zh)}</span>
              <small>{[
                `${((p.endMs - p.startMs) / 1000).toFixed(1)} ${zh ? "秒" : "s"}`,
                `${p.notes.length} ${zh ? "个音" : p.notes.length === 1 ? "note" : "notes"}`,
                p.lowMidi !== null && p.highMidi !== null ? (p.lowMidi === p.highMidi ? noteName(p.lowMidi) : `${noteName(p.lowMidi)} ${zh ? "到" : "to"} ${noteName(p.highMidi)}`) : null,
                p.rangeDb >= 2 ? `${zh ? "最响在" : "loudest at"} ${Math.round(p.peakAt * 100)}%` : null,
                `${zh ? "动态范围" : "range"} ${p.rangeDb} dB`,
                p.mostly ? `${zh ? "多为" : "mostly"} ${lengthWord(p.mostly, zh).toLowerCase()}` : null,
              ].filter(Boolean).join(" · ")}</small>
            </button>;
          })}</div>
        </section>

        {note && <section className="artic__section artic__closeup">
          <div className="artic__section-head">
            <h2 className="artic__heading">{`${zh ? "第" : "Note "}${note.index + 1}${zh ? "个音" : ""}${note.midi !== null ? ` · ${noteName(note.midi)}` : ""}`}</h2>
            <div className="artic__note-nav">
              <button type="button" className="artic__icon has-tip" data-tip={zh ? "上一个音" : "Previous note"} aria-label={zh ? "上一个音" : "Previous note"} disabled={selected === 0} onClick={() => setSelected(selected - 1)}><PracticeIcon name="previous"/></button>
              <span>{`${selected + 1} / ${notes.length}`}</span>
              <button type="button" className="artic__icon has-tip" data-tip={zh ? "下一个音" : "Next note"} aria-label={zh ? "下一个音" : "Next note"} disabled={selected === notes.length - 1} onClick={() => setSelected(selected + 1)}><PracticeIcon name="next"/></button>
              <button type="button" className="artic__action is-small" onClick={() => play(note.startMs - 30, note.endMs + 60)}><PracticeIcon name="play"/>{zh ? "听这个音" : "Play note"}</button>
              {phrase && <button type="button" className="artic__action is-small" onClick={() => play(phrase.startMs - 30, phrase.endMs + 150)}><PracticeIcon name="play"/>{zh ? "听这一句" : "Play phrase"}</button>}
            </div>
          </div>
          <div className="artic__closeup-grid">
            <div className="practice-card artic__card">
              <NoteShape analysis={analysis} note={note} zh={zh}/>
              {take && <NoteSpectrogram samples={take.samples} sampleRate={analysis.sampleRate} durationMs={analysis.durationMs} note={note} zh={zh}/>}
              <p className="artic__hint">{zh ? "上面：这个音的音量（按它自己的峰值缩放）。浅褐色是音头，灰色是结尾，虚线是持续音量。中间：音准，单位音分，竖线是音准稳定的时刻。下面：频谱图，越深越响；横线是泛音，横线之间的雾是气声，开头的竖向模糊是舌头。" : "Top: this note's loudness, scaled to its own peak. Sand is the attack, grey the release, the dashed line the held level. Middle: pitch in cents; the upright line is where the pitch settles. Bottom: the spectrogram, darker is louder; the horizontal lines are the overtones, haze between them is air, and a smear at the start is the tongue."}</p>
            </div>
            <dl className="practice-card artic__card artic__facts">
              <Fact label={zh ? "开始" : "Starts"} value={note.attack === "none" ? `${startWord(note.startKind, zh)} · ${attackWord("none", zh)}` : `${startWord(note.startKind, zh)} · ${attackWord(note.attack, zh)}, ${ms(note.attackMs)}`} means={meaning("attack", zh)}/>
              <Fact label={zh ? "长度" : "Length"} value={note.fill !== null && note.gapToNextMs !== null
                ? `${lengthWord(note.length, zh)} · ${ms(note.soundedMs)} ${zh ? "/" : "of"} ${ms(note.gapToNextMs)} (${Math.round(note.fill * 100)}%)`
                : `${lengthWord(note.length, zh)} · ${ms(note.soundedMs)}`} means={`${lengthMeans(note.length, zh)} ${meaning("length", zh)}`} swatch={LENGTH_COLOR[note.length]}/>
              <Fact label={zh ? "结束" : "Ends"} value={note.release === "joined" ? releaseWord("joined", zh) : `${releaseWord(note.release, zh)} · ${ms(note.releaseMs)}`} means={meaning("release", zh)}/>
              <Fact label={zh ? "中段" : "Held"} value={heldWords(note, zh)} means={meaning("held", zh)}/>
              <Fact label={zh ? "音准" : "Pitch"} value={note.midi === null ? (zh ? "没有稳定的音高" : "No steady pitch") : [
                `${noteName(note.midi)} ${note.cents !== null && note.cents >= 0 ? "+" : ""}${note.cents}¢`,
                note.settleMs !== null ? `${zh ? "稳定用时" : "settles in"} ${ms(note.settleMs)}` : null,
                note.wobbleCents !== null ? `${zh ? "摆动" : "wavers"} ±${note.wobbleCents}¢` : null,
              ].filter(Boolean).join(" · ")} means={meaning("pitch", zh)}/>
              <Fact label={zh ? "音色" : "Tone"} value={toneWords(note, typical, zh)} means={meaning("tone", zh)}/>
            </dl>
          </div>
        </section>}

        <section className="artic__section">
          <div className="artic__section-head">
            <h2 className="artic__heading">{zh ? "比较音的形状" : "Compare the shapes"}</h2>
            <div className="view-switch" role="group" aria-label={zh ? "比较哪些音" : "Which notes to compare"}>
              <button type="button" aria-pressed={overlayScope === "phrase"} onClick={() => setOverlayScope("phrase")}>{zh ? "这一句" : "This phrase"}</button>
              <button type="button" aria-pressed={overlayScope === "all"} onClick={() => setOverlayScope("all")}>{zh ? "全部" : "All notes"}</button>
            </div>
          </div>
          <div className="practice-card artic__card">
            <ShapeOverlay analysis={analysis} notes={overlayNotes} selected={selected} onSelect={setSelected} zh={zh}
              reference={reference && reference.analysis !== analysis ? {
                analysis: reference.analysis,
                // The same phrase of the reference (by number), assuming the same exercise was played; or all of it.
                notes: overlayScope === "phrase" && phrase ? reference.analysis.notes.filter(n => n.phrase === phrase.index) : reference.analysis.notes,
              } : null}/>
          </div>
          <p className="artic__hint">{zh ? "每个音的音量都从开始对齐、按自己的峰值缩放。想吹成一样的音应该叠在一起；偏离的那几个值得再听。深色线是选中的音，点其他线可以选它。" : "Every note's loudness, lined up at its start and scaled to its own peak. Notes you meant to play alike should lie together; the strays are worth hearing again. The dark line is the chosen note; click another line to choose it."}</p>
        </section>

        {reference && reference.analysis !== analysis && <section className="artic__section">
          <div className="artic__section-head"><h2 className="artic__heading">{zh ? "和参考比较" : "Compared with the reference"}</h2></div>
          <Comparison before={summarize(reference.analysis.notes)} after={summarize(notes)} zh={zh}/>
          <p className="artic__hint">{zh ? "每一项都是中位数（典型值），只算有意义的音：比如连进来的音没有音头。上面的形状图里，灰色虚线是参考。" : "Each row is the typical (median) value over the notes where it means something: slurred-in notes have no attack, for example. In the shapes above, the grey dashed lines are the reference."}</p>
        </section>}

        <section className="artic__section artic__footer">
          <details className="artic__how">
            <summary>{zh ? "它是怎么判断的" : "How it reads your playing"}</summary>
            <ul>
              <li>{zh ? `每 ${ENVELOPE_HOP_MS} 毫秒测一次音量，每约 6 毫秒用 YIN 测一次音高，同时用频谱测音色。` : `Loudness every ${ENVELOPE_HOP_MS} ms; pitch (YIN) and tone (a spectrum) about every 6 ms.`}</li>
              <li>{zh ? `新音开始于：静音之后有声音；音量先降后升至少 ${DIP_RISE_DB} dB（舌头）；或音高换到新音并保持 ${SLUR_STEADY_MS} 毫秒（连奏）。` : `A new note starts after silence, at a dip that rises again by ${DIP_RISE_DB} dB or more (the tongue), or when the pitch moves to a new note and holds it for ${SLUR_STEADY_MS} ms (a slur).`}</li>
              <li>{zh ? `静音超过 ${BREATH_MS} 毫秒算换气，开始新的乐句。` : `A silence of ${BREATH_MS} ms or more is a breath and starts a new phrase.`}</li>
              <li>{zh ? `长度：响的时间占到下一个音的比例。${Math.round(LENGTH_CUTOFFS.full * 100)}% 以上饱满，${Math.round(LENGTH_CUTOFFS.detached * 100)}% 以上断开，${Math.round(LENGTH_CUTOFFS.staccato * 100)}% 以上断奏，更短是极短断奏。` : `Length: the share of the time until the next note that the note sounds. ${Math.round(LENGTH_CUTOFFS.full * 100)}% or more is full, ${Math.round(LENGTH_CUTOFFS.detached * 100)}% detached, ${Math.round(LENGTH_CUTOFFS.staccato * 100)}% staccato, less is staccatissimo.`}</li>
              <li>{zh ? `音头短于 ${ATTACK_CUTOFFS.crisp} 毫秒算干脆，短于 ${ATTACK_CUTOFFS.clean} 清楚，短于 ${ATTACK_CUTOFFS.gentle} 柔和，更长是渐起。结尾短于 ${RELEASE_CUTOFFS.stopped} 毫秒算截止，短于 ${RELEASE_CUTOFFS.natural} 自然，更长是渐收。` : `Attacks under ${ATTACK_CUTOFFS.crisp} ms are crisp, under ${ATTACK_CUTOFFS.clean} clean, under ${ATTACK_CUTOFFS.gentle} gentle, longer swelled. Releases under ${RELEASE_CUTOFFS.stopped} ms are stopped, under ${RELEASE_CUTOFFS.natural} natural, longer tapered.`}</li>
              <li>{zh ? "这些界线是起点，不是标准。用你自己的录音检查它们对不对。房间回声会让结尾显得更长。" : "These lines are a starting point, not a standard: check them against your own recordings. Room echo makes releases look longer than you played them."}</li>
            </ul>
          </details>
          <button type="button" className="artic__action is-small" onClick={saveNumbers}>{zh ? "保存数据（JSON）" : "Save the numbers (JSON)"}</button>
        </section>
      </>}
    </div>
  </main>;
}

function Fact({label, value, means, swatch}: {label: string; value: string; means: string; swatch?: string}) {
  return <div className="artic__fact">
    <dt>{swatch && <i style={{background: swatch}}/>}{label}</dt>
    <dd><b>{value}</b><small>{means}</small></dd>
  </div>;
}

function heldWords(note: Note, zh: boolean) {
  const slope = note.sustainSlopeDbPerS;
  const level = `${zh ? "持续音量为峰值的" : "holds at"} ${Math.round(note.sustainLevel * 100)}%${zh ? "" : " of its peak"}`;
  if (note.soundedMs < 300) return zh ? "太短，看不出中段的变化" : "Too short to judge a held part";
  const trend = slope > 6 ? (zh ? `渐强 +${slope} dB/秒` : `grows +${slope} dB/s`) : slope < -6 ? (zh ? `渐弱 ${slope} dB/秒` : `dies away ${slope} dB/s`) : (zh ? "平稳" : "steady");
  return `${trend} · ${level}`;
}

function toneWords(note: Note, typical: {brightness: number[] | null; breathiness: number[] | null}, zh: boolean) {
  if (note.brightness === null) return zh ? "没有足够的乐音来判断" : "Not enough steady tone to tell";
  const compare = (value: number | null, range: number[] | null, more: string, less: string) =>
    value === null || !range ? "" : value > range[1] ? ` (${more})` : value < range[0] ? ` (${less})` : "";
  const bright = `${zh ? "明亮度" : "brightness"} ${note.brightness.toFixed(2)}${compare(note.brightness, typical.brightness, zh ? "比你大多数音亮" : "brighter than most of your notes", zh ? "比你大多数音暗" : "darker than most of your notes")}`;
  const breath = note.breathiness === null ? "" : ` · ${zh ? "气声" : "breath"} ${Math.round(note.breathiness * 100)}%${compare(note.breathiness, typical.breathiness, zh ? "比大多数音气多" : "airier than most", zh ? "比大多数音干净" : "cleaner than most")}`;
  const chiff = note.attackNoise === null ? "" : ` · ${zh ? "音头气声" : "attack noise"} ${Math.round(note.attackNoise * 100)}%`;
  return bright + breath + chiff;
}

/** The reference and this take, row by row, with the change in plain words. */
function Comparison({before, after, zh}: {before: TakeSummary; after: TakeSummary; zh: boolean}) {
  const ms = (v: number) => `${Math.round(v)} ${zh ? "毫秒" : "ms"}`;
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const cents = (v: number) => `±${Math.round(v)}¢`;
  type Row = {label: string; a: number | null; b: number | null; show: (v: number) => string; more: string; less: string; step: number};
  const rows: Row[] = [
    {label: zh ? "音头" : "Attack", a: before.attackMs, b: after.attackMs, show: ms, more: zh ? "更慢" : "slower", less: zh ? "更快" : "faster", step: 4},
    {label: zh ? "长度（响的比例）" : "Length (share sounding)", a: before.fill, b: after.fill, show: pct, more: zh ? "更长" : "longer", less: zh ? "更短" : "shorter", step: 0.05},
    {label: zh ? "结尾" : "Release", a: before.releaseMs, b: after.releaseMs, show: ms, more: zh ? "收得更慢" : "slower to end", less: zh ? "收得更快" : "quicker to end", step: 8},
    {label: zh ? "音准稳定用时" : "Pitch settles in", a: before.settleMs, b: after.settleMs, show: ms, more: zh ? "更慢" : "slower", less: zh ? "更快" : "faster", step: 5},
    {label: zh ? "音准摆动" : "Pitch wavers", a: before.wobbleCents, b: after.wobbleCents, show: cents, more: zh ? "更多" : "more", less: zh ? "更少" : "less", step: 3},
    {label: zh ? "气声" : "Breath", a: before.breathiness, b: after.breathiness, show: pct, more: zh ? "更多" : "more", less: zh ? "更少" : "less", step: 0.03},
  ];
  return <table className="artic__compare practice-card">
    <thead><tr><th/><th>{zh ? "参考" : "Reference"}</th><th>{zh ? "这一段" : "This take"}</th><th>{zh ? "变化" : "Change"}</th></tr></thead>
    <tbody>
      <tr><th>{zh ? "音的数量" : "Notes"}</th><td>{before.notes}</td><td>{after.notes}</td><td/></tr>
      {rows.map(row => <tr key={row.label}>
        <th>{row.label}</th>
        <td>{row.a === null ? (zh ? "无" : "n/a") : row.show(row.a)}</td>
        <td>{row.b === null ? (zh ? "无" : "n/a") : row.show(row.b)}</td>
        <td>{row.a === null || row.b === null ? "" : Math.abs(row.b - row.a) < row.step ? (zh ? "差不多" : "about the same") : row.b > row.a ? row.more : row.less}</td>
      </tr>)}
    </tbody>
  </table>;
}

