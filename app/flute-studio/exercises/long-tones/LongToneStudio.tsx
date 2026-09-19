"use client";
import {ScoreViewer} from "../../components/ScoreViewer";
import {ReaderPopover} from "../../components/ReaderPopover";
import {PracticeIcon,SpectrumDef} from "../../components/PracticeIcon";
import {useEffect,useState} from "react";
import {useLanguage} from "../../i18n/LanguageContext";
import {type RangePresetId,type ToneSpan,HIGHEST_MIDI,LOWEST_MIDI,OCTAVES,PITCH_CLASSES,RANGE_PRESETS,midiFor,octaveOf,pitchClassOf,heldNotesMusicXML,longToneMusicXML,noteName,patternById,toneIntervals} from "./long-tone-score";
import "../scales/scale-book.css";

/**
 * Long tones, built the way Scale Studio is: the exercise is generated
 * from a description rather than stored as a file, and the reader supplies
 * everything that is not the music itself — playback, drone, metronome,
 * per-exercise tempo, PDF.
 *
 * The settings are deliberately few, and fewer than they were. These
 * exercises carry someone else's name, so following the book is the point
 * — the range is the one thing the student genuinely has to set, because
 * it is a fact about them rather than about the exercise, and it is shared
 * by everything on the page.
 */
const preferenceKey="cookie:long-tones:preferences:v1";

