"use client";
import {useEffect,useMemo,useState} from "react";
import {ScoreViewer,type ScoreViewerConfig} from "./ScoreViewer";
import {useLanguage} from "../i18n/LanguageContext";
import {filterKeySections} from "../lib/keySections.js";
import {ReaderPopover} from "./ReaderPopover";
import {KeySelection} from "./KeySelection";
import {PracticeIcon,SpectrumDef} from "./PracticeIcon";
import "../exercises/scales/scale-book.css";

export default function KeyExerciseViewer({config,sections,stepper}:{config:ScoreViewerConfig;sections:{id:string;label:string}[];stepper:React.ReactNode}){
  const {lang}=useLanguage(),zh=lang==="zh";
  const [selected,setSelected]=useState(()=>sections.map(s=>s.id));
  const [newLines,setNewLines]=useState(false);
  const [xml,setXml]=useState("");
  const [error,setError]=useState(false);
  useEffect(()=>{const abort=new AbortController();fetch(config.asset,{signal:abort.signal}).then(r=>{if(!r.ok)throw new Error("Score unavailable");return r.text()}).then(setXml).catch(e=>{if(e.name!=="AbortError")setError(true)});return()=>abort.abort()},[config.asset]);
  const asset=useMemo(()=>xml&&selected.length?filterKeySections(xml,selected,newLines):config.asset,[xml,selected,newLines,config.asset]);
  const customize=<ReaderPopover label={zh?"自定义音阶":"Customize scales"} trigger={<><SpectrumDef id="reichert-spectrum"/><PracticeIcon name="settings" gradient="reichert-spectrum"/><span className="scale-book__scales-label">{zh?"自定义":"Customize"}</span></>} className="tool has-tip">
    <div className="scale-book__panel-body"><p className="scale-book__field-label">{zh?"调性":"Keys"}</p><KeySelection options={sections.map(s=>({...s,label:s.label.replace(/ (major|minor)$/,"")}))} selected={selected} onChange={setSelected} zh={zh}/><p className="scale-book__field-label">{zh?"换行":"Line breaks"}</p><div className="scale-book__ranges" role="group" aria-label={zh?"换行":"Line breaks"}>{[false,true].map(value=><button type="button" key={String(value)} className={newLines===value?"scale-book__chip selected":"scale-book__chip"} aria-pressed={newLines===value} onClick={()=>setNewLines(value)}>{value?(zh?"另起一行":"Start on a new line"):(zh?"接续上一个":"Continue from previous")}</button>)}</div>{error&&<p role="alert">{zh?"无法载入乐谱，请刷新。":"Could not load the score. Please reload."}</p>}</div>
  </ReaderPopover>;
  return <ScoreViewer config={{...config,asset}} headerActions={()=>stepper} settings={()=>customize} lineBreak={{value:newLines,onChange:setNewLines}} stage={!selected.length?<p className="scale-book__empty">{zh?"请在自定义中选择调性。":"Choose keys in Customize to display this exercise."}</p>:undefined}/>;
}
