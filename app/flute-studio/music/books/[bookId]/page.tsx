"use client";

import DetailHeader from "../../../components/DetailHeader";
import {StatusButton} from "../../../components/StatusButton";
import {useParams} from "next/navigation";
import {bookPieces,musicBooks} from "../../../../../content/music-library";
import {ExerciseBook,useBookDoneText} from "../../../components/ExerciseBook";
import {useLanguage} from "../../../i18n/LanguageContext";
import "../../../exercises/exercises.css";

/**
 * One book (Köhler Op. 33 Book 1): its numbered pieces in order, where you
 * left off, and which ones you have marked done. Each number opens in the
 * ordinary score reader.
 */
export default function BookPage(){
  const {bookId}=useParams<{bookId:string}>();
  const {t,lang}=useLanguage(),zh=lang==="zh";
  const book=musicBooks.find(entry=>entry.id===bookId);
  const pieces=bookPieces(bookId);
  const doneText=useBookDoneText(bookId,pieces.length,zh);
  if(!book||!pieces.length)return <main style={{padding:"120px 24px",textAlign:"center"}}><h1>{zh?"找不到这本书":"Book not found"}</h1></main>;

  return <main className="exercise-hub">
    <div className="exercise-hub__content">
      <DetailHeader backHref="/flute-studio/music" backLabel={t.library.title} title={book.title}
        status={<StatusButton id={book.id} zh={zh}/>}
        meta={<>{book.composer}{book.year?` · ${book.year}`:""} · {doneText}</>}>
        {book.about&&<p className="detail-header__about">{book.about}</p>}
      </DetailHeader>

      <ExerciseBook bookId={bookId} label={book.title} zh={zh} items={pieces.map(piece=>{
        const n=piece.book!.number;
        return {number:n,href:piece.viewerPath!,title:zh?`第 ${n} 首`:`No. ${n}`,
          detail:[piece.book!.opening,piece.book!.time,piece.book!.bars?(zh?`${piece.book!.bars} 小节`:`${piece.book!.bars} bars`):""].filter(Boolean).join(" · ")};
      })}/>
    </div>
  </main>;
}
