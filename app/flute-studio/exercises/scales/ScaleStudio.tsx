"use client";
import {ScoreViewer} from "../../components/ScoreViewer";
import {ReaderPopover} from "../../components/ReaderPopover";
import {PracticeIcon} from "../../components/PracticeIcon";
import {useCallback,useEffect,useState} from "react";
import {useLanguage} from "../../i18n/LanguageContext";

import {keyForType,majorKeys,ranges,scaleBookMusicXML,scaleForms,scaleNotes,scaleTypes,typeById,type MajorKey,type ScaleBlock,type ScaleEnding,type ScaleFormId,type ScaleRange,type ScaleTypeId} from "./scale-score";

/** A minor scale is titled from its own spelling: C♯ minor, not D♭ minor. */
const keyLabelFor=(key:MajorKey,typeId:ScaleTypeId)=>keyForType(key,typeById(typeId)).label;
import {type ArticulationGroup,type ArticulationMode,type ArticulationPresetId,type ArticulationSelection,type RhythmChoice,type SyllableScheme,articulationPresetIds,articulationPresetSelection,defaultArticulationSelection,resolveArticulationPattern,resolveArticulation,resolveRhythm,resolveSyllable,selectionsEqual} from "../../components/notePatterns";
import "./scale-book.css";

/**
 * Named starting points linked from the Exercises hub. A preset in the URL
 * wins over whatever was last saved — following "Major thirds" from the
 * hub should land on major thirds, not on last night's setup.
 */
const presets:Record<string,{types:ScaleTypeId[];forms:ScaleFormId[];range?:ScaleRange}>={
  "major-scales":{types:["major"],forms:["scale"]},
  "harmonic-minors":{types:["harmonic"],forms:["scale"]},
  "major-arpeggios":{types:["major"],forms:["arpeggio"]},
  "major-thirds":{types:["major"],forms:["thirds"]},
};
const preferenceKey="cookie:scale-book:preferences:v3";
const tempoKey="cookie:scale-book:tempos:v1";
const allKeys=majorKeys.map(k=>k.id) as string[];
const articulationModes:ArticulationMode[]=["slur","tongue","staccato","tenuto"];

/**
 * What one rotation slot actually means for a key: how it's articulated,
 * and whether it carries its own tonguing syllables. Bundling them together
 * is what lets "double tonguing" behave as its own selectable articulation
 * (staccato notes + T-K-T-K labels) rather than a global overlay that
 * would otherwise show T/K under every tongued note regardless of which
 * pattern a given key is actually using.
 */
type RotationEntry={articulation:ArticulationSelection;syllables:SyllableScheme;custom?:boolean};
const silentSyllables:SyllableScheme={mode:"off"};

function isValidArticulationSelection(value:unknown):value is ArticulationSelection{
  if(!value||typeof value!=="object")return false;
  const v=value as {kind?:string;mode?:string;groups?:unknown};
  if(v.kind==="whole")return typeof v.mode==="string"&&(articulationModes as string[]).includes(v.mode);
  if(v.kind==="groups")return Array.isArray(v.groups)&&v.groups.length>0&&v.groups.every(g=>g&&typeof g==="object"&&typeof (g as ArticulationGroup).size==="number"&&(articulationModes as string[]).includes((g as ArticulationGroup).mode));
  return false;
}
function isValidSyllableScheme(value:unknown):value is SyllableScheme{
  if(!value||typeof value!=="object")return false;
  const v=value as {mode?:string;startLetter?:string};
  if(v.mode==="off"||v.mode==="tripletGrouped")return true;
  return v.mode==="alternate"&&(v.startLetter==="T"||v.startLetter==="K");
}
function isValidRotationEntry(value:unknown):value is RotationEntry{
  if(!value||typeof value!=="object")return false;
  const v=value as {articulation?:unknown;syllables?:unknown;custom?:unknown};
  return isValidArticulationSelection(v.articulation)&&isValidSyllableScheme(v.syllables)&&(v.custom===undefined||typeof v.custom==="boolean");
}
function isValidRotation(value:unknown):value is RotationEntry[]{
  // Empty is valid — it means "nothing selected," which resolves to plain
  // tongue/no marking wherever the rotation gets read.
  return Array.isArray(value)&&value.every(isValidRotationEntry);
}
function entriesEqual(a:RotationEntry,b:RotationEntry){
  // The custom entry never matches a preset even when its groups happen to
  // spell the same pattern — they are separate slots in the rotation.
  return !!a.custom===!!b.custom&&selectionsEqual(a.articulation,b.articulation)&&isSameSyllableScheme(a.syllables,b.syllables);
}
function isSameSyllableScheme(a:SyllableScheme,b:SyllableScheme){
  if(a.mode!==b.mode)return false;
  return a.mode==="alternate"?a.startLetter===(b as {startLetter:"T"|"K"}).startLetter:true;
}

