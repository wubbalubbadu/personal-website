"use client";

import {useEffect,useState} from "react";
import {keepOffline,keptEntry,offlineSupport,offlineTarget,removeOffline,useOfflineMusic} from "../lib/offlineMusic";
import {usePrivateMusic} from "../lib/privateMusic";
import {OfflineIcon,OfflineKeptIcon} from "./HeaderIcons";
import "./offline.css";

/** Online, as the browser reports it; true on the server and the first render. */
export function useOnline(){
  const [online,setOnline]=useState(true);
  useEffect(()=>{
    const sync=()=>setOnline(navigator.onLine);
    sync();
    window.addEventListener("online",sync);window.addEventListener("offline",sync);
    return ()=>{window.removeEventListener("online",sync);window.removeEventListener("offline",sync)};
  },[]);
  return online;
}
/** offlineSupport() after hydration (the server can't know). */
export function useOfflineSupport(){
  const [support,setSupport]=useState<ReturnType<typeof offlineSupport>>("unsupported");
  // Browser capability is unavailable during server rendering.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>setSupport(offlineSupport()),[]);
  return support;
}

/**
 * Keep a piece (or a whole book) on this device so it opens without Wi-Fi.
 *
 * `icon`: the reader's header button, after the list button (an arrow into a circle; a tick once kept, in the
 * studio's purple "on" tint). `label`: the same as a word button, on a book's page.
 * Tapping a kept piece takes the copy off this device again, but only while online, so it can't be lost where it
 * couldn't be fetched back. A numbered piece inside a kept book shows as kept and is managed with the book.
 */
export function OfflineButton({id,zh,variant="icon"}:{id:string;zh:boolean;variant?:"icon"|"label"}){
  const {entries,busy,failed}=useOfflineMusic();
  const privateMusic=usePrivateMusic();
  const support=useOfflineSupport(),online=useOnline();
  const kept=keptEntry(entries,id),saving=busy.includes(id),didFail=failed.includes(id);
  if(!offlineTarget(id,privateMusic.items)||support==="unsupported")return null;

  const viaBook=kept&&kept.id!==id;
  const tip=support==="dev"?(zh?"离线保存只在正式网站上可用":"Offline copies work on the published site")
    :saving?(zh?"正在保存到这台设备":"Saving to this device")
    :viaBook?(zh?"已随整本书离线保存":"Kept offline with its book")
    :kept?(online?(zh?"已离线保存。点按从这台设备移除":"Kept offline. Tap to remove from this device"):(zh?"已离线保存":"Kept offline"))
    :didFail?(zh?"没有保存成功。联网后再试一次":"Couldn't save. Try again when you're online")
    :online?(zh?"离线保存：没有网络也能打开":"Keep offline: opens without Wi-Fi"):(zh?"联网后才能离线保存":"Connect to keep this offline");
  const disabled=support!=="yes"||saving||!!viaBook||(!online&&!kept)||(!!kept&&!online);
  const toggle=()=>{if(kept)void removeOffline([id]);else void keepOffline(id,privateMusic.items)};
  const icon=kept?<OfflineKeptIcon/>:<OfflineIcon/>;

  if(variant==="label")return <button type="button" className="offline-label" aria-pressed={!!kept} aria-busy={saving||undefined} disabled={disabled} title={tip} onClick={toggle}>
    {icon}<span>{saving?(zh?"正在保存":"Saving"):kept?(zh?"已离线保存":"Kept offline"):(zh?"离线保存":"Keep offline")}</span>
  </button>;
  return <button type="button" className="icon-btn has-tip offline-button" aria-pressed={!!kept} aria-busy={saving||undefined} disabled={disabled} data-tip={tip} aria-label={tip} onClick={toggle}>{icon}</button>;
}

/** A Library row's quiet "opens offline" mark, after the title. */
export function OfflineBadge({id,zh}:{id:string;zh:boolean}){
  const {entries}=useOfflineMusic();
  if(!keptEntry(entries,id))return null;
  const label=zh?"已离线保存":"Kept offline";
  return <span className="offline-badge" title={label}><OfflineKeptIcon/><span className="sr-only">{label}</span></span>;
}
