import {tagKey} from "../../../content/music-library";

/**
 * Which tint a tag wears (components/tag-pill.css dots, Library chips, ItemCard tiles). Since Nov 18 the Learn and Home tile
 * tints (lilac, pink, sage, blue) plus four neighbours at the same lightness (peach, teal, butter, periwinkle), so every
 * common tag has its own colour and still matches the studio. Status dots also use "blue" and "sage"; tag rules are
 * scoped to tag elements so the two never share a CSS rule by accident.
 * Known tags are assigned so the ones usually seen side by side differ; a new tag typed in the uploader gets a tint
 * from its name, so it always keeps the same one.
 */
export type TagTone="lilac"|"pink"|"sage"|"blue"|"peach"|"teal"|"butter"|"periwinkle";
const TONES:TagTone[]=["lilac","pink","sage","blue","peach","teal","butter","periwinkle"];
const KNOWN:Record<string,TagTone>={
  classical:"lilac",exercise:"blue",etude:"teal",folk:"sage",pop:"pink","k-pop":"pink","j-pop":"pink",
  film:"periwinkle",excerpt:"peach",accompaniment:"periwinkle",
};
/** Good first piece: its own warm butter, so it never matches a genre beside it. */
export const BEGINNER_TONE:TagTone="butter";

export function tagTone(tag:string):TagTone{
  const key=tagKey(tag);
  if(KNOWN[key])return KNOWN[key];
  let hash=0;
  for(const char of key)hash=(hash*31+char.charCodeAt(0))>>>0;
  return TONES[hash%TONES.length];
}
