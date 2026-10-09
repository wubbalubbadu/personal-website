"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {PracticeNotation} from "../components/PracticeNotation";
import {TempoPill} from "../components/TempoPill";
import {noDisplay,type PracticeDisplay} from "../components/practiceDisplay";
import {loadExcerptXml} from "../lib/excerptXml";
import {usePracticeAudio} from "../PracticeAudio";
import {addTempo,bumpRep,totalReps,type BitReps,type TrickyBit} from "../lib/trickyBits";
import {logRep} from "../lib/repLog";
import TallySticks from "../components/TallySticks";

/** The note, accidental and rhythm display the reader was last left on, so a bit looks the way you read it. */
function savedDisplay():PracticeDisplay{
  try{
    const saved=JSON.parse(localStorage.getItem("cookie:reader-view:piece:v1")||"null");
    if(!saved)return noDisplay;
    return {names:saved.noteDisplay==="names"||saved.noteDisplay==="solfege"?saved.noteDisplay:"off",accidentals:!!saved.accidentals,rhythm:!!saved.rhythmMode&&saved.rhythmMode!=="off"};
  }catch{return noDisplay}
}

/**
 * Practising one tricky bit, used by the card dialog and the continuous page alike: the bars (wrapped, never cut
 * off), Listen and the tempo (the studio's TempoPill, on the shared metronome), then a ladder with one row per
 * tempo you've played it at: its tally and +1. Tap a row to go back to that tempo. Nothing else: no goal bar, no
 * notes, so practising is tapping +1 and nudging the tempo.
 *
 * `metronomeOn` says whether the shared metronome is running for THIS bit (a page of bits shares one metronome).
 */
export function BitPractice({bit,reps,scorePath,label,zh,metronomeOn,onMetronome,onReady}:{
  bit:TrickyBit;reps:BitReps|undefined;scorePath:string|null;label:string;zh:boolean;
  metronomeOn:boolean;onMetronome:(on:boolean)=>void;
  /** The music is drawn (or can't be): the caller can show the block now instead of letting it grow in place. */onReady?:()=>void;
}){
  const audio=usePracticeAudio();
  const [xml,setXml]=useState(""),[error,setError]=useState(""),[playing,setPlaying]=useState(false);
  const display=useMemo(()=>savedDisplay(),[]);
  const onReadyRef=useRef(onReady);
  useEffect(()=>{onReadyRef.current=onReady});
  // Tempos you have reps at, plus any saved without reps yet, slow to fast.
  const ladder=useMemo(()=>[...new Set([...bit.tempos,...Object.keys(reps??{}).map(Number).filter(value=>value>0)])].sort((a,b)=>a-b),[bit.tempos,reps]);
  const [tempo,setTempo]=useState(()=>ladder.at(-1)??60);
  // Stepping to another bit keeps this block (no remount, so no empty flash or jump): the old bars stay until the new
  // ones are drawn, and only the tempo and playback reset, during render rather than in an effect.
  const [shownBit,setShownBit]=useState(bit.id);
  if(shownBit!==bit.id){setShownBit(bit.id);setTempo(ladder.at(-1)??60);setPlaying(false)}
  const text=zh
    ?{missing:"找不到这段谱子。",reps:"次",total:(n:number)=>`共 ${n} 次`,addRep:(t:number)=>`在 ${t} 记一次`,undo:(t:number)=>`撤销 ${t} 的一次`,tempo:"速度",at:(t:number)=>`用 ${t} 练`}
    :{missing:"This passage could not be found.",reps:"reps",total:(n:number)=>`${n} ${n===1?"rep":"reps"} in all`,addRep:(t:number)=>`One more at ${t}`,undo:(t:number)=>`Take one off at ${t}`,tempo:"Tempo",at:(t:number)=>`Practise at ${t}`};

  useEffect(()=>{
    if(!scorePath){onReadyRef.current?.();return}
    let gone=false;
    loadExcerptXml(scorePath,bit.from,bit.to).then(value=>{if(!gone){setError("");setXml(value)}}).catch(()=>{if(!gone){setError(text.missing);onReadyRef.current?.()}});
    return()=>{gone=true};
  },[scorePath,bit.from,bit.to,text.missing]);

  // The metronome follows this bit's tempo while it is this bit's metronome.
  useEffect(()=>{if(metronomeOn)audio.setPlaybackBpm(tempo,tempo)},[metronomeOn,tempo]);// eslint-disable-line react-hooks/exhaustive-deps
  const toggleMetronome=()=>{
    if(metronomeOn){if(audio.metro)audio.toggleMetro();onMetronome(false);return}
    audio.setPlaybackBpm(tempo,tempo);if(!audio.metro)audio.toggleMetro();onMetronome(true);
  };
  // The bit keeps its running total; the day log gets the same rep for the day report and "most practised".
  const rep=(at:number,delta:number)=>{if(!bit.tempos.includes(at))addTempo(bit.id,at);bumpRep(bit.id,at,delta);logRep({key:`tricky:${bit.id}`,title:label,kind:"tricky-bit"},at,delta)};
  const rows=ladder.includes(tempo)?ladder:[...ladder,tempo].sort((a,b)=>a-b);

  return <section className="bit-practice" aria-label={label}>
    <div className="bit-practice__music">
      {xml
        ?<PracticeNotation wrap xml={xml} label={label} quarterBpm={tempo} playing={playing} onPlay={()=>setPlaying(true)} onStop={()=>setPlaying(false)} zoom={.9} display={display} onDrawn={()=>onReadyRef.current?.()}
          controls={<TempoPill size="large" label={text.tempo} tempo={tempo} onChange={setTempo} sounding={metronomeOn&&audio.metro} onSound={toggleMetronome}/>}/>
        :<p className="bit-practice__note" role={error?"alert":"status"}>{error||"…"}</p>}
    </div>
    <ol className="bit-practice__ladder">
      {rows.slice().reverse().map(at=>{
        const count=reps?.[String(at)]??0,current=at===tempo;
        // Fixed order so nothing moves as you count: tempo, count, the − + slot (empty on other rows), then the sticks.
        return <li key={at} className={current?"is-current":undefined}>
          <button type="button" className="bit-practice__tempo" aria-pressed={current} aria-label={text.at(at)} onClick={()=>setTempo(at)}>{at}</button>
          <span className="bit-practice__count">{count}</span>
          <span className="bit-practice__steps">{current&&<>
            <button type="button" className="bit-practice__step" aria-label={text.undo(at)} disabled={count<=0} onClick={()=>rep(at,-1)}>−</button>
            <button type="button" className="bit-practice__step" aria-label={text.addRep(at)} onClick={()=>rep(at,1)}>+</button>
          </>}</span>
          <TallySticks count={count}/>
        </li>;
      })}
    </ol>
    <p className="bit-practice__total">{text.total(totalReps(reps))}</p>
  </section>;
}
