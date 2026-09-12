"use client";
import {ScoreViewer} from "../../components/ScoreViewer";
import {useCallback,useEffect,useRef,useState} from "react";
import {useLanguage} from "../../i18n/LanguageContext";

import {majorKeys,ranges,scaleBookMusicXML,scaleNotes,type ScaleRange} from "./scale-score";
import "./scale-book.css";

const preferenceKey="cookie:scale-book:preferences:v1";
const tempoKey="cookie:scale-book:tempos:v1";
const allKeys=majorKeys.map(k=>k.id) as string[];
const scaleId=(key:string,range:ScaleRange)=>`scale-book:major:${key}:${range}:sixteenths:plain`;

export default function ScaleStudio(){
  const {lang}=useLanguage(),zh=lang==="zh";
  const [range,setRange]=useState<ScaleRange>("two");
  const [order,setOrder]=useState("chromatic");
  const [newLines,setNewLines]=useState(false);
  const [keys,setKeys]=useState<string[]>(allKeys);
  const [tempos,setTempos]=useState<Record<string,number>>({});
  const [loaded,setLoaded]=useState(false);

  const [activeKey,setActiveKey]=useState("C");
  const saveTempo=useCallback((bpm:number)=>{const id=scaleId(activeKey,range);setTempos(prev=>prev[id]===bpm?prev:{...prev,[id]:bpm})},[range,activeKey]);
  const dialog=useRef<HTMLDialogElement>(null);
  const [customizing,setCustomizing]=useState(false);
  useEffect(()=>{if(customizing)dialog.current?.showModal()},[keys,range,newLines,order,customizing]);
  useEffect(()=>{
    try{
      const pref=JSON.parse(localStorage.getItem(preferenceKey)||"null");
      // Browser-only preferences are restored after SSR hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if(pref&&ranges.some(r=>r.id===pref.range))setRange(pref.range);
      if(pref?.order==="fifths")setOrder("fifths");
      if(typeof pref?.newLines==="boolean")setNewLines(pref.newLines);
      if(Array.isArray(pref?.keys))setKeys(allKeys.filter(k=>pref.keys.includes(k)));
      const saved=JSON.parse(localStorage.getItem(tempoKey)||"{}");
      if(saved&&typeof saved==="object")setTempos(Object.fromEntries(Object.entries(saved).filter(([id,n])=>id.startsWith("scale-book:")&&typeof n==="number"&&Number.isFinite(n)&&n>=40&&n<=220)) as Record<string,number>);
    }catch{/* Invalid browser preferences fall back to the complete chapter. */}
    setLoaded(true);
  },[]);
  useEffect(()=>{if(loaded)try{localStorage.setItem(preferenceKey,JSON.stringify({range,keys,newLines,order}));}catch{/* Storage may be disabled. */}},[range,keys,newLines,order,loaded]);
  useEffect(()=>{if(loaded)try{localStorage.setItem(tempoKey,JSON.stringify(tempos));}catch{/* Storage may be disabled. */}},[tempos,loaded]);

  const chosenRange=ranges.find(r=>r.id===range)!;
  const selected=majorKeys.filter(k=>keys.includes(k.id)).sort((a,b)=>order==="fifths"?(a.pc*7)%12-(b.pc*7)%12:a.pc-b.pc);
  const displayPitches=selected.flatMap(k=>scaleNotes(k,range).map(n=>`${n.step}${n.alter<0?"♭":n.alter>0?"♯":""}${n.octave}`));
  const measureKeyAccidentals=selected.flatMap(k=>Array.from({length:Math.ceil(scaleNotes(k,range).length/8)},()=>scaleNotes(k,range).filter(n=>n.alter).map(n=>`${n.step}${n.alter<0?"♭":"♯"}`)));
  const changeRange=(next:ScaleRange)=>setRange(next);
  const toggleKey=(key:string)=>{
    setKeys(prev=>prev.includes(key)?prev.filter(k=>k!==key):[...prev,key]);
  };
  if(!loaded)return null;
  return <div className="scale-reader">
    <ScoreViewer key={`${range}:${newLines}:${selected.map(k=>k.id).join(",")}`} unmetered onTempoChange={saveTempo} config={{title:"Scale Studio",composer:"",asset:scaleBookMusicXML(selected,range,newLines),displayPitches,measureKeyAccidentals,id:`scale-book-${range}-${selected.map(k=>k.id).join("-")}`,backHref:"/flute-studio/exercises",defaultTempo:tempos[scaleId(activeKey,range)]??60}} settings={reader=><>
    <div className="scale-reader__chapter"><div><strong>{zh?"大调音阶":"Major scales"}</strong><span>{zh?chosenRange.zh:chosenRange.label} · {selected.length} {zh?"个调性":"keys"}</span></div><button className="scale-book__customize" aria-expanded={customizing} onClick={()=>{dialog.current?.showModal();setCustomizing(true)}}>{zh?"自定义":"Customize"}</button></div>
    {!selected.length&&<p className="scale-book__empty">Choose keys in Customize to display your scales.</p>}
    <dialog ref={dialog} className="scale-book__panel" onClose={()=>setCustomizing(false)} aria-labelledby="scale-customize-title">
      <header><h2 id="scale-customize-title">{zh?"自定义":"Customize"}</h2><button aria-label={zh?"关闭自定义":"Close Customize"} onClick={()=>dialog.current?.close()}>×</button></header>
      <div className="scale-book__panel-body">
        <div className="scale-book__type"><span>{zh?"音阶类型":"Scale type"}</span><strong>{zh?"大调":"Major"}</strong></div>
        <fieldset className="scale-book__key-field"><legend>{zh?"调性":"Keys"}</legend><div className="scale-book__key-actions"><button onClick={()=>setKeys(allKeys)}>{zh?"全部":"All keys"}</button><button onClick={()=>{setKeys([]);}}>{zh?"清除":"Clear"}</button></div>
          <div className="scale-book__keys">{majorKeys.map(k=><label key={k.id}><input type="checkbox" checked={keys.includes(k.id)} onChange={()=>toggleKey(k.id)}/><span>{k.label}</span></label>)}</div>
        </fieldset>
        <fieldset className="scale-book__ranges"><legend>{zh?"音域":"Range"}</legend>{ranges.map(r=><label key={r.id}><input type="radio" name="scale-range" checked={range===r.id} onChange={()=>changeRange(r.id)}/><span>{zh?r.zh:r.label}{"notes" in r?` (${r.notes})`:""}</span></label>)}</fieldset>
        <fieldset className="scale-book__display"><legend>{zh?"显示":"Display"}</legend><div className="scale-book__order">{[["chromatic",zh?"半音顺序":"Chromatic"],["fifths",zh?"五度圈":"Circle of fifths"]].map(([value,label])=><label key={value}><input type="radio" name="scale-order" checked={order===value} onChange={()=>setOrder(value)}/><span>{label}</span></label>)}</div>
        <label className="scale-book__line-option"><input type="checkbox" checked={newLines} onChange={e=>setNewLines(e.target.checked)}/><span>{zh?"每个音阶另起一行":"Start each scale on a new line"}</span></label></fieldset>
        <details className="scale-book__tempos"><summary>{zh?"练习速度":"Practice tempos"}</summary>{selected.map(k=>{
          const id=scaleId(k.id,range),tempo=tempos[id]??60;
          const setTempo=(next:number)=>{setActiveKey(k.id);setTempos(prev=>({...prev,[id]:next}));reader.setTempo(next)};
          return <div className="scale-reader__tempo" key={k.id}><span>{k.label}</span><div className="scale-book__metronome"><button disabled={tempo<=40} aria-label={`${k.label}: decrease tempo by 5`} onClick={()=>setTempo(tempo-5)}>−</button><span>♩ = {tempo}</span><button disabled={tempo>=220} aria-label={`${k.label}: increase tempo by 5`} onClick={()=>setTempo(tempo+5)}>+</button><button aria-label={`${k.label}: metronome`} aria-pressed={reader.metronome&&activeKey===k.id} onClick={()=>{const stop=reader.metronome&&activeKey===k.id;setTempo(tempo);if(stop||!reader.metronome)reader.toggleMetronome()}}>♩</button></div></div>;
        })}</details>
      </div>
    </dialog>
    </>}/>
  </div>;
}
