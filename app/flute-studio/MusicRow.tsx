"use client";

import type {MusicItem} from "../../content/music-library";
import {useLanguage} from "./i18n/LanguageContext";
import "./music-row.css";

const symbols:Record<MusicItem["category"],string>={exercise:"♩",repertoire:"♫",etude:"𝄞",method:"≋","warm-up":"◌"};

export default function MusicRow({item,saved,onToggleSave,detail}:{item:MusicItem;saved:boolean;onToggleSave:()=>void;detail?:string}){
  const {t}=useLanguage();
  const content=<><span className={`music-row__icon music-row__icon--${item.category}`} aria-hidden="true">{symbols[item.category]}</span><span className="music-row__copy"><strong>{item.title}</strong><small>{detail??`${item.composer} · ${item.difficulty.replace("-"," ")} · ${item.key}`}</small></span></>;
  return <article className="music-row">
    {item.viewerPath?<a className="music-row__main" href={item.viewerPath}>{content}</a>:<div className="music-row__main music-row__main--disabled">{content}</div>}
    <button className={saved?"music-row__save is-saved":"music-row__save"} onClick={onToggleSave} aria-label={saved?t.musicRow.remove(item.title):t.musicRow.save(item.title)} title={saved?t.musicRow.removeTitle:t.musicRow.saveTitle}>
      <svg viewBox="0 0 20 20" width="19" height="19" fill={saved?"currentColor":"none"} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M10 2.8l2.2 4.55 5 .73-3.6 3.53.85 4.99L10 14.2l-4.45 2.4.85-4.99L2.8 8.08l5-.73L10 2.8z"/></svg>
    </button>
  </article>
}
