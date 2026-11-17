"use client";
import Link from "next/link";
import {useEffect,useState,useSyncExternalStore} from "react";
import {PracticeIcon} from "../components/PracticeIcon";
import {usePracticeClock,clockTimes,formatClock,startClock,resumeClock,pauseClock,switchClock,stopClock,type ClockTarget} from "../lib/practiceClock";
import {SuggestField,type SuggestItem} from "./SuggestField";
import {SessionReview} from "../components/SessionReview";

/**
 * Today's practice: the routine and the clock are one thing. Your steps are the plan; Start runs a clock that counts up;
 * the first unticked step is the one you are on. Ticking it (or Next) logs the time spent on it as a practice session,
 * linked to the piece or exercise when the step is one, and moves to the next step. With no steps, name what you are
 * playing (or don't) and Finish logs it as one session. These sessions are what the calendar shows.
 *
 * The clock is saved as it runs, so leaving the page or reloading does not lose the time.
 */
import {type RoutineItem,practiceDay,migrateRoutine,routineForDay,sessionsKey} from "../practice-data";
export type {RoutineItem} from "../practice-data";
const sessionSnapshot=()=>{try{return localStorage.getItem(sessionsKey)??"[]"}catch{return "[]"}};
const subscribeSessions=(update:()=>void)=>{window.addEventListener("cookie:practice-updated",update);window.addEventListener("storage",update);return()=>{window.removeEventListener("cookie:practice-updated",update);window.removeEventListener("storage",update)}};
/** The wall clock, read only in event handlers and timers. */
const nowMs=()=>Date.now();

type Props={
  routine:RoutineItem[];zh:boolean;findable:SuggestItem[];
  /** Library entries by id: a step that is a piece or exercise links to it and logs as it. */
  lookup:(id:string)=>{viewerPath:string|null;isExercise:boolean}|undefined;
  onRoutine:(next:RoutineItem[])=>void;
  labels:{title:string;start:string;pause:string;resume:string;markDone:(text:string)=>string;remove:(text:string)=>string;addAria:string};
};

