"use client";
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from "react";

type Voice={oscillator:OscillatorNode;gain:GainNode};
const semitones:Record<string,number>={C:0,"C♯":1,"D♭":1,D:2,"D♯":3,"E♭":3,E:4,F:5,"F♯":6,"G♭":6,G:7,"G♯":8,"A♭":8,A:9,"A♯":10,"B♭":10,B:11};
export function pitchFrequency(note:string,octave:number){return 440*2**(((octave+1)*12+semitones[note]-69)/12)}
function useAudioEngine(){
  const [bpm,setBpmState]=useState(76),[metro,setMetro]=useState(false),[accent,setAccent]=useState(true),[beats,setBeats]=useState(4),[drones,setDrones]=useState<string[]>([]);
  const context=useRef<AudioContext|null>(null),voices=useRef(new Map<string,Voice>()),tempoByScore=useRef(new Map<string,number>()),score=useRef<string|null>(null);
  const getAudio=()=>{const audio=context.current??(context.current=new AudioContext());void audio.resume();return audio};
  function setBpm(value:number){if(!Number.isFinite(value))return;const next=Math.max(40,Math.min(220,Math.round(value)));if(score.current)tempoByScore.current.set(score.current,next);setBpmState(next)}
  // A piece's starting tempo is only a suggestion, so it is not remembered:
  // the reader calls this with 76 first and again with the score's marking once
  // the XML is read, and the marking must win. Only tempos the player picks
  // (setBpm) are kept per piece.
  function initializeScore(id:string,tempo:number){score.current=id;const chosen=tempoByScore.current.get(id);if(chosen!==undefined){setBpmState(chosen);return}if(Number.isFinite(tempo))setBpmState(Math.max(40,Math.min(220,Math.round(tempo))))}
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
    if(!metro)return;
    const audio=getAudio();
    const secondsPerBeat=60/bpm;
    const lookahead=1.6;
    let beat=0;
    let nextTime=0;
    // Every oscillator already booked on the audio thread. Stopping the
    // metronome has to stop these too: with a 1.6s lookahead there are
    // always a few beats scheduled ahead, and simply clearing the timer
    // left them to play out — which is why it kept ticking for about four
    // more beats after you pressed stop.
    const booked=new Set<OscillatorNode>();
    const bookBeat=(time:number)=>{
      const oscillator=audio.createOscillator(),gain=audio.createGain();
      const strong=accent&&beat%beats===0;
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
    const schedule=()=>{
      while(nextTime<audio.currentTime+lookahead){
        bookBeat(nextTime);
        nextTime+=secondsPerBeat;
      }
    };
    // A short settle before the first click. Holding + on the tempo
    // re-ran this effect on every press, and each run started a beat
    // immediately — so a handful of taps produced a burst of clicks
    // jammed together instead of a tempo change.
    const start=window.setTimeout(()=>{
      nextTime=audio.currentTime+0.06;
      schedule();
    },260);
    const timer=window.setInterval(()=>{if(nextTime)schedule()},250);
    return()=>{
      window.clearTimeout(start);
      window.clearInterval(timer);
      const now=audio.currentTime;
      booked.forEach(oscillator=>{try{oscillator.stop(now)}catch{/* already ended */}});
      booked.clear();
    };
  },[metro,bpm,accent,beats]);
  function toggleDrone(note:string,octave:number){
    const key=`${note}${octave}`,audio=getAudio(),existing=voices.current.get(key);
    if(existing){existing.gain.gain.setTargetAtTime(.0001,audio.currentTime,.025);existing.oscillator.stop(audio.currentTime+.12);voices.current.delete(key)}
    else{const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.type="triangle";oscillator.frequency.value=pitchFrequency(note,octave);gain.gain.setValueAtTime(.0001,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.032,audio.currentTime+.12);oscillator.connect(gain).connect(audio.destination);oscillator.start();voices.current.set(key,{oscillator,gain})}
    setDrones([...voices.current.keys()]);
  }
  function stopAllDrones(){const audio=context.current;voices.current.forEach(({oscillator,gain})=>{if(audio){gain.gain.setTargetAtTime(.0001,audio.currentTime,.025);oscillator.stop(audio.currentTime+.12)}else oscillator.stop()});voices.current.clear();setDrones([])}
  useEffect(()=>()=>{voices.current.forEach(({oscillator})=>oscillator.stop());void context.current?.close()},[]);
  return {bpm,setBpm,metro,toggleMetro,accent,setAccent,beats,setBeats,drones,toggleDrone,stopAllDrones,initializeScore,getAudio};
}
const Context=createContext<ReturnType<typeof useAudioEngine>|null>(null);
export function PracticeAudioProvider({children}:{children:ReactNode}){const value=useAudioEngine();return <Context.Provider value={value}>{children}</Context.Provider>}
export function usePracticeAudio(){const value=useContext(Context);if(!value)throw new Error("PracticeAudioProvider is required");return value}
export function openPracticeTool(tool:"metronome"|"tuner"|"drone"){window.dispatchEvent(new CustomEvent("cookie:open-practice-tools",{detail:{tool}}))}
