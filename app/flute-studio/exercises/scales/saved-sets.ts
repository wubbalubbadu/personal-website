import {majorKeys,ranges,scaleForms,scaleTypes,type ScaleEnding,type ScaleFormId,type ScaleRange,type ScaleStart,type ScaleTypeId} from "./scale-score";
import type {ArticulationSelection,RhythmChoice,SyllableScheme} from "../../components/notePatterns";

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
  types:ScaleTypeId[];
  forms:ScaleFormId[];
  grouping:string;
  ending:ScaleEnding;
  /** Optional: sets saved before the option existed default to the tonic. */
  scaleStart?:ScaleStart;
  newLines:boolean;
  keys:string[];
  articulationRotation:{articulation:ArticulationSelection;syllables:SyllableScheme;custom?:boolean}[];
  rhythm:RhythmChoice;
};
export type ScaleSet={id:string;name:string;savedAt:string;config:ScaleSetConfig};

export const scaleSetsKey="cookie:scale-book:sets:v1";
/** Same-tab notification — `storage` only fires in *other* tabs. */
export const scaleSetsEvent="cookie:scale-sets-updated";

export function readScaleSets():ScaleSet[]{
  if(typeof localStorage==="undefined")return [];
  try{
    const parsed=JSON.parse(localStorage.getItem(scaleSetsKey)||"[]");
    if(!Array.isArray(parsed))return [];
    return parsed.filter((set:unknown)=>{
      const s=set as Partial<ScaleSet>;
      return !!s&&typeof s.id==="string"&&typeof s.name==="string"&&!!s.config&&typeof s.config==="object";
    }) as ScaleSet[];
  }catch{return []}
}

function writeScaleSets(sets:ScaleSet[]){
  try{localStorage.setItem(scaleSetsKey,JSON.stringify(sets))}catch{/* storage may be disabled */}
  window.dispatchEvent(new Event(scaleSetsEvent));
}

export function findScaleSet(id:string){return readScaleSets().find(set=>set.id===id)??null}

export function deleteScaleSet(id:string){writeScaleSets(readScaleSets().filter(set=>set.id!==id))}

export function renameScaleSet(id:string,name:string){
  const trimmed=name.trim();
  if(!trimmed)return;
  writeScaleSets(readScaleSets().map(set=>set.id===id?{...set,name:trimmed}:set));
}

/**
 * Saving under a name that already exists replaces that set rather than
 * adding a second one with the same label — re-saving after a tweak is the
 * common case, and two identically-named rows in the hub would be
 * impossible to tell apart.
 */
export function saveScaleSet(name:string,config:ScaleSetConfig):ScaleSet|null{
  const trimmed=name.trim();
  if(!trimmed)return null;
  const sets=readScaleSets();
  const existing=sets.find(set=>set.name.toLowerCase()===trimmed.toLowerCase());
  const set:ScaleSet={
    id:existing?.id??`set-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`,
    name:trimmed,
    savedAt:new Date().toISOString(),
    config,
  };
  writeScaleSets(existing?sets.map(s=>s.id===set.id?set:s):[...sets,set]);
  return set;
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

  const typeWord=types.length===1
    ?(zh?types[0].zh:types[0].label)
    :types.length===2
      ?(zh?`${types[0].zh}与${types[1].zh}`:`${types[0].label} & ${types[1].label.toLowerCase()}`)
      :(zh?`${types.length} 种音阶`:`${types.length} scale types`);
  const formWord=forms.length===1
    ?(forms[0].id==="scale"?(zh?"音阶":"scales"):(zh?forms[0].zh:forms[0].label.toLowerCase().replace(/([^s])$/,"$1s")))
    :(zh?"多种形式":"mixed forms");
  const keyWord=keyCount>=majorKeys.length
    ?(zh?"全部 12 个调":"all 12 keys")
    :(zh?`${keyCount} 个调`:`${keyCount} ${keyCount===1?"key":"keys"}`);

  return [`${typeWord}${zh?"":" "}${formWord}`,keyWord,range?(zh?range.zh:range.label.toLowerCase()):null].filter(Boolean).join(" · ");
}