export function PracticeCard({routine:storedRoutine,zh,findable,lookup,onRoutine,labels}:Props){
  // The clock is the shared one (the top bar's clock button runs the same one).
  const live=usePracticeClock();
  const [now,setNow]=useState(0),[input,setInput]=useState("");
  // "Add step" is a button; pressing it swaps in the field (and its picker) until a step is added or you leave it.
  const [adding,setAdding]=useState(false);
  // A step you tapped: the clock times it next (or switches to it now), so the list never has to go in order.
  const [picked,setPicked]=useState<string|null>(null);
  useEffect(()=>{
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(nowMs());
    const id=window.setInterval(()=>setNow(nowMs()),1000);return()=>window.clearInterval(id);
  },[live?.running]);
  const today=practiceDay(now);
  const sessions=useSyncExternalStore(subscribeSessions,sessionSnapshot,()=>"[]");
  let savedSessions=[];try{const parsed=JSON.parse(sessions);if(Array.isArray(parsed))savedSessions=parsed}catch{/* Ignore a damaged log. */}
  const routine=routineForDay(storedRoutine,savedSessions,today);
  useEffect(()=>{if(now&&storedRoutine.some(item=>"done" in item))onRoutine(migrateRoutine(storedRoutine,practiceDay(now)))},[storedRoutine,onRoutine,now]);
  const fallback=zh?"练习":"Practice";
  const times=clockTimes(live,now);
  const pickedIndex=routine.findIndex(item=>item.id===picked&&item.doneOn!==today);
  const current=pickedIndex>=0?pickedIndex:routine.findIndex(item=>item.doneOn!==today);
  const currentStep=current>=0?routine[current]:null;
  const asTarget=(step:RoutineItem):ClockTarget=>{const entry=step.ref?lookup(step.ref):undefined;return {title:step.text,ref:step.ref,itemType:step.ref?.startsWith("scale-set:")?"exercise":entry?(entry.isExercise?"exercise":"repertoire"):"focus"}};
  // The step the clock is on: the one it is timing, if that is a step; otherwise none (it is timing something else).
  const timingStep=live?routine.find(step=>step.doneOn!==today&&(live.target.ref?step.ref===live.target.ref:step.text===live.target.title)):undefined;

  function start(){
    setNow(nowMs());
    if(live){resumeClock();return}
    if(currentStep)startClock(asTarget(currentStep),fallback);
    else startClock({title:fallback},fallback);
  }
  /** The step being timed is done: tick it, log its time, and the clock moves on to the next unticked step (or keeps timing whatever it was on). */
  function next(){
    const step=timingStep??currentStep;if(!step)return;
    const rest=routine.map(item=>item.id===step.id?{...item,doneOn:today}:item);
    setPicked(null);
    onRoutine(rest);
    if(live){const following=rest.find(item=>item.doneOn!==today);if(following)switchClock(asTarget(following),fallback);else stopClock(fallback)}
    setNow(nowMs());
  }
  /**
   * Tapping a step's name. With the clock stopped it ticks (or unticks) the step. While the clock runs, tapping the
   * step being timed finishes it, and tapping another unticked step moves the clock to that one, so the list never
   * has to go in order. The number in front always ticks, whatever the clock is doing.
   */
  function tapLine(item:RoutineItem){
    if(!live||item.doneOn===today){toggle(item);return}
    if(timingStep&&item.id===timingStep.id){next();return}
    setPicked(item.id);switchClock(asTarget(item),fallback);
  }
  function finish(){stopClock(fallback);setNow(nowMs())}
  function toggle(item:RoutineItem){
    // Ticking the step being timed is the same as Next; any other step just ticks.
    if(live&&timingStep&&item.id===timingStep.id){next();return}
    onRoutine(routine.map(step=>step.id===item.id?{...step,doneOn:step.doneOn===today?undefined:today}:step));
  }
  const add=(step:RoutineItem)=>{onRoutine([...routine,step]);setInput("");setAdding(false)};
  const allDone=routine.length>0&&current<0;

  return <section id="today" className="practice-card practice-today" aria-labelledby="today-title">
    {/* The clock as one strip (what you are on, the time, the buttons); the routine underneath, full width. */}
    <div className="practice-today__clock">
      <div className="practice-today__what">
        <h2 id="today-title">{labels.title}</h2>
        <p className="practice-today__now">
          {live?<><span>{zh?"现在":"Now"}</span>{live.target.title||fallback}</>
            :currentStep?<><span>{zh?"下一步":"Up next"}</span>{currentStep.text}</>
            :allDone?(zh?"今天的清单都完成了":"Everything on the list is done")
            :(zh?"自由练习":"Free practice")}
        </p>
      </div>
      <div className="practice-today__time" aria-live="off">{formatClock(times.target)}
        {live&&times.total>times.target+999&&<small className="practice-today__total">{zh?`本次共 ${formatClock(times.total)}`:`Session ${formatClock(times.total)}`}</small>}
      </div>
      {/* Printed controls (Nov 14): a word and a small ink glyph, no button shape. Start alone until you start; then
          Stop joins on the left. Steps are ticked
          by you (or by a logged session), never by the clock: you can pause, do something else, and come back. */}
      <div className="practice-today__actions">
        {/* Stop only once there is something to stop, and on the left, so play/pause never moves under your finger. */}
        {live&&<button type="button" onClick={finish}><span>{zh?"结束":"Stop"}</span><PracticeIcon name="stop"/></button>}
        {live?.running
          ?<button type="button" onClick={pauseClock}><span>{labels.pause}</span><PracticeIcon name="pause"/></button>
          :<button type="button" onClick={start}><span>{live?labels.resume:labels.start}</span><PracticeIcon name="play"/></button>}
      </div>
      {/* A finished stretch asks here whether to save it (with a note) before it goes in your log. */}
      <SessionReview zh={zh}/>
    </div>
    <div className="practice-today__steps">
      <div className="practice-card__heading">
        <h3>{zh?"练习清单":"Routine"}</h3>
        {routine.length>0&&<span className="routine-count">{zh?`${routine.filter(item=>item.doneOn===today).length} / ${routine.length}`:`${routine.filter(item=>item.doneOn===today).length} of ${routine.length}`}</span>}
        {/* Add is a real button in the tile's header, never a line of the list (Nov 14). It turns into the field. */}
        <span className="routine-adder">{adding
          ?<SuggestField id="routine" items={findable} value={input} onChange={setInput} onText={text=>add({id:crypto.randomUUID(),text})} onPick={item=>add({id:crypto.randomUUID(),text:item.title,ref:item.id})}
            placeholder={zh?"输入，或选练习和曲目":"Type, or pick an exercise or piece"} label={labels.addAria} submitLabel={zh?"添加":"Add"} focusOnOpen onLeave={()=>setAdding(false)}/>
          :<button type="button" className="routine-adder__button" onClick={()=>setAdding(true)}><PracticeIcon name="plus"/>{zh?"添加步骤":"Add step"}</button>}</span>
      </div>
      {/* A numbered list, like a printed programme: the number ticks the step (a done step is struck through), and
          Open and remove sit right after the name. */}
      <ol className="routine-list">{routine.map((item,i)=>{
        const path=item.ref?.startsWith("scale-set:")?`/flute-studio/exercises/scales?set=${encodeURIComponent(item.ref.slice(10))}&back=/flute-studio/practice`:item.ref?lookup(item.ref)?.viewerPath:null;
        return <li key={item.id} className={`${item.doneOn===today?"done":""}${(timingStep?item.id===timingStep.id:!live&&i===current)?" is-current":""}`}>
          <label className="routine-list__check">
            <input type="checkbox" checked={Boolean(item.doneOn===today)} onChange={()=>toggle(item)} aria-label={labels.markDone(item.text)}/>
            <span aria-hidden="true">{i+1}</span>
          </label>
          <button type="button" className="routine-list__text" onClick={()=>tapLine(item)}>{item.text}</button>
          {path&&<Link className="routine-list__open" href={path}>{zh?"打开":"Open"} ›</Link>}
          <button type="button" aria-label={labels.remove(item.text)} className="routine-delete" onClick={()=>onRoutine(routine.filter(step=>step.id!==item.id))}><PracticeIcon name="delete"/></button>
        </li>;
      })}</ol>
      {routine.length===0&&<p className="routine-empty">{zh?"还没有步骤。添加今天想练的内容。":"No steps yet. Add what you want to play today."}</p>}
    </div>
  </section>;
}
