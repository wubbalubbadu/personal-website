"use client";

import {useEffect,useState} from "react";
import {musicLibrary} from "../../content/music-library";
import "./saved-music.css";

export default function SavedMusicHome(){const [saved,setSaved]=useState<string[]>([]);useEffect(()=>{const update=()=>{const value=localStorage.getItem("cookie:music-favorites");setSaved(value?JSON.parse(value):[])};update();window.addEventListener("cookie:favorites-updated",update);return()=>window.removeEventListener("cookie:favorites-updated",update)},[]);const items=musicLibrary.filter(item=>saved.includes(item.id));return <section className="saved-home-section"><div className="section-title"><div><h2>Saved music</h2><p>Your personal collection</p></div><a href="/flute-studio/music">Browse library</a></div>{items.length?<div className="saved-home-grid">{items.slice(0,4).map(item=><a className="saved-home-card" key={item.id} href={item.viewerPath??"/flute-studio/music"}><span>{item.category==="repertoire"?"♫":"◎"}</span><div><b>{item.title}</b><em>{item.composer} · {item.category}</em></div><i>›</i></a>)}</div>:<div className="saved-empty"><span>♡</span><p>Music you save in the library will appear here.</p><a href="/flute-studio/music">Find music</a></div>}</section>}
