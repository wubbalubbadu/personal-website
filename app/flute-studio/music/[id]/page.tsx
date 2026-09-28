"use client";

import Link from "next/link";
import {useEffect} from "react";
import {useParams} from "next/navigation";
import {musicLibrary,musicBooks,bookPieces,bookPath,composerInfo} from "../../../../content/music-library";
import {ScoreViewer,type ScoreViewerConfig} from "../../components/ScoreViewer";
import {recordOpened} from "../../lib/bookProgress";
import {useLanguage} from "../../i18n/LanguageContext";
import "../books/book.css";

export default function UploadedMusicPage(){
  const params=useParams<{id:string}>();
  const {lang}=useLanguage(),zh=lang==="zh";
  const item=musicLibrary.find(entry=>entry.id===params.id);
  // A numbered piece in a book: back goes to the book, and the header steps
  // to the neighbouring numbers so you can work through it in order.
  const book=item?.book?musicBooks.find(entry=>entry.id===item.book!.id):undefined;
  const siblings=book?bookPieces(book.id):[];
  const position=item?.book?siblings.findIndex(piece=>piece.id===item.id):-1;
  const previous=position>0?siblings[position-1]:undefined,next=position>=0?siblings[position+1]:undefined;
  useEffect(()=>{if(item?.book)recordOpened(item.book.id,item.book.number)},[item?.book]);

  if(!item?.scorePath)return <main style={{padding:"120px 24px",textAlign:"center"}}><h1>Score not found</h1></main>;
  const config:ScoreViewerConfig={
    // The back link already names the book, so the header just says which
    // number; the book's name sits beside the composer under the title.
    title:item.title,
    composer:book?`${item.composer} · ${book.title}`:item.composer,
    asset:item.scorePath,
    id:item.id,
    backHref:book?bookPath(book.id):"/flute-studio/music",
    ...(book?{backLabel:book.title}:{}),
    ...(item.pdfPath?{pdfPath:item.pdfPath}:{}),
    ...(item.defaultTempo?{defaultTempo:item.defaultTempo}:{}),
    ...(composerInfo(item.composer)||item.about?{story:{composer:composerInfo(item.composer),year:item.year,about:item.about}}:{}),
  };
  const stepper=book&&item.book?<span className="book-stepper">
    {previous?<Link className="book-stepper__arrow" href={previous.viewerPath!} aria-label={zh?`上一首：第 ${previous.book!.number} 首`:`Previous: No. ${previous.book!.number}`}>‹</Link>:<span className="book-stepper__arrow is-off" aria-hidden="true">‹</span>}
    <span className="book-stepper__label" aria-label={zh?`第 ${item.book.number} 首，共 ${siblings.length} 首`:`No. ${item.book.number} of ${siblings.length}`}>{item.book.number} / {siblings.length}</span>
    {next?<Link className="book-stepper__arrow" href={next.viewerPath!} aria-label={zh?`下一首：第 ${next.book!.number} 首`:`Next: No. ${next.book!.number}`}>›</Link>:<span className="book-stepper__arrow is-off" aria-hidden="true">›</span>}
  </span>:null;
  return <ScoreViewer config={config} {...(stepper?{headerActions:()=>stepper}:{})}/>;
}
