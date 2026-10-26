import {majorKeys,ranges,scaleForms,scaleGroupings,scaleTypes,type ScaleSpan,type ScaleEnding,type ScaleFormId,type ScaleRange,type ScaleStart,type ScaleTypeId} from "./scale-score";
import type {ArticulationSelection,RhythmChoice,SyllableScheme} from "../../components/notePatterns";
import {deleteSaved,findSaved,readSaved,renameSaved,saveSaved,savedExercisesEvent,type SavedExercise} from "../../lib/savedExercises";

/**
 * A saved set is a whole Scale Studio setup under a name, so a routine you
 * liked ("Monday thirds", "double-tonguing sharps") can be reopened from
 * the Exercises hub instead of rebuilt from the panel every time.
 *
 * It stores everything that changes what is on the page — keys, types,
 * forms, range, order, grouping, ending, line breaks, the articulation
 * rotation and the rhythm — but deliberately NOT the per-key tempos. Those
 * live per exercise in their own store and track how fast you can actually
 * play C major today; they should keep improving across every set rather
 * than being frozen into one.
 */
export type ScaleSetConfig={
  range:ScaleRange;
  order:string;
  /** Arranged by key signature rather than by type or tonic. Absent in sets saved before it existed. */
  bySignature?:boolean;
  types:ScaleTypeId[];
  forms:ScaleFormId[];
  grouping:string;
  ending:ScaleEnding;
  /** Optional: sets saved before the option existed default to the tonic. */
  scaleStart?:ScaleStart;
  /** The two ends of a custom range. Absent in sets saved before it was stored. */
  customSpan?:ScaleSpan;
  /** The pattern: 1 straight, 3 or 4 broken, "turn" or "neighbor" for turns. Absent in sets saved before it existed. */
  groupSize?:number|string;
  /** Rhythms rotating across keys, when more than one is chosen; `rhythm` is the first (what older readers use). */
  rhythms?:RhythmChoice[];
  newLines:boolean;
  keys:string[];
  articulationRotation:{articulation:ArticulationSelection;syllables:SyllableScheme;custom?:boolean}[];
  rhythm:RhythmChoice;
};
/** A Scale Studio set: a saved exercise of kind "scales" (lib/savedExercises.ts holds every kind in one list). */
export type ScaleSet=SavedExercise<ScaleSetConfig>;

/** Same-tab notification when any saved exercise changes, sets included. */
export const scaleSetsEvent=savedExercisesEvent;

export function readScaleSets():ScaleSet[]{return readSaved("scales") as ScaleSet[]}
export function findScaleSet(id:string){const found=findSaved(id);return found?.kind==="scales"?found as ScaleSet:null}

/**
 * When each set was last *played*, for Home's warm-up rotation (the set played longest ago comes up next). Opening a
 * set is not playing it: it counts when Listen, Record or the metronome runs while the set is on the page. A list of
 * {id, at} records so a transfer keeps the later time per set; under scale-book:sets so it travels with the sets.
 */
export const setPlaysKey="cookie:scale-book:sets-played:v1";
export type SetPlay={id:string;at:number};
export function readSetPlays():SetPlay[]{
  try{const parsed=JSON.parse(localStorage.getItem(setPlaysKey)||"[]");return Array.isArray(parsed)?parsed.filter(play=>play&&typeof play.id==="string"&&typeof play.at==="number"):[]}catch{return []}
}
export function markSetPlayed(id:string,at=Date.now()){
  try{localStorage.setItem(setPlaysKey,JSON.stringify([...readSetPlays().filter(play=>play.id!==id),{id,at}]))}catch{/* storage may be disabled */}
}
/** The warm-up for today: the set played longest ago; never-played sets first, in the order they were saved. */
export function warmUpSet(sets:ScaleSet[],plays:SetPlay[]):ScaleSet|null{
  const last=new Map(plays.map(play=>[play.id,play.at]));
  return [...sets].sort((a,b)=>(last.get(a.id)??-1)-(last.get(b.id)??-1)||a.savedAt.localeCompare(b.savedAt))[0]??null;
}
export function deleteScaleSet(id:string){deleteSaved(id)}
export function renameScaleSet(id:string,name:string){renameSaved(id,name)}
/** Saving under a name that already exists replaces that set (see saveSaved). */
export function saveScaleSet(name:string,config:ScaleSetConfig):ScaleSet|null{return saveSaved("scales",name,config)}

/**
 * The type half of a book title. Three or more types used to read
 * "3 种音阶" / "3 scale types", which then had the form word appended
 * ("3 种音阶音阶"). Three minors together are just "minor" (the natural,
 * harmonic and melodic set a student plays as one routine); any other mix
 * is "mixed", and the form word finishes the phrase either way.
 */
export function typeWordFor(types:readonly {id:string;label:string;zh:string}[],zh:boolean){
  if(types.length===1)return zh?types[0].zh:types[0].label;
  if(types.length===2)return zh?`${types[0].zh}与${types[1].zh}`:`${types[0].label} & ${types[1].label.toLowerCase()}`;
  const allMinor=types.every(t=>t.id==="natural"||t.id==="harmonic"||t.id==="melodic");
  return allMinor?(zh?"小调":"Minor"):(zh?"多种":"Mixed");
}

/**
 * The one-line summary under a set's name, used both in the Scale Studio
 * panel and on the Exercises hub so a set reads the same in both places:
 * what it contains, then how much of it — "Major & harmonic minor thirds ·
 * 12 keys · two octaves".
 */
export function describeSet(config:ScaleSetConfig,zh:boolean){
  const types=scaleTypes.filter(t=>config.types?.includes(t.id));
  const forms=scaleForms.filter(f=>config.forms?.includes(f.id));
  const range=ranges.find(r=>r.id===config.range);
  const keyCount=(config.keys??[]).length;

  const typeWord=typeWordFor(types,zh);
  const formWord=forms.length===1
    ?(forms[0].id==="scale"?(zh?"音阶":"scales"):(zh?forms[0].zh:forms[0].label.toLowerCase().replace(/([^s])$/,"$1s")))
    :(zh?"多种形式":"mixed forms");
  const keyWord=keyCount>=majorKeys.length
    ?(zh?"全部 12 个调":"all 12 keys")
    :(zh?`${keyCount} 个调`:`${keyCount} ${keyCount===1?"key":"keys"}`);

  const grouping=scaleGroupings.find(g=>g.size===config.groupSize);
  const pattern=grouping&&grouping.size!==1&&forms.some(f=>f.id==="scale"||f.id==="arpeggio")?(zh?grouping.zhTitle:grouping.title):"";
  return [`${typeWord}${zh?"":" "}${formWord}${pattern?(zh?`（${pattern}）`:` ${pattern}`):""}`,keyWord,range?(zh?range.zh:range.label.toLowerCase()):null].filter(Boolean).join(" · ");
}
