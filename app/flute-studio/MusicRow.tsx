"use client";

import Link from "next/link";
import type {MusicItem} from "../../content/music-library";
import type {ExerciseFocus} from "../../content/exercise-catalog";
import {SaveButton} from "./components/SaveButton";
import {useLanguage} from "./i18n/LanguageContext";
import "./components/tag-pill.css";
import "./music-row.css";

/**
 * One Library row: title, composer (or what the exercise is), and its tags.
 *
 * The row used to open with an icon picked from its first tag, which only
 * restated the genre as a picture you had to decode. The tags say it in
 * words, and say all of it: a piece can be Classical and a good first piece
 * at once. Exercises carry their own tag set (Exercise plus the skill it
 * trains), so a piece is never labelled "Breathing".
 */
export default function MusicRow({item,saved,onToggleSave,tagLabel}:{item:MusicItem;saved:boolean;onToggleSave:()=>void;tagLabel:(tag:string)=>string}){
  const {t,lang}=useLanguage(),zh=lang==="zh";
  const focusLabels:Record<ExerciseFocus,string>={
    technique:t.exercises.categoryTechnique,
    tone:t.exercises.categoryTone,
    breathing:t.exercises.categoryBreathing,
    articulation:t.exercises.categoryArticulation,
  };
  const exercise=item.exercise;
  const title=exercise&&zh?exercise.zhTitle:item.title;
  const detail=exercise?(zh?exercise.zhDetail:exercise.detail):item.composer;
  const pills:{label:string;tone?:"beginner"|"exercise"|"soon"}[]=[
    ...(item.beginner?[{label:zh?"适合入门":"Good first piece",tone:"beginner" as const}]:[]),
    ...item.tags.map(tag=>({label:tagLabel(tag),tone:exercise?"exercise" as const:undefined})),
    ...(exercise?[{label:focusLabels[exercise.focus]}]:[]),
    // A book's row says how many pieces are inside it.
    ...(item.bookCount?[{label:zh?`${item.bookCount} 首`:`${item.bookCount} ${item.tags.some(tag=>/^etudes?$/i.test(tag))?"etudes":"pieces"}`}]:[]),
    ...(!item.viewerPath?[{label:t.exercises.comingSoon,tone:"soon" as const}]:[]),
  ];
  const content=<>
    <span className="music-row__copy"><strong>{title}</strong>{detail&&<small>{detail}</small>}</span>
    <span className="tag-pills">{pills.map(pill=><span key={pill.label} className="tag-pill" data-tone={pill.tone}>{pill.label}</span>)}</span>
  </>;
  return <article className="music-row">
    {item.viewerPath?<Link className="music-row__main" href={item.viewerPath}>{content}</Link>:<div className="music-row__main music-row__main--disabled">{content}</div>}
    <SaveButton saved={saved} onToggle={onToggleSave} label={saved?t.musicRow.remove(title):t.musicRow.save(title)}/>
  </article>
}
