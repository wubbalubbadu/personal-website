"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {Dialog} from "../components/Dialog";
import {PracticeIcon} from "../components/PracticeIcon";
import {usePracticeAudio} from "../PracticeAudio";
import {type BitReps,type TrickyBit} from "../lib/trickyBits";
import {useLanguage} from "../i18n/LanguageContext";
import {BitPractice} from "./BitPractice";

/** One tricky bit in the shared Dialog: the pager through your bits, then BitPractice, then a link to the whole piece. */
export default function TrickyBitDialog({bit,reps,piece,position,total,onClose,onStep}:{bit:TrickyBit;reps:BitReps|undefined;piece:{title:string;scorePath:string|null;href:string};position:number;total:number;onClose:()=>void;onStep:(direction:-1|1)=>void}){
  const {t,lang}=useLanguage(),text=t.trickyBits;
  const audio=usePracticeAudio();
  const [metronomeOn,setMetronomeOn]=useState(false);
  // The panel stays hidden (only the dimmed page shows) until the music is drawn, so it opens at its real size
  // instead of opening small and growing. Stepping keeps the old bars until the new ones are ready.
  const [ready,setReady]=useState(false);
  // Arrow keys step through bits (not while typing a tempo). Escape is the Dialog's.
  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{
      if((event.target as HTMLElement)?.closest?.("input"))return;
      if(event.key==="ArrowLeft")onStep(-1);
      if(event.key==="ArrowRight")onStep(1);
    };
    window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);
  },[onStep]);
  // Closing the dialog stops the metronome it started.
  const close=()=>{if(metronomeOn&&audio.metro)audio.toggleMetro();onClose()};

  return <Dialog width="wide" panelClassName={ready?"tricky-dialog__panel":"tricky-dialog__panel is-waiting"} label={`${piece.title}, ${text.bars} ${bit.label}`} closeLabel={text.close} onClose={close}
    title={<div className="tricky-dialog__heading">
      <div className="tricky-dialog__pager">
        <button type="button" className="has-tip" data-tip={text.previous} aria-label={text.previous} disabled={total<2} onClick={()=>onStep(-1)}><PracticeIcon name="previous"/></button>
        <span>{position} / {total}</span>
        <button type="button" className="has-tip" data-tip={text.next} aria-label={text.next} disabled={total<2} onClick={()=>onStep(1)}><PracticeIcon name="next"/></button>
      </div>
      <div className="tricky-dialog__title"><strong>{piece.title}</strong><span>{text.bars} {bit.label}</span></div>
    </div>}>
    <BitPractice bit={bit} reps={reps} scorePath={piece.scorePath} label={`${piece.title} ${bit.label}`} zh={lang==="zh"}
      metronomeOn={metronomeOn} onMetronome={setMetronomeOn} onReady={()=>setReady(true)}/>
    <footer><Link href={piece.href}>{text.openPiece}</Link></footer>
  </Dialog>;
}
