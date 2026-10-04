"use client";
import {ScoreTempoMarks as ScaleTempoMarks} from "../../components/ScoreTempoMarks";
import {ScoreViewer} from "../../components/ScoreViewer";
import {DownloadIcon} from "../../components/HeaderIcons";
import {ReaderPopover} from "../../components/ReaderPopover";
import {KeySelection} from "../../components/KeySelection";
import {PracticeIcon,SpectrumDef} from "../../components/PracticeIcon";
import {useCallback,useEffect,useState} from "react";
import {useLanguage} from "../../i18n/LanguageContext";

import {keySignatureNotes,DEFAULT_SCALE_SPAN,SCALE_HIGHEST_MIDI,SCALE_LOWEST_MIDI,SCALE_OCTAVES,SCALE_PITCH_CLASSES,midiForNote,octaveOfMidi,pitchClassOfMidi,scaleNoteName,type ScaleSpan,keyForType,majorKeys,ranges,scaleBookMusicXML,scaleForms,scaleNotes,scaleTypes,typeById,type MajorKey,type ScaleBlock,type ScaleEnding,type ScaleFormId,type ScaleRange,type ScaleStart,type ScaleTypeId} from "./scale-score";

/** A minor scale is titled from its own spelling: C♯ minor, not D♭ minor. */
const titleCase=(text:string)=>text.replace(/\b[a-z]/g,letter=>letter.toUpperCase());
const keyLabelFor=(key:MajorKey,typeId:ScaleTypeId)=>keyForType(key,typeById(typeId)).label;
import {type ArticulationGroup,type ArticulationMode,type ArticulationPresetId,type ArticulationSelection,type RhythmChoice,type SyllableScheme,articulationPresetIds,articulationPresetSelection,defaultArticulationSelection,resolveArticulationPattern,resolveArticulation,resolveRhythm,resolveSyllable,selectionsEqual,isMixedArticulation,marksStaccato} from "../../components/notePatterns";
import {deleteScaleSet,describeSet,findScaleSet,readScaleSets,saveScaleSet,scaleSetsEvent,type ScaleSet,type ScaleSetConfig} from "./saved-sets";
import {AugmentationDot,Beam,BeamHook,GlyphSvg,NOTE_SPACING,Notehead,Slur,Staccato,Stem,SyllableText,Tenuto,TupletNumber,centeredStart} from "./notationGlyphs";
import "./scale-book.css";

/**
 * Named starting points. These used to be separate rows on the Exercises
 * hub, each one a link that quietly rewrote your setup; they live here
 * instead, next to the controls they change, so the hub can carry one
 * "Scale Studio" entry and the presets stay visible while you tweak them.
 * A preset in the URL still wins over whatever was last saved — an old
 * bookmark to ?preset=major-thirds should land on major thirds, not on
 * last night's setup.
 */
type ScalePreset={id:string;en:string;zh:string;types:ScaleTypeId[];forms:ScaleFormId[];range?:ScaleRange;keys?:string[]};
const presetList:readonly ScalePreset[]=[
  {id:"major-scales",en:"Major scales",zh:"大调音阶",types:["major"],forms:["scale"]},
  {id:"harmonic-minors",en:"Harmonic minors",zh:"和声小调",types:["harmonic"],forms:["scale"]},
  {id:"major-arpeggios",en:"Major arpeggios",zh:"大调琶音",types:["major"],forms:["arpeggio"]},
  {id:"major-thirds",en:"Major thirds",zh:"大调三度",types:["major"],forms:["thirds"]},
  // One chromatic preset, not one per interval: the scale and every
  // interval from seconds to octaves are the same chapter of practice, and
  // splitting them into chips would fill the list with near-identical
  // entries. It opens on one tonic — twelve transpositions of a chromatic
  // scale are the same twelve notes twelve times.
  {id:"chromatic",en:"Chromatic",zh:"半音阶",types:["chromatic"],forms:["scale","seconds","thirds","fourths","fifths","sixths","sevenths","octaves"],keys:["C"]},
];
const presets=Object.fromEntries(presetList.map(p=>[p.id,p])) as Record<string,ScalePreset>;
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
  const start=centeredStart(n);
  const mixed=isMixedArticulation(pattern);
  const notes=Array.from({length:n},(_,i)=>({x:start+i*NOTE_SPACING,mode:resolveArticulation(pattern,i).mode}));
  const slurRuns:{x1:number;x2:number}[]=[];
  let open:{x1:number;x2:number}|null=null;
  notes.forEach(note=>{
    if(note.mode==="slur"){if(open){open.x2=note.x}else{open={x1:note.x,x2:note.x};slurRuns.push(open)}}
    else open=null;
  });
  return <GlyphSvg className="scale-book__preset-icon">
    <Beam from={notes[0].x} to={notes[n-1].x}/>
    <Beam from={notes[0].x} to={notes[n-1].x} level={1}/>
    {notes.map((note,i)=><g key={i}>
      <Stem x={note.x}/>
      <Notehead x={note.x}/>
      {marksStaccato(note.mode,mixed)&&<Staccato x={note.x}/>}
      {note.mode==="tenuto"&&<Tenuto x={note.x}/>}
    </g>)}
    {/* A one-note "run" is not a slur — a slur needs something to slur to. */}
    {slurRuns.filter(run=>run.x2>run.x1).map((run,i)=><Slur key={i} from={run.x1} to={run.x2}/>)}
  </GlyphSvg>;
}

