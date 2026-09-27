import catalog from "./music-catalog.json";
import composers from "./composers.json";

// Tags are free text typed in the music uploader ("Pop", "K-pop", "Folk"…)
// and a piece can have several, so Carmen can be both "Classical" and
// "Excerpt". Matching is case-insensitive. `beginner` is a hand-checked flag
// (the uploader only suggests it), shown as the "Good first pieces" shelf.
export type MusicItem={id:string;title:string;composer:string;
  /** Year written, as a plain number so pieces can be sorted on a timeline. */
  year?:number;
  /** One or two sentences about this piece: where it comes from, what it was written for. */
  about?:string;
  tags:string[];beginner?:boolean;status:"published"|"coming-soon";scorePath:string|null;viewerPath:string|null;pdfPath?:string;defaultTempo?:number;fullScorePath?:string;readingPartId?:string;partCount?:number};
// Practice tools and drills live in Exercises. The Library is reserved for
// music a student can learn and perform.
export const musicLibrary=catalog as MusicItem[];

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
