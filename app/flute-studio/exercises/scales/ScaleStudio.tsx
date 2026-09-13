"use client";
import {ScoreViewer} from "../../components/ScoreViewer";
import {useCallback,useEffect,useRef,useState} from "react";
import {useLanguage} from "../../i18n/LanguageContext";

import {majorKeys,ranges,scaleBookMusicXML,scaleNotes,type ScaleRange} from "./scale-score";
import {type ArticulationGroup,type ArticulationMode,type ArticulationPresetId,type ArticulationSelection,type RhythmChoice,type SyllableScheme,articulationPresetIds,articulationPresetSelection,defaultArticulationSelection,resolveArticulationPattern,resolveArticulation,resolveRhythm,resolveSyllable,selectionsEqual,serializeArticulationSelection,serializeSyllableScheme} from "../../components/notePatterns";
import "./scale-book.css";

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
type RotationEntry={articulation:ArticulationSelection;syllables:SyllableScheme};
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
  const v=value as {articulation?:unknown;syllables?:unknown};
  return isValidArticulationSelection(v.articulation)&&isValidSyllableScheme(v.syllables);
}
function isValidRotation(value:unknown):value is RotationEntry[]{
  // Empty is valid — it means "nothing selected," which resolves to plain
  // tongue/no marking wherever the rotation gets read.
  return Array.isArray(value)&&value.every(isValidRotationEntry);
}
function entriesEqual(a:RotationEntry,b:RotationEntry){
  return selectionsEqual(a.articulation,b.articulation)&&isSameSyllableScheme(a.syllables,b.syllables);
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
function AccordionSection({id,title,openSection,onToggle,className,children}:{id:string;title:string;openSection:string|null;onToggle:(id:string)=>void;className?:string;children:React.ReactNode}){
  const open=openSection===id;
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
  const [openSection,setOpenSection]=useState<string|null>("articulation");
  function toggleSection(id:string){setOpenSection(current=>current===id?null:id)}
  const [tempos,setTempos]=useState<Record<string,number>>({});
  const [loaded,setLoaded]=useState(false);

  const [activeKey,setActiveKey]=useState("C");
  const rotationSignature=articulationRotation.map(e=>`${serializeArticulationSelection(e.articulation)}~${serializeSyllableScheme(e.syllables)}`).join("|");
  // Tempo is tracked per key+range only — not per articulation/rhythm
  // choice, which would otherwise fragment "how fast can I play C major"
  // into a different number every time the practice pattern changes.
  const scaleId=(key:string,range:ScaleRange)=>`scale-book:major:${key}:${range}`;
  const saveTempo=useCallback((bpm:number)=>{const id=scaleId(activeKey,range);setTempos(prev=>prev[id]===bpm?prev:{...prev,[id]:bpm})},[range,activeKey,scaleId]);
  const dialog=useRef<HTMLDialogElement>(null);
  const [customizing,setCustomizing]=useState(false);
  useEffect(()=>{if(customizing)dialog.current?.showModal()},[keys,range,newLines,order,rhythm,rotationSignature,customizing]);
  useEffect(()=>{
    try{
      const pref=JSON.parse(localStorage.getItem(preferenceKey)||"null");
      // Browser-only preferences are restored after SSR hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if(pref&&ranges.some(r=>r.id===pref.range))setRange(pref.range);
      if(pref?.order==="fifths")setOrder("fifths");
      if(typeof pref?.newLines==="boolean")setNewLines(pref.newLines);
      if(Array.isArray(pref?.keys))setKeys(allKeys.filter(k=>pref.keys.includes(k)));
      if(isValidRotation(pref?.articulationRotation))setArticulationRotation(pref.articulationRotation);
      if(pref?.rhythm==="even"||pref?.rhythm==="dottedLongShort"||pref?.rhythm==="dottedShortLong"||pref?.rhythm==="triplet")setRhythm(pref.rhythm);
      const saved=JSON.parse(localStorage.getItem(tempoKey)||"{}");
      if(saved&&typeof saved==="object")setTempos(Object.fromEntries(Object.entries(saved).filter(([id,n])=>id.startsWith("scale-book:")&&typeof n==="number"&&Number.isFinite(n)&&n>=40&&n<=220)) as Record<string,number>);
    }catch{/* Invalid browser preferences fall back to the complete chapter. */}
    setLoaded(true);
  },[]);
  useEffect(()=>{if(loaded)try{localStorage.setItem(preferenceKey,JSON.stringify({range,keys,newLines,order,articulationRotation,rhythm}));}catch{/* Storage may be disabled. */}},[range,keys,newLines,order,articulationRotation,rhythm,loaded]);
  useEffect(()=>{if(loaded)try{localStorage.setItem(tempoKey,JSON.stringify(tempos));}catch{/* Storage may be disabled. */}},[tempos,loaded]);

  const chosenRange=ranges.find(r=>r.id===range)!;
  const selected=majorKeys.filter(k=>keys.includes(k.id)).sort((a,b)=>order==="fifths"?(a.pc*7)%12-(b.pc*7)%12:a.pc-b.pc);
  const displayPitches=selected.flatMap(k=>scaleNotes(k,range).map(n=>`${n.step}${n.alter<0?"♭":n.alter>0?"♯":""}${n.octave}`));
  const measureKeyAccidentals=selected.flatMap(k=>Array.from({length:Math.ceil(scaleNotes(k,range).length/8)},()=>scaleNotes(k,range).filter(n=>n.alter).map(n=>`${n.step}${n.alter<0?"♭":"♯"}`)));
  // Syllables reset per key (own scale, own tonguing count), and each key
  // resolves against whichever rotation entry it's assigned — same
  // per-key reset displayPitches/measureKeyAccidentals already use above.
  // tongueIndex only advances on tongue/staccato notes — a slurred note
  // isn't tongued, so it doesn't consume a T/K turn.
  const syllables=selected.flatMap((k,keyIndex)=>{
    const count=scaleNotes(k,range).length;
    const entry=articulationRotation[keyIndex%articulationRotation.length]??{articulation:defaultArticulationSelection,syllables:silentSyllables};
    const pattern=resolveArticulationPattern(entry.articulation,count);
    let tongueIndex=0;
    return Array.from({length:count},(_,i)=>{
      const {mode}=resolveArticulation(pattern,i),syllable=resolveSyllable(mode,tongueIndex,entry.syllables);
      if(mode==="tongue"||mode==="staccato")tongueIndex++;
      return syllable;
    });
  });
  const changeRange=(next:ScaleRange)=>setRange(next);
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
  const customIndex=articulationRotation.findIndex(e=>e.articulation.kind==="groups");
  const customActive=customIndex>=0;
  function toggleCustom(){
    setArticulationRotation(prev=>{
      const index=prev.findIndex(e=>e.articulation.kind==="groups");
      return index>=0?prev.filter((_,i)=>i!==index):[...prev,{articulation:{kind:"groups",groups:customDraft},syllables:silentSyllables}];
    });
  }
  function editCustomGroups(update:(groups:ArticulationGroup[])=>ArticulationGroup[]){
    setCustomDraft(prevDraft=>{
      const next=update(prevDraft);
      setArticulationRotation(prevRotation=>prevRotation.map(e=>e.articulation.kind==="groups"?{...e,articulation:{kind:"groups",groups:next}}:e));
      return next;
    });
  }
  const closeOnBackdrop=(e:React.MouseEvent<HTMLDialogElement>)=>{if(e.target===e.currentTarget)dialog.current?.close()};
  if(!loaded)return null;
  return <div className="scale-reader">
    <ScoreViewer key={`${range}:${newLines}:${rhythm}:${rotationSignature}:${selected.map(k=>k.id).join(",")}`} unmetered onTempoChange={saveTempo} config={{title:zh?"大调音阶":"Major Scales",composer:"",asset:scaleBookMusicXML(selected,range,newLines,articulationRotation.map(e=>e.articulation),rhythm),displayPitches,measureKeyAccidentals,syllables,id:`scale-book-${range}-${selected.map(k=>k.id).join("-")}`,backHref:"/flute-studio/exercises",defaultTempo:tempos[scaleId(activeKey,range)]??60}}
      toolbar={<div className="scale-book__chapter-inline"><span>{zh?"大调音阶":"Major scales"} · {zh?chosenRange.zh:chosenRange.label} · {selected.length} {zh?"个调性":"keys"}</span><button className="scale-book__customize" aria-expanded={customizing} onClick={()=>{dialog.current?.showModal();setCustomizing(true)}}>{zh?"自定义":"Customize"}</button></div>}
      settings={reader=><>
    {!selected.length&&<p className="scale-book__empty">Choose keys in Customize to display your scales.</p>}
    <dialog ref={dialog} className="scale-book__panel" onClose={()=>setCustomizing(false)} onClick={closeOnBackdrop} aria-label={zh?"自定义":"Customize"}>
      <button className="scale-book__panel-close" aria-label={zh?"关闭自定义":"Close Customize"} onClick={()=>dialog.current?.close()}>×</button>
      <div className="scale-book__panel-body">
        <AccordionSection id="keys" title={zh?"调性":"Keys"} openSection={openSection} onToggle={toggleSection}>
          <div className="scale-book__key-actions"><button onClick={()=>setKeys(allKeys)}>{zh?"全部":"All keys"}</button><button onClick={()=>{setKeys([]);}}>{zh?"清除":"Clear"}</button></div>
          <div className="scale-book__keys">{majorKeys.map(k=><label key={k.id}><input type="checkbox" checked={keys.includes(k.id)} onChange={()=>toggleKey(k.id)}/><span>{k.label}</span></label>)}</div>
        </AccordionSection>
        <AccordionSection id="range" title={zh?"音域":"Range"} openSection={openSection} onToggle={toggleSection}>
          <div className="scale-book__ranges">{ranges.map(r=><label key={r.id}><input type="radio" name="scale-range" checked={range===r.id} onChange={()=>changeRange(r.id)}/><span>{zh?r.zh:r.label}{"notes" in r?` (${r.notes})`:""}</span></label>)}</div>
        </AccordionSection>
        <AccordionSection id="display" title={zh?"显示":"Display"} openSection={openSection} onToggle={toggleSection}>
          <div className="scale-book__order">{[["chromatic",zh?"半音顺序":"Chromatic"],["fifths",zh?"五度圈":"Circle of fifths"]].map(([value,label])=><label key={value}><input type="radio" name="scale-order" checked={order===value} onChange={()=>setOrder(value)}/><span>{label}</span></label>)}</div>
          <label className="scale-book__line-option"><input type="checkbox" checked={newLines} onChange={e=>setNewLines(e.target.checked)}/><span>{zh?"每个音阶另起一行":"Start each scale on a new line"}</span></label>
        </AccordionSection>
        <AccordionSection id="articulation" title={zh?"演奏法":"Articulation"} openSection={openSection} onToggle={toggleSection}>
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
        <AccordionSection id="rhythm" title={zh?"节奏型":"Rhythm"} openSection={openSection} onToggle={toggleSection}>
          <div className="scale-book__preset-grid">{rhythmChoices.map(value=><button key={value} type="button" className={rhythm===value?"scale-book__preset selected":"scale-book__preset"} aria-label={zh?rhythmLabels[value].zh:rhythmLabels[value].en} onClick={()=>setRhythm(value)}><RhythmIcon choice={value}/></button>)}</div>
        </AccordionSection>
        <AccordionSection id="tempos" title={zh?"练习速度":"Practice tempos"} openSection={openSection} onToggle={toggleSection} className="scale-book__tempos">{selected.map(k=>{
          const id=scaleId(k.id,range),tempo=tempos[id]??60;
          const setTempo=(next:number)=>{setActiveKey(k.id);setTempos(prev=>({...prev,[id]:next}));reader.setTempo(next)};
          return <div className="scale-reader__tempo" key={k.id}><span className="scale-book__tempo-label"><b>{k.label} {zh?"大调":"major"}</b><small>{zh?chosenRange.zh:chosenRange.label}</small></span><div className="scale-book__metronome"><button disabled={tempo<=40} aria-label={`${k.label}: decrease tempo by 5`} onClick={()=>setTempo(tempo-5)}>−</button><span>♩ = {tempo}</span><button disabled={tempo>=220} aria-label={`${k.label}: increase tempo by 5`} onClick={()=>setTempo(tempo+5)}>+</button><button aria-label={`${k.label}: metronome`} aria-pressed={reader.metronome&&activeKey===k.id} onClick={()=>{const stop=reader.metronome&&activeKey===k.id;setTempo(tempo);if(stop||!reader.metronome)reader.toggleMetronome()}}>♩</button></div></div>;
        })}</AccordionSection>
      </div>
    </dialog>
    </>}/>
  </div>;
}
