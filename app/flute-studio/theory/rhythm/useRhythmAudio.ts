'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {toneSamples} from '../toneSamples';
import {timings} from './rhythmModel';
import {metronomeSamples, clapSamples} from './metronomeSamples';
export function useRhythmAudio() {
  const ctx = useRef<AudioContext | null>(null), voices = useRef(new Map<AudioBufferSourceNode, GainNode>());
  const generation = useRef(0), frame = useRef(0);
  const [active, setActive] = useState(-1), [error, setError] = useState(false), [elapsed, setElapsed] = useState(-1), [beat, setBeat] = useState(-1);
  const countClips = useRef(new Map<string, AudioBuffer>());
  const stop = useCallback(() => {
    generation.current++; cancelAnimationFrame(frame.current); setActive(-1); setElapsed(-1); setBeat(-1);
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
  function voice(audio: AudioContext, samples: Float32Array<ArrayBuffer> | AudioBuffer, at: number, level = 1) {
    let buffer = samples as AudioBuffer;
    if (!(samples instanceof AudioBuffer)) { buffer = audio.createBuffer(1, samples.length, audio.sampleRate); buffer.copyToChannel(samples, 0); }
    const source = audio.createBufferSource(), gain = audio.createGain(); source.buffer = buffer; gain.gain.value = level;
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
  // Spoken counts ("one" to "six"), decoded once per audio context from public/audio/counts.
  async function loadCounts(audio: AudioContext) {
    const words = ['one', 'two', 'three', 'four', 'five', 'six'];
    await Promise.all(words.filter(w => !countClips.current.has(w)).map(async w => {
      const data = await fetch(`/audio/counts/${w}.wav`).then(r => r.arrayBuffer());
      countClips.current.set(w, await audio.decodeAudioData(data));
    }));
    return words.map(w => countClips.current.get(w)!);
  }
  /**
   * Notes, a click on every beat (beat 1 louder) and the count spoken on each beat, all on the
   * audio clock so they land together. `beatUnit` is one beat in quarter notes (1 for /4, 2 for
   * /2, .5 for /8); `top` is beats per measure. A count that falls inside a held note is spoken
   * more softly. `countOffset` starts the count later (a pickup one beat before beat 1 in 3 is 2).
   * `beat` reports the beat sounding now (counted from 0) for lighting counts.
   */
  const counted = useCallback(async ({values, pitches = [], top = 4, beatUnit = 1, countOffset = 0, speak = true, click = true, notes = true, offset = 0, secondsPerQuarter = .65}:
    {values: readonly number[]; pitches?: number[]; top?: number; beatUnit?: number; countOffset?: number; speak?: boolean; click?: boolean; notes?: boolean; offset?: number; secondsPerQuarter?: number}) => {
    stop(); const token = generation.current;
    try {
      const audio = await running(); const clips = speak ? await loadCounts(audio) : [];
      if (token !== generation.current) return; setError(false);
      const events = timings(values, secondsPerQuarter), start = audio.currentTime + .06;
      // Balance: the melody leads, the clicks keep time underneath, the voice counts softly on top.
      // (The count clips are normalised near full scale, the tone is quiet, so both need scaling.)
      if (notes) events.forEach((event, i) => voice(audio, toneSamples(440 * 2 ** (((pitches[i] ?? 67) - 69) / 12), event.duration, audio.sampleRate), start + event.start, 2.4));
      const total = values.reduce((a, b) => a + b, 0), beats = Math.round(total / beatUnit), beatSeconds = beatUnit * secondsPerQuarter;
      const onsets = new Set(events.map(e => Math.round(e.start / beatSeconds * 1000)));
      for (let b = 0; b < beats; b++) {
        const count = (b + countOffset) % top, at = start + b * beatSeconds, first = count === 0;
        if (click) voice(audio, metronomeSamples(audio.sampleRate), at, first ? 1.5 : .85);
        if (speak) voice(audio, clips[count] ?? clips[0], at, onsets.has(b * 1000) ? .12 : .05);
      }
      const end = beats * beatSeconds;
      const tick = () => {
        if (token !== generation.current) return;
        const time = audio.currentTime - start, playing = time < end;
        setElapsed(playing ? Math.max(0, time) : -1); setBeat(playing && time >= 0 ? Math.floor(time / beatSeconds) : -1);
        const index = events.findIndex(event => time >= event.start && time < event.start + event.duration); setActive(index < 0 ? -1 : index + offset);
        if (playing) frame.current = requestAnimationFrame(tick);
      }; tick();
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
  return {play, stop, clicks, clap, counted, active, error, elapsed, beat};
}
