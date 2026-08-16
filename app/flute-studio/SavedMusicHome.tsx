"use client";

import {useEffect,useState} from "react";
import {createPortal} from "react-dom";
import {musicLibrary} from "../../content/music-library";
import "./saved-music.css";

export default function SavedMusicHome(){const [mount,setMount]=useState<Element|null>(null),[saved,setSaved]=useState<string[]>([]);useEffect(()=>{if(location.pathname!=="/flute-studio")return;setMount(document.querySelector(".studio-left"));const value=localStorage.getItem("cookie:music-favorites");if(value)setSaved(JSON.parse(value))},[]);if(!mount)return null;const items=musicLibrary.filter(item=>saved.includes(item.id));return createPortal(<section className="saved-home-section"><div className="section-title"><div><small>YOUR COLLECTION</small><h2>Saved music</h2></div><a href="/flute-studio/music">Browse library</a></div>{items.length?<div className="saved-home-grid">{items.slice(0,4).map(item=><a className="saved-home-card" key={item.id} href={item.viewerPath??"/flute-studio/music"}><span>{item.category==="repertoire"?"♫":"◎"}</span><div><small>{item.category}</small><b>{item.title}</b><em>{item.composer}</em></div><i>→</i></a>)}</div>:<div className="saved-empty"><span>♡</span><p>Music you save in the library will appear here.</p><a href="/flute-studio/music">Find music</a></div>}</section>,mount)}
