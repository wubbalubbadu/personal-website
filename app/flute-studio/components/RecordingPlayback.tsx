"use client";
import {useEffect,useRef,useState} from "react";
import {PracticeIcon} from "./PracticeIcon";

function clock(seconds:number){
  const whole=Math.max(0,Math.floor(seconds));
  return `${Math.floor(whole/60)}:${String(whole%60).padStart(2,"0")}`;
}

/** App-owned controls for a local take, including blobs without duration metadata. */
export function RecordingPlayback({src,duration,zh}:{src:string;duration:number;zh:boolean}){
  const audio=useRef<HTMLAudioElement>(null);
  const [playing,setPlaying]=useState(false),[position,setPosition]=useState(0);
  const [length,setLength]=useState(duration),[ready,setReady]=useState(false),[failed,setFailed]=useState(false);
  useEffect(()=>{
    const player=audio.current;
    return()=>{player?.pause()};
  },[]);
  function readDuration(){
    const value=audio.current?.duration;
    if(value&&Number.isFinite(value))setLength(value);
  }
  async function toggle(){
    const player=audio.current;
    if(!player)return;
    setFailed(false);
    if(!player.paused){player.pause();return}
    try{
      if(player.ended)player.currentTime=0;
      await player.play();
    }catch{setFailed(true)}
  }
  return <div className="recording-playback">
    {/* A flute recording has no speech to caption. Native controls stay hidden. */}
    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
    <audio ref={audio} src={src} preload="metadata" hidden
      onLoadedMetadata={()=>{readDuration();setReady(true)}} onDurationChange={readDuration}
      onTimeUpdate={event=>setPosition(event.currentTarget.currentTime)}
      onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)}
      onEnded={()=>setPlaying(false)} onError={()=>{setPlaying(false);setFailed(true)}}/>
    <button type="button" className="recording-playback__toggle" onClick={toggle}
      aria-label={playing?(zh?"暂停录音":"Pause recording"):(zh?"播放录音":"Play recording")}>
      <PracticeIcon name={playing?"pause":"play"}/>
    </button>
    <div className="recording-playback__timeline">
      <input type="range" min={0} max={length||1} step={0.01} value={Math.min(position,length)}
        disabled={!ready||length<=0} aria-label={zh?"录音进度":"Recording position"}
        aria-valuetext={`${clock(position)} / ${clock(length)}`}
        onChange={event=>{
          const player=audio.current;if(!player)return;
          const value=Number(event.target.value);
          try{player.currentTime=value;setPosition(value)}catch{setFailed(true)}
        }}/>
      <div className="recording-playback__time" aria-hidden="true"><span>{clock(position)}</span><span>{clock(length)}</span></div>
    </div>
    {failed&&<p className="recording-playback__error" role="status">{zh?"无法播放。请重试，或存到设备后收听。":"Couldn’t play. Try again, or save to your device to listen."}</p>}
  </div>;
}