export default function LongToneStudio(){
  const {lang}=useLanguage(),zh=lang==="zh";
  // Two exercises, not five: the four Moyse numbers are one exercise at
  // four spacings, so the spacing is its own control.
  const [exercise,setExercise]=useState<"held"|"sonorite">("held");
  const [patternId,setPatternId]=useState("moyse-1");
  const [rangeId,setRangeId]=useState<RangePresetId>("standard");
  const [custom,setCustom]=useState<ToneSpan>({low:60,high:96});
  const [newLines,setNewLines]=useState(false);
  // The panel is opened from the breadcrumb above the music as well as
  // from its own button, so its open state lives here rather than inside
  // the popover — and `focus` says which group to jump to when it opens.
  const [panelOpen,setPanelOpen]=useState(false);
  const [focus,setFocus]=useState<string|null>(null);
  // Which end of a custom range is being picked, if either. One picker
  // open at a time — two note grids stacked was the cramped thing.
  const [editing,setEditing]=useState<"low"|"high"|null>(null);
  function openPanel(section:string){setFocus(section);setPanelOpen(true)}
  const [loaded,setLoaded]=useState(false);

  useEffect(()=>{
    try{
      const saved=JSON.parse(localStorage.getItem(preferenceKey)||"null");
      // Browser-only preferences are restored after SSR hydration.
      /* eslint-disable react-hooks/set-state-in-effect */
      if(saved?.exercise==="held"||saved?.exercise==="sonorite")setExercise(saved.exercise);
      if(toneIntervals.some(i=>i.id===saved?.patternId))setPatternId(saved.patternId);
      if(saved?.rangeId==="custom"||RANGE_PRESETS.some(r=>r.id===saved?.rangeId))setRangeId(saved.rangeId);
      if(Number.isFinite(saved?.custom?.low)&&Number.isFinite(saved?.custom?.high))setCustom({low:saved.custom.low,high:saved.custom.high});
      if(typeof saved?.newLines==="boolean")setNewLines(saved.newLines);
      /* eslint-enable react-hooks/set-state-in-effect */
    }catch{/* Invalid browser preferences fall back to the defaults. */}
    setLoaded(true);
  },[]);
  useEffect(()=>{if(loaded)try{localStorage.setItem(preferenceKey,JSON.stringify({exercise,patternId,rangeId,custom,newLines}))}catch{/* Storage may be disabled. */}},[exercise,patternId,rangeId,custom,newLines,loaded]);

  const held=exercise==="held";
  const preset=RANGE_PRESETS.find(r=>r.id===rangeId);
  // Whichever way the two custom pickers were dragged, low is the low one.
  const span:ToneSpan=preset?{low:preset.low,high:preset.high}
    :{low:Math.min(custom.low,custom.high),high:Math.max(custom.low,custom.high)};
  const pattern=patternById(patternId);
  
  const title=held?(zh?"长音":"Held notes"):(zh?"音色练习":"De la sonorit\u00e9");

  // Scrolling has to wait for the panel to be placed (see ReaderPopover's
  // layout effect), so this runs a frame later rather than on click.
  useEffect(()=>{
    if(!panelOpen||!focus)return;
    const frame=requestAnimationFrame(()=>{
      const group=document.querySelector<HTMLElement>(`[data-tone-group="${focus}"]`);
      if(!group)return;
      group.scrollIntoView({block:"nearest"});
      group.dataset.justFocused="true";
      window.setTimeout(()=>{delete group.dataset.justFocused},900);
    });
    return()=>cancelAnimationFrame(frame);
  },[panelOpen,focus]);

  if(!loaded)return null;
  return <div className="scale-reader">
    <ScoreViewer unmetered lineBreak={{value:newLines,onChange:setNewLines}}
      config={{
        title,
        composer:"",
        asset:held?heldNotesMusicXML(span,newLines):longToneMusicXML(pattern,span,newLines),
        id:`long-tones-${held?"held":patternId}-${span.low}-${span.high}`,
        backHref:"/flute-studio/exercises",
        defaultTempo:60,
      }}
      toolbar={<div className="scale-book__chapter-inline">
        {/* Both crumbs open Customize on the group that controls them —
            the title picks the exercise, the interval picks the spacing.
            Only the CURRENT interval is shown: four buttons above the
            music was a settings panel that had escaped its panel. */}
        <button type="button" className="scale-book__crumb" onClick={()=>openPanel("exercise")}>{title}</button>
        <span aria-hidden="true">·</span>
        {held
          ?<button type="button" className="scale-book__crumb" onClick={()=>openPanel("range")}>{noteName(span.low,false)}–{noteName(span.high,false)}</button>
          :<button type="button" className="scale-book__crumb" onClick={()=>openPanel("interval")}>{zh?pattern.zhLabel:pattern.label}</button>}
      </div>}
      settings={()=><>
      <ReaderPopover open={panelOpen} onOpenChange={setPanelOpen} label={zh?"长音设置":"Long tones"} trigger={<><SpectrumDef id="tone-spectrum"/><PracticeIcon name="settings" gradient="tone-spectrum"/><span className="scale-book__scales-label">{zh?"长音":"Tones"}</span></>} className="tool has-tip scale-book__scales-trigger">
        <div className="scale-book__panel-body">
          <div data-tone-group="exercise">
          <p className="scale-book__field-label">{zh?"练习":"Exercise"}</p>
          <div className="scale-book__ranges" role="group" aria-label={zh?"练习":"Exercise"}>
            <button type="button" className={held?"scale-book__chip selected":"scale-book__chip"} aria-pressed={held} onClick={()=>setExercise("held")}>{zh?"长音":"Held notes"}</button>
            <button type="button" className={held?"scale-book__chip":"scale-book__chip selected"} aria-pressed={!held} onClick={()=>setExercise("sonorite")}>{zh?"音色练习":"De la sonorit\u00e9"}</button>
          </div>
          </div>
          {!held&&<div data-tone-group="interval">
            <p className="scale-book__field-label">{zh?"音程":"Interval"}</p>
            <div className="scale-book__ranges" role="group" aria-label={zh?"音程":"Interval"}>
              {toneIntervals.map(option=><button type="button" key={option.id} className={option.id===patternId?"scale-book__chip selected":"scale-book__chip"} aria-pressed={option.id===patternId} onClick={()=>setPatternId(option.id)}>{zh?option.zh:option.label}</button>)}
            </div>
          </div>}
          <div data-tone-group="range">
          <p className="scale-book__field-label">{zh?"音域":"Range"}</p>
          <div className="scale-book__ranges" role="group" aria-label={zh?"音域":"Range"}>
            {RANGE_PRESETS.map(option=><button type="button" key={option.id} className={rangeId===option.id?"scale-book__chip selected":"scale-book__chip"} aria-pressed={rangeId===option.id} onClick={()=>setRangeId(option.id)}>{zh?option.zh:option.label}</button>)}
            <button type="button" className={rangeId==="custom"?"scale-book__chip selected":"scale-book__chip"} aria-pressed={rangeId==="custom"} onClick={()=>setRangeId("custom")}>{zh?"自定义":"Custom"}</button>
          </div>
          {/* A note is chosen by name, not by dragging a slider through 40
              semitones and reading off where it stopped. */}
          {rangeId==="custom"&&<div className="scale-book__note-pickers">
            {([["low",zh?"最低音":"Lowest"],["high",zh?"最高音":"Highest"]] as ["low"|"high",string][]).map(([edge,label])=>{
              const value=custom[edge],isOpen=editing===edge;
              const choose=(midi:number)=>setCustom(current=>({...current,[edge]:Math.max(LOWEST_MIDI,Math.min(HIGHEST_MIDI,midi))}));
              return <div key={edge} className="scale-book__note-picker">
                <button type="button" className="scale-book__note-current" aria-expanded={isOpen} onClick={()=>setEditing(isOpen?null:edge)}>
                  <span>{label}</span><b>{noteName(value,false)}</b>
                </button>
                {isOpen&&<div className="scale-book__note-grid-wrap">
                  <label className="scale-book__octave">
                    <span>{zh?"八度":"Octave"}</span>
                    <select value={octaveOf(value)} onChange={e=>choose(midiFor(+e.target.value,pitchClassOf(value)))}>
                      {OCTAVES.map(octave=><option key={octave} value={octave}>{octave}</option>)}
                    </select>
                  </label>
                  <div className="scale-book__note-grid" role="group" aria-label={label}>
                    {PITCH_CLASSES.map(({pc,label:name})=>{
                      const midi=midiFor(octaveOf(value),pc);
                      const reachable=midi>=LOWEST_MIDI&&midi<=HIGHEST_MIDI;
                      return <button type="button" key={pc} disabled={!reachable}
                        className={pc===pitchClassOf(value)?"scale-book__chip selected":"scale-book__chip"}
                        aria-pressed={pc===pitchClassOf(value)}
                        onClick={()=>{choose(midi);setEditing(null)}}>{name}</button>;
                    })}
                  </div>
                </div>}
              </div>;
            })}
          </div>}
          </div>

        </div>
      </ReaderPopover>
      </>}/>
  </div>;
}
