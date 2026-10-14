"use client";
import {useState} from "react";
import {ReaderPopover} from "./ReaderPopover";
import {PracticeIcon} from "./PracticeIcon";
import type {ReaderControls} from "./ScoreViewer";
import {TEMPO_MIN,TEMPO_MAX} from "../lib/scoreTempo";
import "../exercises/scales/scale-book.css";

export function ScaleTemposPanel({rows,reader,activeBlock,onActive,onTempo,tempoMarks,onTempoMarks,zh=false}:{
 rows:{id:string;name:string;tempo:number;eventStart:number}[];
 reader:ReaderControls;activeBlock:string|null;onActive:(id:string)=>void;
 onTempo:(id:string,tempo:number)=>void;tempoMarks:boolean;onTempoMarks:(value:boolean)=>void;zh?:boolean;
}){
 const [tempoDraft,setTempoDraft]=useState<{id:string;value:string}|null>(null);
 return (
    <ReaderPopover label={zh?"练习速度":"Tempos"} trigger={<><PracticeIcon name="tempo"/>{zh?"速度":"Tempos"}</>} className="tool has-tip">
      <div className="scale-book__tempo-list">{rows.map((row,index)=>{
          const {id,tempo,name,eventStart}=row;
          const setTempo=(next:number)=>{onTempo(id,next);reader.setTempo(next)};
          const running=reader.metronome&&activeBlock===id;
          // Play starts the score at this exercise's first note and, like
          // the transport, the same button stops it.
          
          // Which exercise is sounding follows the music, not the button
          // that started it: pressing the transport's own Play used to
          // leave the very first row lit for the whole book.
          const blockEnd=rows[index+1]?.eventStart??Infinity;
          // playingFrom only stands in for the frame before the first note
          // actually sounds; once there is a live position it is the only
          // thing that counts, or the row you started from stays lit for
          // the rest of the book.
          const sounding=reader.playing&&(reader.playingEvent!==null?reader.playingEvent>=eventStart&&reader.playingEvent<blockEnd:reader.playingFrom===eventStart);
          return <div className="scale-reader__tempo" key={id}><span className="scale-book__tempo-label"><b>{name}</b></span><div className="scale-book__metronome"><button disabled={tempo<=TEMPO_MIN} aria-label={`${name}: decrease tempo by 5`} onClick={()=>setTempo(tempo-5)}>−</button><label className="scale-book__tempo-field"><input type="number" min={TEMPO_MIN} max={TEMPO_MAX} aria-label={`${name}: tempo in BPM`} value={tempoDraft?.id===id?tempoDraft.value:tempo} onChange={e=>setTempoDraft({id,value:e.target.value})} onFocus={()=>onActive(id)} onBlur={()=>{if(tempoDraft?.id!==id)return;const next=Number(tempoDraft.value);const valid=Number.isFinite(next)&&tempoDraft.value.trim()!=="";setTempoDraft(null);if(valid)setTempo(Math.max(TEMPO_MIN,Math.min(TEMPO_MAX,Math.round(next))))}} onKeyDown={e=>{if(e.key==="Enter")e.currentTarget.blur()}}/></label><button disabled={tempo>=TEMPO_MAX} aria-label={`${name}: increase tempo by 5`} onClick={()=>setTempo(tempo+5)}>+</button><button className={sounding?"scale-book__row-tool on":"scale-book__row-tool"} aria-label={sounding?`${name}: stop playing`:`${name}: play from here`} aria-pressed={sounding} onClick={()=>{setTempo(tempo);reader.playFromEvent(eventStart)}}><PracticeIcon name={sounding?"stop":"play"}/></button><button className={running?"scale-book__row-tool on":"scale-book__row-tool"} aria-label={running?`${name}: stop metronome`:`${name}: start metronome`} aria-pressed={running} onClick={()=>{setTempo(tempo);if(running||!reader.metronome)reader.toggleMetronome()}}><PracticeIcon name="metronome"/></button></div></div>;
      })}</div>
      {/* A quiet text action in the corner rather than a full-width chip:
          it is a view preference, not one of the tempos this panel is
          actually about — the same reasoning (and the same styling) as
          "Restore defaults" at the foot of Customize scales. */}
      <button type="button" className="reader-settings-reset" aria-pressed={tempoMarks} onClick={()=>onTempoMarks(!tempoMarks)}>{tempoMarks?(zh?"隐藏乐谱上的练习速度":"Hide practice tempo on the page"):(zh?"在乐谱上显示练习速度":"Show practice tempo on the page")}</button>
    </ReaderPopover>
 );
}
