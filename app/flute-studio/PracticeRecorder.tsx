"use client";
import {micBlockedText} from "./components/MicBlocked";
import {closeMic,openMic} from "./lib/audioSession";
import {useEffect,useRef,useState} from "react";
import {useLanguage} from "./i18n/LanguageContext";
import {PracticeIcon} from "./components/PracticeIcon";
import "./practice-recorder.css";
import {RecordingPlayback} from "./components/RecordingPlayback";
import {RecordingPanel} from "./components/RecordingPanel";
import {announcePractising} from "./lib/readerActivity";

/**
 * Record your practice, the way a phone does it: while recording there is
 * no panel, only the Record button itself (a pulsing red square and the
 * time). Stopping asks what to do with the take: listen back, save it to
 * the device, or delete it. Nothing is uploaded.
 */
export default function PracticeRecorder(){
  const {t,lang}=useLanguage(),zh=lang==="zh";
  const [recording,setRecording]=useState(false),[elapsed,setElapsed]=useState(0),[take,setTake]=useState<{url:string;type:string;duration:number}|null>(null),[error,setError]=useState(0);
  const recordButton=useRef<HTMLButtonElement>(null);
  const errorTimer=useRef(0),recorder=useRef<MediaRecorder|null>(null),chunks=useRef<Blob[]>([]),stream=useRef<MediaStream|null>(null),started=useRef(0);
  useEffect(()=>()=>closeMic(stream.current),[]);
  useEffect(()=>()=>{if(take)URL.revokeObjectURL(take.url)},[take]);
  useEffect(()=>{if(!recording)return;const id=setInterval(()=>setElapsed(Math.floor((Date.now()-started.current)/1000)),1000);return()=>clearInterval(id)},[recording]);
  async function start(){
    try{
      setTake(null);
      const media=await openMic();
      stream.current=media;chunks.current=[];
      const next=new MediaRecorder(media);
      next.ondataavailable=e=>{if(e.data.size)chunks.current.push(e.data)};
      next.onstop=()=>{
        const blob=new Blob(chunks.current,{type:next.mimeType});
        setTake({url:URL.createObjectURL(blob),type:next.mimeType,duration:(Date.now()-started.current)/1000});
        closeMic(media);
      };
      next.start();recorder.current=next;started.current=Date.now();setElapsed(0);setRecording(true);
      announcePractising();
    }catch{closeMic(stream.current);stream.current=null;setError(n=>n+1);window.clearTimeout(errorTimer.current);errorTimer.current=window.setTimeout(()=>setError(0),2500)}
  }
  function stop(){setElapsed(Math.floor((Date.now()-started.current)/1000));recorder.current?.stop();setRecording(false)}
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
    <button ref={recordButton} className={recording?"tool record-button active has-tip":"tool record-button has-tip"} aria-pressed={recording} data-tip={recording?t.recorder.stopRecording:t.recorder.recordYourPractice} aria-label={recording?t.recorder.stopRecordingAt(time):t.recorder.recordYourPractice} onClick={recording?stop:start}>
      {recording?<span className="record-stop" aria-hidden="true"/>:<PracticeIcon name="record"/>}<span className="record-button__label">{recording?time:t.recorder.record}</span>
    </button>
    {take&&<RecordingPanel anchor={recordButton} role="dialog" label={zh?"保留这段录音？":"Keep this recording?"}>
      <header><span>{zh?"保留这段录音？":"Keep this recording?"}</span><small>{time}</small></header>
      <RecordingPlayback key={take.url} src={take.url} duration={take.duration} zh={zh}/>
      <div className="recorder-actions">
        <button type="button" className="recorder-delete" onClick={()=>setTake(null)}>{zh?"删除":"Delete"}</button>
        <button type="button" className="recorder-save" onClick={save}>{zh?"存到设备":"Save to device"}</button>
      </div>
      <small className="recorder-note">{zh?"录音不会上传。":"Recordings are never uploaded."}</small>
    </RecordingPanel>}
    {/* Mic refused: the reader's notice pill over the music (.drone-hint, fades in 2.5s), not a panel. Keyed so a second try replays it. */}
    {error>0&&!take&&<div key={error} className="drone-hint" role="status">{micBlockedText(zh)}</div>}
  </div>;
}
