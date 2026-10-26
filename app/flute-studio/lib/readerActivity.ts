/**
 * Two small things the score readers remember for Home's Today card.
 *
 * Where you left off: per score, the bar (MusicXML reader) or printed page and passage (excerpt reader) you were on
 * when you stopped scrolling or turned the page. A bar, not a scroll position or a page number, because page breaks
 * differ between a phone and a desktop; a printed page is the same everywhere. Kept as a list of {id, at, ...}
 * records, newest first, so a transfer keeps the later one per score.
 *
 * Playing: Listen and Record fire PRACTISING_EVENT, so a page holding a reader (Scale Studio) can tell it was
 * actually played, not just opened.
 */
export const LEFT_OFF_KEY="cookie:reader-left-off:v1";
export const PRACTISING_EVENT="cookie:practising";
export type LeftOff={/** The score's id (an excerpt passage's XML is "piece:passage"). */id:string;at:number;bar?:number;page?:number;passage?:string};
const LIMIT=12;

export function readLeftOff():LeftOff[]{
  try{const value=JSON.parse(localStorage.getItem(LEFT_OFF_KEY)||"[]");return Array.isArray(value)?value.filter(item=>item&&typeof item.id==="string"&&typeof item.at==="number"):[]}catch{return []}
}
export function rememberLeftOff(spot:Omit<LeftOff,"at">){
  const all=readLeftOff(),before=all.find(item=>item.id===spot.id);
  if(before&&before.bar===spot.bar&&before.page===spot.page&&before.passage===spot.passage&&Date.now()-before.at<60000)return;
  const next=[{...spot,at:Date.now()},...all.filter(item=>item.id!==spot.id)].slice(0,LIMIT);
  try{localStorage.setItem(LEFT_OFF_KEY,JSON.stringify(next))}catch{/* storage may be disabled */}
}
export function announcePractising(){window.dispatchEvent(new Event(PRACTISING_EVENT))}
