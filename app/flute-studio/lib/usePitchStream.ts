"use client";

/**
 * Microphone in, played notes out.
 *
 * The plumbing between `detectPitch` and `NoteSegmenter`: acquire the mic,
 * build the analysis graph, sample it on a frame loop, and keep the result
 * in React state. Nothing here decides anything musical — that all lives in
 * the two pure modules it drives, which is why they can be tested without a
 * microphone and this cannot.
 *
 * Deliberately shares the app's single AudioContext. Creating a second one
 * for mic input reroutes the audio session on iOS and silently kills the
 * metronome and drone until the page is reloaded.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { usePracticeAudio } from "../PracticeAudio";
import { detectPitch } from "./pitch";
import { NoteSegmenter, type PlayedNote, type TimedFrame } from "./noteSegmenter";

/**
 * ~24 readings a second. Fast enough that a trace looks continuous and the
 * onset of a note is placed within a fortieth of a second; slow enough that
 * the analysis does not dominate a frame on an iPad.
 */
const ANALYSIS_INTERVAL_MS = 42;
/**
 * 4096 samples is about 93ms at 44.1kHz — long enough to hold two full
 * cycles of the lowest note the flute plays, which the difference function
 * needs before it can find a period at all.
 */
const FFT_SIZE = 4096;

export type PitchStreamStatus = "idle" | "starting" | "listening" | "denied" | "unavailable";

export type PitchStream = {
  status: PitchStreamStatus;
  /** The note sounding right now, or null between notes. */
  live: PlayedNote | null;
  /** Everything played since the last reset, oldest first. */
  notes: PlayedNote[];
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
};

export function usePitchStream(): PitchStream {
  const { getAudio } = usePracticeAudio();
  const [status, setStatus] = useState<PitchStreamStatus>("idle");
  const [live, setLive] = useState<PlayedNote | null>(null);
  const [notes, setNotes] = useState<PlayedNote[]>([]);

  const segmenter = useRef(new NoteSegmenter());
  const stream = useRef<MediaStream | null>(null);
  const frame = useRef(0);
  const lastAnalysis = useRef(0);
  const startedAt = useRef(0);

  const stop = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    setStatus("idle");
    setLive(null);
  }, []);

  const reset = useCallback(() => {
    segmenter.current.reset();
    setNotes([]);
    setLive(null);
    startedAt.current = performance.now();
  }, []);

  const start = useCallback(async () => {
    if (stream.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unavailable");
      return;
    }
    setStatus("starting");

    try {
      // All three processors fight pitch detection: gain control rides over
      // a diminuendo, noise suppression eats the quiet end of a note, and
      // echo cancellation treats a sustained tone as an echo to remove.
      const media = await navigator.mediaDevices.getUserMedia({
        audio: { autoGainControl: false, echoCancellation: false, noiseSuppression: false },
      });
      stream.current = media;

      const context = getAudio();
      await context.resume();
      const source = context.createMediaStreamSource(media);
      const highPass = context.createBiquadFilter();
      highPass.type = "highpass";
      highPass.frequency.value = 150;
      highPass.Q.value = 0.7;
      const analyser = context.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      // No smoothing: the analyser's averaging is meant for spectrum
      // displays and would blur the attack of a note across frames.
      analyser.smoothingTimeConstant = 0;
      source.connect(highPass).connect(analyser);
      // Not connected to the destination — this graph listens, and routing
      // a live microphone to the speakers is a feedback loop.

      const data = new Float32Array(FFT_SIZE);
      segmenter.current.reset();
      startedAt.current = performance.now();
      setNotes([]);
      setLive(null);
      setStatus("listening");

      const loop = (timestamp: number) => {
        if (timestamp - lastAnalysis.current >= ANALYSIS_INTERVAL_MS) {
          lastAnalysis.current = timestamp;
          analyser.getFloatTimeDomainData(data);
          const estimate = detectPitch(data, context.sampleRate);
          // Times are relative to the start of listening, so a trace can be
          // drawn without knowing when the page loaded.
          const at = timestamp - startedAt.current;
          const timed: TimedFrame | null = estimate ? { ...estimate, at } : null;
          segmenter.current.push(timed, at);

          const played = segmenter.current.result();
          const last = played.at(-1) ?? null;
          const sounding = last && last.endedAt === null ? last : null;
          // Replaced rather than mutated so React sees the change: the
          // segmenter appends frames to the same array object in place.
          setLive(sounding ? { ...sounding, frames: [...sounding.frames] } : null);
          setNotes(played.filter(note => note.endedAt !== null));
        }
        frame.current = requestAnimationFrame(loop);
      };
      frame.current = requestAnimationFrame(loop);
    } catch {
      stream.current?.getTracks().forEach(track => track.stop());
      stream.current = null;
      setStatus("denied");
    }
  }, [getAudio]);

  // Leaving the page with the microphone open keeps the browser's recording
  // indicator lit, which reads as the app still listening after you left.
  useEffect(() => stop, [stop]);

  return { status, live, notes, start, stop, reset };
}
