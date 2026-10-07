"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
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
export type RoutineItem={id:string;text:string;done?:boolean;ref?:string};
/** The wall clock, read only in event handlers and timers. */
const nowMs=()=>Date.now();

type Props={
  routine:RoutineItem[];zh:boolean;findable:SuggestItem[];
  /** Library entries by id: a step that is a piece or exercise links to it and logs as it. */
  lookup:(id:string)=>{viewerPath:string|null;isExercise:boolean}|undefined;
  onRoutine:(next:RoutineItem[])=>void;
  labels:{title:string;start:string;pause:string;resume:string;markDone:(text:string)=>string;remove:(text:string)=>string;addAria:string};
};

export function PracticeCard({routine,zh,findable,lookup,onRoutine,labels}:Props){
  // The clock is the shared one (the top bar's clock button runs the same one).
  const live=usePracticeClock();
  const [now,setNow]=useState(0),[input,setInput]=useState("");
  useEffect(()=>{
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(nowMs());
    if(!live?.running)return;
    const id=window.setInterval(()=>setNow(nowMs()),1000);return()=>window.clearInterval(id);
  },[live?.running]);
  const fallback=zh?"练习":"Practice";
  const times=clockTimes(live,now);
  const current=routine.findIndex(item=>!item.done);
  const currentStep=current>=0?routine[current]:null;
  const asTarget=(step:RoutineItem):ClockTarget=>{const entry=step.ref?lookup(step.ref):undefined;return {title:step.text,ref:step.ref,itemType:entry?(entry.isExercise?"exercise":"repertoire"):"focus"}};
  // The step the clock is on: the one it is timing, if that is a step; otherwise none (it is timing something else).
  const timingStep=live?routine.find(step=>!step.done&&(live.target.ref?step.ref===live.target.ref:step.text===live.target.title)):undefined;

  function start(){
    setNow(nowMs());
    if(live){resumeClock();return}
    if(currentStep)startClock(asTarget(currentStep),fallback);
    else startClock({title:fallback},fallback);
  }
  /** The step being timed is done: tick it, log its time, and the clock moves on to the next unticked step (or keeps timing whatever it was on). */
  function next(){
    const step=timingStep??currentStep;if(!step)return;
    const rest=routine.map(item=>item.id===step.id?{...item,done:true}:item);
    onRoutine(rest);
    if(live){const following=rest.find(item=>!item.done);if(following)switchClock(asTarget(following),fallback);else stopClock(fallback)}
    setNow(nowMs());
  }
  function finish(){stopClock(fallback);setNow(nowMs())}
  function toggle(item:RoutineItem){
    // Ticking the step being timed is the same as Next; any other step just ticks.
    if(live&&timingStep&&item.id===timingStep.id){next();return}
    onRoutine(routine.map(step=>step.id===item.id?{...step,done:!step.done}:step));
  }
  const add=(step:RoutineItem)=>{onRoutine([...routine,step]);setInput("")};
  const allDone=routine.length>0&&current<0;

  return <section className="practice-card practice-today" aria-labelledby="today-title">
    {/* The clock on the left (what you are on, the time, the buttons); the steps on the right. */}
    <div className="practice-today__clock">
      <h2 id="today-title">{labels.title}</h2>
      <p className="practice-today__now">
        {live?<><span>{zh?"现在":"Now"}</span>{live.target.title||fallback}</>
          :currentStep?<><span>{zh?"下一步":"Up next"}</span>{currentStep.text}</>
          :allDone?(zh?"今天的步骤都完成了":"Every step done")
          :(zh?"自由练习":"Free practice")}
      </p>
      {/* A finished stretch asks here whether to save it (with a note) before it goes in your log. */}
      <SessionReview zh={zh}/>
      <div className="practice-today__time" aria-live="off">{formatClock(times.target)}</div>
      {live&&times.total>times.target+999&&<small className="practice-today__total">{zh?`本次共 ${formatClock(times.total)}`:`Session ${formatClock(times.total)}`}</small>}
      <div className="practice-today__actions">
        <button type="button" className="practice-today__primary" onClick={live?.running?pauseClock:start}>{live?.running?labels.pause:live?labels.resume:labels.start}</button>
        {live&&(timingStep??currentStep)&&<button type="button" onClick={next}>{zh?"下一步":"Next step"}</button>}
        {live&&<button type="button" onClick={finish}>{zh?"结束":"Finish"}</button>}
      </div>
    </div>
    <div className="practice-today__steps">
      <div className="practice-card__heading">
        <h3>{zh?"练习步骤":"Steps"}</h3>
        {routine.length>0&&<span className="routine-count">{zh?`${routine.filter(item=>item.done).length} / ${routine.length}`:`${routine.filter(item=>item.done).length} of ${routine.length}`}</span>}
        {routine.some(item=>item.done)&&!live&&<button type="button" className="practice-today__reset" onClick={()=>onRoutine(routine.map(item=>({...item,done:false})))}>{zh?"全部取消勾选":"Uncheck all"}</button>}
      </div>
      {routine.length>0&&<ol className="routine-list">{routine.map((item,i)=>{
        const path=item.ref?lookup(item.ref)?.viewerPath:null;
        return <li key={item.id} className={`${item.done?"done":""}${(timingStep?item.id===timingStep.id:!live&&i===current)?" is-current":""}`}>
          <label className="routine-list__check">
            <input type="checkbox" checked={Boolean(item.done)} onChange={()=>toggle(item)} aria-label={labels.markDone(item.text)}/>
            <span aria-hidden="true">✓</span>
          </label>
          {path?<Link className="routine-list__text routine-list__text--link" href={path}>{item.text}</Link>:<span className="routine-list__text">{item.text}</span>}
          <button type="button" aria-label={labels.remove(item.text)} className="routine-delete" onClick={()=>onRoutine(routine.filter(step=>step.id!==item.id))}><PracticeIcon name="delete"/></button>
        </li>;
      })}</ol>}
      <SuggestField id="routine" items={findable} value={input} onChange={setInput} onText={text=>add({id:crypto.randomUUID(),text,done:false})} onPick={item=>add({id:crypto.randomUUID(),text:item.title,ref:item.id,done:false})}
        placeholder={zh?"添加要练的：输入，或从列表里选练习和曲目":"Add what you’ll practise: type, or pick an exercise or piece"} label={labels.addAria} submitLabel={zh?"添加":"Add"} icon={<PracticeIcon name="plus"/>}/>
      {!routine.length&&<p className="practice-card__empty">{zh?"开始后，计时器会给第一步计时；勾掉一步，就记下它的用时并进入下一步。":"Start times the first step; ticking a step logs its time and moves on to the next."}</p>}
    </div>
  </section>;
}
