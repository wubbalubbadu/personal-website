'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {toneSamples} from '../toneSamples';
import {timings} from './rhythmModel';
import {metronomeSamples, clapSamples} from './metronomeSamples';
export function useRhythmAudio() {
  const ctx = useRef<AudioContext | null>(null), voices = useRef(new Map<AudioBufferSourceNode, GainNode>());
  const generation = useRef(0), frame = useRef(0);
  const [active, setActive] = useState(-1), [error, setError] = useState(false), [elapsed, setElapsed] = useState(-1);
  const stop = useCallback(() => {
    generation.current++; cancelAnimationFrame(frame.current); setActive(-1); setElapsed(-1);
    const now = ctx.current?.currentTime ?? 0;
    voices.current.forEach((gain, source) => {
      gain.gain.cancelScheduledValues(now); gain.gain.setValueAtTime(1, now); gain.gain.linearRampToValueAtTime(0, now + .06);
      try { source.stop(now + .065); } catch { /* Voice already ended. */ }
    }); voices.current.clear();
  }, []);
  const play = useCallback(async (values: readonly number[], pitches: number[] = [], offset = 0, metronome = true) => {
    stop(); const token = generation.current;
    try {
      const audio = ctx.current && ctx.current.state !== 'closed' ? ctx.current : (ctx.current = new AudioContext());
      await audio.resume(); if (token !== generation.current) return;
      if (audio.state !== 'running') throw new Error('Audio unavailable');
      setError(false);
      const events = timings(values), start = audio.currentTime + .025;
      events.forEach((event, i) => {
        const samples = toneSamples(440 * 2 ** (((pitches[i] ?? 67) - 69) / 12), event.duration, audio.sampleRate);
        const buffer = audio.createBuffer(1, samples.length, audio.sampleRate); buffer.copyToChannel(samples, 0);
        const voice = audio.createBufferSource(), gain = audio.createGain(); voice.buffer = buffer;
        voice.connect(gain).connect(audio.destination); voices.current.set(voice, gain);
        voice.onended = () => { voices.current.delete(voice); voice.disconnect(); gain.disconnect(); };
        voice.start(start + event.start);
      });
      const end = events.at(-1); if (!end) return;
      if (metronome) for (let time = 0; time < end.start + end.duration - .001; time += .65) {
        const samples = metronomeSamples(audio.sampleRate), buffer = audio.createBuffer(1, samples.length, audio.sampleRate);
        buffer.copyToChannel(samples, 0); const voice = audio.createBufferSource(), gain = audio.createGain(); voice.buffer = buffer;
        voice.connect(gain).connect(audio.destination); voices.current.set(voice, gain);
        voice.onended = () => { voices.current.delete(voice); voice.disconnect(); gain.disconnect(); }; voice.start(start + time);
      }
      const tick = () => {
        if (token !== generation.current) return;
        const time = audio.currentTime - start; setElapsed(time < end.start + end.duration ? Math.max(0, time) : -1);
        const index = events.findIndex(event => time >= event.start && time < event.start + event.duration); setActive(index < 0 ? -1 : index + offset);
        if (time < end.start + end.duration) frame.current = requestAnimationFrame(tick);
      }; tick();
    } catch { setError(true); stop(); }
  }, [stop]);
  async function running() {
    const audio = ctx.current && ctx.current.state !== 'closed' ? ctx.current : (ctx.current = new AudioContext());
    await audio.resume(); if (audio.state !== 'running') throw new Error('Audio unavailable');
    return audio;
  }
  function voice(audio: AudioContext, samples: Float32Array<ArrayBuffer>, at: number) {
    const buffer = audio.createBuffer(1, samples.length, audio.sampleRate); buffer.copyToChannel(samples, 0);
    const source = audio.createBufferSource(), gain = audio.createGain(); source.buffer = buffer;
    source.connect(gain).connect(audio.destination); voices.current.set(source, gain);
    source.onended = () => { voices.current.delete(source); source.disconnect(); gain.disconnect(); }; source.start(at);
  }
  // Clicks only: a count-in and a steady beat to clap along with. `elapsed` drives the beat dots.
  const clicks = useCallback(async (count: number) => {
    stop(); const token = generation.current;
    try {
      const audio = await running(); if (token !== generation.current) return; setError(false);
      const start = audio.currentTime + .05, end = count * .65;
      for (let i = 0; i < count; i++) voice(audio, metronomeSamples(audio.sampleRate), start + i * .65);
      const tick = () => { if (token !== generation.current) return; const time = audio.currentTime - start; setElapsed(time < end ? Math.max(0, time) : -1); if (time < end) frame.current = requestAnimationFrame(tick); }; tick();
    } catch { setError(true); stop(); }
  }, [stop]);
  // One clap, layered over whatever is playing (it must not cut off the count-in clicks).
  const clap = useCallback(async () => {
    try { const audio = await running(); voice(audio, clapSamples(audio.sampleRate), audio.currentTime); } catch { setError(true); }
  }, []);
  useEffect(() => {
    const hide = () => { if (document.hidden) stop(); }; document.addEventListener('visibilitychange', hide);
    return () => { document.removeEventListener('visibilitychange', hide); stop(); const audio=ctx.current; ctx.current=null; void audio?.close().catch(() => {}); };
  }, [stop]);
  return {play, stop, clicks, clap, active, error, elapsed};
}
