import {orderedBookPieces} from "./book-pieces.js";
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
/** One passage of a piece with several excerpts (Leonore 3: the opening, Tempo I to m. 360). Each is a tab in the reader. */
export type ExcerptPassage={id:string;label:string;zhLabel?:string;pages:ScorePage[];/** MusicXML of this passage, for the XML reader (playback, smart drone). */scorePath?:string};
/** `passages` lists the tabs most-asked first; `pages` is then the first passage's pages. `passage` is the row summary. */
export type ExcerptScore={part:string;passage:string;zhPassage?:string;workLabel?:string;zhWorkLabel?:string;tempoHint?:string;zhTempoHint?:string;pages:ScorePage[];passages?:ExcerptPassage[];source?:string};

export type MusicItem={private?:boolean;id:string;title:string;/** The title Chinese readers know it by, when there is one (tunes and pop). */zhTitle?:string;composer:string;
  /** Year written, as a plain number so pieces can be sorted on a timeline. */
  year?:number;
  /** One or two sentences about this piece: where it comes from, what it was written for. */
  about?:string;
  tags:string[];beginner?:boolean;accompanimentKind?:"piano"|"chords";
  smartDrone?:import("../app/flute-studio/components/smartDrone").DroneChange[];
  excerpt?:ExcerptScore;recordings?:ScoreRecording[];
  /** First bar governed by an unmarked "sempre staccato" direction in the printed excerpt. Playback only. */
  sempreStaccatoFromMeasure?:number;
  /** Treat one whole bar as the metronome pulse. */
  pulsePerMeasure?:boolean;
  /** Set on exercises shown in the Library; their skill is a separate tag set from a piece's genre tags. */
  exercise?:{focus:ExerciseFocus;detail:string;zhDetail:string;zhTitle:string};
  /** A numbered piece inside a book (Köhler Op. 33 No. 4). The Library lists the book, not each piece. */
  book?:{id:string;number:number;opening?:string;bars?:number;time?:string};
  /** Set on a book's own Library row: how many pieces it holds. */
  keySections?:{id:string;label:string}[];
  bookCount?:number;status:"published"|"coming-soon";scorePath:string|null;viewerPath:string|null;pdfPath?:string;defaultTempo?:number;fullScorePath?:string;readingPartId?:string;partCount?:number};
/** Pieces only: the catalog the score reader's own routes are built from. */
export const musicLibrary=catalog as MusicItem[];

/**
 * A book of numbered pieces (an etude book, a set of daily exercises). Its
 * pieces are ordinary catalog items carrying `book`, so the reader handles
 * them like any score; the book itself is one row in the Library and a page
 * listing its numbers.
 */
export type MusicBook={id:string;title:string;zhTitle?:string;composer:string;tags:string[];year?:number;about?:string};
export const musicBooks=books as MusicBook[];
export const bookPath=(id:string)=>`/flute-studio/music/books/${id}`;
/** A book's pieces, in order. */
export const bookPieces=(bookId:string)=>orderedBookPieces(musicLibrary,bookId) as MusicItem[];

/**
 * What the Library lists: every piece (a book counts once, as its own row)
 * plus every exercise that is music.
 * An etude or a scale book is still a page of notes, so there is no clean
 * line between a piece and an exercise; both live here, and exercises carry
 * an "Exercise" tag. Exercises that are not a score (Breathing Lab) stay in
 * the Exercises tab only.
 */
// Nov 18: the studio's own exercise tools (Scale Studio, Long tones) are credited as "Labs": they draw on Moyse and
// others, so they aren't Cookie's compositions. Nothing without a page to open is listed (no "Coming soon" rows).
export const libraryShelf:MusicItem[]=([
  {id:"cookie-scales",title:"Cookie’s Scale Routine",zhTitle:"Cookie 的音阶练习",composer:"Cookie",tags:["Exercise"],status:"published",scorePath:null,viewerPath:"/flute-studio/music/cookie-scales"},
  ...musicLibrary.filter(item=>!item.book),
  ...musicBooks.map((book):MusicItem=>({
    id:book.id,title:book.title,zhTitle:book.zhTitle,composer:book.composer,tags:book.tags,year:book.year,about:book.about,
    status:"published",scorePath:null,viewerPath:bookPath(book.id),bookCount:bookPieces(book.id).length,
  })),
  ...exerciseCatalog.filter(entry=>entry.scorePath!==null).map((entry):MusicItem=>({
    id:entry.id,title:entry.title,composer:"Labs",tags:["Exercise"],
    status:entry.href?"published":"coming-soon",scorePath:null,viewerPath:entry.href,
    exercise:{focus:entry.focus,detail:entry.detail,zhDetail:entry.zhDetail,zhTitle:entry.zhTitle},
  })),
] as MusicItem[]).filter(item=>!!item.viewerPath);

export const tagKey=(tag:string)=>tag.trim().toLowerCase();
/** The title to show: always the English name; reading in Chinese, the Chinese one follows in brackets when it has one. */
export const pieceTitle=(item:Pick<MusicItem,"title"|"zhTitle">,zh:boolean)=>zh&&item.zhTitle&&item.zhTitle!==item.title?`${item.title} (${item.zhTitle})`:item.title;
/** Composer names the same way (Nov 18): reading in Chinese, the Chinese name follows in brackets when there is one.
 *  Classical and traditional only: pop titles and artists, and opus or book numbers, stay as written (her call). */
const ZH_COMPOSERS:Record<string,string>={"Ludwig van Beethoven":"贝多芬","Gabriel Fauré":"福雷","Claude Debussy":"德彪西","Christian Petzold":"佩措尔德","Johann Sebastian Bach":"巴赫","Christoph Willibald Gluck":"格鲁克","Nikolai Rimsky-Korsakov":"里姆斯基-科萨科夫","Maurice Ravel":"拉威尔","Felix Mendelssohn":"门德尔松","Camille Saint-Saëns":"圣-桑","Ernesto Köhler":"克勒","Mathieu-André Reichert":"赖歇特","Traditional":"传统民歌","Labs":"练习室"};
export const composerName=(name:string,zh:boolean)=>zh&&ZH_COMPOSERS[name]?`${name} (${ZH_COMPOSERS[name]})`:name;
/** Tag names in Chinese, one list for every page (a tag not listed shows as typed). */
const ZH_TAGS:Record<string,string>={pop:"流行",folk:"民谣",classical:"古典","k-pop":"韩流","j-pop":"日本流行",film:"电影",excerpt:"管弦乐片段",etude:"练习曲",exercise:"练习",accompaniment:"伴奏"};
export const tagName=(tag:string,zh:boolean)=>zh?ZH_TAGS[tagKey(tag)]??tag:tagKey(tag)==="excerpt"?"Orchestral excerpts":tag;
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