const articulationLabels:Record<ArticulationPresetId,{en:string;zh:string}>={
  allSlurred:{en:"All slurred",zh:"全部连音"},
  allTenuto:{en:"All tongued (tenuto)",zh:"全部吐音（保持音）"},
  allStaccato:{en:"All staccato",zh:"全部断音"},
  slur2Tongue2:{en:"Slur 2, tongue 2",zh:"连 2 吐 2"},
  tongue2Slur2:{en:"Tongue 2, slur 2",zh:"吐 2 连 2"},
  slur2Tongue1:{en:"Slur 2, tongue 1",zh:"连 2 吐 1"},
  tongue1Slur2Tongue1:{en:"Tongue 1, slur 2, tongue 1",zh:"吐 1 连 2 吐 1"},
  tongue1Slur3:{en:"Tongue 1, slur 3",zh:"吐 1 连 3"},
  slur3Tongue1:{en:"Slur 3, tongue 1",zh:"连 3 吐 1"},
};
const modeLabels:Record<ArticulationMode,{en:string;zh:string}>={slur:{en:"Slur",zh:"连音"},tongue:{en:"Tongue",zh:"吐音"},staccato:{en:"Staccato",zh:"断音"},tenuto:{en:"Tenuto",zh:"保持音"}};
const rhythmChoices:RhythmChoice[]=["even","dottedLongShort","dottedShortLong","triplet"];
const rhythmLabels:Record<RhythmChoice,{en:string;zh:string}>={even:{en:"Even",zh:"均分"},dottedLongShort:{en:"Dotted, long–short",zh:"附点（长–短）"},dottedShortLong:{en:"Dotted, short–long",zh:"附点（短–长）"},triplet:{en:"Triplet",zh:"三连音"}};

// Double/triple tonguing are practice techniques for articulating a fast
// staccato run, not separate notation — so each is just a preset like any
// other: staccato notes, plus the syllable labels that go with it. Bundled
// this way, selecting one alongside e.g. "All slurred" gives exactly the
// per-key rotation a teacher would expect (one scale slurred, the next
// double-tongued, back to slurred, and so on) instead of syllables being a
// separate setting applied uniformly regardless of which key it lands on.
type TonguingPresetId="doubleForward"|"doubleReversed"|"tripleGrouped";
const tonguingPresets:Record<TonguingPresetId,RotationEntry>={
  doubleForward:{articulation:{kind:"whole",mode:"staccato"},syllables:{mode:"alternate",startLetter:"T"}},
  doubleReversed:{articulation:{kind:"whole",mode:"staccato"},syllables:{mode:"alternate",startLetter:"K"}},
  tripleGrouped:{articulation:{kind:"whole",mode:"staccato"},syllables:{mode:"tripletGrouped"}},
};
const tonguingLabels:Record<TonguingPresetId,{en:string;zh:string}>={
  doubleForward:{en:"Double tonguing: T-K-T-K",zh:"双吐：T-K-T-K"},
  doubleReversed:{en:"Double tonguing, reversed: K-T-K-T",zh:"双吐（反向）：K-T-K-T"},
  tripleGrouped:{en:"Triple tonguing: T-K-T",zh:"三吐：T-K-T"},
};

/**
 * Small notation-style glyph instead of a text label — a run of beamed
 * notes with the pattern's own marks (slur arc, staccato dot, tenuto dash;
 * "tongue" gets no mark, matching the real notation). Shows exactly one
 * full cycle of the pattern (3-6 notes) rather than a fixed 4, so slur2/
 * tongue1-family patterns (cycle length 3) render as a complete, properly
 * closed group instead of an oddly-truncated one.
 */
function ArticulationIcon({selection}:{selection:ArticulationSelection}){
  const pattern:ArticulationGroup[]=selection.kind==="whole"?[{size:4,mode:selection.mode}]:selection.groups;
  const n=Math.min(6,Math.max(2,pattern.reduce((sum,g)=>sum+Math.max(0,g.size),0)));
  const spacing=56/(n-1);
  const notes=Array.from({length:n},(_,i)=>({x:8+i*spacing,mode:resolveArticulation(pattern,i).mode}));
  const slurRuns:{x1:number;x2:number}[]=[];
  let open:{x1:number;x2:number}|null=null;
  notes.forEach(note=>{
    if(note.mode==="slur"){if(open){open.x2=note.x}else{open={x1:note.x,x2:note.x};slurRuns.push(open)}}
    else open=null;
  });
  return <svg viewBox="0 0 72 32" width="52" height="24" className="scale-book__preset-icon" aria-hidden="true">
    <line x1={notes[0].x} y1="2" x2={notes[n-1].x} y2="2" stroke="currentColor" strokeWidth="2.4"/>
    <line x1={notes[0].x} y1="5.6" x2={notes[n-1].x} y2="5.6" stroke="currentColor" strokeWidth="2.4"/>
    {notes.map((note,i)=><g key={i}>
      <line x1={note.x} y1="8" x2={note.x} y2="17.5" stroke="currentColor" strokeWidth="1.4"/>
      <ellipse cx={note.x} cy="18.5" rx="3.4" ry="2.6" fill="currentColor"/>
      {note.mode==="staccato"&&<circle cx={note.x} cy="25" r="1.6" fill="currentColor"/>}
      {note.mode==="tenuto"&&<rect x={note.x-3} y="24.1" width="6" height="1.8" fill="currentColor"/>}
    </g>)}
    {slurRuns.map((run,i)=><path key={i} d={`M ${run.x1-1.5} 21.5 Q ${(run.x1+run.x2)/2} 29 ${run.x2+1.5} 21.5`} fill="none" stroke="currentColor" strokeWidth="1.3"/>)}
  </svg>;
}

