import { analyser, getContext, getMaster } from "./engine";

/**
 * Synthesized drum voices + a small look-ahead step sequencer.
 *
 * Voices are the classic one-liners: kick = pitch-dropping sine, snare = noise
 * burst + body tone, hat = high-passed noise. The sequencer schedules a few
 * steps into the future on a timer so timing stays tight even when the main
 * thread is busy (the Web Audio "tale of two clocks" pattern).
 */

type Bus = { ctx: AudioContext; out: AudioNode };
function bus(): Bus {
  const ctx = getContext();
  const out = getMaster();
  // also feed the analyser so a spectrogram can see the hits
  return { ctx, out };
}

function noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const n = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

export function kick(at: number, gain = 1) {
  const { ctx, out } = bus();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.frequency.setValueAtTime(150, at);
  osc.frequency.exponentialRampToValueAtTime(45, at + 0.12);
  g.gain.setValueAtTime(Math.max(0.001, gain), at);
  g.gain.exponentialRampToValueAtTime(0.001, at + 0.32);
  osc.connect(g);
  g.connect(out);
  g.connect(analyser());
  osc.start(at);
  osc.stop(at + 0.35);
}

export function snare(at: number, gain = 0.9) {
  const { ctx, out } = bus();
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer(ctx, 0.2);
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 1600;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(Math.max(0.001, gain), at);
  ng.gain.exponentialRampToValueAtTime(0.001, at + 0.18);
  noise.connect(hp).connect(ng).connect(out);
  ng.connect(analyser());

  const tone = ctx.createOscillator();
  tone.type = "triangle";
  tone.frequency.value = 180;
  const tg = ctx.createGain();
  tg.gain.setValueAtTime(gain * 0.5, at);
  tg.gain.exponentialRampToValueAtTime(0.001, at + 0.12);
  tone.connect(tg).connect(out);

  noise.start(at);
  noise.stop(at + 0.2);
  tone.start(at);
  tone.stop(at + 0.13);
}

export function hat(at: number, gain = 0.5, open = false) {
  const { ctx, out } = bus();
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer(ctx, open ? 0.3 : 0.06);
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 7000;
  const g = ctx.createGain();
  const dur = open ? 0.25 : 0.045;
  g.gain.setValueAtTime(Math.max(0.001, gain), at);
  g.gain.exponentialRampToValueAtTime(0.001, at + dur);
  noise.connect(hp).connect(g).connect(out);
  g.connect(analyser());
  noise.start(at);
  noise.stop(at + dur + 0.02);
}

export type Voice = "hat" | "snare" | "kick";
export const VOICES: Voice[] = ["hat", "snare", "kick"];

/** A 2-bar, 8-step-per-bar step sequencer. `pattern[voice]` is a boolean[16]. */
export class StepSequencer {
  private timer = 0;
  private nextStep = 0;
  private nextTime = 0;
  private readonly lookahead = 0.1; // seconds scheduled ahead
  private readonly tick = 25; // ms between scheduler wakeups
  running = false;

  constructor(
    public pattern: Record<Voice, boolean[]>,
    public bpm = 120,
    public steps = 16,
    private onStep?: (step: number) => void,
  ) {}

  private stepDur(): number {
    // 8 steps per bar in 4/4 => each step is an eighth note
    return 60 / this.bpm / 2;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.nextStep = 0;
    this.nextTime = getContext().currentTime + 0.05;
    this.loop();
  }

  stop() {
    this.running = false;
    window.clearTimeout(this.timer);
  }

  setBpm(bpm: number) {
    this.bpm = bpm;
  }

  private loop = () => {
    if (!this.running) return;
    const ctx = getContext();
    while (this.nextTime < ctx.currentTime + this.lookahead) {
      const s = this.nextStep;
      if (this.pattern.kick[s]) kick(this.nextTime, 1);
      if (this.pattern.snare[s]) snare(this.nextTime, 0.9);
      if (this.pattern.hat[s]) hat(this.nextTime, 0.4);
      if (this.onStep) {
        const when = (this.nextTime - ctx.currentTime) * 1000;
        const captured = s;
        window.setTimeout(() => this.onStep?.(captured), Math.max(0, when));
      }
      this.nextTime += this.stepDur();
      this.nextStep = (this.nextStep + 1) % this.steps;
    }
    this.timer = window.setTimeout(this.loop, this.tick);
  };
}