/** Same glyph language as ArticulationIcon, with T/K syllables under each note instead of a mark — triplet-grouped shows 3 notes (one full T-K-T cycle) instead of 4. */
function SyllableIcon({scheme}:{scheme:SyllableScheme}){
  const n=scheme.mode==="tripletGrouped"?3:4;
  const start=centeredStart(n);
  let tongueIndex=0;
  const letters=Array.from({length:n},()=>{const letter=resolveSyllable("tongue",tongueIndex,scheme);tongueIndex++;return letter});
  const lastX=start+(n-1)*NOTE_SPACING;
  return <GlyphSvg className="scale-book__preset-icon">
    <Beam from={start} to={lastX}/>
    <Beam from={start} to={lastX} level={1}/>
    {letters.map((letter,i)=>{const x=start+i*NOTE_SPACING;return <g key={i}>
      <Stem x={x}/>
      <Notehead x={x}/>
      <SyllableText x={x} text={letter??""}/>
    </g>;})}
  </GlyphSvg>;
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
  // Spacing is proportional to each note's value — that is what makes a
  // dotted pair read as long-then-short rather than as two notes wearing
  // different hats. The proportions are then scaled so that first-to-last
  // is the same distance in all four icons, so the set lines up instead of
  // each rhythm finding its own width.
  // Only the gaps BETWEEN notes carry width, so the last note's own value
  // is not part of what gets normalised.
  const spread=total-durations[durations.length-1].divisions;
  const scale=spread>0?((n-1)*NOTE_SPACING)/spread:0;
  const left=centeredStart(n);
  const notes=durations.map((d,index)=>({
    x:left+durations.slice(0,index).reduce((sum,earlier)=>sum+earlier.divisions,0)*scale,
    divisions:d.divisions,type:d.type,dots:d.dots,
  }));
  // Second-beam segments. A run of adjacent 16ths gets a real beam between
  // them; a lone 16th gets a hook pointing at the longer note it belongs
  // with — left for long–short (it completes the pair before it), right for
  // short–long. A full second beam under a lone 16th would misread as a run
  // of even 16ths, which is the whole distinction these icons exist to show.
  const segments:{from:number;to:number}[]=[];
  const hooks:{x:number;side:"left"|"right"}[]=[];
  notes.forEach((note,i)=>{
    if(note.type!=="16th")return;
    const prev=notes[i-1],next=notes[i+1];
    if(next&&next.type==="16th"){segments.push({from:note.x,to:next.x});return}
    if(prev&&prev.type==="16th")return; // already covered by that pair's segment
    if(prev&&prev.divisions>note.divisions)hooks.push({x:note.x,side:"left"});
    else if(next&&next.divisions>note.divisions)hooks.push({x:note.x,side:"right"});
  });
  const lastX=notes[notes.length-1].x;
  return <GlyphSvg className="scale-book__preset-icon">
    {choice==="triplet"&&<TupletNumber x={(notes[0].x+lastX)/2}/>}
    <Beam from={notes[0].x} to={lastX}/>
    {segments.map((s,i)=><Beam key={`s${i}`} from={s.from} to={s.to} level={1}/>)}
    {hooks.map((h,i)=><BeamHook key={`h${i}`} x={h.x} side={h.side}/>)}
    {notes.map((note,i)=><g key={i}>
      <Stem x={note.x}/>
      <Notehead x={note.x}/>
      {note.dots>0&&<AugmentationDot x={note.x}/>}
    </g>)}
  </GlyphSvg>;
}

/**
 * On a phone the panel is a bottom sheet, so instead of stacked sections
 * that open inside one another (and a lot of scrolling) it shows a row of
 * section tabs you swipe along, and only the chosen section below them,
 * the way photo editing on a phone lays out its tools.
 */
const PHONE_SECTIONS:{id:string;en:string;zh:string}[]=[
  {id:"presets",en:"Sets",zh:"组合"},{id:"type",en:"Type",zh:"类型"},{id:"form",en:"Form",zh:"形式"},{id:"keys",en:"Keys",zh:"调性"},
  {id:"range",en:"Range",zh:"音域"},{id:"order",en:"Layout",zh:"编排"},{id:"articulation",en:"Articulation",zh:"演奏法"},
  {id:"rhythm",en:"Rhythm",zh:"节奏"},
];

/**
 * A plain div/button accordion, not native <details>/<summary> — native
 * details fires real "toggle" events when React (re)sets its `open`
 * property during a remount, and those events land on the same onToggle
 * handler a real user click would, with no reliable way to tell them
 * apart. That's what was closing/reopening sections on their own whenever
 * a completely unrelated control elsewhere caused ScoreViewer to remount.
 * Fully React-controlled open state sidesteps the whole class of bug.
 */
function AccordionSection({id,title,openSections,onToggle,className,phoneActive,children}:{id:string;title:string;openSections:string[];onToggle:(id:string)=>void;className?:string;phoneActive?:boolean;children:React.ReactNode}){
  const open=openSections.includes(id);
  return <div data-scale-group={id} data-phone-active={phoneActive?"":undefined} className={className?`scale-book__section ${className}`:"scale-book__section"}>
    <button type="button" className="scale-book__section-summary" aria-expanded={open} onClick={()=>onToggle(id)}>
      <span className="scale-book__disclosure" aria-hidden="true">▸</span>{title}
    </button>
    {open&&<div className="scale-book__section-body">{children}</div>}
  </div>;
}


/**
 * Practice tempos written onto the music itself, one beside each
 * exercise's name.
 *
 * The Tempos panel lists every exercise in the book, which is fine for a
 * handful and unusable for sixty — long names ("C chromatic thirds") are
 * cut off, and reading a tempo means finding the right row in a list that
 * has nothing to do with where your eyes are. On the page, a tempo belongs
 * next to the scale it describes. These marks are deliberately NOT drawn
 * as notation (no ♩ = 72 metronome mark in the engraving): a practice
 * tempo is your own note-to-self, it changes week to week, and dressing it
 * as engraving would claim it is part of the music. So it gets its own
 * colour and reads as an annotation you can grab.
 *
 * Anchored by matching each block's label against the bold <words> text
 * OSMD drew for it, consumed in order so two exercises that somehow share
 * a name still take different anchors. Positions are measured against the
 * score root in the same frame the reader's own practice overlays use, and
 * re-measured on every `version` bump, since any re-engrave moves them.
 */

