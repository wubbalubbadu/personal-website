"use client";
import {createContext,useContext,useEffect,useLayoutEffect,useRef,useState,type ReactNode} from "react";

import {SCORE_TEMPO_KEY,readTempoRatios,clampTempo} from "./lib/scoreTempo";
import {MIC_CLOSED,preferPlayback} from "./lib/audioSession";
import {hasTouchScreen} from "./lib/pencilMode";
import {droneSamplesIfReady,droneVoice,loadDroneSamples} from "./components/sampledDrone";
import {getToolSounds,referenceA,subscribeToolSounds} from "./lib/toolSounds";
import {bookSound,prepareClickSounds} from "./components/clickSounds";
import {createToolMetronomeScheduler} from "./lib/toolMetronomeScheduler";
import {DEFAULT_SETUP,SETUP_KEY,readSetup,type Bar,type MetronomeSetup,type PulseState} from "./lib/metronomeSetup";

type Voice={oscillator:OscillatorNode|AudioBufferSourceNode;gain:GainNode};
const asVoice=({source,gain}:{source:OscillatorNode|AudioBufferSourceNode;gain:GainNode}):Voice=>({oscillator:source,gain});
/** A drone still waiting for its samples was never started, so stopping it throws; ignore that. */
const stopVoice=(voice:Voice,at?:number)=>{try{voice.oscillator.stop(at)}catch{/* Not started yet. */}};
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
  beatAccents?:boolean[];
  /** Subdivision ticks between the beats (AudioContext seconds): quieter and lower, so the beat stays clear. */
  subTimes?:number[]};
const semitones:Record<string,number>={C:0,"C♯":1,"D♭":1,D:2,"D♯":3,"E♭":3,E:4,F:5,"F♯":6,"G♭":6,G:7,"G♯":8,"A♭":8,A:9,"A♯":10,"B♭":10,B:11};
/**
 * The metronome's click: strong (bar downbeat) is the accent. Shared with the reader's count-in and the rhythm drills
 * so they all sound the same. The sound itself (beep, woodblock, tick, counting voice) and its volume are the
 * studio's choice in the tools panel (components/clickSounds.ts). `count` is the beat's number in the bar, for the
 * counting voice.
 */
