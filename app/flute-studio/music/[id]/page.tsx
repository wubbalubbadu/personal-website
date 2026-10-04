"use client";
import {usePrivateMusic} from "../../lib/privateMusic";

import Link from "next/link";
import {useEffect,useState} from "react";
import {useParams} from "next/navigation";
import {musicLibrary as publicMusic,musicBooks,bookPieces,bookPath,composerInfo} from "../../../../content/music-library";
import {ScoreViewer,type ScoreViewerConfig} from "../../components/ScoreViewer";
import {PracticeIcon} from "../../components/PracticeIcon";
import KeyExerciseViewer from "../../components/KeyExerciseViewer";
import FixedScoreViewer from "../../components/FixedScoreViewer";
import {recordOpened} from "../../lib/bookProgress";
import {useLanguage} from "../../i18n/LanguageContext";
import "../books/book.css";

export default function UploadedMusicPage(){
  const privateMusic=usePrivateMusic();
  const musicLibrary=[...publicMusic,...privateMusic.items];
  const params=useParams<{id:string}>();
  const {lang}=useLanguage(),zh=lang==="zh";
  const [interactive,setInteractive]=useState(false);
  const item=musicLibrary.find(entry=>entry.id===params.id);
  // A numbered piece in a book: back goes to the book, and the header steps
  // to the neighbouring numbers so you can work through it in order.
  const book=item?.book?musicBooks.find(entry=>entry.id===item.book!.id):undefined;
  const siblings=book?bookPieces(book.id):[];
  const position=item?.book?siblings.findIndex(piece=>piece.id===item.id):-1;
  const previous=position>0?siblings[position-1]:undefined,next=position>=0?siblings[position+1]:undefined;
  useEffect(()=>{if(item?.book)recordOpened(item.book.id,item.book.number)},[item?.book]);

  if(item?.excerpt&&!interactive)return <FixedScoreViewer key={item.id} item={item} onInteractive={item.scorePath?()=>setInteractive(true):undefined}/>;
  if(!item?.scorePath)return <main style={{padding:"120px 24px",textAlign:"center"}}><h1>{zh?"乐谱不可用":"Score unavailable"}</h1><p>{zh?"私人乐谱需在设置中输入访问码。":"For private music, enter your access code in Settings."}</p></main>;
  const config:ScoreViewerConfig={
    // The back link already names the book, so the header just says which
    // number; the book's name sits beside the composer under the title.
    title:book?`${book.title} ${item.title}`:item.title,
    composer:item.composer,
    ...(item.excerpt?.workLabel?{subtitle:zh?item.excerpt.zhWorkLabel??item.excerpt.workLabel:item.excerpt.workLabel}:{}),
    ...(item.excerpt?.tempoHint?{tempoHint:zh?item.excerpt.zhTempoHint??item.excerpt.tempoHint:item.excerpt.tempoHint}:{}),
    asset:item.scorePath,
    practiceGuide:true,
    hideRehearsalMarks:!!item.excerpt,
    sempreStaccatoFromMeasure:item.sempreStaccatoFromMeasure,
    pulsePerMeasure:item.pulsePerMeasure,
    smartDrone:item.smartDrone,
    ...(item.accompanimentKind?{accompaniment:{asset:item.fullScorePath??item.scorePath,readingPartId:item.readingPartId??"P1",kind:item.accompanimentKind}}:{}),
    id:item.id,
    backHref:book?bookPath(book.id):"/flute-studio/music",
    // A book goes on your lists as a whole, from any of its numbers.
    ...(book?{backLabel:book.title,listId:book.id}:{}),
    ...(item.pdfPath?{pdfPath:item.pdfPath}:{}),
    ...(item.defaultTempo?{defaultTempo:item.defaultTempo}:{}),
    ...(composerInfo(item.composer)||item.about?{story:{composer:composerInfo(item.composer),year:item.year,about:item.about,tempoHint:zh?item.excerpt?.zhTempoHint??item.excerpt?.tempoHint:item.excerpt?.tempoHint}}:{}),
  };
  const stepper=book&&item.book?<span className="book-stepper">
    {previous?<Link className="book-stepper__arrow" href={previous.viewerPath!} aria-label={zh?`上一首：第 ${previous.book!.number} 首`:`Previous: No. ${previous.book!.number}`}><PracticeIcon name="previous"/></Link>:<span className="book-stepper__arrow is-off" aria-hidden="true"><PracticeIcon name="previous"/></span>}
    <span className="book-stepper__label" aria-label={zh?`第 ${item.book.number} 首，共 ${siblings.length} 首`:`No. ${item.book.number} of ${siblings.length}`}>{item.book.number} / {siblings.length}</span>
    {next?<Link className="book-stepper__arrow" href={next.viewerPath!} aria-label={zh?`下一首：第 ${next.book!.number} 首`:`Next: No. ${next.book!.number}`}><PracticeIcon name="next"/></Link>:<span className="book-stepper__arrow is-off" aria-hidden="true"><PracticeIcon name="next"/></span>}
  </span>:null;
  if(item.keySections)return <KeyExerciseViewer key={item.id} config={config} sections={item.keySections} stepper={stepper}/>;
  return <ScoreViewer config={config} headerActions={()=> <>{stepper}{item.excerpt&&<div className="reader-choice" role="group" aria-label={zh?"乐谱格式":"Score format"}><button aria-pressed={false} onClick={()=>setInteractive(false)}>PDF</button><button aria-pressed={true}>XML</button></div>}</>}/>;
}
