"use client";
import {useEffect,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {usePathname} from "next/navigation";
import {useLanguage} from "./i18n/LanguageContext";
import "./practice-recorder.css";

export default function PracticeRecorder(){
  const pathname=usePathname();
  const {t}=useLanguage();
  const [mount,setMount]=useState<Element|null>(null),[recording,setRecording]=useState(false),[elapsed,setElapsed]=useState(0),[levels,setLevels]=useState<number[]>(Array(18).fill(5)),[audioUrl,setAudioUrl]=useState<string|null>(null),[error,setError]=useState("");
  const recorder=useRef<MediaRecorder|null>(null),chunks=useRef<Blob[]>([]),stream=useRef<MediaStream|null>(null),frame=useRef<number|null>(null),started=useRef(0);
  useEffect(()=>{const scoreRoute=(location.pathname.includes("/music/")&&!location.pathname.endsWith("/music"))||location.pathname.includes("/exercises/scales");setMount(scoreRoute?document.querySelector(".topbar>div:last-child"):null);return()=>{stream.current?.getTracks().forEach(t=>t.stop());if(frame.current)cancelAnimationFrame(frame.current);if(audioUrl)URL.revokeObjectURL(audioUrl)}},[pathname]);
  useEffect(()=>{if(!recording)return;const id=setInterval(()=>setElapsed(Math.floor((Date.now()-started.current)/1000)),1000);return()=>clearInterval(id)},[recording]);
  if(!mount)return null;
  async function start(){try{setError("");const media=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});stream.current=media;const context=new AudioContext(),source=context.createMediaStreamSource(media),analyser=context.createAnalyser(),data=new Uint8Array(64);analyser.fftSize=128;source.connect(analyser);const loop=()=>{analyser.getByteFrequencyData(data);const average=data.reduce((a,b)=>a+b,0)/data.length;setLevels(old=>[...old.slice(1),Math.max(4,Math.min(30,average/4))]);frame.current=requestAnimationFrame(loop)};loop();chunks.current=[];const next=new MediaRecorder(media);next.ondataavailable=e=>{if(e.data.size)chunks.current.push(e.data)};next.onstop=()=>{const blob=new Blob(chunks.current,{type:next.mimeType});if(audioUrl)URL.revokeObjectURL(audioUrl);setAudioUrl(URL.createObjectURL(blob));media.getTracks().forEach(t=>t.stop());context.close();if(frame.current)cancelAnimationFrame(frame.current)};next.start();recorder.current=next;started.current=Date.now();setElapsed(0);setRecording(true)}catch{setError(t.recorder.micRequired)}}
  function stop(){recorder.current?.stop();setRecording(false)}
  const time=`${Math.floor(elapsed/60)}:${String(elapsed%60).padStart(2,"0")}`;
  return createPortal(<div className="score-recorder"><button className={recording?"record-button active has-tip":"record-button has-tip"} data-tip={recording?t.recorder.stopRecording:t.recorder.recordYourPractice} aria-label={recording?t.recorder.stopRecordingAt(time):t.recorder.recordYourPractice} onClick={recording?stop:start}><i/>{recording&&<span>{time}</span>}</button>{(recording||audioUrl||error)&&<div className="recorder-pop"><header><span>{recording?t.recorder.recording:t.recorder.latestRecording}</span><button onClick={()=>{setAudioUrl(null);setError("")}}>×</button></header><div className="input-level">{levels.map((height,i)=><i key={i} style={{height:`${height}px`}}/>)}</div>{recording?<p>{t.recorder.listening(time)}</p>:audioUrl?<><audio controls src={audioUrl}/><small>{t.recorder.notUploaded}</small></>:<p className="record-error">{error}</p>}</div>}</div>,mount)
}
