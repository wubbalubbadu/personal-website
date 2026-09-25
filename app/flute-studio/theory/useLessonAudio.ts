'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {pitchAt} from './model';
import {toneSamples} from './toneSamples';
export function useLessonAudio(){
  const context=useRef<AudioContext|null>(null),voices=useRef(new Map<AudioBufferSourceNode,GainNode>());
  const frame=useRef(0),generation=useRef(0);
  const [playing,setPlaying]=useState(-1),[muted,setMuted]=useState(false),[error,setError]=useState('');
  const stop=useCallback(()=>{
    generation.current++;cancelAnimationFrame(frame.current);
    const now=context.current?.currentTime??0;
    voices.current.forEach((gain,source)=>{
      // This gate is constant until interrupted; the note envelope is in its samples.
      gain.gain.cancelScheduledValues(now);gain.gain.setValueAtTime(1,now);
      gain.gain.linearRampToValueAtTime(0,now+.065);
      try{source.stop(now+.07)}catch{/* already ended */}
    });
    voices.current.clear();setPlaying(-1);
  },[]);
  const play=useCallback(async(positions:number[],duration=.72,offset=0,rawMidi=false)=>{
    stop();if(muted||!positions.length)return;
    const token=generation.current;
    try{
      const audio=context.current&&context.current.state!=='closed'?context.current:(context.current=new AudioContext());
      await audio.resume();if(token!==generation.current)return;
      if(audio.state!=='running')throw new Error('Audio did not start');
      setError('');const start=audio.currentTime+.012;
      positions.forEach((position,index)=>{
        const frequency=440*2**(((rawMidi?position:pitchAt(position).midi)-69)/12);
        const samples=toneSamples(frequency,duration,audio.sampleRate),buffer=audio.createBuffer(1,samples.length,audio.sampleRate);
        buffer.copyToChannel(samples,0);
        const source=audio.createBufferSource(),gain=audio.createGain();source.buffer=buffer;gain.gain.value=1;
        source.connect(gain).connect(audio.destination);voices.current.set(source,gain);
        source.onended=()=>{voices.current.delete(source);source.disconnect();gain.disconnect()};
        source.start(start+index*duration);
      });
      const tick=()=>{if(token!==generation.current)return;const index=Math.floor((audio.currentTime-start)/duration);setPlaying(index>=0&&index<positions.length?index+offset:-1);if(audio.currentTime<start+positions.length*duration)frame.current=requestAnimationFrame(tick)};tick();
    }catch(err){console.warn('Theory lesson audio:',err);setError('Sound could not start. Tap a note to retry.');stop()}
  },[muted,stop]);
  useEffect(()=>{const hide=()=>{if(document.hidden)stop()};document.addEventListener('visibilitychange',hide);return()=>{document.removeEventListener('visibilitychange',hide);stop();const audio=context.current;context.current=null;if(audio)void audio.close().catch(()=>{})}},[stop]);
  return {play,stop,playing,muted,error,toggleMute:()=>{stop();setMuted(v=>!v)}};
}
