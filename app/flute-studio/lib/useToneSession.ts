'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePracticeAudio } from '../PracticeAudio';
import { detectPitch } from './pitch';
import { ToneSession, type ToneTarget, type ToneSnapshot } from './toneSession';

export function useToneSession(targets: ToneTarget[]) {
  const { getAudio } = usePracticeAudio();
  const session = useRef(new ToneSession(targets));
  const [snapshot, setSnapshot] = useState<ToneSnapshot>({cursor:0,live:null,attempts:[],heard:false,cursorAfter:false});
  const [status, setStatus] = useState<'idle' | 'starting' | 'listening' | 'paused'>('idle');
  const [error, setError] = useState('');
  const resources = useRef<{ stream: MediaStream; source: MediaStreamAudioSourceNode; filter: BiquadFilterNode; analyser: AnalyserNode } | null>(null);
  const animation = useRef(0), generation = useRef(0), origin = useRef<number | null>(null);
  const wake = useRef<WakeLockSentinel | null>(null);
  const publish = useCallback(() => setSnapshot(session.current.snapshot()), []);
  const release = useCallback(() => {
    generation.current++;
    cancelAnimationFrame(animation.current);
    const r = resources.current;
    r?.stream.getTracks().forEach(t => t.stop());
    r?.source.disconnect(); r?.filter.disconnect(); r?.analyser.disconnect();
    resources.current = null;
    void wake.current?.release(); wake.current = null;
  }, []);
  const pause = useCallback(() => { release(); session.current.pause(); publish(); setStatus('paused'); }, [release, publish]);
  const start = useCallback(async () => {
    if (resources.current) return;
    const token = ++generation.current;
    setStatus('starting'); setError('');
    let acquired: MediaStream | null = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('unavailable');
      acquired = await navigator.mediaDevices.getUserMedia({audio:{autoGainControl:false,echoCancellation:false,noiseSuppression:false}});
      if (token !== generation.current) { acquired.getTracks().forEach(t => t.stop()); return; }
      const context = getAudio(); await context.resume();
      if (token !== generation.current) { acquired.getTracks().forEach(t => t.stop()); return; }
      const source = context.createMediaStreamSource(acquired), filter = context.createBiquadFilter(), analyser = context.createAnalyser();
      filter.type = 'highpass'; filter.frequency.value = 150; filter.Q.value = .7;
      analyser.fftSize = 4096;
      source.connect(filter).connect(analyser);
      resources.current = {stream:acquired,source,filter,analyser};
      if (origin.current === null) origin.current = performance.now();
      const data = new Float32Array(4096);
      let last = -Infinity;
      setStatus('listening');
      if ('wakeLock' in navigator) void navigator.wakeLock.request('screen').then(lock => {
        if (token !== generation.current) void lock.release(); else wake.current = lock;
      }).catch(() => {});
      const tick = (now: number) => {
        if (token !== generation.current) return;
        if (now - last >= 30) {
          last = now;
          analyser.getFloatTimeDomainData(data);
          const estimate = detectPitch(data, context.sampleRate, session.current.isSounding() ? .004 : .014);
          const at = now - origin.current!;
          session.current.push(estimate ? {...estimate,at} : null, at);
          publish();
        }
        animation.current = requestAnimationFrame(tick);
      };
      animation.current = requestAnimationFrame(tick);
    } catch (e) {
      acquired?.getTracks().forEach(t => t.stop());
      if (token !== generation.current) return;
      release(); setStatus('paused');
      setError(e instanceof DOMException && e.name === 'NotAllowedError' ? 'permission' : 'unavailable');
    }
  }, [getAudio, publish, release]);
  useEffect(() => {
    const hidden = () => { if (document.hidden && resources.current) pause(); };
    document.addEventListener('visibilitychange', hidden);
    return () => { document.removeEventListener('visibilitychange', hidden); release(); };
  }, [pause, release]);
  return { ...snapshot, status, error, start, pause,
    select: (index: number) => { session.current.select(index); publish(); },
    clear: () => { session.current.clear(); publish(); },
    setRepeat: (repeat: boolean) => { session.current.repeat = repeat; },
  };
}
