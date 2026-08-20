"use client";

import type {MusicItem} from "../../content/music-library";
import "./music-row.css";

const symbols:Record<MusicItem["category"],string>={exercise:"♩",repertoire:"♫",etude:"𝄞",method:"≋","warm-up":"◌"};

export default function MusicRow({item,saved,onToggleSave,detail}:{item:MusicItem;saved:boolean;onToggleSave:()=>void;detail?:string}){
  const content=<><span className={`music-row__icon music-row__icon--${item.category}`} aria-hidden="true">{symbols[item.category]}</span><span className="music-row__copy"><strong>{item.title}</strong><small>{detail??`${item.composer} · ${item.difficulty.replace("-"," ")} · ${item.key}`}</small></span></>;
  return <article className="music-row">
    {item.viewerPath?<a className="music-row__main" href={item.viewerPath}>{content}</a>:<div className="music-row__main music-row__main--disabled">{content}</div>}
    <button className={saved?"music-row__save is-saved":"music-row__save"} onClick={onToggleSave} aria-label={saved?`Remove ${item.title} from saved music`:`Save ${item.title}`} title={saved?"Remove from saved music":"Save music"}>{saved?"★":"☆"}</button>
  </article>
}
