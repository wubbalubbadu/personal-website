"use client";
import Link from "next/link";
import {useEffect,useMemo,useRef,useState} from "react";
import {PracticeNotation} from "../components/PracticeNotation";
import {PracticeIcon} from "../components/PracticeIcon";
import {noDisplay,type PracticeDisplay} from "../components/practiceDisplay";
import {loadExcerptXml} from "../lib/excerptXml";
import {addTempo,removeTempo,setGoal,setStep,bumpBitTally,DEFAULT_STEP,type TrickyBit} from "../lib/trickyBits";
import {useLanguage} from "../i18n/LanguageContext";
import TallySticks from "./TallySticks";

/** The note, accidental and rhythm display the reader was last left on, so a bit looks the way you read it. */
function savedDisplay():PracticeDisplay{
  try{
    const saved=JSON.parse(localStorage.getItem("cookie:reader-view:piece:v1")||"null");
    if(!saved)return noDisplay;
    return {names:saved.noteDisplay==="names"||saved.noteDisplay==="solfege"?saved.noteDisplay:"off",accidentals:!!saved.accidentals,rhythm:!!saved.rhythmMode&&saved.rhythmMode!=="off"};
  }catch{return noDisplay}
}

/**
 * One tricky bit, large: the bars, the tempos you have worked at as chips
 * (tap one to play at it, "+" adds the next step, press and hold or
 * right-click a chip to take it off), a bar filling toward the goal, and the
 * repetitions as tally sticks.
 */
