"use client";
import Link from "next/link";
import {toggleDone,useBookProgress} from "../lib/bookProgress";
import "../music/books/book.css";
import "./tag-pill.css";

/**
 * Exercise book: a book you open that holds several numbered things (Reichert's daily exercises, Köhler's etudes,
 * Cookie's scale routine, later the melodies). Every book's contents page is this list, so they all match (Nov 14).
 *
 * One row per item: a bold name, a grey detail line, "Last opened" on the one you were last in, and a done tick you
 * set yourself (opening something is not finishing it). Numbers start at 1 and are what bookProgress stores.
 * Put the done count in the DetailHeader's meta line with `useBookDoneText`.
 */
export type ExerciseBookItem={number:number;title:string;detail?:string;href:string};

export function ExerciseBook({bookId,items,label,zh}:{bookId:string;items:ExerciseBookItem[];label:string;zh:boolean}){
  const progress=useBookProgress(bookId);
  return <section className="book-page__list" aria-label={label}>
    {items.map(item=>{
      const n=item.number,done=progress.done.includes(n),last=progress.last===n;
      return <article key={n} className={`book-row${done?" is-done":""}`}>
        <Link className="book-row__main" href={item.href}>
          <span className="book-row__copy"><strong>{item.title}</strong>{item.detail&&<small>{item.detail}</small>}</span>
          {last&&<span className="tag-pill" data-tone="sage">{zh?"上次练到这里":"Last opened"}</span>}
        </Link>
        <button type="button" className="book-row__done" aria-pressed={done} aria-label={zh?(done?`取消完成：${item.title}`:`标记为完成：${item.title}`):(done?`Mark ${item.title} as not done`:`Mark ${item.title} as done`)} onClick={()=>toggleDone(bookId,n)}>
          <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.5"/><path d="M6 10.3 8.6 13 14 7.3"/></svg>
        </button>
      </article>;
    })}
  </section>;
}

/** "3 of 34 done" for the DetailHeader's meta line. */
export function useBookDoneText(bookId:string,total:number,zh:boolean){
  const done=useBookProgress(bookId).done.filter(n=>n>=1&&n<=total).length;
  return zh?`已完成 ${done} / ${total}`:`${done} of ${total} done`;
}