export function bookClick(audio:BaseAudioContext,time:number,strong:boolean,count=0,beatSeconds?:number){
  return bookSound(audio,time,strong?"accent":"normal",count,beatSeconds);
}
/** A subdivision tick: quieter and lower than a beat click, so the beat stays clear. Shared with the reader's count-in. */
export function bookTick(audio:BaseAudioContext,time:number){
  return bookSound(audio,time,"tick");
}
export function pitchFrequency(note:string,octave:number){return referenceA()*2**(((octave+1)*12+semitones[note]-69)/12)}
function useAudioEngine(){
  const [bpm,setBpmState]=useState(60),[metro,setMetro]=useState(false),[accent,setAccent]=useState(true),[beats,setBeats]=useState(4),[drones,setDrones]=useState<string[]>([]),[grid,setGrid]=useState<MetronomeGrid|null>(null),[audioEpoch,setAudioEpoch]=useState(0),[subdivision,setSubdivision]=useState<1|2|3|4>(1);
  // The tools panel's metronome options (lib/metronomeSetup.ts), used only while the panel started the click (toolMode).
  // Read once on the client (the panel that shows it never renders on the server).
  const [setup,setSetupState]=useState<MetronomeSetup>(()=>{if(typeof window==="undefined")return DEFAULT_SETUP;try{return readSetup(localStorage.getItem(SETUP_KEY))}catch{return DEFAULT_SETUP}}),[toolMode,setToolMode]=useState(false);
  const setupRef=useRef(setup),beatsRef=useRef(beats),accentRef=useRef(accent),toolRetime=useRef<(()=>void)|null>(null),resetup=useRef<(()=>void)|null>(null);
  const toolBars=useRef<{start:number;bar:Bar}[]>([]);
  const bpmRef=useRef(60),retime=useRef<(()=>void)|null>(null),context=useRef<AudioContext|null>(null),voices=useRef(new Map<string,Voice>()),tempoRatios=useRef<Record<string,number>|null>(null),printedTempo=useRef(60),score=useRef<string|null>(null);
  const getAudio=()=>{preferPlayback();let audio=context.current;if(!audio||audio.state==='closed'){audio=context.current=new AudioContext();droneSamplesIfReady(audio)/* fetch the drone samples early */}void audio.resume();void prepareClickSounds(audio).then(loaded=>{if(loaded&&context.current===audio){resetup.current?.();retime.current?.()}});return audio};
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
  // remember=false: the page keeps its own tempos (Scale Studio, per exercise), so the per-score ratio is neither
  // applied nor saved. Applying both multiplied a tempo twice: raise a scale from 60 to 90 and it came back as 135.
  function initializeScore(id:string,tempo:number,remember=true){
    score.current=remember?id:null;
    if(!Number.isFinite(tempo)||tempo<=0)return;
    printedTempo.current=tempo;
    const saved=remember?ratios():{};setBpmState(clampTempo(tempo*(saved[id]??1)));
  }
  function toggleMetro(){getAudio();setToolMode(false);setMetro(value=>!value)}
  /** The tools panel's play button: the same metronome, played with the panel's options. */
  function toggleToolMetro(){getAudio();setToolMode(true);setMetro(value=>!value)}
  function setSetup(next:MetronomeSetup){
    setSetupState(next);
    try{localStorage.setItem(SETUP_KEY,JSON.stringify(next))}catch{/* Keep this visit's setup when storage is unavailable. */}
    // Changed in the panel while another page's plain click runs free: from now on it plays the panel's options.
    if(metro&&!toolMode&&!grid)setToolMode(true);
  }
  /** Which click of the bar is sounding now (silent ones included), for the panel's beat dots. */
  function toolBeat():number|null{
    const audio=context.current;if(!audio||!metro||!toolMode||grid)return null;
    const now=audio.currentTime,entry=toolBars.current.findLast(b=>b.start<=now);
    if(!entry||now>=entry.start+entry.bar.length)return null;
    let click=0;entry.bar.clickAt.forEach((t,i)=>{if(entry.start+t<=now)click=i});return click;
  }
  /** Pulse training: the round the bar sounding now belongs to, and whether this bar is a silent one. */
  function toolPulse():(PulseState&{silent:boolean})|null{
    const audio=context.current;if(!audio||!metro||!toolMode||grid)return null;
    const now=audio.currentTime,entry=toolBars.current.findLast(b=>b.start<=now);
    return entry&&now<entry.start+entry.bar.length?entry.bar.pulse??null:null;
  }
  function stopMetro(){setMetro(false)}
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
  // Layout effects run before effects, so the metronome below always reads this render's tempo.
  useLayoutEffect(()=>{bpmRef.current=bpm},[bpm]);
  useLayoutEffect(()=>{setupRef.current=setup;beatsRef.current=beats;accentRef.current=accent},[setup,beats,accent]);
  useEffect(()=>{
    // The tools panel's own click runs in the effect below; a score's grid still wins (playback lays the beats).
    if(!metro||grid?.hold||(toolMode&&!grid))return;
    const audio=getAudio();
    let secondsPerBeat=grid?grid.beatSeconds:60/bpmRef.current;const barLength=grid?grid.beatsPerBar:beats;
    const lookahead=1.6;
    let beat=0;
    let nextTime=0;
    // Every oscillator already booked on the audio thread. Stopping the
    // metronome has to stop these too: with a 1.6s lookahead there are
    // always a few beats scheduled ahead, and simply clearing the timer
    // left them to play out — which is why it kept ticking for about four
    // more beats after you pressed stop.
    // Each booked click with its start time and beat number, so a tempo change can cancel only the ones still to come.
    const booked=new Map<AudioScheduledSourceNode,{time:number;beat:number}>(),beatLog:{time:number;beat:number}[]=[];
    const bookBeat=(time:number,downbeat?:boolean)=>{
      const oscillator=bookClick(audio,time,accent&&(downbeat??beat%barLength===0),(beat%barLength)+1,secondsPerBeat);
      booked.set(oscillator,{time,beat});
      oscillator.addEventListener("ended",()=>booked.delete(oscillator),{once:true});
      // Kept after the click ends (booked forgets it): a re-time needs the last beat heard to continue the pulse from.
      beatLog.push({time,beat});if(beatLog.length>16)beatLog.shift();
      beat+=1;
    };
    // Playback's own beat times, when it bends the tempo: book each one as it
    // comes into the lookahead window, skipping any already past.
    const listed=grid?.beatTimes;let listedAt=0;
    const subs=grid?.subTimes;let subAt=0;
    const bookSubTick=(time:number)=>{
      const oscillator=bookTick(audio,time);
      booked.set(oscillator,{time,beat:-1});oscillator.addEventListener("ended",()=>booked.delete(oscillator),{once:true});
    };
    const schedule=()=>{
      if(subs)while(subAt<subs.length&&subs[subAt]<audio.currentTime+lookahead){if(subs[subAt]>=audio.currentTime)bookSubTick(subs[subAt]);subAt+=1}
      if(listed){
        while(listedAt<listed.length&&listed[listedAt]<audio.currentTime+lookahead){
          // A click a few milliseconds late still plays, at once; only one that is really gone is skipped.
          if(listed[listedAt]>=audio.currentTime-.03)bookBeat(Math.max(listed[listedAt],audio.currentTime+.005),grid?.beatAccents?.[listedAt]);else beat+=1;
          listedAt+=1;
        }
        return;
      }
      // Back from another tab, or after iOS interrupted the audio: rejoin from now rather than playing every missed beat at once.
      if(nextTime<audio.currentTime-.05){const missed=Math.ceil((audio.currentTime+.05-nextTime)/secondsPerBeat);nextTime+=missed*secondsPerBeat;beat+=missed}
      while(nextTime<audio.currentTime+lookahead){
        bookBeat(nextTime);
        // Subdivision ticks between free-running beats (playback lays its own as subTimes).
        if(!subs)for(let k=1;k<subdivision;k++)bookSubTick(nextTime+k*secondsPerBeat/subdivision);
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
      else{secondsPerBeat=60/bpmRef.current;nextTime=audio.currentTime+0.06}
      schedule();
    },grid?0:260);
    const timer=window.setInterval(()=>{if(nextTime)schedule()},250);
    // A new tempo while clicking (typed, −/+, held): keep the beat going. Cancel only the clicks not yet sounded and
    // continue one new-tempo beat after the last one heard, so no old click lands on top of a new one and nothing
    // needs stopping and restarting. Playback's own grid sets its own times, so this is the free-running click only.
    retime.current=()=>{
      if(grid||!nextTime)return;
      const now=audio.currentTime;
      // A click due within 0.1s plays (stopping it that late could clip it, and holding + would otherwise silence every beat).
      booked.forEach((info,oscillator)=>{if(info.time>now+.1){try{oscillator.stop(now)}catch{/* already ended */}booked.delete(oscillator)}});
      for(let i=beatLog.length-1;i>=0;i--)if(beatLog[i].time>now+.1)beatLog.splice(i,1);
      const last=beatLog.at(-1),lastTime=last?.time??-Infinity,lastBeat=last?.beat??beat-1;
      secondsPerBeat=60/bpmRef.current;
      beat=lastBeat+1;
      nextTime=Number.isFinite(lastTime)?Math.max(lastTime+secondsPerBeat,now+.02):now+.06;
      schedule();
    };
    return()=>{
      window.clearTimeout(start);
      window.clearInterval(timer);
      retime.current=null;
      const now=audio.currentTime;
      booked.forEach((_,oscillator)=>{try{oscillator.stop(now)}catch{/* already ended */}});
      booked.clear();
    };
  // bpm is read through bpmRef: a tempo change re-times the running click (retime) instead of restarting it.
  },[metro,accent,beats,grid,subdivision,audioEpoch,toolMode]);
  /** The tools panel has its own bar scheduler. Edits cancel and rebuild pending sounds immediately. */
  useEffect(()=>{
    if(!metro||!toolMode||grid)return;
    const audio=getAudio();
    const scheduler=createToolMetronomeScheduler(audio,
      ()=>({setup:setupRef.current,beats:beatsRef.current,accent:accentRef.current,bpm:bpmRef.current}),
      (event,at,duration)=>event.kind==="tick"?bookTick(audio,at):bookClick(audio,at,event.kind==="accent",event.click+1,duration));
    toolBars.current=scheduler.bars;
    const start=window.setTimeout(()=>scheduler.start(),260);
    const timer=window.setInterval(scheduler.schedule,250);
    resetup.current=scheduler.reconfigure;toolRetime.current=scheduler.retime;
    return()=>{
      window.clearTimeout(start);window.clearInterval(timer);
      resetup.current=null;toolRetime.current=null;toolBars.current=[];scheduler.dispose();
    };
  // Refs let edits rebuild future sounds without restarting the effect.
  },[metro,toolMode,grid,audioEpoch]);
  useEffect(()=>{retime.current?.();toolRetime.current?.()},[bpm]);
  useEffect(()=>{resetup.current?.()},[setup,beats,accent]);
  useEffect(()=>{
    let previous=getToolSounds();
    return subscribeToolSounds(()=>{
      const next=getToolSounds(),changed=next.click!==previous.click||next.accent!==previous.accent||next.clickVolume!==previous.clickVolume||next.accentVolume!==previous.accentVolume;
      previous=next;if(!changed)return;
      resetup.current?.();retime.current?.();
      const audio=context.current;
      if(audio)void prepareClickSounds(audio).then(loaded=>{if(loaded&&context.current===audio){resetup.current?.();retime.current?.()}});
    });
  },[]);
  function toggleDrone(note:string,octave:number){
    const key=`${note}${octave}`,audio=getAudio(),existing=voices.current.get(key);
    if(existing){existing.gain.gain.setTargetAtTime(.0001,audio.currentTime,.025);stopVoice(existing,audio.currentTime+.12);voices.current.delete(key)}
    else{
      // The built flute-colour drone (sampledDrone.ts), dead steady. The first
      // press loads the samples; if they aren't in yet, start as soon as they are.
      const frequency=pitchFrequency(note,octave),samples=droneSamplesIfReady(audio);
      if(samples)voices.current.set(key,asVoice(droneVoice(audio,samples,frequency,audio.currentTime,.32)));
      else{
        const placeholder=audio.createGain(),dummy=audio.createBufferSource();voices.current.set(key,{oscillator:dummy,gain:placeholder});
        void loadDroneSamples(audio).then(map=>{if(voices.current.get(key)?.gain!==placeholder)return;voices.current.set(key,asVoice(droneVoice(audio,map,frequency,audio.currentTime,.32)))}).catch(()=>{
          if(voices.current.get(key)?.gain!==placeholder)return;
          const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.type="triangle";oscillator.frequency.value=frequency;gain.gain.setValueAtTime(.0001,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.1,audio.currentTime+.12);oscillator.connect(gain).connect(audio.destination);oscillator.start();voices.current.set(key,{oscillator,gain});
        });
      }
    }
    setDrones([...voices.current.keys()]);
  }
  function stopAllDrones(){const audio=context.current;voices.current.forEach(voice=>{if(audio){voice.gain.gain.setTargetAtTime(.0001,audio.currentTime,.025);stopVoice(voice,audio.currentTime+.12)}else stopVoice(voice)});voices.current.clear();setDrones([])}
  /**
   * Switching Safari tabs (or a call, or Siri) suspends the AudioContext, and iOS leaves it "interrupted" on return,
   * so the metronome went silent until reload. Resume on coming back, and on the next touch if Safari wants a gesture.
   */
  useEffect(()=>{
    const wake=()=>{const audio=context.current;if(!audio||document.hidden||audio.state==="running"||audio.state==="closed")return;preferPlayback();void audio.resume().catch(()=>{})};
    document.addEventListener("visibilitychange",wake);window.addEventListener("focus",wake);window.addEventListener("pageshow",wake);window.addEventListener("pointerdown",wake,true);
    // WebKit only lets audio resume from a gesture it counts as user activation: touchend and click do, pointerdown may not.
    window.addEventListener("touchend",wake,true);window.addEventListener("click",wake,true);
    return()=>{document.removeEventListener("visibilitychange",wake);window.removeEventListener("focus",wake);window.removeEventListener("pageshow",wake);window.removeEventListener("pointerdown",wake,true);window.removeEventListener("touchend",wake,true);window.removeEventListener("click",wake,true)};
  },[]);
  /**
   * After the microphone: a fresh audio context. While a mic is open iPad Safari routes the page's context at call
   * volume, and setting the session back to playback did not always restore it (the click stayed soft until Safari
   * was closed, which is what throws the old context away). So when the last mic closes, close the old context and
   * open a new one; a running metronome restarts on it (audioEpoch) and held drone notes are sounded again.
   * Touch devices only: desktop browsers never had the problem.
   */
  useEffect(()=>{
    const swap=()=>{
      const old=context.current;if(!old||!hasTouchScreen())return;
      const held=[...voices.current.keys()];
      voices.current.forEach(voice=>stopVoice(voice));voices.current.clear();
      context.current=null;void old.close().catch(()=>{});
      getAudio();
      for(const key of held){const match=key.match(/^(.+?)(-?\d+)$/);if(match)toggleDrone(match[1],Number(match[2]))}
      if(!held.length)setDrones([]);
      setAudioEpoch(epoch=>epoch+1);
    };
    window.addEventListener(MIC_CLOSED,swap);return()=>window.removeEventListener(MIC_CLOSED,swap);
  // getAudio and toggleDrone only read refs; the listener is set once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  /** A new drone voice, added fifth or octave, or A from the tools panel: held drone notes switch at once. */
  useEffect(()=>{
    let last=getToolSounds();
    return subscribeToolSounds(()=>{
      const next=getToolSounds(),changed=next.drone!==last.drone||next.droneAdd!==last.droneAdd||next.a4!==last.a4;
      last=next;if(!changed)return;
      for(const key of [...voices.current.keys()]){const match=key.match(/^(.+?)(-?\d+)$/);if(match){toggleDrone(match[1],Number(match[2]));toggleDrone(match[1],Number(match[2]))}}
    });
  // toggleDrone only reads refs; the listener is set once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  useEffect(()=>()=>{voices.current.forEach(voice=>stopVoice(voice));void context.current?.close();context.current=null;voices.current.clear()},[]);
  return {bpm,setBpm,setPlaybackBpm,metro,toggleMetro,stopMetro,accent,setAccent,beats,setBeats,drones,toggleDrone,stopAllDrones,initializeScore,getAudio,alignMetronome:setGrid,subdivision,setSubdivision,metroHeld:metro&&!!grid?.hold,setup,setSetup,toggleToolMetro,toolMode:metro&&toolMode&&!grid,toolBeat,toolPulse};
}
const Context=createContext<ReturnType<typeof useAudioEngine>|null>(null);
export function PracticeAudioProvider({children}:{children:ReactNode}){const value=useAudioEngine();return <Context.Provider value={value}>{children}</Context.Provider>}
export function usePracticeAudio(){const value=useContext(Context);if(!value)throw new Error("PracticeAudioProvider is required");return value}
export function openPracticeTool(tool:"metronome"|"tuner"|"drone"){window.dispatchEvent(new CustomEvent("cookie:open-practice-tools",{detail:{tool}}))}
