import {tagKey} from "../../../content/music-library";

/**
 * Which soft tint a tag pill wears (components/tag-pill.css): the six region
 * colours of the technique roadmap. Known tags are assigned so that the ones
 * usually seen side by side differ; a new tag typed in the uploader gets a
 * tint from its name, so it always keeps the same one.
 */
export type TagTone="sage"|"sand"|"blue"|"pink"|"lavender"|"coral";
const TONES:TagTone[]=["sage","sand","blue","pink","lavender","coral"];
const KNOWN:Record<string,TagTone>={
  classical:"lavender",exercise:"blue",etude:"sage",folk:"sage",pop:"pink",
  "k-pop":"coral","j-pop":"pink",film:"blue",excerpt:"coral",
  // Shown with Good first pieces (sand), Folk (sage) and Classical (lavender), so none of those.
  accompaniment:"blue",
};
/** Good first piece: warm, and never the same as the tag beside it most often (Folk). */
export const BEGINNER_TONE:TagTone="sand";

export function tagTone(tag:string):TagTone{
  const key=tagKey(tag);
  if(KNOWN[key])return KNOWN[key];
  let hash=0;
  for(const char of key)hash=(hash*31+char.charCodeAt(0))>>>0;
  return TONES[hash%TONES.length];
}
