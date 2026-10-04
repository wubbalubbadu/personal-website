"use client";
import {useEffect,useMemo,useState} from "react";
import {ScoreViewer,type ScoreViewerConfig} from "./ScoreViewer";
import {useLanguage} from "../i18n/LanguageContext";
import {filterKeySections,keyDroneChanges} from "../lib/keySections.js";
import {ReaderPopover} from "./ReaderPopover";
import {ScoreTempoMarks} from "./ScoreTempoMarks";
import {KeySelection} from "./KeySelection";
import {PracticeIcon,SpectrumDef} from "./PracticeIcon";
import "../exercises/scales/scale-book.css";

export default function KeyExerciseViewer({config,sections:sourceSections,stepper}:{config:ScoreViewerConfig;sections:{id:string;label:string}[];stepper:React.ReactNode}){
  const sections=sourceSections.map(s=>({...s,label:s.label.replace(/^[a-g]/,letter=>letter.toUpperCase()).replace(/\b(major|minor)\b/g,word=>word[0].toUpperCase()+word.slice(1))}));
  const {lang}=useLanguage(),zh=lang==="zh";
  const [selected,setSelected]=useState(()=>sections.map(s=>s.id));
  const [tempos,setTempos]=useState<Record<string,number>>({});
  const [tempoMarks,setTempoMarks]=useState(true);
  const [activeKey,setActiveKey]=useState<string|null>(null);
  const [prefsLoaded,setPrefsLoaded]=useState(false);
  const tempoKey=`cookie:reichert:tempos:${config.id}`;
  useEffect(()=>{try{setTempos(JSON.parse(localStorage.getItem(tempoKey)||"{}"))}catch{}setPrefsLoaded(true)},[tempoKey]);
  useEffect(()=>{if(prefsLoaded)try{localStorage.setItem(tempoKey,JSON.stringify(tempos))}catch{}},[tempos,prefsLoaded,tempoKey]);
  const [newLines,setNewLines]=useState(false);
  const [xml,setXml]=useState("");
  const [error,setError]=useState(false);
  useEffect(()=>{const abort=new AbortController();fetch(config.asset,{signal:abort.signal}).then(r=>{if(!r.ok)throw new Error("Score unavailable");return r.text()}).then(setXml).catch(e=>{if(e.name!=="AbortError")setError(true)});return()=>abort.abort()},[config.asset]);
  const asset=useMemo(()=>xml&&selected.length?filterKeySections(xml,selected,newLines):config.asset,[xml,selected,newLines,config.asset]);
  const customize=<ReaderPopover label={zh?"自定义音阶":"Customize scales"} trigger={<><SpectrumDef id="reichert-spectrum"/><PracticeIcon name="settings" gradient="reichert-spectrum"/><span className="scale-book__scales-label">{zh?"自定义":"Customize"}</span></>} className="tool has-tip">
    <div className="scale-book__panel-body"><p className="scale-book__field-label">{zh?"调性":"Keys"}</p><KeySelection options={sections.map(s=>({...s,label:s.label.replace(/ (major|minor)$/i,"")}))} selected={selected} onChange={setSelected} zh={zh}/><p className="scale-book__field-label">{zh?"换行":"Line breaks"}</p><div className="scale-book__ranges" role="group" aria-label={zh?"换行":"Line breaks"}>{[false,true].map(value=><button type="button" key={String(value)} className={newLines===value?"scale-book__chip selected":"scale-book__chip"} aria-pressed={newLines===value} onClick={()=>setNewLines(value)}>{value?(zh?"另起一行":"Start on a new line"):(zh?"接续上一个":"Continue from previous")}</button>)}</div>{error&&<p role="alert">{zh?"无法载入乐谱，请刷新。":"Could not load the score. Please reload."}</p>}</div>
  </ReaderPopover>;
  const visible=sections.filter(s=>selected.includes(s.id));
  const tempoFor=(id:string)=>tempos[id]??config.defaultTempo??60;
  const setTempo=(id:string,value:number)=>{setActiveKey(id);setTempos(current=>({...current,[id]:Math.max(40,Math.min(220,Math.round(value)))}))};
  let event=0;
  const starts=new Map<string,number>();
  if(xml)for(const match of asset.matchAll(/<measure\b[^>]*>[\s\S]*?<\/measure>/g)){const id=match[0].match(/\bid="([^"]+)"/)?.[1];if(id&&!starts.has(id))starts.set(id,event);event+=(match[0].match(/<note\b/g)||[]).length}
  return <ScoreViewer config={{...config,asset,defaultTempo:tempoFor(activeKey&&selected.includes(activeKey)?activeKey:visible[0]?.id??""),smartDrone:xml&&selected.length?keyDroneChanges(asset):undefined}} headerActions={()=>stepper}
    extraSystemSpacing={tempoMarks?3:0} practiceTempo={{value:tempoMarks,onChange:setTempoMarks}}
    onTempoChange={value=>{const id=activeKey&&selected.includes(activeKey)?activeKey:visible[0]?.id;if(id)setTempo(id,value)}}
    scoreMarks={tempoMarks?context=><ScoreTempoMarks root={context.root} version={context.version} marks={visible.map(s=>({id:s.id,label:s.label,tempo:tempoFor(s.id)}))} onChange={(id,value)=>{setTempo(id,value);context.controls.setTempo(value)}} soundingId={context.controls.metronome?activeKey:null} onSound={(id,value)=>{const running=context.controls.metronome&&activeKey===id;setTempo(id,value);context.controls.setTempo(value);if(running||!context.controls.metronome)context.controls.toggleMetronome()}}/>:undefined}
    settings={reader=><>{customize}<ReaderPopover label={zh?"练习速度":"Tempos"} trigger={<><PracticeIcon name="tempo"/>{zh?"速度":"Tempos"}</>} className="tool has-tip"><div className="scale-book__tempo-list">{visible.map(s=><div className="scale-reader__tempo" key={s.id}><span className="scale-book__tempo-label"><b>{s.label}</b></span><div className="scale-book__metronome"><button type="button" aria-label={`${s.label}: slower`} disabled={tempoFor(s.id)<=40} onClick={()=>{setTempo(s.id,tempoFor(s.id)-1);reader.setTempo(tempoFor(s.id)-1)}}>−</button><label className="scale-book__tempo-field"><input type="number" min={40} max={220} aria-label={`${s.label}: practice tempo in BPM`} value={tempoFor(s.id)} onChange={e=>{const value=Number(e.target.value);if(Number.isFinite(value)){setTempo(s.id,value);reader.setTempo(value)}}}/></label><button type="button" aria-label={`${s.label}: faster`} disabled={tempoFor(s.id)>=220} onClick={()=>{setTempo(s.id,tempoFor(s.id)+1);reader.setTempo(tempoFor(s.id)+1)}}>+</button><button type="button" className="scale-book__row-tool" aria-label={`${s.label}: play from here`} onClick={()=>{setTempo(s.id,tempoFor(s.id));reader.setTempo(tempoFor(s.id));reader.playFromEvent(starts.get(s.id)??0)}}><PracticeIcon name="play"/></button><button type="button" className="scale-book__row-tool" aria-label={`${s.label}: metronome`} aria-pressed={reader.metronome&&activeKey===s.id} onClick={()=>{const running=reader.metronome&&activeKey===s.id;setTempo(s.id,tempoFor(s.id));reader.setTempo(tempoFor(s.id));if(running||!reader.metronome)reader.toggleMetronome()}}><PracticeIcon name="metronome"/></button></div></div>)}</div><button type="button" className="reader-settings-reset" aria-pressed={tempoMarks} onClick={()=>setTempoMarks(value=>!value)}>{tempoMarks?(zh?"隐藏乐谱上的练习速度":"Hide practice tempo on the page"):(zh?"在乐谱上显示练习速度":"Show practice tempo on the page")}</button></ReaderPopover></>}
    lineBreak={{value:newLines,onChange:setNewLines}} stage={!selected.length?<div className="custom-score-heading" style={{textAlign:"center",padding:"40px 24px"}}><h1>{config.title}</h1><div className="score-composer">{config.composer}</div></div>:undefined}/>;
}
