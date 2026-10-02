"use client";

import Link from "next/link";
import BackChevron from "../../../components/BackChevron";
import {StatusButton} from "../../../components/StatusButton";
import {useParams} from "next/navigation";
import {bookPieces,musicBooks} from "../../../../../content/music-library";
import {toggleDone,useBookProgress} from "../../../lib/bookProgress";
import {useLanguage} from "../../../i18n/LanguageContext";
import "../../../exercises/exercises.css";
import "../../../components/tag-pill.css";
import "../book.css";

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
  const progress=useBookProgress(bookId);
  if(!book||!pieces.length)return <main style={{padding:"120px 24px",textAlign:"center"}}><h1>{zh?"找不到这本书":"Book not found"}</h1></main>;

  const doneCount=pieces.filter(piece=>progress.done.includes(piece.book!.number)).length;

  return <main className="exercise-hub">
    <div className="exercise-hub__content">
      <Link className="book-page__back" href="/flute-studio/music" aria-label={t.library.title}><BackChevron/></Link>
      <header className="exercise-hub__header book-page__header">
        <div><h1>{book.title}</h1></div>
        <p className="book-page__composer">{book.composer}{book.year?` · ${book.year}`:""}</p>
        {book.about&&<p className="book-page__about">{book.about}</p>}
        <div className="book-page__actions">
          <StatusButton id={book.id} zh={zh}/>
          <span className="book-page__count">{zh?`已完成 ${doneCount} / ${pieces.length}`:`${doneCount} of ${pieces.length} done`}</span>
        </div>
      </header>

      <section className="book-page__list" aria-label={book.title}>
        {pieces.map(piece=>{
          const n=piece.book!.number,done=progress.done.includes(n),last=progress.last===n;
          const detail=[piece.book!.opening,piece.book!.time,piece.book!.bars?(zh?`${piece.book!.bars} 小节`:`${piece.book!.bars} bars`):""].filter(Boolean).join(" · ");
          return <article key={piece.id} className={`book-row${done?" is-done":""}`}>
            <Link className="book-row__main" href={piece.viewerPath!}>
              <span className="book-row__number">{n}</span>
              <span className="book-row__copy"><strong>{zh?`第 ${n} 首`:`No. ${n}`}</strong><small>{detail}</small></span>
              {last&&<span className="tag-pill" data-tone="sage">{zh?"上次练到这里":"Last opened"}</span>}
            </Link>
            {/* Done is yours to set: opening a piece is not finishing it. */}
            <button type="button" className="book-row__done" aria-pressed={done} aria-label={zh?(done?`取消完成第 ${n} 首`:`标记第 ${n} 首为完成`):(done?`Mark No. ${n} as not done`:`Mark No. ${n} as done`)} onClick={()=>toggleDone(bookId,n)}>
              <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.5"/><path d="M6 10.3 8.6 13 14 7.3"/></svg>
            </button>
          </article>;
        })}
      </section>
    </div>
  </main>;
}
