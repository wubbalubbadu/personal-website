"use client";

import {useEffect,useState} from "react";
import {musicLibrary} from "../../content/music-library";
import MusicRow from "./MusicRow";
import "./saved-music.css";

export default function SavedMusicHome(){const [saved,setSaved]=useState<string[]>([]);useEffect(()=>{const update=()=>{const value=localStorage.getItem("cookie:music-favorites");setSaved(value?JSON.parse(value):[])};update();window.addEventListener("cookie:favorites-updated",update);return()=>window.removeEventListener("cookie:favorites-updated",update)},[]);function toggle(id:string){const next=saved.includes(id)?saved.filter(value=>value!==id):[...saved,id];setSaved(next);localStorage.setItem("cookie:music-favorites",JSON.stringify(next));window.dispatchEvent(new Event("cookie:favorites-updated"))}const items=musicLibrary.filter(item=>saved.includes(item.id));return <section className="saved-home-section"><div className="section-title"><h2><a href="/flute-studio/music?favorites=1">Saved music <span aria-hidden="true">›</span></a></h2></div>{items.length?<div className="saved-home-grid">{items.slice(0,4).map(item=><MusicRow key={item.id} item={item} saved onToggleSave={()=>toggle(item.id)} detail={`${item.composer} · ${item.category}`}/>)}</div>:<div className="saved-empty"><span>♡</span><p>Nothing saved yet.</p></div>}</section>}