export default function TrickyBitDialog({bit,piece,count,position,total,onClose,onStep}:{bit:TrickyBit;piece:{title:string;scorePath:string|null;href:string};count:number;position:number;total:number;onClose:()=>void;onStep:(direction:-1|1)=>void}){
  const {t}=useLanguage(),text=t.trickyBits;
  const [xml,setXml]=useState(""),[error,setError]=useState(""),[playing,setPlaying]=useState(false);
  const display=useMemo(()=>savedDisplay(),[]);
  const tempos=[...bit.tempos].sort((a,b)=>a-b),step=bit.step??DEFAULT_STEP;
  const [selected,setSelected]=useState<number|null>(null);
  const tempo=selected??tempos.at(-1)??60;
  const [editingGoal,setEditingGoal]=useState(false),[goalDraft,setGoalDraft]=useState("");
  const hold=useRef(0),goalInput=useRef<HTMLInputElement>(null),stepInput=useRef<HTMLInputElement>(null),panel=useRef<HTMLDivElement>(null),music=useRef<HTMLDivElement>(null);
  const [editingStep,setEditingStep]=useState(false),[stepDraft,setStepDraft]=useState("");
  useEffect(()=>{if(editingStep)stepInput.current?.select()},[editingStep]);
  // The notation scrolls sideways, which made the mouse wheel stop at it: vertical wheel movement over it scrolls the pop-up instead.
  useEffect(()=>{
    const el=music.current;if(!el)return;
    const wheel=(event:WheelEvent)=>{if(Math.abs(event.deltaY)<=Math.abs(event.deltaX)||!panel.current)return;event.preventDefault();panel.current.scrollTop+=event.deltaY};
    el.addEventListener("wheel",wheel,{passive:false});return()=>el.removeEventListener("wheel",wheel);
  },[]);
  useEffect(()=>{if(editingGoal)goalInput.current?.select()},[editingGoal]);
  useEffect(()=>{
    let gone=false;
    if(!piece.scorePath){return}
    loadExcerptXml(piece.scorePath,bit.from,bit.to).then(value=>{if(!gone){setXml(value);setError("")}}).catch(()=>{if(!gone)setError(text.missing)});
    return()=>{gone=true};
  },[piece.scorePath,bit.from,bit.to,text.missing]);
  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{
      if(event.key==="Escape")onClose();
      if((event.target as HTMLElement)?.closest?.("input"))return;
      if(event.key==="ArrowLeft")onStep(-1);
      if(event.key==="ArrowRight")onStep(1);
    };
    window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);
  },[onClose,onStep]);

  const best=tempos.at(-1),start=tempos[0],goal=bit.goal;
  const fill=goal&&best&&start!==undefined?Math.max(0,Math.min(1,goal>start?(best-start)/(goal-start):best>=goal?1:0)):0;
  const nextTempo=(best??tempo)+step;
  const press={
    down:(value:number)=>{window.clearTimeout(hold.current);hold.current=window.setTimeout(()=>{removeTempo(bit.id,value);setSelected(current=>current===value?null:current);hold.current=0},550)},
    up:()=>window.clearTimeout(hold.current),
  };
  const commitStep=()=>{const value=Number(stepDraft);if(value>=1)setStep(bit.id,value);setEditingStep(false)};
  const commitGoal=()=>{const value=Number(goalDraft);setGoal(bit.id,value>0?value:undefined);setEditingGoal(false)};

  return <div className="tricky-dialog" role="dialog" aria-modal="true" aria-label={`${piece.title}, ${text.bars} ${bit.label}`}>
    <button type="button" className="tricky-dialog__scrim" aria-label={text.close} onClick={onClose}/>
    <div className="tricky-dialog__panel" ref={panel}>
      <header>
        <div className="tricky-dialog__pager">
          <button type="button" className="has-tip" data-tip={text.previous} aria-label={text.previous} disabled={total<2} onClick={()=>onStep(-1)}><PracticeIcon name="previous"/></button>
          <span>{position} / {total}</span>
          <button type="button" className="has-tip" data-tip={text.next} aria-label={text.next} disabled={total<2} onClick={()=>onStep(1)}><PracticeIcon name="next"/></button>
        </div>
        <div className="tricky-dialog__title"><strong>{piece.title}</strong><span>{text.bars} {bit.label}</span></div>
        <button type="button" className="tricky-dialog__close has-tip" data-tip={text.close} aria-label={text.close} onClick={onClose}><PracticeIcon name="close"/></button>
      </header>

      <div className="tricky-dialog__music" ref={music}>
        {xml?<PracticeNotation xml={xml} label={`${piece.title} ${bit.label}`} quarterBpm={tempo} playing={playing} onPlay={()=>setPlaying(true)} onStop={()=>setPlaying(false)} loop zoom={.9} display={display}/>:<p className="tricky-dialog__note" role={error?"alert":"status"}>{error||"…"}</p>}
      </div>

      <section className="tricky-dialog__tempos" aria-label={text.tempo}>
        <div className="tricky-chips">
          {tempos.map(value=><button key={value} type="button" className={value===tempo?"tricky-chip on":"tricky-chip"} aria-pressed={value===tempo}
            onClick={()=>{setSelected(value);setPlaying(false)}} onPointerDown={()=>press.down(value)} onPointerUp={press.up} onPointerLeave={press.up} onPointerCancel={press.up}
            onContextMenu={event=>{event.preventDefault();removeTempo(bit.id,value);setSelected(current=>current===value?null:current)}}>{value}</button>)}
          <button type="button" className="tricky-chip tricky-chip--add has-tip" data-tip={`${text.add}: ${nextTempo}`} aria-label={`${text.add}: ${nextTempo}`} onClick={()=>{addTempo(bit.id,nextTempo);setSelected(nextTempo);setPlaying(false)}}><PracticeIcon name="plus"/></button>
          {editingStep
            ?<input ref={stepInput} className="tricky-goal__input tricky-step-input" type="number" inputMode="numeric" min="1" max="40" value={stepDraft} onChange={event=>setStepDraft(event.target.value)} onBlur={commitStep} onKeyDown={event=>{if(event.key==="Enter")event.currentTarget.blur();if(event.key==="Escape")setEditingStep(false)}} aria-label={text.increment}/>
            :<button type="button" className="tricky-step-label has-tip" data-tip={text.increment} aria-label={`${text.increment}: ${step}`} onClick={()=>{setStepDraft(String(step));setEditingStep(true)}}>+{step}</button>}
        </div>
        <div className="tricky-goal">
          <div className="tricky-goal__bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fill*100)}><i style={{width:`${fill*100}%`}}/></div>
          {editingGoal
            ?<input className="tricky-goal__input" type="number" inputMode="numeric" min="20" max="300" ref={goalInput} value={goalDraft} onChange={event=>setGoalDraft(event.target.value)} onBlur={commitGoal} onKeyDown={event=>{if(event.key==="Enter")event.currentTarget.blur();if(event.key==="Escape"){setEditingGoal(false)}}} aria-label={text.setGoal}/>
            :<button type="button" className="tricky-goal__label" onClick={()=>{setGoalDraft(goal?String(goal):String(nextTempo));setEditingGoal(true)}}>{goal?`${text.goal} ${goal}`:text.setGoal}</button>}
        </div>
      </section>

      <section className="tricky-dialog__tally" aria-label={text.tallyTitle}>
        <button type="button" className="tricky-step has-tip" data-tip="−1" aria-label="−1" disabled={count<=0} onClick={()=>bumpBitTally(bit.id,-1)}>−</button>
        <TallySticks count={count}/>
        <button type="button" className="tricky-step has-tip" data-tip="+1" aria-label="+1" onClick={()=>bumpBitTally(bit.id,1)}>+</button>
        <b className="tricky-dialog__total">{count} <small>{text.reps}</small></b>
      </section>

      <footer><Link href={piece.href}>{text.openPiece}<span aria-hidden="true"> ›</span></Link></footer>
    </div>
  </div>;
}
