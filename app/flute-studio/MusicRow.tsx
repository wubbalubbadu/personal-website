"use client";

import type {MusicItem} from "../../content/music-library";
import {SaveButton} from "./components/SaveButton";
import {StudioItemIcon,iconKindFor} from "./components/StudioItemIcon";
import {useLanguage} from "./i18n/LanguageContext";
import "./music-row.css";

export default function MusicRow({item,saved,onToggleSave,detail}:{item:MusicItem;saved:boolean;onToggleSave:()=>void;detail?:string}){
  const {t}=useLanguage();
  const content=<><StudioItemIcon kind={iconKindFor(item)} className="music-row__icon"/><span className="music-row__copy"><strong>{item.title}</strong><small>{detail??`${item.composer} · ${item.difficulty.replace("-"," ")} · ${item.key}`}</small></span></>;
  return <article className="music-row">
    {item.viewerPath?<a className="music-row__main" href={item.viewerPath}>{content}</a>:<div className="music-row__main music-row__main--disabled">{content}</div>}
    <SaveButton saved={saved} onToggle={onToggleSave} label={saved?t.musicRow.remove(item.title):t.musicRow.save(item.title)}/>
  </article>
}
