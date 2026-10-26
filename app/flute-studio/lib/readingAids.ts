/**
 * Reading aids (note names, accidentals, fingering, beat sticks), per piece on top of a default (decided October 21,
 * 2026). Changing an aid in a piece keeps it for that piece and also makes it the default, so a piece you have not
 * set yet opens the way you last read; a piece you did set keeps its own. Pieces and exercise books have separate
 * defaults (sixteenth runs and repertoire are read differently).
 *
 * They travel in a transfer code (they are about you, not the screen), which is why they left the device-only
 * `cookie:reader-view:*` keys. Until a kind has a default here, it is taken from that older key, so nothing resets.
 * Stored as {defaults:{piece,exercise}, pieces:{[scoreId]: aids}}; a transfer merges it field by field.
 */
/** namePlace "above" | "below" the staff; nameScope "all" | "ledger" (ledger-line notes only). Older saves have neither. */
export type ReadingAids={noteDisplay:string;accidentals:boolean;fingering:boolean;rhythmMode:string;namePlace?:string;nameScope?:string};
export type AidsKind="piece"|"exercise";
type Stored={defaults?:Partial<Record<AidsKind,ReadingAids>>;pieces?:Record<string,ReadingAids>};

export const READING_AIDS_KEY="cookie:reading-aids:v1";
const legacyKey=(kind:AidsKind)=>`cookie:reader-view:${kind}:v1`;

/** Only the aids, each of the right type; anything else is dropped. Null when nothing is usable. */
function aidsFrom(value:unknown):ReadingAids|null{
  if(!value||typeof value!=="object")return null;
  const v=value as Record<string,unknown>;
  if(typeof v.noteDisplay!=="string"&&typeof v.accidentals!=="boolean"&&typeof v.fingering!=="boolean"&&typeof v.rhythmMode!=="string")return null;
  return {noteDisplay:typeof v.noteDisplay==="string"?v.noteDisplay:"off",accidentals:v.accidentals===true,fingering:v.fingering===true,
    // The old counting mode is gone: a saved "counts" now shows the beat sticks.
    rhythmMode:typeof v.rhythmMode==="string"?(v.rhythmMode==="off"?"off":"bars"):"off",
    namePlace:v.namePlace==="below"?"below":"above",nameScope:v.nameScope==="ledger"?"ledger":"all"};
}
function read():Stored{try{const value=JSON.parse(localStorage.getItem(READING_AIDS_KEY)||"{}");return value&&typeof value==="object"&&!Array.isArray(value)?value:{}}catch{return {}}}

/** This piece's aids: its own if it has them, else the default for its kind, else the older reader key, else null. */
export function readAids(scoreId:string,kind:AidsKind):ReadingAids|null{
  const stored=read();
  const own=aidsFrom(stored.pieces?.[scoreId]);if(own)return own;
  const fallback=aidsFrom(stored.defaults?.[kind]);if(fallback)return fallback;
  try{return aidsFrom(JSON.parse(localStorage.getItem(legacyKey(kind))||"null"))}catch{return null}
}

export function saveAids(scoreId:string,kind:AidsKind,aids:ReadingAids){
  const stored=read();
  const next:Stored={...stored,defaults:{...stored.defaults,[kind]:aids},pieces:{...stored.pieces,[scoreId]:aids}};
  try{localStorage.setItem(READING_AIDS_KEY,JSON.stringify(next))}catch{/* this visit only */}
}
