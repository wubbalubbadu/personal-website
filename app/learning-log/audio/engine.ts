/**
 * A tiny shared Web Audio layer for the demos.
 *
 * One AudioContext for the whole page, created lazily on the first user gesture
 * (browsers block audio before that). Widgets ask for a `ToneVoice` — an
 * oscillator + gain they can start, stop, and retune — or tap `analyser()` for
 * an FFT node to draw a spectrogram from.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sharedAnalyser: AnalyserNode | null = null;

function actx(): AudioContext {
  if (ctx) return ctx;
  type WithWebkit = typeof globalThis & { webkitAudioContext?: typeof AudioContext };
  const Ctor = window.AudioContext ?? (window as WithWebkit).webkitAudioContext;
  if (!Ctor) throw new Error("Web Audio is not available in this browser.");
  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);
  return ctx;
}

/** Call from a click/tap handler before making sound. */
export async function resume(): Promise<void> {
  const c = actx();
  if (c.state === "suspended") await c.resume();
}

/** The shared context and its master bus, for helpers that build their own graphs. */
export function getContext(): AudioContext {
  return actx();
}
export function getMaster(): GainNode {
  actx();
  return master!;
}

export function sampleRate(): number {
  return actx().sampleRate;
}

export function isRunning(): boolean {
  return ctx?.state === "running";
}

export type ToneVoice = {
  /** Ramp to an audible level. */
  start: (when?: number) => void;
  /** Ramp to silence and release the nodes shortly after. */
  stop: () => void;
  setFrequency: (hz: number) => void;
  setGain: (g: number) => void;
  /** Feed this voice into the shared analyser so a spectrogram can see it. */
  connectAnalyser: () => void;
  readonly node: OscillatorNode;
};

export function makeTone(
  freq: number,
  type: OscillatorType = "sine",
  peakGain = 0.25,
): ToneVoice {
  const c = actx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = 0;
  osc.connect(gain).connect(master!);
  osc.start();
  let released = false;

  return {
    node: osc,
    start(when = 0) {
      const t = c.currentTime + when;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setTargetAtTime(peakGain, t, 0.015);
    },
    stop() {
      if (released) return;
      const t = c.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setTargetAtTime(0, t, 0.03);
      released = true;
      window.setTimeout(() => {
        try {
          osc.stop();
          osc.disconnect();
          gain.disconnect();
        } catch {
          /* already gone */
        }
      }, 200);
    },
    setFrequency(hz: number) {
      osc.frequency.setTargetAtTime(hz, c.currentTime, 0.02);
    },
    setGain(g: number) {
      gain.gain.setTargetAtTime(g, c.currentTime, 0.02);
    },
    connectAnalyser() {
      gain.connect(analyser());
    },
  };
}

/** Shared FFT node. Draw from it with `getByteFrequencyData`. */
export function analyser(): AnalyserNode {
  if (sharedAnalyser) return sharedAnalyser;
  const c = actx();
  sharedAnalyser = c.createAnalyser();
  sharedAnalyser.fftSize = 2048;
  sharedAnalyser.smoothingTimeConstant = 0.6;
  sharedAnalyser.minDecibels = -95;
  sharedAnalyser.maxDecibels = -20;
  return sharedAnalyser;
}

/** Route the microphone into the shared analyser. Prompts for permission. */
export async function connectMic(): Promise<MediaStream> {
  const c = actx();
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const src = c.createMediaStreamSource(stream);
  src.connect(analyser());
  return stream;
}
