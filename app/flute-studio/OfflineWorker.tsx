"use client";

import {useEffect} from "react";
import {refreshOfflineIfStale,registerOfflineWorker} from "./lib/offlineMusic";
import {usePrivateMusic} from "./lib/privateMusic";

/** Starts the offline worker (public/flute-studio-sw.js) and, after a new release, brings kept music up to date. */
export default function OfflineWorker(){
  const privateMusic=usePrivateMusic();
  useEffect(()=>{registerOfflineWorker()},[]);
  useEffect(()=>{if(!privateMusic.loading){const timer=window.setTimeout(()=>void refreshOfflineIfStale(privateMusic.items),4000);return ()=>window.clearTimeout(timer)}},[privateMusic.loading,privateMusic.items]);
  return null;
}
