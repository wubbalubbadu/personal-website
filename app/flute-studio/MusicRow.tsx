"use client";

import Link from "next/link";
import type {MusicItem} from "../../content/music-library";
import type {ExerciseFocus} from "../../content/exercise-catalog";
import {StatusButton} from "./components/StatusButton";
import {useLanguage} from "./i18n/LanguageContext";
import "./components/tag-pill.css";
import {tagTone,BEGINNER_TONE,type TagTone} from "./lib/tagTone";
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
export default function MusicRow({item,tagLabel}:{item:MusicItem;tagLabel:(tag:string)=>string}){
  const {t,lang}=useLanguage(),zh=lang==="zh";
  const focusLabels:Record<ExerciseFocus,string>={
    technique:t.exercises.categoryTechnique,
    tone:t.exercises.categoryTone,
    breathing:t.exercises.categoryBreathing,
    articulation:t.exercises.categoryArticulation,
  };
  const exercise=item.exercise;
  const title=exercise&&zh?exercise.zhTitle:item.title;
  const detail=exercise?(zh?exercise.zhDetail:exercise.detail):item.excerpt?`${item.composer} · ${zh?item.excerpt.zhPassage??item.excerpt.passage:item.excerpt.passage}`:item.composer;
  // Tags wear a tint each (lib/tagTone); focus and count pills stay grey.
  // Your list is not a tag: it is the button at the row's end.
  const pills:{label:string;tone?:TagTone|"soon"}[]=[
    ...(item.beginner?[{label:zh?"适合入门":"Good first piece",tone:BEGINNER_TONE}]:[]),
    ...item.tags.map(tag=>({label:tagLabel(tag),tone:tagTone(tag)})),
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
    {item.viewerPath&&<StatusButton id={item.id} zh={zh} compact/>}
  </article>
}
