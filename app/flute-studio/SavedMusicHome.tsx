"use client";

import {useEffect,useState} from "react";
import {musicLibrary} from "../../content/music-library";
import "./saved-music.css";

export default function SavedMusicHome(){const [saved,setSaved]=useState<string[]>([]);useEffect(()=>{const update=()=>{const value=localStorage.getItem("cookie:music-favorites");setSaved(value?JSON.parse(value):[])};update();window.addEventListener("cookie:favorites-updated",update);return()=>window.removeEventListener("cookie:favorites-updated",update)},[]);const items=musicLibrary.filter(item=>saved.includes(item.id));return <section className="saved-home-section"><div className="section-title"><h2><a href="/flute-studio/music?favorites=1">Saved music <span aria-hidden="true">›</span></a></h2></div>{items.length?<div className="saved-home-grid">{items.slice(0,4).map(item=><a className="saved-home-card" key={item.id} href={item.viewerPath??"/flute-studio/music"}><span>{item.category==="repertoire"?"♫":"◎"}</span><div><b>{item.title}</b><em>{item.composer} · {item.category}</em></div><i>›</i></a>)}</div>:<div className="saved-empty"><span>♡</span><p>Nothing saved yet.</p></div>}</section>}
