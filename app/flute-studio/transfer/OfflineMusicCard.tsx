"use client";

import {useEffect,useState} from "react";
import {PracticeIcon} from "../components/PracticeIcon";
import {useOnline,useOfflineSupport} from "../components/OfflineButton";
import {keepOffline,keptEntry,offlineTarget,removeOffline,shellBytes,useOfflineMusic} from "../lib/offlineMusic";
import {usePrivateMusic} from "../lib/privateMusic";
import {useStatusEntries} from "../lib/musicStatus";
import "../components/offline.css";

const size=(bytes:number)=>bytes>=1024*1024?`${(bytes/1024/1024).toFixed(1)} MB`:`${Math.max(1,Math.round(bytes/1024))} KB`;

/**
 * Offline music on Sync devices: every piece and book kept on this device with its size, a trash button each
 * (COMPONENTS.md Trash, "Tap again to delete"), the app's shared files, and one tap to keep everything on
 * Working on. Kept copies are files in this browser, not part of a transfer code, so each device keeps its own.
 */
export default function OfflineMusicCard({zh}:{zh:boolean}){
  const {entries,busy}=useOfflineMusic();
  const privateMusic=usePrivateMusic();
  const statuses=useStatusEntries();
  const support=useOfflineSupport(),online=useOnline();
  const [armed,setArmed]=useState<string|null>(null),[shell,setShell]=useState(0);
  const ids=Object.keys(entries).sort((a,b)=>entries[b].at-entries[a].at);
  useEffect(()=>{let live=true;void shellBytes().then(bytes=>{if(live)setShell(bytes)});return ()=>{live=false}},[ids.length,busy.length]);
  useEffect(()=>{if(!armed)return;const timer=window.setTimeout(()=>setArmed(null),3000);return ()=>window.clearTimeout(timer)},[armed]);
  if(support==="unsupported")return null;

  // Working on pieces and books that could be kept and aren't yet.
  const working=statuses.filter(entry=>entry.status==="working"&&offlineTarget(entry.id,privateMusic.items)&&!keptEntry(entries,entry.id)).map(entry=>entry.id);
  const keepWorking=async()=>{for(const id of working)await keepOffline(id,privateMusic.items)};
  const saving=busy.length>0;

  return <section className="practice-card transfer-card storage-card offline-card" aria-labelledby="offline-title">
    <h2 id="offline-title">{zh?"离线乐谱":"Offline music"}</h2>
    <p className="transfer-card__hint">{zh
      ?"保存在这台设备上的乐谱没有网络也能打开。你的标注、列表和练习记录本来就在这台设备上，会一起可用。"
      :"Music kept on this device opens without Wi-Fi. Your marks, lists and practice history are already on this device, so they come along."}</p>
    {support==="dev"&&<p className="transfer-card__hint">{zh?"离线保存只在正式网站上可用。":"Offline copies work on the published site."}</p>}
    {support==="yes"&&!online&&<p className="transfer-card__hint">{zh?"现在没有联网：可以移除，保存新的乐谱要等联网。":"You're offline. You can remove music now; keeping more waits for Wi-Fi."}</p>}
    {support==="yes"&&online&&working.length>0&&<div className="transfer-card__actions">
      <button type="button" className="offline-label" disabled={saving} aria-busy={saving||undefined} onClick={keepWorking}>
        {zh?`离线保存“正在练”（${working.length} 首）`:`Keep Working on offline (${working.length} ${working.length===1?"piece":"pieces"})`}
      </button>
    </div>}
    {ids.length?<ul className="storage-list">
      {ids.map(id=>{
        const entry=entries[id],title=zh&&entry.zhTitle?`${entry.title} (${entry.zhTitle})`:entry.title;
        const what=[size(entry.bytes),entry.pieces?(zh?`${entry.pieces.length} 首`:`${entry.pieces.length} pieces`):"",entry.private?(zh?"私人乐谱":"Private"):""].filter(Boolean).join(" · ");
        return <li key={id}><div className="storage-row"><span><b>{title}</b><small>{what}</small></span>
          <button type="button" className={armed===id?"storage-row__delete is-armed":"storage-row__delete"} aria-label={armed===id?(zh?`再点一次从这台设备移除 ${title}`:`Tap again to remove ${title} from this device`):(zh?`移除 ${title}`:`Remove ${title}`)}
            onClick={()=>{if(armed!==id){setArmed(id);return}setArmed(null);void removeOffline([id])}}>{armed===id&&<span>{zh?"再点一次删除":"Tap again to delete"}</span>}<PracticeIcon name="delete"/></button>
        </div></li>;
      })}
      <li><div className="storage-row"><span><b>{zh?"应用文件":"App files"}</b><small>{size(shell)}{zh?"，所有离线乐谱共用；移除最后一首时一起删除":", shared by all of the above; removed with the last piece"}</small></span></div></li>
    </ul>:<p className="transfer-card__hint">{zh?"还没有离线保存的乐谱。在乐谱页面上方点圆圈里的向下箭头即可保存。":"Nothing kept offline yet. In a score, tap the arrow in a circle at the top to keep it."}</p>}
  </section>;
}
