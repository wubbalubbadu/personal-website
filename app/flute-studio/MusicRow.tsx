"use client";

import Link from "next/link";
import type {MusicItem} from "../../content/music-library";
import {SaveButton} from "./components/SaveButton";
import {StudioItemIcon,iconKindFor} from "./components/StudioItemIcon";
import {artForId} from "./components/StudioRowArt";
import {useLanguage} from "./i18n/LanguageContext";
import "./music-row.css";

export default function MusicRow({item,saved,onToggleSave,detail}:{item:MusicItem;saved:boolean;onToggleSave:()=>void;detail?:string}){
  const {t}=useLanguage();
  // The Library's list is built from the same exercise catalog the hub
  // uses, so a tool that draws its own mark there draws it here too.
  const art=artForId(item.id);
  const content=<>{art?<span className="studio-art-tile">{art}</span>:<StudioItemIcon kind={iconKindFor(item)} className="music-row__icon"/>}<span className="music-row__copy"><strong>{item.title}</strong><small>{detail??item.composer}</small></span></>;
  return <article className="music-row">
    {item.viewerPath?<Link className="music-row__main" href={item.viewerPath}>{content}</Link>:<div className="music-row__main music-row__main--disabled">{content}</div>}
    <SaveButton saved={saved} onToggle={onToggleSave} label={saved?t.musicRow.remove(item.title):t.musicRow.save(item.title)}/>
  </article>
}
