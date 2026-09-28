"use client";
import {useEffect,useRef,useState} from "react";
import {useLanguage} from "./i18n/LanguageContext";
import {PracticeIcon} from "./components/PracticeIcon";
import "./practice-recorder.css";

/**
 * Record your practice, the way a phone does it: while recording there is
 * no panel, only the Record button itself (a pulsing red square and the
 * time). Stopping asks what to do with the take: listen back, save it to
 * the device, or delete it. Nothing is uploaded.
 */
export default function PracticeRecorder(){
  const {t,lang}=useLanguage(),zh=lang==="zh";
  const [recording,setRecording]=useState(false),[elapsed,setElapsed]=useState(0),[take,setTake]=useState<{url:string;type:string}|null>(null),[error,setError]=useState("");
  const recorder=useRef<MediaRecorder|null>(null),chunks=useRef<Blob[]>([]),stream=useRef<MediaStream|null>(null),started=useRef(0);
  useEffect(()=>()=>{stream.current?.getTracks().forEach(track=>track.stop())},[]);
  useEffect(()=>()=>{if(take)URL.revokeObjectURL(take.url)},[take]);
  useEffect(()=>{if(!recording)return;const id=setInterval(()=>setElapsed(Math.floor((Date.now()-started.current)/1000)),1000);return()=>clearInterval(id)},[recording]);
  async function start(){
    try{
      setError("");setTake(null);
      const media=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
      stream.current=media;chunks.current=[];
      const next=new MediaRecorder(media);
      next.ondataavailable=e=>{if(e.data.size)chunks.current.push(e.data)};
      next.onstop=()=>{
        const blob=new Blob(chunks.current,{type:next.mimeType});
        setTake({url:URL.createObjectURL(blob),type:next.mimeType});
        media.getTracks().forEach(track=>track.stop());
      };
      next.start();recorder.current=next;started.current=Date.now();setElapsed(0);setRecording(true);
    }catch{setError(t.recorder.micRequired)}
  }
  function stop(){recorder.current?.stop();setRecording(false)}
  /** Saves the take as an audio file, named by the date and time it ended. */
  function save(){
    if(!take)return;
    const now=new Date(),pad=(n:number)=>String(n).padStart(2,"0");
    const ext=take.type.includes("mp4")?"m4a":take.type.includes("ogg")?"ogg":"webm";
    const link=document.createElement("a");
    link.href=take.url;link.download=`practice-${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.${ext}`;
    link.click();
    setTake(null);
  }
  const time=`${Math.floor(elapsed/60)}:${String(elapsed%60).padStart(2,"0")}`;
  return <div className="score-recorder">
    <button className={recording?"tool on record-button active has-tip":"tool record-button has-tip"} data-tip={recording?t.recorder.stopRecording:t.recorder.recordYourPractice} aria-label={recording?t.recorder.stopRecordingAt(time):t.recorder.recordYourPractice} onClick={recording?stop:start}>
      {recording?<span className="record-stop" aria-hidden="true"/>:<PracticeIcon name="record"/>}{recording?time:t.recorder.record}
    </button>
    {take&&<div className="recorder-pop" role="dialog" aria-label={zh?"保留这段录音？":"Keep this recording?"}>
      <header><span>{zh?"保留这段录音？":"Keep this recording?"}</span><small>{time}</small></header>
      {/* Your own flute take, just recorded: there is no speech to caption. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio controls src={take.url}/>
      <div className="recorder-actions">
        <button type="button" className="recorder-delete" onClick={()=>setTake(null)}>{zh?"删除":"Delete"}</button>
        <button type="button" className="recorder-save" onClick={save}>{zh?"存到设备":"Save to device"}</button>
      </div>
      <small className="recorder-note">{zh?"录音不会上传。":"Recordings are never uploaded."}</small>
    </div>}
    {error&&!take&&<div className="recorder-pop" role="alert">
      <header><span className="record-error">{error}</span><button type="button" aria-label={zh?"关闭":"Close"} onClick={()=>setError("")}>×</button></header>
    </div>}
  </div>;
}