/** Same glyph language as ArticulationIcon, with T/K syllables under each note instead of a mark — triplet-grouped shows 3 notes (one full T-K-T cycle) instead of 4. */
function SyllableIcon({scheme}:{scheme:SyllableScheme}){
  const n=scheme.mode==="tripletGrouped"?3:4;
  const spacing=56/(n-1);
  let tongueIndex=0;
  const letters=Array.from({length:n},()=>{const letter=resolveSyllable("tongue",tongueIndex,scheme);tongueIndex++;return letter});
  return <svg viewBox="0 0 72 32" width="52" height="24" className="scale-book__preset-icon" aria-hidden="true">
    <line x1="8" y1="2" x2={8+(n-1)*spacing} y2="2" stroke="currentColor" strokeWidth="2.4"/>
    <line x1="8" y1="5.6" x2={8+(n-1)*spacing} y2="5.6" stroke="currentColor" strokeWidth="2.4"/>
    {letters.map((letter,i)=>{const x=8+i*spacing;return <g key={i}>
      <line x1={x} y1="8" x2={x} y2="17.5" stroke="currentColor" strokeWidth="1.4"/>
      <ellipse cx={x} cy="18.5" rx="3.4" ry="2.6" fill="currentColor"/>
      <text x={x} y="27.5" textAnchor="middle" fontSize="8" fontWeight="700" fill="currentColor">{letter}</text>
    </g>;})}
  </svg>;
}

/** A preset's icon shows its syllables when it has any (the tonguing presets), otherwise its articulation marks — never both, so the glyph stays readable at this size. */
function RotationEntryIcon({entry}:{entry:RotationEntry}){
  return entry.syllables.mode==="off"?<ArticulationIcon selection={entry.articulation}/>:<SyllableIcon scheme={entry.syllables}/>;
}

/**
 * Same beamed-note language as the articulation glyphs, but built from
 * actual relative durations (resolveRhythm) instead of articulation marks:
 * note spacing is proportional to each note's divisions, dotted notes get
 * a real duration dot, and a lone 16th between two longer notes gets a
 * partial "hook" beam on whichever side its longer partner sits — hooked
 * left for long-short (the 16th completes the pair before it), right for
 * short-long — rather than a full second beam, which would misread as a
 * plain run of even 16ths.
 */
function RhythmIcon({choice}:{choice:RhythmChoice}){
  const n=choice==="triplet"?3:4;
  const durations=resolveRhythm(n,choice);
  const total=durations.reduce((sum,d)=>sum+d.divisions,0);
  let cursor=8;
  const notes=durations.map(d=>{
    const x=cursor;
    cursor+=(d.divisions/total)*56;
    return {x,divisions:d.divisions,type:d.type,dots:d.dots};
  });
  const hooks:{x1:number;x2:number}[]=[];
  notes.forEach((note,i)=>{
    if(note.type!=="16th")return;
    const prev=notes[i-1],next=notes[i+1];
    if(next&&next.type==="16th"){hooks.push({x1:note.x,x2:next.x});return}
    if(prev&&prev.type==="16th")return; // covered by the previous note's segment
    if(prev&&prev.divisions>note.divisions)hooks.push({x1:note.x-7,x2:note.x});
    else if(next&&next.divisions>note.divisions)hooks.push({x1:note.x,x2:note.x+7});
  });
  const lastX=notes[notes.length-1].x;
  return <svg viewBox="0 0 72 32" width="52" height="24" className="scale-book__preset-icon" aria-hidden="true">
    {choice==="triplet"&&<text x={(notes[0].x+lastX)/2} y="6" textAnchor="middle" fontSize="7" fontWeight="700" fill="currentColor">3</text>}
    <line x1={notes[0].x} y1="10" x2={lastX} y2="10" stroke="currentColor" strokeWidth="2.4"/>
    {hooks.map((h,i)=><line key={i} x1={h.x1} y1="13.6" x2={h.x2} y2="13.6" stroke="currentColor" strokeWidth="2.4"/>)}
    {notes.map((note,i)=><g key={i}>
      <line x1={note.x} y1="16" x2={note.x} y2="25.5" stroke="currentColor" strokeWidth="1.4"/>
      <ellipse cx={note.x} cy="26.5" rx="3.4" ry="2.6" fill="currentColor"/>
      {note.dots>0&&<circle cx={note.x+6} cy="26.5" r="1.3" fill="currentColor"/>}
    </g>)}
  </svg>;
}

/**
 * A plain div/button accordion, not native <details>/<summary> — native
 * details fires real "toggle" events when React (re)sets its `open`
 * property during a remount, and those events land on the same onToggle
 * handler a real user click would, with no reliable way to tell them
 * apart. That's what was closing/reopening sections on their own whenever
 * a completely unrelated control elsewhere caused ScoreViewer to remount.
 * Fully React-controlled open state sidesteps the whole class of bug.
 */
