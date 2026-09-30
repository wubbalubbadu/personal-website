"use client";
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from "react";

import {SCORE_TEMPO_KEY,readTempoRatios,clampTempo} from "./lib/scoreTempo";

type Voice={oscillator:OscillatorNode;gain:GainNode};
/**
 * Score playback's beat grid, in AudioContext time. While one is set the
 * metronome clicks on it (so the clicks land on the notes' beats, pickup and
 * all) instead of free-running from whenever it was switched on.
 * `beatInBar` is which beat of the bar `time` falls on (0 = downbeat).
 */
export type MetronomeGrid={time:number;beatSeconds:number;beatInBar:number;beatsPerBar:number;
  /** Stay on but silent: playback paused, and the metronome waits for it (or for the player) rather than free-running. */
  hold?:boolean;
  /** Exact beat times (AudioContext seconds) when they are not evenly spaced: through an accel. or rit. Beat 0 is `beatInBar`. */
  beatTimes?:number[];
  /** Which of `beatTimes` are downbeats, when the meter changes along the way. */
  beatAccents?:boolean[]};
const semitones:Record<string,number>={C:0,"C♯":1,"D♭":1,D:2,"D♯":3,"E♭":3,E:4,F:5,"F♯":6,"G♭":6,G:7,"G♯":8,"A♭":8,A:9,"A♯":10,"B♭":10,B:11};
export function pitchFrequency(note:string,octave:number){return 440*2**(((octave+1)*12+semitones[note]-69)/12)}
function useAudioEngine(){
  const [bpm,setBpmState]=useState(76),[metro,setMetro]=useState(false),[accent,setAccent]=useState(true),[beats,setBeats]=useState(4),[drones,setDrones]=useState<string[]>([]),[grid,setGrid]=useState<MetronomeGrid|null>(null);
  const context=useRef<AudioContext|null>(null),voices=useRef(new Map<string,Voice>()),tempoRatios=useRef<Record<string,number>|null>(null),printedTempo=useRef(76),score=useRef<string|null>(null);
  const getAudio=()=>{const audio=context.current??(context.current=new AudioContext());void audio.resume();return audio};
  function ratios(){
    if(tempoRatios.current===null){try{tempoRatios.current=readTempoRatios(localStorage.getItem(SCORE_TEMPO_KEY))}catch{tempoRatios.current={}}}
    return tempoRatios.current;
  }
  function setBpm(value:number){
    if(!Number.isFinite(value))return;
    const next=clampTempo(value);
    if(score.current){
      const saved=ratios();saved[score.current]=next/printedTempo.current;
      try{localStorage.setItem(SCORE_TEMPO_KEY,JSON.stringify(saved))}catch{/* Keep this visit's preference when storage is unavailable. */}
    }
    setBpmState(next);
  }
  // Playback changes the section's reference and displayed base without saving a user preference.
  function setPlaybackBpm(value:number,reference:number){
    if(Number.isFinite(reference)&&reference>0)printedTempo.current=reference;
    if(Number.isFinite(value))setBpmState(clampTempo(value));
  }
  // Called once with the catalog suggestion, then with the parsed opening mark.
  // Apply the saved ratio to each reference so the score's real marking wins.
  function initializeScore(id:string,tempo:number){
    score.current=id;
    if(!Number.isFinite(tempo)||tempo<=0)return;
    printedTempo.current=tempo;
    const saved=ratios();setBpmState(clampTempo(tempo*(saved[id]??1)));
  }
  function toggleMetro(){getAudio();setMetro(value=>!value)}
  /**
   * The metronome runs on the AudioContext clock, not on setInterval.
   *
   * A timer-driven metronome sounds right only while the tab is in front:
   * background tabs throttle setInterval to about once a second, so the
   * beat collapsed to roughly 60 whatever the tempo was set to, then
   * snapped back on return. That was the "it switches to a default tempo
   * in another Safari tab" bug.
   *
   * Instead a cheap scheduler wakes up periodically and books every beat
   * falling inside a lookahead window, giving each oscillator an exact
   * start time. Once a beat is booked the audio thread owns it, so the
   * tempo holds even if the scheduler itself is throttled — the lookahead
   * is deliberately longer than the ~1s a throttled tab wakes at.
   */
  useEffect(()=>{
    if(!metro||grid?.hold)return;
    const audio=getAudio();
    const secondsPerBeat=grid?grid.beatSeconds:60/bpm,barLength=grid?grid.beatsPerBar:beats;
    const lookahead=1.6;
    let beat=0;
    let nextTime=0;
    // Every oscillator already booked on the audio thread. Stopping the
    // metronome has to stop these too: with a 1.6s lookahead there are
    // always a few beats scheduled ahead, and simply clearing the timer
    // left them to play out — which is why it kept ticking for about four
    // more beats after you pressed stop.
    const booked=new Set<OscillatorNode>();
    const bookBeat=(time:number,downbeat?:boolean)=>{
      const oscillator=audio.createOscillator(),gain=audio.createGain();
      const strong=accent&&(downbeat??beat%barLength===0);
      oscillator.frequency.value=strong?1500:1100;
      // Loud enough to hear over a flute. A click is 50ms of sound, so it
      // needs a peak well above what a sustained tone would use.
      gain.gain.setValueAtTime(strong?.55:.38,time);
      gain.gain.exponentialRampToValueAtTime(.0001,time+.05);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(time);
      oscillator.stop(time+.06);
      booked.add(oscillator);
      oscillator.onended=()=>booked.delete(oscillator);
      beat+=1;
    };
    // Playback's own beat times, when it bends the tempo: book each one as it
    // comes into the lookahead window, skipping any already past.
    const listed=grid?.beatTimes;let listedAt=0;
    const schedule=()=>{
      if(listed){
        while(listedAt<listed.length&&listed[listedAt]<audio.currentTime+lookahead){
          if(listed[listedAt]>=audio.currentTime)bookBeat(listed[listedAt],grid?.beatAccents?.[listedAt]);else beat+=1;
          listedAt+=1;
        }
        return;
      }
      while(nextTime<audio.currentTime+lookahead){
        bookBeat(nextTime);
        nextTime+=secondsPerBeat;
      }
    };
    // A short settle before the first click. Holding + on the tempo
    // re-ran this effect on every press, and each run started a beat
    // immediately — so a handful of taps produced a burst of clicks
    // jammed together instead of a tempo change.
    // Following playback: no settle, join the grid at its next beat.
    const start=window.setTimeout(()=>{
      if(listed){beat=grid!.beatInBar;nextTime=1}
      else if(grid){const k=Math.max(0,Math.ceil((audio.currentTime+.02-grid.time)/grid.beatSeconds));nextTime=grid.time+k*grid.beatSeconds;beat=grid.beatInBar+k}
      else nextTime=audio.currentTime+0.06;
      schedule();
    },grid?0:260);
    const timer=window.setInterval(()=>{if(nextTime)schedule()},250);
    return()=>{
      window.clearTimeout(start);
      window.clearInterval(timer);
      const now=audio.currentTime;
      booked.forEach(oscillator=>{try{oscillator.stop(now)}catch{/* already ended */}});
      booked.clear();
    };
  },[metro,bpm,accent,beats,grid]);
  function toggleDrone(note:string,octave:number){
    const key=`${note}${octave}`,audio=getAudio(),existing=voices.current.get(key);
    if(existing){existing.gain.gain.setTargetAtTime(.0001,audio.currentTime,.025);existing.oscillator.stop(audio.currentTime+.12);voices.current.delete(key)}
    else{const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.type="triangle";oscillator.frequency.value=pitchFrequency(note,octave);gain.gain.setValueAtTime(.0001,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.032,audio.currentTime+.12);oscillator.connect(gain).connect(audio.destination);oscillator.start();voices.current.set(key,{oscillator,gain})}
    setDrones([...voices.current.keys()]);
  }
  function stopAllDrones(){const audio=context.current;voices.current.forEach(({oscillator,gain})=>{if(audio){gain.gain.setTargetAtTime(.0001,audio.currentTime,.025);oscillator.stop(audio.currentTime+.12)}else oscillator.stop()});voices.current.clear();setDrones([])}
  useEffect(()=>()=>{voices.current.forEach(({oscillator})=>oscillator.stop());void context.current?.close()},[]);
  return {bpm,setBpm,setPlaybackBpm,metro,toggleMetro,accent,setAccent,beats,setBeats,drones,toggleDrone,stopAllDrones,initializeScore,getAudio,alignMetronome:setGrid,metroHeld:metro&&!!grid?.hold};
}
const Context=createContext<ReturnType<typeof useAudioEngine>|null>(null);
export function PracticeAudioProvider({children}:{children:ReactNode}){const value=useAudioEngine();return <Context.Provider value={value}>{children}</Context.Provider>}
export function usePracticeAudio(){const value=useContext(Context);if(!value)throw new Error("PracticeAudioProvider is required");return value}
export function openPracticeTool(tool:"metronome"|"tuner"|"drone"){window.dispatchEvent(new CustomEvent("cookie:open-practice-tools",{detail:{tool}}))}