export default function ScaleStudio(){
  const {lang}=useLanguage(),zh=lang==="zh";
  const [range,setRange]=useState<ScaleRange>("two");
  const [customSpan,setCustomSpan]=useState<ScaleSpan>(DEFAULT_SCALE_SPAN);
  // One picker open at a time; two note grids stacked was the cramped thing.
  const [editingEdge,setEditingEdge]=useState<"low"|"high"|null>(null);
  const [order,setOrder]=useState("chromatic"),[bySignature,setBySignature]=useState(false);
  // Types and forms are both multi-select and combine as a cross product;
  // the book groups by type first, then key, then form.
  const [types,setTypes]=useState<ScaleTypeId[]>(["major"]);
  const [otherTypesOpen,setOtherTypesOpen]=useState(false);
  const [forms,setForms]=useState<ScaleFormId[]>(["scale"]);
  // Which axis the book is grouped by: "type" walks every key of one type
  // before the next type; "key" keeps one tonic together (C major, then c
  // minor, then c harmonic minor) before moving on.
  const [grouping,setGrouping]=useState("type");
  const [ending,setEnding]=useState<ScaleEnding>("hold");
  // Where a full-range scale begins — the classroom tonic shape, or
  // straight up the span from the lowest note and back.
  const [scaleStart,setScaleStart]=useState<ScaleStart>("tonic");
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
  // The one section a phone shows (see PHONE_SECTIONS); it is kept open so its body renders.
  const [phoneSection,setPhoneSection]=useState("type");
  function showPhoneSection(id:string){setPhoneSection(id);setOpenSections(current=>current.includes(id)?current:[...current,id])}
  // The header breadcrumb doubles as navigation: each segment opens
  // Customize scales on the section that controls it.
  const [customizeOpen,setCustomizeOpen]=useState(false);
  const [customizeFocus,setCustomizeFocus]=useState<{section:string}|null>(null);
  function openCustomize(section:string){setCustomizeFocus({section});setPhoneSection(section);setOpenSections(current=>current.includes(section)?current:[...current,section]);setCustomizeOpen(true)}
  useEffect(()=>{
    if(!customizeOpen||!customizeFocus)return;
    let group:HTMLElement|null=null;
    let timer=0;
    const frame=requestAnimationFrame(()=>{
      group=document.querySelector<HTMLElement>(`[data-scale-group="${customizeFocus.section}"]`);
      if(!group)return;
      // "nearest" scrolls the least it can, so a group above the fold lands
      // at the top and one below lands at the bottom — the heading appears
      // somewhere different each time you pick a breadcrumb. "start" always
      // puts the group you asked for in the same place.
      group.scrollIntoView({block:"start"});
      group.dataset.justFocused="true";
      timer=window.setTimeout(()=>{if(group)delete group.dataset.justFocused},1200);
    });
    return()=>{cancelAnimationFrame(frame);clearTimeout(timer);if(group)delete group.dataset.justFocused};
  },[customizeOpen,customizeFocus]);
  const [tempos,setTempos]=useState<Record<string,number>>({});
  // Whether practice tempos are written onto the music next to each
  // exercise, rather than only living in the Tempos list.
  const [tempoMarks,setTempoMarks]=useState(false);
  const [loaded,setLoaded]=useState(false);
  // Saved sets: named snapshots of this whole panel, listed on the
  // Exercises hub. Kept in state (not read on every render) so the hub and
  // this panel stay in step after a save or delete in either place.
  const [sets,setSets]=useState<ScaleSet[]>([]);
  const [setName,setSetName]=useState("");
  // Which set the page was opened from, if any — shown as the name to save
  // back over, so tweaking "Monday thirds" and saving updates it rather
  // than quietly spawning "Monday thirds 2".
  const [activeSet,setActiveSet]=useState<ScaleSet|null>(null);
  const [justSaved,setJustSaved]=useState("");

  // Which exercise the transport's tempo belongs to. A tempo is per
  // exercise, not per key: "C major scale" and "c harmonic minor thirds"
  // are different things to play and carry different speeds.
  const [activeBlock,setActiveBlock]=useState("");
  // Tempo is tracked per key+range only — not per articulation/rhythm
  // choice, which would otherwise fragment "how fast can I play C major"
  // into a different number every time the practice pattern changes.
  // A custom range has to be part of the identity: two different spans are
  // different exercises, and would otherwise share a tempo and a score id.
  const rangeKey=range==="custom"?`custom-${Math.min(customSpan.low,customSpan.high)}-${Math.max(customSpan.low,customSpan.high)}`:range;
  const blockTempoId=(block:ScaleBlock,range:ScaleRange)=>`scale-book:${block.type}:${block.form}:${block.key.id}:${range==="custom"?rangeKey:range}`;
  /**
   * The tempo for a block, falling back to a WIDER range of the same
   * exercise before falling back to 60.
   *
   * Ranges are ordered easiest-first, so anything you can already play
   * over three octaves at 80 you can play over one at 80 — dropping back
   * to 60 there was asking you to re-enter a tempo you had already
   * proved. The reverse does not hold, so a narrower range never lends
   * its tempo upwards.
   */
  function tempoForBlock(block:ScaleBlock,at:ScaleRange,store:Record<string,number>){
    const order=ranges.map(r=>r.id) as ScaleRange[];
    const from=order.indexOf(at);
    for(let index=from;index<order.length;index+=1){
      const stored=store[blockTempoId(block,order[index])];
      if(stored)return stored;
    }
    return 60;
  }
  const saveTempo=useCallback((bpm:number)=>{if(!activeBlock)return;setTempos(prev=>prev[activeBlock]===bpm?prev:{...prev,[activeBlock]:bpm})},[activeBlock]);

  /** Everything a saved set restores. Mirrors ScaleSetConfig field for field. */
  function currentConfig():ScaleSetConfig{
    return {range,order,bySignature,types,forms,grouping,ending,newLines,keys,articulationRotation,rhythm,scaleStart};
  }
  function applyConfig(config:ScaleSetConfig){
    if(ranges.some(r=>r.id===config.range))setRange(config.range);
    if(config.order==="chromatic"||config.order==="fifths")setOrder(config.order);
    setBySignature(config.bySignature===true||config.order==="signature");
    if(config.grouping==="type"||config.grouping==="key")setGrouping(config.grouping);
    if(config.ending==="none"||config.ending==="hold")setEnding(config.ending);
    if(config.scaleStart==="tonic"||config.scaleStart==="lowest")setScaleStart(config.scaleStart);
    if(typeof config.newLines==="boolean")setNewLines(config.newLines);
    if(Array.isArray(config.keys))setKeys(allKeys.filter(k=>config.keys.includes(k)));
    const savedTypes=Array.isArray(config.types)?scaleTypes.filter(t=>config.types.includes(t.id)).map(t=>t.id):[];
    if(savedTypes.length)setTypes(savedTypes);
    const savedForms=Array.isArray(config.forms)?scaleForms.filter(f=>config.forms.includes(f.id)).map(f=>f.id):[];
    if(savedForms.length)setForms(savedForms);
    if(isValidRotation(config.articulationRotation))setArticulationRotation(config.articulationRotation);
    if(config.rhythm==="even"||config.rhythm==="dottedLongShort"||config.rhythm==="dottedShortLong"||config.rhythm==="triplet")setRhythm(config.rhythm);
  }
  /** A preset only names the scales; it leaves articulation and rhythm alone. */
  function applyPreset(preset:ScalePreset){
    setTypes(preset.types);setForms(preset.forms);setKeys(preset.keys??allKeys);
    if(preset.range)setRange(preset.range);
    setActiveSet(null);
  }
  /**
   * Whether what is on screen right now IS one of the saved sets — compared
   * by configuration, not by which one was last opened, so the star goes
   * hollow the moment you change a key and fills again if you change it
   * back. A remembered "active set" would claim a setup is saved while it
   * no longer is.
   */
  const sameList=(a:readonly string[]=[],b:readonly string[]=[])=>a.length===b.length&&a.every(v=>b.includes(v));
  function configMatches(config:ScaleSetConfig){
    const now=currentConfig();
    return config.range===now.range&&config.order===now.order&&!!config.bySignature===now.bySignature&&config.grouping===now.grouping&&config.ending===now.ending&&config.newLines===now.newLines&&config.rhythm===now.rhythm
      &&sameList(config.types,now.types)&&sameList(config.forms,now.forms)&&sameList(config.keys,now.keys)
      &&JSON.stringify(config.articulationRotation??[])===JSON.stringify(now.articulationRotation??[]);
  }
  const savedMatch=sets.find(set=>configMatches(set.config))??null;
  function toggleSaved(){
    if(savedMatch){deleteScaleSet(savedMatch.id);if(activeSet?.id===savedMatch.id)setActiveSet(null);return}
    // Saved straight away under a name taken from the settings; the Sets
    // tab then opens with that name, so renaming is there if wanted but
    // never a step you have to take.
    commitSave();
    openCustomize("presets");
  }
  /** A separate set under a name of its own (the suggested one, numbered if it is taken). */
  function saveAsNew(){
    const taken=new Set(sets.map(set=>set.name.toLowerCase()));
    const base=suggestedSetName;let name=base;
    for(let n=2;taken.has(name.toLowerCase());n++)name=`${base} ${n}`;
    const saved=saveScaleSet(name,currentConfig());
    if(!saved)return;
    setActiveSet(saved);setSetName(saved.name);setJustSaved(saved.name);
    window.setTimeout(()=>setJustSaved(""),2400);
  }
  function commitSave(){
    const saved=saveScaleSet(setName||suggestedSetName,currentConfig());
    if(!saved)return;
    setActiveSet(saved);setSetName(saved.name);
    setJustSaved(saved.name);
    window.setTimeout(()=>setJustSaved(""),2400);
  }
  useEffect(()=>{
    try{
      const pref=JSON.parse(localStorage.getItem(preferenceKey)||"null");
      // Browser-only preferences are restored after SSR hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if(pref&&ranges.some(r=>r.id===pref.range))setRange(pref.range);
      if(pref?.order==="fifths")setOrder("fifths");
      if(pref?.bySignature===true||pref?.order==="signature")setBySignature(true);
      if(Number.isFinite(pref?.customSpan?.low)&&Number.isFinite(pref?.customSpan?.high))setCustomSpan({low:pref.customSpan.low,high:pref.customSpan.high});
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
      if(typeof pref?.tempoMarks==="boolean")setTempoMarks(pref.tempoMarks);
      const saved=JSON.parse(localStorage.getItem(tempoKey)||"{}");
      if(saved&&typeof saved==="object")setTempos(Object.fromEntries(Object.entries(saved)
        .filter(([id,n])=>id.startsWith("scale-book:")&&typeof n==="number"&&Number.isFinite(n)&&n>=40&&n<=220)
        // Tempos saved before exercises had a type and a form are all
        // major scales — the old key was scale-book:major:<key>:<range>.
        // Re-point them at the new five-part id instead of dropping them.
        .map(([id,n])=>{const parts=id.split(":");return parts.length===4?[`scale-book:${parts[1]}:scale:${parts[2]}:${parts[3]}`,n] as const:[id,n] as const})
      ) as Record<string,number>);
    }catch{/* Invalid browser preferences fall back to the complete chapter. */}
    const params=new URLSearchParams(location.search);
    setSets(readScaleSets());
    // A ?set= link is the most specific intent there is, so it outranks both
    // the saved preferences above and any ?preset= alongside it.
    const saved=findScaleSet(params.get("set")??"");
    if(saved){applyConfig(saved.config);setActiveSet(saved);setSetName(saved.name)}
    else{
      const preset=presets[params.get("preset")??""];
      if(preset)applyPreset(preset);
      else{
        const key=params.get("key"),type=params.get("type");
        if(key&&type&&majorKeys.some(k=>k.id===key)&&scaleTypes.some(t=>t.id===type)){
          setKeys([key]);setTypes([type as ScaleTypeId]);setForms([params.get("form")==="arpeggio"?"arpeggio":"scale"]);
        }
      }
    }
    setLoaded(true);
  },[]);
  useEffect(()=>{
    const sync=()=>setSets(readScaleSets());
    window.addEventListener(scaleSetsEvent,sync);
    window.addEventListener("storage",sync);
    return()=>{window.removeEventListener(scaleSetsEvent,sync);window.removeEventListener("storage",sync)};
  },[]);
  useEffect(()=>{if(loaded)try{localStorage.setItem(preferenceKey,JSON.stringify({range,customSpan,keys,newLines,order,bySignature,grouping,ending,types,forms,articulationRotation,rhythm,tempoMarks}));}catch{/* Storage may be disabled. */}},[range,keys,newLines,order,grouping,ending,types,forms,articulationRotation,rhythm,tempoMarks,loaded]);
  useEffect(()=>{if(loaded)try{localStorage.setItem(tempoKey,JSON.stringify(tempos));}catch{/* Storage may be disabled. */}},[tempos,loaded]);

  const chosenRange=ranges.find(r=>r.id===range)!;
  const selected=majorKeys.filter(k=>keys.includes(k.id)).sort((a,b)=>order==="fifths"?(a.pc*7)%12-(b.pc*7)%12:a.pc-b.pc);
  // Type is the outermost loop ("all the major ones, then all the minor
  // ones"), then key, then form — so one key's scale and its thirds sit
  // next to each other rather than a page apart.
  const chosenTypes=scaleTypes.filter(t=>types.includes(t.id));
  const chosenForms=scaleForms.filter(f=>forms.includes(f.id));
  const showForm=chosenForms.length>1||chosenForms[0]?.id!=="scale";
  // `english` forces the Latin labels regardless of the interface language:
  // the PDF is written with jsPDF's built-in fonts, which have no Chinese
  // glyphs at all, so a Chinese book is printed from an English copy.
  const blockFor=(key:MajorKey,type:typeof chosenTypes[number],form:typeof chosenForms[number],english=false):ScaleBlock=>({
    key,type:type.id,form:form.id,
    label:`${keyLabelFor(key,type.id)} ${zh&&!english?type.zh:titleCase(type.label)}${showForm?` ${type.id.endsWith("Pentatonic")&&["seconds","thirds","fourths","fifths","sixths","sevenths"].includes(form.id)?(zh&&!english?"音级组合":{seconds:"neighbor steps",thirds:"skip one",fourths:"skip two",fifths:"skip three",sixths:"skip four",sevenths:"skip five"}[form.id as "seconds"|"thirds"|"fourths"|"fifths"|"sixths"|"sevenths"]):(zh&&!english?form.zh:form.label.toLowerCase())}`:""}`,
  });
  // "Key signature" arrangement: one list for every key and type, kept in signature order. Scales sharing a signature (G major, E minor, A dorian) sit side by side, major first, then by how far the tonic is above it.
  const signatureBlocks=(english:boolean)=>chosenTypes.flatMap(type=>selected.flatMap(key=>chosenForms.map(form=>{
    const fifths=keyForType(key,type).fifths,majorPc=((fifths*7)%12+12)%12;
    // Circle of fifths: fewest sharps and flats first. Chromatic: by the signature's major key (C, D♭, D…).
    return {block:blockFor(key,type,form,english),rank:[...(order==="fifths"?[Math.abs(fifths),fifths<0?1:0]:[majorPc,0]),((key.pc-majorPc)%12+12)%12,scaleTypes.indexOf(type),scaleForms.indexOf(form)]};
  }))).sort((a,b)=>{for(let i=0;i<a.rank.length;i++)if(a.rank[i]!==b.rank[i])return a.rank[i]-b.rank[i];return 0}).map(item=>item.block);
  const buildBlocks=(english=false):ScaleBlock[]=>bySignature?signatureBlocks(english):grouping==="key"
    ?selected.flatMap(key=>chosenTypes.flatMap(type=>chosenForms.map(form=>blockFor(key,type,form,english))))
    :chosenTypes.flatMap(type=>selected.flatMap(key=>chosenForms.map(form=>blockFor(key,type,form,english))));
  const blocks:ScaleBlock[]=buildBlocks();
  // Must pass `scaleStart` too: the practice overlays (note names,
  // accidentals, syllables) index straight into this array, so if it is
  // built from a different path than the engraved music they describe the
  // wrong notes — switching between tonic and lowest left every accidental
  // label attached to the note it used to sit on.
  // Must take the same span as the asset: the overlays index straight into
  // this array, so generating it from a different note set puts every note
  // name and accidental on the wrong note.
  const blockNotes=(block:ScaleBlock)=>scaleNotes(block.key,range,block.type,block.form,ending,scaleStart,customSpan);
  // A double sharp is not a sharp. Collapsing ±2 onto the single-accidental
  // glyph made the overlay print ♯ over an F𝄪, which says the wrong note.
  const accidentalGlyph=(alter:number)=>alter===-2?"𝄫":alter===-1?"♭":alter===1?"♯":alter===2?"𝄪":"";
  const displayPitches=blocks.flatMap(b=>blockNotes(b).map(n=>`${n.step}${accidentalGlyph(n.alter)}${n.octave}`));
  // The index of each block's first note in the flat event list the score
  // is built from — the same indexing displayPitches and syllables use, so
  // "play this scale" is just "play from this index".
  const blockEventStarts=blocks.reduce<number[]>((starts,block)=>[...starts,starts[starts.length-1]+blockNotes(block).length],[0]);
  // What the key signature alters, straight from the fifths the score
  // prints — not from which notes in the scale happen to carry an
  // accidental, which counted a harmonic minor's raised seventh as part of
  // the signature and missed signature notes the exercise never reached.
  const blockKeySignature=(b:ScaleBlock)=>keySignatureNotes(keyForType(b.key,typeById(b.type)).fifths);
  // One entry per note, built from the very same blockNotes() array that
  // displayPitches uses — so the two cannot fall out of step, and nothing
  // has to work out how many measures an exercise occupies.
  const noteKeySignatures=blocks.flatMap(b=>blockNotes(b).map(()=>blockKeySignature(b)));
  // Syllables reset per key (own scale, own tonguing count), and each key
  // resolves against whichever rotation entry it's assigned — same
  // per-key reset displayPitches/noteKeySignatures already use above.
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
  const bookTitle=zh?`${typeWord}${formWord}`:titleCase(`${typeWord} ${formWord}`);
  // The same title built in English, for the PDF.
  const englishFormWord=soleForm?(soleForm.id==="scale"?"scales":soleForm.label.toLowerCase().replace(/([^s])$/,"$1s")):"mixed forms";
  const englishTypeWord=chosenTypes.length===1?chosenTypes[0].label
    :chosenTypes.length===2?`${chosenTypes[0].label} & ${chosenTypes[1].label.toLowerCase()}`
    :`${chosenTypes.length} scale types`;
  const englishTitle=titleCase(`${englishTypeWord} ${englishFormWord}`);
  // What the name field offers when you have not typed one: the same
  // phrase the book is titled with, plus how many keys it covers, so an
  // unnamed save still reads as something ("Major scales · 12 keys")
  // rather than "Untitled set 3".
  const suggestedSetName=`${bookTitle}${selected.length<majorKeys.length?` · ${selected.length} ${zh?"个调":selected.length===1?"key":"keys"}`:""}`;
  const changeRange=(next:ScaleRange)=>setRange(next);
  const toggleFrom=<T,>(list:T[],value:T,setList:(next:T[])=>void)=>{
    // Never empty: unticking the last one would render a blank book, so the
    // last remaining selection stays put.
    const next=list.includes(value)?list.filter(v=>v!==value):[...list,value];
    if(next.length)setList(next);
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
  /**
   * Which preset chip reads as "on". Derived from what is actually set
   * right now rather than remembered from the last click, so opening
   * Customize scales on a book that happens to be twelve major scales
   * shows "Major scales" lit — and tweaking a key or a form afterwards
   * turns it back off, since the book is no longer that preset.
   */
  const sameSet=(a:readonly string[],b:readonly string[])=>a.length===b.length&&a.every(v=>b.includes(v));
  const presetActive=(preset:ScalePreset)=>sameSet(preset.types,types)&&sameSet(preset.forms,forms)&&sameSet(preset.keys??allKeys,keys)&&(!preset.range||preset.range===range);
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
    <ScoreViewer unmetered onTempoChange={saveTempo}
      /* Scales are runs of sixteenths, so they want to sit closer together
         than the exercise-book default assumes — that default is set for
         held notes. Tighter spacing also lets most scales finish on one
         line instead of spilling a short second line. One move of the
         Note spacing slider overrides it, and the choice is remembered. */
      defaultNoteSpacing={0.55} extraSystemSpacing={tempoMarks?3:0} practiceTempo={{value:tempoMarks,onChange:setTempoMarks}}
      save={{saved:!!savedMatch,onToggle:toggleSaved,label:zh?"保存为我的组合":"Save as a set",savedLabel:zh?"已保存为组合，点按移除":"Saved as a set. Tap to remove"}}
      headerActions={reader=><button type="button" className="icon-btn has-tip" disabled={reader.exporting} data-tip={reader.exporting?(zh?"正在生成 PDF…":"Making the PDF\u2026"):(zh?"下载 PDF":"Download PDF")} aria-label={reader.exporting?(zh?"正在生成 PDF…":"Making the PDF\u2026"):(zh?"下载 PDF":"Download PDF")} onClick={()=>reader.download()}>{reader.exporting?"\u22ef":<DownloadIcon/>}</button>}
      scoreMarks={tempoMarks?context=><ScaleTempoMarks root={context.root} version={context.version} marks={blocks.map(block=>{const id=blockTempoId(block,range);return {id,label:block.label,tempo:tempoForBlock(block,range,tempos)}})} onChange={(id,next)=>{setActiveBlock(id);setTempos(prev=>({...prev,[id]:next}));context.controls.setTempo(next)}} soundingId={context.controls.metronome?activeBlock||null:null} onSound={(id,tempo)=>{const running=context.controls.metronome&&activeBlock===id;setActiveBlock(id);context.controls.setTempo(tempo);if(running||!context.controls.metronome)context.controls.toggleMetronome()}}/>:undefined} printConfig={zh?{title:englishTitle,asset:scaleBookMusicXML(buildBlocks(true),range,newLines,articulationRotation.map(e=>e.articulation),rhythm,ending,scaleStart,customSpan)}:undefined} lineBreak={{value:newLines,onChange:setNewLines}} config={{title:bookTitle,composer:"",smartDroneCountInBeats:4,smartDrone:blocks.map((block,index)=>{const tonic=keyForType(block.key,typeById(block.type));const written=blockNotes(block).find(note=>note.midi%12===tonic.pc);return {measure:1,event:blockEventStarts[index],pitch:tonic.label[0].toUpperCase()+tonic.label.slice(1)+String(written?.octave??4),...(written?{displayPitch:`${written.step}${accidentalGlyph(written.alter)}${written.octave}`}:{})}}),asset:scaleBookMusicXML(blocks,range,newLines,articulationRotation.map(e=>e.articulation),rhythm,ending,scaleStart,customSpan),displayPitches,noteKeySignatures,syllables,id:`scale-book-${rangeKey}-${grouping}-${ending}-${scaleStart}-${types.join("+")}-${forms.join("+")}-${selected.map(k=>k.id).join("-")}`,backHref:"/flute-studio/exercises",defaultTempo:(activeBlock?tempos[activeBlock]:undefined)??60}}
      toolbar={<div className="scale-book__chapter-inline"><button type="button" className="scale-book__crumb has-tip" data-tip={zh?"点击自定义":"Click to customize"} onClick={()=>openCustomize("type")}>{typeWord}</button><button type="button" className="scale-book__crumb has-tip" data-tip={zh?"点击自定义":"Click to customize"} onClick={()=>openCustomize("form")}>{formWord}</button><span aria-hidden="true">·</span><button type="button" className="scale-book__crumb has-tip" data-tip={zh?"点击自定义":"Click to customize"} onClick={()=>openCustomize("range")}>{zh?chosenRange.zh:chosenRange.label}</button><span aria-hidden="true">·</span><button type="button" className="scale-book__crumb has-tip" data-tip={zh?"点击自定义":"Click to customize"} onClick={()=>openCustomize("keys")}>{selected.length} {zh?"个调性":selected.length===1?"key":"keys"}</button></div>}
      settings={reader=><>

    <ReaderPopover open={customizeOpen} onOpenChange={setCustomizeOpen} label={zh?"自定义音阶":"Customize scales"} trigger={<><SpectrumDef id="studio-spectrum"/><PracticeIcon name="settings" gradient="studio-spectrum"/><span className="scale-book__scales-label">{zh?"音阶":"Scales"}</span></>} className="tool has-tip scale-book__scales-trigger">
      <div className="scale-book__panel-body">
        <div className="scale-book__phone-tabs" role="tablist" aria-label={zh?"设置分类":"Settings sections"}>
          {PHONE_SECTIONS.map(section=><button type="button" role="tab" key={section.id} aria-selected={phoneSection===section.id} onClick={()=>showPhoneSection(section.id)}>{zh?section.zh:section.en}</button>)}
        </div>
        <AccordionSection id="presets" phoneActive={phoneSection==="presets"} title={zh?"预设与我的组合":"Presets & saved sets"} openSections={openSections} onToggle={toggleSection}>
          <p className="scale-book__field-label">{zh?"从预设开始":"Start from a preset"}</p>
          <div className="scale-book__ranges" role="group" aria-label={zh?"预设":"Presets"}>{presetList.map(preset=><button type="button" key={preset.id} className={presetActive(preset)?"scale-book__chip selected":"scale-book__chip"} aria-pressed={presetActive(preset)} onClick={()=>applyPreset(preset)}>{zh?preset.zh:preset.en}</button>)}</div>
          <p className="scale-book__field-label">{zh?"我保存的组合":"My saved sets"}</p>
          {sets.length
            ?<ul className="scale-book__sets">{sets.map(set=><li key={set.id} className={activeSet?.id===set.id?"scale-book__set is-active":"scale-book__set"}>
              <button type="button" className="scale-book__set-open" onClick={()=>{applyConfig(set.config);setActiveSet(set);setSetName(set.name)}}>
                <b>{set.name}</b><small>{describeSet(set.config,zh)}</small>
              </button>
              <button type="button" className="scale-book__set-delete" aria-label={zh?`删除 ${set.name}`:`Delete ${set.name}`} onClick={()=>{deleteScaleSet(set.id);if(activeSet?.id===set.id)setActiveSet(null)}}>×</button>
            </li>)}</ul>
            :<p className="scale-book__sets-empty">{zh?"还没有保存的组合。点顶部的 +，就能保存现在这组音阶，它会出现在练习页面。":"No saved sets yet. Tap + at the top to save the scales on screen. Saved sets also show on the Exercises page."}</p>}
          {/* Saving sits with the saved sets it adds to. */}
          <div className="scale-book__save">
            <label className="scale-book__save-field">
              <span>{zh?"组合名称":"Set name"}</span>
              <input value={setName} placeholder={suggestedSetName} aria-label={zh?"组合名称":"Set name"} onChange={e=>setSetName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();commitSave()}}}/>
            </label>
            <button type="button" className="scale-book__save-button" onClick={commitSave}>{activeSet&&activeSet.name===setName.trim()?(zh?"更新":"Update"):(zh?"保存":"Save")}</button>
            {/* Update overwrites the set you opened; once the settings have moved away from it, Save new keeps both. */}
            {activeSet&&activeSet.name===setName.trim()&&!configMatches(activeSet.config)&&<button type="button" className="scale-book__save-button scale-book__save-new" onClick={saveAsNew}>{zh?"另存":"Save new"}</button>}
          </div>
          {justSaved&&<p className="scale-book__save-note" role="status">{zh?`已保存“${justSaved}”，可在练习页面找到。`:`Saved as \u201c${justSaved}\u201d. It is on the Exercises page, and you can rename it here.`}</p>}
        </AccordionSection>
        <AccordionSection id="type" phoneActive={phoneSection==="type"} title={zh?"音阶类型":"Scale type"} openSections={openSections} onToggle={toggleSection}>
          <div className="scale-book__ranges" role="group" aria-label={zh?"音阶类型":"Scale type"}>{scaleTypes.slice(0,8).map(t=><button type="button" key={t.id} className={types.includes(t.id)?"scale-book__chip selected":"scale-book__chip"} aria-pressed={types.includes(t.id)} onClick={()=>toggleFrom(types,t.id,setTypes)}>{zh?t.zh:t.label}</button>)}</div>
          <button type="button" className="scale-book__others-toggle" aria-expanded={otherTypesOpen} onClick={()=>setOtherTypesOpen(open=>!open)}>{zh?"其他":"Others"}{types.some(id=>scaleTypes.slice(8).some(type=>type.id===id))&&<span>{types.filter(id=>scaleTypes.slice(8).some(type=>type.id===id)).length}</span>}<span aria-hidden="true">{otherTypesOpen?"⌄":"›"}</span></button>
          {otherTypesOpen&&<><div className="scale-book__ranges scale-book__other-types" role="group" aria-label={zh?"其他音阶类型":"Other scale types"}>{scaleTypes.slice(8).map(t=><button type="button" key={t.id} className={types.includes(t.id)?"scale-book__chip selected":"scale-book__chip"} aria-pressed={types.includes(t.id)} onClick={()=>toggleFrom(types,t.id,setTypes)}>{zh?t.zh:t.label}</button>)}</div></>}
        </AccordionSection>
        <AccordionSection id="form" phoneActive={phoneSection==="form"} title={zh?"练习形式":"Form"} openSections={openSections} onToggle={toggleSection}>
          <div className="scale-book__ranges" role="group" aria-label={zh?"练习形式":"Form"}>{scaleForms.map(f=><button type="button" key={f.id} className={forms.includes(f.id)?"scale-book__chip selected":"scale-book__chip"} aria-pressed={forms.includes(f.id)} onClick={()=>toggleFrom(forms,f.id,setForms)}>{zh?f.zh:f.label}</button>)}</div>
</AccordionSection>
        <AccordionSection id="keys" phoneActive={phoneSection==="keys"} title={zh?"调性":"Keys"} openSections={openSections} onToggle={toggleSection}>
          <KeySelection options={majorKeys} selected={keys} onChange={setKeys} zh={zh}/>
        </AccordionSection>
        <AccordionSection id="range" phoneActive={phoneSection==="range"} title={zh?"音域":"Range"} openSections={openSections} onToggle={toggleSection}>
          <div className="scale-book__ranges" role="group" aria-label={zh?"音域":"Range"}>{ranges.map(r=><button type="button" key={r.id} className={range===r.id?"scale-book__chip selected":"scale-book__chip"} aria-pressed={range===r.id} onClick={()=>changeRange(r.id)}>{zh?r.zh:r.label}{"notes" in r&&<small>{r.notes}</small>}</button>)}</div>
          {range==="custom"&&<div className="scale-book__note-pickers">
            {([["low",zh?"最低音":"Lowest"],["high",zh?"最高音":"Highest"]] as ["low"|"high",string][]).map(([edge,label])=>{
              const value=customSpan[edge],isOpen=editingEdge===edge;
              const choose=(midi:number)=>setCustomSpan(current=>({...current,[edge]:Math.max(SCALE_LOWEST_MIDI,Math.min(SCALE_HIGHEST_MIDI,midi))}));
              return <div key={edge} className="scale-book__note-picker">
                <button type="button" className="scale-book__note-current" aria-expanded={isOpen} onClick={()=>setEditingEdge(isOpen?null:edge)}>
                  <span>{label}</span><b>{scaleNoteName(value)}</b>
                </button>
                {isOpen&&<div className="scale-book__note-grid-wrap">
                  <label className="scale-book__octave">
                    <span>{zh?"八度":"Octave"}</span>
                    <select value={octaveOfMidi(value)} onChange={e=>choose(midiForNote(+e.target.value,pitchClassOfMidi(value)))}>
                      {SCALE_OCTAVES.map(octave=><option key={octave} value={octave}>{octave}</option>)}
                    </select>
                  </label>
                  <div className="scale-book__note-grid" role="group" aria-label={label}>
                    {SCALE_PITCH_CLASSES.map(({pc,label:name})=>{
                      const midi=midiForNote(octaveOfMidi(value),pc);
                      const reachable=midi>=SCALE_LOWEST_MIDI&&midi<=SCALE_HIGHEST_MIDI;
                      return <button type="button" key={pc} disabled={!reachable}
                        className={pc===pitchClassOfMidi(value)?"scale-book__chip selected":"scale-book__chip"}
                        aria-pressed={pc===pitchClassOfMidi(value)}
                        onClick={()=>{choose(midi);setEditingEdge(null)}}>{name}</button>;
                    })}
                  </div>
                </div>}
              </div>;
            })}
          </div>}
        </AccordionSection>
        <AccordionSection id="order" phoneActive={phoneSection==="order"} title={zh?"编排":"Layout"} openSections={openSections} onToggle={toggleSection}>
          <p className="scale-book__field-label">{zh?"排列方式":"Arrange by"}</p>
          <div className="scale-book__ranges scale-book__ranges--three" role="group" aria-label={zh?"排列方式":"Arrange by"}>{([["type",zh?"音阶类型":"Scale type"],["tonic",zh?"同主音":"Same tonic"],["signature",zh?"调号":"Key signature"]] as const).map(([value,label])=>{
            const current=bySignature?"signature":grouping==="key"?"tonic":"type";
            return <button type="button" key={value} className={current===value?"scale-book__chip selected":"scale-book__chip"} aria-pressed={current===value} onClick={()=>{setBySignature(value==="signature");if(value!=="signature")setGrouping(value==="tonic"?"key":"type")}}>{label}</button>})}</div>
          <><p className="scale-book__field-label">{zh?"调性顺序":"Key order"}</p>
          <div className="scale-book__ranges" role="group" aria-label={zh?"调性顺序":"Key order"}>{[["chromatic",zh?"半音顺序":"Chromatic"],["fifths",zh?"五度圈":"Circle of fifths"]].map(([value,label])=><button type="button" key={value} className={order===value?"scale-book__chip selected":"scale-book__chip"} aria-pressed={order===value} onClick={()=>setOrder(value)}>{label}</button>)}</div></>
          <p className="scale-book__field-label">{zh?"换行":"Line breaks"}</p>
          <div className="scale-book__ranges" role="group" aria-label={zh?"换行":"Line breaks"}>{([[false,zh?"接续上一个":"Continue"],[true,zh?"另起一行":"New line"]] as [boolean,string][]).map(([value,label])=><button type="button" key={String(value)} className={newLines===value?"scale-book__chip selected":"scale-book__chip"} aria-pressed={newLines===value} onClick={()=>setNewLines(value)}>{label}</button>)}</div>

                  <p className="scale-book__field-label">{zh?"起始音":"Starts on"}</p>
          <div className="scale-book__ranges" role="group" aria-label={zh?"起始音":"Starts on"}>{([["tonic",zh?"主音":"The tonic"],["lowest",zh?"最低音":"The lowest note"]] as [ScaleStart,string][]).map(([value,label])=><button type="button" key={value} className={scaleStart===value?"scale-book__chip selected":"scale-book__chip"} aria-pressed={scaleStart===value} onClick={()=>setScaleStart(value)}>{label}</button>)}</div>
          <p className="scale-book__field-label">{zh?"结尾":"Ending"}</p>
          <div className="scale-book__ranges" role="group" aria-label={zh?"结尾":"Ending"}>{([["none",zh?"直接反复":"Straight"],["hold",zh?"主音延长":"Hold the tonic"]] as [ScaleEnding,string][]).map(([value,label])=><button type="button" key={value} className={ending===value?"scale-book__chip selected":"scale-book__chip"} aria-pressed={ending===value} onClick={()=>setEnding(value)}>{label}</button>)}</div>
        </AccordionSection>
        <AccordionSection id="articulation" phoneActive={phoneSection==="articulation"} title={zh?"演奏法":"Articulation"} openSections={openSections} onToggle={toggleSection}>
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
        <AccordionSection id="rhythm" phoneActive={phoneSection==="rhythm"} title={zh?"节奏型":"Rhythm"} openSections={openSections} onToggle={toggleSection}>
          <div className="scale-book__preset-grid">{rhythmChoices.map(value=><button key={value} type="button" className={rhythm===value?"scale-book__preset selected":"scale-book__preset"} aria-label={zh?rhythmLabels[value].zh:rhythmLabels[value].en} onClick={()=>setRhythm(value)}><RhythmIcon choice={value}/></button>)}</div>
        </AccordionSection>
      </div>
      <button className="reader-settings-reset" onClick={()=>{setActiveSet(null);setSetName("");setKeys(allKeys);setRange("two");setOrder("chromatic");setBySignature(false);setGrouping("type");setEnding("hold");setTypes(["major"]);setForms(["scale"]);setNewLines(false);setArticulationRotation([]);setCustomDraft([{size:4,mode:"tongue"}]);setRhythm("even")}}>{zh?"恢复默认":"Restore defaults"}</button>
    </ReaderPopover>
    {/* Tempos is its own button rather than the last section of Customize
        scales. A tempo is something you reach for mid-practice, between
        run-throughs — burying it under an accordion inside the panel that
        rebuilds the whole exercise meant opening a settings dialog to nudge
        a number by five. It renders after the Scales popover, so it lands
        between Scales and View settings in the toolbar. */}
    <ReaderPopover label={zh?"练习速度":"Tempos"} trigger={<><PracticeIcon name="tempo"/>{zh?"速度":"Tempos"}</>} className="tool has-tip">
      <div className="scale-book__tempo-list">{blocks.map((block,index)=>{
          const id=blockTempoId(block,range),tempo=tempoForBlock(block,range,tempos),name=block.label;
          const setTempo=(next:number)=>{setActiveBlock(id);setTempos(prev=>({...prev,[id]:next}));reader.setTempo(next)};
          const running=reader.metronome&&activeBlock===id;
          // Play starts the score at this exercise's first note and, like
          // the transport, the same button stops it.
          const eventStart=blockEventStarts[index];
          // Which exercise is sounding follows the music, not the button
          // that started it: pressing the transport's own Play used to
          // leave the very first row lit for the whole book.
          const blockEnd=blockEventStarts[index+1]??Infinity;
          // playingFrom only stands in for the frame before the first note
          // actually sounds; once there is a live position it is the only
          // thing that counts, or the row you started from stays lit for
          // the rest of the book.
          const sounding=reader.playing&&(reader.playingEvent!==null?reader.playingEvent>=eventStart&&reader.playingEvent<blockEnd:reader.playingFrom===eventStart);
          return <div className="scale-reader__tempo" key={id}><span className="scale-book__tempo-label"><b>{name}</b></span><div className="scale-book__metronome"><button disabled={tempo<=40} aria-label={`${name}: decrease tempo by 5`} onClick={()=>setTempo(tempo-5)}>−</button><label className="scale-book__tempo-field"><input type="number" min={40} max={220} aria-label={`${name}: tempo in BPM`} value={tempoDraft?.id===id?tempoDraft.value:tempo} onChange={e=>setTempoDraft({id,value:e.target.value})} onFocus={()=>setActiveBlock(id)} onBlur={()=>{if(tempoDraft?.id!==id)return;const next=Number(tempoDraft.value);const valid=Number.isFinite(next)&&tempoDraft.value.trim()!=="";setTempoDraft(null);if(valid)setTempo(Math.max(40,Math.min(220,Math.round(next))))}} onKeyDown={e=>{if(e.key==="Enter")e.currentTarget.blur()}}/></label><button disabled={tempo>=220} aria-label={`${name}: increase tempo by 5`} onClick={()=>setTempo(tempo+5)}>+</button><button className={sounding?"scale-book__row-tool on":"scale-book__row-tool"} aria-label={sounding?`${name}: stop playing`:`${name}: play from here`} aria-pressed={sounding} onClick={()=>{setTempo(tempo);reader.playFromEvent(eventStart)}}><PracticeIcon name={sounding?"stop":"play"}/></button><button className={running?"scale-book__row-tool on":"scale-book__row-tool"} aria-label={running?`${name}: stop metronome`:`${name}: start metronome`} aria-pressed={running} onClick={()=>{setTempo(tempo);if(running||!reader.metronome)reader.toggleMetronome()}}><PracticeIcon name="metronome"/></button></div></div>;
      })}</div>
      {/* A quiet text action in the corner rather than a full-width chip:
          it is a view preference, not one of the tempos this panel is
          actually about — the same reasoning (and the same styling) as
          "Restore defaults" at the foot of Customize scales. */}
      <button type="button" className="reader-settings-reset" aria-pressed={tempoMarks} onClick={()=>setTempoMarks(value=>!value)}>{tempoMarks?(zh?"隐藏乐谱上的练习速度":"Hide practice tempo on the page"):(zh?"在乐谱上显示练习速度":"Show practice tempo on the page")}</button>
    </ReaderPopover>
    </>}/>
  </div>;
}
