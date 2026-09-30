import catalog from "./music-catalog.json";
import composers from "./composers.json";
import books from "./music-books.json";
import {exerciseCatalog,type ExerciseFocus} from "./exercise-catalog";

// Tags are free text typed in the music uploader ("Pop", "K-pop", "Folk"…)
// and a piece can have several, so Carmen can be both "Classical" and
// "Excerpt". Matching is case-insensitive. `beginner` is a hand-checked flag
// (the uploader only suggests it), shown as the "Good first pieces" shelf.
export type ScorePage={src:string;width:number;height:number};
export type ScoreRecording={id:string;title:string;performer:string;youtubeId:string;startSeconds?:number};
export type ExcerptScore={part:string;passage:string;zhPassage?:string;pages:ScorePage[]};

export type MusicItem={id:string;title:string;composer:string;
  /** Year written, as a plain number so pieces can be sorted on a timeline. */
  year?:number;
  /** One or two sentences about this piece: where it comes from, what it was written for. */
  about?:string;
  tags:string[];beginner?:boolean;
  smartDrone?:import("../app/flute-studio/components/smartDrone").DroneChange[];
  excerpt?:ExcerptScore;recordings?:ScoreRecording[];
  /** Set on exercises shown in the Library; their skill is a separate tag set from a piece's genre tags. */
  exercise?:{focus:ExerciseFocus;detail:string;zhDetail:string;zhTitle:string};
  /** A numbered piece inside a book (Köhler Op. 33 No. 4). The Library lists the book, not each piece. */
  book?:{id:string;number:number;opening?:string;bars?:number;time?:string};
  /** Set on a book's own Library row: how many pieces it holds. */
  bookCount?:number;status:"published"|"coming-soon";scorePath:string|null;viewerPath:string|null;pdfPath?:string;defaultTempo?:number;fullScorePath?:string;readingPartId?:string;partCount?:number};
/** Pieces only: the catalog the score reader's own routes are built from. */
export const musicLibrary=catalog as MusicItem[];

/**
 * A book of numbered pieces (an etude book, a set of daily exercises). Its
 * pieces are ordinary catalog items carrying `book`, so the reader handles
 * them like any score; the book itself is one row in the Library and a page
 * listing its numbers.
 */
export type MusicBook={id:string;title:string;composer:string;tags:string[];year?:number;about?:string};
export const musicBooks=books as MusicBook[];
export const bookPath=(id:string)=>`/flute-studio/music/books/${id}`;
/** A book's pieces, in order. */
export const bookPieces=(bookId:string)=>musicLibrary.filter(item=>item.book?.id===bookId).sort((a,b)=>a.book!.number-b.book!.number);

/**
 * What the Library lists: every piece (a book counts once, as its own row)
 * plus every exercise that is music.
 * An etude or a scale book is still a page of notes, so there is no clean
 * line between a piece and an exercise; both live here, and exercises carry
 * an "Exercise" tag. Exercises that are not a score (Breathing Lab) stay in
 * the Exercises tab only.
 */
export const libraryShelf:MusicItem[]=[
  ...musicLibrary.filter(item=>!item.book),
  ...musicBooks.map((book):MusicItem=>({
    id:book.id,title:book.title,composer:book.composer,tags:book.tags,year:book.year,about:book.about,
    status:"published",scorePath:null,viewerPath:bookPath(book.id),bookCount:bookPieces(book.id).length,
  })),
  ...exerciseCatalog.filter(entry=>entry.scorePath!==null).map((entry):MusicItem=>({
    id:entry.id,title:entry.title,composer:"",tags:["Exercise"],
    status:entry.href?"published":"coming-soon",scorePath:null,viewerPath:entry.href,
    exercise:{focus:entry.focus,detail:entry.detail,zhDetail:entry.zhDetail,zhTitle:entry.zhTitle},
  })),
];

export const tagKey=(tag:string)=>tag.trim().toLowerCase();
export const hasTag=(item:Pick<MusicItem,"tags">,tag:string)=>item.tags.some(value=>tagKey(value)===tagKey(tag));

/** Every tag in use, most-used first, spelled the way it was first typed. */
export function libraryTags(items:Pick<MusicItem,"tags">[]=musicLibrary){
  const counts=new Map<string,{label:string;count:number}>();
  for(const item of items)for(const tag of item.tags){const key=tagKey(tag),entry=counts.get(key);if(entry)entry.count++;else counts.set(key,{label:tag.trim(),count:1})}
  return [...counts.values()].sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label)).map(entry=>entry.label);
}

/**
 * Short composer bios, keyed by the name exactly as the catalog spells it.
 * Shown when you tap the composer's name in the reader. "Traditional" and
 * pop artists simply have no entry.
 */
export type ComposerInfo={born?:number;died?:number;nationality?:string;era?:string;bio:string};
export const composerInfo=(name:string)=>(composers as Record<string,ComposerInfo>)[name];
