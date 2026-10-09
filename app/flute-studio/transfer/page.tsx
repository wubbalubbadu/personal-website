"use client";

import {useRef,useState,useSyncExternalStore} from "react";
import {useLanguage} from "../i18n/LanguageContext";
import {apply,collect,decode,describe,drawingSize,encode,markBackedUp,type DecodeError,type Snapshot} from "../lib/transfer";
import "../practice/practice-page.css";
import "./transfer.css";

const noSubscribe=()=>()=>{};
const kb=(chars:number)=>`${Math.max(1,Math.round(chars/1024))} KB`;

/**
 * Sync devices: the whole studio as a code you copy, or a file you
 * send, and paste or open on the other device. No account and no server; see
 * lib/transfer.ts for the format.
 */
export default function TransferPage(){
  const {lang}=useLanguage(),zh=lang==="zh";
  const drawings=useSyncExternalStore(noSubscribe,drawingSize,()=>0);
  const [withDrawings,setWithDrawings]=useState(true);
  const [sent,setSent]=useState<"copied"|"shared"|"saved"|"failed"|null>(null);
  const [text,setText]=useState("");
  const [incoming,setIncoming]=useState<Snapshot|DecodeError|null>(null);
  const [confirming,setConfirming]=useState(false);
  const fileInput=useRef<HTMLInputElement>(null);

  const makeCode=()=>encode(collect(withDrawings));
  async function copyCode(){
    // Safari only lets a tap write to the clipboard synchronously; waiting
    // for the code to compress first made it refuse ("some error" on iPhone).
    // A ClipboardItem that takes the pending code keeps the write inside the tap.
    try{
      if(typeof ClipboardItem!=="undefined"&&navigator.clipboard?.write){
        await navigator.clipboard.write([new ClipboardItem({"text/plain":makeCode().then(code=>new Blob([code],{type:"text/plain"}))})]);
      }else await navigator.clipboard.writeText(await makeCode());
      setSent("copied");markBackedUp();
    }catch{
      try{await navigator.clipboard.writeText(await makeCode());setSent("copied");markBackedUp()}catch{setSent("failed")}
    }
  }
  async function sendFile(){
    try{
      const file=new File([await makeCode()],`cookie-flute-studio-${new Date().toISOString().slice(0,10)}.txt`,{type:"text/plain"});
      // Phones get the share sheet (AirDrop, Quick Share, Messages, Drive...);
      // anything without one downloads the file.
      if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file]});setSent("shared");markBackedUp();return}
      const url=URL.createObjectURL(file),link=document.createElement("a");
      link.href=url;link.download=file.name;link.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
      setSent("saved");markBackedUp();
    }catch(error){
      // Closing the share sheet is not a failure.
      if((error as Error)?.name!=="AbortError")setSent("failed");
    }
  }

  async function read(value:string){
    setText(value);setConfirming(false);
    setIncoming(value.trim()?await decode(value):null);
  }
  async function openFile(file:File|undefined){if(file)await read(await file.text())}
  function replace(){
    if(typeof incoming!=="object"||!incoming)return;
    apply(incoming);
    // Every page reads storage when it loads, so a reload is the simplest way
    // for all of them to pick up what just arrived.
    location.reload();
  }

  const snapshot=typeof incoming==="object"?incoming:null;
  const when=snapshot?new Date(snapshot.at).toLocaleString(zh?"zh-CN":undefined,{month:"long",day:"numeric",hour:"numeric",minute:"2-digit"}):"";
  const sentNote={
    copied:zh?"已复制。在另一台设备上打开这个页面，粘贴到右边。":"Copied. Open this page on your other device and paste it under Receive.",
    shared:zh?"已发送。在另一台设备上打开这个页面，选择这个文件。":"Sent. Open this page on your other device and open the file there.",
    saved:zh?"已保存文件。把它发到另一台设备，在这个页面打开。":"File saved. Send it to your other device and open it on this page.",
    failed:zh?"没有成功，再试一次。":"That didn't work. Try again.",
  };

  return <main className="practice-page transfer-page">
    <div className="practice-page__content">
      <header className="practice-page__header">
        <h1>{zh?"设备同步":"Sync devices"}</h1>
        <p className="transfer-page__intro">{zh
          ?"你的收藏、练习记录、音准测试和设置都保存在这台设备的浏览器里。在这里生成一段代码，粘贴到手机、iPad 或电脑上，就能带过去。"
          :"Your saved music, practice history, pitch tests and settings are kept in this browser. Make a code here and paste it on your phone, iPad or computer to bring them along."}</p>
      </header>

      <div className="transfer-page__grid">
        <section className="practice-card transfer-card" aria-labelledby="send-title">
          <h2 id="send-title">{zh?"从这台设备发送":"Send from this device"}</h2>
          <p className="transfer-card__hint">{zh?"用任何两台设备都有的方式发送：信息、邮件、备忘录、微信都可以。":"Send it any way both devices have: messages, email, notes, WeChat."}</p>
          {drawings>0&&<label className="transfer-card__option">
            <input type="checkbox" checked={withDrawings} onChange={event=>{setWithDrawings(event.target.checked);setSent(null)}}/>
            <span>{zh?"包括铅笔标注":"Include pencil drawings"}<small>{kb(drawings)}{zh?"，代码会更长":", makes the code longer"}</small></span>
          </label>}
          <div className="transfer-card__actions">
            <button type="button" className="transfer-card__primary" onClick={copyCode}>{zh?"复制代码":"Copy code"}</button>
            <button type="button" className="transfer-card__secondary" onClick={sendFile}>{zh?"发送文件":"Send as file"}</button>
          </div>
          {sent&&<p className={`transfer-card__note${sent==="failed"?" is-error":""}`} role="status">{sentNote[sent]}</p>}
        </section>

        <section className="practice-card transfer-card" aria-labelledby="receive-title">
          <h2 id="receive-title">{zh?"在这台设备接收":"Receive on this device"}</h2>
          <textarea
            className="transfer-card__code"
            value={text}
            onChange={event=>read(event.target.value)}
            placeholder={zh?"把代码粘贴到这里":"Paste the code here"}
            spellCheck={false} autoCapitalize="off" autoCorrect="off"
            aria-label={zh?"转移代码":"Transfer code"}
          />
          <button type="button" className="transfer-card__file" onClick={()=>fileInput.current?.click()}>{zh?"或者打开文件":"or open a file"}</button>
          <input ref={fileInput} type="file" accept=".txt,text/plain" hidden onChange={event=>{openFile(event.target.files?.[0]);event.target.value=""}}/>

          {incoming==="not-a-code"&&<p className="transfer-card__note is-error" role="status">{zh?"这不是 Cookie 长笛工作室的代码。":"This isn't a Cookie Flute Studio code."}</p>}
          {incoming==="damaged"&&<p className="transfer-card__note is-error" role="status">{zh?"代码不完整。重新复制整段再试。":"Part of the code is missing. Copy all of it again and paste."}</p>}
          {snapshot&&<div className="transfer-card__found">
            <p><b>{zh?`${when} 生成的代码`:`Code made ${when}`}</b></p>
            <ul>{describe(snapshot,zh).map(line=><li key={line}>{line}</li>)}</ul>
            {!confirming
              ?<button type="button" className="transfer-card__primary" onClick={()=>setConfirming(true)}>{zh?"用到这台设备":"Use on this device"}</button>
              :<div className="transfer-card__confirm">
                <p>{zh?"会和这台设备上的内容合并：两边的练习记录、音准记录和收藏都会保留。精练小节的速度记录会合并，重复次数保留较高值；目标、步长和设置以代码为准。":"This combines with what's on this device. Practice history, pitch records and saved music from both are kept. Tricky-bit tempos combine; repetition counts keep the higher count. Goals, steps and settings take the code’s values."}</p>
                <div className="transfer-card__actions">
                  <button type="button" className="transfer-card__primary" onClick={replace}>{zh?"合并":"Combine"}</button>
                  <button type="button" className="transfer-card__secondary" onClick={()=>setConfirming(false)}>{zh?"取消":"Cancel"}</button>
                </div>
              </div>}
          </div>}
        </section>
      </div>
    </div>
  </main>;
}