function AccordionSection({id,title,openSections,onToggle,className,children}:{id:string;title:string;openSections:string[];onToggle:(id:string)=>void;className?:string;children:React.ReactNode}){
  const open=openSections.includes(id);
  return <div className={className?`scale-book__section ${className}`:"scale-book__section"}>
    <button type="button" className="scale-book__section-summary" aria-expanded={open} onClick={()=>onToggle(id)}>
      <span className="scale-book__disclosure" aria-hidden="true">▸</span>{title}
    </button>
    {open&&<div className="scale-book__section-body">{children}</div>}
  </div>;
}

export default function ScaleStudio(){
  const {lang}=useLanguage(),zh=lang==="zh";
  const [range,setRange]=useState<ScaleRange>("two");
  const [order,setOrder]=useState("chromatic");
  // Types and forms are both multi-select and combine as a cross product;
  // the book groups by type first, then key, then form.
  const [types,setTypes]=useState<ScaleTypeId[]>(["major"]);
  const [forms,setForms]=useState<ScaleFormId[]>(["scale"]);
  // Which axis the book is grouped by: "type" walks every key of one type
  // before the next type; "key" keeps one tonic together (C major, then c
  // minor, then c harmonic minor) before moving on.
  const [grouping,setGrouping]=useState("type");
  const [ending,setEnding]=useState<ScaleEnding>("hold");
  const [newLines,setNewLines]=useState(false);
  const [keys,setKeys]=useState<string[]>(allKeys);
  // A rotation, not a single pattern: key index i gets
  // articulationRotation[i % length] — one entry means "same pattern
  // everywhere"; more than one cycles across keys in the order selected.
  // Empty means nothing's selected, which every reader of this array falls
  // back to defaultArticulationSelection (plain tongue, no marking) for.
  const [articulationRotation,setArticulationRotation]=useState<RotationEntry[]>([]);
  // The custom pattern's shape, kept separately from whether it's
  // currently toggled into the rotation — so turning it off and back on
  // (or just closing and reopening Customize) doesn't lose what was built.
  const [customDraft,setCustomDraft]=useState<ArticulationGroup[]>([{size:4,mode:"tongue"}]);
  const [rhythm,setRhythm]=useState<RhythmChoice>("even");
  // Which per-key tempo field is mid-edit, holding its raw text so a
  // half-typed "1" on the way to "120" is not clamped under the cursor.
  const [tempoDraft,setTempoDraft]=useState<{id:string;value:string}|null>(null);
  // Which accordion section is open, lifted into real React state rather
  // than each <details>'s own uncontrolled DOM state. Necessary because
  // this whole dialog is rendered inside ScoreViewer via the `settings`
  // render-prop, and ScoreViewer remounts (fresh DOM, including this
  // dialog) whenever rhythm/rotation/newLines change — i.e. whenever the
  // user touches almost any other control in this same panel. An
  // uncontrolled <details> forgets whatever the user had open the instant
  // that happens; a bare `open` attribute is worse — it gets silently
  // reasserted on every remount regardless of what the user actually did.
  // Controlled state survives the remount because it lives here, one
  // level up, not on the DOM node that gets thrown away.
  // Sections open and close independently — picking keys while the scale
  // type list is open should not shut the list you were just using.
  const [openSections,setOpenSections]=useState<string[]>(["type"]);
  function toggleSection(id:string){setOpenSections(current=>current.includes(id)?current.filter(s=>s!==id):[...current,id])}
  // The header breadcrumb doubles as navigation: each segment opens
  // Customize scales on the section that controls it.
  const [customizeOpen,setCustomizeOpen]=useState(false);
  function openCustomize(section:string){setOpenSections(current=>current.includes(section)?current:[...current,section]);setCustomizeOpen(true)}
  const [tempos,setTempos]=useState<Record<string,number>>({});
  const [loaded,setLoaded]=useState(false);

  // Which exercise the transport's tempo belongs to. A tempo is per
  // exercise, not per key: "C major scale" and "c harmonic minor thirds"
  // are different things to play and carry different speeds.
  const [activeBlock,setActiveBlock]=useState("");
  // Tempo is tracked per key+range only — not per articulation/rhythm
  // choice, which would otherwise fragment "how fast can I play C major"
  // into a different number every time the practice pattern changes.
  const blockTempoId=(block:ScaleBlock,range:ScaleRange)=>`scale-book:${block.type}:${block.form}:${block.key.id}:${range}`;
  const saveTempo=useCallback((bpm:number)=>{if(!activeBlock)return;setTempos(prev=>prev[activeBlock]===bpm?prev:{...prev,[activeBlock]:bpm})},[activeBlock]);
  useEffect(()=>{
    try{
      const pref=JSON.parse(localStorage.getItem(preferenceKey)||"null");
      // Browser-only preferences are restored after SSR hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if(pref&&ranges.some(r=>r.id===pref.range))setRange(pref.range);
      if(pref?.order==="fifths")setOrder("fifths");
      if(typeof pref?.newLines==="boolean")setNewLines(pref.newLines);
      if(Array.isArray(pref?.keys))setKeys(allKeys.filter(k=>pref.keys.includes(k)));
      if(pref?.grouping==="type"||pref?.grouping==="key")setGrouping(pref.grouping);
      if(pref?.ending==="none"||pref?.ending==="hold")setEnding(pref.ending);
      const savedTypes=Array.isArray(pref?.types)?scaleTypes.filter(t=>pref.types.includes(t.id)).map(t=>t.id):[];
      if(savedTypes.length)setTypes(savedTypes);
      const savedForms=Array.isArray(pref?.forms)?scaleForms.filter(f=>pref.forms.includes(f.id)).map(f=>f.id):[];
      if(savedForms.length)setForms(savedForms);
      if(isValidRotation(pref?.articulationRotation))setArticulationRotation(pref.articulationRotation);
      if(pref?.rhythm==="even"||pref?.rhythm==="dottedLongShort"||pref?.rhythm==="dottedShortLong"||pref?.rhythm==="triplet")setRhythm(pref.rhythm);
      const saved=JSON.parse(localStorage.getItem(tempoKey)||"{}");
      if(saved&&typeof saved==="object")setTempos(Object.fromEntries(Object.entries(saved)
        .filter(([id,n])=>id.startsWith("scale-book:")&&typeof n==="number"&&Number.isFinite(n)&&n>=40&&n<=220)
        // Tempos saved before exercises had a type and a form are all
        // major scales — the old key was scale-book:major:<key>:<range>.
        // Re-point them at the new five-part id instead of dropping them.
        .map(([id,n])=>{const parts=id.split(":");return parts.length===4?[`scale-book:${parts[1]}:scale:${parts[2]}:${parts[3]}`,n] as const:[id,n] as const})
      ) as Record<string,number>);
    }catch{/* Invalid browser preferences fall back to the complete chapter. */}
    const preset=presets[new URLSearchParams(location.search).get("preset")??""];
    if(preset){setTypes(preset.types);setForms(preset.forms);setKeys(allKeys);if(preset.range)setRange(preset.range)}
    setLoaded(true);
  },[]);
  useEffect(()=>{if(loaded)try{localStorage.setItem(preferenceKey,JSON.stringify({range,keys,newLines,order,grouping,ending,types,forms,articulationRotation,rhythm}));}catch{/* Storage may be disabled. */}},[range,keys,newLines,order,grouping,ending,types,forms,articulationRotation,rhythm,loaded]);
  useEffect(()=>{if(loaded)try{localStorage.setItem(tempoKey,JSON.stringify(tempos));}catch{/* Storage may be disabled. */}},[tempos,loaded]);

  const chosenRange=ranges.find(r=>r.id===range)!;
  const selected=majorKeys.filter(k=>keys.includes(k.id)).sort((a,b)=>order==="fifths"?(a.pc*7)%12-(b.pc*7)%12:a.pc-b.pc);
  // Type is the outermost loop ("all the major ones, then all the minor
  // ones"), then key, then form — so one key's scale and its thirds sit
  // next to each other rather than a page apart.
  const chosenTypes=scaleTypes.filter(t=>types.includes(t.id));
  const chosenForms=scaleForms.filter(f=>forms.includes(f.id));
  const showForm=chosenForms.length>1||chosenForms[0]?.id!=="scale";
  const blockFor=(key:MajorKey,type:typeof chosenTypes[number],form:typeof chosenForms[number]):ScaleBlock=>({
    key,type:type.id,form:form.id,
    label:`${keyLabelFor(key,type.id)} ${zh?type.zh:type.label.toLowerCase()}${showForm?` ${zh?form.zh:form.label.toLowerCase()}`:""}`,
  });
  const blocks:ScaleBlock[]=grouping==="key"
    ?selected.flatMap(key=>chosenTypes.flatMap(type=>chosenForms.map(form=>blockFor(key,type,form))))
    :chosenTypes.flatMap(type=>selected.flatMap(key=>chosenForms.map(form=>blockFor(key,type,form))));
  const blockNotes=(block:ScaleBlock)=>scaleNotes(block.key,range,block.type,block.form,ending);
  const displayPitches=blocks.flatMap(b=>blockNotes(b).map(n=>`${n.step}${n.alter<0?"♭":n.alter>0?"♯":""}${n.octave}`));
  const measureKeyAccidentals=blocks.flatMap(b=>Array.from({length:Math.ceil(blockNotes(b).length/8)},()=>blockNotes(b).filter(n=>n.alter).map(n=>`${n.step}${n.alter<0?"♭":"♯"}`)));
  // Syllables reset per key (own scale, own tonguing count), and each key
  // resolves against whichever rotation entry it's assigned — same
  // per-key reset displayPitches/measureKeyAccidentals already use above.
  // tongueIndex only advances on tongue/staccato notes — a slurred note
  // isn't tongued, so it doesn't consume a T/K turn.
  const syllables=blocks.flatMap((block,keyIndex)=>{
    const count=blockNotes(block).length;
    const entry=articulationRotation[keyIndex%articulationRotation.length]??{articulation:defaultArticulationSelection,syllables:silentSyllables};
    const pattern=resolveArticulationPattern(entry.articulation,count);
    let tongueIndex=0;
    return Array.from({length:count},(_,i)=>{
      const {mode}=resolveArticulation(pattern,i),syllable=resolveSyllable(mode,tongueIndex,entry.syllables);
      if(mode==="tongue"||mode==="staccato")tongueIndex++;
      return syllable;
    });
  });
  const soleForm=chosenForms.length===1?chosenForms[0]:null;
  const formWord=soleForm?(soleForm.id==="scale"?(zh?"音阶":"scales"):(zh?soleForm.zh:soleForm.label.toLowerCase().replace(/([^s])$/,"$1s"))):(zh?"多种形式":"mixed forms");
  const typeWord=chosenTypes.length===1
    ?(zh?chosenTypes[0].zh:chosenTypes[0].label)
    :chosenTypes.length===2
      ?(zh?`${chosenTypes[0].zh}与${chosenTypes[1].zh}`:`${chosenTypes[0].label} & ${chosenTypes[1].label.toLowerCase()}`)
      :(zh?`${chosenTypes.length} 种音阶`:`${chosenTypes.length} scale types`);
  const bookTitle=`${typeWord}${zh?"":" "}${formWord}`;
  const changeRange=(next:ScaleRange)=>setRange(next);
  const toggleFrom=<T,>(list:T[],value:T,setList:(next:T[])=>void)=>{
    // Never empty: unticking the last one would render a blank book, so the
    // last remaining selection stays put.
    const next=list.includes(value)?list.filter(v=>v!==value):[...list,value];
    if(next.length)setList(next);
  };
  const toggleKey=(key:string)=>{
    setKeys(prev=>prev.includes(key)?prev.filter(k=>k!==key):[...prev,key]);
  };
  // Toggling a preset adds/removes it from the rotation, in click order.
  // Removing the only (or last) selected one is allowed — it just leaves
  // the rotation empty, i.e. no marking, which is a real, selectable state
  // now rather than something the UI silently prevented.
  function toggleEntry(entry:RotationEntry){
    setArticulationRotation(prev=>{
      const index=prev.findIndex(e=>entriesEqual(e,entry));
      return index>=0?prev.filter((_,i)=>i!==index):[...prev,entry];
    });
  }
  const isEntryActive=(entry:RotationEntry)=>articulationRotation.some(e=>entriesEqual(e,entry));
  // "My articulation" is just another rotation member (so it can sit
  // alongside presets in a multi-pattern rotation) whose shape happens to
  // be user-built rather than fixed — at most one such entry at a time.
  const customIndex=articulationRotation.findIndex(e=>e.custom);
  const customActive=customIndex>=0;
  function toggleCustom(){
    setArticulationRotation(prev=>{
      const index=prev.findIndex(e=>e.custom);
      return index>=0?prev.filter((_,i)=>i!==index):[...prev,{articulation:{kind:"groups",groups:customDraft},syllables:silentSyllables,custom:true}];
    });
  }
  function editCustomGroups(update:(groups:ArticulationGroup[])=>ArticulationGroup[]){
    setCustomDraft(prevDraft=>{
      const next=update(prevDraft);
      setArticulationRotation(prevRotation=>prevRotation.map(e=>e.custom?{...e,articulation:{kind:"groups",groups:next}}:e));
      return next;
    });
  }

  if(!loaded)return null;
  return <div className="scale-reader">
    <ScoreViewer unmetered onTempoChange={saveTempo} lineBreak={{value:newLines,onChange:setNewLines}} config={{title:bookTitle,composer:"",asset:scaleBookMusicXML(blocks,range,newLines,articulationRotation.map(e=>e.articulation),rhythm,ending),displayPitches,measureKeyAccidentals,syllables,id:`scale-book-${range}-${grouping}-${ending}-${types.join("+")}-${forms.join("+")}-${selected.map(k=>k.id).join("-")}`,backHref:"/flute-studio/exercises",defaultTempo:(activeBlock?tempos[activeBlock]:undefined)??60}}
      toolbar={<div className="scale-book__chapter-inline"><button type="button" className="scale-book__crumb" onClick={()=>openCustomize("type")}>{typeWord}</button><button type="button" className="scale-book__crumb" onClick={()=>openCustomize("form")}>{formWord}</button><span aria-hidden="true">·</span><button type="button" className="scale-book__crumb" onClick={()=>openCustomize("range")}>{zh?chosenRange.zh:chosenRange.label}</button><span aria-hidden="true">·</span><button type="button" className="scale-book__crumb" onClick={()=>openCustomize("keys")}>{selected.length} {zh?"个调性":selected.length===1?"key":"keys"}</button></div>}
      settings={reader=><>
    {!selected.length&&<p className="scale-book__empty">Choose keys in Customize scales to display your scales.</p>}
    <ReaderPopover open={customizeOpen} onOpenChange={setCustomizeOpen} label={zh?"自定义音阶":"Customize scales"} trigger={<><PracticeIcon name="settings"/>{zh?"音阶":"Scales"}</>} className="tool has-tip">
      <div className="scale-book__panel-body">
        <AccordionSection id="type" title={zh?"音阶类型":"Scale type"} openSections={openSections} onToggle={toggleSection}>
          <div className="scale-book__ranges" role="group" aria-label={zh?"音阶类型":"Scale type"}>{scaleTypes.map(t=><button type="button" key={t.id} className={types.includes(t.id)?"scale-book__chip selected":"scale-book__chip"} aria-pressed={types.includes(t.id)} onClick={()=>toggleFrom(types,t.id,setTypes)}>{zh?t.zh:t.label}</button>)}</div>
        </AccordionSection>
        <AccordionSection id="form" title={zh?"练习形式":"Form"} openSections={openSections} onToggle={toggleSection}>
          <div className="scale-book__ranges" role="group" aria-label={zh?"练习形式":"Form"}>{scaleForms.map(f=><button type="button" key={f.id} className={forms.includes(f.id)?"scale-book__chip selected":"scale-book__chip"} aria-pressed={forms.includes(f.id)} onClick={()=>toggleFrom(forms,f.id,setForms)}>{zh?f.zh:f.label}</button>)}</div>
          <p className="scale-book__field-label">{zh?"结尾":"Ending"}</p>
          <div className="scale-book__ranges" role="group" aria-label={zh?"结尾":"Ending"}>{([["none",zh?"直接反复":"Straight"],["hold",zh?"主音延长":"Hold the tonic"]] as [ScaleEnding,string][]).map(([value,label])=><button type="button" key={value} className={ending===value?"scale-book__chip selected":"scale-book__chip"} aria-pressed={ending===value} onClick={()=>setEnding(value)}>{label}</button>)}</div>
        </AccordionSection>
        <AccordionSection id="keys" title={zh?"调性":"Keys"} openSections={openSections} onToggle={toggleSection}>
          <div className="scale-book__key-actions"><button onClick={()=>setKeys(allKeys)}>{zh?"全部":"All keys"}</button><button onClick={()=>{setKeys([]);}}>{zh?"清除":"Clear"}</button></div>
          <div className="scale-book__keys">{majorKeys.map(k=><button type="button" key={k.id} className={keys.includes(k.id)?"scale-book__chip selected":"scale-book__chip"} aria-pressed={keys.includes(k.id)} onClick={()=>toggleKey(k.id)}>{k.label}</button>)}</div>
        </AccordionSection>
        <AccordionSection id="range" title={zh?"音域":"Range"} openSections={openSections} onToggle={toggleSection}>
          <div className="scale-book__ranges" role="group" aria-label={zh?"音域":"Range"}>{ranges.map(r=><button type="button" key={r.id} className={range===r.id?"scale-book__chip selected":"scale-book__chip"} aria-pressed={range===r.id} onClick={()=>changeRange(r.id)}>{zh?r.zh:r.label}{"notes" in r&&<small>{r.notes}</small>}</button>)}</div>
        </AccordionSection>
        <AccordionSection id="order" title={zh?"音阶顺序":"Scale order"} openSections={openSections} onToggle={toggleSection}>
          <p className="scale-book__field-label">{zh?"调性顺序":"Key order"}</p>
          <div className="scale-book__ranges" role="group" aria-label={zh?"调性顺序":"Key order"}>{[["chromatic",zh?"半音顺序":"Chromatic"],["fifths",zh?"五度圈":"Circle of fifths"]].map(([value,label])=><button type="button" key={value} className={order===value?"scale-book__chip selected":"scale-book__chip"} aria-pressed={order===value} onClick={()=>setOrder(value)}>{label}</button>)}</div>
          <p className="scale-book__field-label">{zh?"换行":"Line breaks"}</p>
          <div className="scale-book__ranges" role="group" aria-label={zh?"换行":"Line breaks"}>{([[false,zh?"接续上一个":"Continue from previous"],[true,zh?"另起一行":"Start on a new line"]] as [boolean,string][]).map(([value,label])=><button type="button" key={String(value)} className={newLines===value?"scale-book__chip selected":"scale-book__chip"} aria-pressed={newLines===value} onClick={()=>setNewLines(value)}>{label}</button>)}</div>
          <p className="scale-book__field-label">{zh?"分组方式":"Group by"}</p>
          <div className="scale-book__ranges" role="group" aria-label={zh?"分组方式":"Group by"}>{[["type",zh?"音阶类型":"Scale type"],["key",zh?"调性":"Key"]].map(([value,label])=><button type="button" key={value} className={grouping===value?"scale-book__chip selected":"scale-book__chip"} aria-pressed={grouping===value} onClick={()=>setGrouping(value)}>{label}</button>)}</div>
        </AccordionSection>
        <AccordionSection id="articulation" title={zh?"演奏法":"Articulation"} openSections={openSections} onToggle={toggleSection}>
          {articulationRotation.length>1&&<p className="scale-book__rotation-hint">{zh?"按顺序轮流分配给每个调性":"Cycles across keys in the order selected"}</p>}
          <div className="scale-book__preset-grid">
            {articulationPresetIds.map(id=>{
              const entry:RotationEntry={articulation:articulationPresetSelection(id),syllables:silentSyllables};
              return <button key={id} type="button" className={isEntryActive(entry)?"scale-book__preset selected":"scale-book__preset"} aria-label={zh?articulationLabels[id].zh:articulationLabels[id].en} onClick={()=>toggleEntry(entry)}><RotationEntryIcon entry={entry}/></button>;
            })}
            {(Object.keys(tonguingPresets) as TonguingPresetId[]).map(id=>{
              const entry=tonguingPresets[id];
              return <button key={id} type="button" className={isEntryActive(entry)?"scale-book__preset selected":"scale-book__preset"} aria-label={zh?tonguingLabels[id].zh:tonguingLabels[id].en} onClick={()=>toggleEntry(entry)}><RotationEntryIcon entry={entry}/></button>;
            })}
            <button type="button" className={customActive?"scale-book__preset selected":"scale-book__preset"} aria-label={zh?"我的奏法":"My articulation"} onClick={toggleCustom}><i className="scale-book__preset-custom-badge">✎</i><ArticulationIcon selection={{kind:"groups",groups:customDraft}}/></button>
          </div>
          {customActive&&<div className="scale-book__custom-editor">
            {customDraft.map((g,i)=><div className="scale-book__group-row" key={i}>
              <input type="number" min={1} max={32} value={g.size} aria-label={zh?"音符数":"Group size"} onChange={e=>{const size=Math.max(1,Math.round(+e.target.value)||1);editCustomGroups(groups=>groups.map((row,idx)=>idx===i?{...row,size}:row))}}/>
              <select value={g.mode} aria-label={zh?"奏法":"Articulation mode"} onChange={e=>{const mode=e.target.value as ArticulationMode;editCustomGroups(groups=>groups.map((row,idx)=>idx===i?{...row,mode}:row))}}>
                {articulationModes.map(m=><option key={m} value={m}>{zh?modeLabels[m].zh:modeLabels[m].en}</option>)}
              </select>
              <button type="button" aria-label={zh?"删除该组":"Remove group"} disabled={customDraft.length<=1} onClick={()=>editCustomGroups(groups=>groups.filter((_,idx)=>idx!==i))}>×</button>
            </div>)}
            <button type="button" className="scale-book__add-group" onClick={()=>editCustomGroups(groups=>[...groups,{size:4,mode:"tongue"}])}>{zh?"+ 添加一组":"+ Add group"}</button>
          </div>}
        </AccordionSection>
        <AccordionSection id="rhythm" title={zh?"节奏型":"Rhythm"} openSections={openSections} onToggle={toggleSection}>
          <div className="scale-book__preset-grid">{rhythmChoices.map(value=><button key={value} type="button" className={rhythm===value?"scale-book__preset selected":"scale-book__preset"} aria-label={zh?rhythmLabels[value].zh:rhythmLabels[value].en} onClick={()=>setRhythm(value)}><RhythmIcon choice={value}/></button>)}</div>
        </AccordionSection>
        <AccordionSection id="tempos" title={zh?"练习速度":"Practice tempos"} openSections={openSections} onToggle={toggleSection} className="scale-book__tempos">{blocks.map(block=>{
          const id=blockTempoId(block,range),tempo=tempos[id]??60,name=block.label;
          const setTempo=(next:number)=>{setActiveBlock(id);setTempos(prev=>({...prev,[id]:next}));reader.setTempo(next)};
          const running=reader.metronome&&activeBlock===id;
          return <div className="scale-reader__tempo" key={id}><span className="scale-book__tempo-label"><b>{name}</b><small>{zh?chosenRange.zh:chosenRange.label}</small></span><div className="scale-book__metronome"><button disabled={tempo<=40} aria-label={`${name}: decrease tempo by 5`} onClick={()=>setTempo(tempo-5)}>−</button><label className="scale-book__tempo-field">♩ = <input type="number" min={40} max={220} aria-label={`${name}: tempo in BPM`} value={tempoDraft?.id===id?tempoDraft.value:tempo} onChange={e=>setTempoDraft({id,value:e.target.value})} onFocus={()=>setActiveBlock(id)} onBlur={()=>{if(tempoDraft?.id!==id)return;const next=Number(tempoDraft.value);const valid=Number.isFinite(next)&&tempoDraft.value.trim()!=="";setTempoDraft(null);if(valid)setTempo(Math.max(40,Math.min(220,Math.round(next))))}} onKeyDown={e=>{if(e.key==="Enter")e.currentTarget.blur()}}/></label><button disabled={tempo>=220} aria-label={`${name}: increase tempo by 5`} onClick={()=>setTempo(tempo+5)}>+</button><button className={running?"scale-book__play on":"scale-book__play"} aria-label={running?`${name}: stop metronome`:`${name}: start metronome`} aria-pressed={running} onClick={()=>{setTempo(tempo);if(running||!reader.metronome)reader.toggleMetronome()}}><PracticeIcon name="metronome"/></button></div></div>;
        })}</AccordionSection>
      </div>
      <button className="reader-settings-reset" onClick={()=>{setKeys(allKeys);setRange("two");setOrder("chromatic");setGrouping("type");setEnding("hold");setTypes(["major"]);setForms(["scale"]);setNewLines(false);setArticulationRotation([]);setCustomDraft([{size:4,mode:"tongue"}]);setRhythm("even")}}>{zh?"恢复默认":"Restore defaults"}</button>
    </ReaderPopover>
    </>}/>
  </div>;
}
